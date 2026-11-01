// utils/economy.js — Quy đổi token ↔ số câu hỏi AI
//
// Một lượt chat thật (prompt + lịch sử + câu trả lời) tốn khoảng 500–1.000 token,
// tuỳ độ dài câu hỏi và model. File này gom hằng số đó về một chỗ để:
// - màn Tài xỉu hiện mức cược tương đương bao nhiêu câu hỏi AI;
// - màn Nạp token hiện mỗi gói dùng được bao nhiêu câu hỏi AI.
// Nhờ vậy hạn mức cược và gói nạp luôn khớp chi phí chat thật.
//
// Không import react-native → test được bằng Node.
export const TOKENS_PER_CHAT_MIN = 500;
export const TOKENS_PER_CHAT_MAX = 1000;

// Làm tròn "đẹp" theo độ lớn: <10 giữ 1 số lẻ, ≥10 làm tròn đơn vị,
// ≥100 làm tròn chục và thêm dấu chấm ngăn cách nghìn (kiểu Việt Nam).
function group(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function pretty(value) {
  if (value >= 100) return group(Math.round(value / 10) * 10);
  if (value >= 10) return String(Math.round(value));
  const fixed = (Math.round(value * 10) / 10).toFixed(1);
  return fixed.replace(/\.0$/, '').replace('.', ',');
}

// Số câu hỏi AI tương đương `tokens`, trả chuỗi khoảng:
//   100 token   → "0,1–0,2"
//   1.000 token → "1–2"
//   10.000      → "10–20"
// Dùng làm tròn xuống cho cận dưới và làm tròn lên cho cận trên để không
// hứa hão (người dùng luôn được ít nhất khoảng này).
export function chatsRange(tokens) {
  const value = Math.max(0, Number(tokens) || 0);
  if (value <= 0) return '0';
  const min = pretty(Math.floor((value / TOKENS_PER_CHAT_MAX) * 10) / 10);
  const max = pretty(Math.ceil((value / TOKENS_PER_CHAT_MIN) * 10) / 10);
  return min === max ? min : `${min}–${max}`;
}
