// components/ui/MiniBanner.jsx — Banner mỏng 1 dòng (cao ~64px), viền tím, có mũi tên ›
// Không truyền `text` → tự ẩn (đúng spec: không có cảnh báo thì không hiện).
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing } from '../../theme/tokens';

const TONES = {
  accent: { border: 'rgba(139, 92, 246, 0.4)', bg: 'rgba(139, 92, 246, 0.08)', fg: colors.accentSoft },
  warning: { border: 'rgba(255, 183, 77, 0.35)', bg: colors.warningDim, fg: colors.warning },
  success: { border: 'rgba(34, 197, 94, 0.35)', bg: colors.successDim, fg: colors.success },
  danger: { border: 'rgba(255, 107, 107, 0.35)', bg: colors.dangerDim, fg: colors.danger },
};

export function MiniBanner({ icon = 'info', text, onPress, tone = 'accent' }) {
  if (!text) return null;
  const t = TONES[tone] || TONES.accent;
  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <AppIcon name={icon} size={16} color={t.fg} />
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>{text}</Text>
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
  },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
