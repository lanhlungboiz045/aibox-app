import {
  appReducer,
  createInitialState,
  getCurrentUser,
  sanitizeAccount,
  sanitizeAccounts,
  DEMO_UID,
  MAX_TRANSACTIONS,
} from '../../src/context/appReducer';
import { createAccount } from '../../src/data/accounts';

// State ban đầu có 1 phiên demo đang đăng nhập, ví 10.000 token.
function demoState(overrides) {
  const base = appReducer(createInitialState(), { type: 'DEMO_SESSION' });
  return overrides ? { ...base, ...overrides } : base;
}

function userOf(state) {
  return state.accounts.find(account => account.id === state.firebaseUser.uid);
}

describe('createInitialState', () => {
  it('bắt đầu ở trạng thái loading, chưa đăng nhập', () => {
    const state = createInitialState();
    expect(state.isLoading).toBe(true);
    expect(state.firebaseUser).toBeNull();
    expect(state.accounts).toEqual([]);
    expect(state.aiLogs).toEqual([]);
    expect(getCurrentUser(state)).toBeNull();
  });
});

describe('DEMO_SESSION', () => {
  it('tạo tài khoản demo với ví khởi điểm và quyền admin', () => {
    const state = demoState();
    expect(state.firebaseUser.uid).toBe(DEMO_UID);
    expect(state.demoMode).toBe(true);
    expect(state.authReady).toBe(true);
    const user = userOf(state);
    expect(user.tokenBalance).toBe(10000);
    expect(user.role).toBe('admin');
    expect(user.provider).toBe('demo');
  });

  it('vào lại không tạo tài khoản trùng', () => {
    const once = demoState();
    const twice = appReducer(once, { type: 'DEMO_SESSION' });
    expect(twice.accounts).toHaveLength(1);
  });
});

describe('AI_CALL', () => {
  it('trừ đúng chi phí, cộng dồn chi tiêu và ghi giao dịch', () => {
    const state = appReducer(demoState(), {
      type: 'AI_CALL',
      payload: { modelId: 'gpt-4o', prompt: 'Xin chào', cost: 25 },
    });
    const user = userOf(state);
    expect(user.tokenBalance).toBe(9975);
    expect(user.totalSpentOnAI).toBe(25);
    expect(user.transactions[0]).toMatchObject({ type: 'AI_CALL', amount: -25, modelId: 'gpt-4o' });
    expect(state.quests[user.id].counters.aiCalls).toBe(1);
  });

  it('không cho số dư âm khi chi phí lớn hơn ví', () => {
    const state = appReducer(demoState(), {
      type: 'AI_CALL',
      payload: { modelId: 'gpt-4o', prompt: 'x', cost: 999999 },
    });
    expect(userOf(state).tokenBalance).toBe(0);
    expect(userOf(state).transactions[0].amount).toBe(-10000);
  });

  it('bỏ qua model lạ hoặc khi chưa đăng nhập', () => {
    const signedOut = createInitialState();
    expect(appReducer(signedOut, {
      type: 'AI_CALL', payload: { modelId: 'gpt-4o', prompt: 'x', cost: 10 },
    })).toBe(signedOut);

    const state = demoState();
    expect(appReducer(state, {
      type: 'AI_CALL', payload: { modelId: 'không-tồn-tại', prompt: 'x', cost: 10 },
    })).toBe(state);
  });
});

describe('TOPUP', () => {
  it('cộng token, cộng tổng nhận và ghi giao dịch TOPUP', () => {
    const state = appReducer(demoState(), {
      type: 'TOPUP',
      payload: { amount: 90000, label: 'Gói 90K' },
    });
    const user = userOf(state);
    expect(user.tokenBalance).toBe(100000);
    expect(user.totalEarned).toBe(90000);
    expect(user.transactions[0].type).toBe('TOPUP');
    expect(user.transactions[0].description).toContain('90.000');
  });

  it('bỏ qua số tiền không hợp lệ', () => {
    const state = demoState();
    expect(appReducer(state, { type: 'TOPUP', payload: { amount: 0 } })).toBe(state);
    expect(appReducer(state, { type: 'TOPUP', payload: { amount: -5 } })).toBe(state);
  });
});

