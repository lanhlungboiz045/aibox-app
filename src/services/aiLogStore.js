// services/aiLogStore.js — Store DUY NHẤT cho log gọi AI.
//
// Mỗi lượt chat (thành công, lỗi hay bị dừng) ghi đúng MỘT bản ghi vào đây.
// Home, Logs, Usage, Lịch sử giao dịch và Profile đều đọc/aggregate từ cùng
// một mảng `state.aiLogs`, nên các con số (lượt gọi, token, chi phí) không
// bao giờ lệch nhau giữa các màn.
//
// Bản ghi:
// {
//   id, userId, timestamp,
//   modelId, requestedModelName,   // model người dùng chọn trong app
//   model, modelName,              // model THỰC SỰ được gọi (API trả về / đã resolve)
//   provider,
//   status: 'success' | 'error' | 'canceled',
//   tokens, promptTokens, completionTokens, // usage thật của nhà cung cấp
//   cost,                          // token thực bị trừ khỏi ví
//   latencyMs, mode: 'live' | 'mock',
//   prompt, error,
// }

import { generateId, toDayKey } from '../utils/format';

export const MAX_AI_LOGS = 500;
export const MONTHLY_QUOTA = 100000;

export const AI_LOG_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELED: 'canceled',
};

const STATUS_VALUES = new Set(Object.values(AI_LOG_STATUS));

function toCount(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toText(value, max = 300) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

// Chuẩn hoá 1 bản ghi đọc từ storage / tạo mới: bỏ field lạ, chặn dữ liệu rác.
export function sanitizeAILog(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.userId) return null;

  const modelId = toText(raw.modelId, 120) || 'unknown';
  const actualModel = toText(raw.model, 120) || modelId;
  const requestedModelName = toText(raw.requestedModelName, 120);
  const modelName = toText(raw.modelName, 120) || requestedModelName || actualModel;

  return {
    id: String(raw.id),
    userId: String(raw.userId),
    timestamp: typeof raw.timestamp === 'string' && raw.timestamp
      ? raw.timestamp
      : new Date().toISOString(),
    modelId,
    requestedModelName,
    model: actualModel,
    modelName,
    provider: toText(raw.provider, 60),
    status: STATUS_VALUES.has(raw.status) ? raw.status : AI_LOG_STATUS.SUCCESS,
    tokens: toCount(raw.tokens),
    promptTokens: toCount(raw.promptTokens),
    completionTokens: toCount(raw.completionTokens),
    cost: toCount(raw.cost),
    latencyMs: toCount(raw.latencyMs),
    mode: raw.mode === 'mock' ? 'mock' : 'live',
    prompt: toText(raw.prompt, 200),
    error: toText(raw.error, 300),
    migrated: Boolean(raw.migrated),
  };
}

// Mới nhất lên đầu, giới hạn số bản ghi để storage không phình vô hạn.
export function sanitizeAILogs(list) {
  return (Array.isArray(list) ? list : [])
    .map(sanitizeAILog)
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_AI_LOGS);
}

// Tạo bản ghi mới (id + thời gian sinh tự động).
export function createAILog(input = {}) {
  return sanitizeAILog({
    ...input,
    id: generateId(),
    timestamp: new Date().toISOString(),
  });
}

// Migration: dữ liệu cũ chỉ có transaction AI_CALL → dựng lại log để các màn
// không bị "mất" lịch sử sau khi nâng version storage.
export function migrateLogsFromTransactions(accounts = []) {
  const logs = [];
  (Array.isArray(accounts) ? accounts : []).forEach(account => {
    (account && Array.isArray(account.transactions) ? account.transactions : []).forEach(tx => {
      if (!tx || tx.type !== 'AI_CALL') return;
      const cost = toCount(Math.abs(tx.amount));
      const tokens = toCount(tx.tokens) || cost;
      logs.push({
        id: tx.id || `${account.id}-${tx.timestamp}`,
        userId: account.id,
        timestamp: tx.timestamp,
        modelId: tx.modelId || 'unknown',
        model: tx.modelId || 'unknown',
        modelName: tx.modelId || 'unknown',
        status: AI_LOG_STATUS.SUCCESS,
        tokens,
        cost,
        mode: 'live',
        prompt: tx.description || '',
        migrated: true,
      });
    });
  });
  return sanitizeAILogs(logs);
}

