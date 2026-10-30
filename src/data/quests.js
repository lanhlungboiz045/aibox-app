// data/quests.js — Nhiệm vụ ngày (gamification quanh Daily Reward)
import { toDayKey } from '../utils/format';

// metric khớp với counters trong quest state của từng user
export const QUESTS = [
  { id: 'q_ai', title: 'Chat với AI 3 lần', metric: 'aiCalls', target: 3, reward: 500, icon: 'message-square' },
  { id: 'q_taixiu', title: 'Chơi Tài Xỉu 2 ván', metric: 'taiXiuRounds', target: 2, reward: 500, icon: 'zap' },
  { id: 'q_transfer', title: 'Chuyển token cho bạn', metric: 'transfers', target: 1, reward: 200, icon: 'send' },
];

export const QUEST_TOTAL_REWARD = QUESTS.reduce((sum, quest) => sum + quest.reward, 0);

export function createEmptyCounters() {
  return { aiCalls: 0, taiXiuRounds: 0, transfers: 0 };
}

export function createQuestState(dayKey = toDayKey()) {
  return { dayKey, counters: createEmptyCounters(), claimed: [] };
}

// Reset tiến trình khi sang ngày mới
export function ensureQuestState(questState, dayKey = toDayKey()) {
  if (!questState || questState.dayKey !== dayKey) return createQuestState(dayKey);
  return questState;
}

export function getQuestProgress(questState, quest) {
  const current = questState?.counters?.[quest.metric] || 0;
  return Math.min(current, quest.target);
}