describe('TRANSFER', () => {
  function withFriend() {
    const state = demoState();
    const friend = createAccount({ id: 'friend-1', username: 'Minh An', email: 'minh@example.com' });
    return { ...state, accounts: [...state.accounts, friend] };
  }

  it('chuyển token, ghi 2 giao dịch và tạo thông báo cho người nhận', () => {
    const state = appReducer(withFriend(), {
      type: 'TRANSFER',
      payload: { recipient: 'minh an', amount: 1000, note: 'cảm ơn' },
    });
    const sender = state.accounts.find(a => a.id === DEMO_UID);
    const friend = state.accounts.find(a => a.id === 'friend-1');
    expect(sender.tokenBalance).toBe(9000);
    expect(friend.tokenBalance).toBe(11000);
    expect(sender.transactions[0].type).toBe('TRANSFER_OUT');
    expect(friend.transactions[0].type).toBe('TRANSFER_IN');
    expect(state.notifications[0]).toMatchObject({ userId: 'friend-1', type: 'TRANSFER_IN' });
    expect(state.quests[DEMO_UID].counters.transfers).toBe(1);
  });

  it('không chuyển khi vượt số dư, tự chuyển cho mình hoặc người nhận không tồn tại', () => {
    const state = withFriend();
    expect(appReducer(state, {
      type: 'TRANSFER', payload: { recipient: 'Minh An', amount: 99999 },
    })).toBe(state);
    expect(appReducer(state, {
      type: 'TRANSFER', payload: { recipient: 'Demo Expo Go', amount: 100 },
    })).toBe(state);
    expect(appReducer(state, {
      type: 'TRANSFER', payload: { recipient: 'không ai', amount: 100 },
    })).toBe(state);
  });
});

describe('PLACE_TAIXIU_BET', () => {
  it('bộ ba trả 2× cược và ghi giao dịch TAIXIU', () => {
    const state = appReducer(demoState(), {
      type: 'PLACE_TAIXIU_BET',
      payload: { side: 'TAI', stake: 100, dice: [6, 6, 6] },
    });
    const user = userOf(state);
    expect(user.tokenBalance).toBe(10200);
    expect(user.transactions[0]).toMatchObject({ type: 'TAIXIU', amount: 200, triple: true, total: 18 });
    expect(state.quests[user.id].counters.taiXiuRounds).toBe(1);
  });

  it('thắng cửa nhận 0,96× cược', () => {
    const state = appReducer(demoState(), {
      type: 'PLACE_TAIXIU_BET',
      payload: { side: 'TAI', stake: 100, dice: [5, 5, 6] },
    });
    expect(userOf(state).tokenBalance).toBe(10096);
  });

  it('thua cửa mất tiền cược', () => {
    const state = appReducer(demoState(), {
      type: 'PLACE_TAIXIU_BET',
      payload: { side: 'TAI', stake: 100, dice: [1, 1, 2] },
    });
    expect(userOf(state).tokenBalance).toBe(9900);
    expect(userOf(state).transactions[0].amount).toBe(-100);
  });

  it('bỏ qua cửa lạ hoặc mức cược không hợp lệ', () => {
    const state = demoState();
    expect(appReducer(state, {
      type: 'PLACE_TAIXIU_BET', payload: { side: 'BA', stake: 100, dice: [1, 2, 3] },
    })).toBe(state);
    expect(appReducer(state, {
      type: 'PLACE_TAIXIU_BET', payload: { side: 'TAI', stake: 50, dice: [1, 2, 3] },
    })).toBe(state);
  });
});

