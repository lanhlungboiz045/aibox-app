import { FEATHER_PATHS } from '../../src/components/ui/featherPaths';

// Tên icon đang dùng trong app (literal trong mã nguồn). Nếu ai đó gõ sai tên,
// test này sẽ bắt được thay vì để icon biến thành ô trống trên máy thật.
const USED_ICONS = [
  'activity', 'alert-circle', 'alert-triangle', 'arrow-down-left', 'arrow-up',
  'bar-chart-2', 'bell', 'box', 'check', 'check-circle', 'chevron-left',
  'chevron-right', 'circle', 'code', 'cpu', 'credit-card', 'database',
  'dollar-sign', 'download', 'edit-3', 'feather', 'file-text', 'gift', 'globe',
  'grid', 'home', 'image', 'inbox', 'info', 'key', 'layers', 'list', 'lock',
  'log-out', 'message-square', 'monitor', 'package', 'pie-chart', 'plus',
  'plus-circle', 'power', 'refresh-cw', 'search', 'send', 'settings', 'shield',
  'smartphone', 'square', 'star', 'sun', 'target', 'trending-up', 'upload',
  'user', 'user-x', 'users', 'wifi-off', 'x', 'zap',
];

describe('FEATHER_PATHS', () => {
  it('có đủ bộ icon Feather', () => {
    expect(Object.keys(FEATHER_PATHS).length).toBeGreaterThanOrEqual(280);
  });

  it('mọi icon app dùng đều tồn tại', () => {
    const missing = USED_ICONS.filter(name => !FEATHER_PATHS[name]);
    expect(missing).toEqual([]);
  });

  it('mỗi icon là danh sách path không rỗng, đúng cú pháp SVG', () => {
    for (const paths of Object.values(FEATHER_PATHS)) {
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
      for (const d of paths) {
        expect(typeof d).toBe('string');
        expect(d.startsWith('M')).toBe(true);
        expect(d).toMatch(/^[A-Za-z][A-Za-z0-9 .,-]+$/);
      }
    }
  });
});
