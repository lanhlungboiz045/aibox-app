// components/ui/MiniBanner.jsx — Banner mỏng 1 dòng (cao 64), viền màu theo tone, có mũi tên ›
// Không truyền `text` → tự ẩn (đúng spec: không có cảnh báo thì không hiện).
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing, touch, type } from '../../theme/tokens';

const TONES = {
  accent: { border: colors.accentBorder, bg: colors.accentDim, fg: colors.accentSoft },
  warning: { border: colors.warningBorder, bg: colors.warningDim, fg: colors.warning },
  success: { border: colors.successBorder, bg: colors.successDim, fg: colors.success },
  danger: { border: colors.dangerBorder, bg: colors.dangerDim, fg: colors.danger },
};

export function MiniBanner({ icon = 'info', text, onPress, tone = 'accent' }) {
  if (!text) return null;
  const t = TONES[tone] || TONES.accent;
  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={text}
      hitSlop={{ top: 4, bottom: 4 }}
    >
      <AppIcon name={icon} size={16} color={t.fg} />
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1} maxFontSizeMultiplier={1.6}>{text}</Text>
      <AppIcon name="chevron-right" size={16} color={t.fg} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // Đảm bảo vùng chạm luôn >= 44 kể cả khi text ngắn
    minWidth: touch.min,
  },
  text: { ...type.smallStrong, flex: 1 },
});
