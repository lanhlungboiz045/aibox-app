// components/TokenBadge.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';

export function TokenBadge({ size = 'medium' }) {
  const { state } = useApp();
  const balance = state.user.tokenBalance;

  const sizeStyles = {
    small: { paddingH: 8, paddingV: 4, fontSize: 12, iconSize: 14 },
    medium: { paddingH: 12, paddingV: 6, fontSize: 14, iconSize: 16 },
    large: { paddingH: 16, paddingV: 8, fontSize: 18, iconSize: 20 },
  };
  const s = sizeStyles[size];

  return (
    <View style={[styles.badge, { paddingHorizontal: s.paddingH, paddingVertical: s.paddingV }]}>
      <Text style={{ fontSize: s.iconSize }}>{'\u{1F4B0}'}</Text>
      <Text style={[styles.text, { fontSize: s.fontSize }]}>{formatToken(balance)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    gap: 4,
  },
  text: {
    color: '#A78BFA',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
