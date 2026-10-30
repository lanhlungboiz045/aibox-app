// components/ui/ErrorState.jsx — Trạng thái lỗi: nói rõ chuyện gì + nút thử lại
// Không dùng Alert cho lỗi tải dữ liệu (Alert chặn luồng và mất ngữ cảnh).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { Button } from './Button';
import { colors, radius, spacing, type } from '../../theme/tokens';

export function ErrorState({
  title = 'Không tải được dữ liệu',
  message = 'Kiểm tra kết nối mạng rồi thử lại.',
  onRetry, retryLabel = 'Thử lại', compact = false, style,
}) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <View style={styles.art}>
        <AppIcon name="alert-triangle" size={compact ? 22 : 28} color={colors.danger} />
      </View>
      <Text style={styles.title} maxFontSizeMultiplier={1.4}>{title}</Text>
      <Text style={styles.message} maxFontSizeMultiplier={1.5}>{message}</Text>
      {onRetry ? (
        <Button
          label={retryLabel}
          onPress={onRetry}
          variant="secondary"
          size="sm"
          icon="refresh-cw"
          style={styles.action}
        />
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
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...type.subtitle, color: colors.text, textAlign: 'center' },
  message: { ...type.small, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },
  action: { marginTop: spacing.md, alignSelf: 'center' },
});
