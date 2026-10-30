// components/ui/StatTile.jsx — Ô thống kê nhỏ: icon, tên, dòng phụ xám
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing } from '../../theme/tokens';

export function StatTile({ icon, label, sub, onPress, tone = 'accent' }) {
  const iconColor = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.accentSoft;
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconWrap}>
        <AppIcon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  sub: { color: colors.textFaint, fontSize: 11 },
});
