// components/TransactionItem.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { TokenIcon } from './ui/TokenIcon';
import { formatRelativeTime, formatAmount } from '../utils/format';
import { colors } from '../theme/tokens';

const TYPE_ICONS = {
  AI_CALL: 'cpu', BUY: 'trending-up', SELL: 'trending-down', RESOLVE: 'check-circle',
  TRANSFER_OUT: 'send', TRANSFER_IN: 'download', DAILY_REWARD: 'gift',
  TOPUP: 'credit-card', TAIXIU: 'grid',
};
const TYPE_COLORS = {
  AI_CALL: colors.openai, BUY: colors.danger, SELL: colors.success, RESOLVE: colors.warning,
  TRANSFER_OUT: colors.danger, TRANSFER_IN: colors.success, DAILY_REWARD: colors.warning,
  TOPUP: colors.accentSoft, TAIXIU: colors.accentSoft,
};

export function TransactionItem({ tx }) {
  const icon = TYPE_ICONS[tx.type] || 'help-circle';
  const color = TYPE_COLORS[tx.type] || colors.textDim;
  const isPositive = tx.amount > 0;

  return (
    <View style={styles.item}>
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <AppIcon name={icon} size={16} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={2}>{tx.description}</Text>
        <Text style={styles.time}>{formatRelativeTime(tx.timestamp)}</Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: isPositive ? colors.success : colors.danger }]}>
          {formatAmount(tx.amount)}
        </Text>
        <TokenIcon size={12} color={isPositive ? colors.success : colors.danger} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  description: { color: colors.text, fontSize: 13, lineHeight: 18 },
  time: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
