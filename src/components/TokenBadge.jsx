// components/TokenBadge.jsx — Pill số dư token (Bước 3)
// Giữ đơn vị 💰 theo quy ước của app; màu accentSoft đạt AA trên nền accentDim.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { colors, radius, spacing, type } from '../theme/tokens';

const SIZES = {
  small: { paddingH: spacing.sm, paddingV: 2, fontSize: type.small.fontSize, iconSize: 12 },
  medium: { paddingH: spacing.md, paddingV: spacing.xs, fontSize: type.body.fontSize, iconSize: 14 },
  large: { paddingH: spacing.lg, paddingV: spacing.sm, fontSize: type.subtitle.fontSize, iconSize: 16 },
};

export function TokenBadge({ size = 'medium' }) {
  const { state } = useApp();
  const balance = state.user?.tokenBalance || 0;
  const s = SIZES[size] || SIZES.medium;

  return (
    <View
      style={[styles.badge, { paddingHorizontal: s.paddingH, paddingVertical: s.paddingV }]}
      accessibilityLabel={`Số dư ${formatToken(balance)} token`}
    >
      <Text style={{ fontSize: s.iconSize }}>{'\u{1F4B0}'}</Text>
      <Text style={[styles.text, { fontSize: s.fontSize }]} maxFontSizeMultiplier={1.2}>
        {formatToken(balance)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    gap: spacing.xs,
    minHeight: 32,
  },
  text: {
    color: colors.accentSoft,
    fontWeight: '700',
    ...type.mono,
  },
});
