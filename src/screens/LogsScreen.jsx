// screens/LogsScreen.jsx — Lịch sử request AI (Bước 3)
//
// Luồng: Home → ô "Requests" → Lọc (sheet) → xem chi tiết 1 request.
// Bộ lọc áp dụng ngay (không cần bấm "Áp dụng"), trạng thái rỗng riêng cho
// "chưa có request" và "không khớp bộ lọc".
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatDate, formatToken, formatRelativeTime } from '../utils/format';
import { copyText } from '../utils/clipboard';
import {
  BottomSheet, Button, Chip, EmptyState, FadeIn, IconButton, ListRow, Row, AppIcon, useToast,
} from '../components/ui';
import { centeredContent, colors, layout, radius, spacing, touch, type } from '../theme/tokens';
import { t } from '../i18n';

const RANGES = [
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
  { key: 'all', label: 'Tất cả', days: null },
];

const DEFAULT_FILTER = { modelId: 'all', range: 'all' };

export function LogsScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const user = state.user;

  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const allLogs = useMemo(
    () => (user?.transactions || [])
      .filter(t => t.type === 'AI_CALL')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [user?.transactions]
  );

  // Các model đã dùng, nhiều request nhất lên trước
  const models = useMemo(() => {
    const map = new Map();
    allLogs.forEach(t => {
      const id = t.modelId || 'unknown';
      const found = map.get(id);
      const name = (state.aiModels.find(m => m.id === id) || {}).name || 'Model khác';
      map.set(id, { id, name, count: (found?.count || 0) + 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allLogs, state.aiModels]);

  const range = RANGES.find(r => r.key === filter.range) || RANGES[2];
  const since = range.days ? Date.now() - range.days * 86400000 : null;

  const logs = useMemo(
    () => allLogs.filter(t => {
      if (filter.modelId !== 'all' && (t.modelId || 'unknown') !== filter.modelId) return false;
      if (since && new Date(t.timestamp).getTime() < since) return false;
      return true;
    }),
    [allLogs, filter.modelId, since]
  );

  const totalTokens = logs.reduce((sum, item) => sum + Math.abs(item.amount || 0), 0);
  const avgTokens = logs.length ? Math.round(totalTokens / logs.length) : 0;
  const filterActive = filter.modelId !== 'all' || filter.range !== 'all';

  const modelName = (id) => (state.aiModels.find(m => m.id === id) || {}).name || 'Model khác';

  const handleCopyDetail = async () => {
    if (!detail) return;
    const text = [
      `Model: ${modelName(detail.modelId)}`,
      `Token: ${formatToken(Math.abs(detail.amount || 0))}`,
      `Thời gian: ${formatDate(detail.timestamp)} ${new Date(detail.timestamp).toLocaleTimeString('vi-VN')}`,
      `Nội dung: ${detail.description || ''}`,
    ].join('\n');
    const ok = await copyText(text);
    if (ok) toast.success('Đã sao chép chi tiết request');
    else toast.error('Không sao chép được.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={() => navigation.goBack()} />
        <View style={styles.headerBody}>
          <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.6}>{t('screen.logs')}</Text>
          <Text style={styles.headerMeta} numberOfLines={1} maxFontSizeMultiplier={1.5}>
            {allLogs.length} request · {formatToken(allLogs.reduce((s, item) => s + Math.abs(item.amount || 0), 0))} {'\u{1F4B0}'}
          </Text>
        </View>
        <View>
          <IconButton
            icon="sliders"
            label={filterActive ? 'Bộ lọc, đang áp dụng' : 'Bộ lọc'}
            variant="surface"
            onPress={() => setFilterOpen(true)}
          />
          {filterActive ? <View style={styles.filterDot} /> : null}
        </View>
      </View>

      {/* Chip lọc nhanh theo model — 1 chạm, không cần mở sheet */}
      {models.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <Chip
            label="Tất cả"
            active={filter.modelId === 'all'}
            onPress={() => setFilter({ ...filter, modelId: 'all' })}
          />
          {models.map(m => (
            <Chip
              key={m.id}
              label={`${m.name} · ${m.count}`}
              active={filter.modelId === m.id}
              onPress={() => setFilter({ ...filter, modelId: m.id })}
            />
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        style={styles.listBody}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
        ListHeaderComponent={logs.length ? (
          <FadeIn>
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={1.5}>{formatToken(totalTokens)}</Text>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>token đã dùng</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={1.5}>{logs.length}</Text>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>request</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={1.5}>{formatToken(avgTokens)}</Text>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>TB / request</Text>
              </View>
            </View>
          </FadeIn>
        ) : null}
        ListEmptyComponent={
          allLogs.length === 0 ? (
            <EmptyState
              icon="activity"
              title={t('home.noRequests')}
              message="Gọi AI trong tab Chat, request đầu tiên sẽ hiện ở đây kèm token đã trừ."
              actionLabel="Mở Chat"
              onAction={() => navigation.navigate('AIHub')}
            />
          ) : (
            <EmptyState
              icon="filter"
              title={t('logs.noMatch')}
              message="Thử khoảng thời gian rộng hơn hoặc chọn model khác."
              actionLabel={t('logs.clearFilter')}
              onAction={() => setFilter(DEFAULT_FILTER)}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) => (
          <ListRow
            icon="zap"
            title={modelName(item.modelId)}
            subtitle={`${formatRelativeTime(item.timestamp)} · ${formatToken(Math.abs(item.amount || 0))} token`}
            right={<Text style={styles.amount}>{`-${formatToken(Math.abs(item.amount || 0))}`}</Text>}
            onPress={() => setDetail(item)}
            chevron
            accessibilityHint="Mở chi tiết request"
          />
        )}
      />

      {/* Bộ lọc */}
      <BottomSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Lọc lịch sử"
        subtitle={filterActive ? 'Bộ lọc đang áp dụng' : 'Chưa áp dụng bộ lọc nào'}
        footer={
          <View style={styles.sheetFooter}>
            <Button
              label="Xoá lọc"
              variant="ghost"
              onPress={() => setFilter(DEFAULT_FILTER)}
              disabled={!filterActive}
              style={styles.footerBtn}
            />
            <Button label="Xong" onPress={() => setFilterOpen(false)} style={styles.footerBtn} />
          </View>
        }
      >
        <View style={styles.sheetSection}>
          <Text style={styles.sheetLabel} maxFontSizeMultiplier={1.6}>Khoảng thời gian</Text>
          <View style={styles.chipWrap}>
            {RANGES.map(r => (
              <Chip
                key={r.key}
                label={r.label}
                active={filter.range === r.key}
                onPress={() => setFilter(prev => ({ ...prev, range: r.key }))}
              />
            ))}
          </View>
        </View>

        <View style={styles.sheetSection}>
          <Text style={styles.sheetLabel} maxFontSizeMultiplier={1.6}>Model</Text>
          <Row
            label="Tất cả model"
            value={String(allLogs.length)}
            onPress={() => setFilter(prev => ({ ...prev, modelId: 'all' }))}
            right={filter.modelId === 'all' ? <AppIcon name="check-circle" size={18} color={colors.success} /> : null}
          />
          {models.map(m => (
            <Row
              key={m.id}
              label={m.name}
              value={String(m.count)}
              onPress={() => setFilter(prev => ({ ...prev, modelId: m.id }))}
              right={filter.modelId === m.id ? <AppIcon name="check-circle" size={18} color={colors.success} /> : null}
            />
          ))}
        </View>
      </BottomSheet>

      {/* Chi tiết 1 request */}
      <BottomSheet
        visible={!!detail}
        onClose={() => setDetail(null)}
        title="Chi tiết request"
        subtitle={detail ? formatRelativeTime(detail.timestamp) : ''}
        footer={
          <Button label="Sao chép chi tiết" icon="copy" variant="secondary" fullWidth onPress={handleCopyDetail} />
        }
      >
        {detail ? (
          <View style={styles.detail}>
            <Row label="Model" value={modelName(detail.modelId)} />
            <Row label="Token đã trừ" value={`${formatToken(Math.abs(detail.amount || 0))} ${'\u{1F4B0}'}`} tone="danger" />
            <Row
              label="Thời gian"
              value={`${formatDate(detail.timestamp)} · ${new Date(detail.timestamp).toLocaleTimeString('vi-VN')}`}
            />
            <Row label="Mã request" value={String(detail.id).slice(0, 10)} />
            <View style={styles.promptBox}>
              <Text style={styles.promptLabel} maxFontSizeMultiplier={1.5}>Nội dung</Text>
              <Text style={styles.promptText} selectable maxFontSizeMultiplier={1.8}>
                {detail.description || 'Không có nội dung được lưu.'}
              </Text>
            </View>
            <Text style={styles.detailNote} maxFontSizeMultiplier={1.6}>
              Token đã trừ không hoàn lại. Chi phí tính theo usage thật của nhà cung cấp AI.
            </Text>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    minHeight: layout.headerHeight + 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBody: { flex: 1, gap: 2 },
  title: { ...type.subtitle, color: colors.text, fontWeight: '700' },
  headerMeta: { ...type.small, color: colors.textFaint },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentSoft,
  },
  chipScroll: { flexGrow: 0, marginTop: spacing.sm },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xs },
  listBody: { flex: 1 },
  list: { ...centeredContent, paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { ...type.subtitle, color: colors.text, fontWeight: '700' },
  summaryLabel: { ...type.small, color: colors.textFaint },
  summaryDivider: { width: 1, height: 28, backgroundColor: colors.border },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: touch.iconButton },
  amount: { ...type.smallStrong, color: colors.textDim },
  sheetSection: { gap: spacing.md, marginBottom: spacing.xl },
  sheetLabel: { ...type.smallStrong, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sheetFooter: { flexDirection: 'row', gap: spacing.sm },
  footerBtn: { flex: 1 },
  detail: { gap: spacing.md },
  promptBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  promptLabel: { ...type.smallStrong, color: colors.textFaint },
  promptText: { ...type.body, color: colors.text, lineHeight: 21 },
  detailNote: { ...type.small, color: colors.textFaint, lineHeight: 18 },
});
