// screens/admin/AdminHomeScreen.jsx — Dashboard CMS (chỉ System Admin)
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { AppIcon } from '../../components/ui/AppIcon';
import { AppHeader, TokenIcon } from '../../components/ui';
import { formatToken } from '../../utils/format';
import { logCost } from '../../services/aiLogStore';
import { colors, centeredContent, touch } from '../../theme/tokens';

export function AdminHomeScreen({ navigation }) {
  const { state, setUserStatus } = useApp();
  const insets = useSafeAreaInsets();

  const accounts = state.accounts;
  const realAccounts = accounts;
  const totalSupply = accounts.reduce((sum, a) => sum + a.tokenBalance, 0);
  const banned = realAccounts.filter(a => a.status === 'banned');
  // Số liệu AI lấy từ store log duy nhất — cùng nguồn với Home/Usage/Profile
  // của người dùng nên admin và user luôn thấy cùng một con số.
  const aiSpend = state.aiLogs.reduce((sum, log) => sum + logCost(log), 0);
  const aiCalls = state.aiLogs.length;

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
    { label: 'Token lưu hành', value: formatToken(totalSupply), tokenIcon: true, color: colors.warning },
    { label: 'Lượt gọi AI', value: aiCalls, icon: 'cpu', color: colors.openai },
    { label: 'Chi cho AI', value: formatToken(aiSpend), icon: 'activity', color: colors.success },
    { label: 'Tài khoản bị khoá', value: banned.length, icon: 'user-x', color: colors.danger },
  ];

  const links = [
    { label: 'Giá mô hình AI', sub: `${state.aiModels.length} mô hình · chỉnh giá & bảo trì`, icon: 'cpu', screen: 'AdminAIModels' },
    { label: 'Người dùng & phân quyền', sub: `${realAccounts.length} tài khoản · ${banned.length} bị khoá`, icon: 'users', screen: 'AdminUsers' },
    { label: 'Rủi ro & dòng tiền', sub: 'Phát hiện giao dịch chuyển token bất thường', icon: 'alert-triangle', screen: 'AdminRisk' },
  ];

  return (
    <ScrollView
      style={styles.container}
      stickyHeaderIndices={[0]}
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 24 }]}
    >
      <AppHeader navigation={navigation} title="Quản trị" subtitle="Tổng quan hệ thống" />

      <View style={styles.grid}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            {stat.tokenIcon
              ? <TokenIcon size={18} color={stat.color} />
              : <AppIcon name={stat.icon} size={18} color={stat.color} />}
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { width: '31%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  statValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
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
});
