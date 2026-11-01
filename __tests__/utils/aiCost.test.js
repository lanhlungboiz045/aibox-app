import {
  MIN_AI_CALL_BALANCE,
  estimateTokens,
  messagesText,
  chargeTokens,
  costFromUsage,
} from '../../src/utils/aiCost';

describe('estimateTokens', () => {
  it('ước lượng 1 token ≈ 4 ký tự, tối thiểu 1', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(9))).toBe(3);
  });

  it('an toàn với dữ liệu không phải chuỗi', () => {
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(1234)).toBe(1);
  });
});

describe('messagesText', () => {
  it('ghép nội dung các message bằng xuống dòng', () => {
    expect(messagesText([
      { role: 'system', content: 'a' },
      { role: 'user', content: 'b' },
    ])).toBe('a\nb');
    expect(messagesText([{ role: 'user' }, null])).toBe('\n');
  });

  it('trả chuỗi rỗng khi không có message', () => {
    expect(messagesText()).toBe('');
    expect(messagesText('không phải mảng')).toBe('');
  });
});

describe('chargeTokens', () => {
  it('trừ đúng chi phí khi ví đủ', () => {
    expect(chargeTokens(1000, 250)).toBe(250);
  });

  it('không trừ quá số dư (không cho âm ví)', () => {
    expect(chargeTokens(100, 250)).toBe(100);
    expect(chargeTokens(0, 250)).toBe(0);
  });

  it('làm tròn và bỏ qua số âm/rác', () => {
    expect(chargeTokens(1000, 10.4)).toBe(10);
    expect(chargeTokens(1000, -5)).toBe(0);
    expect(chargeTokens(null, 50)).toBe(0);
  });

  it('ngưỡng số dư tối thiểu là số dương', () => {
    expect(MIN_AI_CALL_BALANCE).toBeGreaterThan(0);
  });
});

describe('costFromUsage', () => {
  it('ưu tiên usage.total_tokens do API trả về', () => {
    expect(costFromUsage({ usage: { total_tokens: 321 }, prompt: 'x', reply: 'y' })).toBe(321);
  });

  it('bỏ qua usage không hợp lệ và fallback ước lượng prompt + reply', () => {
    expect(costFromUsage({ usage: { total_tokens: 0 }, prompt: 'abcd', reply: 'abcdefgh' })).toBe(3);
    expect(costFromUsage({ usage: { total_tokens: 'abc' }, prompt: 'abcd' })).toBe(1);
  });

  it('dùng messages khi không có prompt', () => {
    const cost = costFromUsage({ messages: [{ content: 'a'.repeat(40) }], reply: 'b'.repeat(40) });
    expect(cost).toBe(20);
  });

  it('luôn trả ít nhất 1 token', () => {
    expect(costFromUsage({})).toBe(1);
  });
});
