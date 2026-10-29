// screens/ProfileScreen.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, ROLE_COLORS, PROVIDER_LABELS } from '../data/accounts';
import { formatToken, formatDate } from '../utils/format';

// Hiển thị thời gian còn lại của phiên (mock refresh token 7 ngày)
function formatSessionLeft(expiresAt) {
  if (!expiresAt) return '—';
  const left = expiresAt - Date.now();
  if (left <= 0) return 'đã hết hạn';
  const days = Math.floor(left / (24 * 60 * 60 * 1000));
  const hours = Math.floor((left % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `còn ${days} ngày ${hours}h`;
  const minutes = Math.max(1, Math.floor((left % (60 * 60 * 1000)) / (60 * 1000)));
  return `còn ${hours}h ${minutes}m`;
}

export function ProfileScreen({ navigation }) {
  const {
    state, resetToken, canClaimDaily, claimDailyReward, nextDailyReward,
    signOut, expireSession, unreadNotifications, myCopyTrades, questState,
  } = useApp();
  const insets = useSafeAreaInsets();
  const user = state.user;
  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const canCreateMarket = isAdmin || user.role === 'creator';

  const totalTrades = user.transactions.filter(t => ['BUY', 'SELL'].includes(t.type)).length;
  const resolveTxs = user.transactions.filter(t => t.type === 'RESOLVE');
  const wins = resolveTxs.filter(t => t.amount > 0).length;
  const winRate = resolveTxs.length > 0 ? Math.round((wins / resolveTxs.length) * 100) : 0;
  const aiCalls = user.transactions.filter(t => t.type === 'AI_CALL').length;
  const transfers = user.transactions.filter(t => t.type === 'TRANSFER_OUT').length;

  const claimedQuests = questState?.claimed?.length || 0;

  const handleReset = () => {
    Alert.alert('Reset token', 'Bạn có chắc muốn reset về 10,000 token? Tất cả positions và transactions của tài khoản này sẽ bị xóa.',
      [{ text: 'Hủy', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => { resetToken(); Alert.alert('Đã reset', 'Token đã về 10,000.'); } }]);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Đăng xuất',
      `Đăng xuất khỏi ${user.email}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  const handleExpireDemo = () => {
    Alert.alert(
      'Mô phỏng hết hạn phiên',
      'Phiên hiện tại sẽ bị huỷ ngay như thể refresh token đã hết hạn. Bạn sẽ bị đưa về màn đăng nhập.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hết hạn ngay', style: 'destructive', onPress: () => expireSession() },
      ]
    );
  };

  const link = (icon, label, onPress, options = {}) => (
    <TouchableOpacity
      key={label}
      style={[styles.actionBtn, options.danger && styles.dangerBtn]}
      onPress={onPress}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionText, options.danger && { color: '#FF6B6B' }]}>{label}</Text>
        {options.hint ? <Text style={styles.actionHint}>{options.hint}</Text> : null}
      </View>
      {options.badge ? <Text style={styles.actionBadge}>{options.badge}</Text> : null}
      <Text style={styles.actionArrow}>{'\u{276F}'}</Text>
    </TouchableOpacity>
  );

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

        <View style={styles.badgeRow}>
          <Text style={[styles.roleBadge, { color: ROLE_COLORS[user.role], borderColor: ROLE_COLORS[user.role] + '66' }]}>
            {ROLE_LABELS[user.role]}
          </Text>
          <Text style={styles.providerBadge}>{PROVIDER_LABELS[user.provider] || user.provider}</Text>
        </View>

        <Text style={styles.email} numberOfLines={1}>{user.email}</Text>

        <View style={styles.rankRow}>
          <Text style={styles.rank}>{'\u{1F3C6}'} Rank #{user.rank}</Text>
          <Text style={styles.joined}>Tham gia: {formatDate(user.joinedDate)}</Text>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Token balance</Text>
          <Text style={styles.balanceValue}>{formatToken(user.tokenBalance)} {'\u{1F4B0}'}</Text>
        </View>

        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Phiên đăng nhập</Text>
          <Text style={styles.sessionValue}>{formatSessionLeft(state.session?.expiresAt)}</Text>
        </View>
      </View>

      {canClaimDaily ? (
        <TouchableOpacity
          style={styles.dailyBtn}
          onPress={() => {
            claimDailyReward();
            Alert.alert('Nhận thưởng', `Đã nhận ${formatToken(nextDailyReward)} token!`);
          }}
        >
          <Text style={styles.dailyBtnText}>{'\u{1F381}'} Nhận {formatToken(nextDailyReward)} token hôm nay</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.dailyBtnDone} onPress={() => navigation.navigate('Quests')}>
          <Text style={styles.dailyBtnDoneText}>{'\u{2713}'} Đã nhận thưởng hôm nay · xem nhiệm vụ</Text>
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

      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'\u{1F6E1}'} System Admin</Text>
          {link('\u{2699}', 'Admin Dashboard', () => navigation.navigate('AdminHome'), { hint: 'Markets, giá AI, users, rủi ro dòng tiền' })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F9F0}'} Công cụ</Text>
        {canCreateMarket && link('\u{2795}', 'Tạo market', () => navigation.navigate('CreateMarket'), {
          hint: user.role === 'creator' ? 'Bạn là Market Creator · nhận 2% fee' : 'Tạo kèo với tư cách admin',
        })}
        {link('\u{1F6D2}', 'Store', () => navigation.navigate('Store'), { hint: 'Khung avatar, màu tên, prompt, Creator Pass' })}
        {link('\u{1F3AF}', 'Nhiệm vụ ngày', () => navigation.navigate('Quests'), { hint: `${claimedQuests} nhiệm vụ đã nhận hôm nay` })}
        {link('\u{1F514}', 'Thông báo', () => navigation.navigate('Notifications'), {
          hint: 'Kết quả kèo, transfer, copy trade',
          badge: unreadNotifications > 0 ? String(unreadNotifications) : null,
        })}
        {link('\u{1F4CB}', 'Copy Trade', () => navigation.navigate('CopyTrade'), { hint: `${myCopyTrades.length} trader đang theo dõi` })}
        {link('\u{1F4B8}', 'Chuyển token', () => navigation.navigate('Transfer'), { hint: 'Gửi token cho người dùng khác' })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F510}'} Tài khoản</Text>
        {link('\u{1F6AA}', 'Đăng xuất', handleSignOut, { danger: true })}
        {link('\u{23F1}', 'Mô phỏng phiên hết hạn', handleExpireDemo, { hint: 'Kiểm tra auto-logout khi refresh token hết hạn' })}
        {link('\u{1F504}', 'Reset token (demo)', handleReset, { danger: true, hint: 'Chỉ reset ví của tài khoản hiện tại' })}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{'\u{26A0}'} AIBox là nền tảng giải trí. Token là credit nội bộ, không có giá trị tiền tệ và không thể đổi tiền thật. Prediction market là game dự đoán, không phải cá cược.</Text>
      </View>
      <Text style={styles.mockNote}>
        Auth trong bản demo chạy hoàn toàn ở client (AsyncStorage) — không phải bảo mật thật. Production phải xác thực ở server.
      </Text>
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
  username: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge: { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  providerBadge: { color: '#8E8E93', fontSize: 10, fontWeight: '600', backgroundColor: '#22262E', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  email: { color: '#8E8E93', fontSize: 12, marginBottom: 10, maxWidth: '90%' },
  rankRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  rank: { color: '#FFB74D', fontSize: 13, fontWeight: '600' },
  joined: { color: '#5C5C5C', fontSize: 12 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F1115', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, width: '100%', justifyContent: 'center' },
  balanceLabel: { color: '#8E8E93', fontSize: 14 },
  balanceValue: { color: '#A78BFA', fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#22262E' },
  sessionLabel: { color: '#5C5C5C', fontSize: 11 },
  sessionValue: { color: '#00CE7E', fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },
  dailyBtn: { backgroundColor: 'rgba(255, 183, 77, 0.15)', marginHorizontal: 16, marginBottom: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.3)' },
  dailyBtnText: { color: '#FFB74D', fontSize: 14, fontWeight: '600' },
  dailyBtnDone: { backgroundColor: '#1A1D24', marginHorizontal: 16, marginBottom: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  dailyBtnDoneText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 16, paddingHorizontal: 16 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: '#1A1D24', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { color: '#8E8E93', fontSize: 12, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#2A2E36', marginBottom: 6, gap: 12 },
  dangerBtn: { borderColor: 'rgba(255, 107, 107, 0.2)' },
  actionIcon: { fontSize: 18 },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  actionHint: { color: '#5C5C5C', fontSize: 10, marginTop: 2 },
  actionBadge: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', backgroundColor: '#6C5CE7', borderRadius: 9, minWidth: 18, textAlign: 'center', paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  actionArrow: { color: '#5C5C5C', fontSize: 14 },
  disclaimer: { backgroundColor: 'rgba(255, 183, 77, 0.08)', borderRadius: 10, marginHorizontal: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.2)' },
  disclaimerText: { color: '#FFB74D', fontSize: 12, lineHeight: 18 },
  mockNote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 10 },
});
