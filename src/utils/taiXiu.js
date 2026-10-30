// utils/taiXiu.js — Luật game Tài xỉu (Sic Bo rút gọn, 3 xúc xắc) cho token nội bộ
//
// Luật công khai, không có gì ẩn:
// - 3 xúc xắc 1..6 → tổng 3..18.
// - Tổng 4..10 = XỈU, tổng 11..17 = TÀI.
// - Cược đúng được trả 1 ăn 1: thắng +stake, thua −stake (không có hoà).
// - Bộ ba (111, 222, … 666) → tổng 3 hoặc 18: nhà cái ăn cả 2 cửa.
//   Đây là khoản lợi DUY NHẤT của nhà cái: 6/216 = 2,78% số ván.
// - RNG chạy trên máy (Math.random) → chỉ để giải trí, không phải kết quả
//   casino/xổ số thật và không thể đổi token ra tiền.
//
// Tách riêng khỏi UI để test được bằng Node (không import react-native).

export const MIN_STAKE = 10;
export const MAX_STAKE = 500;
export const STAKE_STEP = 10;
export const STAKE_PRESETS = [10, 50, 100, 500];

export const SIDES = { TAI: 'TAI', XIU: 'XIU' };

export const SIDE_LABELS = { TAI: 'Tài', XIU: 'Xỉu' };
// Khoảng tổng điểm của từng cửa — dùng để hiện trên nút cược
export const SIDE_RANGES = { TAI: '11–17', XIU: '4–10' };

// 3 mặt ngẫu nhiên 1..6
export function rollDice(rng = Math.random) {
  return [0, 1, 2].map(() => 1 + Math.floor(rng() * 6));
}

export function totalOf(dice) {
  return dice.reduce((sum, value) => sum + value, 0);
}

export function isTriple(dice) {
  return dice[0] === dice[1] && dice[1] === dice[2];
}

// Kết quả 1 ván: side là cửa người chơi đã đặt ('TAI' | 'XIU')
export function evaluateTaiXiu(dice, side) {
  const total = totalOf(dice);
  const triple = isTriple(dice);
  const outcome = triple ? 'TRIPLE' : total >= 11 ? SIDES.TAI : SIDES.XIU;
  return { total, triple, outcome, win: !triple && outcome === side };
}

// Kết quả + tiền thắng/thua ròng (net > 0 là thắng)
export function settleTaiXiu(dice, side, stake) {
  const result = evaluateTaiXiu(dice, side);
  const amount = Math.max(0, Math.floor(Number(stake) || 0));
  return { ...result, stake: amount, net: result.win ? amount : -amount };
}

// Kẹp mức cược: bội số STAKE_STEP, trong [MIN_STAKE, MAX_STAKE] và ≤ số dư.
// Trả 0 khi số dư không đủ mức tối thiểu.
export function clampStake(value, balance) {
  const available = Math.max(0, Math.floor(Number(balance) || 0));
  const limit = Math.min(MAX_STAKE, available);
  if (limit < MIN_STAKE) return 0;
  const stepped = Math.round((Number(value) || 0) / STAKE_STEP) * STAKE_STEP;
  return Math.min(Math.max(stepped, MIN_STAKE), limit);
}
