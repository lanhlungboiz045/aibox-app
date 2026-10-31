// components/AIModelCard.jsx — Card model trong AI Hub (Bước 3, micro-interaction Bước 6)
// Vùng chạm nguyên card (>= 44), đọc được bằng screen reader, token màu/khoảng cách.
// Bấm xuống thu nhỏ 0.97 + haptic nhẹ (PressableScale) thay cho activeOpacity.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIProviderLogo } from './AIProviderLogo';
import { AppIcon } from './ui/AppIcon';
import { TokenIcon } from './ui/TokenIcon';
import { PressableScale } from './ui/PressableScale';
import { formatTokenShort } from '../utils/format';
import { capabilityLabel } from '../utils/modelLabels';
import { colors, layout, radius, spacing, type, touch } from '../theme/tokens';

export function AIModelCard({ model, onPress, compact, historyCount = 0 }) {
  const capabilities = Array.isArray(model.capabilities) ? model.capabilities : [];
  const accent = model.accentColor || colors.accent;

  const label = [
    model.name,
    model.providerName,
    `${model.rating} sao`,
    historyCount > 0 ? `${historyCount} tin nhắn đã lưu` : null,
  ].filter(Boolean).join(', ');

  return (
    <PressableScale
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Mở cuộc trò chuyện với mô hình này"
    >
      <View style={[styles.stripe, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
            <AIProviderLogo provider={model.provider} size={40} />
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.8}>{model.name}</Text>
            <Text style={styles.provider} numberOfLines={1} maxFontSizeMultiplier={1.6}>
              {model.providerName}
            </Text>
          </View>
          <View style={styles.costWrap}>
            <TokenIcon size={12} color={colors.accentSoft} />
            <Text style={styles.cost} maxFontSizeMultiplier={1.5}>Theo mức dùng</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2} maxFontSizeMultiplier={1.8}>
          {model.description}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.capWrap}>
            {capabilities.slice(0, 3).map(cap => (
              <View key={cap} style={styles.capTag}>
                <Text style={styles.capText} numberOfLines={1} maxFontSizeMultiplier={1.5}>{capabilityLabel(cap)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.stats}>
            {historyCount > 0 ? (
              <View style={styles.historyPill}>
                <AppIcon name="message-square" size={12} color={colors.accentSoft} />
                <Text style={styles.history} maxFontSizeMultiplier={1.5}>{historyCount}</Text>
              </View>
            ) : null}
            <AppIcon name="star" size={12} color={colors.warning} />
            <Text style={styles.rating} maxFontSizeMultiplier={1.5}>{model.rating}</Text>
            <Text style={styles.popularity} numberOfLines={1} maxFontSizeMultiplier={1.5}>
              {formatTokenShort(model.popularity || 0)} dùng
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: layout.gutter,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: touch.min,
  },
  cardCompact: { width: 240, marginHorizontal: spacing.xs },
  stripe: { width: 4 },
  content: { flex: 1, padding: spacing.md, gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  nameCol: { flex: 1, gap: 2 },
  name: { ...type.subtitle, color: colors.text },
  provider: { ...type.small, color: colors.textFaint },
  costWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  cost: { ...type.smallStrong, color: colors.accentSoft },
  description: { ...type.body, color: colors.textDim, lineHeight: 19 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  capWrap: { flexDirection: 'row', gap: spacing.xs, flexShrink: 1 },
  capTag: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capText: { ...type.small, color: colors.textFaint },
  stats: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  historyPill: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  history: { ...type.smallStrong, color: colors.accentSoft },
  rating: { ...type.smallStrong, color: colors.warning },
  popularity: { ...type.small, color: colors.textFaint },
});
