import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './IconButton';
import { TokenBadge } from '../TokenBadge';
import { colors, layout, spacing, type } from '../../theme/tokens';
import { t } from '../../i18n';

export function AppHeader({ navigation, title, subtitle, isRoot = false, onMenu, onBack, style }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingTop: insets.top }, style]}>
      <View style={styles.row}>
        {isRoot ? (
          <IconButton icon="menu" label={t('nav.openMenu')} size={20} onPress={onMenu} />
        ) : (
          <IconButton icon="chevron-left" label="Quay lại" size={20} onPress={onBack || (() => navigation.goBack())} />
        )}
        <View style={styles.title}>
          <Text style={styles.heading} numberOfLines={1} maxFontSizeMultiplier={1.4}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{subtitle}</Text>
          ) : null}
        </View>
        <TokenBadge size="small" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  title: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { ...type.subtitle, color: colors.text, fontWeight: '700', textAlign: 'center' },
  subtitle: { ...type.small, color: colors.textFaint, textAlign: 'center' },
});
