// components/ui/FadeIn.jsx — Xuất hiện nhẹ (fade + trượt 8px) khi mount (Bước 4)
// Tôn trọng cài đặt "giảm chuyển động" của hệ điều hành: bật thì hiện ngay, không animate.
import React, { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo, Easing } from 'react-native';
import { motion } from '../../theme/tokens';

export function FadeIn({ children, delay = 0, duration = motion.base, offset = 8, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const showImmediately = () => progress.setValue(1);

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(reduced => {
        if (!mounted) return;
        if (reduced) { showImmediately(); return; }
        Animated.timing(progress, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      })
      .catch(showImmediately);

    return () => { mounted = false; };
  }, [progress, delay, duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
