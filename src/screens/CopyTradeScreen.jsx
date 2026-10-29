// screens/CopyTradeScreen.jsx — Quản lý các trader đang copy
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { LEADERBOARD } from '../data/mockData';
import { formatToken, formatTokenShort } from '../utils/format';

export function CopyTradeScreen({ navigation }) {
  const { state, myCopyTrades, followTrader, unfollowTrader, toggleCopyTrade, simulateCopyTrade } = useApp();
  const insets = useSafeAreaInsets();
  const user = state.user;

  const openMarkets = state.markets.filter(m => !m.resolved);
  const suggestions = LEADERBOARD
    .filter(row => row.username !== user.username)
    .filter(row => !myCopyTrades.some(config => config.leaderId === row.id))
    .slice(0, 5);

  const simulate = (config) => {
    if (openMarkets.length === 0) { Alert.alert('Không có market', 'Hiện không có market đang mở.'); return; }
    const market = openMarkets[Math.floor(Math.random() * openMarkets.length)];
    const side = Math.random() > 0.5 ? 'YES' : 'NO';
    simulateCopyTrade(config.leaderId, market.id, side, 50);
    Alert.alert(
      'Đã mô phỏng lệnh',
      `${config.leaderName} mở ${side} 50 shares ở "${market.question}".\n\nCác follower đang bật copy trade đã mua theo (nếu đủ token).`
    );
  };

  const totalEnabled = myCopyTrades.filter(item => item.enabled).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>{'\u{1F4CB}'} Copy Trade</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Đang theo dõi</Text>
          <Text style={styles.summaryValue}>{myCopyTrades.length} trader</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.summaryLabel}>Đang bật</Text>
          <Text style={[styles.summaryValue, { color: '#00CE7E' }]}>{totalEnabled}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Cấu hình của bạn</Text>
      {myCopyTrades.length === 0 ? (
        <Text style={styles.empty}>
          Chưa copy trader nào. Vào tab Xếp hạng, chọn một trader rồi bấm "Theo dõi & Copy trade".
        </Text>
      ) : (
        myCopyTrades.map(config => (
          <View key={config.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.avatar}>{'\u{1F4C8}'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{config.leaderName}</Text>
                <Text style={styles.meta}>
                  Tối đa {formatToken(config.maxPerTrade)} {'\u{1F4B0}'}/lệnh · {config.enabled ? 'đang bật' : 'tạm dừng'}
                </Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: config.enabled ? '#00CE7E' : '#5C5C5C' }]} />
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => toggleCopyTrade(config.id)}>
                <Text style={styles.smallBtnText}>{config.enabled ? 'Tạm dừng' : 'Bật lại'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => simulate(config)}>
                <Text style={styles.smallBtnText}>Mô phỏng lệnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, styles.dangerBtn]}
                onPress={() => {
                  Alert.alert('Bỏ theo dõi', `Ngừng copy trade theo ${config.leaderName}?`, [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Bỏ', style: 'destructive', onPress: () => unfollowTrader(config.leaderId) },
                  ]);
                }}
              >
                <Text style={[styles.smallBtnText, { color: '#FF6B6B' }]}>Bỏ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {suggestions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Gợi ý từ Leaderboard</Text>
          {suggestions.map(trader => (
            <View key={trader.id} style={styles.suggestRow}>
              <Text style={styles.suggestAvatar}>{trader.avatar}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestName}>{trader.username}</Text>
                <Text style={styles.suggestMeta}>#{trader.rank} · {formatTokenShort(trader.tokenBalance)} {'\u{1F4B0}'}</Text>
              </View>
              <TouchableOpacity style={styles.followSmall} onPress={() => followTrader(trader.id, trader.username, 1000)}>
                <Text style={styles.followSmallText}>Theo dõi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileSmall}
                onPress={() => navigation.navigate('TraderProfile', { trader })}
              >
                <Text style={styles.profileSmallText}>Xem</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          {'\u{26A0}'} Copy trade thật dễ bị thao túng giá (follow đông → đẩy giá → thoát). Nếu triển khai thật: giới hạn % số dư, delay vài giây, chỉ cho market có thanh khoản cao, và hiển thị rõ đây không phải lời khuyên đầu tư.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, padding: 16, borderWidth: 1, borderColor: '#2A2E36' },
  summaryLabel: { color: '#8E8E93', fontSize: 11 },
  summaryValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 2 },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', paddingHorizontal: 16, marginTop: 18, marginBottom: 8 },
  empty: { color: '#5C5C5C', fontSize: 12, lineHeight: 18, paddingHorizontal: 16 },
  card: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#2A2E36' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { fontSize: 22 },
  name: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  meta: { color: '#8E8E93', fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#22262E' },
  smallBtn: { flex: 1, backgroundColor: '#22262E', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  dangerBtn: { borderColor: 'rgba(255, 107, 107, 0.3)' },
  smallBtnText: { color: '#E0E0E0', fontSize: 11, fontWeight: '600' },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1D24', borderRadius: 10, marginHorizontal: 16, marginBottom: 6, padding: 10, borderWidth: 1, borderColor: '#2A2E36' },
  suggestAvatar: { fontSize: 20 },
  suggestName: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  suggestMeta: { color: '#5C5C5C', fontSize: 10, marginTop: 1, fontFamily: 'monospace' },
  followSmall: { backgroundColor: '#6C5CE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  followSmallText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  profileSmall: { backgroundColor: '#22262E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#2A2E36' },
  profileSmallText: { color: '#8E8E93', fontSize: 11 },
  warning: { marginHorizontal: 16, marginTop: 18, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255, 183, 77, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.25)' },
  warningText: { color: '#FFB74D', fontSize: 11, lineHeight: 17 },
});
