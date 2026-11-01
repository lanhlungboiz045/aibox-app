import {
  formatToken,
  formatDate,
  formatRelativeTime,
  toDayKey,
  daysBetween,
  formatAmount,
  generateId,
} from '../../src/utils/format';

describe('formatToken', () => {
  it('nhóm nghìn bằng dấu chấm kiểu Việt Nam', () => {
    expect(formatToken(10000)).toBe('10.000');
    expect(formatToken(1234567)).toBe('1.234.567');
  });

  it('giữ 1 số lẻ và dùng dấu phẩy thập phân', () => {
    expect(formatToken(1234.56)).toBe('1.234,6');
    expect(formatToken(0.5)).toBe('0,5');
  });

  it('xử lý số âm và dữ liệu rác', () => {
    expect(formatToken(-1500)).toBe('-1.500');
    expect(formatToken(null)).toBe('0');
    expect(formatToken('abc')).toBe('0');
  });
});

describe('formatDate', () => {
  it('trả về dd/mm/yyyy', () => {
    expect(formatDate('2025-11-02T10:00:00')).toMatch(/^\d{2}\/\d{2}\/2025$/);
  });
});

describe('formatRelativeTime', () => {
  const now = Date.now();

  it('mốc thời gian trong quá khứ', () => {
    expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5 phút trước');
    expect(formatRelativeTime(now - 3 * 60 * 60 * 1000)).toBe('3 giờ trước');
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000)).toBe('2 ngày trước');
  });

  it('vừa xong khi chênh lệch dưới 1 phút', () => {
    expect(formatRelativeTime(now)).toBe('Vừa xong');
  });
});

describe('toDayKey / daysBetween', () => {
  it('dùng ngày local, không phải UTC', () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('trả null với ngày không hợp lệ', () => {
    expect(toDayKey('không phải ngày')).toBeNull();
    expect(daysBetween(null, '2026-01-01')).toBeNull();
  });

  it('đếm đúng số ngày kể cả qua tháng/năm', () => {
    expect(daysBetween('2026-01-01', '2026-01-02')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-01-10', '2026-01-01')).toBe(-9);
  });
});

describe('formatAmount', () => {
  it('thêm dấu + cho số dương, giữ dấu - cho số âm', () => {
    expect(formatAmount(500)).toBe('+500');
    expect(formatAmount(-500)).toBe('-500');
    expect(formatAmount(0)).toBe('+0');
  });
});

describe('generateId', () => {
  it('sinh id duy nhất', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});
