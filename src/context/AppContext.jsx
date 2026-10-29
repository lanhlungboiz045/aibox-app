// context/AppContext.jsx — Global state cho AIBox (JavaScript, không TypeScript)
// Quản lý: user state, token, AI calls, trading, transfer, daily reward, AsyncStorage

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MARKETS, AI_MODELS, MOCK_AI_RESPONSES } from '../data/mockData';
import { clamp, generateId } from '../utils/format';

const STORAGE_KEY = '@aibox_user_state';
const MARKETS_KEY = '@aibox_markets_state';

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

// Helper: thêm transaction mới
function addTransaction(user, tx) {
  const newTx = {
    ...tx,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  return [newTx, ...user.transactions];
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
      const today = new Date().toISOString().split('T')[0];
      if (state.user.lastDailyClaim === today) return state;

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = state.user.lastDailyClaim === yesterday ? state.user.dailyStreak + 1 : 1;
      const reward = 2000 + (newStreak >= 7 ? 1000 : 0);

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
  const initialState = {
    user: createDefaultUser(),
    markets: MARKETS.map(m => ({ ...m })),
    aiModels: AI_MODELS,
    isLoading: true,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Load state từ AsyncStorage khi app start
  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem(STORAGE_KEY);
        const marketsJson = await AsyncStorage.getItem(MARKETS_KEY);
        const user = userJson ? JSON.parse(userJson) : createDefaultUser();
        const markets = marketsJson ? JSON.parse(marketsJson) : MARKETS.map(m => ({ ...m }));
        dispatch({ type: 'INIT', payload: { user, markets } });
      } catch (e) {
        dispatch({ type: 'INIT', payload: { user: createDefaultUser(), markets: MARKETS.map(m => ({ ...m })) } });
      }
    })();
  }, []);

  // Persist state khi user thay đổi
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.user));
      AsyncStorage.setItem(MARKETS_KEY, JSON.stringify(state.markets));
    }
  }, [state.user, state.markets, state.isLoading]);

  // Check daily reward
  const today = new Date().toISOString().split('T')[0];
  const canClaimDaily = state.user.lastDailyClaim !== today;

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
