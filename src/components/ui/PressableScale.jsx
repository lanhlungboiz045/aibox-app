// components/ui/PressableScale.jsx — Micro-interaction: nhấn xuống thu nhỏ nhẹ (Bước 6)
//
// Dùng cho phần tử bấm được mà không phải Button (card, hàng danh sách...):
//   <PressableScale onPress={...} accessibilityRole="button" style={styles.card}>
//     ...
//   </PressableScale>
//
// - Nhấn xuống: scale 0.97 trong ~120ms + 1 nhịp haptic nhẹ (dùng feedback.js,
//   tự bỏ qua trên máy không hỗ trợ) → cảm giác "có phản hồi" ngay.
// - Nhả ra: trả về scale 1 (nhanh hơn lúc nhấn).
// - Tôn trọng "giảm chuyển động": chỉ đổi độ mờ (opacity) của lớp phủ, không scale.
// - Props y như Pressable (accessibilityRole/Label/Hint, disabled, hitSlop...).
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { motion } from '../../theme/tokens';
import { hapticTap } from '../../utils/feedback';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  disabled = false,
  haptic = true,
  scale = motion.pressScale,
  style,
  ...rest
}) {
  const pressed = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReduceMotion();

  const animateTo = useCallback(
    (to) => {
      if (reducedMotion) {
        pressed.setValue(to);
        return;
      }
      Animated.timing(pressed, {
        toValue: to,
        duration: to ? motion.fast : motion.fast * 2,
        useNativeDriver: true,
      }).start();
    },
    [pressed, reducedMotion]
  );

  const handlePressIn = useCallback(
    (event) => {
      if (!disabled) animateTo(1);
      onPressIn?.(event);
    },
    [animateTo, disabled, onPressIn]
  );

  const handlePressOut = useCallback(
    (event) => {
      animateTo(0);
      onPressOut?.(event);
    },
    [animateTo, onPressOut]
  );

  const handlePress = useCallback(
    (event) => {
      if (haptic) hapticTap();
      onPress?.(event);
    },
    [haptic, onPress]
  );

  // Giảm chuyển động: không scale, chỉ làm mờ nhẹ để vẫn có phản hồi
  const transform = reducedMotion
    ? undefined
    : [{ scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) }];
  const opacity = reducedMotion
    ? pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] })
    : 1;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform, opacity }, disabled && styles.disabled]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
});
