// context/AppContext.jsx — Global state cho AIBox (JavaScript, không TypeScript)
// Quản lý: token, AI calls, transfer, Tài Xỉu, daily reward, quests,
// notifications, admin CMS, AsyncStorage
//
// AUTH: Firebase Authentication (Google) — xem src/services/auth.js
// USER INFO: Firestore users/{uid} (role/status/username/avatar) — xem src/services/users.js
// Ví token / giao dịch / quests vẫn lưu local theo uid để demo offline.

import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_AI_RESPONSES } from '../data/mockData';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';
import { ROLE_LABELS, pickAvatar } from '../data/accounts';
import { QUESTS, ensureQuestState } from '../data/quests';
import { toDayKey, daysBetween } from '../utils/format';
import { getDailyReward } from '../utils/rewards';
import { MIN_AI_CALL_BALANCE, costFromUsage, chargeTokens } from '../utils/aiCost';
import {
  AI_LOG_STATUS,
  createAILog,
  migrateLogsFromTransactions,
  resolveModelLabel,
  sanitizeAILogs,
} from '../services/aiLogStore';
import {
  MIN_STAKE, SIDES, getValidStake, rollDice, settleTaiXiu,
} from '../utils/taiXiu';
import {
  appReducer,
  createInitialState,
  ensureUniqueUsername,
  getCurrentUser,
  sanitizeAccounts,
  sanitizeNotifications,
  sanitizeQuests,
} from './appReducer';
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
// v6: thêm store log gọi AI (aiLogs) — nguồn số liệu duy nhất cho mọi màn.
const STORAGE_VERSION = 6;
// Version cũ vẫn đọc được; riêng < 6 sẽ migrate log từ transaction AI_CALL.
const LEGACY_STORAGE_VERSIONS = [4, 5];
const PERSIST_DEBOUNCE_MS = 400;

// ============ PERSISTENCE ============

// Đọc state đã lưu: ưu tiên format mới (có version), fallback migrate format cũ
async function loadPersistedState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.v !== STORAGE_VERSION && !LEGACY_STORAGE_VERSIONS.includes(parsed.v))) {
      return null;
    }
    const accounts = sanitizeAccounts(parsed.accounts);
    // v6 trở lên: đọc đúng store log. Bản cũ chưa có aiLogs → dựng lại từ
    // transaction AI_CALL để Home/Logs/Usage không bị mất lịch sử.
    const aiLogs = Array.isArray(parsed.aiLogs)
      ? sanitizeAILogs(parsed.aiLogs)
      : migrateLogsFromTransactions(accounts);
    return {
      accounts,
      aiLogs,
      notifications: sanitizeNotifications(parsed.notifications),
      quests: sanitizeQuests(parsed.quests),
    };
  } catch (e) {
    if (__DEV__) console.warn('[AppContext] Không đọc được state đã lưu:', e);
    return null;
  }
}

