// components/ui/IconButton.jsx — Nút chỉ có icon: luôn 44x44 + hitSlop + label bắt buộc
// Đây là chỗ sửa lỗi "63 vùng chạm < 44px" trong audit.
import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { hapticTap } from '../../utils/feedback';
import { colors, radius, touch } from '../../theme/tokens';

export function IconButton({
  icon, onPress, label, size = 20, color = colors.text,
  variant = 'ghost', disabled = false, badge, style, testID,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'surface' && styles.surface,
        disabled && styles.disabled,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : hapticTap}
      disabled={disabled}
      hitSlop={touch.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <AppIcon name={icon} size={size} color={color} />
      {badge ? <View style={styles.badgeDot} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touch.iconButton,
    height: touch.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  surface: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.4 },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
});
