// theme/tokens.js — Design tokens cho giao diện gọn (Home + các màn mới)
// Palette tối giống spec: nền gần đen, card xanh than, viền mảnh, tím làm accent.
export const colors = {
  bg: '#0F1115',
  surface: '#121620',
  surfaceAlt: '#171B26',
  surfaceHi: '#1E2333',
  border: '#1B2030',
  borderSoft: '#252B3D',
  accent: '#8B5CF6',
  accentSoft: '#A78BFA',
  accentDim: 'rgba(139, 92, 246, 0.12)',
  text: '#E8EAF2',
  textDim: '#8A90A6',
  textFaint: '#5C6178',
  success: '#22C55E',
  successDim: 'rgba(34, 197, 94, 0.12)',
  warning: '#FFB74D',
  warningDim: 'rgba(255, 183, 77, 0.10)',
  danger: '#FF6B6B',
  dangerDim: 'rgba(255, 107, 107, 0.10)',
};

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

// Quy tắc gọn: mọi khối cách nhau 20, lề ngang 16
export const layout = {
  gutter: 16,
  sectionGap: 20,
  headerHeight: 56,
};

export const type = {
  section: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  title: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 13, lineHeight: 19 },
  small: { fontSize: 11, lineHeight: 16 },
  mono: { fontFamily: 'monospace' },
};
