// components/ui/Switch.jsx — Switch có nhãn + mô tả, màu theo theme, chạm cả hàng
import React from 'react';
import { View, Text, Switch as RNSwitch, TouchableOpacity, StyleSheet } from 'react-native';
import { hapticSelect } from '../../utils/feedback';
import { colors, spacing, touch, type } from '../../theme/tokens';

export function Switch({
  value, onValueChange, label, description, disabled = false, style, accessibilityLabel,
}) {
  const toggle = () => {
    if (disabled) return;
    hapticSelect();
    onValueChange?.(!value);
  };

  const control = (
    <RNSwitch
      value={value}
      onValueChange={toggle}
      disabled={disabled}
      trackColor={{ false: colors.surfaceHi, true: colors.accentStrong }}
      thumbColor={value ? colors.onAccent : colors.textFaint}
      ios_backgroundColor={colors.surfaceHi}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
    />
  );

  if (!label) return control;

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.disabled, style]}
      onPress={toggle}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={styles.body}>
        <Text style={styles.label} maxFontSizeMultiplier={1.8}>{label}</Text>
        {description ? (
          <Text style={styles.desc} maxFontSizeMultiplier={1.6}>{description}</Text>
        ) : null}
      </View>
      {/* Vùng chạm của cả hàng đã >= 44, switch chỉ là hình thức */}
      <View pointerEvents="none">{control}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: touch.min + 12,
    paddingVertical: spacing.sm,
  },
  body: { flex: 1, gap: 2 },
  label: { ...type.bodyStrong, color: colors.text },
  desc: { ...type.small, color: colors.textFaint },
  disabled: { opacity: 0.5 },
});
