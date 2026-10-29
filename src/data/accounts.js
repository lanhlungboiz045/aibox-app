// data/accounts.js — Tài khoản mock: identity + ví token + quyền
import { createSalt, hashPassword } from '../auth';
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
  password: 'Email/Password',
  google: 'Google',
  github: 'GitHub',
  discord: 'Discord',
  wallet: 'Web3 Wallet',
  system: 'Tài khoản hệ thống',
};

export const STARTING_BALANCE = 10000;

// Ví + tiến trình của 1 tài khoản (tách khỏi phần identity để dễ đọc)
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

export function createAccount({
  id = null,
  email,
  username,
  avatar = '\u{1F60E}',
  role = 'user',
  provider = 'password',
  password = null,
  status = 'active',
  wallet = {},
  walletAddress = null,
} = {}) {
  const salt = password ? createSalt() : null;
  return {
    id: id || `u_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
    email: String(email || '').trim().toLowerCase(),
    username,
    avatar,
    role,
    status,
    provider,
    salt,
    passwordHash: password ? hashPassword(password, salt) : null,
    walletAddress,
    createdAt: new Date().toISOString(),
    ...createWallet(wallet),
  };
}

// Tài khoản demo — mật khẩu công khai vì đây là app demo, không phải hệ thống thật
export const DEMO_ACCOUNTS = [
  createAccount({
    id: 'u_admin',
    email: 'admin@aibox.app',
    username: 'System Admin',
    avatar: '\u{1F6E1}',
    role: 'admin',
    password: 'admin123',
    wallet: { tokenBalance: 500000, rank: 1 },
  }),
  createAccount({
    id: 'u_creator',
    email: 'creator@aibox.app',
    username: 'MarketMaker',
    avatar: '\u{1F4C8}',
    role: 'creator',
    password: 'creator123',
    wallet: { tokenBalance: 80000, rank: 4 },
  }),
  createAccount({
    id: 'u20',
    email: 'user@aibox.app',
    username: 'Bạn',
    avatar: '\u{1F60E}',
    role: 'user',
    password: 'user123',
    wallet: { tokenBalance: 10000, rank: 20 },
  }),
  createAccount({
    id: 'u_google',
    email: 'google.user@gmail.com',
    username: 'Google User',
    avatar: '\u{1F9E0}',
    role: 'user',
    provider: 'google',
    wallet: { tokenBalance: 12000 },
  }),
  createAccount({
    id: 'u_github',
    email: 'octocat@github.com',
    username: 'Octocat',
    avatar: '\u{1F43A}',
    role: 'user',
    provider: 'github',
    wallet: { tokenBalance: 9000 },
  }),
  createAccount({
    id: 'u_discord',
    email: 'nitro@discord.com',
    username: 'NitroUser',
    avatar: '\u{1F3AE}',
    role: 'user',
    provider: 'discord',
    wallet: { tokenBalance: 7500 },
  }),
  createAccount({
    id: 'u_wallet',
    email: '0x7a3f...9c21@wallet.local',
    username: '0x7a3f...9c21',
    avatar: '\u{1F98A}',
    role: 'user',
    provider: 'wallet',
    walletAddress: '0x7a3f4b8e2d1c9a0f3e5d7b6c8a1f2e3d4c5b6a79',
    wallet: { tokenBalance: 15000 },
  }),
];

// Tài khoản "nền" cho các trader trên Leaderboard: không đăng nhập được (provider system)
// nhưng vẫn tồn tại trong hệ thống để Transfer / Copy Trade / Risk có dữ liệu thật.
// u4 trùng username với tài khoản creator demo nên bỏ qua; u20 chính là tài khoản demo 'Bạn'.
export const SHADOW_ACCOUNTS = LEADERBOARD
  .filter(row => row.id !== 'u4' && row.id !== 'u20')
  .map(row => createAccount({
    id: row.id,
    email: `${row.id}@aibox.local`,
    username: row.username,
    avatar: row.avatar,
    provider: 'system',
    wallet: { tokenBalance: row.tokenBalance, rank: row.rank },
  }));

// Toàn bộ tài khoản seed (demo + nền) — dùng để merge khi load state
export const SEED_ACCOUNTS = [...DEMO_ACCOUNTS, ...SHADOW_ACCOUNTS];
