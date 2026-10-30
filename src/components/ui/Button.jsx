// components/ui/Button.jsx — Nút chuẩn: primary / secondary / ghost / danger
// Trạng thái: default · pressed (scale 0.97 + haptic) · loading · disabled
import React, { useRef } from 'react';
import { Text, StyleSheet, ActivityIndicator, Animated, Pressable, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { hapticPress, hapticTap } from '../../utils/feedback';
import { getReduceMotion } from '../../hooks/useReduceMotion';
import { colors, motion, radius, spacing, touch, type } from '../../theme/tokens';

const VARIANTS = {
  primary: { bg: colors.accentStrong, fg: colors.onAccent, border: colors.accentStrong, haptic: hapticPress },
  secondary: { bg: colors.surfaceAlt, fg: colors.text, border: colors.borderSoft, haptic: hapticTap },
  ghost: { bg: 'transparent', fg: colors.accentSoft, border: 'transparent', haptic: hapticTap },
  danger: { bg: colors.dangerBg, fg: colors.onAccent, border: colors.dangerBg, haptic: hapticTap },
};

const SIZES = {
  sm: { minHeight: touch.min, paddingHorizontal: spacing.lg, icon: 16, text: type.smallStrong },
  md: { minHeight: 48, paddingHorizontal: spacing.xl, icon: 18, text: type.bodyStrong },
  lg: { minHeight: 52, paddingHorizontal: spacing.xxl, icon: 20, text: { ...type.subtitle, fontWeight: '700' } },
};

export function Button({
  label, children, onPress, variant = 'primary', size = 'md',
  icon, iconRight, loading = false, disabled = false, fullWidth = false,
  haptic = true, style, textStyle, accessibilityLabel, accessibilityHint, testID,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animateTo = (to) => {
    // Giảm chuyển động → không nhún nút (trả scale về 1 để không bị kẹt nếu cài đặt đổi giữa chừng)
    if (getReduceMotion()) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressIn = () => {
    animateTo(motion.pressScale);
    if (haptic && !isDisabled) v.haptic();
  };
  const handlePressOut = () => animateTo(1);

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : icon ? (
        <AppIcon name={icon} size={s.icon} color={v.fg} />
      ) : null}
      {label || children ? (
        <Text
          style={[s.text, { color: v.fg }, textStyle]}
          maxFontSizeMultiplier={1.6}
        >
          {label || children}
        </Text>
      ) : null}
      {iconRight && !loading ? <AppIcon name={iconRight} size={s.icon} color={v.fg} /> : null}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={isDisabled ? undefined : handlePressIn}
        onPressOut={isDisabled ? undefined : handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
        style={[
          styles.base,
          {
            minHeight: s.minHeight,
            paddingVertical: spacing.xs,
            paddingHorizontal: s.paddingHorizontal,
            backgroundColor: v.bg,
            borderColor: v.border,
          },
          isDisabled && styles.disabled,
        ]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touch.min,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  // Disabled: giảm tương phản nhưng vẫn đọc được + chặn press
  disabled: { opacity: 0.45 },
});
