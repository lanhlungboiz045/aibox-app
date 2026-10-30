// services/chatHistory.js — Lưu lịch sử chat theo từng user + model
//
// Mỗi cặp (uid, modelId) là một key AsyncStorage riêng, tránh 1 key quá lớn
// (AsyncStorage/SQLite có giới hạn ~2MB mỗi entry).
// Chỉ lưu dữ liệu cần hiển thị lại: role, content, timestamp, tokenCost.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@aibox_chat_history_v1:';
// Giới hạn để không phình storage: 40 tin nhắn gần nhất / model
export const MAX_STORED_MESSAGES = 40;
// Cắt bớt nội dung quá dài (reply Market Analyst có thể ~4k ký tự)
const MAX_CONTENT_CHARS = 8000;

const keyOf = (uid, modelId) => `${KEY_PREFIX}${uid}:${modelId}`;
const prefixOf = (uid) => `${KEY_PREFIX}${uid}:`;

// Hàng đợi ghi để tránh 2 lần save chồng nhau làm mất dữ liệu
let writeQueue = Promise.resolve();
function enqueue(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

// Chuẩn hoá 1 message trước khi lưu (bỏ field lạ, chặn dữ liệu rác)
function sanitizeMessage(message) {
  if (!message || typeof message !== 'object') return null;
  const role = message.role === 'user' ? 'user' : 'assistant';
  const content = typeof message.content === 'string' ? message.content : '';
  if (!content.trim()) return null;
  return {
    id: String(message.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    role,
    content: content.slice(0, MAX_CONTENT_CHARS),
    timestamp: typeof message.timestamp === 'string' ? message.timestamp : new Date().toISOString(),
    tokenCost: Math.max(0, Math.round(Number(message.tokenCost) || 0)),
  };
}

function sanitizeList(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map(sanitizeMessage)
    .filter(Boolean)
    .slice(-MAX_STORED_MESSAGES);
}

function parseEntry(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    // Hỗ trợ cả dạng cũ { updatedAt, messages } lẫn mảng thuần
    const list = Array.isArray(parsed) ? parsed : (parsed && parsed.messages);
    return sanitizeList(list);
  } catch {
    return [];
  }
}

function serialize(messages) {
  return JSON.stringify({ updatedAt: new Date().toISOString(), messages: sanitizeList(messages) });
}

// Đọc toàn bộ lịch sử của 1 user → { [modelId]: { updatedAt, messages } }
export async function loadChatHistory(uid) {
  if (!uid) return {};
  try {
    const prefix = prefixOf(uid);
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix));
    if (!keys.length) return {};

    const pairs = await AsyncStorage.multiGet(keys);
    const result = {};
    pairs.forEach(([key, raw]) => {
      const modelId = key.slice(prefix.length);
      const messages = parseEntry(raw);
      if (!modelId || !messages.length) return;
      let updatedAt = null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && !Array.isArray(parsed) && parsed.updatedAt) updatedAt = parsed.updatedAt;
      } catch { /* bỏ qua */ }
      result[modelId] = { updatedAt, messages };
    });
    return result;
  } catch {
    // Storage lỗi/hỏng → coi như chưa có lịch sử, không làm crash màn chat
    return {};
  }
}

// Lịch sử của 1 model
export async function loadModelHistory(uid, modelId) {
  if (!uid || !modelId) return [];
  try {
    const raw = await AsyncStorage.getItem(keyOf(uid, modelId));
    return parseEntry(raw);
  } catch {
    return [];
  }
}

// Ghi lịch sử 1 model; mảng rỗng = xoá key
export async function saveModelHistory(uid, modelId, messages) {
  if (!uid || !modelId) return;
  const clean = sanitizeList(messages);
  return enqueue(async () => {
    try {
      if (!clean.length) {
        await AsyncStorage.removeItem(keyOf(uid, modelId));
        return;
      }
      await AsyncStorage.setItem(keyOf(uid, modelId), serialize(clean));
    } catch { /* không chặn luồng chat nếu ghi lỗi */ }
  });
}

// Xoá lịch sử của 1 model
export async function clearModelHistory(uid, modelId) {
  if (!uid || !modelId) return;
  return enqueue(async () => {
    try {
      await AsyncStorage.removeItem(keyOf(uid, modelId));
    } catch { /* bỏ qua */ }
  });
}

// Xoá toàn bộ lịch sử chat của user
export async function clearAllChatHistory(uid) {
  if (!uid) return;
  return enqueue(async () => {
    try {
      const prefix = prefixOf(uid);
      const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch { /* bỏ qua */ }
  });
}

// Đếm số tin nhắn theo model để hiện badge ở danh sách
export function countByModel(history) {
  const counts = {};
  Object.keys(history || {}).forEach(modelId => {
    const list = history[modelId] && history[modelId].messages;
    if (Array.isArray(list) && list.length) counts[modelId] = list.length;
  });
  return counts;
}
