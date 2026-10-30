// utils/spend.js — Tính chi tiêu AI cho Home (card "Chi tiêu 7 ngày") và hạn mức tháng.
// Nguồn dữ liệu: transactions type AI_CALL (amount âm, timestamp ISO).
import { toDayKey } from './format';

// Hạn mức tháng của bản demo (token). Không có backend nên đặt hằng số ở đây.
export const MONTHLY_QUOTA = 100000;

// Lấy day-key theo giờ local, lùi `offset` ngày so với hôm nay
function dayKeyOffset(now, offset) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  return toDayKey(d);
}

/**
 * Tổng hợp chi tiêu AI trong `days` ngày gần nhất.
 * @returns {{
 *   series: {key: string, value: number}[],
 *   total: number, prevTotal: number, requests: number,
 *   deltaPct: number|null, avgPerDay: number,
 *   monthSpent: number, quota: number, quotaLeftPct: number, quotaLeft: number,
 * }}
 */
export function buildSpendSummary(transactions = [], { days = 7, now = new Date(), quota = MONTHLY_QUOTA } = {}) {
  const keys = [];
  const prevKeys = [];
  for (let i = days - 1; i >= 0; i--) keys.push(dayKeyOffset(now, i));
  for (let i = days * 2 - 1; i >= days; i--) prevKeys.push(dayKeyOffset(now, i));

  const buckets = {};
  keys.forEach(k => { buckets[k] = 0; });
  const prevBuckets = {};
  prevKeys.forEach(k => { prevBuckets[k] = 0; });

  // Tháng hiện tại theo local (YYYY-MM)
  const monthPrefix = toDayKey(now).slice(0, 7);
  let monthSpent = 0;
  let requests = 0;

  transactions.forEach(tx => {
    if (!tx || tx.type !== 'AI_CALL') return;
    const spend = Math.abs(Number(tx.amount) || 0);
    const dayKey = toDayKey(tx.timestamp);
    if (!dayKey) return;

    if (dayKey.startsWith(monthPrefix)) monthSpent += spend;
    if (buckets[dayKey] !== undefined) {
      buckets[dayKey] += spend;
      requests += 1;
    } else if (prevBuckets[dayKey] !== undefined) {
      prevBuckets[dayKey] += spend;
    }
  });

  const series = keys.map(key => ({ key, value: buckets[key] }));
  const total = series.reduce((sum, item) => sum + item.value, 0);
  const prevTotal = prevKeys.reduce((sum, key) => sum + prevBuckets[key], 0);
  const deltaPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  const quotaLeft = Math.max(quota - monthSpent, 0);

  return {
    series,
    total,
    prevTotal,
    requests,
    deltaPct,
    avgPerDay: Math.round(total / days),
    monthSpent,
    quota,
    quotaLeft,
    quotaLeftPct: quota > 0 ? Math.round((quotaLeft / quota) * 100) : 0,
  };
}
