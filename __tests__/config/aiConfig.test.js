import { KEYLESS_FALLBACK, resolveAIConfig, allowsEmptyApiKey } from '../../src/config/ai';

describe('resolveAIConfig', () => {
  it('giữ nguyên cấu hình khi có Base URL + khóa', () => {
    const cfg = resolveAIConfig({
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: '  key-123  ',
      model: 'gemini-3.1-flash-lite',
    });
    expect(cfg.fallback).toBe(false);
    expect(cfg.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(cfg.apiKey).toBe('key-123');
    expect(cfg.model).toBe('gemini-3.1-flash-lite');
  });

  it('dùng cổng miễn phí khi có Base URL cần khóa nhưng khóa trống', () => {
    const cfg = resolveAIConfig({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
    });
    expect(cfg.fallback).toBe(true);
    expect(cfg.baseUrl).toBe(KEYLESS_FALLBACK.baseUrl);
    expect(cfg.model).toBe(KEYLESS_FALLBACK.model);
    // Không được gửi khóa của nhà cung cấp khác sang máy chủ dự phòng
    expect(cfg.apiKey).toBe('');
  });

  it('dùng cổng miễn phí khi chưa cấu hình gì', () => {
    const cfg = resolveAIConfig();
    expect(cfg.fallback).toBe(true);
    expect(cfg.baseUrl).toBe(KEYLESS_FALLBACK.baseUrl);
  });

  it('không dự phòng khi cổng không cần khóa (Pollinations)', () => {
    const cfg = resolveAIConfig({ baseUrl: 'https://text.pollinations.ai/openai', model: 'openai' });
    expect(cfg.fallback).toBe(false);
    expect(cfg.baseUrl).toBe('https://text.pollinations.ai/openai');
  });

  it('không dự phòng với máy chủ trong mạng nội bộ', () => {
    const cfg = resolveAIConfig({ baseUrl: 'http://192.168.1.10:11434/v1', model: 'llama3.1' });
    expect(cfg.fallback).toBe(false);
    expect(cfg.baseUrl).toBe('http://192.168.1.10:11434/v1');
  });

  it('mặc định ép dùng model cấu hình, tắt được bằng forceModel = false', () => {
    expect(resolveAIConfig({ apiKey: 'k', baseUrl: 'https://api.openai.com/v1' }).forceModel).toBe(true);
    expect(
      resolveAIConfig({ apiKey: 'k', baseUrl: 'https://api.openai.com/v1', forceModel: false }).forceModel,
    ).toBe(false);
  });
});

describe('allowsEmptyApiKey', () => {
  it('chỉ cho trống khóa với local/LAN và Pollinations', () => {
    expect(allowsEmptyApiKey('http://localhost:11434/v1')).toBe(true);
    expect(allowsEmptyApiKey('https://text.pollinations.ai/openai')).toBe(true);
    expect(allowsEmptyApiKey('https://api.openai.com/v1')).toBe(false);
    expect(allowsEmptyApiKey('')).toBe(false);
  });
});
