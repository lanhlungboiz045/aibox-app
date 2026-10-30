// screens/QuestsScreen.jsx — Nhiệm vụ ngày + daily reward (gamification)
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { QUESTS, getQuestProgress, QUEST_TOTAL_REWARD } from '../data/quests';
import { formatToken } from '../utils/format';
import { AppIcon } from '../components/ui/AppIcon';
import { AppHeader, Button } from '../components/ui';
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
      stickyHeaderIndices={[0]}
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 24 }]}
    >
      <AppHeader navigation={navigation} title="Nhiệm vụ ngày" />

      <View style={styles.streakCard}>
        <View style={styles.streakHead}>
          <AppIcon name="zap" size={22} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Chuỗi {user.dailyStreak} ngày</Text>
            <Text style={styles.streakSub}>
              {canClaimDaily
                ? `Hôm nay nhận ${formatToken(nextDailyReward)} token · chuỗi sẽ là ${nextStreak} ngày`
                : `Đã nhận hôm nay · mai quay lại để giữ chuỗi ${user.dailyStreak} ngày`}
            </Text>
          </View>
        </View>
        <Button
          label={canClaimDaily ? `Nhận ${formatToken(nextDailyReward)} token` : 'Đã nhận hôm nay'}
          variant={canClaimDaily ? 'primary' : 'disabled'}
          disabled={!canClaimDaily}
          fullWidth
          onPress={claimDailyReward}
        />
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
                  <Button
                    label={done ? 'Nhận' : 'Chưa đủ'}
                    variant={done ? 'primary' : 'disabled'}
                    disabled={!done}
                    size="sm"
                    onPress={() => claimQuest(quest.id)}
                  />
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
          · Chơi Tài Xỉu 2 ván{'\n'}
          · Chuyển token cho một tài khoản khác trên thiết bị
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  streakCard: { marginHorizontal: 16, backgroundColor: colors.warningDim, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.warningBorder },
  streakHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  streakTitle: { color: colors.warning, fontSize: 16, fontWeight: '700' },
  streakSub: { color: colors.textDim, fontSize: 12, marginTop: 3, lineHeight: 16 },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryLabel: { color: colors.textDim, fontSize: 12, marginTop: 3, textAlign: 'center' },
  list: { marginTop: 16, paddingHorizontal: 16 },
  questCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 8 },
  questCardDone: { borderColor: colors.successBorder },
  questHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  questProgressText: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  claimedTagWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  claimedTag: { color: colors.success, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.accentStrong },
  tip: { marginHorizontal: 16, marginTop: 8, backgroundColor: colors.accentDim, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.accentDim },
  tipTitle: { color: colors.accentSoft, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  tipText: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
});
