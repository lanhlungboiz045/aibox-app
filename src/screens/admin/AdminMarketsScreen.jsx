// screens/admin/AdminMarketsScreen.jsx — Quản lý market + resolve thủ công
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { formatTokenShort, formatDate, formatTimeLeft, formatRelativeTime } from '../../utils/format';
import { colors, centeredContent, touch } from '../../theme/tokens';

const FILTERS = [
  { key: 'open', label: 'Đang mở' },
  { key: 'overdue', label: 'Quá hạn' },
  { key: 'resolved', label: 'Đã resolve' },
  { key: 'all', label: 'Tất cả' },
];

export function AdminMarketsScreen({ navigation }) {
  const { state, resolveMarket } = useApp();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('open');

  const now = Date.now();
  const markets = state.markets.filter(market => {
    if (filter === 'open') return !market.resolved;
    if (filter === 'overdue') return !market.resolved && new Date(market.endDate).getTime() < now;
    if (filter === 'resolved') return market.resolved;
    return true;
  });

  const confirmResolve = (market, outcome) => {
    const winners = state.accounts.reduce(
      (sum, account) => sum + (account.positions || []).filter(p => p.marketId === market.id && p.side === outcome).length,
      0
    );
    Alert.alert(
      'Xác nhận kết quả',
      `"${market.question}"\n\nKết quả: ${outcome}\n${winners} vị thế thắng sẽ được trả thưởng từ liquidity.\n\nHành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: `Resolve ${outcome}`,
          style: 'destructive',
          onPress: () => {
            try {
              const result = resolveMarket(market.id, outcome);
              if (!result.ok) Alert.alert('Không thể resolve', result.error || 'Kết quả chưa được lưu.');
            } catch (error) {
              Alert.alert(
                'Không thể resolve',
                error instanceof Error ? error.message : 'Đã xảy ra lỗi khi chốt market.',
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Quản lý Markets</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(item => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.key }}
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {markets.length === 0 && <Text style={styles.empty}>Không có market nào ở mục này.</Text>}

      {markets.map(market => {
        const overdue = !market.resolved && new Date(market.endDate).getTime() < now;
        return (
          <View key={market.id} style={[styles.card, overdue && styles.cardOverdue]}>
            <View style={styles.cardHead}>
              <Text style={styles.icon}>{market.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.question}>{market.question}</Text>
                <Text style={styles.meta}>
                  {(market.category || 'OTHER').toUpperCase()} · {formatTokenShort(market.volume)} {'\u{1F4B0}'} volume · thanh khoản {formatTokenShort(market.liquidity || 0)}
                </Text>
                <Text style={[styles.meta, overdue && { color: colors.danger }]}>
                  {market.resolved
                    ? `Đã resolve ${market.outcome} · ${formatRelativeTime(market.resolvedAt)}`
                    : `Kết thúc ${formatDate(market.endDate)} (${formatTimeLeft(market.endDate)})`}
                </Text>
                {market.creatorName ? <Text style={styles.creator}>Tạo bởi {market.creatorName} · fee 2%</Text> : null}
              </View>
            </View>

            {!market.resolved ? (
              <View style={styles.resolveRow}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Chốt ${market.question} là YES`} style={[styles.resolveBtn, styles.resolveYes]} onPress={() => confirmResolve(market, 'YES')}>
                  <Text style={styles.resolveYesText}>Resolve YES</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Chốt ${market.question} là NO`} style={[styles.resolveBtn, styles.resolveNo]} onPress={() => confirmResolve(market, 'NO')}>
                  <Text style={styles.resolveNoText}>Resolve NO</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.outcomeTag, market.outcome === 'YES' ? styles.outcomeYes : styles.outcomeNo]}>
                <Text style={styles.outcomeText}>Kết quả cuối: {market.outcome}</Text>
              </View>
            )}
          </View>
        );
      })}

      <Text style={styles.footnote}>
        Trong hệ thống thật, resolve phải là API admin-only, có escrow + audit log và chống payout 2 lần.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minWidth: 50, minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: touch.gap, paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { flex: 1, minHeight: touch.min, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft },
  filterChipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  filterText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.accentSoft },
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  cardOverdue: { borderColor: colors.dangerBorder },
  cardHead: { flexDirection: 'row', gap: 10 },
  icon: { fontSize: 22 },
  question: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 19, marginBottom: 4 },
  meta: { color: colors.textDim, fontSize: 12, lineHeight: 16 },
  creator: { color: colors.warning, fontSize: 12, marginTop: 2 },
  resolveRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  resolveBtn: { flex: 1, minHeight: touch.min, justifyContent: 'center', borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  resolveYes: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  resolveNo: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  resolveYesText: { color: colors.success, fontSize: 13, fontWeight: '700' },
  resolveNoText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  outcomeTag: { marginTop: 10, borderRadius: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1 },
  outcomeYes: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  outcomeNo: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  outcomeText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
