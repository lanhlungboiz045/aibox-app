// theme/palettes.js — 2 bảng màu (tối / sáng), cùng bộ khoá
//
// Quy ước:
// - Mọi bảng màu phải có ĐÚNG các khoá như nhau để màn hình không phải rẽ nhánh.
// - Cặp chữ/nền dùng cho chữ nhỏ (<= 18px) phải đạt WCAG AA >= 4.5:1.
// - Màu chỉ dùng cho icon/đồ hoạ lớn được phép >= 3:1 (ghi rõ trong comment).
// - Số đo tương phản được kiểm tra tự động bằng script scripts/contrast (xem README).
//
// Vì StyleSheet.create() chụp giá trị tại thời điểm module load, đổi theme
// trong cùng phiên sẽ không có tác dụng: cần mở lại app (xem theme/tokens.js).

// ─────────────────────────── Tối (mặc định) ───────────────────────────
export const darkColors = {
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
  warningBg: '#FFB74D',    // nền cam đặc (nút thưởng) — giữ sáng ở cả 2 theme, chữ dùng onBright
  warningDim: 'rgba(255, 183, 77, 0.14)',
  warningBorder: 'rgba(255, 183, 77, 0.35)',
  danger: '#FF8A8A',       // 8.0:1 (chữ)
  dangerBg: '#DC2626',     // nền nút + chữ trắng = 4.8:1
  dangerDim: 'rgba(255, 107, 107, 0.14)',
  dangerBorder: 'rgba(255, 107, 107, 0.35)',
  info: '#7DD3FC',

  // Nút chính/disabled
  onAccent: '#FFFFFF',
  onBright: '#0F1115', // chữ tối trên nền sáng (nút vàng, nút trắng...) — không đổi theo theme
  disabledBg: '#22262E',
  disabledText: '#8E96AA', // 5.1:1 trên disabledBg (vẫn đọc được)
  skeleton: '#1E2333',
  skeletonHi: '#2A3145',

  // Màu thương hiệu (không đổi theo theme)
  google: '#4285F4',
  openai: '#10A37F',
  claude: '#D97757',
  gold: '#C9A66B',
  shadow: '#000000' };

// ─────────────────────────── Sáng ───────────────────────────
// Bảng sáng không chỉ "đảo màu": các màu trạng thái phải tối lại để đủ tương phản
// khi đặt trên nền trắng (xanh lá / vàng của bảng tối sẽ gần như vô hình).
export const lightColors = {
  // Nền & bề mặt
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F8',
  surfaceHi: '#E7EAF3',
  overlay: 'rgba(15, 17, 21, 0.45)',

  // Đường kẻ
  border: '#E2E6F0',
  borderSoft: '#D2D8E6',
  borderFocus: '#7C3AED',

  // Chữ — 3 cấp, kiểm tra trên surface trắng
  text: '#15171E',      // 18.1:1
  textDim: '#4B5266',   //  8.2:1
  textFaint: '#5D6477', //  5.9:1 trên trắng, 4.9:1 trên surfaceHi

  // Tím
  accent: '#7C3AED',       // 6.4:1 trên trắng (đủ cho cả chữ)
  accentSoft: '#6D28D9',   // 7.5:1 — link & chữ nhỏ
  accentStrong: '#6D28D9', // nền nút + chữ trắng = 7.5:1
  accentDim: 'rgba(109, 40, 217, 0.08)',
  accentBorder: 'rgba(109, 40, 217, 0.30)',

  // Trạng thái
  success: '#047857',      // 5.9:1
  successDim: 'rgba(4, 120, 87, 0.10)',
  successBorder: 'rgba(4, 120, 87, 0.30)',
  warning: '#9A5B00',      // 5.4:1 (nâu hổ phách, đọc rõ trên trắng)
  warningBg: '#FFB74D',    // nền cam đặc (nút thưởng) — giữ sáng ở cả 2 theme, chữ dùng onBright
  warningDim: 'rgba(154, 91, 0, 0.10)',
  warningBorder: 'rgba(154, 91, 0, 0.28)',
  danger: '#B91C1C',       // 6.4:1
  dangerBg: '#DC2626',     // nền nút + chữ trắng = 4.8:1
  dangerDim: 'rgba(185, 28, 28, 0.08)',
  dangerBorder: 'rgba(185, 28, 28, 0.28)',
  info: '#0369A1',

  // Nút chính/disabled
  onAccent: '#FFFFFF',
  onBright: '#0F1115', // chữ tối trên nền sáng (nút vàng, nút trắng...)
  disabledBg: '#E5E8F0',
  disabledText: '#596073', // 5.1:1 trên disabledBg
  skeleton: '#E7EAF3',
  skeletonHi: '#DCE1EE',

  // Màu thương hiệu (giữ nguyên)
  google: '#4285F4',
  openai: '#10A37F',
  claude: '#D97757',
  gold: '#8A6A2F', // bản sáng đậm hơn để đọc được trên nền trắng
  shadow: '#000000' };
