// screens/LogsScreen.jsx — Lịch sử lượt gọi AI
//
// Luồng: Home → yêu cầu gần đây → lọc → xem chi tiết một lượt gọi.
// Bộ lọc áp dụng ngay (không cần bấm "Áp dụng"), trạng thái rỗng riêng cho
// "chưa có lượt gọi" và "không khớp bộ lọc".
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatDate, formatToken, formatRelativeTime } from '../utils/format';
import {
  logsForUser, logCost, logTokens, logModelName, logStatusLabel,
} from '../services/aiLogStore';
import { copyText } from '../utils/clipboard';
import {
  AppHeader, BottomSheet, Button, Chip, EmptyState, FadeIn, IconButton, ListRow, Row, AppIcon, TokenIcon, useToast,
} from '../components/ui';
import { centeredContent, colors, radius, spacing, touch, type } from '../theme/tokens';
import { t } from '../i18n';

const RANGES = [
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
  { key: 'all', label: 'Tất cả', days: null },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả', icon: 'activity' },
  { key: 'success', label: 'Thành công', icon: 'check-circle' },
  { key: 'error', label: 'Lỗi', icon: 'alert-triangle' },
  { key: 'canceled', label: 'Đã dừng', icon: 'square' },
];

const DEFAULT_FILTER = { modelId: 'all', status: 'all', range: 'all' };

