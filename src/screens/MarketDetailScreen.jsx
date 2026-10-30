// screens/MarketDetailScreen.jsx
import React, { useState } from 'react';
import { BackButton } from '../components/ui/BackButton';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { PriceChart } from '../components/PriceChart';
import { TradeSheet } from '../components/TradeSheet';
import { TokenBadge } from '../components/TokenBadge';
import { MarketAnalystModal } from '../components/MarketAnalystModal';
import { CommentSection } from '../components/CommentSection';
import { AppIcon } from '../components/ui/AppIcon';
import { formatToken, formatTokenShort, formatTimeLeft, formatDate } from '../utils/format';
import { colors, centeredContent, marketCategoryColors, touch } from '../theme/tokens';

export function MarketDetailScreen({ route, navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const marketId = route?.params?.marketId;
  const initialSide = (route?.params?.initialSide) || 'YES';
  const market = state.markets.find(m => m.id === marketId);

  const [showTrade, setShowTrade] = useState(false);
  const [showAnalyst, setShowAnalyst] = useState(false);
  const [tradeSide, setTradeSide] = useState(initialSide);

  if (!market) {
    return (
      <View style={[styles.container, styles.missingMarket]}>
        <Text style={styles.error}>Market không tồn tại hoặc đã bị gỡ.</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách"
          style={styles.errorBack}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.errorBackContent}>
            <AppIcon name="chevron-left" size={16} color={colors.accentSoft} />
            <Text style={styles.backBtn}>Quay lại</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const userPosition = state.user?.positions.find(p => p.marketId === market.id);
  const accent = marketCategoryColors[market.category] || colors.accent;

  const openTrade = (side) => { setTradeSide(side); setShowTrade(true); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <TokenBadge size="small" />
      </View>

      <View style={styles.questionSection}>
        <View style={styles.questionHeader}>
          <Text style={[styles.categoryTag, { color: accent }]}>{market.category.toUpperCase()}</Text>
          <Text style={styles.timeLeft}>{formatTimeLeft(market.endDate)}</Text>
        </View>
        <AppIcon name={market.icon} size={36} color={accent} style={styles.icon} />
        <Text style={styles.question}>{market.question}</Text>
        <Text style={styles.description}>{market.description}</Text>
        <Text style={styles.endDate}>Kết thúc: {formatDate(market.endDate)}</Text>
        {market.creatorName ? (
          <Text style={styles.creator}>Tạo bởi {market.creatorName} · creator fee 2% volume</Text>
        ) : null}
      </View>

      {market.resolved && (
        <View style={[styles.resolvedBanner, market.outcome === 'YES' ? styles.resolvedYes : styles.resolvedNo]}>
          <Text style={styles.resolvedText}>Đã kết thúc — Kết quả: {market.outcome}</Text>
        </View>
      )}

      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Giá YES (7 ngày qua)</Text>
        <PriceChart data={market.priceHistory} height={140} />
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Volume</Text><Text style={styles.infoValue}>{formatTokenShort(market.volume)} token</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Liquidity</Text><Text style={styles.infoValue}>{formatTokenShort(market.liquidity)} token</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>YES price</Text><Text style={[styles.infoValue, { color: colors.success }]}>{market.yesPrice} token</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>NO price</Text><Text style={[styles.infoValue, { color: colors.danger }]}>{market.noPrice} token</Text></View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.analystCard, market.resolved && styles.analystCardMuted]}
        onPress={() => setShowAnalyst(true)}
        activeOpacity={0.85}
      >
        <AppIcon name="cpu" size={24} color={colors.accentSoft} />
        <View style={{ flex: 1 }}>
          <Text style={styles.analystTitle}>Hỏi AI về kèo này</Text>
          <Text style={styles.analystSub}>
            {market.resolved
              ? `Kèo đã kết thúc (${market.outcome}) — xem lại AI phân tích gì`
              : 'AI đọc giá, volume, thời hạn và đưa ra góc nhìn + quản trị vốn'}
          </Text>
        </View>
        <AppIcon name="chevron-right" size={16} color={colors.accentSoft} />
      </TouchableOpacity>

      {userPosition && (
        <View style={styles.positionSection}>
          <Text style={styles.positionTitle}>Position của bạn</Text>
          <View style={styles.positionCard}>
            <Text style={styles.positionSide}>{userPosition.side}</Text>
            <Text style={styles.positionShares}>{userPosition.shares} shares</Text>
            <Text style={styles.positionAvg}>Avg: {userPosition.avgPrice.toFixed(1)} {'\u{1F4B0}'}</Text>
            <Text style={styles.positionInvested}>Invested: {formatToken(userPosition.invested)} {'\u{1F4B0}'}</Text>
          </View>
        </View>
      )}

      {!market.resolved && (
        <View style={styles.tradeButtons}>
          <TouchableOpacity accessibilityRole="button" style={[styles.tradeBtn, styles.tradeYes]} onPress={() => openTrade('YES')} activeOpacity={0.8}>
            <Text style={styles.tradeBtnLabel}>Mua YES</Text>
            <Text style={styles.tradeBtnPrice}>{market.yesPrice} token</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={[styles.tradeBtn, styles.tradeNo]} onPress={() => openTrade('NO')} activeOpacity={0.8}>
            <Text style={styles.tradeBtnLabel}>Mua NO</Text>
            <Text style={styles.tradeBtnPrice}>{market.noPrice} token</Text>
          </TouchableOpacity>
        </View>
      )}

      <CommentSection marketId={market.id} />

      <TradeSheet visible={showTrade} market={market} initialSide={tradeSide} onClose={() => setShowTrade(false)} />
      <MarketAnalystModal visible={showAnalyst} market={market} onClose={() => setShowAnalyst(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  questionSection: { paddingHorizontal: 16, marginBottom: 16 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryTag: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  timeLeft: { color: colors.textDim, fontSize: 12 },
  icon: { marginBottom: 8 },
  question: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 26, marginBottom: 8 },
  description: { color: colors.textDim, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  endDate: { color: colors.textFaint, fontSize: 12 },
  creator: { color: colors.warning, fontSize: 12, marginTop: 6 },
  resolvedBanner: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' },
  resolvedYes: { backgroundColor: colors.successDim, borderWidth: 1, borderColor: colors.successBorder },
  resolvedNo: { backgroundColor: colors.dangerDim, borderWidth: 1, borderColor: colors.dangerBorder },
  resolvedText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  chartSection: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.borderSoft },
  chartTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  infoSection: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.borderSoft, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: colors.textDim, fontSize: 13 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  analystCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accentDim, minHeight: touch.min },
  analystCardMuted: { backgroundColor: colors.surface, borderColor: colors.borderSoft },
  analystTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  analystSub: { color: colors.textDim, fontSize: 12, marginTop: 2, lineHeight: 16 },
  positionSection: { marginHorizontal: 16, marginBottom: 16 },
  positionTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  positionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  positionSide: { color: colors.accentSoft, fontSize: 16, fontWeight: '700' },
  positionShares: { color: colors.text, fontSize: 14, fontWeight: '600' },
  positionAvg: { color: colors.textDim, fontSize: 13 },
  positionInvested: { color: colors.textDim, fontSize: 13 },
  tradeButtons: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tradeBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 10, gap: 4 },
  tradeYes: { backgroundColor: colors.successDim, borderWidth: 1, borderColor: colors.successBorder },
  tradeNo: { backgroundColor: colors.dangerDim, borderWidth: 1, borderColor: colors.dangerBorder },
  tradeBtnLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  tradeBtnPrice: { fontSize: 13, fontWeight: '600', fontFamily: 'monospace', color: colors.text },
  missingMarket: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.danger, fontSize: 16, textAlign: 'center' },
  errorBack: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: 20, marginTop: 12 },
  errorBackContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});
