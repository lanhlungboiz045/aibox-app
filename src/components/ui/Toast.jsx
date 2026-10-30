// components/ui/Toast.jsx — Toast/snackbar toàn cục: thay Alert cho thao tác thành công
// Hỗ trợ action "Hoàn tác" (5s) cho hành động nguy hiểm.
// Cách dùng: bọc app bằng <ToastProvider>, ở màn hình gọi useToast().
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { hapticError, hapticSuccess } from '../../utils/feedback';
import { getReduceMotion } from '../../hooks/useReduceMotion';
import { colors, motion, radius, spacing, type } from '../../theme/tokens';

const ToastContext = createContext(null);

const TONES = {
  info: { icon: 'info', color: colors.info },
  success: { icon: 'check-circle', color: colors.success },
  error: { icon: 'alert-circle', color: colors.danger },
  warning: { icon: 'alert-triangle', color: colors.warning },
};

export function useToast() {
  const ctx = useContext(ToastContext);
  // Fallback để màn hình không crash khi quên bọc provider (ví dụ test đơn lẻ)
  return ctx || { show() {}, success() {}, error() {}, info() {}, hide() {} };
}

export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // Giảm chuyển động: ẩn ngay, không trượt xuống
    if (getReduceMotion()) {
      anim.setValue(0);
      setCurrent(null);
      return;
    }
    Animated.timing(anim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setCurrent(null);
    });
  }, [anim]);

  const show = useCallback((message, options = {}) => {
    if (!message) return;
    if (timer.current) clearTimeout(timer.current);

    const tone = options.tone || 'info';
    const duration = options.duration ?? motion.toast;
    setCurrent({ message, tone, action: options.action || null, id: Date.now() });

    anim.stopAnimation();
    // Giảm chuyển động: hiện ngay ở vị trí cuối
    if (getReduceMotion()) {
      anim.setValue(1);
    } else {
      Animated.timing(anim, {
        toValue: 1,
        duration: motion.base,
        useNativeDriver: true,
      }).start();
    }

    if (tone === 'success') hapticSuccess();
    if (tone === 'error') hapticError();

    if (duration > 0) {
      timer.current = setTimeout(dismiss, duration);
    }
  }, [anim, dismiss]);

  const api = useRef({
    show,
    hide: dismiss,
    success: (message, options) => show(message, { ...options, tone: 'success' }),
    error: (message, options) => show(message, { ...options, tone: 'error' }),
    info: (message, options) => show(message, { ...options, tone: 'info' }),
  }).current;
  api.show = show;
  api.hide = dismiss;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={api}>
      <View style={styles.root}>
        {children}
        <ToastHost current={current} anim={anim} onHide={dismiss} />
      </View>
    </ToastContext.Provider>
  );
}

function ToastHost({ current, anim, onHide }) {
  const insets = useSafeAreaInsets();
  if (!current) return null;

  const tone = TONES[current.tone] || TONES.info;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[styles.card, { opacity: anim, transform: [{ translateY }] }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={current.message}
      >
        <AppIcon name={tone.icon} size={18} color={tone.color} />
        <Text style={styles.text} numberOfLines={3} maxFontSizeMultiplier={1.8}>
          {current.message}
        </Text>
        {current.action ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.action}
            onPress={() => { current.action.onPress?.(); onHide(); }}
            accessibilityLabel={current.action.label}
            hitSlop={spacing.sm}
          >
            <Text style={styles.actionText} maxFontSizeMultiplier={1.6}>{current.action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 720,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    // Bóng nhẹ để tách khỏi nội dung phía sau
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  text: { ...type.small, color: colors.text, flex: 1, lineHeight: 18 },
  action: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.sm },
  actionText: { ...type.smallStrong, color: colors.accentSoft },
});
