import { chatComplete } from '../../src/services/ai';

// services/ai.js lưu cấu hình bằng AsyncStorage; trong Jest không có native module.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// Ở môi trường test không có EXPO_PUBLIC_AI_* → config rơi vào cổng miễn phí,
// đúng tình huống APK phát cho người khác.
const realFetch = global.fetch;

function mockResponse(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

describe('chatComplete với cổng miễn phí', () => {
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('báo giới hạn tần suất và gợi ý mở Cấu hình AI khi bị 402', async () => {
    mockResponse(402, { error: { message: 'Free limit reached: 1 reply every 45 seconds per IP' } });

    const res = await chatComplete({ messages: [{ role: 'user', content: 'Xin chào' }] });

    expect(res.ok).toBe(false);
    expect(res.action).toBe('ai-settings');
    expect(res.error).toMatch(/giới hạn tần suất/i);
    expect(res.error).toContain('Cấu hình AI');
    // Vẫn giữ message gốc của nhà cung cấp để dễ tra cứu
    expect(res.error).toContain('Free limit reached');
  });

  it('không gắn action cấu hình khi lỗi mạng thông thường', async () => {
    mockResponse(500, { error: { message: 'boom' } });

    const res = await chatComplete({ messages: [{ role: 'user', content: 'Xin chào' }] });

    expect(res.ok).toBe(false);
    expect(res.action).toBeUndefined();
  });
});
