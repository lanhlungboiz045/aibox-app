// components/ui/Chip.jsx — Chip nhỏ cho hàng số liệu (cuộn ngang) và chip lọc
// Vùng chạm: cao 32 + hitSlop 6 = 44. Chip lọc có accessibilityState.selected.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing, type } from '../../theme/tokens';

export function Chip({
  icon, label, value, onPress, active = false, tone, onRemove, style,
}) {
  const color = tone || (active ? colors.accentSoft : colors.textDim);
  const content = (
    <>
      {icon ? <AppIcon name={icon} size={12} color={color} /> : null}
      {value ? <Text style={[styles.value, { color }]} maxFontSizeMultiplier={1.3}>{value}</Text> : null}
      {label ? (
        <Text
          style={[styles.label, { color: value ? colors.textFaint : color }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      ) : null}
      {onRemove ? (
        <View style={styles.remove}>
          <AppIcon name="x" size={12} color={colors.textDim} />
        </View>
      ) : null}
    </>
  );

  const chipStyle = [styles.chip, active && styles.chipActive, style];

  if (!onPress) return <View style={chipStyle}>{content}</View>;

  return (
    <TouchableOpacity
      style={chipStyle}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityLabel={[value, label].filter(Boolean).join(' ')}
      accessibilityState={{ selected: active }}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { borderColor: colors.accentBorder, backgroundColor: colors.accentDim },
  value: { ...type.smallStrong, fontWeight: '700' },
  label: { ...type.small },
  remove: { marginLeft: spacing.xs },
});
