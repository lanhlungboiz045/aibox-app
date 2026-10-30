// components/AppDrawer.jsx — Drawer tự dựng bằng Modal (không cần thêm native dependency)
// Chứa các mục phụ đã bỏ khỏi header: Usage/Billing, Nạp token, Cài đặt AI, Hồ sơ, Admin...
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Pressable, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { AppIcon } from './ui/AppIcon';
import { colors, radius, spacing } from '../theme/tokens';

const GROUPS = [
  {
    label: 'Khám phá',
    items: [
      { label: 'Home', icon: 'home', route: 'Home' },
      { label: 'AI Hub', icon: 'message-square', route: 'AIHub' },
      { label: 'Markets', icon: 'trending-up', route: 'Markets' },
      { label: 'Portfolio', icon: 'briefcase', route: 'Portfolio' },
      { label: 'Xếp hạng', icon: 'award', route: 'Leaderboard' },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { label: 'Usage & Billing', icon: 'bar-chart-2', route: 'UsageDashboard' },
      { label: 'Logs', icon: 'activity', route: 'Logs' },
      { label: 'Nạp token', icon: 'credit-card', route: 'CreditsTopup' },
      { label: 'Nhiệm vụ', icon: 'target', route: 'Quests' },
      { label: 'Cửa hàng', icon: 'shopping-bag', route: 'Store' },
      { label: 'Cài đặt AI', icon: 'settings', route: 'AISettings' },
    ],
  },
  {
    label: 'Tài khoản',
    items: [
      { label: 'Hồ sơ', icon: 'user', route: 'Profile' },
      { label: 'Thông báo', icon: 'bell', route: 'Notifications' },
    ],
  },
];

export function AppDrawer({ visible, onClose, navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, Math.round(width * 0.82));
  const slide = useRef(new Animated.Value(-panelWidth)).current;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(-panelWidth);
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, panelWidth, slide]);

  const user = state.user;
  const isAdmin = user?.role === 'admin';

  const go = (route) => {
    onClose();
    // Đóng drawer trước rồi mới điều hướng để animation không bị giật
    setTimeout(() => navigation.navigate(route), 120);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.panel,
            { width: panelWidth, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md },
            { transform: [{ translateX: slide }] },
          ]}
        >
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.avatar || '\u{1F464}'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{user?.username || 'Khách'}</Text>
              <View style={styles.balanceRow}>
                <AppIcon name="credit-card" size={11} color={colors.accentSoft} />
                <Text style={styles.balance}>{formatToken(user?.tokenBalance || 0)} token</Text>
              </View>
            </View>
          </View>

          {GROUPS.map(group => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map(item => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.item}
                  onPress={() => go(item.route)}
                  activeOpacity={0.75}
                >
                  <AppIcon name={item.icon} size={16} color={colors.textDim} />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {isAdmin && (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>Quản trị</Text>
              <TouchableOpacity style={styles.item} onPress={() => go('AdminHome')} activeOpacity={0.75}>
                <AppIcon name="shield" size={16} color={colors.warning} />
                <Text style={[styles.itemLabel, { color: colors.warning }]}>Admin Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flex: 1 }} />
          <Text style={styles.footer}>AIBox · bản demo</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  balance: { color: colors.accentSoft, fontSize: 11, fontWeight: '600' },
  group: { marginTop: spacing.lg },
  groupLabel: {
    color: colors.textFaint,
    fontSize: 10,
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
    height: 44,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  itemLabel: { color: colors.text, fontSize: 13, fontWeight: '500' },
  footer: { color: colors.textFaint, fontSize: 10, paddingHorizontal: spacing.sm },
});
