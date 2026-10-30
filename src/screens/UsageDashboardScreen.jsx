// screens/UsageDashboardScreen.jsx — Thống kê usage AI (kiểu AI Box)
// Tổng hợp từ giao dịch AI_CALL của tài khoản hiện tại: token đã dùng, số request,
// model dùng nhiều nhất, breakdown theo model.
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { colors, touch } from '../theme/tokens';

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'\u{276C}'} Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Usage Dashboard</Text>
        <Text style={styles.sub}>Thống kê sử dụng AI của bạn</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Token đã dùng</Text>
            <Text style={styles.summaryValue}>{formatToken(totalTokens)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Số request</Text>
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
          <Text style={styles.balanceValue}>{formatToken(user?.tokenBalance || 0)} token</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.topupBtn} onPress={() => navigation.navigate('CreditsTopup')}>
            <Text style={styles.topupBtnText}>Nạp thêm token</Text>
          </TouchableOpacity>
        </View>

        {/* Breakdown by model */}
        <Text style={styles.sectionTitle}>Theo mô hình</Text>
        {byModel.length === 0 ? (
          <Text style={styles.empty}>Chưa có lượt gọi AI nào. Hãy thử chat trong AI Hub.</Text>
        ) : (
          byModel.map(m => (
            <View key={m.modelId} style={styles.modelRow}>
              <View style={styles.modelRowTop}>
                <Text style={styles.modelName}>{m.model?.icon || '🤖'} {m.model?.name || m.modelId}</Text>
                <Text style={styles.modelStat}>{m.count} req · {formatToken(m.tokens)} token</Text>
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
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { color: colors.accentSoft, fontSize: 13, fontWeight: '600' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  content: { ...centeredContent, padding: 16, gap: 12, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, alignItems: 'center' },
  summaryLabel: { color: colors.textDim, fontSize: 12, marginBottom: 4 },
  summaryValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  summaryValueSmall: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  balanceCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, alignItems: 'center' },
  balanceLabel: { color: colors.textDim, fontSize: 12 },
  balanceValue: { color: colors.warning, fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 10 },
  topupBtn: { backgroundColor: colors.accentStrong, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, minHeight: touch.min },
  topupBtnText: { color: colors.onAccent, fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 8 },
  empty: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
  modelRow: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  modelRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modelName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  modelStat: { color: colors.textDim, fontSize: 12 },
  barTrack: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, padding: 10, gap: 8 },
  txDesc: { color: colors.text, fontSize: 12 },
  txTime: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  txCost: { color: colors.danger, fontSize: 12, fontWeight: '700' },
});
