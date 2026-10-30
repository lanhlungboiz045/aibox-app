// context/AppContext.jsx — Global state cho AIBox (JavaScript, không TypeScript)
// Quản lý: token, AI calls, transfer, Tài Xỉu, daily reward, quests,
// notifications, admin CMS, AsyncStorage
//
// AUTH: Firebase Authentication (Google) — xem src/services/auth.js
// USER INFO: Firestore users/{uid} (role/status/username/avatar) — xem src/services/users.js
// Ví token / giao dịch / quests vẫn lưu local theo uid để demo offline.

import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_MODELS, MOCK_AI_RESPONSES } from '../data/mockData';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';
import { createAccount, createWallet, ROLE_LABELS, pickAvatar } from '../data/accounts';
import { QUESTS, createEmptyCounters, ensureQuestState, getQuestProgress } from '../data/quests';
import { generateId, toDayKey, daysBetween } from '../utils/format';
import { getDailyReward } from '../utils/rewards';
import { MIN_AI_CALL_BALANCE, costFromUsage, chargeTokens } from '../utils/aiCost';
import {
  MIN_STAKE, SIDES, SIDE_LABELS, getValidStake, rollDice, settleTaiXiu,
} from '../utils/taiXiu';
import {
  subscribeAuth,
  signInWithGoogle as googleSignIn,
  signInWithEmail as emailSignIn,
  registerWithEmail as emailRegister,
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
const STORAGE_VERSION = 5;
// uid cố định cho chế độ demo (chỉ dev) — không trùng uid Firebase nào
const DEMO_UID = 'demo-expo-go';
const PERSIST_DEBOUNCE_MS = 400;
// Giới hạn lịch sử để JSON.stringify không phình dần theo thời gian
export const MAX_TRANSACTIONS = 200;
const MAX_NOTIFICATIONS = 80;

// ============ SANITIZE / MIGRATE ============

// Chuẩn hoá account đọc từ storage: thiếu field nào thì dùng default.
function sanitizeAccount(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const wallet = createWallet();
  const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  const account = { ...raw };
  ['positions', 'inventory', 'equipped', 'following', 'rank', 'totalSpentOnStore', 'creatorEarnings']
    .forEach(key => delete account[key]);
  return {
    ...wallet,
    ...account,
    tokenBalance: num(raw.tokenBalance, wallet.tokenBalance),
    totalEarned: num(raw.totalEarned, wallet.totalEarned),
    totalSpentOnAI: num(raw.totalSpentOnAI, wallet.totalSpentOnAI),
    dailyStreak: num(raw.dailyStreak, wallet.dailyStreak),
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    role: raw.role === 'admin' ? 'admin' : 'user',
    status: raw.status === 'banned' ? 'banned' : 'active',
  };
}

function sanitizeAccounts(raw) {
  return Array.isArray(raw)
    ? raw.map(sanitizeAccount).filter(account => account && account.provider !== 'system')
    : [];
}

function sanitizeNotifications(raw) {
  const removedTypes = new Set(['MARKET_RESOLVED', 'CREATOR_FEE', 'COPY_TRADE', 'ROLE_UPGRADE']);
  return Array.isArray(raw)
    ? raw.filter(n => n && n.id && n.userId && !removedTypes.has(n.type)).slice(0, MAX_NOTIFICATIONS)
    : [];
}

function sanitizeQuests(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const result = {};
  Object.entries(raw).forEach(([userId, questState]) => {
    if (!questState?.counters) return;
    const current = ensureQuestState(questState);
    const counters = Object.fromEntries(
      Object.keys(createEmptyCounters()).map(metric => [
        metric,
        Number.isFinite(current.counters[metric]) ? Math.max(0, current.counters[metric]) : 0,
      ]),
    );
    const activeQuestIds = new Set(QUESTS.map(quest => quest.id));
    result[userId] = {
      ...current,
      counters,
      claimed: (Array.isArray(current.claimed) ? current.claimed : [])
        .filter(id => activeQuestIds.has(id)),
    };
  });
  return result;
}

function createInitialState() {
  return {
    accounts: [],
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
    aiModels: AI_MODELS,
    notifications: [],
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
      if (parsed && (parsed.v === STORAGE_VERSION || parsed.v === 4)) {
        return {
          accounts: sanitizeAccounts(parsed.accounts),
          notifications: sanitizeNotifications(parsed.notifications),
          quests: sanitizeQuests(parsed.quests),
        };
      }
      return null;
    }

    return null;
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

// Username hiển thị không được trùng với người dùng khác
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

// ============ REDUCER ============

function reducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      const payload = action.payload || {};
      return {
        ...state,
        accounts: payload.accounts || state.accounts,
        notifications: payload.notifications || [],
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
        role: profile?.role === 'admin' ? 'admin' : 'user',
        status: profile?.status || 'active',
        provider: profile?.provider || firebaseUser.provider || 'google',
      };

      const accounts = existing
        ? state.accounts.map(a => (a.id === account.id ? account : a))
        : [...state.accounts, account];

      return {
        ...state,
        accounts,
        firebaseUser,
        profile: { ...(profile || {}), role: account.role, username },
        profileSync: profileError || null,
        authReady: true,
        authNotice: null,
        quests: { ...state.quests, [account.id]: ensureQuestState(state.quests[account.id]) },
      };
    }

    case 'AUTH_SIGNED_OUT':
      return {
        ...state,
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
      const { id = DEMO_UID, email = 'demo@expo-go.local', username = 'Demo Expo Go' } = action.payload || {};
      const role = action.payload?.role === 'user' ? 'user' : 'admin';
      const existing = state.accounts.find(a => a.id === id);
      const account = {
        ...(existing || createAccount({
          id,
          email,
          username,
          provider: 'demo',
          role,
        })),
        email,
        username,
        role,
        status: 'active',
        provider: 'demo',
      };
      const accounts = existing
        ? state.accounts.map(a => (a.id === id ? account : a))
        : [...state.accounts, account];

      return {
        ...state,
        accounts,
        firebaseUser: {
          uid: id,
          email: account.email,
          displayName: account.username,
          photoURL: null,
        },
        profile: {
          uid: id,
          email: account.email,
          username: account.username,
          avatar: account.avatar,
          role,
          status: 'active',
          provider: 'demo',
        },
        profileSync: null,
        demoMode: true,
        authReady: true,
        authNotice: null,
        quests: { ...state.quests, [id]: ensureQuestState(state.quests[id]) },
      };
    }

    // Firestore đổi role/status/username → mirror xuống account local
    case 'PROFILE_PATCH': {
      if (!state.firebaseUser) return state;
      const patch = {};
      Object.entries(action.payload.patch || {}).forEach(([key, value]) => {
        if (value !== undefined) patch[key] = value;
      });
      if (Object.prototype.hasOwnProperty.call(patch, 'role')) {
        patch.role = patch.role === 'admin' ? 'admin' : 'user';
      }
      return {
        ...state,
        profile: state.profile ? { ...state.profile, ...patch } : state.profile,
        accounts: state.accounts.map(a => (a.id === state.firebaseUser.uid ? { ...a, ...patch } : a)),
      };
    }

    case 'AUTH_NOTICE':
      return { ...state, authNotice: action.payload };

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
      if (!user || !Number.isSafeInteger(amount) || amount <= 0 || amount > user.tokenBalance) return state;
      const target = state.accounts.find(a => a.username.toLowerCase() === String(recipient).trim().toLowerCase());
      if (!target || target.id === user.id || !Number.isSafeInteger(target.tokenBalance + amount)) return state;

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

      return bumpQuestCounters(next, user.id, 'transfers');
    }

    // ---------- TÀI XỈU (game cá cược token nội bộ) ----------
    // Token và lịch sử cược phải luôn khớp nhau nên tiền được tính ở đây,
    // không tính ở UI. Thống kê của game đọc lại từ transactions type 'TAIXIU'
    // → KHÔNG thêm field mới vào account (giữ nguyên cấu trúc dữ liệu cũ).
    case 'PLACE_TAIXIU_BET': {
      const user = getCurrentUser(state);
      const { side, stake, dice } = action.payload || {};
      if (!user || !SIDES[side]) return state;

      // Chặn cược không hợp lệ, vượt số dư, hoặc gây mất chính xác số nguyên.
      const amount = getValidStake(stake, user.tokenBalance);
      if (!amount) return state;

      // Chỉ nhận mảng 3 mặt 1..6 do provider quay; dữ liệu lạ thì quay lại cho an toàn
      const rolled = Array.isArray(dice) && dice.length === 3 && dice.every(v => v >= 1 && v <= 6)
        ? dice
        : rollDice();
      const settled = settleTaiXiu(rolled, side, amount);
      const resultText = settled.triple
        ? `bộ ba, thắng +${settled.net}`
        : settled.win ? `thắng +${settled.net}` : `thua -${amount}`;

      const updated = {
        ...user,
        tokenBalance: user.tokenBalance + settled.net,
        transactions: addTransaction(user, {
          type: 'TAIXIU',
          description: `Tài xỉu · ${SIDE_LABELS[side]} ${amount} token · ${rolled.join('-')} (tổng ${settled.total}) → ${resultText}`,
          amount: settled.net,
          side,
          dice: rolled,
          total: settled.total,
          triple: settled.triple,
        }),
      };

      return bumpQuestCounters(withAccount(state, updated), user.id, 'taiXiuRounds');
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
      if (!['admin', 'user'].includes(role)) return state;
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

    // ---------- DEMO RESET ----------
    case 'RESET_TOKEN': {
      const user = getCurrentUser(state);
      if (!user) return state;
      const fresh = {
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
          accounts: [],
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
      notifications: current.notifications,
      quests: current.quests,
    });
    AsyncStorage.setItem(STORAGE_KEY, payload).catch((e) => {
      if (__DEV__) console.warn('[AppContext] Không ghi được state:', e);
    });
  }, []);

  // Debounce: chat liên tục không ghi storage liên tục
  useEffect(() => {
    if (state.isLoading) return undefined;
    persistTimer.current = setTimeout(persist, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(persistTimer.current);
  }, [state.accounts, state.notifications, state.quests, state.isLoading, persist]);

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
  const signInWithEmail = useCallback((email, password) => emailSignIn(email, password), []);
  const registerWithEmail = useCallback((email, password) => emailRegister(email, password), []);

  // CHỈ DEV: vào app bằng ví local khi đang chạy Expo Go (không có native module).
  // Không tạo tài khoản Firebase, không đồng bộ Firestore.
  const enterDemoMode = useCallback(() => {
    if (!__DEV__) return;
    dispatch({ type: 'DEMO_SESSION' });
  }, []);
  const signInDemoAccount = useCallback((email, password) => {
    if (!__DEV__) return { ok: false, error: 'Tài khoản mẫu chỉ dùng trong bản dev.' };
    const account = DEMO_ACCOUNTS.find(item =>
      item.email === String(email || '').trim().toLowerCase() && item.password === password
    );
    if (!account) return { ok: false, error: 'Email hoặc mật khẩu tài khoản mẫu không chính xác.' };
    dispatch({
      type: 'DEMO_SESSION',
      payload: {
        id: account.id,
        email: account.email,
        username: account.username,
        role: account.role,
      },
    });
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!stateRef.current.demoMode) await signOutGoogle();
    dispatch({ type: 'AUTH_SIGNED_OUT' });
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

  const topUpTokens = useCallback((amount, label) => {
    dispatch({ type: 'TOPUP', payload: { amount, label } });
  }, []);

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
  // signal: AbortSignal từ màn hình để bấm "Dừng" → huỷ request, không trừ token
  const sendAIMessage = useCallback(async ({ modelId, prompt, history = [], signal } = {}) => {
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
    const result = await chatComplete({ appModelId: modelId, messages, signal });

    // Người dùng bấm "Dừng" → không trừ token, trả nguyên cờ canceled cho màn hình
    if (result.canceled) {
      return { ok: false, canceled: true, mode: result.mode || 'live', error: result.error };
    }
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

  const transfer = useCallback((recipient, amount, note) => {
    const current = stateRef.current;
    const user = getCurrentUser(current);
    if (!user) return { ok: false, error: 'Bạn cần đăng nhập.' };
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > user.tokenBalance) {
      return { ok: false, error: 'Số token phải là số nguyên dương trong phạm vi số dư.' };
    }
    if (!recipient || recipient.trim().toLowerCase() === user.username.toLowerCase()) {
      return { ok: false, error: 'Không thể chuyển cho chính mình.' };
    }
    const target = current.accounts.find(
      a => a.username.toLowerCase() === String(recipient).trim().toLowerCase()
    );
    if (!target) return { ok: false, error: `Không tìm thấy người dùng "${recipient}".` };
    if (!Number.isSafeInteger(target.tokenBalance + amount)) {
      return { ok: false, error: 'Số dư người nhận vượt giới hạn an toàn.' };
    }
    dispatch({ type: 'TRANSFER', payload: { recipient, amount, note } });
    return { ok: true };
  }, []);

  // Game Tài xỉu: quay xúc xắc ở provider rồi mới dispatch để UI nhận kết quả
  // ngay trong lần gọi; reducer chỉ áp luật và cộng/trừ token.
  const placeTaiXiuBet = useCallback(({ side, stake }) => {
    const user = getCurrentUser(stateRef.current);
    if (!user) return { ok: false, error: 'Bạn cần đăng nhập.' };
    if (!SIDES[side]) return { ok: false, error: 'Cửa cược không hợp lệ.' };

    const amount = getValidStake(stake, user.tokenBalance);
    if (!amount) {
      return {
        ok: false,
        error: `Mức cược phải từ ${MIN_STAKE} token đến số dư hiện tại và là số nguyên hợp lệ.`,
      };
    }

    const dice = rollDice();
    const settled = settleTaiXiu(dice, side, amount);
    dispatch({ type: 'PLACE_TAIXIU_BET', payload: { side, stake: amount, dice } });
    // Trả kèm `dice` để UI hiện đúng mặt vừa quay (settleTaiXiu không chứa dice)
    return { ok: true, side, stake: amount, dice, ...settled };
  }, []);

  const claimDailyReward = useCallback(() => {
    dispatch({ type: 'DAILY_REWARD' });
  }, []);

  const claimQuest = useCallback((questId) => {
    dispatch({ type: 'CLAIM_QUEST', payload: { questId } });
  }, []);

  const markNotificationsRead = useCallback(() => {
    dispatch({ type: 'NOTIFICATIONS_READ' });
  }, []);

  const setUserStatus = useCallback(async (userId, status) => {
    if (getCurrentUser(stateRef.current)?.role !== 'admin') {
      return { ok: false, error: 'Chỉ quản trị hệ thống mới được cập nhật trạng thái tài khoản.' };
    }
    if (!['active', 'banned'].includes(status)) {
      return { ok: false, error: 'Trạng thái tài khoản không hợp lệ.' };
    }
    if (userId === getCurrentUser(stateRef.current)?.id) {
      return { ok: false, error: 'Không thể tự thay đổi trạng thái tài khoản.' };
    }
    dispatch({ type: 'ADMIN_SET_USER_STATUS', payload: { userId, status } });
    const result = await updateUserStatus(userId, status);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  const setUserRole = useCallback(async (userId, role) => {
    const actor = getCurrentUser(stateRef.current);
    if (actor?.role !== 'admin') {
      return { ok: false, error: 'Chỉ quản trị hệ thống mới được thay đổi phân quyền.' };
    }
    if (!['admin', 'user'].includes(role)) {
      return { ok: false, error: 'Quyền tài khoản không hợp lệ.' };
    }
    if (userId === actor.id) {
      return { ok: false, error: 'Không thể tự thay đổi quyền của mình.' };
    }
    dispatch({ type: 'ADMIN_SET_USER_ROLE', payload: { userId, role } });
    const result = await updateUserRole(userId, role);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  const toggleModelAvailability = useCallback((modelId) => {
    dispatch({ type: 'ADMIN_TOGGLE_MODEL', payload: { modelId } });
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
  return (
    <AppContext.Provider
      value={{
        // state.user = account đang đăng nhập (null nếu chưa login)
        state: { ...state, user: currentUser },
        // auth (Firebase)
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        signInDemoAccount,
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
        // app actions
        topUpTokens,
        // AI (OpenAI-compatible)
        aiConfig,
        saveAIConfig,
        resetAIConfig,
        testAIConnect,
        sendAIMessage,
        transfer,
        placeTaiXiuBet,
        claimDailyReward,
        claimQuest,
        markNotificationsRead,
        // admin actions
        setUserStatus,
        setUserRole,
        toggleModelAvailability,
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

export { QUESTS, ROLE_LABELS };
