// screens/ProfileScreen.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken, formatDate } from '../utils/format';

export function ProfileScreen({ navigation }) {
  const { state, resetToken, resolveMarket, canClaimDaily, claimDailyReward } = useApp();
  const insets = useSafeAreaInsets();
  const user = state.user;

  const totalTrades = user.transactions.filter(t => ['BUY', 'SELL'].includes(t.type)).length;
  const resolveTxs = user.transactions.filter(t => t.type === 'RESOLVE');
  const wins = resolveTxs.filter(t => t.amount > 0).length;
  const winRate = resolveTxs.length > 0 ? Math.round((wins / resolveTxs.length) * 100) : 0;
  const aiCalls = user.transactions.filter(t => t.type === 'AI_CALL').length;
  const transfers = user.transactions.filter(t => t.type === 'TRANSFER_OUT').length;
  const unresolvedMarkets = state.markets.filter(m => !m.resolved);

  const handleReset = () => {
    Alert.alert('Reset token', 'Bạn có chắc muốn reset về 10,000 token? Tất cả positions và transactions sẽ bị xóa.',
      [{ text: 'Hủy', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => { resetToken(); Alert.alert('Đã reset', 'Token đã về 10,000.'); } }]);
  };

  const handleResolveRandom = () => {
    if (unresolvedMarkets.length === 0) { Alert.alert('Không có market', 'Tất cả markets đã được resolve!'); return; }
    const random = unresolvedMarkets[Math.floor(Math.random() * unresolvedMarkets.length)];
    const outcome = Math.random() > 0.5 ? 'YES' : 'NO';
    Alert.alert('Resolve market', `"${random.question}"\n\nKết quả: ${outcome}`,
      [{ text: 'Hủy', style: 'cancel' }, { text: 'Resolve', onPress: () => { resolveMarket(random.id, outcome); Alert.alert('Đã resolve', `Kết quả: ${outcome}`); } }]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.avatar}>{user.avatar}</Text>
        <Text style={styles.username}>{user.username}</Text>
        <View style={styles.rankRow}>
          <Text style={styles.rank}>{'\u{1F3C6}'} Rank #{user.rank}</Text>
          <Text style={styles.joined}>Tham gia: {formatDate(user.joinedDate)}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Token balance</Text>
          <Text style={styles.balanceValue}>{formatToken(user.tokenBalance)} {'\u{1F4B0}'}</Text>
        </View>
      </View>

      {canClaimDaily && (
        <TouchableOpacity style={styles.dailyBtn} onPress={() => { claimDailyReward(); Alert.alert('Nhận thưởng', 'Đã nhận 2,000+ token!'); }}>
          <Text style={styles.dailyBtnText}>{'\u{1F381}'} Nhận thưởng hàng ngày</Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F4CA}'} Thống kê</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{totalTrades}</Text><Text style={styles.statLabel}>Trades</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: winRate >= 50 ? '#00CE7E' : '#FF6B6B' }]}>{winRate}%</Text><Text style={styles.statLabel}>Win rate</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{aiCalls}</Text><Text style={styles.statLabel}>AI calls</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{transfers}</Text><Text style={styles.statLabel}>Transfers</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F527}'} Actions</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Transfer')}>
          <Text style={styles.actionIcon}>{'\u{1F4B8}'}</Text><Text style={styles.actionText}>Chuyển token</Text><Text style={styles.actionArrow}>{'\u{276F}'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleResolveRandom}>
          <Text style={styles.actionIcon}>{'\u{2696}'}</Text><Text style={styles.actionText}>Resolve random market</Text><Text style={styles.actionArrow}>{'\u{276F}'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleReset}>
          <Text style={styles.actionIcon}>{'\u{1F504}'}</Text><Text style={[styles.actionText, { color: '#FF6B6B' }]}>Reset token (demo)</Text><Text style={styles.actionArrow}>{'\u{276F}'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{'\u{26A0}'} AIBox là nền tảng giải trí. Token là credit nội bộ, không có giá trị tiền tệ và không thể đổi tiền thật. Prediction market là game dự đoán, không phải cá cược.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  profileCard: { backgroundColor: '#1A1D24', borderRadius: 16, marginHorizontal: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36', marginBottom: 12 },
  avatar: { fontSize: 56, marginBottom: 8 },
  username: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  rankRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  rank: { color: '#FFB74D', fontSize: 13, fontWeight: '600' },
  joined: { color: '#5C5C5C', fontSize: 12 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F1115', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, width: '100%', justifyContent: 'center' },
  balanceLabel: { color: '#8E8E93', fontSize: 14 },
  balanceValue: { color: '#A78BFA', fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  dailyBtn: { backgroundColor: 'rgba(255, 183, 77, 0.15)', marginHorizontal: 16, marginBottom: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.3)' },
  dailyBtnText: { color: '#FFB74D', fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 16, paddingHorizontal: 16 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: '#1A1D24', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { color: '#8E8E93', fontSize: 12, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#2A2E36', marginBottom: 6, gap: 12 },
  dangerBtn: { borderColor: 'rgba(255, 107, 107, 0.2)' },
  actionIcon: { fontSize: 18 },
  actionText: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  actionArrow: { color: '#5C5C5C', fontSize: 14 },
  disclaimer: { backgroundColor: 'rgba(255, 183, 77, 0.08)', borderRadius: 10, marginHorizontal: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.2)' },
  disclaimerText: { color: '#FFB74D', fontSize: 12, lineHeight: 18 },
});
