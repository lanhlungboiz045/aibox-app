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
  disabled: { bg: colors.surfaceAlt, fg: colors.disabledText, border: colors.borderSoft, haptic: hapticTap },
  ghost: { bg: 'transparent', fg: colors.accentSoft, border: 'transparent', haptic: hapticTap },
  danger: { bg: colors.dangerBg, fg: colors.onAccent, border: colors.dangerBg, haptic: hapticTap },
  // Đảo màu: nền sáng, chữ tối (dark) / nền tối, chữ sáng (light). Dùng cho CTA
  // đặt trên card nhiều màu, vẫn đạt tương phản ở cả 2 theme.
  contrast: { bg: colors.text, fg: colors.bg, border: colors.text, haptic: hapticPress },
};

const SIZES = {
  sm: { height: touch.min, paddingHorizontal: spacing.lg, icon: 16, text: type.smallStrong },
  md: { height: touch.min, paddingHorizontal: spacing.xl, icon: 18, text: type.bodyStrong },
  lg: { height: touch.min, paddingHorizontal: spacing.xxl, icon: 20, text: { ...type.subtitle, fontWeight: '700' } },
};

export function Button({
  label, children, onPress, variant = 'primary', size = 'md',
  icon, iconRight, loading = false, disabled = false, fullWidth = false,
  pill = false,
  haptic = true, style, textStyle, accessibilityLabel, accessibilityHint, testID,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading || variant === 'disabled';

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
            height: s.height,
            paddingHorizontal: s.paddingHorizontal,
            backgroundColor: v.bg,
            borderColor: v.border,
          },
          pill && styles.pill,
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
    height: touch.min,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  // Bo tròn hoàn toàn cho CTA dạng pill (bảng giá gói)
  pill: { borderRadius: radius.pill },
  // Disabled: giảm tương phản nhưng vẫn đọc được + chặn press
  disabled: { opacity: 0.45 },
});
