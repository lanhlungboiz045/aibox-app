// context/AppContext.jsx — Global state cho AIBox (JavaScript, không TypeScript)
// Quản lý: user state, token, AI calls, trading, transfer, daily reward, AsyncStorage

import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MARKETS, AI_MODELS, MOCK_AI_RESPONSES } from '../data/mockData';
import { clamp, generateId, toDayKey, daysBetween } from '../utils/format';
import { getDailyReward } from '../utils/rewards';

const STORAGE_KEY = '@aibox_state';
// Key của format cũ (2 key, không version) — chỉ đọc 1 lần để migrate
const LEGACY_USER_KEY = '@aibox_user_state';
const LEGACY_MARKETS_KEY = '@aibox_markets_state';
const STORAGE_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 400;
// Giới hạn lịch sử để JSON.stringify không phình dần theo thời gian
const MAX_TRANSACTIONS = 200;

// Default user
function createDefaultUser() {
  return {
    id: 'u20',
    username: 'Bạn',
    avatar: '😎',
    tokenBalance: 10000,
    totalEarned: 0,
    totalSpentOnAI: 0,
    rank: 20,
    joinedDate: new Date().toISOString(),
    lastDailyClaim: null,
    dailyStreak: 0,
    positions: [],
    transactions: [],
  };
}

// Chuẩn hoá user đọc từ storage: thiếu field nào thì dùng default.
// Tránh crash khi schema thay đổi (vd: dữ liệu cũ không có `positions`).
function sanitizeUser(raw) {
  const base = createDefaultUser();
  if (!raw || typeof raw !== 'object') return base;
  const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  return {
    ...base,
    ...raw,
    tokenBalance: num(raw.tokenBalance, base.tokenBalance),
    totalEarned: num(raw.totalEarned, base.totalEarned),
    totalSpentOnAI: num(raw.totalSpentOnAI, base.totalSpentOnAI),
    rank: num(raw.rank, base.rank),
    dailyStreak: num(raw.dailyStreak, base.dailyStreak),
    positions: Array.isArray(raw.positions) ? raw.positions : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
  };
}

// Markets: giữ giá/trạng thái đã lưu nhưng vẫn nhận market mới thêm trong mockData
function sanitizeMarkets(raw) {
  const defaults = MARKETS.map(m => ({ ...m }));
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const persisted = new Map(raw.filter(m => m && m.id).map(m => [m.id, m]));
  return defaults.map(m => ({ ...m, ...(persisted.get(m.id) || {}) }));
}

function createInitialState() {
  return {
    user: createDefaultUser(),
    markets: MARKETS.map(m => ({ ...m })),
    aiModels: AI_MODELS,
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
        return { user: sanitizeUser(parsed.user), markets: sanitizeMarkets(parsed.markets) };
      }
    }

    const [legacyUser, legacyMarkets] = await Promise.all([
      AsyncStorage.getItem(LEGACY_USER_KEY),
      AsyncStorage.getItem(LEGACY_MARKETS_KEY),
    ]);
    if (!legacyUser && !legacyMarkets) return null;

    return {
      user: sanitizeUser(legacyUser ? JSON.parse(legacyUser) : null),
      markets: sanitizeMarkets(legacyMarkets ? JSON.parse(legacyMarkets) : null),
    };
  } catch (e) {
    if (__DEV__) console.warn('[AppContext] Không đọc được state đã lưu:', e);
    return null;
  }
}

