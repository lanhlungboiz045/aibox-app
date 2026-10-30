// context/AppContext.jsx — Global state cho AIBox (JavaScript, không TypeScript)
// Quản lý: token, AI calls, trading, transfer, daily reward, quests, comments,
// notifications, store, copy trade, admin CMS, AsyncStorage
//
// AUTH: Firebase Authentication (Google) — xem src/services/auth.js
// USER INFO: Firestore users/{uid} (role/status/username/avatar) — xem src/services/users.js
// Ví token / positions / quests vẫn lưu local theo uid để demo offline.

import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MARKETS, AI_MODELS, MOCK_AI_RESPONSES } from '../data/mockData';
import { SEED_ACCOUNTS, createAccount, createWallet, ROLE_LABELS, pickAvatar } from '../data/accounts';
import { STORE_ITEMS, getStoreItem } from '../data/storeItems';
import { QUESTS, ensureQuestState, getQuestProgress } from '../data/quests';
import { clamp, generateId, toDayKey, daysBetween } from '../utils/format';
import { getDailyReward } from '../utils/rewards';
import { buildMarketAnalysis } from '../utils/analyst';
import { MIN_AI_CALL_BALANCE, costFromUsage, chargeTokens } from '../utils/aiCost';
import {
  subscribeAuth,
  signInWithGoogle as googleSignIn,
  signOutGoogle,
  isGoogleSignInConfigured,
} from '../services/auth';
import {
  ensureUserProfile,
  subscribeUserProfile,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
  listUserProfiles,
} from '../services/users';
import {
  loadAISettings,
  saveAISettings,
  resetAISettings,
  getAIStatus,
  isLiveMode,
  buildChatMessages,
  chatComplete,
  testAIConnection,
} from '../services/ai';

const STORAGE_KEY = '@aibox_state';
// Key của format cũ (2 key, không version) — chỉ đọc 1 lần để migrate markets
const LEGACY_MARKETS_KEY = '@aibox_markets_state';
const STORAGE_VERSION = 4;
// uid cố định cho chế độ demo (chỉ dev) — không trùng uid Firebase nào
const DEMO_UID = 'demo-expo-go';
const PERSIST_DEBOUNCE_MS = 400;
// Giới hạn lịch sử để JSON.stringify không phình dần theo thời gian
const MAX_TRANSACTIONS = 200;
const MAX_NOTIFICATIONS = 80;
const MAX_COMMENTS_PER_MARKET = 100;
export const CREATOR_FEE_PCT = 2;

// ============ SANITIZE / MIGRATE ============

// Chuẩn hoá account đọc từ storage: thiếu field nào thì dùng default.
function sanitizeAccount(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const wallet = createWallet();
  const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  return {
    ...wallet,
    ...raw,
    tokenBalance: num(raw.tokenBalance, wallet.tokenBalance),
    totalEarned: num(raw.totalEarned, wallet.totalEarned),
    totalSpentOnAI: num(raw.totalSpentOnAI, wallet.totalSpentOnAI),
    totalSpentOnStore: num(raw.totalSpentOnStore, wallet.totalSpentOnStore),
    creatorEarnings: num(raw.creatorEarnings, 0),
    rank: num(raw.rank, wallet.rank),
    dailyStreak: num(raw.dailyStreak, wallet.dailyStreak),
    positions: Array.isArray(raw.positions) ? raw.positions : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    equipped: raw.equipped && typeof raw.equipped === 'object' ? { frame: null, nameColor: null, ...raw.equipped } : { frame: null, nameColor: null },
    following: Array.isArray(raw.following) ? raw.following : [],
    role: ['admin', 'creator', 'user'].includes(raw.role) ? raw.role : 'user',
    status: raw.status === 'banned' ? 'banned' : 'active',
  };
}

// Luôn merge tài khoản seed (trader nền) để không mất dữ liệu transfer/copy trade
function sanitizeAccounts(raw) {
  const persisted = Array.isArray(raw) ? raw.map(sanitizeAccount).filter(Boolean) : [];
  const byId = new Map(persisted.map(account => [account.id, account]));
  const seed = SEED_ACCOUNTS.map(account => ({ ...account, ...(byId.get(account.id) || {}) }));
  const extra = persisted.filter(account => !SEED_ACCOUNTS.some(d => d.id === account.id));
  return [...seed, ...extra];
}

// Markets: giữ giá/trạng thái đã lưu nhưng vẫn nhận market mới thêm trong mockData
function sanitizeMarkets(raw) {
  const defaults = MARKETS.map(m => ({ ...m }));
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const persisted = new Map(raw.filter(m => m && m.id).map(m => [m.id, m]));
  const merged = defaults.map(m => ({ ...m, ...(persisted.get(m.id) || {}) }));
  // Market do user tạo (không có trong mockData) vẫn phải giữ
  const extra = raw.filter(m => m && m.id && !defaults.some(d => d.id === m.id));
  return [...merged, ...extra];
}

function sanitizeComments(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const result = {};
  Object.entries(raw).forEach(([marketId, list]) => {
    if (Array.isArray(list)) result[marketId] = list.filter(c => c && c.id && c.userId);
  });
  return result;
}

function sanitizeNotifications(raw) {
  return Array.isArray(raw) ? raw.filter(n => n && n.id && n.userId).slice(0, MAX_NOTIFICATIONS) : [];
}

function sanitizeCopyTrades(raw) {
  return Array.isArray(raw) ? raw.filter(c => c && c.id && c.followerId && c.leaderId) : [];
}

function sanitizeQuests(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const result = {};
  Object.entries(raw).forEach(([userId, questState]) => {
    if (questState && questState.counters) result[userId] = ensureQuestState(questState);
  });
  return result;
}

function createInitialState() {
  return {
    accounts: SEED_ACCOUNTS.map(account => ({ ...account })),
    // Auth do Firebase quản lý: firebaseUser = Firebase User đã rút gọn
    firebaseUser: null,
    // profile = document users/{uid} trên Firestore (role, status, username...)
    profile: null,
    profileSync: null,
    authReady: false,
    authNotice: null,
    // Chế độ demo CHỈ dùng khi dev (Expo Go không có native Google Sign-In).
    // Không tạo tài khoản Firebase, chỉ tạo ví local để test UI.
    demoMode: false,
    markets: MARKETS.map(m => ({ ...m })),
    aiModels: AI_MODELS,
    comments: {},
    notifications: [],
    copyTrades: [],
    quests: {},
    isLoading: true,
  };
}

// Đọc state đã lưu: ưu tiên format mới (có version), fallback migrate format cũ
async function loadPersistedState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === STORAGE_VERSION) {
        return {
          accounts: sanitizeAccounts(parsed.accounts),
          markets: sanitizeMarkets(parsed.markets),
          comments: sanitizeComments(parsed.comments),
          notifications: sanitizeNotifications(parsed.notifications),
          copyTrades: sanitizeCopyTrades(parsed.copyTrades),
          quests: sanitizeQuests(parsed.quests),
        };
      }
      // Version cũ (1/2/3) gắn với tài khoản mock có mật khẩu local.
      // Sang Firebase, uid mới nên không map được → chỉ giữ lại markets.
      return { markets: sanitizeMarkets(parsed && parsed.markets) };
    }

    const legacyMarkets = await AsyncStorage.getItem(LEGACY_MARKETS_KEY);
    if (!legacyMarkets) return null;
    return { markets: sanitizeMarkets(JSON.parse(legacyMarkets)) };
  } catch (e) {
    if (__DEV__) console.warn('[AppContext] Không đọc được state đã lưu:', e);
    return null;
  }
}

