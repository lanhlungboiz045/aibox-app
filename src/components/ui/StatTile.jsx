// components/ui/StatTile.jsx — Ô thống kê nhỏ: icon, tên, dòng phụ
// Dòng phụ cho phép 2 dòng để không bị cắt ở máy 360px (audit 11.3).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing, type } from '../../theme/tokens';

export function StatTile({ icon, label, sub, onPress, tone = 'accent' }) {
  const iconColor = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.accentSoft;
  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      <View style={styles.iconWrap}>
        <AppIcon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
      {sub ? (
        <Text style={styles.sub} numberOfLines={2} maxFontSizeMultiplier={1.3}>{sub}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
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
  label: { ...type.bodyStrong, color: colors.text },
  sub: { ...type.small, color: colors.textFaint },
});