// Helper: thêm transaction mới (giữ tối đa MAX_TRANSACTIONS bản ghi)
function addTransaction(user, tx) {
  const newTx = {
    ...tx,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  const transactions = [newTx, ...user.transactions];
  return transactions.length > MAX_TRANSACTIONS ? transactions.slice(0, MAX_TRANSACTIONS) : transactions;
}

// Reducer
function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, user: action.payload.user, markets: action.payload.markets, isLoading: false };

    case 'BUY_SHARES': {
      const { marketId, side, shares } = action.payload;
      const market = state.markets.find(m => m.id === marketId);
      if (!market || market.resolved) return state;

      const price = side === 'YES' ? market.yesPrice : market.noPrice;
      const cost = shares * price;
      if (state.user.tokenBalance < cost) return state;

      // Cập nhật position
      const existingPos = state.user.positions.find(p => p.marketId === marketId && p.side === side);
      let newPositions;
      if (existingPos) {
        const totalShares = existingPos.shares + shares;
        const totalInvested = existingPos.invested + cost;
        newPositions = state.user.positions.map(p =>
          p === existingPos ? { ...p, shares: totalShares, invested: totalInvested, avgPrice: totalInvested / totalShares } : p
        );
      } else {
        newPositions = [...state.user.positions, { marketId, side, shares, avgPrice: price, invested: cost }];
      }

      const newUser = {
        ...state.user,
        tokenBalance: state.user.tokenBalance - cost,
        positions: newPositions,
        transactions: addTransaction(state.user, {
          type: 'BUY',
          description: `Mua ${shares} shares ${side}: ${market.question}`,
          amount: -cost,
          marketId,
        }),
      };

      // Cập nhật market price (dịch chuyển 0.01 mỗi share)
      const newMarkets = state.markets.map(m => {
        if (m.id !== marketId) return m;
        const yesAdj = side === 'YES' ? shares * 0.01 : -shares * 0.01;
        const newYes = clamp(m.yesPrice + yesAdj, 1, 99);
        return { ...m, yesPrice: newYes, noPrice: 100 - newYes, volume: m.volume + cost };
      });

      return { ...state, user: newUser, markets: newMarkets };
    }

    case 'SELL_SHARES': {
      const { marketId, side, shares } = action.payload;
      const market = state.markets.find(m => m.id === marketId);
      const position = state.user.positions.find(p => p.marketId === marketId && p.side === side);
      if (!market || !position || market.resolved) return state;

      const sellShares = Math.min(shares, position.shares);
      const price = side === 'YES' ? market.yesPrice : market.noPrice;
      const revenue = sellShares * price;

      let newPositions;
      if (position.shares - sellShares <= 0) {
        newPositions = state.user.positions.filter(p => p !== position);
      } else {
        newPositions = state.user.positions.map(p =>
          p === position ? { ...p, shares: p.shares - sellShares, invested: p.invested - (p.invested / p.shares) * sellShares } : p
        );
      }

      const newUser = {
        ...state.user,
        tokenBalance: state.user.tokenBalance + revenue,
        positions: newPositions,
        transactions: addTransaction(state.user, {
          type: 'SELL',
          description: `Bán ${sellShares} shares ${side}: ${market.question}`,
          amount: +revenue,
          marketId,
        }),
      };

      const newMarkets = state.markets.map(m => {
        if (m.id !== marketId) return m;
        const yesAdj = side === 'YES' ? -sellShares * 0.01 : sellShares * 0.01;
        const newYes = clamp(m.yesPrice + yesAdj, 1, 99);
        return { ...m, yesPrice: newYes, noPrice: 100 - newYes, volume: m.volume + revenue };
      });

      return { ...state, user: newUser, markets: newMarkets };
    }

    case 'RESOLVE_MARKET': {
      const { marketId, outcome } = action.payload;
      const market = state.markets.find(m => m.id === marketId);
      if (!market || market.resolved) return state;

      const positions = state.user.positions.filter(p => p.marketId === marketId);
      let tokenChange = 0;
      let newTransactions = state.user.transactions;

      for (const pos of positions) {
        if (pos.side === outcome) {
          const payout = pos.shares * 100;
          tokenChange += payout;
          newTransactions = addTransaction({ ...state.user, transactions: newTransactions }, {
            type: 'RESOLVE',
            description: `Thắng ${payout} token: ${market.question}`,
            amount: +payout,
            marketId,
          });
        } else {
          newTransactions = addTransaction({ ...state.user, transactions: newTransactions }, {
            type: 'RESOLVE',
            description: `Thua ${pos.invested} token: ${market.question}`,
            amount: 0,
            marketId,
          });
        }
      }

      const newPositions = state.user.positions.filter(p => p.marketId !== marketId);
      const newUser = {
        ...state.user,
        tokenBalance: state.user.tokenBalance + tokenChange,
        totalEarned: state.user.totalEarned + tokenChange,
        positions: newPositions,
        transactions: newTransactions,
      };

      const newMarkets = state.markets.map(m =>
        m.id === marketId ? { ...m, resolved: true, outcome } : m
      );

      return { ...state, user: newUser, markets: newMarkets };
    }

    case 'AI_CALL': {
      const { modelId, prompt } = action.payload;
      const model = state.aiModels.find(m => m.id === modelId);
      if (!model) return state;
      if (state.user.tokenBalance < model.tokenCost) return state;

      const newUser = {
        ...state.user,
        tokenBalance: state.user.tokenBalance - model.tokenCost,
        totalSpentOnAI: state.user.totalSpentOnAI + model.tokenCost,
        transactions: addTransaction(state.user, {
          type: 'AI_CALL',
          description: `Gọi ${model.name}: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
          amount: -model.tokenCost,
          modelId,
        }),
      };

      return { ...state, user: newUser };
    }

    case 'TRANSFER': {
      const { recipient, amount, note } = action.payload;
      if (amount <= 0 || amount > state.user.tokenBalance) return state;

      const newUser = {
        ...state.user,
        tokenBalance: state.user.tokenBalance - amount,
        transactions: addTransaction(state.user, {
          type: 'TRANSFER_OUT',
          description: `Chuyển ${amount} token cho ${recipient}${note ? ': ' + note : ''}`,
          amount: -amount,
        }),
      };

      return { ...state, user: newUser };
    }

    case 'DAILY_REWARD': {
      // Ngày theo giờ local (UTC+7 reset lúc 00:00, không phải 07:00)
      const today = toDayKey();
      if (state.user.lastDailyClaim === today) return state;

      // Streak chỉ nối tiếp khi lần nhận trước đúng 1 ngày; bỏ lỡ là reset về 1
      const newStreak = daysBetween(state.user.lastDailyClaim, today) === 1 ? state.user.dailyStreak + 1 : 1;
      const reward = getDailyReward(newStreak);

      const newUser = {
        ...state.user,
        tokenBalance: state.user.tokenBalance + reward,
        totalEarned: state.user.totalEarned + reward,
        lastDailyClaim: today,
        dailyStreak: newStreak,
        transactions: addTransaction(state.user, {
          type: 'DAILY_REWARD',
          description: `Thưởng hàng ngày (streak ${newStreak} ngày)`,
          amount: +reward,
        }),
      };

      return { ...state, user: newUser };
    }

    case 'RESET_TOKEN': {
      const newUser = {
        ...createDefaultUser(),
        id: state.user.id,
        username: state.user.username,
        avatar: state.user.avatar,
        joinedDate: state.user.joinedDate,
      };
      const freshMarkets = MARKETS.map(m => ({ ...m }));
      return { ...state, user: newUser, markets: freshMarkets };
    }

    default:
      return state;
  }
}

// Context
const AppContext = createContext(undefined);

// Provider
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const stateRef = useRef(state);
  const persistTimer = useRef(null);

  // Load state từ AsyncStorage khi app start
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await loadPersistedState();
      if (cancelled) return;
      dispatch({
        type: 'INIT',
        payload: persisted
          ? { user: persisted.user, markets: persisted.markets }
          : { user: createDefaultUser(), markets: MARKETS.map(m => ({ ...m })) },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // Giữ tham chiếu state mới nhất để callback persist không đọc giá trị cũ
  useEffect(() => { stateRef.current = state; }, [state]);

  // Ghi xuống storage: 1 key duy nhất, debounce, có bắt lỗi
  const persist = useCallback(() => {
    const current = stateRef.current;
    if (current.isLoading) return;
    const payload = JSON.stringify({ v: STORAGE_VERSION, user: current.user, markets: current.markets });
    AsyncStorage.setItem(STORAGE_KEY, payload).catch((e) => {
      if (__DEV__) console.warn('[AppContext] Không ghi được state:', e);
    });
  }, []);

  // Debounce: mua/bán/chat liên tục không ghi storage liên tục
  useEffect(() => {
    if (state.isLoading) return undefined;
    persistTimer.current = setTimeout(persist, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(persistTimer.current);
  }, [state.user, state.markets, state.isLoading, persist]);

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

  // Check daily reward + thưởng thực nhận nếu claim hôm nay (1 nguồn duy nhất)
  const canClaimDaily = state.user.lastDailyClaim !== dayKey;
  const nextStreak = !canClaimDaily
    ? state.user.dailyStreak
    : (daysBetween(state.user.lastDailyClaim, dayKey) === 1 ? state.user.dailyStreak + 1 : 1);
  const nextDailyReward = getDailyReward(nextStreak);

  // Actions
  const buyShares = useCallback((marketId, side, shares) => {
    dispatch({ type: 'BUY_SHARES', payload: { marketId, side, shares } });
  }, []);

  const sellShares = useCallback((marketId, side, shares) => {
    dispatch({ type: 'SELL_SHARES', payload: { marketId, side, shares } });
  }, []);

  const resolveMarket = useCallback((marketId, outcome) => {
    dispatch({ type: 'RESOLVE_MARKET', payload: { marketId, outcome } });
  }, []);

  const callAI = useCallback((modelId, prompt) => {
    const model = state.aiModels.find(m => m.id === modelId);
    if (!model) return null;
    if (state.user.tokenBalance < model.tokenCost) return null;
    dispatch({ type: 'AI_CALL', payload: { modelId, prompt } });
    // Trả mock response ngẫu nhiên
    const response = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
    return response.replace('X', model.tokenCost.toString());
  }, [state.aiModels, state.user.tokenBalance]);

  const transfer = useCallback((recipient, amount, note) => {
    if (amount <= 0 || amount > state.user.tokenBalance) return false;
    if (!recipient || recipient === state.user.username) return false;
    dispatch({ type: 'TRANSFER', payload: { recipient, amount, note } });
    return true;
  }, [state.user.tokenBalance, state.user.username]);

  const claimDailyReward = useCallback(() => {
    dispatch({ type: 'DAILY_REWARD' });
  }, []);

  const resetToken = useCallback(() => {
    dispatch({ type: 'RESET_TOKEN' });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        buyShares,
        sellShares,
        resolveMarket,
        callAI,
        transfer,
        claimDailyReward,
        resetToken,
        canClaimDaily,
        nextStreak,
        nextDailyReward,
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
