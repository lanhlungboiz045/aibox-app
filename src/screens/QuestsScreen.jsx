// screens/QuestsScreen.jsx — Nhiệm vụ ngày + daily reward (gamification)
import React from 'react';
import { BackButton } from '../components/ui/BackButton';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { QUESTS, getQuestProgress, QUEST_TOTAL_REWARD } from '../data/quests';
import { formatToken } from '../utils/format';
import { AppIcon } from '../components/ui/AppIcon';
import { colors, centeredContent, touch } from '../theme/tokens';

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
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Nhiệm vụ ngày</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakHead}>
          <AppIcon name="zap" size={22} color={colors.warning} />
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
          accessibilityRole="button"
          style={[styles.dailyBtn, !canClaimDaily && styles.dailyBtnDone]}
          onPress={claimDailyReward}
          disabled={!canClaimDaily}
        >
          <Text style={[styles.dailyBtnText, !canClaimDaily && { color: colors.textDim }]}>
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
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{formatToken(QUEST_TOTAL_REWARD)}</Text>
          <Text style={styles.summaryLabel}>Tối đa mỗi ngày</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{formatToken(earnedFromQuests)}</Text>
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
                <AppIcon name={quest.icon} size={18} color={colors.textDim} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.questTitle}>{quest.title}</Text>
                  <Text style={styles.questProgressText}>{progress}/{quest.target} · thưởng {formatToken(quest.reward)} token</Text>
                </View>
                {claimed ? (
                  <View style={styles.claimedTagWrap}><AppIcon name="check-circle" size={14} color={colors.success} /><Text style={styles.claimedTag}>Đã nhận</Text></View>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.claimBtn, !done && styles.claimBtnDisabled]}
                    onPress={() => claimQuest(quest.id)}
                    disabled={!done}
                  >
                    <Text style={[styles.claimText, !done && styles.claimTextDisabled]}>{done ? 'Nhận' : 'Chưa đủ'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }, claimed && { backgroundColor: colors.success }]} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>
          <AppIcon name="zap" size={14} color={colors.accentSoft} /> Cách hoàn thành nhanh
        </Text>
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
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minWidth: 50, minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  streakCard: { marginHorizontal: 16, backgroundColor: colors.warningDim, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.warningBorder },
  streakHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  streakTitle: { color: colors.warning, fontSize: 16, fontWeight: '700' },
  streakSub: { color: colors.textDim, fontSize: 12, marginTop: 3, lineHeight: 16 },
  dailyBtn: { backgroundColor: colors.warningBg, borderRadius: 8, paddingVertical: 11, alignItems: 'center', minHeight: touch.min },
  dailyBtnDone: { backgroundColor: colors.surfaceAlt },
  dailyBtnText: { color: colors.bg, fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  summaryLabel: { color: colors.textDim, fontSize: 12, marginTop: 3, textAlign: 'center' },
  list: { marginTop: 16, paddingHorizontal: 16 },
  questCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 8 },
  questCardDone: { borderColor: colors.successBorder },
  questHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  questProgressText: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  claimBtn: { backgroundColor: colors.accentStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, minHeight: touch.min },
  claimBtnDisabled: { backgroundColor: colors.surfaceAlt },
  claimText: { color: colors.onAccent, fontSize: 12, fontWeight: '700' },
  claimTextDisabled: { color: colors.textFaint },
  claimedTagWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  claimedTag: { color: colors.success, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.accentStrong },
  tip: { marginHorizontal: 16, marginTop: 8, backgroundColor: colors.accentDim, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.accentDim },
  tipTitle: { color: colors.accentSoft, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  tipText: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 12 },
});
