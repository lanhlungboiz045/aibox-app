// screens/UsageDashboardScreen.jsx — Thống kê usage AI (kiểu AI Box)
// Tổng hợp từ giao dịch AI_CALL của tài khoản hiện tại: token đã dùng, số request,
// model dùng nhiều nhất, breakdown theo model.
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { centeredContent, colors, touch } from '../theme/tokens';
import { AIProviderLogo } from '../components/AIProviderLogo';
import { AppHeader, Button, TokenIcon } from '../components/ui';

export function UsageDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const user = state.user;

  const aiTx = useMemo(() => (user?.transactions || []).filter(t => t.type === 'AI_CALL'), [user]);

  const totalTokens = useMemo(() => aiTx.reduce((s, t) => s + (t.amount ? -t.amount : 0), 0), [aiTx]);
  const totalRequests = aiTx.length;

  const byModel = useMemo(() => {
    const map = {};
    aiTx.forEach(t => {
      const key = t.modelId || 'unknown';
      if (!map[key]) map[key] = { modelId: key, count: 0, tokens: 0 };
      map[key].count += 1;
      map[key].tokens += t.amount ? -t.amount : 0;
    });
    return Object.values(map)
      .map(m => ({ ...m, model: state.aiModels.find(x => x.id === m.modelId) }))
      .sort((a, b) => b.tokens - a.tokens);
  }, [aiTx, state.aiModels]);

  const topModel = byModel[0];
  const maxTokens = byModel.length ? byModel[0].tokens : 1;

  const recent = aiTx.slice(0, 20);

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} title="Thống kê sử dụng" subtitle="Hoạt động AI của bạn" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Token đã dùng</Text>
            <Text style={styles.summaryValue}>{formatToken(totalTokens)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Lượt gọi AI</Text>
            <Text style={styles.summaryValue}>{totalRequests}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Model chính</Text>
            <Text style={styles.summaryValueSmall}>{topModel?.model?.name || '—'}</Text>
          </View>
        </View>

        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
          <View style={styles.balanceValueRow}>
            <Text style={styles.balanceValue}>{formatToken(user?.tokenBalance || 0)}</Text>
            <TokenIcon size={16} color={colors.warning} />
          </View>
          <Button label="Nạp thêm token" onPress={() => navigation.navigate('CreditsTopup')} />
        </View>

        {/* Breakdown by model */}
        <Text style={styles.sectionTitle}>Theo mô hình</Text>
        {byModel.length === 0 ? (
          <Text style={styles.empty}>Chưa có lượt gọi AI nào. Hãy thử chat trong AI Hub.</Text>
        ) : (
          byModel.map(m => (
            <View key={m.modelId} style={styles.modelRow}>
              <View style={styles.modelRowTop}>
                <View style={styles.modelNameRow}>
                  <AIProviderLogo provider={m.model?.provider} size={24} />
                  <Text style={styles.modelName}>{m.model?.name || m.modelId}</Text>
                </View>
                <Text style={styles.modelStat}>{m.count} lượt · {formatToken(m.tokens)} token</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(4, (m.tokens / maxTokens) * 100)}%`, backgroundColor: m.model?.accentColor || colors.accent }]} />
              </View>
            </View>
          ))
        )}

        {/* Recent calls */}
        <Text style={styles.sectionTitle}>Gần đây</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>—</Text>
        ) : (
          recent.map(t => (
            <View key={t.id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                <Text style={styles.txTime}>{new Date(t.timestamp).toLocaleString('vi-VN')}</Text>
              </View>
              <Text style={styles.txCost}>-{formatToken(t.amount ? -t.amount : 0)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { ...centeredContent, padding: 16, gap: 12, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, alignItems: 'center' },
  summaryLabel: { color: colors.textDim, fontSize: 12, marginBottom: 4 },
  summaryValue: { color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  summaryValueSmall: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  balanceCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, alignItems: 'center' },
  balanceLabel: { color: colors.textDim, fontSize: 12 },
  balanceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 10 },
  balanceValue: { color: colors.warning, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 8 },
  empty: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
  modelRow: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  modelRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  modelName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  modelStat: { color: colors.textDim, fontSize: 12, fontVariant: ['tabular-nums'] },
  barTrack: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, padding: 10, gap: 8 },
  txDesc: { color: colors.text, fontSize: 12 },
  txTime: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  txCost: { color: colors.danger, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
