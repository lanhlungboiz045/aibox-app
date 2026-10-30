// components/ui/Chip.jsx — Chip nhỏ, dùng cho hàng số liệu tổng hợp (Spend/RPM/TPM) và chip cuộn ngang
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing } from '../../theme/tokens';

export function Chip({ icon, label, value, onPress, active = false, tone }) {
  const color = tone ? tone : active ? colors.accentSoft : colors.textDim;
  const content = (
    <>
      {icon ? <AppIcon name={icon} size={12} color={color} /> : null}
      {value ? <Text style={[styles.value, { color }]}>{value}</Text> : null}
      {label ? <Text style={[styles.label, { color: value ? colors.textFaint : color }]}>{label}</Text> : null}
    </>
  );
  const style = [styles.chip, active && styles.chipActive];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipActive: { borderColor: 'rgba(139, 92, 246, 0.5)', backgroundColor: colors.accentDim },
  value: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 11 },
});
