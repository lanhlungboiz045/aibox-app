// components/ui/ListRow.jsx — Hàng gọn 64-72px, tối đa 2 dòng chữ, dùng cho mọi danh sách
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors, radius, spacing } from '../../theme/tokens';

export function ListRow({
  icon, iconColor = colors.accentSoft, title, subtitle,
  right, onPress, chevron = true, compact = false, style,
}) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={[styles.row, compact && styles.rowCompact, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <AppIcon name={icon} size={16} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {chevron && onPress ? <AppIcon name="chevron-right" size={16} color={colors.textFaint} /> : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowCompact: { minHeight: 64 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 13, fontWeight: '600' },
  subtitle: { color: colors.textFaint, fontSize: 11 },
  right: { alignItems: 'flex-end' },
});
