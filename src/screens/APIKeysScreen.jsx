// screens/APIKeysScreen.jsx — TẠM (Bước 2): khung màn API Keys để shortcut trên Home có đích đến.
// Bước 3 sẽ thay bằng danh sách key thật (AsyncStorage) + sheet tạo key + switch Active.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, IconButton, useToast } from '../components/ui';
import { colors, layout, spacing, type } from '../theme/tokens';

export function APIKeysScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={() => navigation.goBack()} />
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>API Keys</Text>
        <View style={styles.headerSpacer} />
      </View>

      <EmptyState
        icon="key"
        title="Chưa có API key nào"
        message="Key dùng để gọi AIBox từ code của bạn. Mỗi key có hạn mức và theo dõi chi tiêu riêng."
        actionLabel="Tạo key"
        onAction={() => toast.info('Tạo key sẽ hoàn thiện ở Bước 3')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...type.subtitle, color: colors.text, fontWeight: '700', flex: 1 },
  headerSpacer: { width: 44 },
});
