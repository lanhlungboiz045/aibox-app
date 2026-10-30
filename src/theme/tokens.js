// theme/tokens.js — Design tokens duy nhất cho app
//
// Quy ước (Bước 2):
// - Màu: mọi cặp chữ/nền phải đạt WCAG AA (>= 4.5:1). Số đo ghi ngay bên cạnh.
// - Khoảng cách: thang 4/8/12/16/20/24/32 — không dùng số lẻ ngoài thang.
// - Cỡ chữ: thang 12/14/16/18/24/32 — không dùng < 12.
// - Không hard-code #hex / fontSize / padding trong màn hình nữa.

// ─────────────────────────── Màu ───────────────────────────
export const colors = {
  // Nền & bề mặt
  bg: '#0F1115',
  surface: '#121620',
  surfaceAlt: '#171B26',
  surfaceHi: '#1E2333',
  overlay: 'rgba(0, 0, 0, 0.65)',

  // Đường kẻ
  border: '#1B2030',
  borderSoft: '#252B3D',
  borderFocus: '#A78BFA',

  // Chữ — 3 cấp, tất cả đạt AA trên bg/surface/surfaceAlt
  text: '#E8EAF2',      // 15.0:1 trên surface
  textDim: '#B4BACB',   //  9.3:1 trên surface  (nhãn phụ)
  textFaint: '#9AA1B9', //  7.0:1 trên surface  (caption/placeholder)

  // Tím
  accent: '#8B5CF6',       // icon/đồ hoạ (4.46:1 — chỉ dùng cho graphic >= 18px)
  accentSoft: '#A78BFA',   // 6.9:1 — link & chữ nhỏ màu tím
  accentStrong: '#7C3AED', // nền nút + chữ trắng = 5.7:1
  accentDim: 'rgba(139, 92, 246, 0.12)',
  accentBorder: 'rgba(139, 92, 246, 0.45)',

  // Trạng thái (dùng cho chữ/icon trên nền tối)
  success: '#34D399',      // 9.4:1
  successDim: 'rgba(52, 211, 153, 0.14)',
  successBorder: 'rgba(52, 211, 153, 0.35)',
  warning: '#FFB74D',      // 10.4:1
  warningDim: 'rgba(255, 183, 77, 0.14)',
  warningBorder: 'rgba(255, 183, 77, 0.35)',
  danger: '#FF8A8A',       // 8.0:1 (chữ)
  dangerBg: '#DC2626',     // nền nút + chữ trắng = 4.8:1
  dangerDim: 'rgba(255, 107, 107, 0.14)',
  dangerBorder: 'rgba(255, 107, 107, 0.35)',
  info: '#7DD3FC',

  // Nút chính/disabled
  onAccent: '#FFFFFF',
  disabledBg: '#22262E',
  disabledText: '#6B7280',
  skeleton: '#1E2333',
  skeletonHi: '#2A3145',
};

// ─────────────────────── Bo góc & đổ bóng ───────────────────────
export const radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

// ───────────────────────── Khoảng cách ─────────────────────────
// Thang chuẩn: 4 8 12 16 20 24 32
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ───────────────────────── Bố cục ─────────────────────────
export const layout = {
  gutter: 16,        // lề ngang mọi màn
  sectionGap: 20,    // khoảng cách giữa các khối
  headerHeight: 56,  // header cố định
  maxContentWidth: 720, // tablet: nội dung canh giữa, không giãn hết màn
  rowHeight: 68,     // hàng danh sách 64–72
  cardCompact: 110,
  cardMax: 140,      // không card nào > 140 ngoài biểu đồ
};

// Vùng chạm tối thiểu (iOS HIG / Material = 44/48)
export const touch = {
  min: 44,
  iconButton: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  gap: 8, // khoảng cách tối thiểu giữa 2 nút kề nhau
};

// ───────────────────────── Cỡ chữ ─────────────────────────
export const typeScale = {
  caption: 12,
  body: 14,
  subtitle: 16,
  section: 18,
  h1: 24,
  display: 32,
};

// Style object dùng trực tiếp trong StyleSheet
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6 },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
  section: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  small: { fontSize: 12, lineHeight: 16 },
  smallStrong: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  mono: { fontFamily: 'monospace' },
  // Alias cũ (giữ để không phải sửa màn hình đang dùng)
  title: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
};

// ─────────────────── Chuyển động ───────────────────
export const motion = {
  pressScale: 0.97,
  fast: 120,
  base: 200,
  toast: 2600,
  undo: 5000, // snackbar "Hoàn tác"
};

// Header màn hình con (back + title + hành động phải) dùng chung
export const headerStyles = {
  height: layout.headerHeight,
};
