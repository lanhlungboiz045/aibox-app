// components/ui/Skeleton.jsx — Khung xương đúng hình khối thật, nhịp thở bằng opacity
// Tôn trọng "giảm chuyển động": khi bật thì dừng ở 1 mức sáng cố định.
// Bước 6: dùng chung hooks/useReduceMotion thay vì tự gọi AccessibilityInfo.
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { useReduceMotion } from '../../hooks/useReduceMotion';

export function Skeleton({ width = '100%', height = 12, br = radius.xs, style }) {
  const reduced = useReduceMotion();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(0.7);
      return undefined;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [reduced, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: br, backgroundColor: colors.skeleton, opacity },
        style,
      ]}
    />
  );
}

// 2–3 dòng chữ giả
export function SkeletonText({ lines = 2, gap = spacing.sm, style }) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={10} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

// Hàng danh sách giả: icon tròn + 2 dòng + số bên phải
export function SkeletonRow({ style }) {
  return (
    <View style={[styles.row, style]}>
      <Skeleton width={30} height={30} br={radius.sm} />
      <View style={styles.rowBody}>
        <Skeleton height={10} width="55%" />
        <Skeleton height={8} width="35%" />
      </View>
      <Skeleton height={10} width={40} />
    </View>
  );
}

export function SkeletonList({ count = 4, style }) {
  return (
    <View style={[{ gap: spacing.lg }, style]}>
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  rowBody: { flex: 1, gap: spacing.sm },
});
