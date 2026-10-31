// i18n/index.js — Khung đa ngôn ngữ tối giản (Bước 5)
//
// Vì sao tự viết thay vì i18next: app chỉ cần 2 ngôn ngữ, không cần đổi ngôn ngữ
// trong lúc chạy (giống light/dark theme, đổi cần mở lại app) → 1 file, 0 dependency,
// giữ được Expo Go.
//
// Cách dùng:
//   import { t, useI18n } from '../i18n';
//   <Text>{t('common.retry')}</Text>
//   const { t, lang } = useI18n();          // trong component
//   t('common.hello', { name: user.name }); // nội suy {name}
//
// Ngôn ngữ: mặc định 'vi'; đặt EXPO_PUBLIC_LANG=en trong .env để chạy bản tiếng Anh.
// Thiếu key → trả về key để lộ ra ngay khi test, không im lặng hiển thị rỗng.

import { useMemo } from 'react';

const raw = (process.env.EXPO_PUBLIC_LANG || 'vi').toLowerCase();

/** 'vi' | 'en' — chốt 1 lần lúc nạp module. */
export const LANG = raw.startsWith('en') ? 'en' : 'vi';

const vi = {
  // ── Hành động dùng chung ──
  'common.back': 'Quay lại',
  'common.close': 'Đóng',
  'common.cancel': 'Huỷ',
  'common.retry': 'Thử lại',
  'common.save': 'Lưu',
  'common.delete': 'Xoá',
  'common.undo': 'Hoàn tác',
  'common.copy': 'Sao chép',
  'common.copied': 'Đã sao chép',
  'common.send': 'Gửi',
  'common.stop': 'Dừng',
  'common.loading': 'Đang tải…',
  'common.search': 'Tìm kiếm',
  'common.all': 'Tất cả',
  'common.topup': 'Nạp token',
  'common.confirm': 'Xác nhận',

  // ── Trạng thái dùng chung (ErrorState/OfflineBar/EmptyState) ──
  'state.offline': 'Không có kết nối mạng',
  'state.errorTitle': 'Không tải được dữ liệu',
  'state.errorMessage': 'Kiểm tra kết nối mạng rồi thử lại.',
  'state.empty': 'Chưa có gì ở đây',

  // ── Điều hướng / drawer ──
  'nav.explore': 'Khám phá',
  'nav.tools': 'Công cụ',
  'nav.account': 'Tài khoản',
  'nav.admin': 'Quản trị',
  'nav.menu': 'Menu',
  'nav.openMenu': 'Mở menu',
  'nav.closeMenu': 'Đóng menu',
  'nav.home': 'Trang chủ',
  'nav.aihub': 'AI Hub',
  'nav.transactions': 'Lịch sử giao dịch',
  'nav.play': 'Giải trí',
  'nav.taixiu': 'Tài xỉu',
  'nav.usage': 'Thống kê sử dụng',
  'nav.logs': 'Lịch sử AI',
  'nav.apiKeys': 'Khóa API',
  'nav.topup': 'Nạp token',
  'nav.quests': 'Nhiệm vụ',
  'nav.aiSettings': 'Cài đặt AI',
  'nav.profile': 'Hồ sơ',
  'nav.notifications': 'Thông báo',

  // ── Tiêu đề màn chính ──
  'screen.home': 'Trang chủ',
  'screen.aihub': 'AI Hub',
  'screen.apiKeys': 'Khóa API',
  'screen.logs': 'Lịch sử AI',
  'screen.topup': 'Nạp token',
  'screen.taixiu': 'Tài xỉu',

  // ── Home ──
  'home.spend7d': 'Chi tiêu 7 ngày',
  'home.recentRequests': 'Lượt gọi gần đây',
  'home.noRequests': 'Chưa có lượt gọi nào',

  // ── AI Hub / Logs ──
  'aihub.suggest': 'Thử một trong các câu này',
  'logs.noMatch': 'Không có lượt gọi khớp bộ lọc',
  'logs.clearFilter': 'Xoá bộ lọc',

  // ── Onboarding (lần mở app đầu tiên) ──
  'onboard.skip': 'Bỏ qua',
  'onboard.next': 'Tiếp tục',
  'onboard.start': 'Bắt đầu',
  'onboard.step': 'Bước {current}/{total}',
  'onboard.hint': 'Chuyển sang bước tiếp theo',
  'onboard.s1Title': 'Hỏi AI bằng token',
  'onboard.s1Desc': 'Trò chuyện với nhiều mô hình AI trong một chỗ. Mỗi câu trả lời trừ đúng số token đã dùng.',
  'onboard.s2Title': 'Ví token minh bạch',
  'onboard.s2Desc': 'Xem số dư, chi tiêu 7 ngày và lịch sử lượt gọi ngay trên Trang chủ. Nạp thêm chỉ 1 chạm.',
  'onboard.s3Title': 'Dữ liệu ở lại trên máy',
  'onboard.s3Desc': 'Lịch sử trò chuyện lưu theo tài khoản Google của bạn; khóa API luôn được che trong danh sách.',
};

