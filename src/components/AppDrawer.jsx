// components/AppDrawer.jsx — Drawer tự dựng bằng Modal (không cần thêm native dependency)
// Chứa các mục phụ đã bỏ khỏi header: Usage/Billing, Nạp token, Cài đặt AI, Hồ sơ, Admin...
// Bước 2: theo tokens (chữ >= 12px, hàng 48dp, avatar 48dp) + đầy đủ nhãn cho trình đọc màn hình.
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Pressable, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { AppIcon, IconButton } from './ui';
import { TokenIcon } from './ui/TokenIcon';
import { colors, radius, spacing, touch, type } from '../theme/tokens';
import { useI18n } from '../i18n';
import { getReduceMotion } from '../hooks/useReduceMotion';

// Nhãn là khoá i18n (Bước 5) → đổi ngôn ngữ chỉ cần sửa src/i18n/index.js.
const GROUPS = [
  {
    id: 'explore',
    label: 'nav.explore',
    items: [
      { label: 'nav.home', icon: 'home', route: 'Home' },
      { label: 'nav.aihub', icon: 'message-square', route: 'AIHub' },
      { label: 'nav.transactions', icon: 'list', route: 'Transactions' },
    ],
  },
  {
    id: 'play',
    label: 'nav.play',
    items: [
      { label: 'nav.taixiu', icon: 'zap', route: 'TaiXiu' },
    ],
  },
  {
    id: 'tools',
    label: 'nav.tools',
    items: [
      { label: 'nav.usage', icon: 'bar-chart-2', route: 'UsageDashboard' },
      { label: 'nav.logs', icon: 'activity', route: 'Logs' },
      { label: 'nav.apiKeys', icon: 'key', route: 'APIKeys' },
      { label: 'nav.topup', icon: 'plus-circle', route: 'CreditsTopup' },
      { label: 'nav.quests', icon: 'target', route: 'Quests' },
      { label: 'nav.aiSettings', icon: 'settings', route: 'AISettings' },
    ],
  },
  {
    id: 'account',
    label: 'nav.account',
    items: [
      { label: 'nav.profile', icon: 'user', route: 'Profile' },
      { label: 'nav.notifications', icon: 'bell', route: 'Notifications' },
    ],
  },
];

export function AppDrawer({ visible, onClose, navigation }) {
  const { state } = useApp();
  const { t } = useI18n();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, Math.round(width * 0.82));
  const slide = useRef(new Animated.Value(-panelWidth)).current;

  useEffect(() => {
    if (!visible) return;
    // Giảm chuyển động: panel hiện ngay, không trượt từ trái sang
    if (getReduceMotion()) {
      slide.setValue(0);
      return;
    }
    slide.setValue(-panelWidth);
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, panelWidth, slide]);

  const user = state.user;
  const isAdmin = user?.role === 'admin';
  const visibleGroups = GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => isAdmin || item.route !== 'AISettings'),
  })).filter(group => group.items.length > 0);

  const go = (route) => {
    onClose();
    // Đóng drawer trước rồi mới điều hướng để animation không bị giật
    setTimeout(() => navigation.navigate(route), 120);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={getReduceMotion() ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('nav.closeMenu')}
        />
        <Animated.ScrollView
          style={[
            styles.panel,
            { width: panelWidth, paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
            { transform: [{ translateX: slide }] },
          ]}
          contentContainerStyle={styles.menuContent}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Text style={styles.brand} maxFontSizeMultiplier={1.5}>{t('nav.menu')}</Text>
            <IconButton icon="x" label={t('nav.closeMenu')} onPress={onClose} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.profile}
            onPress={() => go('Profile')}
            activeOpacity={0.8}
            accessibilityLabel={`${user?.username || 'Khách'}, số dư ${formatToken(user?.tokenBalance || 0)} token, mở hồ sơ`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText} maxFontSizeMultiplier={1.5}>{user?.avatar || '\u{1F464}'}</Text>
            </View>
            <View style={styles.profileBody}>
              <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.6}>
                {user?.username || 'Khách'}
              </Text>
              <View style={styles.balanceRow}>
                <TokenIcon size={12} color={colors.accentSoft} />
                <Text style={styles.balance} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                  {formatToken(user?.tokenBalance || 0)} token
                </Text>
              </View>
            </View>
            <AppIcon name="chevron-right" size={16} color={colors.textFaint} />
          </TouchableOpacity>

          {visibleGroups.map(group => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupLabel} maxFontSizeMultiplier={1.5}>{t(group.label)}</Text>
              {group.items.map(item => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={item.route}
                  style={[styles.item, route.name === item.route && styles.itemActive]}
                  onPress={() => go(item.route)}
                  activeOpacity={0.75}
                  accessibilityLabel={t(item.label)}
                  accessibilityState={{ selected: route.name === item.route }}
                >
                  <AppIcon name={item.icon} size={18} color={route.name === item.route ? colors.accentSoft : colors.textDim} />
                  <Text style={[styles.itemLabel, route.name === item.route && styles.itemLabelActive]} numberOfLines={1} maxFontSizeMultiplier={1.6}>
                    {t(item.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {isAdmin && (
            <View style={styles.group}>
              <Text style={styles.groupLabel} maxFontSizeMultiplier={1.5}>{t('nav.admin')}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.item}
                onPress={() => go('AdminHome')}
                activeOpacity={0.75}
                accessibilityLabel="Trang quản trị"
              >
                <AppIcon name="shield" size={18} color={colors.warning} />
                <Text style={[styles.itemLabel, { color: colors.warning }]} numberOfLines={1} maxFontSizeMultiplier={1.6}>
                  Trang quản trị
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.spacer} />
          <Text style={styles.footer} maxFontSizeMultiplier={1.5}>AIBox · Ví token nội bộ</Text>
        </Animated.ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.overlay },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  menuContent: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.sm,
    minHeight: touch.min,
  },
  brand: { ...type.subtitle, color: colors.text, fontWeight: '700' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: touch.min,
  },
  avatar: {
    width: touch.iconButton,
    height: touch.iconButton,
    borderRadius: touch.iconButton / 2,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20 },
  profileBody: { flex: 1, gap: 2 },
  name: { ...type.bodyStrong, color: colors.text, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  balance: { ...type.small, ...type.numeric, color: colors.accentSoft, fontWeight: '600' },
  group: { marginTop: spacing.lg },
  groupLabel: {
    ...type.small,
    color: colors.textFaint,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  itemActive: { backgroundColor: colors.surfaceAlt },
  itemLabel: { ...type.bodyStrong, color: colors.text, fontWeight: '500' },
  itemLabelActive: { color: colors.accentSoft },
  spacer: { flex: 1 },
  footer: { ...type.small, color: colors.textFaint, paddingHorizontal: spacing.sm },
});
