// data/accounts.js — Hồ sơ người dùng (ví token local) + quyền
//
// Identity/đăng nhập do Firebase lo (xem src/services/auth.js).
// File này chỉ tạo player record local: ví, transactions, quests...
// key theo uid của Firebase để mỗi tài khoản Google có ví riêng trên máy.

import { colors } from '../theme/tokens';

export const AVATARS = ['\u{1F60E}', '\u{1F985}', '\u{1F9E0}', '\u{1F433}', '\u{1F52E}', '\u{1F43A}', '\u{1F9D9}', '\u{1F3B2}', '\u{1F451}', '\u{1F3AF}', '\u{1F680}', '\u{1F6E1}'];

export const ROLE_LABELS = {
  admin: 'Quản trị hệ thống',
  user: 'Người dùng',
};

export const ROLE_COLORS = {
  admin: colors.danger,
  user: colors.textDim,
};

export const PROVIDER_LABELS = {
  google: 'Google',
  email: 'Email / mật khẩu',
  demo: 'Chế độ mô phỏng',
};

export const STARTING_BALANCE = 10000;

// Chọn avatar emoji ổn định theo uid/email (cùng người → cùng avatar)
export function pickAvatar(seed = '') {
  let hash = 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}

// Ví + tiến trình của 1 tài khoản (tách khỏi identity để dễ đọc)
export function createWallet({ tokenBalance = STARTING_BALANCE } = {}) {
  return {
    tokenBalance,
    totalEarned: 0,
    totalSpentOnAI: 0,
    joinedDate: new Date().toISOString(),
    lastDailyClaim: null,
    dailyStreak: 0,
    transactions: [],
  };
}

// Tạo player record local cho một tài khoản Firebase.
export function createAccount({
  id,
  email = '',
  username = 'Người dùng',
  avatar = null,
  photoURL = null,
  role = 'user',
  status = 'active',
  provider = 'google',
  wallet = {},
} = {}) {
  return {
    id,
    email: String(email || '').trim().toLowerCase(),
    username,
    avatar: avatar || pickAvatar(id || username),
    photoURL,
    role,
    status,
    provider,
    createdAt: new Date().toISOString(),
    ...createWallet(wallet),
  };
}
