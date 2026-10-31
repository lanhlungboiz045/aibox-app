// screens/UsageDashboardScreen.jsx — Thống kê sử dụng AI
// Tổng hợp từ store log gọi AI duy nhất (state.aiLogs): token đã dùng, lượt gọi,
// biểu đồ theo ngày (7/30 ngày) và phân bổ theo mô hình — khớp 100% với Home/Logs/Profile.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken, formatRelativeTime } from '../utils/format';
import { centeredContent, colors, radius, spacing, type } from '../theme/tokens';
import {
  logsForUser, summarizeAILogs, logModelName, logCost, logStatusLabel,
} from '../services/aiLogStore';
import { AIProviderLogo } from '../components/AIProviderLogo';
import {
  AppHeader, BarChart, Button, Chip, EmptyState, FadeIn, ListRow, SectionHeader, TokenIcon,
} from '../components/ui';

const RANGES = [
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
];

export function UsageDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const user = state.user;
  const [range, setRange] = useState('7d');

  const days = (RANGES.find(item => item.key === range) || RANGES[0]).days;

  const logs = useMemo(
    () => logsForUser(state.aiLogs, user?.id),
    [state.aiLogs, user?.id]
  );

  // Chỉ tính log nằm trong khoảng đang chọn (tính từ 00:00 ngày đầu tiên).
  const since = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
  }, [days]);

  const windowLogs = useMemo(
    () => logs.filter(log => new Date(log.timestamp).getTime() >= since),
    [logs, since]
  );

  const summary = useMemo(
    () => summarizeAILogs(windowLogs, { days, aiModels: state.aiModels }),
    [windowLogs, days, state.aiModels]
  );

  const totalTokens = summary.cost;
  const totalRequests = summary.requests;
  const byModel = summary.byModel;
  const topModel = byModel[0];
  const maxTokens = topModel && topModel.cost > 0 ? topModel.cost : 1;
  const maxDaily = summary.series.reduce((max, item) => Math.max(max, item.value), 0);
  const hasData = totalRequests > 0;

  const rangeLabel = `${days} ngày gần nhất`;

  return (
    <View style={styles.container}>
      <AppHeader
        navigation={navigation}
        title="Thống kê sử dụng"
        subtitle={hasData ? `${rangeLabel} · ${totalRequests} lượt gọi` : rangeLabel}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Chọn khoảng thời gian — áp dụng ngay cho toàn màn */}
        <View style={styles.rangeRow}>
          {RANGES.map(item => (
            <Chip
              key={item.key}
              label={item.label}
              active={range === item.key}
              onPress={() => setRange(item.key)}
            />
          ))}
        </View>

        {hasData ? (
          <>
            <FadeIn>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>Token đã dùng</Text>
                  <Text style={styles.summaryValue} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                    {formatToken(totalTokens)}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>Lượt gọi</Text>
                  <Text style={styles.summaryValue} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                    {totalRequests}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>Thành công</Text>
                  <Text style={styles.summaryValue} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                    {summary.successRate}%
                  </Text>
                </View>
              </View>
            </FadeIn>

            {/* Biểu đồ cột theo ngày */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.6}>Token theo ngày</Text>
                <Text style={styles.cardSub} maxFontSizeMultiplier={1.5}>
                  {maxDaily > 0 ? `Cao nhất ${formatToken(maxDaily)} token/ngày` : 'Chưa có token nào được dùng'}
                </Text>
              </View>
              <BarChart data={summary.series} formatValue={formatToken} height={132} />
            </View>

            {/* Số dư — cùng nguồn với mọi màn khác */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel} maxFontSizeMultiplier={1.5}>Số dư hiện tại</Text>
              <View style={styles.balanceValueRow}>
                <Text style={styles.balanceValue} maxFontSizeMultiplier={1.4}>
                  {formatToken(user?.tokenBalance || 0)}
                </Text>
                <TokenIcon size={16} color={colors.warning} />
              </View>
              <Button
                label="Nạp thêm token"
                icon="plus-circle"
                variant="secondary"
                onPress={() => navigation.navigate('CreditsTopup')}
              />
            </View>

            {/* Phân bổ theo mô hình */}
            <View>
              <SectionHeader title="Phân bổ theo mô hình" />
              <View style={styles.card}>
                {byModel.map((m, index) => (
                  <View key={m.modelId}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.modelRow}>
                      <View style={styles.modelRowTop}>
                        <View style={styles.modelNameRow}>
                          <AIProviderLogo provider={m.model?.provider} size={24} />
                          <Text style={styles.modelName} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                            {m.model?.name || m.modelName || m.modelId}
                          </Text>
                        </View>
                        <Text style={styles.modelStat} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                          {m.count} lượt · {formatToken(m.cost)} token
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.max(4, (m.cost / maxTokens) * 100)}%`,
                              backgroundColor: m.model?.accentColor || colors.accent,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Lượt gọi gần đây — bấm để mở lịch sử đầy đủ */}
            <View>
              <SectionHeader
                title="Lượt gọi gần đây"
                actionLabel="Xem tất cả"
                onAction={() => navigation.navigate('Logs')}
              />
              <View style={styles.card}>
                {summary.recent.slice(0, 3).map((log, index) => {
                  const success = log.status === 'success';
                  const cost = logCost(log);
                  return (
                    <View key={log.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <ListRow
                        icon={success ? 'zap' : log.status === 'canceled' ? 'square' : 'alert-triangle'}
                        iconColor={success ? colors.accentSoft : log.status === 'canceled' ? colors.textDim : colors.danger}
                        title={logModelName(log, state.aiModels)}
                        subtitle={`${formatRelativeTime(log.timestamp)} · ${logStatusLabel(log.status)} · ${formatToken(cost)} token`}
                        right={<Text style={styles.rowAmount}>{success ? `-${formatToken(cost)}` : '0'}</Text>}
                        chevron={false}
                        onPress={() => navigation.navigate('Logs')}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <>
            <EmptyState
              icon="bar-chart-2"
              title={`Chưa có lượt gọi AI nào trong ${days} ngày`}
              message="Bắt đầu trò chuyện để xem token theo ngày và phân bổ theo mô hình tại đây."
              actionLabel="Hỏi AI câu đầu tiên"
              onAction={() => navigation.navigate('AIHub')}
            />

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel} maxFontSizeMultiplier={1.5}>Số dư hiện tại</Text>
              <View style={styles.balanceValueRow}>
                <Text style={styles.balanceValue} maxFontSizeMultiplier={1.4}>
                  {formatToken(user?.tokenBalance || 0)}
                </Text>
                <TokenIcon size={16} color={colors.warning} />
              </View>
              <Button
                label="Nạp thêm token"
                icon="plus-circle"
                variant="secondary"
                onPress={() => navigation.navigate('CreditsTopup')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    ...centeredContent,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: { ...type.small, color: colors.textDim, textAlign: 'center' },
  summaryValue: { ...type.subtitle, ...type.numeric, color: colors.text, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  cardHeader: { gap: 2, marginBottom: spacing.sm },
  cardTitle: { ...type.subtitle, color: colors.text, fontWeight: '700' },
  cardSub: { ...type.small, color: colors.textFaint },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  balanceLabel: { ...type.small, color: colors.textDim },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  balanceValue: { ...type.h1, color: colors.warning, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  modelRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  modelRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  modelNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  modelName: { ...type.bodyStrong, color: colors.text, flex: 1 },
  modelStat: { ...type.small, ...type.numeric, color: colors.textDim, flexShrink: 0 },
  barTrack: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  rowAmount: { ...type.smallStrong, ...type.numeric, color: colors.textDim },
});
