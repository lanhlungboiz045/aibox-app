// screens/admin/AdminMarketsScreen.jsx — Quản lý market + resolve thủ công
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { formatTokenShort, formatDate, formatTimeLeft, formatRelativeTime } from '../../utils/format';

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
      (sum, account) => sum + account.positions.filter(p => p.marketId === market.id && p.side === outcome).length,
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
            const result = resolveMarket(market.id, outcome);
            if (!result.ok) Alert.alert('Không thể resolve', result.error);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Quản lý Markets</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(item => (
          <TouchableOpacity
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
                  {market.category.toUpperCase()} · {formatTokenShort(market.volume)} {'\u{1F4B0}'} volume · thanh khoản {formatTokenShort(market.liquidity || 0)}
                </Text>
                <Text style={[styles.meta, overdue && { color: '#FF6B6B' }]}>
                  {market.resolved
                    ? `Đã resolve ${market.outcome} · ${formatRelativeTime(market.resolvedAt)}`
                    : `Kết thúc ${formatDate(market.endDate)} (${formatTimeLeft(market.endDate)})`}
                </Text>
                {market.creatorName ? <Text style={styles.creator}>Tạo bởi {market.creatorName} · fee 2%</Text> : null}
              </View>
            </View>

            {!market.resolved ? (
              <View style={styles.resolveRow}>
                <TouchableOpacity style={[styles.resolveBtn, styles.resolveYes]} onPress={() => confirmResolve(market, 'YES')}>
                  <Text style={styles.resolveYesText}>Resolve YES</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.resolveBtn, styles.resolveNo]} onPress={() => confirmResolve(market, 'NO')}>
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
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#1A1D24', borderWidth: 1, borderColor: '#2A2E36' },
  filterChipActive: { backgroundColor: 'rgba(108, 92, 231, 0.15)', borderColor: '#6C5CE7' },
  filterText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  empty: { color: '#5C5C5C', fontSize: 13, textAlign: 'center', padding: 24 },
  card: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: '#2A2E36' },
  cardOverdue: { borderColor: 'rgba(255, 107, 107, 0.35)' },
  cardHead: { flexDirection: 'row', gap: 10 },
  icon: { fontSize: 22 },
  question: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', lineHeight: 19, marginBottom: 4 },
  meta: { color: '#8E8E93', fontSize: 11, lineHeight: 16 },
  creator: { color: '#FFB74D', fontSize: 10, marginTop: 2 },
  resolveRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#22262E' },
  resolveBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  resolveYes: { backgroundColor: 'rgba(0, 206, 126, 0.12)', borderColor: 'rgba(0, 206, 126, 0.4)' },
  resolveNo: { backgroundColor: 'rgba(255, 107, 107, 0.12)', borderColor: 'rgba(255, 107, 107, 0.4)' },
  resolveYesText: { color: '#00CE7E', fontSize: 13, fontWeight: '700' },
  resolveNoText: { color: '#FF6B6B', fontSize: 13, fontWeight: '700' },
  outcomeTag: { marginTop: 10, borderRadius: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1 },
  outcomeYes: { backgroundColor: 'rgba(0, 206, 126, 0.1)', borderColor: 'rgba(0, 206, 126, 0.3)' },
  outcomeNo: { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.3)' },
  outcomeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