// ============ CONTEXT ============

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
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
      aiLogs: current.aiLogs,
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
  }, [state.accounts, state.aiLogs, state.notifications, state.quests, state.isLoading, persist]);

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
  // Chỉ đăng ký lại khi đổi uid; demoMode đổi sau đó không cần subscribe Firestore.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!model) return { ok: false, error: 'Mô hình không tồn tại.' };
    if (!model.isAvailable) return { ok: false, error: 'Mô hình đang tạm bảo trì.' };
    if (!text) return { ok: false, error: 'Nội dung trống.' };
    if (user.tokenBalance < MIN_AI_CALL_BALANCE) {
      return {
        ok: false,
        error: `Cần tối thiểu ${MIN_AI_CALL_BALANCE} token để gọi AI, bạn chỉ có ${user.tokenBalance}.`,
      };
    }

    // Mọi lượt chat (kể cả lỗi / bị dừng) ghi 1 bản ghi vào store log duy nhất.
    const logBase = {
      userId: user.id,
      modelId: model.id,
      requestedModelName: model.name,
      provider: model.provider,
      prompt: text.slice(0, 160),
    };
    const pushLog = (fields) => {
      dispatch({ type: 'AI_LOG', payload: createAILog({ ...logBase, ...fields }) });
    };

    // Chưa cấu hình key → dùng mock để app vẫn demo được
    if (!isLiveMode()) {
      const raw = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)]
        || 'Đây là câu trả lời mô phỏng (chưa cấu hình khóa API).';
      const cost = costFromUsage({ prompt: text, reply: raw });
      // Chi phí ghi vào log = token THỰC bị trừ (ví không đủ thì trừ tối đa số dư)
      const charged = chargeTokens(user.tokenBalance, cost);
      dispatch({ type: 'AI_CALL', payload: { modelId, prompt: text, cost } });
      pushLog({
        mode: 'mock',
        model: model.id,
        modelName: model.name,
        status: AI_LOG_STATUS.SUCCESS,
        tokens: cost,
        cost: charged,
      });
      return {
        ok: true,
        mode: 'mock',
        text: raw.replace('X', cost.toString()),
        model: model.id,
        cost: charged,
        usage: { total_tokens: cost, estimated: true },
      };
    }

    const messages = buildChatMessages({ history, prompt: text });
    const result = await chatComplete({
      appModelId: modelId,
      messages,
      signal,
      displayModelName: model.name,
    });

    // Model THỰC SỰ được gọi (API trả về, hoặc model đã resolve khi lỗi/huỷ)
    const actualModel = result.model || modelId;
    const actualModelName = resolveModelLabel(actualModel, current.aiModels);

    // Người dùng bấm "Dừng" → không trừ token, trả nguyên cờ canceled cho màn hình
    if (result.canceled) {
      pushLog({
        model: actualModel,
        modelName: actualModelName,
        status: AI_LOG_STATUS.CANCELED,
        latencyMs: result.latencyMs,
        error: result.error,
      });
      return { ok: false, canceled: true, mode: result.mode || 'live', error: result.error };
    }
    if (!result.ok) {
      pushLog({
        model: actualModel,
        modelName: actualModelName,
        status: AI_LOG_STATUS.ERROR,
        latencyMs: result.latencyMs,
        error: result.error,
      });
      return { ok: false, mode: result.mode || 'live', error: result.error };
    }

    // Trừ token theo usage thật của API (fallback ước lượng nếu gateway không trả)
    const cost = costFromUsage({ usage: result.usage, messages, reply: result.text });
    const charged = chargeTokens(user.tokenBalance, cost);
    const usage = result.usage || null;
    const usageTotal = Math.round(Number(usage && usage.total_tokens) || 0);

    dispatch({ type: 'AI_CALL', payload: { modelId, prompt: text, cost } });
    pushLog({
      model: actualModel,
      modelName: actualModelName,
      status: AI_LOG_STATUS.SUCCESS,
      tokens: usageTotal > 0 ? usageTotal : cost,
      promptTokens: Math.round(Number(usage && usage.prompt_tokens) || 0),
      completionTokens: Math.round(Number(usage && usage.completion_tokens) || 0),
      cost: charged,
      latencyMs: result.latencyMs,
    });
    return {
      ok: true,
      mode: 'live',
      text: result.text,
      model: result.model,
      usage: result.usage,
      cost: charged,
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
  const notifications = useMemo(() => (currentUser
    ? state.notifications.filter(n => n.userId === currentUser.id)
    : []), [currentUser, state.notifications]);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Value được memo hoá: mỗi lần dispatch không tạo object mới → consumer
  // không re-render nếu phần chúng đọc không đổi. `state` vẫn là object mới
  // khi reducer trả state mới (đúng ý), nhưng context object thì ổn định.
  const googleConfigured = isGoogleSignInConfigured();
  const value = useMemo(() => ({
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
    isGoogleSignInConfigured: googleConfigured,
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
  }), [
    state,
    currentUser,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signInDemoAccount,
    enterDemoMode,
    signOut,
    clearAuthNotice,
    updateMyProfile,
    loadUserDirectory,
    googleConfigured,
    canClaimDaily,
    nextStreak,
    nextDailyReward,
    questState,
    notifications,
    unreadNotifications,
    topUpTokens,
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
    setUserStatus,
    setUserRole,
    toggleModelAvailability,
    resetToken,
  ]);

  return (
    <AppContext.Provider value={value}>
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
