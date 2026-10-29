// components/MarketCard.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatTokenShort, formatTimeLeft } from '../utils/format';

export function MarketCard({ market, onPress, onYes, onNo }) {
  const categoryColors = {
    sports: '#00CE7E', crypto: '#F7931A', tech: '#4285F4',
    entertainment: '#FF6B6B', life: '#FFB74D', politics: '#9333EA',
  };
  const accent = categoryColors[market.category] || '#6C5CE7';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
          <Text style={styles.icon}>{market.icon}</Text>
        </View>
        <View style={styles.categoryTag}>
          <Text style={[styles.categoryText, { color: accent }]}>{market.category}</Text>
        </View>
        <Text style={styles.timeLeft}>{formatTimeLeft(market.endDate)}</Text>
      </View>

      <Text style={styles.question} numberOfLines={2}>{market.question}</Text>

      <View style={styles.bottomRow}>
        <TouchableOpacity style={[styles.btn, styles.btnYes]} onPress={onYes} activeOpacity={0.8}>
          <Text style={styles.btnLabel}>YES</Text>
          <Text style={styles.btnPrice}>{market.yesPrice}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnNo]} onPress={onNo} activeOpacity={0.8}>
          <Text style={styles.btnLabel}>NO</Text>
          <Text style={styles.btnPrice}>{market.noPrice}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.volumeRow}>
        <Text style={styles.volumeText}>{'\u{1F4C8}'} {formatTokenShort(market.volume)} volume</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#22262E', borderRadius: 12, padding: 14, marginHorizontal: 16, marginVertical: 6,
    borderWidth: 1, borderColor: '#2A2E36',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  categoryTag: { flex: 1 },
  categoryText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeLeft: { fontSize: 12, color: '#8E8E93' },
  question: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', lineHeight: 20, marginBottom: 12 },
  bottomRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  btnYes: { backgroundColor: 'rgba(0, 206, 126, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 206, 126, 0.3)' },
  btnNo: { backgroundColor: 'rgba(255, 107, 107, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.3)' },
  btnLabel: { fontSize: 13, fontWeight: '700' },
  btnPrice: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  volumeRow: { flexDirection: 'row', alignItems: 'center' },
  volumeText: { fontSize: 12, color: '#5C5C5C' },
});
