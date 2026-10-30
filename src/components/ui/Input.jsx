// components/ui/Input.jsx — Ô nhập chuẩn: label · focus · error inline · counter · hiện/ẩn mật khẩu
// Không validate bằng Alert: lỗi hiện ngay dưới ô (12px, đỏ + icon) và giữ nguyên dữ liệu.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing, touch, type } from '../../theme/tokens';

export function Input({
  label, helper, error, value, onChangeText, placeholder,
  secureTextEntry = false, maxLength, multiline = false, right,
  inputRef, onFocus, onBlur, editable = true, style, inputStyle,
  keyboardType = 'default', autoCapitalize = 'none', autoCorrect = false,
  returnKeyType, onSubmitEditing, autoFocus, testID, accessibilityLabel,
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);
  const hasError = Boolean(error);

  const borderColor = hasError
    ? colors.danger
    : focused
      ? colors.borderFocus
      : colors.border;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label} maxFontSizeMultiplier={1.4}>{label}</Text>
          {maxLength ? (
            <Text style={styles.counter} maxFontSizeMultiplier={1.2}>
              {String(value || '').length}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.box, { borderColor }, multiline && styles.boxMultiline]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputMultiline, !editable && styles.inputDisabled, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          maxLength={maxLength}
          multiline={multiline}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={error || helper}
          testID={testID}
          // Không cho chữ phóng to phá layout form, nhưng vẫn cho tới 1.4x
          maxFontSizeMultiplier={1.4}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            style={styles.eye}
            onPress={() => setHidden(h => !h)}
            hitSlop={touch.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Hiện nội dung' : 'Ẩn nội dung'}
          >
            <AppIcon name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.textDim} />
          </TouchableOpacity>
        ) : right ? (
          <View style={styles.right}>{right}</View>
        ) : null}
      </View>

      {hasError ? (
        <View style={styles.msgRow}>
          <AppIcon name="alert-circle" size={12} color={colors.danger} />
          <Text style={styles.error} maxFontSizeMultiplier={1.3}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={styles.helper} maxFontSizeMultiplier={1.3}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { ...type.smallStrong, color: colors.textDim },
  counter: { ...type.small, color: colors.textFaint },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min + 4,
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  boxMultiline: { minHeight: 96, alignItems: 'flex-start', paddingVertical: spacing.sm },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: type.subtitle.fontSize,
    lineHeight: 22,
    paddingVertical: spacing.sm,
  },
  inputMultiline: { textAlignVertical: 'top', minHeight: 80 },
  inputDisabled: { color: colors.textFaint },
  eye: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  right: { paddingLeft: spacing.sm },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { ...type.small, color: colors.danger, flex: 1 },
  helper: { ...type.small, color: colors.textFaint },
});