export function LogsScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const user = state.user;

  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // Store log AI duy nhất — cùng nguồn với Home / Usage / Lịch sử / Profile.
  const allLogs = useMemo(
    () => logsForUser(state.aiLogs, user?.id),
    [state.aiLogs, user?.id]
  );

  const range = RANGES.find(r => r.key === filter.range) || RANGES[2];
  const since = range.days ? Date.now() - range.days * 86400000 : null;

  // Lọc theo khoảng thời gian trước — chip model/trạng thái đếm trên cùng tập này
  // nên số trên chip luôn khớp danh sách bên dưới.
  const rangeLogs = useMemo(
    () => (since ? allLogs.filter(log => new Date(log.timestamp).getTime() >= since) : allLogs),
    [allLogs, since]
  );

  // Nhóm theo model THỰC SỰ đã gọi (không phải model người dùng chọn).
  const models = useMemo(() => {
    const map = new Map();
    rangeLogs.forEach(log => {
      const id = log.model || log.modelId || 'unknown';
      const found = map.get(id);
      map.set(id, {
        id,
        name: logModelName(log, state.aiModels),
        count: (found?.count || 0) + 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rangeLogs, state.aiModels]);

  // Đếm theo trạng thái để chip lọc và sheet luôn khớp danh sách bên dưới.
  const statusCounts = useMemo(() => {
    const counts = { all: rangeLogs.length, success: 0, error: 0, canceled: 0 };
    rangeLogs.forEach(log => {
      if (counts[log.status] !== undefined) counts[log.status] += 1;
    });
    return counts;
  }, [rangeLogs]);

  const logs = useMemo(
    () => rangeLogs.filter(log => {
      if (filter.modelId !== 'all' && (log.model || log.modelId || 'unknown') !== filter.modelId) return false;
      if (filter.status !== 'all' && log.status !== filter.status) return false;
      return true;
    }),
    [rangeLogs, filter.modelId, filter.status]
  );

  const totalTokens = logs.reduce((sum, log) => sum + logCost(log), 0);
  const avgTokens = logs.length ? Math.round(totalTokens / logs.length) : 0;
  const filterActive = filter.modelId !== 'all' || filter.status !== 'all' || filter.range !== 'all';

  const handleCopyDetail = async () => {
    if (!detail) return;
    const text = [
      `Mô hình thực tế: ${logModelName(detail, state.aiModels)}`,
      `Mô hình đã chọn: ${detail.requestedModelName || detail.modelId || '—'}`,
      `Trạng thái: ${logStatusLabel(detail.status)}`,
      `Token đã dùng: ${formatToken(logTokens(detail))}`,
      `Token đã trừ: ${formatToken(logCost(detail))}`,
      `Thời gian: ${formatDate(detail.timestamp)} ${new Date(detail.timestamp).toLocaleTimeString('vi-VN')}`,
      `Nội dung: ${detail.prompt || '—'}`,
    ].join('\n');
    const ok = await copyText(text);
    if (ok) toast.success('Đã sao chép chi tiết lượt gọi');
    else toast.error('Không sao chép được.');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        navigation={navigation}
        title={t('screen.logs')}
        subtitle={`${allLogs.length} lượt gọi · ${formatToken(allLogs.reduce((s, log) => s + logCost(log), 0))} token`}
      />
      <View style={styles.headerActions}>
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
            label="Tất cả mô hình"
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

      {/* Lọc nhanh theo trạng thái — áp dụng ngay, không cần mở sheet */}
      {allLogs.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {STATUS_FILTERS.map(item => (
            <Chip
              key={item.key}
              icon={item.icon}
              label={`${item.label} · ${statusCounts[item.key] || 0}`}
              active={filter.status === item.key}
              onPress={() => setFilter(prev => ({ ...prev, status: item.key }))}
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
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>lượt gọi</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={1.5}>{formatToken(avgTokens)}</Text>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>TB / lượt</Text>
              </View>
            </View>
          </FadeIn>
        ) : null}
        ListEmptyComponent={
          allLogs.length === 0 ? (
            <EmptyState
              icon="activity"
              title={t('home.noRequests')}
              message="Gọi AI trong AI Hub để xem lịch sử sử dụng và token đã trừ tại đây."
              actionLabel="Mở AI Hub"
              onAction={() => navigation.navigate('AIHub')}
            />
          ) : (
            <EmptyState
              icon="filter"
              title={t('logs.noMatch')}
              message="Thử khoảng thời gian rộng hơn, hoặc chọn mô hình / trạng thái khác."
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
        renderItem={({ item }) => {
          const success = item.status === 'success';
          const cost = logCost(item);
          return (
            <ListRow
              icon={success ? 'zap' : item.status === 'canceled' ? 'square' : 'alert-triangle'}
              iconColor={success ? colors.accentSoft : item.status === 'canceled' ? colors.textDim : colors.danger}
              title={logModelName(item, state.aiModels)}
              subtitle={`${formatRelativeTime(item.timestamp)} · ${logStatusLabel(item.status)} · ${formatToken(cost)} token`}
              right={<Text style={[styles.amount, !success && styles.amountMuted]}>{success ? `-${formatToken(cost)}` : '0'}</Text>}
              onPress={() => setDetail(item)}
              chevron
              accessibilityHint="Mở chi tiết lượt gọi AI"
            />
          );
        }}
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
          <Text style={styles.sheetLabel} maxFontSizeMultiplier={1.6}>Trạng thái</Text>
          {STATUS_FILTERS.map(item => (
            <Row
              key={item.key}
              label={item.label}
              value={String(statusCounts[item.key] || 0)}
              onPress={() => setFilter(prev => ({ ...prev, status: item.key }))}
              right={filter.status === item.key ? <AppIcon name="check-circle" size={18} color={colors.success} /> : null}
            />
          ))}
        </View>

        <View style={styles.sheetSection}>
          <Text style={styles.sheetLabel} maxFontSizeMultiplier={1.6}>Mô hình</Text>
          <Row
            label="Tất cả mô hình"
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

      {/* Chi tiết lượt gọi */}
      <BottomSheet
        visible={!!detail}
        onClose={() => setDetail(null)}
        title="Chi tiết lượt gọi"
        subtitle={detail ? formatRelativeTime(detail.timestamp) : ''}
        footer={
          <Button label="Sao chép chi tiết" icon="copy" variant="secondary" fullWidth onPress={handleCopyDetail} />
        }
      >
        {detail ? (
          <View style={styles.detail}>
            <Row label="Mô hình thực tế" value={logModelName(detail, state.aiModels)} />
            <Row label="Mô hình đã chọn" value={detail.requestedModelName || detail.modelId || '—'} />
            <Row label="Trạng thái" value={logStatusLabel(detail.status)} />
            <Row label="Token đã dùng" value={formatToken(logTokens(detail))} />
            <Row
              label="Token đã trừ"
              value={formatToken(logCost(detail))}
              right={<TokenIcon size={12} color={colors.danger} />}
              tone="danger"
            />
            <Row
              label="Thời gian"
              value={`${formatDate(detail.timestamp)} · ${new Date(detail.timestamp).toLocaleTimeString('vi-VN')}`}
            />
            {detail.latencyMs ? <Row label="Độ trễ" value={`${detail.latencyMs}ms`} /> : null}
            <Row label="Mã lượt gọi" value={String(detail.id).slice(0, 10)} />
            <View style={styles.promptBox}>
              <Text style={styles.promptLabel} maxFontSizeMultiplier={1.5}>Nội dung</Text>
              <Text style={styles.promptText} selectable maxFontSizeMultiplier={1.8}>
                {detail.prompt || 'Không có nội dung được lưu.'}
              </Text>
            </View>
            {detail.error ? (
              <View style={styles.promptBox}>
                <Text style={styles.promptLabel} maxFontSizeMultiplier={1.5}>Lỗi</Text>
                <Text style={styles.promptText} selectable maxFontSizeMultiplier={1.8}>{detail.error}</Text>
              </View>
            ) : null}
            <Text style={styles.detailNote} maxFontSizeMultiplier={1.6}>
              Token đã trừ không hoàn lại. Chi phí tính theo số token nhà cung cấp AI báo về.
            </Text>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerActions: { alignItems: 'flex-end', paddingHorizontal: spacing.lg },
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
  summaryValue: { ...type.subtitle, ...type.numeric, color: colors.text, fontWeight: '700' },
  summaryLabel: { ...type.small, color: colors.textFaint },
  summaryDivider: { width: 1, height: 28, backgroundColor: colors.border },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: touch.iconButton },
  amount: { ...type.smallStrong, ...type.numeric, color: colors.textDim },
  amountMuted: { color: colors.textFaint },
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
