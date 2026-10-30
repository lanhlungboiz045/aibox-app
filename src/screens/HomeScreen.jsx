// screens/HomeScreen.jsx — Home bản gọn
// Header cố định 56px + 4 shortcut + banner 1 dòng + 3 ô Models/Logs/Quota + card Chi tiêu 7 ngày.
// Markets đã bỏ khỏi Home (vẫn còn tab riêng).
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken, formatTokenShort, formatRelativeTime } from '../utils/format';
import { buildSpendSummary } from '../utils/spend';
import { QUESTS } from '../data/quests';
import { AppDrawer } from '../components/AppDrawer';
import { DailyRewardModal } from '../components/DailyRewardModal';
import { AppIcon, MiniBanner, SectionHeader, ListRow, StatTile, Sparkline } from '../components/ui';
import { colors, layout, radius, spacing } from '../theme/tokens';

// Ngưỡng coi là "số dư thấp" để hiện banner nhắc nạp thêm
const LOW_BALANCE = 1000;

const SHORTCUTS = [
  { key: 'keys', icon: 'key', label: 'API Keys', route: 'APIKeys' },
  { key: 'usage', icon: 'bar-chart-2', label: 'Usage', route: 'UsageDashboard' },
  { key: 'topup', icon: 'credit-card', label: 'Nạp tiền', route: 'CreditsTopup' },
  { key: 'chat', icon: 'message-square', label: 'Chat', route: 'AIHub' },
];

export function HomeScreen({ navigation }) {
  const {
    state, canClaimDaily, nextDailyReward, unreadNotifications, questState,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const user = state.user;
  const balance = user?.tokenBalance || 0;
  const claimedQuests = questState?.claimed?.length || 0;
  const unclaimedQuests = Math.max(QUESTS.length - claimedQuests, 0);

  // Request gần đây: tạm lấy 3 giao dịch AI_CALL mới nhất (Phần 5 sẽ thay bằng Logs thật)
  const recentCalls = (user?.transactions || []).filter(t => t.type === 'AI_CALL').slice(0, 3);

  // Số liệu 7 ngày + hạn mức tháng cho card "Chi tiêu 7 ngày"
  const spend = useMemo(
    () => buildSpendSummary(user?.transactions || []),
    [user?.transactions]
  );
  const totalRequests = (user?.transactions || []).filter(t => t.type === 'AI_CALL').length;

  const deltaText = spend.total === 0
    ? 'Chưa có chi tiêu trong 7 ngày'
    : spend.deltaPct === null
      ? '7 ngày trước chưa có dữ liệu'
      : `${spend.deltaPct >= 0 ? '\u{25B2}' : '\u{25BC}'} ${Math.abs(spend.deltaPct)}% so với 7 ngày trước`;
  const deltaColor = spend.deltaPct === null || spend.deltaPct <= 0 ? colors.textFaint : colors.warning;

  // Banner chỉ hiện 1 dòng, ưu tiên: thưởng ngày > số dư thấp > nhiệm vụ
  const banner = (() => {
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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={styles.container}>
      {/* Header cố định: không cuộn theo nội dung */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowDrawer(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="menu" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.brand}>AIBox</Text>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.balancePill}
            onPress={() => navigation.navigate('CreditsTopup')}
            activeOpacity={0.85}
          >
            <AppIcon name="credit-card" size={12} color={colors.accentSoft} />
            <Text style={styles.balanceText} numberOfLines={1}>{formatToken(balance)} {'\u{1F4B0}'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="bell" size={18} color={colors.textDim} />
            {unreadNotifications > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
            <Text style={styles.avatarText}>{user?.avatar || '\u{1F464}'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 4 ô shortcut vuông, chạm là vào thẳng màn tương ứng */}
        <View style={styles.shortcutRow}>
          {SHORTCUTS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.shortcut}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.85}
            >
              <View style={styles.shortcutIcon}>
                <AppIcon name={item.icon} size={18} color={colors.accentSoft} />
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
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

        {/* 3 ô lớn vừa: Models · Logs · Gói quota */}
        <View style={styles.tileRow}>
          <StatTile
            icon="layers"
            label="Models"
            sub={`${state.aiModels.length} model`}
            onPress={() => navigation.navigate('ModelCatalog')}
          />
          <StatTile
            icon="activity"
            label="Logs"
            sub={`${totalRequests} requests`}
            onPress={() => navigation.navigate('Logs')}
          />
          <StatTile
            icon="pie-chart"
            label="Gói quota"
            sub={spend.quotaLeftPct > 0 ? `Còn ${spend.quotaLeftPct}% hạn mức` : 'Hết hạn mức tháng'}
            onPress={() => navigation.navigate('UsageDashboard')}
          />
        </View>

        {/* Chi tiêu 7 ngày: 1 card duy nhất ~140px, gộp luôn PAYG/token 7 ngày */}
        <View>
          <SectionHeader
            title="Chi tiêu 7 ngày"
            actionLabel="Xem Billing"
            onAction={() => navigation.navigate('UsageDashboard')}
          />
          <View style={styles.spendCard}>
            <View style={styles.spendTop}>
              <View style={styles.spendInfo}>
                <Text style={styles.spendLabel}>Token 7 ngày</Text>
                <Text style={styles.spendValue}>
                  {formatTokenShort(spend.total)}
                  <Text style={styles.spendUnit}> {'\u{1F4B0}'}</Text>
                </Text>
                <Text style={[styles.spendDelta, { color: deltaColor }]} numberOfLines={1}>{deltaText}</Text>
              </View>
              <Sparkline values={spend.series.map(item => item.value)} width={104} height={54} />
            </View>
            <View style={styles.spendDivider} />
            <Text style={styles.spendMeta} numberOfLines={1}>
              Đã dùng {formatToken(spend.total)} {'\u{1F4B0}'} · {spend.requests} requests
            </Text>
          </View>
        </View>

        {/* Tạm thời: 3 request AI gần nhất — Phần 5 thay bằng Logs + nút "Xem tất cả" */}
        <View style={styles.section}>
          <SectionHeader
            title="Request gần đây"
            onAction={() => navigation.navigate('Logs')}
          />
          <View style={styles.card}>
            {recentCalls.length === 0 ? (
              <Text style={styles.empty}>Chưa có request nào. Hỏi AI trong tab Chat để bắt đầu.</Text>
            ) : recentCalls.map((tx, index) => {
              const model = state.aiModels.find(m => m.id === tx.modelId);
              return (
                <View key={tx.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ListRow
                    icon="zap"
                    title={model?.name || 'AI model'}
                    subtitle={`${formatRelativeTime(tx.timestamp)} · ${formatToken(Math.abs(tx.amount))} token`}
                    right={<Text style={styles.amount}>-{formatToken(Math.abs(tx.amount))}</Text>}
                    chevron={false}
                    onPress={() => navigation.navigate('Logs')}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <AppDrawer visible={showDrawer} onClose={() => setShowDrawer(false)} navigation={navigation} />
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
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    gap: spacing.sm,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    backgroundColor: colors.accentDim,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 128,
    flexShrink: 1,
  },
  balanceText: { color: colors.accentSoft, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
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
  shortcutLabel: { color: colors.text, fontSize: 11, fontWeight: '600' },
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
  spendLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  spendValue: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  spendUnit: { fontSize: 14, fontWeight: '600' },
  spendDelta: { fontSize: 11, marginTop: 2 },
  spendDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  spendMeta: { color: colors.textDim, fontSize: 11 },
  section: { gap: 0 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: layout.gutter },
  amount: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  empty: { color: colors.textFaint, fontSize: 12, padding: spacing.lg, lineHeight: 18 },
});
