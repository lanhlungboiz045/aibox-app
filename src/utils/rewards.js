// utils/rewards.js — công thức thưởng hàng ngày, chỉ định nghĩa ở 1 nơi
export const DAILY_REWARD_BASE = 2000;
export const DAILY_REWARD_STREAK_BONUS = 1000;
export const DAILY_REWARD_BONUS_AT_STREAK = 7;

// streak: số ngày streak sau khi nhận thưởng hôm nay
export function getDailyReward(streak) {
  return DAILY_REWARD_BASE + (streak >= DAILY_REWARD_BONUS_AT_STREAK ? DAILY_REWARD_STREAK_BONUS : 0);
}
