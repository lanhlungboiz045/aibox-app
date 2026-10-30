// screens/admin/AdminHomeScreen.jsx — Dashboard CMS (chỉ System Admin)
import React from 'react';
import { BackButton } from '../../components/ui/BackButton';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { AppIcon } from '../../components/ui/AppIcon';
import { formatToken, formatTokenShort, formatTimeLeft } from '../../utils/format';
import { colors, centeredContent, touch } from '../../theme/tokens';

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

  const unban = async (account) => {
    try {
      const result = await setUserStatus(account.id, 'active');
      if (!result.ok) {
        Alert.alert('Không mở khoá được', result.error || 'Trạng thái tài khoản chưa được lưu.');
      }
    } catch (error) {
      Alert.alert(
        'Không mở khoá được',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật tài khoản.',
      );
    }
  };

  const stats = [
    { label: 'Người dùng', value: realAccounts.length, icon: 'users', color: colors.accentSoft },
    { label: 'Market mở', value: openMarkets.length, icon: 'trending-up', color: colors.success },
    { label: 'Token lưu hành', value: formatTokenShort(totalSupply), icon: 'database', color: colors.warning },
    { label: 'Volume (tất cả)', value: formatTokenShort(totalVolume), icon: 'bar-chart-2', color: colors.google },
    { label: 'Chi cho AI', value: formatTokenShort(aiSpend), icon: 'cpu', color: colors.openai },
    { label: 'Sink (Store)', value: formatTokenShort(storeSpend), icon: 'shopping-bag', color: colors.danger },
  ];

  const links = [
    { label: 'Quản lý Markets', sub: `${openMarkets.length} đang mở · resolve thủ công`, icon: 'activity', screen: 'AdminMarkets' },
    { label: 'Giá AI Models', sub: `${state.aiModels.length} model · chỉnh giá & bảo trì`, icon: 'cpu', screen: 'AdminAIModels' },
    { label: 'Người dùng & phân quyền', sub: `${realAccounts.length} tài khoản · ${banned.length} bị khoá`, icon: 'users', screen: 'AdminUsers' },
    { label: 'Rủi ro & dòng tiền', sub: 'Phát hiện rửa token qua Transfer', icon: 'alert-triangle', screen: 'AdminRisk' },
    { label: 'Tạo market mới', sub: 'Tạo với tư cách System Admin', icon: 'plus', screen: 'CreateMarket' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Admin CMS</Text>
        <View style={{ width: 50 }} />
      </View>

      {overdue.length > 0 && (
        <TouchableOpacity accessibilityRole="button" style={styles.alertBox} onPress={() => navigation.navigate('AdminMarkets')}>
          <AppIcon name="alert-triangle" size={16} color={colors.danger} />
          <Text style={styles.alertText}>{overdue.length} market đã quá hạn nhưng chưa resolve</Text>
          <AppIcon name="chevron-right" size={16} color={colors.danger} />
        </TouchableOpacity>
      )}

      <View style={styles.grid}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <AppIcon name={stat.icon} size={18} color={stat.color} />
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Công cụ quản trị</Text>
        {links.map(link => (
          <TouchableOpacity accessibilityRole="button" key={link.screen} style={styles.linkRow} onPress={() => navigation.navigate(link.screen)}>
            <AppIcon name={link.icon} size={18} color={colors.textDim} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.linkSub}>{link.sub}</Text>
            </View>
            <AppIcon name="chevron-right" size={16} color={colors.textFaint} />
          </TouchableOpacity>
        ))}
      </View>

      {banned.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản bị khoá</Text>
          {banned.map(account => (
            <View key={account.id} style={styles.banRow}>
              <Text style={styles.banName}>{account.avatar} {account.username}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở khoá ${account.username}`} style={styles.unbanBtn} onPress={() => unban(account)}>
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
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minWidth: 50, minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  alertBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: colors.dangerDim, borderWidth: 1, borderColor: colors.dangerBorder, minHeight: touch.min },
  alertText: { flex: 1, color: colors.danger, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { width: '31%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  statValue: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2, textAlign: 'center' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 6, minHeight: touch.min },
  linkLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  linkSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  banRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.dangerBorder, marginBottom: 6 },
  banName: { flex: 1, color: colors.text, fontSize: 13 },
  unbanBtn: { backgroundColor: colors.successDim, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.successBorder, minHeight: touch.min, justifyContent: 'center' },
  unbanText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 20 },
});
