// components/ui/SectionHeader.jsx — Tiêu đề khối: chữ 18 đậm + link "Xem tất cả" tím (đạt AA)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, touch, type } from '../../theme/tokens';

export function SectionHeader({ title, actionLabel = 'Xem tất cả', onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>{title}</Text>
      {onAction ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={touch.hitSlop}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.action} numberOfLines={1} maxFontSizeMultiplier={1.3}>{actionLabel}</Text>
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
    minHeight: touch.min,
  },
  title: { ...type.section, color: colors.text, flexShrink: 1 },
  actionBtn: { minHeight: touch.min, justifyContent: 'center', paddingLeft: spacing.md },
  // accentSoft thay accent để đạt 4.5:1 với chữ 12-13px
  action: { ...type.smallStrong, color: colors.accentSoft },
});
