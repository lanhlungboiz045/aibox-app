// screens/QuestsScreen.jsx — Nhiệm vụ ngày + daily reward (gamification)
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { QUESTS, getQuestProgress, QUEST_TOTAL_REWARD } from '../data/quests';
import { formatToken } from '../utils/format';

export function QuestsScreen({ navigation }) {
  const {
    state, questState, canClaimDaily, nextDailyReward, nextStreak,
    claimDailyReward, claimQuest,
  } = useApp();
  const insets = useSafeAreaInsets();
  const user = state.user;

  const claimedCount = questState?.claimed?.length || 0;
  const earnedFromQuests = user.transactions
    .filter(tx => tx.type === 'QUEST_REWARD')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>{'\u{1F3AF}'} Nhiệm vụ ngày</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakHead}>
          <Text style={styles.streakIcon}>{'\u{1F525}'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Streak {user.dailyStreak} ngày</Text>
            <Text style={styles.streakSub}>
              {canClaimDaily
                ? `Hôm nay nhận ${formatToken(nextDailyReward)} token · streak sẽ là ${nextStreak} ngày`
                : `Đã nhận hôm nay · mai quay lại để giữ streak ${user.dailyStreak} ngày`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.dailyBtn, !canClaimDaily && styles.dailyBtnDone]}
          onPress={claimDailyReward}
          disabled={!canClaimDaily}
        >
          <Text style={[styles.dailyBtnText, !canClaimDaily && { color: '#8E8E93' }]}>
            {canClaimDaily ? `Nhận ${formatToken(nextDailyReward)} \u{1F4B0}` : '\u{2713} Đã nhận hôm nay'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{claimedCount}/{QUESTS.length}</Text>
          <Text style={styles.summaryLabel}>Nhiệm vụ đã nhận</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#FFB74D' }]}>{formatToken(QUEST_TOTAL_REWARD)}</Text>
          <Text style={styles.summaryLabel}>Tối đa mỗi ngày</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#00CE7E' }]}>{formatToken(earnedFromQuests)}</Text>
          <Text style={styles.summaryLabel}>Đã kiếm từ quest</Text>
        </View>
      </View>

      <View style={styles.list}>
        {QUESTS.map(quest => {
          const progress = questState ? getQuestProgress(questState, quest) : 0;
          const done = progress >= quest.target;
          const claimed = questState?.claimed?.includes(quest.id);
          const percent = Math.min(100, Math.round((progress / quest.target) * 100));

          return (
            <View key={quest.id} style={[styles.questCard, claimed && styles.questCardDone]}>
              <View style={styles.questHead}>
                <Text style={styles.questIcon}>{quest.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questTitle}>{quest.title}</Text>
                  <Text style={styles.questProgressText}>{progress}/{quest.target} · thưởng {formatToken(quest.reward)} {'\u{1F4B0}'}</Text>
                </View>
                {claimed ? (
                  <Text style={styles.claimedTag}>{'\u{2713}'} Đã nhận</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.claimBtn, !done && styles.claimBtnDisabled]}
                    onPress={() => claimQuest(quest.id)}
                    disabled={!done}
                  >
                    <Text style={styles.claimText}>{done ? 'Nhận' : 'Chưa đủ'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }, claimed && { backgroundColor: '#00CE7E' }]} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>{'\u{1F4A1}'} Cách hoàn thành nhanh</Text>
        <Text style={styles.tipText}>
          · Chat AI 3 lần ở tab AI Hub{'\n'}
          · Mua shares ở 2 market khác nhau{'\n'}
          · Bình luận 1 kèo bất kỳ{'\n'}
          · Chuyển token cho 1 người trong danh sách
        </Text>
      </View>

      <Text style={styles.footnote}>
        Quest reset theo ngày local. Hệ thống thật phải đếm ở server để tránh sửa counter trong máy.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  streakCard: { marginHorizontal: 16, backgroundColor: 'rgba(255, 183, 77, 0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.3)' },
  streakHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  streakIcon: { fontSize: 30 },
  streakTitle: { color: '#FFB74D', fontSize: 16, fontWeight: '700' },
  streakSub: { color: '#8E8E93', fontSize: 11, marginTop: 3, lineHeight: 16 },
  dailyBtn: { backgroundColor: '#FFB74D', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  dailyBtnDone: { backgroundColor: '#22262E' },
  dailyBtnText: { color: '#0F1115', fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  summaryCard: { flex: 1, backgroundColor: '#1A1D24', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  summaryValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  summaryLabel: { color: '#8E8E93', fontSize: 9, marginTop: 3, textAlign: 'center' },
  list: { marginTop: 16, paddingHorizontal: 16 },
  questCard: { backgroundColor: '#1A1D24', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2E36', marginBottom: 8 },
  questCardDone: { borderColor: 'rgba(0, 206, 126, 0.3)' },
  questHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questIcon: { fontSize: 22 },
  questTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  questProgressText: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  claimBtn: { backgroundColor: '#6C5CE7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  claimBtnDisabled: { backgroundColor: '#22262E' },
  claimText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  claimedTag: { color: '#00CE7E', fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#22262E', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: '#6C5CE7' },
  tip: { marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(108, 92, 231, 0.08)', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: 'rgba(108, 92, 231, 0.25)' },
  tipTitle: { color: '#A78BFA', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  tipText: { color: '#8E8E93', fontSize: 11, lineHeight: 18 },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 12 },
});
