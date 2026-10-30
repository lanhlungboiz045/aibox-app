// utils/taiXiu.js — Luật game Tài xỉu (Sic Bo rút gọn, 3 xúc xắc) cho token nội bộ
//
// Luật công khai, không có gì ẩn:
// - 3 xúc xắc 1..6 → tổng 3..18.
// - Tổng 4..10 = XỈU, tổng 11..17 = TÀI.
// - Đúng cửa: lãi 0,96× cược; sai cửa: mất cược.
// - Bộ ba (111, 222, … 666) trả lãi 2× cược, bất kể cửa đã chọn.
//   Có 6/216 bộ ba (2,78%); kết hợp mức trả thường tạo lợi thế kỳ vọng cho người chơi.
// - RNG chạy trên máy (Math.random) → chỉ để giải trí, không phải kết quả
//   casino/xổ số thật và không thể đổi token ra tiền.
//
// Tách riêng khỏi UI để test được bằng Node (không import react-native).

// Mức cược tối thiểu 100 token; không có trần cố định, nhưng không vượt số dư.
export const MIN_STAKE = 100;
export const STAKE_PRESETS = [100, 500, 1000, 5000];
const MAX_SAFE_STAKE = Math.floor(Number.MAX_SAFE_INTEGER / 2);

export const SIDES = { TAI: 'TAI', XIU: 'XIU' };

export const SIDE_LABELS = { TAI: 'Tài', XIU: 'Xỉu' };
// Khoảng tổng điểm của từng cửa — dùng để hiện trên nút cược
export const SIDE_RANGES = { TAI: '11–17', XIU: '4–10' };

export function getStakePayouts(stake) {
  const amount = Number.isSafeInteger(stake) && stake >= 0 && stake <= MAX_SAFE_STAKE ? stake : 0;
  const quarterUnits = Math.floor(amount / 25);
  const remainder = amount % 25;
  return {
    sideWin: quarterUnits * 24 + Math.floor((remainder * 24) / 25),
    tripleWin: amount * 2,
  };
}

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
  return { total, triple, outcome, win: triple || outcome === side };
}

// Kết quả + tiền thắng/thua ròng (net > 0 là thắng)
export function settleTaiXiu(dice, side, stake) {
  const result = evaluateTaiXiu(dice, side);
  const parsedStake = Number(stake);
  const amount = Number.isSafeInteger(parsedStake) && parsedStake >= 0 && parsedStake <= MAX_SAFE_STAKE
    ? parsedStake
    : 0;
  const payouts = getStakePayouts(amount);
  const net = result.triple
    ? payouts.tripleWin
    : result.win ? payouts.sideWin : -amount;
  return { ...result, ...payouts, stake: amount, net };
}

// Giữ số dư sau khoản thưởng bộ ba trong miền số nguyên an toàn.
export function maxStakeForBalance(balance) {
  const available = Number(balance);
  if (!Number.isSafeInteger(available) || available < MIN_STAKE) return 0;
  const triplePayoutLimit = Math.floor((Number.MAX_SAFE_INTEGER - available) / 2);
  const maximum = Math.min(available, triplePayoutLimit);
  return maximum >= MIN_STAKE ? maximum : 0;
}

export function getValidStake(value, balance) {
  const amount = Number(value);
  const maximum = maxStakeForBalance(balance);
  if (!Number.isSafeInteger(amount) || amount < MIN_STAKE || amount > maximum) return 0;
  return amount;
}
