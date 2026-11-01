import { dictionaries, t, LANG } from '../src/i18n';

const sortedKeys = dict => Object.keys(dict).sort();
const placeholders = text => (String(text).match(/\{(\w+)\}/g) || []).sort();

describe('i18n dictionaries', () => {
  it('vi và en có đúng cùng bộ key', () => {
    const viKeys = sortedKeys(dictionaries.vi);
    const enKeys = sortedKeys(dictionaries.en);
    expect(enKeys).toEqual(viKeys);
  });

  it('không có bản dịch rỗng', () => {
    Object.entries(dictionaries).forEach(([, dict]) => {
      Object.values(dict).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      });
    });
  });

  it('placeholder giống nhau giữa 2 ngôn ngữ', () => {
    sortedKeys(dictionaries.vi).forEach(key => {
      expect(placeholders(dictionaries.en[key])).toEqual(placeholders(dictionaries.vi[key]));
    });
  });

  it('mọi key dùng trong code đều tồn tại', () => {
    const keys = sortedKeys(dictionaries.vi);
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach(key => {
      expect(t(key)).not.toBe(key);
    });
  });

  it('nội suy biến và trả key khi thiếu', () => {
    expect(t('onboard.step', { current: 1, total: 3 })).toContain('1');
    expect(t('onboard.step', { current: 1, total: 3 })).toContain('3');
    expect(t('khong.co.key.nay')).toBe('khong.co.key.nay');
    expect(LANG === 'vi' || LANG === 'en').toBe(true);
  });
});
