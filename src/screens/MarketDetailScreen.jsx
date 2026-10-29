// screens/MarketDetailScreen.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { PriceChart } from '../components/PriceChart';
import { TradeSheet } from '../components/TradeSheet';
import { TokenBadge } from '../components/TokenBadge';
import { formatToken, formatTokenShort, formatTimeLeft, formatDate } from '../utils/format';

export function MarketDetailScreen({ route, navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const marketId = route?.params?.marketId;
  const initialSide = (route?.params?.initialSide) || 'YES';
  const market = state.markets.find(m => m.id === marketId);

  const [showTrade, setShowTrade] = useState(false);
  const [tradeSide, setTradeSide] = useState(initialSide);

  if (!market) {
    return (<View style={styles.container}><Text style={styles.error}>Market không tồn tại</Text></View>);
  }

  const userPosition = state.user.positions.find(p => p.marketId === market.id);
  const categoryColors = { sports: '#00CE7E', crypto: '#F7931A', tech: '#4285F4', entertainment: '#FF6B6B', life: '#FFB74D', politics: '#9333EA' };
  const accent = categoryColors[market.category] || '#6C5CE7';

  const openTrade = (side) => { setTradeSide(side); setShowTrade(true); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <TokenBadge size="small" />
      </View>

      <View style={styles.questionSection}>
        <View style={styles.questionHeader}>
          <Text style={[styles.categoryTag, { color: accent }]}>{market.category.toUpperCase()}</Text>
          <Text style={styles.timeLeft}>{formatTimeLeft(market.endDate)}</Text>
        </View>
        <Text style={styles.icon}>{market.icon}</Text>
        <Text style={styles.question}>{market.question}</Text>
        <Text style={styles.description}>{market.description}</Text>
        <Text style={styles.endDate}>Kết thúc: {formatDate(market.endDate)}</Text>
      </View>

      {market.resolved && (
        <View style={[styles.resolvedBanner, market.outcome === 'YES' ? styles.resolvedYes : styles.resolvedNo]}>
          <Text style={styles.resolvedText}>Đã kết thúc — Kết quả: {market.outcome}</Text>
        </View>
      )}

      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>{'\u{1F4C8}'} Giá YES (7 ngày qua)</Text>
        <PriceChart data={market.priceHistory} height={140} />
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Volume</Text><Text style={styles.infoValue}>{formatTokenShort(market.volume)} {'\u{1F4B0}'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Liquidity</Text><Text style={styles.infoValue}>{formatTokenShort(market.liquidity)} {'\u{1F4B0}'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>YES price</Text><Text style={[styles.infoValue, { color: '#00CE7E' }]}>{market.yesPrice} {'\u{1F4B0}'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>NO price</Text><Text style={[styles.infoValue, { color: '#FF6B6B' }]}>{market.noPrice} {'\u{1F4B0}'}</Text></View>
      </View>

      {userPosition && (
        <View style={styles.positionSection}>
          <Text style={styles.positionTitle}>{'\u{1F4BC}'} Position của bạn</Text>
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
          <TouchableOpacity style={[styles.tradeBtn, styles.tradeYes]} onPress={() => openTrade('YES')} activeOpacity={0.8}>
            <Text style={styles.tradeBtnLabel}>Mua YES</Text>
            <Text style={styles.tradeBtnPrice}>{market.yesPrice} {'\u{1F4B0}'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tradeBtn, styles.tradeNo]} onPress={() => openTrade('NO')} activeOpacity={0.8}>
            <Text style={styles.tradeBtnLabel}>Mua NO</Text>
            <Text style={styles.tradeBtnPrice}>{market.noPrice} {'\u{1F4B0}'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.shareBtn} onPress={() => {}}>
        <Text style={styles.shareBtnText}>{'\u{1F4E4}'} Share dự đoán</Text>
      </TouchableOpacity>

      <TradeSheet visible={showTrade} market={market} initialSide={tradeSide} onClose={() => setShowTrade(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600' },
  questionSection: { paddingHorizontal: 16, marginBottom: 16 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryTag: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  timeLeft: { color: '#8E8E93', fontSize: 12 },
  icon: { fontSize: 40, marginBottom: 8 },
  question: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 26, marginBottom: 8 },
  description: { color: '#8E8E93', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  endDate: { color: '#5C5C5C', fontSize: 12 },
  resolvedBanner: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' },
  resolvedYes: { backgroundColor: 'rgba(0, 206, 126, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 206, 126, 0.3)' },
  resolvedNo: { backgroundColor: 'rgba(255, 107, 107, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.3)' },
  resolvedText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  chartSection: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#2A2E36' },
  chartTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  infoSection: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#2A2E36', gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: '#8E8E93', fontSize: 13 },
  infoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  positionSection: { marginHorizontal: 16, marginBottom: 16 },
  positionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  positionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1D24', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2A2E36' },
  positionSide: { color: '#A78BFA', fontSize: 16, fontWeight: '700' },
  positionShares: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  positionAvg: { color: '#8E8E93', fontSize: 13 },
  positionInvested: { color: '#8E8E93', fontSize: 13 },
  tradeButtons: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tradeBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 10, gap: 4 },
  tradeYes: { backgroundColor: 'rgba(0, 206, 126, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 206, 126, 0.4)' },
  tradeNo: { backgroundColor: 'rgba(255, 107, 107, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.4)' },
  tradeBtnLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  tradeBtnPrice: { fontSize: 13, fontWeight: '600', fontFamily: 'monospace', color: '#FFFFFF' },
  shareBtn: { marginHorizontal: 16, backgroundColor: '#22262E', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  shareBtnText: { color: '#8E8E93', fontSize: 14 },
  error: { color: '#FF6B6B', fontSize: 16, textAlign: 'center', marginTop: 100 },
});
