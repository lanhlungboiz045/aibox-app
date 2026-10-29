// utils/format.js — Hàm format hiển thị (JavaScript)

// Format số token với dấu phẩy (VD: 10000 -> "10,000")
export function formatToken(amount) {
  return amount.toLocaleString('en-US');
}

// Format token rút gọn (VD: 125000 -> "125K", 1000000 -> "1M")
export function formatTokenShort(amount) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
}

// Format ngày (VD: "2025-11-02T22:00:00Z" -> "02/11/2025")
export function formatDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Format thời gian còn lại (VD: "Còn 3 ngày", "Còn 5 giờ")
export function formatTimeLeft(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Đã kết thúc';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Còn ${days} ngày`;
  if (hours > 0) return `Còn ${hours} giờ`;
  const mins = Math.floor(diff / (1000 * 60));
  return `Còn ${mins} phút`;
}

// Format timestamp thành thời gian tương đối (VD: "2 phút trước", "1 giờ trước")
export function formatRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diff = now.getTime() - past.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (mins > 0) return `${mins} phút trước`;
  return 'Vừa xong';
}

// Ngày theo giờ LOCAL dạng "YYYY-MM-DD".
// Không dùng toISOString(): đó là ngày UTC, ở VN (UTC+7) sẽ reset lúc 07:00 sáng.
export function toDayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// Số ngày lệch giữa 2 day-key (to - from). Dùng Date.UTC để không lệch vì DST.
export function daysBetween(fromKey, toKey) {
  if (!fromKey || !toKey) return null;
  const toUtc = (key) => {
    const [y, m, d] = String(key).split('-').map(Number);
    if (!y || !m || !d) return NaN;
    return Date.UTC(y, m - 1, d);
  };
  const from = toUtc(fromKey);
  const to = toUtc(toKey);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / 86400000);
}

// Clamp số trong range [min, max]
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Format tiền +/- (VD: +500, -50)
export function formatAmount(amount) {
  if (amount >= 0) return '+' + formatToken(amount);
  return formatToken(amount);
}

// Sinh ID ngẫu nhiên
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
