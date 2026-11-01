import { chatsRange, TOKENS_PER_CHAT_MIN, TOKENS_PER_CHAT_MAX } from '../../src/utils/economy';

describe('chatsRange', () => {
  it('trả "0" khi không có token', () => {
    expect(chatsRange(0)).toBe('0');
    expect(chatsRange(-100)).toBe('0');
  });

  it('cận dưới làm tròn xuống, cận trên làm tròn lên', () => {
    expect(chatsRange(100)).toBe('0,1–0,2');
    expect(chatsRange(1000)).toBe('1–2');
    expect(chatsRange(10000)).toBe('10–20');
  });

  it('dùng dấu phẩy thập phân và dấu chấm nghìn', () => {
    expect(chatsRange(100000)).toBe('100–200');
  });

  it('luôn bảo đảm khoảng min ≤ max', () => {
    [1, 500, 750, 1500, 9999, 123456].forEach(tokens => {
      const text = chatsRange(tokens);
      expect(text).not.toBe('');
    });
    expect(TOKENS_PER_CHAT_MIN).toBeLessThan(TOKENS_PER_CHAT_MAX);
  });
});
