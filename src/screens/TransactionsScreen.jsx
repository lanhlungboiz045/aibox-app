// screens/TransactionsScreen.jsx — Wallet transaction history
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TransactionItem } from '../components/TransactionItem';
import { formatToken } from '../utils/format';
import { AppDrawer } from '../components/AppDrawer';
import { AppHeader, TokenIcon } from '../components/ui';
import { AppIcon } from '../components/ui/AppIcon';
import { useAppDrawer } from '../hooks/useAppDrawer';
import { colors, centeredContent } from '../theme/tokens';

export function TransactionsScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const { open: openDrawer, drawerProps } = useAppDrawer();
  const [txFilter, setTxFilter] = useState('all');

  const txFilters = [
    { key: 'all', label: 'Tất cả' }, { key: 'ai', label: 'AI' },
    { key: 'transfer', label: 'Chuyển token' }, { key: 'game', label: 'Tài Xỉu' },
  ];
  const aiCalls = state.user.transactions.filter(tx => tx.type === 'AI_CALL').length;
  const gamesPlayed = state.user.transactions.filter(tx => tx.type === 'TAIXIU').length;
  const transfers = state.user.transactions.filter(tx => tx.type === 'TRANSFER_OUT').length;

  const filteredTxs = state.user.transactions.filter(tx => {
    if (txFilter === 'all') return true;
    if (txFilter === 'ai') return tx.type === 'AI_CALL';
    if (txFilter === 'transfer') return ['TRANSFER_OUT', 'TRANSFER_IN'].includes(tx.type);
    if (txFilter === 'game') return tx.type === 'TAIXIU';
    return true;
  });

  return (
    <View style={styles.root}>
      <AppHeader navigation={navigation} title="Lịch sử giao dịch" isRoot onMenu={openDrawer} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Số dư token</Text>
            <View style={styles.statValueRow}><Text style={styles.statValue}>{formatToken(state.user.tokenBalance)}</Text><TokenIcon size={14} /></View>
          </View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Lượt gọi AI</Text><Text style={styles.statValue}>{aiCalls}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Ván Tài Xỉu</Text><Text style={styles.statValue}>{gamesPlayed}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Lượt chuyển token</Text><Text style={styles.statValue}>{transfers}</Text></View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Đã dùng cho AI</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: colors.danger }]}>{formatToken(state.user.totalSpentOnAI)}</Text>
              <TokenIcon size={14} color={colors.danger} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><AppIcon name="edit-3" size={18} color={colors.accentSoft} /><Text style={styles.sectionTitle}>Lịch sử giao dịch</Text></View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.txFilterScroll}
            contentContainerStyle={styles.txFilterRow}
          >
            {txFilters.map(f => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: txFilter === f.key }}
                key={f.key}
                style={[styles.txFilterChip, txFilter === f.key && styles.txFilterChipActive]}
                onPress={() => setTxFilter(f.key)}
              >
                <Text style={[styles.txFilterText, txFilter === f.key && styles.txFilterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {filteredTxs.length === 0 ? (
            <Text style={styles.emptyTextSmall}>Chưa có giao dịch nào</Text>
          ) : (
            <View style={styles.txList}>
              {filteredTxs.slice(0, 50).map(tx => <TransactionItem key={tx.id} tx={tx} />)}
            </View>
          )}
        </View>
      </ScrollView>
      <AppDrawer {...drawerProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  statLabel: { color: colors.textDim, fontSize: 12, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  section: { marginBottom: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  txFilterScroll: { flexGrow: 0, marginBottom: 8 },
  txFilterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  txFilterChip: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, minHeight: 48, justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: colors.borderSoft },
  txFilterChipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  txFilterText: { color: colors.textDim, fontSize: 12 },
  txFilterTextActive: { color: colors.accentSoft, fontWeight: '600' },
  txList: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
  emptyTextSmall: { color: colors.textFaint, fontSize: 13, textAlign: 'center', padding: 16 },
});
