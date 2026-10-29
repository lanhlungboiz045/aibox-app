// data/accounts.js — Hồ sơ người chơi (ví token local) + quyền
//
// Identity/đăng nhập do Firebase lo (xem src/services/auth.js).
// File này chỉ tạo "player record" local: ví, positions, inventory, quests...
// key theo uid của Firebase để mỗi tài khoản Google có ví riêng trên máy.

import { LEADERBOARD } from './mockData';

export const AVATARS = ['\u{1F60E}', '\u{1F985}', '\u{1F9E0}', '\u{1F433}', '\u{1F52E}', '\u{1F43A}', '\u{1F9D9}', '\u{1F3B2}', '\u{1F451}', '\u{1F3AF}', '\u{1F680}', '\u{1F6E1}'];

export const ROLE_LABELS = {
  admin: 'System Admin',
  creator: 'Market Creator',
  user: 'Standard User',
};

export const ROLE_COLORS = {
  admin: '#FF6B6B',
  creator: '#FFB74D',
  user: '#8E8E93',
};

export const PROVIDER_LABELS = {
  google: 'Google',
  demo: 'Chế độ demo (Expo Go)',
  system: 'Tài khoản hệ thống',
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
export function createWallet({ tokenBalance = STARTING_BALANCE, rank = 20 } = {}) {
  return {
    tokenBalance,
    totalEarned: 0,
    totalSpentOnAI: 0,
    totalSpentOnStore: 0,
    creatorEarnings: 0,
    rank,
    joinedDate: new Date().toISOString(),
    lastDailyClaim: null,
    dailyStreak: 0,
    positions: [],
    transactions: [],
    // Store: đồ đã mua + đang dùng
    inventory: [],
    equipped: { frame: null, nameColor: null },
    // Copy trade: id các trader đang follow
    following: [],
  };
}

// Tạo player record local cho 1 tài khoản Firebase (hoặc 1 trader nền)
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

// Tài khoản "nền" cho các trader trên Leaderboard: không đăng nhập được (provider system)
// nhưng vẫn tồn tại để Transfer / Copy Trade / Risk có dữ liệu thật.
// u20 trên leaderboard là "Bạn" của bản demo cũ → bỏ, người dùng thật giờ do Firebase cấp.
export const SHADOW_ACCOUNTS = LEADERBOARD
  .filter(row => row.id !== 'u20')
  .map(row => createAccount({
    id: row.id,
    email: `${row.id}@aibox.local`,
    username: row.username,
    avatar: row.avatar,
    provider: 'system',
    wallet: { tokenBalance: row.tokenBalance, rank: row.rank },
  }));

// Seed khi chưa có gì trong AsyncStorage — chỉ còn trader nền
export const SEED_ACCOUNTS = SHADOW_ACCOUNTS;
