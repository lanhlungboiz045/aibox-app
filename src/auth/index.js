// auth/index.js — Tiện ích phiên đăng nhập (MOCK — chỉ dùng cho demo đồ án)
// LƯU Ý: hash ở đây KHÔNG phải mã hoá thật, token sinh bằng Math.random.
// Lên production: bcrypt/argon2 ở server + JWT/refresh token do backend cấp.

// Thời hạn phiên: 7 ngày (demo). Thực tế access token ~15 phút, refresh ~30 ngày.
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Còn dưới 1 ngày thì coi như "refresh" → cấp phiên mới (mô phỏng refresh token)
export const SESSION_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function createSalt() {
  return Math.random().toString(36).substring(2, 10);
}

// Hash demo: djb2 lặp nhiều vòng + salt. Không dùng cho hệ thống thật.
export function hashPassword(password, salt) {
  const input = `${salt}:${password}`;
  let hash = 5381;
  for (let round = 0; round < 1500; round++) {
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash + input.charCodeAt(i) + round) >>> 0;
    }
  }
  return hash.toString(16).padStart(8, '0');
}

export function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  return hashPassword(password, salt) === hash;
}

export function createSessionToken() {
  return `mock_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
}

// Tạo session mới cho 1 account
export function createSession(userId, ttl = SESSION_TTL_MS) {
  const now = Date.now();
  return { userId, token: createSessionToken(), issuedAt: now, expiresAt: now + ttl };
}

// Còn bao lâu nữa thì hết phiên (ms)
export function sessionTimeLeft(session) {
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

// Kiểm tra email hợp lệ (đơn giản, đủ dùng cho demo)
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}
