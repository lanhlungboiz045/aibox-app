// screens/admin/AdminHomeScreen.jsx — Dashboard CMS (chỉ System Admin)
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { formatToken, formatTokenShort, formatTimeLeft } from '../../utils/format';

export function AdminHomeScreen({ navigation }) {
  const { state, setUserStatus } = useApp();
  const insets = useSafeAreaInsets();

  const accounts = state.accounts;
  // Trader nền (provider system) chỉ để có dữ liệu transfer/copy trade, không phải người dùng thật
  const realAccounts = accounts.filter(a => a.provider !== 'system');
  const totalSupply = accounts.reduce((sum, a) => sum + a.tokenBalance, 0);
  const totalVolume = state.markets.reduce((sum, m) => sum + (m.volume || 0), 0);
  const openMarkets = state.markets.filter(m => !m.resolved);
  const overdue = openMarkets.filter(m => new Date(m.endDate).getTime() < Date.now());
  const banned = realAccounts.filter(a => a.status === 'banned');
  const aiSpend = accounts.reduce((sum, a) => sum + (a.totalSpentOnAI || 0), 0);
  const storeSpend = accounts.reduce((sum, a) => sum + (a.totalSpentOnStore || 0), 0);

  const stats = [
    { label: 'Người dùng', value: realAccounts.length, icon: '\u{1F465}', color: '#6C5CE7' },
    { label: 'Market mở', value: openMarkets.length, icon: '\u{1F4C8}', color: '#00CE7E' },
    { label: 'Token lưu hành', value: formatTokenShort(totalSupply), icon: '\u{1F4B0}', color: '#FFB74D' },
    { label: 'Volume (tất cả)', value: formatTokenShort(totalVolume), icon: '\u{1F4CA}', color: '#4285F4' },
    { label: 'Chi cho AI', value: formatTokenShort(aiSpend), icon: '\u{1F916}', color: '#10A37F' },
    { label: 'Sink (Store)', value: formatTokenShort(storeSpend), icon: '\u{1F6D2}', color: '#FF6B6B' },
  ];

  const links = [
    { label: 'Quản lý Markets', sub: `${openMarkets.length} đang mở · resolve thủ công`, icon: '\u{1F4C8}', screen: 'AdminMarkets' },
    { label: 'Giá AI Models', sub: `${state.aiModels.length} model · chỉnh giá & bảo trì`, icon: '\u{1F4B5}', screen: 'AdminAIModels' },
    { label: 'Người dùng & phân quyền', sub: `${realAccounts.length} tài khoản · ${banned.length} bị khoá`, icon: '\u{1F465}', screen: 'AdminUsers' },
    { label: 'Rủi ro & dòng tiền', sub: 'Phát hiện rửa token qua Transfer', icon: '\u{1F6A8}', screen: 'AdminRisk' },
    { label: 'Tạo market mới', sub: 'Tạo với tư cách System Admin', icon: '\u{2795}', screen: 'CreateMarket' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>{'\u{1F6E1}'} Admin CMS</Text>
        <View style={{ width: 50 }} />
      </View>

      {overdue.length > 0 && (
        <TouchableOpacity style={styles.alertBox} onPress={() => navigation.navigate('AdminMarkets')}>
          <Text style={styles.alertText}>{'\u{26A0}'} {overdue.length} market đã quá hạn nhưng chưa resolve</Text>
          <Text style={styles.alertArrow}>{'\u{276F}'}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.grid}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Công cụ quản trị</Text>
        {links.map(link => (
          <TouchableOpacity key={link.screen} style={styles.linkRow} onPress={() => navigation.navigate(link.screen)}>
            <Text style={styles.linkIcon}>{link.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.linkSub}>{link.sub}</Text>
            </View>
            <Text style={styles.linkArrow}>{'\u{276F}'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {banned.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản bị khoá</Text>
          {banned.map(account => (
            <View key={account.id} style={styles.banRow}>
              <Text style={styles.banName}>{account.avatar} {account.username}</Text>
              <TouchableOpacity style={styles.unbanBtn} onPress={() => setUserStatus(account.id, 'active')}>
                <Text style={styles.unbanText}>Mở khoá</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.footnote}>
        Role và trạng thái người dùng ghi vào Firestore (users/{'{uid}'}) nên mọi thiết bị nhận thay đổi ngay.
        Dữ liệu ví/trade vẫn là mô phỏng trên client — production nên thêm audit log ở server.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  alertBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255, 107, 107, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.35)' },
  alertText: { flex: 1, color: '#FF6B6B', fontSize: 12 },
  alertArrow: { color: '#FF6B6B', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { width: '31%', flexGrow: 1, backgroundColor: '#1A1D24', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  statIcon: { fontSize: 16, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { color: '#8E8E93', fontSize: 10, marginTop: 2, textAlign: 'center' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1D24', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#2A2E36', marginBottom: 6 },
  linkIcon: { fontSize: 18 },
  linkLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  linkSub: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  linkArrow: { color: '#5C5C5C', fontSize: 14 },
  banRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.25)', marginBottom: 6 },
  banName: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  unbanBtn: { backgroundColor: 'rgba(0, 206, 126, 0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0, 206, 126, 0.4)' },
  unbanText: { color: '#00CE7E', fontSize: 12, fontWeight: '700' },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 20 },
});
