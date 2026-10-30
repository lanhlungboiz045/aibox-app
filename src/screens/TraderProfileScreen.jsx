// screens/TraderProfileScreen.jsx — Xem profile trader top leaderboard + follow / copy trade
import React from 'react';
import { BackButton } from '../components/ui/BackButton';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppIcon } from '../components/ui/AppIcon';
import { formatToken, formatTokenShort, formatDate } from '../utils/format';
import { colors, centeredContent, touch } from '../theme/tokens';

// Sinh chỉ số ổn định từ id (cùng trader luôn ra cùng số)
function hashOf(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

export function TraderProfileScreen({ route, navigation }) {
  const { state, myCopyTrades, followTrader, unfollowTrader, toggleCopyTrade, simulateCopyTrade } = useApp();
  const insets = useSafeAreaInsets();
  const trader = route?.params?.trader;

  if (!trader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.error}>Không tìm thấy trader</Text>
      </View>
    );
  }

  const hash = hashOf(trader.id);
  const winRate = 52 + (hash % 28);
  const totalTrades = 80 + (hash % 220);
  const roi = 12 + (hash % 60);
  const followers = 30 + (hash % 400);

  const config = myCopyTrades.find(item => item.leaderId === trader.id);
  const isMe = state.user?.id === trader.id;
  const openMarkets = state.markets.filter(m => !m.resolved);

  // 3 kèo "đang quan tâm" — chọn theo hash để ổn định
  const picks = openMarkets
    .filter((_, index) => index % Math.max(1, Math.round(openMarkets.length / 3)) === hash % 3)
    .slice(0, 3);

  const follow = () => {
    followTrader(trader.id, trader.username, 1000);
    Alert.alert('Đã theo dõi', `Copy trade bật với hạn mức 1,000 token/lệnh. Bạn có thể chỉnh trong màn Copy Trade.`);
  };

  const simulate = () => {
    if (openMarkets.length === 0) { Alert.alert('Không có market', 'Hiện không có market nào đang mở.'); return; }
    const market = openMarkets[Math.floor(Math.random() * openMarkets.length)];
    const side = Math.random() > 0.5 ? 'YES' : 'NO';
    simulateCopyTrade(trader.id, market.id, side, 50);
    Alert.alert(
      'Đã mô phỏng lệnh',
      `${trader.username} mở ${side} 50 shares ở "${market.question}".\n\nNếu bạn đang bật copy trade, lệnh copy đã được đặt và thông báo gửi về hộp thư.`
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Trader profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.avatar}>{trader.avatar}</Text>
        <Text style={styles.username}>{trader.username}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.rankBadge}>Rank #{trader.rank}</Text>
          <Text style={styles.followers}>{followers} followers</Text>
        </View>
        <Text style={styles.balance}>{formatToken(trader.tokenBalance)} token</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: winRate >= 65 ? colors.success : colors.warning }]}>{winRate}%</Text>
          <Text style={styles.statLabel}>Win rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalTrades}</Text>
          <Text style={styles.statLabel}>Trades</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.accentSoft }]}>+{roi}%</Text>
          <Text style={styles.statLabel}>ROI 30 ngày</Text>
        </View>
      </View>

      {!isMe && (
        <View style={styles.actionSection}>
          {config ? (
            <>
              <View style={styles.followingCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.followingTitle}>Đang copy trade</Text>
                  <Text style={styles.followingSub}>
                    Tối đa {formatToken(config.maxPerTrade)} token/lệnh · {config.enabled ? 'đang bật' : 'đang tạm dừng'}
                  </Text>
                </View>
                <TouchableOpacity accessibilityRole="button" style={styles.toggleBtn} onPress={() => toggleCopyTrade(config.id)}>
                  <Text style={styles.toggleText}>{config.enabled ? 'Tạm dừng' : 'Bật lại'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowBtns}>
                <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={() => navigation.navigate('CopyTrade')}>
                  <Text style={styles.secondaryText}>Quản lý copy trade</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.unfollowBtn}
                  onPress={() => {
                    Alert.alert('Bỏ theo dõi', `Ngừng copy trade theo ${trader.username}?`, [
                      { text: 'Hủy', style: 'cancel' },
                      { text: 'Bỏ theo dõi', style: 'destructive', onPress: () => unfollowTrader(trader.id) },
                    ]);
                  }}
                >
                  <Text style={styles.unfollowText}>Bỏ theo dõi</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity accessibilityRole="button" style={styles.followBtn} onPress={follow}>
              <Text style={styles.followText}>Theo dõi & Copy trade</Text>
            </TouchableOpacity>
          )}

          {config && (
            <TouchableOpacity accessibilityRole="button" style={styles.simulateBtn} onPress={simulate}>
              <Text style={styles.simulateText}>Mô phỏng {trader.username} mở lệnh</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.disclaimer}>
            Copy trade chỉ mô phỏng trong app. Không phải lời khuyên đầu tư; follower chịu toàn bộ rủi ro.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kèo đang quan tâm</Text>
        {picks.length === 0 ? (
          <Text style={styles.empty}>Không có market đang mở.</Text>
        ) : (
          picks.map(market => (
            <TouchableOpacity
              accessibilityRole="button"
              key={market.id}
              style={styles.marketRow}
              onPress={() => navigation.navigate('MarketDetail', { marketId: market.id })}
            >
              <AppIcon name={market.icon} size={18} color={colors.accentSoft} />
              <View style={{ flex: 1 }}>
                <Text style={styles.marketQuestion} numberOfLines={2}>{market.question}</Text>
                <Text style={styles.marketMeta}>
                  YES {market.yesPrice}% · volume {formatTokenShort(market.volume)} {'\u{1F4B0}'}
                </Text>
              </View>
              <AppIcon name="chevron-right" size={16} color={colors.textFaint} style={styles.marketArrow} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={styles.footnote}>
        Số liệu trader là mock sinh từ id. Tham gia từ {formatDate(new Date(Date.now() - (hash % 400) * 86400000).toISOString())}.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', width: 50 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  error: { color: colors.danger, textAlign: 'center', marginTop: 80, fontSize: 15 },
  profileCard: { alignItems: 'center', marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.borderSoft },
  avatar: { fontSize: 56, marginBottom: 8 },
  username: { color: colors.text, fontSize: 22, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  rankBadge: { color: colors.warning, fontSize: 12, fontWeight: '600' },
  followers: { color: colors.textDim, fontSize: 12 },
  balance: { color: colors.accentSoft, fontSize: 18, fontWeight: '700', fontFamily: 'monospace', marginTop: 10 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  actionSection: { paddingHorizontal: 16, marginTop: 16 },
  followBtn: { backgroundColor: colors.accentStrong, borderRadius: 10, paddingVertical: 14, alignItems: 'center', minHeight: touch.min },
  followText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
  followingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successDim, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.successBorder },
  followingTitle: { color: colors.success, fontSize: 13, fontWeight: '700' },
  followingSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  toggleBtn: { backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderSoft, minHeight: touch.min },
  toggleText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondaryBtn: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  secondaryText: { color: colors.accentSoft, fontSize: 12, fontWeight: '600' },
  unfollowBtn: { flex: 1, backgroundColor: colors.dangerDim, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.dangerBorder },
  unfollowText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  simulateBtn: { backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: colors.borderSoft, minHeight: touch.min },
  simulateText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  disclaimer: { color: colors.textFaint, fontSize: 12, lineHeight: 15, marginTop: 10 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  empty: { color: colors.textFaint, fontSize: 12, paddingVertical: 12 },
  marketRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 6, minHeight: touch.min },
  marketIcon: { fontSize: 20 },
  marketQuestion: { color: colors.text, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  marketMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  marketArrow: { color: colors.textFaint, fontSize: 14 },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
