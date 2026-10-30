// theme/tokens.js — Design tokens duy nhất cho app
//
// Quy ước (Bước 2 + 5):
// - Màu: mọi cặp chữ/nền phải đạt WCAG AA (>= 4.5:1), cho CẢ bảng tối và sáng.
//   Bảng màu nằm trong theme/palettes.js; file này chỉ chọn bảng theo hệ thống.
// - Khoảng cách: thang 4/8/12/16/20/24/32 — không dùng số lẻ ngoài thang.
// - Cỡ chữ: thang 12/14/16/18/24/32 — không dùng < 12.
// - Không hard-code #hex / fontSize / padding trong màn hình nữa.
//
// LIGHT THEME: StyleSheet.create() chụp giá trị màu ngay khi module được nạp,
// nên theme được chọn 1 lần lúc khởi động. Đổi theme trong phiên (hoặc bật
// "Dark/Light" ở hệ điều hành khi app đang chạy) cần mở lại app.
// Ép theme để test: EXPO_PUBLIC_THEME=light|dark (xem .env.example).
import { Appearance } from 'react-native';
import { darkColors, lightColors } from './palettes';

const forced = process.env.EXPO_PUBLIC_THEME;
export const activeScheme = forced === 'light' || forced === 'dark'
  ? forced
  : (Appearance.getColorScheme() === 'light' ? 'light' : 'dark');
export const isDark = activeScheme === 'dark';

// Tên `colors` giữ nguyên để toàn bộ màn hình cũ không phải sửa import.
export const colors = isDark ? darkColors : lightColors;

// ─────────────────────── Bo góc & đổ bóng ───────────────────────
export const radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999 };

// ───────────────────────── Khoảng cách ─────────────────────────
// Thang chuẩn: 4 8 12 16 20 24 32
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32 };

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

// Khung nội dung canh giữa cho tablet (>= 720px): thêm vào contentContainerStyle
// của ScrollView/FlatList để nội dung không giãn hết chiều ngang.
export const centeredContent = {
  width: '100%',
  maxWidth: layout.maxContentWidth,
  alignSelf: 'center' };

// ───────────────────────── Cỡ chữ ─────────────────────────
export const typeScale = {
  caption: 12,
  body: 14,
  subtitle: 16,
  section: 18,
  h1: 24,
  display: 32 };

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
  title: { fontSize: 16, lineHeight: 22, fontWeight: '600' } };

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
  minHeight: layout.headerHeight };
