// context/appReducer.js — Pure state logic của AIBox (không phụ thuộc React)
//
// Tách khỏi AppContext.jsx để:
// - Provider chỉ lo side-effect (AsyncStorage, Firebase, AI) + context value.
// - Reducer/sanitize là hàm thuần → unit-test được bằng jest, không cần render.
//
// State vẫn là 1 object phẳng như cũ; mọi action giữ nguyên tên/shape để không
// phải sửa call site.
import { AI_MODELS } from '../data/mockData';
import { createAccount, createWallet, pickAvatar } from '../data/accounts';
import { QUESTS, createEmptyCounters, ensureQuestState, getQuestProgress } from '../data/quests';
import { generateId, toDayKey, daysBetween, formatToken } from '../utils/format';
import { getDailyReward } from '../utils/rewards';
import { chargeTokens } from '../utils/aiCost';
import {
  MAX_AI_LOGS,
  sanitizeAILog,
} from '../services/aiLogStore';
import { SIDES, SIDE_LABELS, getValidStake, rollDice, settleTaiXiu } from '../utils/taiXiu';

// uid cố định cho chế độ demo (chỉ dev) — không trùng uid Firebase nào
export const DEMO_UID = 'demo-expo-go';
// Giới hạn lịch sử để JSON.stringify không phình dần theo thời gian
export const MAX_TRANSACTIONS = 200;
export const MAX_NOTIFICATIONS = 80;

// ============ SANITIZE / MIGRATE ============

// Chuẩn hoá account đọc từ storage: thiếu field nào thì dùng default.
export function sanitizeAccount(raw) {
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

export function sanitizeAccounts(raw) {
  return Array.isArray(raw)
    ? raw.map(sanitizeAccount).filter(account => account && account.provider !== 'system')
    : [];
}

export function sanitizeNotifications(raw) {
  const removedTypes = new Set(['MARKET_RESOLVED', 'CREATOR_FEE', 'COPY_TRADE', 'ROLE_UPGRADE']);
  return Array.isArray(raw)
    ? raw.filter(n => n && n.id && n.userId && !removedTypes.has(n.type)).slice(0, MAX_NOTIFICATIONS)
    : [];
}

export function sanitizeQuests(raw) {
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

export function createInitialState() {
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
    // Store duy nhất cho log gọi AI (xem services/aiLogStore.js)
    aiLogs: [],
    notifications: [],
    quests: {},
    isLoading: true,
  };
}

// ============ HELPERS ============

export function getCurrentUser(state) {
  if (!state.firebaseUser) return null;
  return state.accounts.find(account => account.id === state.firebaseUser.uid) || null;
}

// Username hiển thị không được trùng với người dùng khác
export function ensureUniqueUsername(accounts, desired, uid) {
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

export function appReducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      const payload = action.payload || {};
      return {
        ...state,
        accounts: payload.accounts || state.accounts,
        aiLogs: payload.aiLogs || [],
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

    // Mỗi lượt chat → 1 bản ghi vào store log duy nhất (kể cả lỗi / bị dừng).
    // Home, Logs, Usage, Lịch sử và Profile đều đọc từ đây.
    case 'AI_LOG': {
      const log = sanitizeAILog(action.payload);
      if (!log) return state;
      return { ...state, aiLogs: [log, ...state.aiLogs].slice(0, MAX_AI_LOGS) };
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
          description: `Nạp ${formatToken(amount)} token (${label || 'gói nạp'})`,
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
      // Reset ví = xoá luôn lịch sử log AI của user này để số liệu không lệch
      // với số dư / giao dịch mới.
      return {
        ...withAccount(state, fresh),
        aiLogs: state.aiLogs.filter(log => log.userId !== user.id),
      };
    }

    default:
      return state;
  }
}