const en = {
  'common.back': 'Back',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.retry': 'Retry',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.undo': 'Undo',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.send': 'Send',
  'common.stop': 'Stop',
  'common.loading': 'Loading…',
  'common.search': 'Search',
  'common.all': 'All',
  'common.topup': 'Top up',
  'common.confirm': 'Confirm',

  'state.offline': 'No internet connection',
  'state.errorTitle': 'Could not load data',
  'state.errorMessage': 'Check your connection and try again.',
  'state.empty': 'Nothing here yet',

  'nav.explore': 'Explore',
  'nav.tools': 'Tools',
  'nav.account': 'Account',
  'nav.admin': 'Admin',
  'nav.menu': 'Menu',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'nav.home': 'Home',
  'nav.aihub': 'AI Hub',
  'nav.transactions': 'Transactions',
  'nav.play': 'Play',
  'nav.taixiu': 'Tai Xiu',
  'nav.usage': 'Usage / Billing',
  'nav.logs': 'AI call logs',
  'nav.apiKeys': 'API Keys',
  'nav.topup': 'Top up',
  'nav.quests': 'Quests',
  'nav.aiSettings': 'AI settings',
  'nav.profile': 'Profile',
  'nav.notifications': 'Notifications',

  'screen.home': 'Home',
  'screen.aihub': 'AI Hub',
  'screen.apiKeys': 'API Keys',
  'screen.logs': 'AI call logs',
  'screen.topup': 'Top up',
  'screen.taixiu': 'Tai Xiu',

  'home.spend7d': 'Spend · last 7 days',
  'home.recentRequests': 'Recent requests',
  'home.noRequests': 'No requests yet',

  'aihub.suggest': 'Try one of these',
  'logs.noMatch': 'No requests match this filter',
  'logs.clearFilter': 'Clear filters',

  'onboard.skip': 'Skip',
  'onboard.next': 'Continue',
  'onboard.start': 'Get started',
  'onboard.step': 'Step {current} of {total}',
  'onboard.hint': 'Go to the next step',
  'onboard.s1Title': 'Ask AI with tokens',
  'onboard.s1Desc': 'Chat with several AI models in one place. Each answer charges exactly the tokens it used.',
  'onboard.s2Title': 'A transparent token wallet',
  'onboard.s2Desc': 'See your balance, 7-day spend and request history right on Home. Top up in one tap.',
  'onboard.s3Title': 'Your data stays on device',
  'onboard.s3Desc': 'Chat history is stored per Google account and API keys are always masked in the list.',
};

const DICTS = { vi, en };
const dict = DICTS[LANG];

/**
 * Dịch 1 key. Nội suy dạng {name}.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 */
export function t(key, vars) {
  let text = dict[key];
  if (text === undefined) return key; // thiếu key → lộ ra key, dễ phát hiện
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (m, name) =>
      vars[name] === undefined ? m : String(vars[name]));
  }
  return text;
}

/** Hook trả về { t, lang }; t ổn định theo LANG nên an toàn làm dependency. */
export function useI18n() {
  return useMemo(() => ({ t, lang: LANG }), []);
}

export default { t, useI18n, LANG };
