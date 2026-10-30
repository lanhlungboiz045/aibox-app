// components/ui/SectionHeader.jsx — Tiêu đề khối: chữ 18 đậm + link "Xem tất cả" tím
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, type } from '../../theme/tokens';

export function SectionHeader({ title, actionLabel = 'Xem tất cả', onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { ...type.section, color: colors.text, flexShrink: 1 },
  action: { color: colors.accent, fontSize: 13, fontWeight: '600', marginLeft: spacing.md },
});
