// components/TransactionItem.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRelativeTime, formatAmount } from '../utils/format';

const TYPE_ICONS = {
  AI_CALL: '\u{1F916}', BUY: '\u{1F4C8}', SELL: '\u{1F4B9}', RESOLVE: '\u{2696}',
  TRANSFER_OUT: '\u{1F4E8}', TRANSFER_IN: '\u{1F4E9}', DAILY_REWARD: '\u{1F381}',
};
const TYPE_COLORS = {
  AI_CALL: '#10A37F', BUY: '#FF6B6B', SELL: '#00CE7E', RESOLVE: '#FFB74D',
  TRANSFER_OUT: '#FF6B6B', TRANSFER_IN: '#00CE7E', DAILY_REWARD: '#FFB74D',
};

export function TransactionItem({ tx }) {
  const icon = TYPE_ICONS[tx.type] || '\u{1F4B0}';
  const color = TYPE_COLORS[tx.type] || '#8E8E93';
  const isPositive = tx.amount > 0;

  return (
    <View style={styles.item}>
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={2}>{tx.description}</Text>
        <Text style={styles.time}>{formatRelativeTime(tx.timestamp)}</Text>
      </View>
      <Text style={[styles.amount, { color: isPositive ? '#00CE7E' : '#FF6B6B' }]}>
        {formatAmount(tx.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 16 },
  content: { flex: 1 },
  description: { color: '#E0E0E0', fontSize: 13, lineHeight: 18 },
  time: { color: '#5C5C5C', fontSize: 11, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
});
