// screens/HomeScreen.jsx — Home bản gọn
// Header cố định + shortcut + banner + thống kê mô hình, lịch sử AI, hạn mức,
// chi tiêu 7 ngày, khóa API, mô hình phổ biến và gợi ý học nhanh.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { formatToken, formatRelativeTime } from '../utils/format';
import { t } from '../i18n';
import { buildSpendSummary } from '../utils/spend';
import { logsForUser, logModelName, logCost, logStatusLabel } from '../services/aiLogStore';
import { loadApiKeys, peekApiKeys } from '../services/apiKeys';
import { QUESTS } from '../data/quests';
import { AppDrawer } from '../components/AppDrawer';
import { DailyRewardModal } from '../components/DailyRewardModal';
import { AppIcon, AppHeader, MiniBanner, SectionHeader, ListRow, StatTile, Sparkline, EmptyState, PressableScale, TokenIcon } from '../components/ui';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAppDrawer } from '../hooks/useAppDrawer';
import { centeredContent, colors, layout, radius, spacing, touch, type } from '../theme/tokens';

// Ngưỡng coi là "số dư thấp" để hiện banner nhắc nạp thêm
const LOW_BALANCE = 1000;

const SHORTCUTS = [
  { key: 'keys', icon: 'key', label: 'Khóa API', route: 'APIKeys' },
  { key: 'usage', icon: 'bar-chart-2', label: 'Thống kê', route: 'UsageDashboard' },
  { key: 'topup', icon: 'credit-card', label: 'Nạp token', route: 'CreditsTopup' },
  { key: 'chat', icon: 'message-square', label: 'Trò chuyện', route: 'AIHub' },
];

// Gợi ý "Học nhanh": 3 việc người mới nên làm đầu tiên.
const QUICK_START = [
  {
    key: 'chat',
    icon: 'message-square',
    title: 'Hỏi AI câu đầu tiên',
    subtitle: 'Chọn mô hình và bắt đầu trò chuyện',
    route: 'AIHub',
  },
  {
    key: 'keys',
    icon: 'key',
    title: 'Tạo khóa API',
    subtitle: 'Kết nối AIBox với ứng dụng của bạn',
    route: 'APIKeys',
  },
  {
    key: 'usage',
    icon: 'bar-chart-2',
    title: 'Xem thống kê sử dụng',
    subtitle: 'Token theo ngày và theo mô hình',
    route: 'UsageDashboard',
  },
];

