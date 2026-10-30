import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, touch } from '../../theme/tokens';

export function BackButton({ label = 'Back', onPress, style, textStyle }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      style={[styles.button, style]}
      onPress={onPress}
    >
      <AppIcon name="chevron-left" size={18} color={colors.accentSoft} />
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
    gap: 4,
  },
  label: { color: colors.accentSoft, fontSize: 14, fontWeight: '600' },
});
