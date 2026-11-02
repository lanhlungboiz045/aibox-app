import { chatComplete, resetAISettings, saveAISettings } from '../../src/services/ai';

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

describe('chatComplete với Gemini quá tải', () => {
  beforeEach(async () => {
    await resetAISettings();
    await saveAISettings({
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'test-key',
      model: 'gemini-3.1-flash-lite',
      forceModel: true,
    });
  });

  afterEach(async () => {
    global.fetch = realFetch;
    await resetAISettings();
  });

  it('tự chuyển sang model dự phòng khi model chính trả 503', async () => {
    const calledModels = [];
    global.fetch = jest.fn(async (url, options) => {
      const { model } = JSON.parse(options.body);
      calledModels.push(model);
      if (model === 'gemini-3.1-flash-lite') {
        return {
          ok: false,
          status: 503,
          text: async () => JSON.stringify({
            error: { message: 'This model is currently experiencing high demand.' },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'Xin chào, tôi là trợ lý AI.' } }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        }),
      };
    });

    const res = await chatComplete({ messages: [{ role: 'user', content: 'Xin chào' }] });

    expect(res.ok).toBe(true);
    expect(res.fallback).toBe(true);
    expect(res.model).toBe('gemini-flash-lite-latest');
    expect(calledModels).toEqual(['gemini-3.1-flash-lite', 'gemini-flash-lite-latest']);
  });

  it('báo quá tải rõ ràng khi mọi model dự phòng đều lỗi 503', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({
        error: { message: 'This model is currently experiencing high demand.' },
      }),
    });
    global.fetch = fetchMock;

    const res = await chatComplete({ messages: [{ role: 'user', content: 'Xin chào' }] });

    expect(res.ok).toBe(false);
    expect(res.action).toBe('ai-settings');
    expect(res.error).toMatch(/quá tải/i);
    expect(res.error).toMatch(/không phải cấu hình/i);
    // Đã thử model chính + 3 model dự phòng
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
