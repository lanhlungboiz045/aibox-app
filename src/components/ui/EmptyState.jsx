// components/ui/EmptyState.jsx — Trạng thái rỗng: minh hoạ nhỏ + tiêu đề + gợi ý + 1 hành động chính
// Dùng chung cho mọi danh sách để không màn nào chỉ có 1 dòng chữ xám.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { Button } from './Button';
import { colors, radius, spacing, type } from '../../theme/tokens';

export function EmptyState({
  icon = 'inbox', title, message, actionLabel, onAction, compact = false, style,
}) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <View style={styles.art}>
        <AppIcon name={icon} size={compact ? 22 : 28} color={colors.accentSoft} />
      </View>
      {title ? (
        <Text style={styles.title} maxFontSizeMultiplier={1.8}>{title}</Text>
      ) : null}
      {message ? (
        <Text style={styles.message} maxFontSizeMultiplier={1.5}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="sm" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  wrapCompact: { paddingVertical: spacing.xl },
  art: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...type.subtitle, color: colors.text, textAlign: 'center' },
  message: { ...type.small, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },
  action: { marginTop: spacing.md, alignSelf: 'center' },
});
