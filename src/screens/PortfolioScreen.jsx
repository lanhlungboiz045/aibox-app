// screens/PortfolioScreen.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TokenBadge } from '../components/TokenBadge';
import { TransactionItem } from '../components/TransactionItem';
import { formatToken } from '../utils/format';
import { colors, centeredContent } from '../theme/tokens';

export function PortfolioScreen() {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const [txFilter, setTxFilter] = useState('all');

  const txFilters = [
    { key: 'all', label: 'Tất cả' }, { key: 'ai', label: 'AI' },
    { key: 'market', label: 'Market' }, { key: 'transfer', label: 'Transfer' },
  ];

  const positionsWithMarket = state.user.positions.map(p => {
    const market = state.markets.find(m => m.id === p.marketId);
    const currentPrice = market ? (p.side === 'YES' ? market.yesPrice : market.noPrice) : 0;
    const currentValue = p.shares * currentPrice;
    const pnl = currentValue - p.invested;
    return { ...p, market, currentPrice, currentValue, pnl };
  });

  const portfolioValue = positionsWithMarket.reduce((sum, p) => sum + p.currentValue, 0);
  const totalInvested = positionsWithMarket.reduce((sum, p) => sum + p.invested, 0);
  const totalPnL = portfolioValue - totalInvested;

  const filteredTxs = state.user.transactions.filter(tx => {
    if (txFilter === 'all') return true;
    if (txFilter === 'ai') return tx.type === 'AI_CALL';
    if (txFilter === 'market') return ['BUY', 'SELL', 'RESOLVE'].includes(tx.type);
    if (txFilter === 'transfer') return ['TRANSFER_OUT', 'TRANSFER_IN'].includes(tx.type);
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      // Tab bar bên dưới đã tự chừa insets.bottom → chỉ cần chừa status bar ở trên
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: 20 }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <TokenBadge size="medium" />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}><Text style={styles.statLabel}>Token balance</Text><Text style={styles.statValue}>{formatToken(state.user.tokenBalance)} {'\u{1F4B0}'}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Portfolio value</Text><Text style={styles.statValue}>{formatToken(Math.round(portfolioValue))} {'\u{1F4B0}'}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Total P&L</Text><Text style={[styles.statValue, { color: totalPnL >= 0 ? colors.success : colors.danger }]}>{totalPnL >= 0 ? '+' : ''}{formatToken(Math.round(totalPnL))} {'\u{1F4B0}'}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Spent on AI</Text><Text style={[styles.statValue, { color: colors.danger }]}>{formatToken(state.user.totalSpentOnAI)} {'\u{1F4B0}'}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F4BC}'} Positions ({state.user.positions.length})</Text>
        {positionsWithMarket.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{'\u{1F4BC}'}</Text>
            <Text style={styles.emptyText}>Bạn chưa có position nào.</Text>
            <Text style={styles.emptySub}>Khám phá markets và đặt cược ngay!</Text>
          </View>
        ) : (
          <View style={styles.positionsList}>
            {positionsWithMarket.map((p) => (
              <View key={`${p.marketId}-${p.side}`} style={styles.positionCard}>
                <View style={styles.positionTop}>
                  <Text style={styles.positionQuestion} numberOfLines={2}>{p.market?.question || 'Unknown'}</Text>
                  <View style={[styles.positionSideTag, p.side === 'YES' ? styles.tagYes : styles.tagNo]}><Text style={styles.tagText}>{p.side}</Text></View>
                </View>
                <View style={styles.positionStats}>
                  <View style={styles.posStat}><Text style={styles.posStatLabel}>Shares</Text><Text style={styles.posStatValue}>{p.shares}</Text></View>
                  <View style={styles.posStat}><Text style={styles.posStatLabel}>Avg price</Text><Text style={styles.posStatValue}>{p.avgPrice.toFixed(1)}</Text></View>
                  <View style={styles.posStat}><Text style={styles.posStatLabel}>Current</Text><Text style={styles.posStatValue}>{p.currentPrice.toFixed(1)}</Text></View>
                  <View style={styles.posStat}><Text style={styles.posStatLabel}>P&L</Text><Text style={[styles.posStatValue, { color: p.pnl >= 0 ? colors.success : colors.danger }]}>{p.pnl >= 0 ? '+' : ''}{formatToken(Math.round(p.pnl))}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F4DD}'} Lịch sử giao dịch</Text>
        <View style={styles.txFilterRow}>
          {txFilters.map(f => (
            <View key={f.key} style={[styles.txFilterChip, txFilter === f.key && styles.txFilterChipActive]}>
              <Text style={[styles.txFilterText, txFilter === f.key && styles.txFilterTextActive]} onPress={() => setTxFilter(f.key)}>{f.label}</Text>
            </View>
          ))}
        </View>
        {filteredTxs.length === 0 ? (
          <Text style={styles.emptyTextSmall}>Chưa có giao dịch nào</Text>
        ) : (
          <View style={styles.txList}>
            {filteredTxs.slice(0, 50).map(tx => <TransactionItem key={tx.id} tx={tx} />)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  statLabel: { color: colors.textDim, fontSize: 12, marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  section: { marginBottom: 16 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  emptyBox: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: colors.textDim, fontSize: 14 },
  emptySub: { color: colors.textFaint, fontSize: 12, marginTop: 4 },
  positionsList: { paddingHorizontal: 16, gap: 8 },
  positionCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  positionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  positionQuestion: { color: colors.text, fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
  positionSideTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagYes: { backgroundColor: colors.successDim },
  tagNo: { backgroundColor: colors.dangerDim },
  tagText: { fontSize: 12, fontWeight: '700' },
  positionStats: { flexDirection: 'row', gap: 12 },
  posStat: { flex: 1 },
  posStatLabel: { color: colors.textFaint, fontSize: 12 },
  posStatValue: { color: colors.text, fontSize: 13, fontWeight: '600', fontFamily: 'monospace', marginTop: 2 },
  txFilterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  txFilterChip: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSoft },
  txFilterChipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  txFilterText: { color: colors.textDim, fontSize: 12 },
  txFilterTextActive: { color: colors.accentSoft, fontWeight: '600' },
  txList: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
  emptyTextSmall: { color: colors.textFaint, fontSize: 13, textAlign: 'center', padding: 16 },
});
