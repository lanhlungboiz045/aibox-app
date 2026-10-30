// screens/APIKeysScreen.jsx — TẠM (Phần 2): khung màn API Keys để shortcut trên Home có đích đến.
// Phần 4 sẽ thay bằng danh sách key thật (AsyncStorage) + sheet tạo key + switch Active.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/ui';
import { colors, layout, radius, spacing } from '../theme/tokens';

export function APIKeysScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>API Keys</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <AppIcon name="key" size={22} color={colors.accentSoft} />
        </View>
        <Text style={styles.emptyTitle}>Chưa có API key nào</Text>
        <Text style={styles.emptyText}>
          Key dùng để gọi AIBox từ code của bạn. Mỗi key có hạn mức và theo dõi chi tiêu riêng.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Tạo API key', 'Chức năng tạo key sẽ có ở bước tiếp theo.')}
        >
          <AppIcon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Tạo key</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  body: { paddingHorizontal: layout.gutter, paddingTop: 64, alignItems: 'center' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  emptyText: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    height: 42,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
