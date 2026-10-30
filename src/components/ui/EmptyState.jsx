// components/ui/EmptyState.jsx — Trạng thái rỗng: minh hoạ 2 lớp + tiêu đề + gợi ý + 1 hành động chính
// Dùng chung cho mọi danh sách để không màn nào chỉ có 1 dòng chữ xám.
// Bước 6: nâng minh hoạ (vòng ngoài accentDim + đĩa accentStrong + 2 chấm nhấn) để
// trạng thái rỗng trông "có chủ đích" thay vì giống thông báo lỗi.
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
      {/* Minh hoạ: vòng ngoài + đĩa trong + 2 chấm — thuần View, không cần ảnh/SVG */}
      <View
        style={[styles.art, compact && styles.artCompact]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.artInner, compact && styles.artInnerCompact]}>
          <AppIcon name={icon} size={compact ? 20 : 30} color={colors.onAccent} />
        </View>
        <View style={[styles.spark, styles.sparkTop]} />
        <View style={[styles.spark, styles.sparkBottom]} />
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
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  artCompact: { width: 72, height: 72 },
  artInner: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artInnerCompact: { width: 46, height: 46 },
  // 2 chấm nhỏ lệch trục → minh hoạ không bị "khô" như 1 icon đơn
  spark: { position: 'absolute', width: 8, height: 8, borderRadius: radius.pill },
  sparkTop: { top: 8, right: 12, backgroundColor: colors.accentSoft },
  sparkBottom: { bottom: 10, left: 10, backgroundColor: colors.accentBorder },
  title: { ...type.subtitle, color: colors.text, textAlign: 'center' },
  message: { ...type.small, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },
  action: { marginTop: spacing.md, alignSelf: 'center' },
});
