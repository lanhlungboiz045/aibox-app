// screens/admin/AdminUsersScreen.jsx — Ban/unban + phân quyền
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS, ROLE_COLORS, PROVIDER_LABELS } from '../../data/accounts';
import { formatToken, formatTokenShort } from '../../utils/format';

const ROLE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'user', label: 'User' },
  { key: 'creator', label: 'Creator' },
  { key: 'admin', label: 'Admin' },
  { key: 'banned', label: 'Bị khoá' },
];

export function AdminUsersScreen({ navigation }) {
  const { state, setUserStatus, setUserRole } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const me = state.user;

  const accounts = state.accounts.filter(account => {
    const matchSearch =
      account.username.toLowerCase().includes(search.trim().toLowerCase()) ||
      account.email.toLowerCase().includes(search.trim().toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'banned') return account.status === 'banned';
    return account.role === filter && account.status !== 'banned';
  });

  const changeRole = (account) => {
    if (account.id === me.id) {
      Alert.alert('Không thể', 'Bạn không thể đổi quyền của chính mình.');
      return;
    }
    Alert.alert(
      `Phân quyền: ${account.username}`,
      `Hiện tại: ${ROLE_LABELS[account.role]}`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Standard User', onPress: () => setUserRole(account.id, 'user') },
        { text: 'Market Creator', onPress: () => setUserRole(account.id, 'creator') },
        { text: 'System Admin', onPress: () => setUserRole(account.id, 'admin') },
      ]
    );
  };

  const toggleBan = (account) => {
    if (account.id === me.id) {
      Alert.alert('Không thể', 'Bạn không thể tự khoá tài khoản đang đăng nhập.');
      return;
    }
    const banning = account.status !== 'banned';
    Alert.alert(
      banning ? 'Khoá tài khoản' : 'Mở khoá tài khoản',
      banning
        ? `${account.username} sẽ bị đăng xuất ngay và không thể đăng nhập lại.\n\nLý do nên ghi vào audit log khi lên production.`
        : `${account.username} có thể đăng nhập lại bình thường.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: banning ? 'Khoá' : 'Mở khoá',
          style: banning ? 'destructive' : 'default',
          onPress: () => setUserStatus(account.id, banning ? 'banned' : 'active'),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Người dùng</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm username hoặc email..."
          placeholderTextColor="#5C5C5C"
          autoCapitalize="none"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {ROLE_FILTERS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.count}>{accounts.length} tài khoản</Text>

      {accounts.map(account => {
        const banned = account.status === 'banned';
        const isMe = account.id === me.id;
        const trades = (account.transactions || []).filter(tx => ['BUY', 'SELL'].includes(tx.type)).length;

        return (
          <View key={account.id} style={[styles.card, banned && styles.cardBanned]}>
            <View style={styles.cardHead}>
              <Text style={styles.avatar}>{account.avatar}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{account.username}</Text>
                  {isMe && <Text style={styles.meTag}>Bạn</Text>}
                  <Text style={[styles.roleTag, { color: ROLE_COLORS[account.role], borderColor: ROLE_COLORS[account.role] + '55' }]}>
                    {ROLE_LABELS[account.role]}
                  </Text>
                  {banned && <Text style={styles.bannedTag}>BANNED</Text>}
                </View>
                <Text style={styles.email} numberOfLines={1}>{account.email}</Text>
                <Text style={styles.meta}>
                  {PROVIDER_LABELS[account.provider] || account.provider} · {formatTokenShort(account.tokenBalance)} {'\u{1F4B0}'} · {trades} trades
                </Text>
              </View>
            </View>

            {!isMe && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.roleBtn} onPress={() => changeRole(account)}>
                  <Text style={styles.roleBtnText}>Đổi quyền</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.banBtn, banned && styles.unbanBtn]}
                  onPress={() => toggleBan(account)}
                >
                  <Text style={[styles.banBtnText, banned && { color: '#00CE7E' }]}>
                    {banned ? 'Mở khoá' : 'Khoá tài khoản'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {accounts.length === 0 && <Text style={styles.empty}>Không tìm thấy tài khoản.</Text>}

      <Text style={styles.footnote}>
        Ban ở client chỉ là đổi cờ trong AsyncStorage — người dùng am hiểu vẫn sửa được. Production phải chặn ở API.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  search: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },
  filterRow: { paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#1A1D24', borderWidth: 1, borderColor: '#2A2E36', marginRight: 6 },
  filterChipActive: { backgroundColor: 'rgba(108, 92, 231, 0.15)', borderColor: '#6C5CE7' },
  filterText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  count: { color: '#5C5C5C', fontSize: 11, paddingHorizontal: 16, marginBottom: 8 },
  card: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: '#2A2E36' },
  cardBanned: { borderColor: 'rgba(255, 107, 107, 0.35)', backgroundColor: 'rgba(255, 107, 107, 0.05)' },
  cardHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { fontSize: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  meTag: { color: '#6C5CE7', fontSize: 9, fontWeight: '700' },
  roleTag: { fontSize: 9, fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, overflow: 'hidden' },
  bannedTag: { color: '#FF6B6B', fontSize: 9, fontWeight: '800' },
  email: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  meta: { color: '#5C5C5C', fontSize: 10, marginTop: 3, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#22262E' },
  roleBtn: { flex: 1, backgroundColor: '#22262E', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  roleBtnText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  banBtn: { flex: 1, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.35)' },
  unbanBtn: { backgroundColor: 'rgba(0, 206, 126, 0.1)', borderColor: 'rgba(0, 206, 126, 0.35)' },
  banBtnText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
  empty: { color: '#5C5C5C', fontSize: 13, textAlign: 'center', padding: 24 },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
