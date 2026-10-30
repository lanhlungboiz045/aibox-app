// services/apiKeys.js — Quản lý API key của app, lưu trên máy theo uid
//
// Lưu ý bảo mật (bản demo):
// - Key được sinh ngay trên thiết bị và chỉ lưu trong AsyncStorage của chính máy đó.
// - UI luôn che key trong danh sách; key chỉ hiện đầy đủ 1 lần lúc tạo.
// - Bản production nên lưu hash ở server + chỉ trả key đúng 1 lần.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/format';

const STORAGE_PREFIX = '@aibox_api_keys_v1:';
export const MAX_API_KEYS = 10;

const keyOf = (uid) => `${STORAGE_PREFIX}${uid}`;

// Cache RAM: mở lại màn API Keys hiện ngay danh sách cũ (không nháy skeleton),
// sau đó vẫn đọc AsyncStorage để đồng bộ.
const memoryCache = new Map();

export function peekApiKeys(uid) {
  if (!uid) return null;
  return memoryCache.has(uid) ? memoryCache.get(uid) : null;
}

// Hàng đợi ghi: tránh 2 thao tác (tạo + xoá) chồng nhau làm mất dữ liệu
let writeQueue = Promise.resolve();
function enqueue(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

// Key dạng aibox_sk_ + 32 ký tự base36 (đủ dài để không trùng trong demo)
export function generateApiKey() {
  let body = '';
  while (body.length < 32) {
    body += Math.random().toString(36).slice(2);
  }
  return `aibox_sk_${body.slice(0, 32)}`;
}

// Che key khi hiển thị: giữ tiền tố + 4 ký tự cuối
export function maskApiKey(key) {
  const raw = String(key || '');
  if (raw.length <= 8) return '••••';
  return `${raw.slice(0, 8)}••••${raw.slice(-4)}`;
}

function sanitize(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const key = typeof entry.key === 'string' ? entry.key.trim() : '';
  if (!key) return null;
  const limit = Number(entry.monthlyLimit);
  const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
  return {
    id: String(entry.id || generateId()),
    name: String(entry.name || 'API key').slice(0, 40),
    key,
    mask: maskApiKey(key),
    createdAt,
    active: entry.active !== false,
    monthlyLimit: Number.isFinite(limit) && limit > 0 ? Math.round(limit) : null,
  };
}

function sortNewest(list) {
  return list.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Đọc danh sách key; lỗi storage sẽ throw để màn hình hiện trạng thái "Thử lại"
export async function loadApiKeys(uid) {
  if (!uid) return [];
  const raw = await AsyncStorage.getItem(keyOf(uid));
  const list = parseList(raw);
  // Đồng bộ cache RAM để lần mở sau hiện ngay, không nháy skeleton
  memoryCache.set(uid, list);
  return list;
}

// Tách riêng để loadApiKeys & peek dùng chung cách chuẩn hoá dữ liệu
function parseList(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed && parsed.keys);
    return sortNewest((Array.isArray(list) ? list : []).map(sanitize).filter(Boolean));
  } catch {
    // Dữ liệu hỏng → coi như chưa có key, không làm crash màn hình
    return [];
  }
}

function persist(uid, list) {
  // Cập nhật cache ngay (UI thấy kết quả tức thì), rồi mới ghi xuống đĩa
  memoryCache.set(uid, list);
  return enqueue(async () => {
    await AsyncStorage.setItem(keyOf(uid), JSON.stringify({ updatedAt: new Date().toISOString(), keys: list }));
  });
}

// Tạo key mới. Ném lỗi có .code = 'LIMIT' khi đã đủ số key
export async function createApiKey(uid, { name, monthlyLimit } = {}) {
  if (!uid) throw Object.assign(new Error('Bạn cần đăng nhập.'), { code: 'AUTH' });
  const current = await loadApiKeys(uid);
  if (current.length >= MAX_API_KEYS) {
    throw Object.assign(
      new Error(`Tối đa ${MAX_API_KEYS} key. Xoá bớt key cũ rồi tạo lại.`),
      { code: 'LIMIT' }
    );
  }

  const entry = sanitize({
    id: generateId(),
    name: String(name || '').trim().slice(0, 40) || 'Key chưa đặt tên',
    key: generateApiKey(),
    createdAt: new Date().toISOString(),
    active: true,
    monthlyLimit,
  });

  const list = sortNewest([entry, ...current]);
  await persist(uid, list);
  return { entry, list };
}

// Bật/tắt key
export async function setApiKeyActive(uid, id, active) {
  const current = await loadApiKeys(uid);
  const list = current.map(k => (k.id === id ? { ...k, active: Boolean(active) } : k));
  await persist(uid, list);
  return list;
}

// Xoá key, trả về bản ghi đã xoá để màn hình có thể hoàn tác
export async function removeApiKey(uid, id) {
  const current = await loadApiKeys(uid);
  const removed = current.find(k => k.id === id) || null;
  const list = current.filter(k => k.id !== id);
  await persist(uid, list);
  return { removed, list };
}

// Hoàn tác xoá (snackbar 5s)
export async function restoreApiKey(uid, entry) {
  const current = await loadApiKeys(uid);
  const clean = sanitize(entry);
  if (!clean) return current;
  const list = sortNewest([clean, ...current.filter(k => k.id !== clean.id)]);
  await persist(uid, list);
  return list;
}
