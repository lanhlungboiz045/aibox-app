// components/Onboarding.jsx — 3 slide giới thiệu, chỉ hiện ở lần mở app đầu tiên (Bước 6)
//
// Mục tiêu: người mới hiểu app làm gì (hỏi AI bằng token / ví & chi tiêu / an toàn)
// trước khi gặp màn đăng nhập, thay vì mở app ra là thấy form Google ngay.
//
// Quy ước:
// - Bỏ qua (1 chạm) hoặc đi hết 3 slide (tối đa 3 chạm) — không có bước nào bắt buộc.
// - Đã xem thì lưu AsyncStorage `aibox_onboarding_v1` → lần sau vào thẳng app.
//   Không xoá theo uid: onboarding là của thiết bị, không phải của tài khoản.
// - Đổi nội dung onboarding thì tăng số đuôi key (v2) để người cũ xem lại.
// - Tôn trọng "giảm chuyển động": FadeIn tự hiện ngay, không trượt.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './ui/AppIcon';
import { Button } from './ui/Button';
import { FadeIn } from './ui/FadeIn';
import { hapticSuccess, hapticTap } from '../utils/feedback';
import { t } from '../i18n';
import { centeredContent, colors, radius, spacing, touch, type } from '../theme/tokens';

export const ONBOARDING_KEY = 'aibox_onboarding_v1';

// Nội dung từng slide — chữ nằm trong i18n (onboard.*)
const SLIDES = [
  { icon: 'message-square', title: 'onboard.s1Title', desc: 'onboard.s1Desc' },
  { icon: 'credit-card', title: 'onboard.s2Title', desc: 'onboard.s2Desc' },
  { icon: 'shield', title: 'onboard.s3Title', desc: 'onboard.s3Desc' },
];

/**
 * Đọc/ghi cờ "đã xem onboarding".
 * seen === null → đang đọc AsyncStorage (Root hiện BootSkeleton thay vì nháy màn).
 */
export function useOnboardingSeen() {
  const [seen, setSeen] = useState(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        if (mounted) setSeen(value === '1');
      })
      // Lỗi đọc storage → coi như đã xem, không chặn người dùng vào app
      .catch(() => {
        if (mounted) setSeen(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const complete = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
  }, []);

  return { seen, complete };
}

export function Onboarding({ onDone }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const skip = useCallback(() => {
    hapticTap();
    onDone?.();
  }, [onDone]);

  const next = useCallback(() => {
    if (isLast) {
      hapticSuccess();
      onDone?.();
      return;
    }
    hapticTap();
    setIndex((i) => i + 1);
  }, [isLast, onDone]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={[styles.topBar, centeredContent]}>
        <Text style={styles.brand} maxFontSizeMultiplier={1.3}>AIBox</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('onboard.skip')}
          onPress={skip}
          style={styles.skip}
          hitSlop={touch.hitSlop}
        >
          <Text style={styles.skipText} maxFontSizeMultiplier={1.6}>{t('onboard.skip')}</Text>
        </TouchableOpacity>
      </View>

      {/* key={index} → mỗi slide fade/trượt nhẹ khi chuyển, không animate cả màn */}
      <FadeIn key={index} style={[styles.body, centeredContent]} offset={14}>
        <View style={styles.art}>
          <View style={styles.artInner}>
            <AppIcon name={slide.icon} size={40} color={colors.onAccent} />
          </View>
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.7}>{t(slide.title)}</Text>
        <Text style={styles.desc} maxFontSizeMultiplier={1.6}>{t(slide.desc)}</Text>
      </FadeIn>

      <View style={[styles.footer, centeredContent]}>
        {/* Chấm tiến trình: đọc được bằng screen reader ("Bước 1/3") */}
        <View
          style={styles.dots}
          accessible
          accessibilityRole="text"
          accessibilityLabel={t('onboard.step', { current: index + 1, total: SLIDES.length })}
        >
          {SLIDES.map((item, i) => (
            <View key={item.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Button
          label={isLast ? t('onboard.start') : t('onboard.next')}
          onPress={next}
          size="lg"
          fullWidth
          iconRight={isLast ? 'check' : 'arrow-right'}
          accessibilityHint={t('onboard.hint')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { ...type.h1, color: colors.text },
  // Nút chữ "Bỏ qua" vẫn đủ 44px theo chiều cao (vùng chạm), nhìn vẫn nhẹ
  skip: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  skipText: { ...type.bodyStrong, color: colors.textDim },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  art: {
    width: 128,
    height: 128,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artInner: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.h1, color: colors.text, textAlign: 'center' },
  desc: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 420,
  },
  footer: { gap: spacing.lg },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accentStrong,
  },
});
