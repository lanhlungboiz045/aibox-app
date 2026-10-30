// screens/LogsScreen.jsx — TẠM (Phần 3): danh sách request AI dạng hàng gọn để Home có đích đến.
// Phần 5 sẽ bổ sung chip tổng hợp (Spend/RPM/TPM), nút "Lọc" mở bottom sheet và phân trang.
import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken, formatRelativeTime } from '../utils/format';
import { AppIcon, ListRow } from '../components/ui';
import { colors, layout, radius, spacing } from '../theme/tokens';

export function LogsScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const user = state.user;

  const logs = useMemo(
    () => (user?.transactions || [])
      .filter(t => t.type === 'AI_CALL')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [user?.transactions]
  );

  const totalTokens = logs.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

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
        <Text style={styles.title}>Logs</Text>
        <Text style={styles.headerMeta}>{logs.length} request</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        ListHeaderComponent={logs.length ? (
          <Text style={styles.summary}>
            Tổng {formatToken(totalTokens)} {'\u{1F4B0}'} · {logs.length} request
          </Text>
        ) : null}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <AppIcon name="activity" size={22} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>Chưa có request nào</Text>
            <Text style={styles.emptyText}>Gọi AI trong tab Chat, request sẽ hiện ở đây.</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => {
          const model = state.aiModels.find(m => m.id === item.modelId);
          return (
            <ListRow
              icon="zap"
              title={model?.name || 'AI model'}
              subtitle={`${formatRelativeTime(item.timestamp)} · ${formatToken(Math.abs(item.amount))} token`}
              right={<Text style={styles.amount}>-{formatToken(Math.abs(item.amount))}</Text>}
              chevron={false}
            />
          );
        }}
        style={styles.listBody}
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
    paddingHorizontal: layout.gutter,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  headerMeta: { color: colors.textFaint, fontSize: 11 },
  listBody: { flex: 1 },
  list: { paddingHorizontal: layout.gutter, paddingTop: spacing.lg },
  summary: { color: colors.textDim, fontSize: 12, marginBottom: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: layout.gutter },
  amount: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 72, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  emptyText: { color: colors.textFaint, fontSize: 12 },
});