// ============ HELPERS ============

function getCurrentUser(state) {
  if (!state.firebaseUser) return null;
  return state.accounts.find(account => account.id === state.firebaseUser.uid) || null;
}

// Username hiển thị không được trùng với trader nền / người dùng khác
function ensureUniqueUsername(accounts, desired, uid) {
  const base = String(desired || 'Người dùng').trim() || 'Người dùng';
  let name = base;
  let suffix = 1;
  while (accounts.some(a => a.id !== uid && String(a.username || '').toLowerCase() === name.toLowerCase())) {
    suffix += 1;
    name = `${base} ${suffix}`;
  }
  return name;
}

// Thay account hiện tại trong danh sách (immutable)
function withAccount(state, account) {
  return { ...state, accounts: state.accounts.map(a => (a.id === account.id ? account : a)) };
}

function withAccounts(state, accounts) {
  return { ...state, accounts };
}

// Thêm transaction, giữ tối đa MAX_TRANSACTIONS bản ghi
function addTransaction(user, tx) {
  const newTx = { ...tx, id: generateId(), timestamp: new Date().toISOString() };
  const transactions = [newTx, ...user.transactions];
  return transactions.length > MAX_TRANSACTIONS ? transactions.slice(0, MAX_TRANSACTIONS) : transactions;
}

function pushNotification(state, { userId, type, title, body }) {
  const notification = {
    id: generateId(), userId, type, title, body, read: false, createdAt: new Date().toISOString(),
  };
  return { ...state, notifications: [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS) };
}

function bumpQuestCounters(state, userId, metric, amount = 1) {
  const dayKey = toDayKey();
  const questState = ensureQuestState(state.quests[userId], dayKey);
  const counters = { ...questState.counters, [metric]: (questState.counters[metric] || 0) + amount };
  return { ...state, quests: { ...state.quests, [userId]: { ...questState, counters } } };
}

// Tính toán mua shares cho 1 account bất kỳ (dùng chung cho user và copy trade)
function buyForAccount(state, account, market, side, shares) {
  const price = side === 'YES' ? market.yesPrice : market.noPrice;
  const cost = shares * price;
  if (cost <= 0 || account.tokenBalance < cost) return null;

  const existingPos = account.positions.find(p => p.marketId === market.id && p.side === side);
  let positions;
  if (existingPos) {
    const totalShares = existingPos.shares + shares;
    const totalInvested = existingPos.invested + cost;
    positions = account.positions.map(p =>
      p === existingPos ? { ...p, shares: totalShares, invested: totalInvested, avgPrice: totalInvested / totalShares } : p
    );
  } else {
    positions = [...account.positions, { marketId: market.id, side, shares, avgPrice: price, invested: cost }];
  }

  return {
    ...account,
    tokenBalance: account.tokenBalance - cost,
    positions,
    transactions: addTransaction(account, {
      type: 'BUY',
      description: `Mua ${shares} shares ${side}: ${market.question}`,
      amount: -cost,
      marketId: market.id,
    }),
  };
}

function applyMarketPrice(state, marketId, side, shares, amount) {
  return {
    ...state,
    markets: state.markets.map(m => {
      if (m.id !== marketId) return m;
      const yesAdj = side === 'YES' ? shares * 0.01 : -shares * 0.01;
      const newYes = clamp(m.yesPrice + yesAdj, 1, 99);
      return { ...m, yesPrice: newYes, noPrice: 100 - newYes, volume: m.volume + amount };
    }),
  };
}

// ============ REDUCER ============

function reducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      const payload = action.payload || {};
      return {
        ...state,
        accounts: payload.accounts || state.accounts,
        markets: payload.markets || state.markets,
        comments: payload.comments || {},
        notifications: payload.notifications || [],
        copyTrades: payload.copyTrades || [],
        quests: payload.quests || {},
        isLoading: false,
      };
    }

    // ---------- AUTH (Firebase) ----------

    // Đăng nhập xong: tạo/ cập nhật player record local theo uid Firebase
    case 'AUTH_SESSION': {
      const { firebaseUser, profile, profileError } = action.payload;
      const existing = state.accounts.find(a => a.id === firebaseUser.uid);
      const username = ensureUniqueUsername(
        state.accounts,
        profile?.username || existing?.username || firebaseUser.displayName,
        firebaseUser.uid
      );

      const hasProfilePhotoField = profile
        && Object.prototype.hasOwnProperty.call(profile, 'photoURL');
      const account = {
        ...(existing || createAccount({ id: firebaseUser.uid })),
        id: firebaseUser.uid,
        email: firebaseUser.email,
        username,
        avatar: profile?.avatar || existing?.avatar || pickAvatar(firebaseUser.uid),
        // profile.photoURL === null nghĩa là người dùng đã chọn avatar emoji → tôn trọng
        photoURL: hasProfilePhotoField
          ? (profile.photoURL || null)
          : (firebaseUser.photoURL || existing?.photoURL || null),
        role: profile?.role || 'user',
        status: profile?.status || 'active',
        provider: 'google',
      };

      const accounts = existing
        ? state.accounts.map(a => (a.id === account.id ? account : a))
        : [...state.accounts, account];

      return {
        ...state,
        accounts,
        firebaseUser,
        profile: { ...(profile || {}), username },
        profileSync: profileError || null,
        authReady: true,
        authNotice: null,
        quests: { ...state.quests, [account.id]: ensureQuestState(state.quests[account.id]) },
      };
    }

    case 'AUTH_SIGNED_OUT':
      return {
        ...state,
        // Thoát chế độ demo → xoá luôn ví demo cho sạch danh sách tài khoản
        accounts: action.payload?.removeDemo
          ? state.accounts.filter(a => a.id !== DEMO_UID)
          : state.accounts,
        firebaseUser: null,
        profile: null,
        demoMode: false,
        authReady: true,
        // Giữ notice cũ (ví dụ "bị khoá") nếu lần sign-out này không kèm lý do
        authNotice: action.payload?.notice ?? state.authNotice,
      };

    // Chế độ demo (chỉ dev): giả lập phiên đăng nhập bằng ví local để test UI
    // trên Expo Go — nơi không có Google Sign-In native và không có Firestore.
    case 'DEMO_SESSION': {
      const existing = state.accounts.find(a => a.id === DEMO_UID);
      const account = {
        ...(existing || createAccount({
          id: DEMO_UID,
          email: 'demo@expo-go.local',
          username: 'Demo Expo Go',
          provider: 'demo',
          // Cho xem luôn tab Admin để test CMS khi demo
          role: 'admin',
        })),
        role: 'admin',
        status: 'active',
        provider: 'demo',
      };
      const accounts = existing
        ? state.accounts.map(a => (a.id === DEMO_UID ? account : a))
        : [...state.accounts, account];

      return {
        ...state,
        accounts,
        firebaseUser: {
          uid: DEMO_UID,
          email: account.email,
          displayName: account.username,
          photoURL: null,
        },
        profile: {
          uid: DEMO_UID,
          email: account.email,
          username: account.username,
          avatar: account.avatar,
          role: 'admin',
          status: 'active',
          provider: 'demo',
        },
        profileSync: null,
        demoMode: true,
        authReady: true,
        authNotice: null,
        quests: { ...state.quests, [DEMO_UID]: ensureQuestState(state.quests[DEMO_UID]) },
      };
    }

    // Firestore đổi role/status/username → mirror xuống account local
    case 'PROFILE_PATCH': {
      if (!state.firebaseUser) return state;
      const patch = {};
      Object.entries(action.payload.patch || {}).forEach(([key, value]) => {
        if (value !== undefined) patch[key] = value;
      });
      return {
        ...state,
        profile: state.profile ? { ...state.profile, ...patch } : state.profile,
        accounts: state.accounts.map(a => (a.id === state.firebaseUser.uid ? { ...a, ...patch } : a)),
      };
    }

    case 'AUTH_NOTICE':
      return { ...state, authNotice: action.payload };

    // ---------- TRADING ----------
    case 'BUY_SHARES': {
      const user = getCurrentUser(state);
      const { marketId, side, shares } = action.payload;
      const market = state.markets.find(m => m.id === marketId);
      if (!user || !market || market.resolved) return state;

      const updated = buyForAccount(state, user, market, side, shares);
      if (!updated) return state;

      const next = withAccount(state, updated);
      const priced = applyMarketPrice(next, marketId, side, shares, shares * (side === 'YES' ? market.yesPrice : market.noPrice));
      return bumpQuestCounters(priced, user.id, 'trades');
    }

    case 'SELL_SHARES': {
      const user = getCurrentUser(state);
      const { marketId, side, shares } = action.payload;
      const market = state.markets.find(m => m.id === marketId);
      const position = user?.positions.find(p => p.marketId === marketId && p.side === side);
      if (!user || !market || !position || market.resolved) return state;

      const sellShares = Math.min(shares, position.shares);
      const price = side === 'YES' ? market.yesPrice : market.noPrice;
      const revenue = sellShares * price;

      let positions;
      if (position.shares - sellShares <= 0) {
        positions = user.positions.filter(p => p !== position);
      } else {
        positions = user.positions.map(p =>
          p === position ? { ...p, shares: p.shares - sellShares, invested: p.invested - (p.invested / p.shares) * sellShares } : p
        );
      }

      const updated = {
        ...user,
        tokenBalance: user.tokenBalance + revenue,
        positions,
        transactions: addTransaction(user, {
          type: 'SELL',
          description: `Bán ${sellShares} shares ${side}: ${market.question}`,
          amount: +revenue,
          marketId,
        }),
      };

      return applyMarketPrice(withAccount(state, updated), marketId, side, -sellShares, revenue);
    }

    // Admin quyết định kết quả — trả thưởng cho TẤT CẢ account giữ vị thế
    case 'RESOLVE_MARKET': {
      const { marketId, outcome } = action.payload;
      const market = state.markets.find(m => m.id === marketId);
      if (!market || market.resolved) return state;

      let totalWinningShares = 0;
      state.accounts.forEach(account => {
        account.positions.forEach(p => {
          if (p.marketId === marketId && p.side === outcome) totalWinningShares += p.shares;
        });
      });

      // Fee cho creator (2% volume) + payout lấy từ liquidity của market → không bơm token vô hạn
      const creator = market.createdBy ? state.accounts.find(a => a.id === market.createdBy) : null;
      const fee = creator ? Math.round((market.volume || 0) * CREATOR_FEE_PCT / 100) : 0;
      const pool = Math.max(0, (market.liquidity || 0) - fee);
      const perShare = totalWinningShares > 0 ? Math.min(100, pool / totalWinningShares) : 0;

      let next = state;
      let totalPaid = 0;

      const accounts = state.accounts.map(account => {
        const positions = account.positions.filter(p => p.marketId === marketId);
        if (positions.length === 0) return account;

        let updated = { ...account };
        positions.forEach(position => {
          if (position.side === outcome) {
            const payout = Math.round(position.shares * perShare);
            totalPaid += payout;
            updated = {
              ...updated,
              tokenBalance: updated.tokenBalance + payout,
              totalEarned: updated.totalEarned + payout,
              transactions: addTransaction(updated, {
                type: 'RESOLVE',
                description: `Thắng ${payout} token: ${market.question}`,
                amount: +payout,
                marketId,
              }),
            };
            next = pushNotification(next, {
              userId: account.id,
              type: 'MARKET_RESOLVED',
              title: `Kèo đã có kết quả: ${outcome}`,
              body: `Bạn thắng ${payout} token ở "${market.question}".`,
            });
          } else {
            updated = {
              ...updated,
              transactions: addTransaction(updated, {
                type: 'RESOLVE',
                description: `Thua ${position.invested} token: ${market.question}`,
                amount: 0,
                marketId,
              }),
            };
            next = pushNotification(next, {
              userId: account.id,
              type: 'MARKET_RESOLVED',
              title: `Kèo đã có kết quả: ${outcome}`,
              body: `Bạn thua ở "${market.question}".`,
            });
          }
        });

        updated = { ...updated, positions: account.positions.filter(p => p.marketId !== marketId) };
        return updated;
      });

      // Trả fee cho creator
      if (creator && fee > 0) {
        const index = accounts.findIndex(a => a.id === creator.id);
        if (index >= 0) {
          const creatorAccount = accounts[index];
          accounts[index] = {
            ...creatorAccount,
            tokenBalance: creatorAccount.tokenBalance + fee,
            creatorEarnings: creatorAccount.creatorEarnings + fee,
            transactions: addTransaction(creatorAccount, {
              type: 'CREATOR_FEE',
              description: `Creator fee ${CREATOR_FEE_PCT}% market "${market.question}"`,
              amount: +fee,
              marketId,
            }),
          };
        }
        next = pushNotification(next, {
          userId: creator.id,
          type: 'CREATOR_FEE',
          title: 'Nhận creator fee',
          body: `+${fee} token từ market "${market.question}".`,
        });
      }

      const markets = next.markets.map(m =>
        m.id === marketId
          ? { ...m, resolved: true, outcome, resolvedAt: new Date().toISOString(), liquidity: Math.max(0, (m.liquidity || 0) - fee - totalPaid) }
          : m
      );

      return { ...next, accounts, markets };
    }

    // ---------- AI ----------
    case 'AI_CALL': {
      const user = getCurrentUser(state);
      const { modelId, prompt, cost } = action.payload || {};
      const model = state.aiModels.find(m => m.id === modelId);
      if (!user || !model) return state;

      // Trừ đúng số token API đã dùng; nếu ví không đủ thì trừ tối đa bằng số dư
      const charged = chargeTokens(user.tokenBalance, cost);
      if (charged <= 0) return state;

      const updated = {
        ...user,
        tokenBalance: user.tokenBalance - charged,
        totalSpentOnAI: (user.totalSpentOnAI || 0) + charged,
        transactions: addTransaction(user, {
          type: 'AI_CALL',
          description: `Gọi ${model.name}: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
          amount: -charged,
          modelId,
          tokens: charged,
        }),
      };

      return bumpQuestCounters(withAccount(state, updated), user.id, 'aiCalls');
    }

    // ---------- TOP-UP (nạp credit/token) ----------
    case 'TOPUP': {
      const user = getCurrentUser(state);
      const { amount, label } = action.payload || {};
      if (!user || !amount || amount <= 0) return state;
      const updated = {
        ...user,
        tokenBalance: user.tokenBalance + amount,
        totalEarned: (user.totalEarned || 0) + amount,
        transactions: addTransaction(user, {
          type: 'TOPUP',
          description: `Nạp ${amount} token (${label || 'gói nạp'})`,
          amount: +amount,
        }),
      };
      return withAccount(state, updated);
    }

    // ---------- TRANSFER ----------
    case 'TRANSFER': {
      const user = getCurrentUser(state);
      const { recipient, amount, note } = action.payload;
      if (!user || amount <= 0 || amount > user.tokenBalance) return state;

      const target = state.accounts.find(a => a.username.toLowerCase() === String(recipient).trim().toLowerCase());

      let accounts = state.accounts.map(a => {
        if (a.id !== user.id) return a;
        return {
          ...a,
          tokenBalance: a.tokenBalance - amount,
          transactions: addTransaction(a, {
            type: 'TRANSFER_OUT',
            description: `Chuyển ${amount} token cho ${recipient}${note ? ': ' + note : ''}`,
            amount: -amount,
          }),
        };
      });

      let next = { ...state, accounts };

      if (target && target.id !== user.id) {
        accounts = accounts.map(a => {
          if (a.id !== target.id) return a;
          return {
            ...a,
            tokenBalance: a.tokenBalance + amount,
            transactions: addTransaction(a, {
              type: 'TRANSFER_IN',
              description: `Nhận ${amount} token từ ${user.username}${note ? ': ' + note : ''}`,
              amount: +amount,
            }),
          };
        });
        next = pushNotification({ ...state, accounts }, {
          userId: target.id,
          type: 'TRANSFER_IN',
          title: `Nhận ${amount} token`,
          body: `${user.username} vừa chuyển cho bạn${note ? `: ${note}` : '.'}`,
        });
      }

      return bumpQuestCounters(next, user.id, 'transfers');
    }

    // ---------- DAILY REWARD ----------
    case 'DAILY_REWARD': {
      const user = getCurrentUser(state);
      if (!user) return state;

      // Ngày theo giờ local (UTC+7 reset lúc 00:00, không phải 07:00)
      const today = toDayKey();
      if (user.lastDailyClaim === today) return state;

      // Streak chỉ nối tiếp khi lần nhận trước đúng 1 ngày; bỏ lỡ là reset về 1
      const newStreak = daysBetween(user.lastDailyClaim, today) === 1 ? user.dailyStreak + 1 : 1;
      const reward = getDailyReward(newStreak);

      const updated = {
        ...user,
        tokenBalance: user.tokenBalance + reward,
        totalEarned: user.totalEarned + reward,
        lastDailyClaim: today,
        dailyStreak: newStreak,
        transactions: addTransaction(user, {
          type: 'DAILY_REWARD',
          description: `Thưởng hàng ngày (streak ${newStreak} ngày)`,
          amount: +reward,
        }),
      };

      return withAccount(state, updated);
    }

    // ---------- QUESTS ----------
    case 'CLAIM_QUEST': {
      const user = getCurrentUser(state);
      if (!user) return state;

      const quest = QUESTS.find(q => q.id === action.payload.questId);
      if (!quest) return state;

      const questState = ensureQuestState(state.quests[user.id]);
      if (questState.claimed.includes(quest.id)) return state;
      if (getQuestProgress(questState, quest) < quest.target) return state;

      const updated = {
        ...user,
        tokenBalance: user.tokenBalance + quest.reward,
        totalEarned: user.totalEarned + quest.reward,
        transactions: addTransaction(user, {
          type: 'QUEST_REWARD',
          description: `Hoàn thành nhiệm vụ: ${quest.title}`,
          amount: +quest.reward,
        }),
      };

      const quests = {
        ...state.quests,
        [user.id]: { ...questState, claimed: [...questState.claimed, quest.id] },
      };

      return { ...withAccount(state, updated), quests };
    }

    // ---------- COMMENTS ----------
    case 'ADD_COMMENT': {
      const user = getCurrentUser(state);
      const { marketId, content } = action.payload;
      const text = String(content || '').trim();
      if (!user || !text) return state;
      if (!state.markets.some(m => m.id === marketId)) return state;

      const comment = {
        id: generateId(),
        marketId,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        frame: user.equipped?.frame || null,
        nameColor: user.equipped?.nameColor || null,
        content: text.substring(0, 500),
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString(),
      };

      const list = [comment, ...(state.comments[marketId] || [])].slice(0, MAX_COMMENTS_PER_MARKET);
      return bumpQuestCounters(
        { ...state, comments: { ...state.comments, [marketId]: list } },
        user.id,
        'comments'
      );
    }

    case 'LIKE_COMMENT': {
      const user = getCurrentUser(state);
      const { marketId, commentId } = action.payload;
      if (!user) return state;
      const list = state.comments[marketId];
      if (!Array.isArray(list)) return state;

      const comments = list.map(comment => {
        if (comment.id !== commentId) return comment;
        const liked = comment.likedBy.includes(user.id);
        return {
          ...comment,
          likes: liked ? comment.likes - 1 : comment.likes + 1,
          likedBy: liked ? comment.likedBy.filter(id => id !== user.id) : [...comment.likedBy, user.id],
        };
      });

      return { ...state, comments: { ...state.comments, [marketId]: comments } };
    }

    case 'DELETE_COMMENT': {
      const user = getCurrentUser(state);
      const { marketId, commentId } = action.payload;
      if (!user) return state;
      const list = state.comments[marketId];
      if (!Array.isArray(list)) return state;

      const target = list.find(comment => comment.id === commentId);
      if (!target) return state;
      if (target.userId !== user.id && user.role !== 'admin') return state;

      return {
        ...state,
        comments: { ...state.comments, [marketId]: list.filter(comment => comment.id !== commentId) },
      };
    }

    // ---------- NOTIFICATIONS ----------
    case 'NOTIFICATIONS_READ': {
      const user = getCurrentUser(state);
      if (!user) return state;
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.userId === user.id ? { ...n, read: true } : n
        ),
      };
    }

    // ---------- STORE ----------
    case 'PURCHASE_ITEM': {
      const user = getCurrentUser(state);
      const item = getStoreItem(action.payload.itemId);
      if (!user || !item) return state;
      if (user.tokenBalance < item.price) return state;

      // Creator pass: nâng role, chỉ mua 1 lần
      if (item.type === 'role') {
        if (user.role !== 'user') return state;
        const updated = {
          ...user,
          role: 'creator',
          tokenBalance: user.tokenBalance - item.price,
          totalSpentOnStore: user.totalSpentOnStore + item.price,
          transactions: addTransaction(user, {
            type: 'STORE_PURCHASE',
            description: `Mua ${item.name} — nâng cấp Market Creator`,
            amount: -item.price,
          }),
        };
        return pushNotification(withAccount(state, updated), {
          userId: user.id,
          type: 'ROLE_UPGRADE',
          title: 'Bạn đã là Market Creator',
          body: 'Giờ bạn có thể tự tạo market và nhận 2% fee trên volume.',
        });
      }

      if (user.inventory.includes(item.id)) return state;

      const updated = {
        ...user,
        tokenBalance: user.tokenBalance - item.price,
        totalSpentOnStore: user.totalSpentOnStore + item.price,
        inventory: [...user.inventory, item.id],
        // Trang bị ngay để thấy hiệu ứng
        equipped: item.type === 'frame'
          ? { ...user.equipped, frame: item.id }
          : item.type === 'nameColor'
            ? { ...user.equipped, nameColor: item.id }
            : user.equipped,
        transactions: addTransaction(user, {
          type: 'STORE_PURCHASE',
          description: `Mua ${item.name}`,
          amount: -item.price,
        }),
      };

      return withAccount(state, updated);
    }

    case 'EQUIP_ITEM': {
      const user = getCurrentUser(state);
      const item = getStoreItem(action.payload.itemId);
      if (!user || !item || !user.inventory.includes(item.id)) return state;
      const slot = item.type === 'frame' ? 'frame' : item.type === 'nameColor' ? 'nameColor' : null;
      if (!slot) return state;

      return withAccount(state, {
        ...user,
        equipped: { ...user.equipped, [slot]: user.equipped[slot] === item.id ? null : item.id },
      });
    }

    // ---------- ADMIN ----------
    case 'ADMIN_SET_USER_STATUS': {
      const actor = getCurrentUser(state);
      const { userId, status } = action.payload;
      if (!actor || actor.role !== 'admin') return state;
      if (userId === actor.id) return state; // không tự khoá mình
      return withAccounts(state, state.accounts.map(a => (a.id === userId ? { ...a, status } : a)));
    }

    case 'ADMIN_SET_USER_ROLE': {
      const actor = getCurrentUser(state);
      const { userId, role } = action.payload;
      if (!actor || actor.role !== 'admin') return state;
      if (userId === actor.id) return state;
      if (!['admin', 'creator', 'user'].includes(role)) return state;
      return withAccounts(state, state.accounts.map(a => (a.id === userId ? { ...a, role } : a)));
    }

    case 'ADMIN_TOGGLE_MODEL': {
      const actor = getCurrentUser(state);
      if (!actor || actor.role !== 'admin') return state;
      return {
        ...state,
        aiModels: state.aiModels.map(m =>
          m.id === action.payload.modelId ? { ...m, isAvailable: !m.isAvailable } : m
        ),
      };
    }

    // ---------- MARKET CREATION ----------
    case 'CREATE_MARKET': {
      const user = getCurrentUser(state);
      if (!user || !['admin', 'creator'].includes(user.role)) return state;

      const { question, description, category, icon, endDate } = action.payload;
      const yesPrice = clamp(Math.round(Number(action.payload.yesPrice) || 50), 5, 95);

      const market = {
        id: action.payload.marketId || `m_${generateId()}`,
        question,
        description,
        category: category || 'life',
        endDate,
        resolved: false,
        outcome: null,
        yesPrice,
        noPrice: 100 - yesPrice,
        volume: 0,
        // Platform tài trợ liquidity ban đầu để market mới có thể trả thưởng
        liquidity: 10000,
        icon: icon || '\u{1F52E}',
        priceHistory: [yesPrice],
        createdBy: user.id,
        creatorName: user.username,
        createdAt: new Date().toISOString(),
      };

      return { ...state, markets: [...state.markets, market] };
    }

    // ---------- COPY TRADE ----------
    case 'FOLLOW_TRADER': {
      const user = getCurrentUser(state);
      const { leaderId, leaderName, maxPerTrade } = action.payload;
      if (!user || leaderId === user.id) return state;
      if (state.copyTrades.some(c => c.followerId === user.id && c.leaderId === leaderId)) return state;

      const config = {
        id: generateId(),
        followerId: user.id,
        leaderId,
        leaderName,
        maxPerTrade: clamp(Math.round(Number(maxPerTrade) || 1000), 100, 100000),
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        copyTrades: [...state.copyTrades, config],
        accounts: state.accounts.map(a => (a.id === user.id ? { ...a, following: [...a.following, leaderId] } : a)),
      };
    }

    case 'UNFOLLOW_TRADER': {
      const user = getCurrentUser(state);
      if (!user) return state;
      const { leaderId } = action.payload;
      return {
        ...state,
        copyTrades: state.copyTrades.filter(c => !(c.followerId === user.id && c.leaderId === leaderId)),
        accounts: state.accounts.map(a =>
          a.id === user.id ? { ...a, following: a.following.filter(id => id !== leaderId) } : a
        ),
      };
    }

    case 'TOGGLE_COPY_TRADE': {
      const user = getCurrentUser(state);
      if (!user) return state;
      return {
        ...state,
        copyTrades: state.copyTrades.map(c =>
          c.id === action.payload.id && c.followerId === user.id ? { ...c, enabled: !c.enabled } : c
        ),
      };
    }

    // Mô phỏng: leader vừa mở lệnh → các follower đang bật copy trade mua theo
    case 'SIMULATE_COPY_TRADE': {
      const { leaderId, marketId, side, shares } = action.payload;
      const market = state.markets.find(m => m.id === marketId);
      if (!market || market.resolved) return state;

      const configs = state.copyTrades.filter(c => c.leaderId === leaderId && c.enabled);
      if (configs.length === 0) return state;

      const price = side === 'YES' ? market.yesPrice : market.noPrice;
      let next = state;

      configs.forEach(config => {
        const follower = next.accounts.find(a => a.id === config.followerId);
        if (!follower) return;
        const budget = Math.min(config.maxPerTrade, follower.tokenBalance);
        const qty = Math.floor(budget / price);
        if (qty <= 0) {
          next = pushNotification(next, {
            userId: follower.id,
            type: 'COPY_TRADE',
            title: 'Copy trade bị bỏ qua',
            body: `Không đủ token để copy lệnh ${side} ở "${market.question}".`,
          });
          return;
        }
        const updated = buyForAccount(next, follower, market, side, qty);
        if (!updated) return;
        next = withAccount(next, updated);
        next = pushNotification(next, {
          userId: follower.id,
          type: 'COPY_TRADE',
          title: `Copy trade: ${side} ${qty} shares`,
          body: `${config.leaderName} vừa mở ${side} ở "${market.question}".`,
        });
      });

      return applyMarketPrice(next, marketId, side, shares, shares * price);
    }

    // ---------- DEMO RESET ----------
    case 'RESET_TOKEN': {
      const user = getCurrentUser(state);
      if (!user) return state;
      const fresh = {
        ...user,
        ...createWallet({ tokenBalance: 10000 }),
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        provider: user.provider,
        photoURL: user.photoURL,
        joinedDate: user.joinedDate,
        // giữ đồ đã mua + tiến trình quest trong ngày
        inventory: user.inventory,
        equipped: user.equipped,
      };
      return withAccount(state, fresh);
    }

    default:
      return state;
  }
}

// ============ CONTEXT ============

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const stateRef = useRef(state);
  const persistTimer = useRef(null);

  // ---------- CẤU HÌNH AI (OpenAI-compatible) ----------
  // Runtime config nằm ở services/ai.js; ở đây giữ bản copy để UI render lại
  const [aiConfig, setAiConfig] = useState(() => getAIStatus());
  useEffect(() => {
    let cancelled = false;
    loadAISettings().then(() => {
      if (!cancelled) setAiConfig(getAIStatus());
    });
    return () => { cancelled = true; };
  }, []);

  // Load state từ AsyncStorage khi app start
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await loadPersistedState();
      if (cancelled) return;
      dispatch({
        type: 'INIT',
        payload: persisted || {
          accounts: SEED_ACCOUNTS.map(account => ({ ...account })),
          markets: MARKETS.map(m => ({ ...m })),
        },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // Giữ tham chiếu state mới nhất để callback persist không đọc giá trị cũ
  useEffect(() => { stateRef.current = state; }, [state]);

  // Ghi xuống storage: 1 key duy nhất, debounce, có bắt lỗi
  // Auth/session do Firebase tự persist (AsyncStorage) nên không ghi ở đây.
  const persist = useCallback(() => {
    const current = stateRef.current;
    if (current.isLoading) return;
    const payload = JSON.stringify({
      v: STORAGE_VERSION,
      accounts: current.accounts,
      markets: current.markets,
      comments: current.comments,
      notifications: current.notifications,
      copyTrades: current.copyTrades,
      quests: current.quests,
    });
    AsyncStorage.setItem(STORAGE_KEY, payload).catch((e) => {
      if (__DEV__) console.warn('[AppContext] Không ghi được state:', e);
    });
  }, []);

  // Debounce: mua/bán/chat liên tục không ghi storage liên tục
  useEffect(() => {
    if (state.isLoading) return undefined;
    persistTimer.current = setTimeout(persist, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(persistTimer.current);
  }, [state.accounts, state.markets, state.comments, state.notifications, state.copyTrades, state.quests, state.isLoading, persist]);

  // Flush khi app xuống background hoặc provider bị unmount → không mất thay đổi cuối
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        clearTimeout(persistTimer.current);
        persist();
      }
    });
    return () => {
      sub.remove();
      clearTimeout(persistTimer.current);
      persist();
    };
  }, [persist]);

  // Ngày local, làm mới khi app được mở lại → qua ngày mới là nhận thưởng được
  const [dayKey, setDayKey] = useState(() => toDayKey());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setDayKey(toDayKey());
    });
    return () => sub.remove();
  }, []);

  // App để mở qua nửa đêm: tự cập nhật dayKey để nhận thưởng được ngay, không cần tắt app
  useEffect(() => {
    const timer = setInterval(() => {
      const current = toDayKey();
      setDayKey(prev => (prev === current ? prev : current));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // ---------- AUTH (FIREBASE) ----------

  // Kết quả auth đầu tiên từ Firebase: undefined = chưa biết, null = chưa đăng nhập
  const [authUser, setAuthUser] = useState(undefined);
  const banningRef = useRef(false);

  useEffect(() => subscribeAuth(setAuthUser), []);

  // Chờ AsyncStorage load xong rồi mới tạo player record (tránh INIT ghi đè mất account)
  useEffect(() => {
    if (authUser === undefined || state.isLoading) return undefined;

    if (authUser === null) {
      // Đang test bằng chế độ demo → không có phiên Firebase, đừng đá ra ngoài
      if (!state.demoMode) dispatch({ type: 'AUTH_SIGNED_OUT' });
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const { profile, syncError } = await ensureUserProfile(authUser);
      if (cancelled) return;

      if (profile.status === 'banned') {
        await signOutGoogle();
        if (!cancelled) {
          dispatch({
            type: 'AUTH_SIGNED_OUT',
            payload: { notice: 'Tài khoản của bạn đã bị khoá bởi admin. Liên hệ admin@aibox.app.' },
          });
        }
        return;
      }

      // Hồ sơ cũ thiếu username/avatar → chốt 1 lần rồi ghi lại Firestore để
      // mọi thiết bị hiển thị giống nhau (không đổi tên mỗi lần đăng nhập).
      const desiredName = ensureUniqueUsername(
        stateRef.current.accounts,
        profile.username || authUser.displayName,
        authUser.uid
      );
      const desiredAvatar = profile.avatar || pickAvatar(authUser.uid);
      const identityPatch = {};
      if (profile.username !== desiredName) identityPatch.username = desiredName;
      if (profile.avatar !== desiredAvatar) identityPatch.avatar = desiredAvatar;
      if (Object.keys(identityPatch).length > 0) {
        updateUserProfile(authUser.uid, identityPatch).catch((e) => {
          if (__DEV__) console.warn('[AppContext] Không lưu được hồ sơ ban đầu:', e);
        });
      }

      dispatch({
        type: 'AUTH_SESSION',
        payload: {
          firebaseUser: authUser,
          profile: { ...profile, ...identityPatch },
          profileError: syncError,
        },
      });
    })();

    return () => { cancelled = true; };
  }, [authUser, state.isLoading, state.demoMode]);

  // Theo dõi users/{uid} realtime: admin đổi role/ban là app cập nhật ngay
  useEffect(() => {
    const uid = state.firebaseUser?.uid;
    // Chế độ demo không có Firestore → không subscribe (tránh lỗi permission-denied)
    if (!uid || state.demoMode) return undefined;

    return subscribeUserProfile(uid, ({ profile }) => {
      if (!profile) return;

      dispatch({
        type: 'PROFILE_PATCH',
        payload: {
          patch: {
            role: profile.role,
            status: profile.status,
            username: profile.username,
            avatar: profile.avatar,
            photoURL: profile.photoURL || null,
          },
        },
      });

      // Bị ban giữa phiên → đá ra ngay
      if (profile.status === 'banned' && !banningRef.current) {
        banningRef.current = true;
        signOutGoogle().finally(() => {
          banningRef.current = false;
          dispatch({
            type: 'AUTH_SIGNED_OUT',
            payload: { notice: 'Tài khoản của bạn vừa bị khoá bởi admin. Mọi phiên đăng nhập đã bị huỷ.' },
          });
        });
      }
    });
  }, [state.firebaseUser?.uid]);

  const signInWithGoogle = useCallback(() => googleSignIn(), []);

  // CHỈ DEV: vào app bằng ví local khi đang chạy Expo Go (không có native module).
  // Không tạo tài khoản Firebase, không đồng bộ Firestore.
  const enterDemoMode = useCallback(() => {
    if (!__DEV__) return;
    dispatch({ type: 'DEMO_SESSION' });
  }, []);

  const signOut = useCallback(async () => {
    const wasDemo = stateRef.current.demoMode;
    if (!wasDemo) await signOutGoogle();
    dispatch({
      type: 'AUTH_SIGNED_OUT',
      payload: wasDemo ? { removeDemo: true } : undefined,
    });
    // Đăng xuất chủ động → không giữ thông báo cũ (ví dụ "bị khoá")
    dispatch({ type: 'AUTH_NOTICE', payload: null });
  }, []);

  const clearAuthNotice = useCallback(() => {
    dispatch({ type: 'AUTH_NOTICE', payload: null });
  }, []);

  // Người dùng tự sửa hồ sơ: ghi Firestore + cập nhật local
  const updateMyProfile = useCallback(async ({ username, avatar } = {}) => {
    const current = stateRef.current;
    const user = getCurrentUser(current);
    if (!user) return { ok: false, error: 'Bạn cần đăng nhập.' };

    const patch = {};
    if (typeof username === 'string' && username.trim()) {
      const clean = username.trim().slice(0, 24);
      if (clean.toLowerCase() !== user.username.toLowerCase()) {
        patch.username = ensureUniqueUsername(current.accounts, clean, user.id);
      }
    }
    if (typeof avatar === 'string' && avatar !== user.avatar) {
      patch.avatar = avatar;
      // Chọn avatar emoji → bỏ ảnh Google để avatar mới hiển thị
      patch.photoURL = null;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    dispatch({ type: 'PROFILE_PATCH', payload: { patch } });
    // Chế độ demo không có Firestore → chỉ lưu trên máy
    if (current.demoMode) return { ok: true };
    // Firestore lỗi (rules/offline) vẫn giữ thay đổi local, chỉ báo syncError
    const result = await updateUserProfile(user.id, patch);
    return { ok: true, syncError: result.ok ? null : result.error };
  }, []);

  // Admin: danh sách người dùng lấy từ Firestore
  const loadUserDirectory = useCallback(() => listUserProfiles(), []);

  const currentUser = getCurrentUser(state);

  // ---------- APP ACTIONS ----------

  const buyShares = useCallback((marketId, side, shares) => {
    dispatch({ type: 'BUY_SHARES', payload: { marketId, side, shares } });
  }, []);

  const sellShares = useCallback((marketId, side, shares) => {
    dispatch({ type: 'SELL_SHARES', payload: { marketId, side, shares } });
  }, []);

  const topUpTokens = useCallback((amount, label) => {
    dispatch({ type: 'TOPUP', payload: { amount, label } });
  }, []);

  const resolveMarket = useCallback((marketId, outcome) => {
    const current = stateRef.current;
    if (getCurrentUser(current)?.role !== 'admin') {
      return { ok: false, error: 'Chỉ System Admin mới được resolve market.' };
    }
    const market = current.markets.find(m => m.id === marketId);
    if (!market) return { ok: false, error: 'Market không tồn tại.' };
    if (market.resolved) return { ok: false, error: 'Market này đã được resolve rồi.' };
    if (outcome !== 'YES' && outcome !== 'NO') {
      return { ok: false, error: 'Kết quả không hợp lệ (chỉ YES hoặc NO).' };
    }
    dispatch({ type: 'RESOLVE_MARKET', payload: { marketId, outcome } });
    return { ok: true };
  }, []);

  // ---------- AI THẬT (OpenAI-compatible) ----------

  // Lưu cấu hình AI từ màn Cấu hình (AsyncStorage) + cập nhật UI
  const saveAIConfig = useCallback(async (patch) => {
    await saveAISettings(patch);
    const status = getAIStatus();
    setAiConfig(status);
    return status;
  }, []);

  const resetAIConfig = useCallback(async () => {
    await resetAISettings();
    const status = getAIStatus();
    setAiConfig(status);
    return status;
  }, []);

  const testAIConnect = useCallback(() => testAIConnection(), []);

  // Gửi 1 tin nhắn chat: chỉ trừ token khi AI trả lời thành công
  const sendAIMessage = useCallback(async ({ modelId, prompt, history = [] } = {}) => {
    const current = stateRef.current;
    const user = getCurrentUser(current);
    const model = current.aiModels.find(m => m.id === modelId);
    const text = String(prompt || '').trim();

    if (!user) return { ok: false, error: 'Bạn cần đăng nhập.' };
    if (!model) return { ok: false, error: 'Model không tồn tại.' };
    if (!model.isAvailable) return { ok: false, error: 'Model đang tạm bảo trì.' };
    if (!text) return { ok: false, error: 'Nội dung trống.' };
    if (user.tokenBalance < MIN_AI_CALL_BALANCE) {
      return {
        ok: false,
        error: `Cần tối thiểu ${MIN_AI_CALL_BALANCE} token để gọi AI, bạn chỉ có ${user.tokenBalance}.`,
      };
    }

    // Chưa cấu hình key → dùng mock để app vẫn demo được
    if (!isLiveMode()) {
      const raw = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)]
        || 'Đây là câu trả lời mô phỏng (chưa cấu hình API key).';
      const cost = costFromUsage({ prompt: text, reply: raw });
      dispatch({ type: 'AI_CALL', payload: { modelId, prompt: text, cost } });
      return {
        ok: true,
        mode: 'mock',
        text: raw.replace('X', cost.toString()),
        model: model.id,
        cost,
        usage: { total_tokens: cost, estimated: true },
      };
    }

    const messages = buildChatMessages({ history, prompt: text });
    const result = await chatComplete({ appModelId: modelId, messages });

    if (!result.ok) return { ok: false, mode: result.mode || 'live', error: result.error };

    // Trừ token theo usage thật của API (fallback ước lượng nếu gateway không trả)
    const cost = costFromUsage({ usage: result.usage, messages, reply: result.text });

    dispatch({ type: 'AI_CALL', payload: { modelId, prompt: text, cost } });
    return {
      ok: true,
      mode: 'live',
      text: result.text,
      model: result.model,
      usage: result.usage,
      cost,
      latencyMs: result.latencyMs,
    };
  }, []);

  // AI Market Analyst thật: đưa dữ liệu kèo vào prompt, tính phí như 1 lần gọi AI
  const analyzeMarketAI = useCallback(async ({ marketId, modelId, extraPrompt = '' } = {}) => {
    const current = stateRef.current;
    const user = getCurrentUser(current);
    const market = current.markets.find(m => m.id === marketId);
    const model = current.aiModels.find(m => m.id === modelId);

    if (!user) return { ok: false, error: 'Bạn cần đăng nhập.' };
    if (!market) return { ok: false, error: 'Market không tồn tại.' };
    if (!model) return { ok: false, error: 'Model không tồn tại.' };
    if (!model.isAvailable) return { ok: false, error: 'Model đang tạm bảo trì.' };
    if (user.tokenBalance < MIN_AI_CALL_BALANCE) {
      return {
        ok: false,
        error: `Cần tối thiểu ${MIN_AI_CALL_BALANCE} token để gọi AI, bạn chỉ có ${user.tokenBalance}.`,
      };
    }

    const prompt = `Phân tích kèo: ${market.question}`;

    if (!isLiveMode()) {
      const mockText = buildMarketAnalysis(market, model, extraPrompt);
      const cost = costFromUsage({ prompt, reply: mockText });
      dispatch({ type: 'AI_CALL', payload: { modelId, prompt, cost } });
      return {
        ok: true,
        mode: 'mock',
        text: mockText,
        cost,
        usage: { total_tokens: cost, estimated: true },
      };
    }

    const marketPrompt = [
      'Phân tích prediction market dưới đây bằng tiếng Việt.',
      '',
      `Câu hỏi: ${market.question}`,
      market.description ? `Mô tả: ${market.description}` : null,
      `Giá YES: ${market.yesPrice}% · NO: ${market.noPrice}%`,
      `Volume: ${market.volume} token · Liquidity: ${market.liquidity} token`,
      `Danh mục: ${market.category} · Kết thúc: ${market.endDate}`,
      market.creatorName ? `Người tạo: ${market.creatorName}` : null,
      extraPrompt ? `Yêu cầu thêm: ${extraPrompt}` : null,
      '',
      'Trả lời theo cấu trúc: 1) Định giá & kỳ vọng, 2) Luận điểm YES, 3) Luận điểm NO, '
        + '4) Rủi ro chính, 5) Gợi ý quản trị vốn. Không hứa hẹn lợi nhuận.',
    ].filter(Boolean).join('\n');

    const messages = [
      {
        role: 'system',
        content: 'Bạn là chuyên gia phân tích prediction market. Trả lời tiếng Việt, '
          + 'thực tế, có cấu trúc, không đưa lời khuyên đầu tư chắc chắn.',
      },
      { role: 'user', content: marketPrompt },
    ];

    const result = await chatComplete({
      appModelId: modelId,
      messages,
      temperature: 0.4,
      // Đủ chỗ cho câu trả lời dài + token suy luận của model mới
      maxTokens: 1600,
    });

    if (!result.ok) return { ok: false, mode: 'live', error: result.error };

    const cost = costFromUsage({ usage: result.usage, messages, reply: result.text });

    dispatch({ type: 'AI_CALL', payload: { modelId, prompt, cost } });
    return {
      ok: true,
      mode: 'live',
      text: result.text,
      model: result.model,
      usage: result.usage,
      cost,
    };
  }, []);

  const transfer = useCallback((recipient, amount, note) => {
    const current = stateRef.current;
    const user = getCurrentUser(current);
    if (!user) return { ok: false, error: 'Bạn cần đăng nhập.' };
    if (amount <= 0 || amount > user.tokenBalance) return { ok: false, error: 'Số token không hợp lệ.' };
    if (!recipient || recipient.trim().toLowerCase() === user.username.toLowerCase()) {
      return { ok: false, error: 'Không thể chuyển cho chính mình.' };
    }
    const target = current.accounts.find(
      a => a.username.toLowerCase() === String(recipient).trim().toLowerCase()
    );
    if (!target) return { ok: false, error: `Không tìm thấy người dùng "${recipient}".` };
    dispatch({ type: 'TRANSFER', payload: { recipient, amount, note } });
    return { ok: true };
  }, []);

  const claimDailyReward = useCallback(() => {
    dispatch({ type: 'DAILY_REWARD' });
  }, []);

  const claimQuest = useCallback((questId) => {
    dispatch({ type: 'CLAIM_QUEST', payload: { questId } });
  }, []);

  const addComment = useCallback((marketId, content) => {
    dispatch({ type: 'ADD_COMMENT', payload: { marketId, content } });
  }, []);

  const likeComment = useCallback((marketId, commentId) => {
    dispatch({ type: 'LIKE_COMMENT', payload: { marketId, commentId } });
  }, []);

  const deleteComment = useCallback((marketId, commentId) => {
    dispatch({ type: 'DELETE_COMMENT', payload: { marketId, commentId } });
  }, []);

  const markNotificationsRead = useCallback(() => {
    dispatch({ type: 'NOTIFICATIONS_READ' });
  }, []);

  const purchaseItem = useCallback((itemId) => {
    const current = stateRef.current;
    const user = getCurrentUser(current);
    const item = getStoreItem(itemId);
    if (!user || !item) return { ok: false, error: 'Không tìm thấy vật phẩm.' };
    if (user.tokenBalance < item.price) return { ok: false, error: 'Không đủ token.' };
    if (item.type === 'role' && user.role !== 'user') return { ok: false, error: 'Bạn đã có đặc quyền này.' };
    if (item.type !== 'role' && user.inventory.includes(item.id)) return { ok: false, error: 'Bạn đã sở hữu vật phẩm này.' };
    dispatch({ type: 'PURCHASE_ITEM', payload: { itemId } });

    // Creator Pass: quyền lưu ở Firestore (users/{uid}.role) để máy khác cũng thấy
    if (item.type === 'role') {
      dispatch({ type: 'PROFILE_PATCH', payload: { patch: { role: 'creator' } } });
      updateUserRole(user.id, 'creator').catch((e) => {
        if (__DEV__) console.warn('[AppContext] Không cập nhật được role lên Firestore:', e);
      });
    }

    return { ok: true };
  }, []);

  const equipItem = useCallback((itemId) => {
    dispatch({ type: 'EQUIP_ITEM', payload: { itemId } });
  }, []);

  const createMarket = useCallback((draft) => {
    const current = stateRef.current;
    const user = getCurrentUser(current);
    if (!user || !['admin', 'creator'].includes(user.role)) {
      return { ok: false, error: 'Cần quyền Market Creator. Mua Creator Pass trong Store.' };
    }
    if (!String(draft.question || '').trim()) return { ok: false, error: 'Câu hỏi không được để trống.' };
    if (!draft.endDate) return { ok: false, error: 'Chưa chọn ngày kết thúc.' };
    const marketId = `m_${generateId()}`;
    dispatch({ type: 'CREATE_MARKET', payload: { ...draft, marketId } });
    return { ok: true, marketId };
  }, []);

  // Admin: cập nhật cả Firestore (nguồn sự thật) và local (UI phản hồi ngay)
  const setUserStatus = useCallback(async (userId, status) => {
    dispatch({ type: 'ADMIN_SET_USER_STATUS', payload: { userId, status } });
    const result = await updateUserStatus(userId, status);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  const setUserRole = useCallback(async (userId, role) => {
    dispatch({ type: 'ADMIN_SET_USER_ROLE', payload: { userId, role } });
    const result = await updateUserRole(userId, role);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  const toggleModelAvailability = useCallback((modelId) => {
    dispatch({ type: 'ADMIN_TOGGLE_MODEL', payload: { modelId } });
  }, []);

  const followTrader = useCallback((leaderId, leaderName, maxPerTrade) => {
    dispatch({ type: 'FOLLOW_TRADER', payload: { leaderId, leaderName, maxPerTrade } });
  }, []);

  const unfollowTrader = useCallback((leaderId) => {
    dispatch({ type: 'UNFOLLOW_TRADER', payload: { leaderId } });
  }, []);

  const toggleCopyTrade = useCallback((id) => {
    dispatch({ type: 'TOGGLE_COPY_TRADE', payload: { id } });
  }, []);

  const simulateCopyTrade = useCallback((leaderId, marketId, side, shares) => {
    dispatch({ type: 'SIMULATE_COPY_TRADE', payload: { leaderId, marketId, side, shares } });
  }, []);

  const resetToken = useCallback(() => {
    dispatch({ type: 'RESET_TOKEN' });
  }, []);

  // ---------- DERIVED ----------

  const canClaimDaily = currentUser ? currentUser.lastDailyClaim !== dayKey : false;
  const nextStreak = !currentUser
    ? 0
    : !canClaimDaily
      ? currentUser.dailyStreak
      : (daysBetween(currentUser.lastDailyClaim, dayKey) === 1 ? currentUser.dailyStreak + 1 : 1);
  const nextDailyReward = getDailyReward(nextStreak);

  const questState = currentUser ? ensureQuestState(state.quests[currentUser.id], dayKey) : null;
  const notifications = currentUser
    ? state.notifications.filter(n => n.userId === currentUser.id)
    : [];
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const myCommentsCount = currentUser
    ? Object.values(state.comments).reduce(
      (sum, list) => sum + list.filter(c => c.userId === currentUser.id).length, 0
    )
    : 0;
  const myCopyTrades = currentUser
    ? state.copyTrades.filter(c => c.followerId === currentUser.id)
    : [];

  return (
    <AppContext.Provider
      value={{
        // state.user = account đang đăng nhập (null nếu chưa login)
        state: { ...state, user: currentUser },
        // auth (Firebase)
        signInWithGoogle,
        enterDemoMode,
        signOut,
        clearAuthNotice,
        updateMyProfile,
        loadUserDirectory,
        isGoogleSignInConfigured: isGoogleSignInConfigured(),
        // derived
        canClaimDaily,
        nextStreak,
        nextDailyReward,
        questState,
        notifications,
        unreadNotifications,
        myCommentsCount,
        myCopyTrades,
        // app actions
        topUpTokens,
        buyShares,
        sellShares,
        resolveMarket,
        // AI (OpenAI-compatible)
        aiConfig,
        saveAIConfig,
        resetAIConfig,
        testAIConnect,
        sendAIMessage,
        analyzeMarketAI,
        transfer,
        claimDailyReward,
        claimQuest,
        addComment,
        likeComment,
        deleteComment,
        markNotificationsRead,
        purchaseItem,
        equipItem,
        createMarket,
        // admin actions
        setUserStatus,
        setUserRole,
        toggleModelAvailability,
        // copy trade
        followTrader,
        unfollowTrader,
        toggleCopyTrade,
        simulateCopyTrade,
        resetToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Hook để dùng context
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Ghi chú: STORE_ITEMS/QUESTS/ROLE_LABELS được export lại để screen dùng chung 1 nguồn
export { STORE_ITEMS, QUESTS, ROLE_LABELS };
