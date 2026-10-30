// utils/clipboard.js — Copy tập trung, không throw khi thiếu quyền/không hỗ trợ
import * as Clipboard from 'expo-clipboard';
import { hapticSuccess } from './feedback';

// Trả về true/false để màn hình quyết định có hiện toast thành công hay không
export async function copyText(value) {
  const text = String(value ?? '');
  if (!text) return false;
  try {
    await Clipboard.setStringAsync(text);
    hapticSuccess();
    return true;
  } catch {
    return false;
  }
}