describe('DAILY_REWARD', () => {
  it('chỉ nhận được 1 lần mỗi ngày', () => {
    const first = appReducer(demoState(), { type: 'DAILY_REWARD' });
    const user = userOf(first);
    expect(user.dailyStreak).toBe(1);
    expect(user.tokenBalance).toBeGreaterThan(10000);
    expect(appReducer(first, { type: 'DAILY_REWARD' })).toBe(first);
  });
});

describe('CLAIM_QUEST', () => {
  it('đủ tiến độ mới nhận thưởng, và không nhận 2 lần', () => {
    let state = demoState();
    for (let i = 0; i < 3; i += 1) {
      state = appReducer(state, {
        type: 'AI_CALL', payload: { modelId: 'gpt-4o', prompt: 'x', cost: 1 },
      });
    }
    const before = userOf(state).tokenBalance;
    state = appReducer(state, { type: 'CLAIM_QUEST', payload: { questId: 'q_ai' } });
    expect(userOf(state).tokenBalance).toBe(before + 500);
    expect(state.quests[DEMO_UID].claimed).toContain('q_ai');
    expect(appReducer(state, { type: 'CLAIM_QUEST', payload: { questId: 'q_ai' } })).toBe(state);
  });

  it('chưa đủ tiến độ thì không nhận được', () => {
    const state = demoState();
    expect(appReducer(state, { type: 'CLAIM_QUEST', payload: { questId: 'q_ai' } })).toBe(state);
  });
});

describe('ADMIN actions', () => {
  it('admin đổi được trạng thái người khác nhưng không tự khoá mình', () => {
    const base = demoState();
    const friend = createAccount({ id: 'friend-1', username: 'Minh An' });
    const state = { ...base, accounts: [...base.accounts, friend] };

    const banned = appReducer(state, {
      type: 'ADMIN_SET_USER_STATUS', payload: { userId: 'friend-1', status: 'banned' },
    });
    expect(banned.accounts.find(a => a.id === 'friend-1').status).toBe('banned');

    expect(appReducer(state, {
      type: 'ADMIN_SET_USER_STATUS', payload: { userId: DEMO_UID, status: 'banned' },
    })).toBe(state);
  });

  it('user thường không đổi được quyền', () => {
    const base = demoState();
    const viewer = createAccount({ id: 'user-1', username: 'User', role: 'user' });
    const state = {
      ...base,
      accounts: base.accounts.map(a => (a.id === DEMO_UID ? { ...a, role: 'user' } : a)).concat(viewer),
    };
    expect(appReducer(state, {
      type: 'ADMIN_SET_USER_ROLE', payload: { userId: 'user-1', role: 'admin' },
    })).toBe(state);
  });
});

describe('giới hạn lịch sử', () => {
  it('chỉ giữ MAX_TRANSACTIONS giao dịch mới nhất', () => {
    let state = demoState();
    for (let i = 0; i < MAX_TRANSACTIONS + 5; i += 1) {
      state = appReducer(state, { type: 'TOPUP', payload: { amount: 1, label: 'test' } });
    }
    expect(userOf(state).transactions).toHaveLength(MAX_TRANSACTIONS);
  });
});

describe('sanitize', () => {
  it('bỏ tài khoản rác, ép role/status về giá trị hợp lệ', () => {
    expect(sanitizeAccount(null)).toBeNull();
    expect(sanitizeAccount({ username: 'no-id' })).toBeNull();

    const account = sanitizeAccount({
      id: 'u1', username: 'A', role: 'superadmin', status: 'weird', tokenBalance: 'abc',
    });
    expect(account.role).toBe('user');
    expect(account.status).toBe('active');
    expect(account.tokenBalance).toBe(10000);
  });

  it('lọc bỏ tài khoản hệ thống khi đọc storage', () => {
    const list = sanitizeAccounts([
      { id: 'u1', provider: 'google' },
      { id: 'system', provider: 'system' },
      null,
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('u1');
    expect(sanitizeAccounts('không phải mảng')).toEqual([]);
  });
});