// Chỉ log của 1 user, mới nhất trước.
export function logsForUser(logs, userId) {
  if (!userId) return [];
  return (Array.isArray(logs) ? logs : [])
    .filter(log => log && log.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function isSuccessfulLog(log) {
  return Boolean(log) && log.status === AI_LOG_STATUS.SUCCESS;
}

// Token thực bị trừ khỏi ví (lỗi / bị dừng = 0).
export function logCost(log) {
  return isSuccessfulLog(log) ? toCount(log.cost) : 0;
}

// Số token nhà cung cấp báo đã dùng (prompt + completion).
export function logTokens(log) {
  return isSuccessfulLog(log) ? toCount(log.tokens) : 0;
}

export function logStatusLabel(status) {
  if (status === AI_LOG_STATUS.ERROR) return 'Lỗi';
  if (status === AI_LOG_STATUS.CANCELED) return 'Đã dừng';
  return 'Thành công';
}

// Tên model để hiển thị: ưu tiên khớp id trong danh sách model của app.
export function resolveModelLabel(modelId, aiModels = []) {
  const id = String(modelId || '').trim();
  if (!id) return 'Mô hình AI';

  const models = Array.isArray(aiModels) ? aiModels : [];
  const exact = models.find(m => m.id === id);
  if (exact) return exact.name;

  // API có thể trả id kèm ngày (vd gpt-4o-2024-08-06) → vẫn nhận ra model gốc.
  const byPrefix = models
    .filter(m => m && m.id && id.startsWith(`${m.id}-`))
    .sort((a, b) => b.id.length - a.id.length)[0];
  if (byPrefix) return byPrefix.name;

  return id;
}

// Tên model của 1 log, luôn dùng model THỰC SỰ đã gọi.
export function logModelName(log, aiModels = []) {
  if (!log) return 'Mô hình khác';
  return resolveModelLabel(log.model || log.modelId, aiModels)
    || log.modelName
    || log.modelId
    || 'Mô hình khác';
}

function dayKeyOffset(now, offset) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  return toDayKey(d);
}

/**
 * Tổng hợp log AI — nguồn số liệu duy nhất cho Home / Logs / Usage / Profile.
 *
 * @returns {{
 *   logs: object[], requests: number,
 *   successCount: number, errorCount: number, canceledCount: number, successRate: number,
 *   tokens: number, cost: number,
 *   series: {key: string, value: number}[], total: number, prevTotal: number,
 *   deltaPct: number|null, avgPerDay: number, windowRequests: number,
 *   monthSpent: number, quota: number, quotaLeft: number, quotaLeftPct: number,
 *   byModel: object[], recent: object[],
 * }}
 */
export function summarizeAILogs(logs = [], {
  days = 7,
  now = new Date(),
  quota = MONTHLY_QUOTA,
  aiModels = [],
} = {}) {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.round(days) : 7;
  const sorted = (Array.isArray(logs) ? logs : [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const keys = [];
  const prevKeys = [];
  for (let i = safeDays - 1; i >= 0; i -= 1) keys.push(dayKeyOffset(now, i));
  for (let i = safeDays * 2 - 1; i >= safeDays; i -= 1) prevKeys.push(dayKeyOffset(now, i));

  const buckets = {};
  const prevBuckets = {};
  keys.forEach(key => { buckets[key] = 0; });
  prevKeys.forEach(key => { prevBuckets[key] = 0; });

  const monthPrefix = toDayKey(now).slice(0, 7);
  const byModelMap = new Map();

  let tokens = 0;
  let cost = 0;
  let monthSpent = 0;
  let windowRequests = 0;
  let successCount = 0;
  let errorCount = 0;
  let canceledCount = 0;

  sorted.forEach(log => {
    const logTokensUsed = logTokens(log);
    const logCostValue = logCost(log);
    tokens += logTokensUsed;
    cost += logCostValue;

    if (log.status === AI_LOG_STATUS.SUCCESS) successCount += 1;
    else if (log.status === AI_LOG_STATUS.ERROR) errorCount += 1;
    else if (log.status === AI_LOG_STATUS.CANCELED) canceledCount += 1;

    const dayKey = toDayKey(log.timestamp);
    if (dayKey && dayKey.startsWith(monthPrefix)) monthSpent += logCostValue;
    if (dayKey && buckets[dayKey] !== undefined) {
      buckets[dayKey] += logCostValue;
      windowRequests += 1;
    } else if (dayKey && prevBuckets[dayKey] !== undefined) {
      prevBuckets[dayKey] += logCostValue;
    }

    const groupId = log.model || log.modelId || 'unknown';
    const group = byModelMap.get(groupId) || {
      modelId: groupId,
      modelName: logModelName(log, aiModels),
      model: (Array.isArray(aiModels) ? aiModels : []).find(m => m.id === groupId) || null,
      count: 0,
      tokens: 0,
      cost: 0,
    };
    group.count += 1;
    group.tokens += logTokensUsed;
    group.cost += logCostValue;
    byModelMap.set(groupId, group);
  });

  const series = keys.map(key => ({ key, value: buckets[key] }));
  const total = series.reduce((sum, item) => sum + item.value, 0);
  const prevTotal = prevKeys.reduce((sum, key) => sum + prevBuckets[key], 0);
  const deltaPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const quotaLeft = Math.max(quota - monthSpent, 0);

  return {
    logs: sorted,
    requests: sorted.length,
    successCount,
    errorCount,
    canceledCount,
    successRate: sorted.length ? Math.round((successCount / sorted.length) * 100) : 0,
    tokens,
    cost,
    series,
    total,
    prevTotal,
    deltaPct,
    avgPerDay: Math.round(total / safeDays),
    windowRequests,
    monthSpent,
    quota,
    quotaLeft,
    quotaLeftPct: quota > 0 ? Math.round((quotaLeft / quota) * 100) : 0,
    byModel: Array.from(byModelMap.values()).sort((a, b) => b.cost - a.cost || b.count - a.count),
    recent: sorted.slice(0, 20),
  };
}
