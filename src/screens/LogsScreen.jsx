// screens/LogsScreen.jsx — TẠM (Bước 2): danh sách request AI dạng hàng gọn.
// Bước 3 sẽ bổ sung chip tổng hợp, nút "Lọc" mở bottom sheet và phân trang.
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken, formatRelativeTime } from '../utils/format';
import { ListRow, EmptyState, IconButton } from '../components/ui';
import { colors, layout, spacing, type } from '../theme/tokens';

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
        <IconButton icon="chevron-left" label="Quay lại" onPress={() => navigation.goBack()} />
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>Logs</Text>
        <Text style={styles.headerMeta} maxFontSizeMultiplier={1.2}>{logs.length} request</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        ListHeaderComponent={logs.length ? (
          <Text style={styles.summary} maxFontSizeMultiplier={1.3}>
            Tổng {formatToken(totalTokens)} {'\u{1F4B0}'} · {logs.length} request
          </Text>
        ) : null}
        ListEmptyComponent={(
          <EmptyState
            icon="activity"
            title="Chưa có request nào"
            message="Gọi AI trong tab Chat, request đầu tiên sẽ hiện ở đây."
            actionLabel="Mở Chat"
            onAction={() => navigation.navigate('AIHub')}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => {
          const model = state.aiModels.find(m => m.id === item.modelId);
          return (
            <ListRow
              icon="zap"
              title={model?.name || 'AI model'}
              subtitle={`${formatRelativeTime(item.timestamp)} · ${formatToken(Math.abs(item.amount))} token`}
              right={<Text style={styles.amount}>{`-${formatToken(Math.abs(item.amount))}`}</Text>}
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
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...type.subtitle, color: colors.text, fontWeight: '700', flex: 1 },
  headerMeta: { ...type.small, color: colors.textFaint, paddingRight: spacing.md },
  listBody: { flex: 1 },
  list: { paddingTop: spacing.lg },
  summary: { ...type.small, color: colors.textDim, paddingHorizontal: layout.gutter, marginBottom: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: layout.gutter + 44 },
  amount: { ...type.smallStrong, color: colors.textDim },
});
