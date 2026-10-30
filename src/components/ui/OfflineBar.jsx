// components/ui/OfflineBar.jsx — Dải báo mất mạng (Bước 4)
// Chỉ chiếm 1 dòng, không chặn thao tác; nút "Thử lại" kiểm tra lại kết nối.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing, touch, type } from '../../theme/tokens';
import { t } from '../../i18n';

export function OfflineBar({
  text = t('state.offline'), onRetry, retryLabel = t('common.retry'), style,
}) {
  return (
    <View
      style={[styles.bar, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={text}
    >
      <AppIcon name="wifi-off" size={14} color={colors.warning} />
      <Text style={styles.text} numberOfLines={2} maxFontSizeMultiplier={1.6}>{text}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          hitSlop={touch.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={styles.action}
        >
          <Text style={styles.actionText} maxFontSizeMultiplier={1.6}>{retryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.warningDim,
    borderBottomWidth: 1,
    borderBottomColor: colors.warningBorder,
    borderRadius: radius.sm,
  },
  text: { ...type.small, color: colors.warning, flex: 1 },
  action: {
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { ...type.smallStrong, color: colors.warning, textDecorationLine: 'underline' },
});
