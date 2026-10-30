// screens/admin/AdminUsersScreen.jsx — Ban/unban + phân quyền
// Nguồn dữ liệu: Firestore users/{uid} (xem src/services/users.js).
// Ví token / số trade vẫn lấy từ player record local (AsyncStorage) để hiển thị.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS, ROLE_COLORS, PROVIDER_LABELS } from '../../data/accounts';
import { formatTokenShort } from '../../utils/format';
import { colors, centeredContent, touch } from '../../theme/tokens';

const ROLE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'user', label: 'User' },
  { key: 'creator', label: 'Creator' },
  { key: 'admin', label: 'Admin' },
  { key: 'banned', label: 'Bị khoá' },
];

export function AdminUsersScreen({ navigation }) {
  const { state, setUserStatus, setUserRole, loadUserDirectory } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const me = state.user;

  // Đọc danh sách hồ sơ từ Firestore; lỗi rules/mạng → hiện banner, không chặn UI
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadUserDirectory();
      setUsers(result.users || []);
      setError(result.error || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [loadUserDirectory]);

  useEffect(() => { refresh(); }, [refresh]);

  // Ghép hồ sơ Firestore với player record local để có số dư/trade
  const rows = users.map(profile => {
    const local = state.accounts.find(a => a.id === profile.id) || null;
    return {
      id: profile.id,
      email: profile.email || '',
      username: profile.username || profile.displayName || 'Người dùng',
      avatar: profile.avatar || local?.avatar || '\u{1F464}',
      role: profile.role || 'user',
      status: profile.status || 'active',
      provider: profile.provider || 'google',
      tokenBalance: local?.tokenBalance ?? 0,
      transactions: local?.transactions || [],
    };
  });

  const visible = rows.filter(row => {
    const keyword = search.trim().toLowerCase();
    const matchSearch =
      row.username.toLowerCase().includes(keyword) || row.email.toLowerCase().includes(keyword);
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'banned') return row.status === 'banned';
    return row.role === filter && row.status !== 'banned';
  });

  const applyRole = async (account, role) => {
    try {
      const result = await setUserRole(account.id, role);
      if (result.ok) {
        setUsers(prev => prev.map(u => (u.id === account.id ? { ...u, role } : u)));
      } else {
        Alert.alert('Không cập nhật được', result.error || 'Quyền người dùng chưa được lưu.');
      }
    } catch (mutationError) {
      Alert.alert(
        'Không cập nhật được',
        mutationError instanceof Error ? mutationError.message : 'Quyền người dùng chưa được lưu.',
      );
    }
  };

  const applyStatus = async (account, status) => {
    try {
      const result = await setUserStatus(account.id, status);
      if (result.ok) {
        setUsers(prev => prev.map(u => (u.id === account.id ? { ...u, status } : u)));
      } else {
        Alert.alert('Không cập nhật được', result.error || 'Trạng thái người dùng chưa được lưu.');
      }
    } catch (mutationError) {
      Alert.alert(
        'Không cập nhật được',
        mutationError instanceof Error ? mutationError.message : 'Trạng thái người dùng chưa được lưu.',
      );
    }
  };

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
        { text: 'Standard User', onPress: () => applyRole(account, 'user') },
        { text: 'Market Creator', onPress: () => applyRole(account, 'creator') },
        { text: 'System Admin', onPress: () => applyRole(account, 'admin') },
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
        ? `${account.username} sẽ bị đăng xuất ngay và không thể đăng nhập lại cho tới khi mở khoá.`
        : `${account.username} có thể đăng nhập lại bình thường.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: banning ? 'Khoá' : 'Mở khoá',
          style: banning ? 'destructive' : 'default',
          onPress: () => applyStatus(account, banning ? 'banned' : 'active'),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Người dùng</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tải lại danh sách người dùng"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          style={styles.refreshButton}
          onPress={refresh}
        >
          <Text style={styles.refreshBtn}>{loading ? '…' : '\u{21BB}'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm username hoặc email..."
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          accessibilityLabel="Tìm theo username hoặc email"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {ROLE_FILTERS.map(item => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.key }}
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.count}>
        {loading ? 'Đang tải từ Firestore…' : `${visible.length}/${rows.length} tài khoản`}
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{'\u{26A0}'} {error}</Text>
          <Text style={styles.errorHint}>
            Danh sách này đọc từ Firestore — cần deploy firestore.rules và bật Firestore Database.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Thử tải lại danh sách người dùng"
            accessibilityState={{ disabled: loading }}
            disabled={loading}
            style={styles.retryButton}
            onPress={refresh}
          >
            <Text style={styles.retryText}>{loading ? 'Đang tải…' : 'Thử lại'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {visible.map(account => {
        const banned = account.status === 'banned';
        const isMe = account.id === me.id;
        const trades = account.transactions.filter(tx => ['BUY', 'SELL'].includes(tx.type)).length;

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
                <TouchableOpacity accessibilityRole="button" style={styles.roleBtn} onPress={() => changeRole(account)}>
                  <Text style={styles.roleBtnText}>Đổi quyền</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.banBtn, banned && styles.unbanBtn]}
                  onPress={() => toggleBan(account)}
                >
                  <Text style={[styles.banBtnText, banned && { color: colors.success }]}>
                    {banned ? 'Mở khoá' : 'Khoá tài khoản'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {!loading && visible.length === 0 && !error && (
        <Text style={styles.empty}>Chưa có người dùng nào đăng nhập bằng Google.</Text>
      )}

      <Text style={styles.footnote}>
        Role và trạng thái lưu ở Firestore users/{'{uid}'} nên admin đổi là mọi máy cập nhật ngay.
        Số dư token/trade là dữ liệu local của thiết bị này.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minWidth: 50, minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  refreshButton: { width: touch.min, minHeight: touch.min, alignItems: 'flex-end', justifyContent: 'center' },
  refreshBtn: { color: colors.accentSoft, fontSize: 18, fontWeight: '700', width: 40, textAlign: 'center' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  search: { backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 14, paddingHorizontal: 14, minHeight: touch.min },
  filterRow: { paddingHorizontal: 16, gap: touch.gap, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, minHeight: touch.min, justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  filterText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.accentSoft },
  count: { color: colors.textFaint, fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  errorBox: { backgroundColor: colors.dangerDim, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 10, marginHorizontal: 16, marginBottom: 10, padding: 12 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  errorHint: { color: colors.danger, fontSize: 12, lineHeight: 15, marginTop: 6 },
  retryButton: { alignSelf: 'flex-start', minHeight: touch.min, justifyContent: 'center', paddingHorizontal: 8, marginTop: 4 },
  retryText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  cardBanned: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerDim },
  cardHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { fontSize: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { color: colors.text, fontSize: 13, fontWeight: '600' },
  meTag: { color: colors.accentSoft, fontSize: 12, fontWeight: '700' },
  roleTag: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, overflow: 'hidden' },
  bannedTag: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  email: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  meta: { color: colors.textFaint, fontSize: 12, marginTop: 3, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  roleBtn: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, minHeight: touch.min, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  roleBtnText: { color: colors.accentSoft, fontSize: 12, fontWeight: '600' },
  banBtn: { flex: 1, backgroundColor: colors.dangerDim, borderRadius: 8, minHeight: touch.min, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.dangerBorder },
  unbanBtn: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  banBtnText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', padding: 24 },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
