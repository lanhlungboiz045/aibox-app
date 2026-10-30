// components/MarketCard.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatTokenShort, formatTimeLeft } from '../utils/format';
import { AppIcon } from './ui/AppIcon';
import { colors, marketCategoryColors, touch } from '../theme/tokens';

export function MarketCard({ market, onPress, onYes, onNo }) {
  const accent = marketCategoryColors[market.category] || colors.accent;

  return (
    <TouchableOpacity accessibilityRole="button" style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
          <AppIcon name={market.icon} size={18} color={accent} />
        </View>
        <View style={styles.categoryTag}>
          <Text style={[styles.categoryText, { color: accent }]}>{market.category}</Text>
        </View>
        <Text style={styles.timeLeft}>{formatTimeLeft(market.endDate)}</Text>
      </View>

      <Text style={styles.question} numberOfLines={2}>{market.question}</Text>

      <View style={styles.bottomRow}>
        <TouchableOpacity accessibilityRole="button" style={[styles.btn, styles.btnYes]} onPress={onYes} activeOpacity={0.8}>
          <Text style={styles.btnLabel}>YES</Text>
          <Text style={styles.btnPrice}>{market.yesPrice}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.btn, styles.btnNo]} onPress={onNo} activeOpacity={0.8}>
          <Text style={styles.btnLabel}>NO</Text>
          <Text style={styles.btnPrice}>{market.noPrice}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.volumeRow}>
        <AppIcon name="trending-up" size={14} color={colors.textFaint} />
        <Text style={styles.volumeText}>{formatTokenShort(market.volume)} volume</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 14, marginHorizontal: 16, marginVertical: 6,
    borderWidth: 1, borderColor: colors.borderSoft,
    minHeight: touch.min,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryTag: { flex: 1 },
  categoryText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeLeft: { fontSize: 12, color: colors.textDim },
  question: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 20, marginBottom: 12 },
  bottomRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  btnYes: { backgroundColor: colors.successDim, borderWidth: 1, borderColor: colors.successBorder },
  btnNo: { backgroundColor: colors.dangerDim, borderWidth: 1, borderColor: colors.dangerBorder },
  btnLabel: { fontSize: 13, fontWeight: '700' },
  btnPrice: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  volumeText: { fontSize: 12, color: colors.textFaint },
});
