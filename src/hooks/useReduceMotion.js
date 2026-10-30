// hooks/useReduceMotion.js — Cài đặt "giảm chuyển động" của hệ điều hành (Bước 6)
//
// Vì sao có thêm biến cache ở module: mỗi màn hình đều có vài animation (FadeIn,
// nút bấm, card). Nếu mỗi component tự gọi AccessibilityInfo thì tốn hàng trăm
// lần gọi và mỗi lần đều có 1 frame "chưa biết giá trị". Ở đây:
//   - đọc giá trị 1 lần, lưu vào `current`, nghe thay đổi 1 lần duy nhất;
//   - component dùng hook để re-render khi giá trị đổi;
//   - chỗ không phải component (ví dụ hàm onPress của Button) dùng getReduceMotion()
//     để đọc ngay, không cần state.
//
// Bật "giảm chuyển động" (iOS: Cài đặt → Trợ năng → Chuyển động; Android: Loại bỏ
// hiệu ứng động) thì các animation chuyển sang hiện ngay, haptic vẫn giữ.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let current = false; // false = chưa phát hiện người dùng cần giảm chuyển động
let known = false; // đã đọc được giá trị lần đầu chưa
let started = false;
const subscribers = new Set();

function apply(value) {
  const next = Boolean(value);
  const changed = next !== current;
  current = next;
  known = true;
  if (changed) subscribers.forEach((fn) => fn(next));
}

function ensureLoaded() {
  if (started) return;
  started = true;
  // Thiếu API (bản RN cũ) → coi như không giảm chuyển động, không throw
  AccessibilityInfo.isReduceMotionEnabled?.()
    .then(apply)
    .catch(() => { known = true; });
  // Người dùng đổi cài đặt trong lúc app đang mở
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', apply);
}

/** Đọc ngay (không re-render) — dùng trong handler/animation. */
export function getReduceMotion() {
  ensureLoaded();
  return current;
}

/** true khi đã đọc được giá trị lần đầu (dùng để tránh nháy nội dung ẩn). */
export function isReduceMotionKnown() {
  ensureLoaded();
  return known;
}

/** Hook: true khi nên giảm chuyển động. */
export function useReduceMotion() {
  const [reduced, setReduced] = useState(current);

  useEffect(() => {
    ensureLoaded();
    setReduced(current); // đồng bộ lại nếu giá trị đã có trước khi mount
    subscribers.add(setReduced);
    return () => {
      subscribers.delete(setReduced);
    };
  }, []);

  return reduced;
}
