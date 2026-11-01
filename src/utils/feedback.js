// utils/feedback.js — Haptic tập trung 1 chỗ, tự bỏ qua khi máy/Expo Go không hỗ trợ.
// Mọi lời gọi đều "fire and forget": không await, không làm chậm thao tác.
import * as Haptics from 'expo-haptics';

async function run(fn) {
  try {
    await fn();
  } catch {
    // Thiết bị không có motor rung / web → bỏ qua, không throw
  }
}

// Chạm nhẹ: mở sheet, chọn chip, nhấn nút phụ
export const hapticTap = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

// Nhấn mạnh: hành động chính (gửi tin, nạp tiền, tạo key)
export const hapticPress = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

// Xác nhận thành công (copy, lưu, hoàn tất đơn)
export const hapticSuccess = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

// Lỗi / hành động nguy hiểm (xoá, thất bại)
export const hapticError = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

// Đổi lựa chọn (switch, segmented)
export const hapticSelect = () => run(() => Haptics.selectionAsync());