export function HomeScreen({ navigation }) {
  const {
    state, canClaimDaily, nextDailyReward, questState,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [showDaily, setShowDaily] = useState(false);
  const { open: openDrawer, drawerProps } = useAppDrawer();

  const user = state.user;
  const { isOffline, refresh: refreshNetwork } = useNetworkStatus();
  const balance = user?.tokenBalance || 0;
  const claimedQuests = questState?.claimed?.length || 0;
  const unclaimedQuests = Math.max(QUESTS.length - claimedQuests, 0);

  // Khóa API lưu trên máy theo uid — đọc lại mỗi lần Home được mở để khớp
  // ngay sau khi tạo/thu hồi khóa ở màn Khóa API.
  const [apiKeys, setApiKeys] = useState(() => peekApiKeys(user?.id) || []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user?.id) {
        setApiKeys([]);
        return undefined;
      }
      loadApiKeys(user.id)
        .then(list => { if (active) setApiKeys(list); })
        .catch(() => { /* Home vẫn dùng được khi storage lỗi */ });
      return () => { active = false; };
    }, [user?.id])
  );

  // Mọi số liệu AI đều đọc từ store log duy nhất (state.aiLogs) — cùng nguồn
  // với Logs / Usage / Lịch sử / Profile nên không thể lệch nhau.
  const aiLogs = useMemo(
    () => logsForUser(state.aiLogs, user?.id),
    [state.aiLogs, user?.id]
  );
  const recentCalls = aiLogs.slice(0, 3);

  // Số liệu 7 ngày + hạn mức tháng cho card "Chi tiêu 7 ngày"
  const spend = useMemo(
    () => buildSpendSummary(aiLogs, { aiModels: state.aiModels }),
    [aiLogs, state.aiModels]
  );
  const totalRequests = spend.requests;
  // Mô hình được dùng nhiều nhất (xếp theo token đã dùng, rồi số lượt).
  const popularModels = spend.byModel.slice(0, 3);

  const deltaText = spend.total === 0
    ? 'Chưa có chi tiêu trong 7 ngày'
    : spend.deltaPct === null
      ? '7 ngày trước chưa có dữ liệu'
      : `${spend.deltaPct >= 0 ? '\u{25B2}' : '\u{25BC}'} ${Math.abs(spend.deltaPct)}% so với 7 ngày trước`;
  const deltaColor = spend.deltaPct === null || spend.deltaPct <= 0 ? colors.textFaint : colors.warning;

  // Banner chỉ hiện 1 dòng, ưu tiên: mất mạng > thưởng ngày > số dư thấp > nhiệm vụ
  const banner = (() => {
    if (isOffline) {
      return {
        icon: 'wifi-off',
        tone: 'warning',
        text: 'Không có kết nối mạng — đang hiện dữ liệu lưu trên máy',
        onPress: refreshNetwork,
      };
    }
    if (canClaimDaily) {
      return {
        icon: 'gift',
        tone: 'accent',
        text: `Nhận ${formatToken(nextDailyReward)} token miễn phí hôm nay`,
        onPress: () => setShowDaily(true),
      };
    }
    if (balance < LOW_BALANCE) {
      return {
        icon: 'alert-triangle',
        tone: 'warning',
        text: 'Số dư còn thấp, nạp thêm để tiếp tục gọi AI',
        onPress: () => navigation.navigate('CreditsTopup'),
      };
    }
    if (unclaimedQuests > 0) {
      return {
        icon: 'target',
        tone: 'accent',
        text: `Còn ${unclaimedQuests} nhiệm vụ hôm nay chưa nhận thưởng`,
        onPress: () => navigation.navigate('Quests'),
      };
    }
    return null;
  })();

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} title="AIBox" subtitle="Tổng quan" isRoot onMenu={openDrawer} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 4 ô shortcut vuông, chạm là vào thẳng màn tương ứng */}
        <View style={styles.shortcutRow}>
          {SHORTCUTS.map(item => (
            <PressableScale
              accessibilityRole="button"
              key={item.key}
              style={styles.shortcut}
              onPress={() => navigation.navigate(item.route)}
              accessibilityLabel={item.label}
            >
              <View style={styles.shortcutIcon}>
                <AppIcon name={item.icon} size={18} color={colors.accentSoft} />
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={2} maxFontSizeMultiplier={1.5}>{item.label}</Text>
            </PressableScale>
          ))}
        </View>

        {banner ? (
          <MiniBanner
            icon={banner.icon}
            text={banner.text}
            tone={banner.tone}
            onPress={banner.onPress}
          />
        ) : null}

        {/* 3 ô lớn vừa: Models · Logs · Gói token */}
        <View style={styles.tileRow}>
          <StatTile
            icon="layers"
            label="Mô hình"
            sub={`${state.aiModels.length} mô hình`}
            onPress={() => navigation.navigate('ModelCatalog')}
          />
          <StatTile
            icon="activity"
            label="Lịch sử AI"
            sub={`${totalRequests} lượt gọi`}
            onPress={() => navigation.navigate('Logs')}
          />
          <StatTile
            icon="pie-chart"
            label="Hạn mức AI"
            sub={spend.quotaLeftPct > 0 ? `Còn ${spend.quotaLeftPct}% hạn mức` : 'Hết hạn mức tháng'}
            onPress={() => navigation.navigate('UsageDashboard')}
          />
        </View>

        {/* Chi tiêu 7 ngày: 1 card duy nhất ~140px, gộp luôn PAYG/token 7 ngày */}
        <View>
          <SectionHeader
            title={t('home.spend7d')}
            actionLabel="Xem chi tiết"
            onAction={() => navigation.navigate('UsageDashboard')}
          />
          <View style={styles.spendCard}>
            <View style={styles.spendTop}>
              <View style={styles.spendInfo}>
                <Text style={styles.spendLabel}>Token 7 ngày</Text>
                <Text style={styles.spendValue} maxFontSizeMultiplier={1.5} numberOfLines={1}>
                  {formatToken(spend.total)}
                  <TokenIcon size={14} color={colors.textFaint} />
                </Text>
                <Text style={[styles.spendDelta, { color: deltaColor }]} numberOfLines={1} maxFontSizeMultiplier={1.5}>{deltaText}</Text>
              </View>
              <Sparkline values={spend.series.map(item => item.value)} width={104} height={54} />
            </View>
            <View style={styles.spendDivider} />
            <Text style={styles.spendMeta} numberOfLines={1}>
              Đã dùng {formatToken(spend.total)} token · {spend.windowRequests} lượt gọi
            </Text>
          </View>
        </View>

        {/* Ba lượt gọi AI gần nhất */}
        <View style={styles.section}>
          <SectionHeader
            title={t('home.recentRequests')}
            onAction={() => navigation.navigate('Logs')}
          />
          <View style={styles.card}>
            {recentCalls.length === 0 ? (
              <EmptyState
                compact
                icon="message-square"
                title={t('home.noRequests')}
                message="Gọi AI lần đầu để xem lịch sử sử dụng tại đây."
                actionLabel="Hỏi AI ngay"
                onAction={() => navigation.navigate('AIHub')}
              />
            ) : recentCalls.map((log, index) => {
              const cost = logCost(log);
              const success = log.status === 'success';
              return (
                <View key={log.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ListRow
                    icon={success ? 'zap' : log.status === 'canceled' ? 'square' : 'alert-triangle'}
                    iconColor={success ? colors.accentSoft : log.status === 'canceled' ? colors.textDim : colors.danger}
                    title={logModelName(log, state.aiModels)}
                    subtitle={`${formatRelativeTime(log.timestamp)} · ${logStatusLabel(log.status)} · ${formatToken(cost)} token`}
                    right={<Text style={[styles.amount, !success && { color: colors.textFaint }]}>{success ? `-${formatToken(cost)}` : '0'}</Text>}
                    chevron={false}
                    onPress={() => navigation.navigate('Logs')}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Khóa API của bạn — đọc từ dịch vụ khóa trên máy, cùng dữ liệu với màn Khóa API */}
        <View style={styles.section}>
          <SectionHeader
            title="Khóa API của bạn"
            actionLabel="Quản lý"
            onAction={() => navigation.navigate('APIKeys')}
          />
          <View style={styles.card}>
            {apiKeys.length === 0 ? (
              <EmptyState
                compact
                icon="key"
                title="Chưa có khóa API"
                message="Tạo khóa để gọi AIBox từ ứng dụng hoặc máy chủ của bạn."
                actionLabel="Tạo khóa đầu tiên"
                onAction={() => navigation.navigate('APIKeys')}
              />
            ) : apiKeys.slice(0, 2).map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ListRow
                  icon="key"
                  iconColor={item.active ? colors.accentSoft : colors.textFaint}
                  title={item.name}
                  subtitle={item.mask}
                  right={(
                    <Text style={[styles.keyState, { color: item.active ? colors.success : colors.textFaint }]}>
                      {item.active ? 'Đang bật' : 'Đang tắt'}
                    </Text>
                  )}
                  onPress={() => navigation.navigate('APIKeys')}
                  accessibilityHint="Mở quản lý khóa API"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Mô hình phổ biến — xếp theo token đã dùng từ store log AI */}
        <View style={styles.section}>
          <SectionHeader
            title="Mô hình phổ biến"
            actionLabel="Xem tất cả"
            onAction={() => navigation.navigate('ModelCatalog')}
          />
          <View style={styles.card}>
            {popularModels.length === 0 ? (
              <EmptyState
                compact
                icon="cpu"
                title="Chưa có mô hình nào được dùng"
                message="Hỏi AI một câu để biết mô hình nào phù hợp với bạn."
                actionLabel="Hỏi AI câu đầu tiên"
                onAction={() => navigation.navigate('AIHub')}
              />
            ) : popularModels.map((model, index) => (
              <View key={model.modelId}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ListRow
                  icon="cpu"
                  title={model.model?.name || model.modelName || model.modelId}
                  subtitle={`${model.count} lượt gọi · ${formatToken(model.cost)} token`}
                  onPress={() => navigation.navigate('ModelCatalog')}
                  accessibilityHint="Mở danh sách mô hình"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Học nhanh — 3 việc nên làm đầu tiên */}
        <View style={styles.section}>
          <SectionHeader title="Học nhanh" />
          <View style={styles.card}>
            {QUICK_START.map((item, index) => (
              <View key={item.key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ListRow
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={() => navigation.navigate(item.route)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <AppDrawer {...drawerProps} />
      <DailyRewardModal visible={showDaily} onClose={() => setShowDaily(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInner: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    gap: spacing.sm,
  },
  brand: { ...type.section, fontSize: 18, color: colors.text, fontWeight: '800', letterSpacing: -0.3 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentDim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 32,
    maxWidth: 110,
    flexShrink: 1,
  },
  balanceText: { color: colors.accentSoft, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  iconBtn: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: colors.onAccent, fontSize: 12, fontWeight: '800' },
  avatar: {
    width: touch.min,
    height: touch.min,
    borderRadius: touch.min / 2,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18 },
  scroll: { flex: 1 },
  content: {
    ...centeredContent,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    gap: layout.sectionGap,
  },
  shortcutRow: { flexDirection: 'row', gap: 10 },
  shortcut: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: { ...type.small, fontWeight: '600', color: colors.text, textAlign: 'center' },
  tileRow: { flexDirection: 'row', gap: 10 },
  spendCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  spendTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spendInfo: { flex: 1 },
  spendLabel: { ...type.smallStrong, color: colors.textFaint },
  spendValue: { ...type.display, ...type.numeric, color: colors.text, marginTop: 2 },
  spendUnit: { fontSize: 14, fontWeight: '600' },
  spendDelta: { ...type.small, marginTop: 2 },
  spendDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  spendMeta: { ...type.small, ...type.numeric, color: colors.textDim },
  section: { gap: 0 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: layout.gutter },
  amount: { ...type.smallStrong, ...type.numeric, color: colors.textDim },
  keyState: { ...type.small, fontWeight: '600' },
});
