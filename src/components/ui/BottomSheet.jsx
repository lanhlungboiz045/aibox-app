// components/ui/BottomSheet.jsx — Bottom sheet dùng chung: bộ lọc, form, xác nhận
// Modal + overlay, đóng bằng nút 48dp / bấm nền / phím Back Android.
// `keyboardAware` để form trong sheet không bị bàn phím che.
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing, touch, type } from '../../theme/tokens';

export function BottomSheet({
  visible, onClose, title, subtitle, children, footer,
  maxHeight = '85%', keyboardAware = false, scroll = true, style,
}) {
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  const sheet = (
    <View
      style={[
        styles.sheet,
        { maxHeight, paddingBottom: Math.max(insets.bottom, spacing.lg) },
        style,
      ]}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
    >
      <View style={styles.handle} />
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Text style={styles.title} maxFontSizeMultiplier={1.6}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle} maxFontSizeMultiplier={1.6}>{subtitle}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.close}
            onPress={onClose}
            hitSlop={touch.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          >
            <AppIcon name="x" size={20} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      ) : null}
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng"
        />
        {keyboardAware ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            {sheet}
          </KeyboardAvoidingView>
        ) : sheet}
      </View>
    </Modal>
  );
}

// Alias theo tên trong spec UI kit
export const Sheet = BottomSheet;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  keyboardWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSoft,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.sm },
  headerBody: { flex: 1, gap: 2 },
  title: { ...type.subtitle, color: colors.text, fontWeight: '700' },
  subtitle: { ...type.small, color: colors.textFaint },
  close: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center', marginTop: -spacing.sm, marginRight: -spacing.sm },
  content: { paddingBottom: spacing.sm },
  footer: { paddingTop: spacing.md, gap: spacing.sm },
});
