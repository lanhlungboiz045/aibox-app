// components/ui/FadeIn.jsx — Xuất hiện nhẹ (fade + trượt 8px) khi mount (Bước 4, cập nhật Bước 6)
// Tôn trọng cài đặt "giảm chuyển động": bật thì hiện ngay, không animate.
// Logic đọc cài đặt nằm ở hooks/useReduceMotion (đọc 1 lần cho cả app).
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { motion } from '../../theme/tokens';
import { useReduceMotion } from '../../hooks/useReduceMotion';

export function FadeIn({ children, delay = 0, duration = motion.base, offset = 8, style }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    // Người dùng bật giảm chuyển động (kể cả khi đang animate) → hiện ngay
    if (reduceMotion) {
      progress.stopAnimation();
      progress.setValue(1);
      return undefined;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, duration, reduceMotion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
