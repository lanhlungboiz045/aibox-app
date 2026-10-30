// components/ui/Row.jsx — Hàng cài đặt/thông tin: nhãn trái + giá trị phải, cao >= 52
// Dùng cho Profile, Settings, chi tiết đơn… (khác ListRow: không có icon lớn, không dùng cho list dài)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, spacing, touch, type } from '../../theme/tokens';

export function Row({
  label, value, description, icon, iconColor = colors.accentSoft,
  right, onPress, chevron = false, tone = 'default', style, accessibilityLabel, accessibilityHint,
}) {
  const Container = onPress ? TouchableOpacity : View;
  const labelColor = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.text;

  return (
    <Container
      style={[styles.row, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
    >
      {icon ? <AppIcon name={icon} size={18} color={iconColor} style={styles.icon} /> : null}
      <View style={styles.body}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={2} maxFontSizeMultiplier={1.4}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.desc} numberOfLines={2} maxFontSizeMultiplier={1.3}>{description}</Text>
        ) : null}
      </View>
      {value ? (
        <Text style={styles.value} numberOfLines={1} maxFontSizeMultiplier={1.3}>{value}</Text>
      ) : null}
      {right}
      {chevron && onPress ? <AppIcon name="chevron-right" size={16} color={colors.textFaint} /> : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min + 8,
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: { width: 24 },
  body: { flex: 1, gap: 2 },
  label: { ...type.bodyStrong },
  desc: { ...type.small, color: colors.textFaint },
  value: { ...type.small, color: colors.textDim },
});
