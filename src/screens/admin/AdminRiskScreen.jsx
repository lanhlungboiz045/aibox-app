// screens/admin/AdminRiskScreen.jsx — Theo dõi dòng tiền & phát hiện rửa token
// Heuristic (demo): tốc độ chuyển, tỷ lệ xả ví, dòng tiền 2 chiều, giao dịch quá lớn.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../data/accounts';
import { formatToken, formatTokenShort, formatRelativeTime } from '../../utils/format';
import { colors, centeredContent } from '../../theme/tokens';

const DAY_MS = 24 * 60 * 60 * 1000;

function isTransfer(tx, type) {
  return tx.type === type;
}

export function AdminRiskScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const now = Date.now();

  const rows = state.accounts.map(account => {
    const transactions = account.transactions || [];
    const outs = transactions.filter(tx => isTransfer(tx, 'TRANSFER_OUT'));
    const ins = transactions.filter(tx => isTransfer(tx, 'TRANSFER_IN'));

    const outs24h = outs.filter(tx => now - Date.parse(tx.timestamp) <= DAY_MS);
    const sent24h = outs24h.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    const sentTotal = outs.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    const receivedTotal = ins.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const last = outs[0] || ins[0] || null;

    const reasons = [];
    let score = 0;

    // 1) Tốc độ: nhiều lệnh chuyển trong 24h
    if (outs24h.length >= 3) {
      score += outs24h.length * 8;
      reasons.push(`${outs24h.length} lệnh chuyển trong 24h`);
    }
    // 2) Xả ví: chuyển đi quá nửa số dư trong 24h
    if (sent24h > 0 && sent24h >= account.tokenBalance * 0.5) {
      score += 25;
      reasons.push('xả >50% số dư trong 24h');
    }
    // 3) Dòng tiền 2 chiều: vừa nhận vừa gửi → dấu hiệu quay vòng
    if (sentTotal > 0 && receivedTotal > 0) {
      const roundTrip = Math.min(sentTotal, receivedTotal) / Math.max(sentTotal, receivedTotal);
      if (roundTrip >= 0.5) {
        score += 20;
        reasons.push('dòng tiền 2 chiều gần cân bằng');
      }
    }
    // 4) Giao dịch đơn lẻ quá lớn so với số dư
    const biggest = outs.reduce((max, tx) => Math.max(max, Math.abs(tx.amount || 0)), 0);
    if (biggest > 0 && biggest >= Math.max(account.tokenBalance, 1) * 0.8) {
      score += 15;
      reasons.push(`lệnh lớn ${formatTokenShort(biggest)} token`);
    }
    // 5) Tài khoản mới đã chuyển tiền
    const accountAge = now - Date.parse(account.createdAt);
    if (accountAge <= DAY_MS && sentTotal >= 5000) {
      score += 15;
      reasons.push('tài khoản mới đã chuyển tiền lớn');
    }

    return {
      account,
      sent24h,
      sentTotal,
      receivedTotal,
      biggest,
      transferCount: outs.length + ins.length,
      last,
      reasons,
      score: Math.min(score, 100),
      risk: score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low',
    };
  });

  const flagged = rows
    .filter(row => row.reasons.length > 0 && row.score > 0)
    .sort((a, b) => b.score - a.score);

  const active = rows
    .filter(row => row.transferCount > 0)
    .sort((a, b) => b.sentTotal + b.receivedTotal - (a.sentTotal + a.receivedTotal))
    .slice(0, 8);

  const totalSupply = state.accounts.reduce((sum, a) => sum + a.tokenBalance, 0);
  const totalTransferred = rows.reduce((sum, row) => sum + row.sentTotal, 0);
  const totalAi = state.accounts.reduce((sum, a) => sum + (a.totalSpentOnAI || 0), 0);
  const totalStore = state.accounts.reduce((sum, a) => sum + (a.totalSpentOnStore || 0), 0);

  const money = [
    { label: 'Token lưu hành', value: formatTokenShort(totalSupply), color: colors.accentSoft },
    { label: 'Tổng transfer', value: formatTokenShort(totalTransferred), color: colors.warning },
    { label: 'Sink AI', value: formatTokenShort(totalAi), color: colors.openai },
    { label: 'Sink Store', value: formatTokenShort(totalStore), color: colors.danger },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Rủi ro dòng tiền</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.grid}>
        {money.map(item => (
          <View key={item.label} style={styles.gridCard}>
            <Text style={[styles.gridValue, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F6A8}'} Cảnh báo ({flagged.length})</Text>
        {flagged.length === 0 ? (
          <Text style={styles.empty}>Chưa phát hiện bất thường. Hãy thử Transfer vài lần rồi quay lại.</Text>
        ) : (
          flagged.map(row => (
            <View
              key={row.account.id}
              style={[styles.alertCard, row.risk === 'high' ? styles.alertHigh : row.risk === 'medium' ? styles.alertMedium : styles.alertLow]}
            >
              <View style={styles.alertHead}>
                <Text style={styles.alertName}>{row.account.avatar} {row.account.username}</Text>
                <Text style={[styles.riskBadge, { color: row.risk === 'high' ? colors.danger : row.risk === 'medium' ? colors.warning : colors.textDim }]}>
                  {row.risk === 'high' ? 'HIGH' : row.risk === 'medium' ? 'MEDIUM' : 'LOW'} · {row.score}
                </Text>
              </View>
              <Text style={styles.alertMeta}>
                {ROLE_LABELS[row.account.role]} · số dư {formatTokenShort(row.account.tokenBalance)} · đã gửi {formatTokenShort(row.sentTotal)} · đã nhận {formatTokenShort(row.receivedTotal)}
              </Text>
              <Text style={styles.alertReasons}>{row.reasons.join(' · ')}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F4CA}'} Tài khoản có dòng tiền lớn nhất</Text>
        {active.length === 0 ? (
          <Text style={styles.empty}>Chưa có giao dịch transfer nào.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.cell, styles.cellName, styles.headText]}>Tài khoản</Text>
              <Text style={[styles.cell, styles.headText]}>Gửi</Text>
              <Text style={[styles.cell, styles.headText]}>Nhận</Text>
              <Text style={[styles.cell, styles.headText]}>24h</Text>
            </View>
            {active.map(row => (
              <View key={row.account.id} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellName, styles.cellText]} numberOfLines={1}>{row.account.username}</Text>
                <Text style={[styles.cell, styles.cellText]}>{formatTokenShort(row.sentTotal)}</Text>
                <Text style={[styles.cell, styles.cellText]}>{formatTokenShort(row.receivedTotal)}</Text>
                <Text style={[styles.cell, row.sent24h > 0 ? styles.cellWarn : styles.cellText]}>
                  {row.sent24h > 0 ? formatTokenShort(row.sent24h) : '—'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F50E}'} Hoạt động transfer gần nhất</Text>
        <View style={styles.txList}>
          {state.accounts
            .flatMap(account =>
              (account.transactions || [])
                .filter(tx => tx.type === 'TRANSFER_OUT' || tx.type === 'TRANSFER_IN')
                .map(tx => ({ ...tx, owner: account.username }))
            )
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
            .slice(0, 12)
            .map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <Text style={styles.txOwner} numberOfLines={1}>{tx.owner}</Text>
                <Text style={styles.txDesc} numberOfLines={2}>{tx.description}</Text>
                <Text style={[styles.txTime, { color: tx.type === 'TRANSFER_OUT' ? colors.danger : colors.success }]}>
                  {formatRelativeTime(tx.timestamp)}
                </Text>
              </View>
            ))}
          {state.accounts.every(a => !(a.transactions || []).some(tx => tx.type.startsWith('TRANSFER'))) && (
            <Text style={styles.empty}>Chưa có giao dịch.</Text>
          )}
        </View>
      </View>

      <Text style={styles.footnote}>
        Heuristic chỉ chạy trên dữ liệu local. Hệ thống thật cần ledger append-only + phân tích graph ở server mới phát hiện được rửa token.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  gridCard: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  gridValue: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  gridLabel: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  empty: { color: colors.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 16, lineHeight: 18 },
  alertCard: { borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1 },
  alertHigh: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  alertMedium: { backgroundColor: colors.warningDim, borderColor: colors.warningBorder },
  alertLow: { backgroundColor: colors.surface, borderColor: colors.borderSoft },
  alertHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  alertName: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  riskBadge: { fontSize: 12, fontWeight: '800', fontFamily: 'monospace' },
  alertMeta: { color: colors.textDim, fontSize: 12, lineHeight: 15 },
  alertReasons: { color: colors.warning, fontSize: 12, marginTop: 4, lineHeight: 15 },
  table: { backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft },
  tableHead: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surfaceAlt },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  cell: { width: 58, textAlign: 'right', color: colors.textDim, fontSize: 12, fontFamily: 'monospace' },
  cellName: { flex: 1, textAlign: 'left', fontFamily: undefined },
  headText: { color: colors.textFaint, fontSize: 12, fontWeight: '700' },
  cellText: { color: colors.text },
  cellWarn: { color: colors.danger, fontWeight: '700' },
  txList: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  txOwner: { color: colors.text, fontSize: 12, fontWeight: '600', width: 82 },
  txDesc: { flex: 1, color: colors.textDim, fontSize: 12, lineHeight: 14 },
  txTime: { fontSize: 12 },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
