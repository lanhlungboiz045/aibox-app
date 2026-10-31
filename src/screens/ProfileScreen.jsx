// screens/ProfileScreen.jsx — Hồ sơ người dùng (Firebase Auth + Firestore)
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, ROLE_COLORS, PROVIDER_LABELS, AVATARS } from '../data/accounts';
import { formatToken, formatDate } from '../utils/format';
import { logsForUser, summarizeAILogs } from '../services/aiLogStore';
import { colors, centeredContent, touch, spacing } from '../theme/tokens';
import { AppIcon } from '../components/ui/AppIcon';
import { AppHeader, Button, TokenIcon } from '../components/ui';

// Ảnh Google có thể lỗi (mạng/không có ảnh) → fallback emoji avatar
function UserAvatar({ user, size = 96 }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = user.photoURL && !failed;
  return (
    <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {showPhoto ? (
        <Image
          source={{ uri: user.photoURL }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ fontSize: size * 0.55 }}>{user.avatar}</Text>
      )}
    </View>
  );
}

export function ProfileScreen({ navigation }) {
  const {
    state, resetToken, canClaimDaily, claimDailyReward, nextDailyReward,
    signOut, updateMyProfile, unreadNotifications, questState, aiConfig,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

  const user = state.user;

  // Số liệu AI đọc từ store log duy nhất — khớp với Home / Logs / Usage.
  const aiLogs = useMemo(
    () => logsForUser(state.aiLogs, user?.id),
    [state.aiLogs, user?.id]
  );
  const aiSummary = useMemo(() => summarizeAILogs(aiLogs), [aiLogs]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const taiXiuTxs = user.transactions.filter(t => t.type === 'TAIXIU');
  const wins = taiXiuTxs.filter(t => t.amount > 0).length;
  const winRate = taiXiuTxs.length > 0 ? Math.round((wins / taiXiuTxs.length) * 100) : 0;
  const aiCalls = aiSummary.requests;
  const transfers = user.transactions.filter(t => t.type === 'TRANSFER_OUT').length;

  const claimedQuests = questState?.claimed?.length || 0;

  const startEdit = () => {
    setDraftName(user.username);
    setDraftAvatar(user.avatar);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (saving) return;
    const name = draftName.trim();
    if (name.length < 3) {
      Alert.alert('Tên không hợp lệ', 'Tên hiển thị phải có ít nhất 3 ký tự.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateMyProfile({ username: name, avatar: draftAvatar });
      setEditing(false);
      if (result.ok) {
        // Firestore lỗi thì thay đổi vẫn được giữ trên máy, chỉ cảnh báo đồng bộ
        if (result.syncError) {
          Alert.alert('Đã lưu trên máy', `Chưa đồng bộ được lên máy chủ:\n${result.syncError}`);
        }
      } else {
        Alert.alert('Không lưu được', result.error || 'Không thể cập nhật hồ sơ.');
      }
    } catch (error) {
      Alert.alert(
        'Không lưu được',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật hồ sơ.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Đặt lại token', 'Bạn có chắc muốn đặt lại về 10.000 token? Lịch sử giao dịch của tài khoản này sẽ bị xoá.',
      [{ text: 'Huỷ', style: 'cancel' }, { text: 'Đặt lại', style: 'destructive', onPress: () => { resetToken(); Alert.alert('Đã đặt lại', 'Số dư đã về 10.000 token.'); } }]);
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

  const link = (icon, label, onPress, options = {}) => (
    <TouchableOpacity
      accessibilityRole="button"
      key={label}
      style={[styles.actionBtn, options.danger && styles.dangerBtn]}
      onPress={onPress}
    >
      <AppIcon name={icon} size={18} color={options.danger ? colors.danger : colors.accentSoft} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionText, options.danger && { color: colors.danger }]}>{label}</Text>
        {options.hint ? <Text style={styles.actionHint}>{options.hint}</Text> : null}
      </View>
      {options.badge ? <Text style={styles.actionBadge}>{options.badge}</Text> : null}
      <AppIcon name="chevron-right" size={16} color={colors.textFaint} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      stickyHeaderIndices={[0]}
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 32 }]}
    >
      <AppHeader navigation={navigation} title="Hồ sơ" />
      <View style={styles.primaryStats}>
        <View style={styles.primaryStat}>
          <Text style={styles.primaryStatLabel}>Số dư token</Text>
          <View style={styles.primaryStatValueRow}>
            <Text style={styles.primaryStatValue}>{formatToken(user.tokenBalance)}</Text>
            <TokenIcon size={12} />
          </View>
        </View>
        <View style={styles.primaryStat}>
          <Text style={styles.primaryStatLabel}>Lượt gọi AI</Text>
          <Text style={styles.primaryStatValue}>{aiCalls}</Text>
        </View>
        <View style={styles.primaryStat}>
          <Text style={styles.primaryStatLabel}>Đã dùng cho AI</Text>
          <View style={styles.primaryStatValueRow}>
            <Text style={styles.primaryStatValue}>{formatToken(aiSummary.cost)}</Text>
            <TokenIcon size={12} color={colors.textDim} />
          </View>
        </View>
      </View>

      <View style={styles.profileCard}>
        <UserAvatar user={editing ? { ...user, avatar: draftAvatar, photoURL: null } : user} size={64} />

        {editing ? (
          <View style={styles.editBlock}>
            <TextInput
              style={styles.nameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Tên hiển thị"
              placeholderTextColor={colors.textFaint}
              maxLength={24}
              autoCapitalize="none"
            />
            <Text style={styles.avatarPickerLabel}>Chọn avatar</Text>
            <View style={styles.avatarPicker}>
              {AVATARS.map(emoji => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: draftAvatar === emoji }}
                  key={emoji}
                  style={[styles.avatarOption, draftAvatar === emoji && styles.avatarOptionActive]}
                  onPress={() => setDraftAvatar(emoji)}
                >
                  <Text style={styles.avatarOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editActions}>
              <Button label="Hủy" variant="secondary" style={styles.editAction} onPress={() => setEditing(false)} disabled={saving} />
              <Button label="Lưu" style={styles.editAction} onPress={saveEdit} loading={saving} disabled={saving} />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.username}>{user.username}</Text>

            <View style={styles.badgeRow}>
              <Text style={[styles.roleBadge, { color: ROLE_COLORS[user.role], borderColor: ROLE_COLORS[user.role] + '66' }]}>
                {ROLE_LABELS[user.role]}
              </Text>
              <Text style={styles.providerBadge}>{PROVIDER_LABELS[user.provider] || user.provider}</Text>
            </View>

            <Text style={styles.email} numberOfLines={1}>{user.email}</Text>

            <Button label="Sửa hồ sơ" variant="secondary" icon="edit-2" onPress={startEdit} />

            <View style={styles.joinedRow}>
              <Text style={styles.joined}>Tham gia: {formatDate(user.joinedDate)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Trạng thái</Text>
              <Text style={[styles.metaValue, { color: user.status === 'banned' ? colors.danger : colors.success }]}>
                {user.status === 'banned' ? 'Bị khoá' : 'Hoạt động'}
              </Text>
            </View>
          </>
        )}
      </View>

      {state.profileSync && (
        <View style={styles.syncWarn}>
          <Text style={styles.syncWarnText}>
            Chưa đồng bộ được hồ sơ: {state.profileSync}
          </Text>
        </View>
      )}

      {canClaimDaily ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.dailyBtn}
          onPress={() => {
            claimDailyReward();
            Alert.alert('Nhận thưởng', `Đã nhận ${formatToken(nextDailyReward)} token!`);
          }}
        >
          <View style={styles.buttonContent}>
            <AppIcon name="gift" size={16} color={colors.warning} />
            <Text style={styles.dailyBtnText}>Nhận {formatToken(nextDailyReward)} token hôm nay</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity accessibilityRole="button" style={styles.dailyBtnDone} onPress={() => navigation.navigate('Quests')}>
          <View style={styles.buttonContent}>
            <AppIcon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.dailyBtnDoneText}>Đã nhận thưởng hôm nay · xem nhiệm vụ</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thống kê</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{taiXiuTxs.length}</Text><Text style={styles.statLabel}>Ván Tài Xỉu</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: winRate >= 50 ? colors.success : colors.danger }]}>{winRate}%</Text><Text style={styles.statLabel}>Tỷ lệ thắng</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{transfers}</Text><Text style={styles.statLabel}>Lượt chuyển</Text></View>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản trị hệ thống</Text>
          {link('settings', 'Trang quản trị', () => navigation.navigate('AdminHome'), { hint: 'Mô hình AI, người dùng và rủi ro dòng tiền' })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Công cụ</Text>
        {link('info', 'Về AIBox', () => navigation.navigate('DemoAbout'), { hint: 'Thông tin về dữ liệu và cách sử dụng' })}
        {isAdmin && link('cpu', 'Cấu hình AI', () => navigation.navigate('AISettings'), {
          hint: aiConfig?.mode === 'live'
            ? `Trực tiếp · ${aiConfig.model}`
            : 'Chưa có khóa API · đang trả lời mô phỏng',
          badge: aiConfig?.mode === 'live' ? 'Trực tiếp' : 'Mô phỏng',
        })}
        {link('target', 'Nhiệm vụ ngày', () => navigation.navigate('Quests'), { hint: `${claimedQuests} nhiệm vụ đã nhận hôm nay` })}
        {link('list', 'Lịch sử giao dịch', () => navigation.navigate('Transactions'), { hint: 'Xem biến động token của bạn' })}
        {link('bell', 'Thông báo', () => navigation.navigate('Notifications'), {
          hint: 'Tài khoản, chuyển token và phần thưởng',
          badge: unreadNotifications > 0 ? String(unreadNotifications) : null,
        })}
        {link('send', 'Chuyển token', () => navigation.navigate('Transfer'), { hint: 'Gửi token cho người dùng khác' })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        {link('log-out', 'Đăng xuất', handleSignOut, { danger: true, hint: 'Đăng xuất khỏi Google trên thiết bị này' })}
        {link('refresh-cw', 'Đặt lại token', handleReset, { danger: true, hint: 'Chỉ đặt lại ví của tài khoản hiện tại' })}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>AIBox cung cấp công cụ AI và trò chơi Tài Xỉu. Token là điểm nội bộ, không có giá trị tiền tệ và không thể đổi thành tiền thật.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  primaryStats: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 10 },
  primaryStat: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, padding: 10 },
  primaryStatLabel: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  primaryStatValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  primaryStatValue: { color: colors.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  profileCard: { backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 12 },
  avatarWrap: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' },
  username: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  providerBadge: { color: colors.textDim, fontSize: 12, fontWeight: '600', backgroundColor: colors.surfaceAlt, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  email: { color: colors.textDim, fontSize: 12, marginBottom: 10, maxWidth: '90%' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  editBlock: { width: '100%', marginTop: 4 },
  nameInput: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15, textAlign: 'center' },
  avatarPickerLabel: { color: colors.textDim, fontSize: 12, marginTop: 12, marginBottom: 6 },
  avatarPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  avatarOption: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', minHeight: touch.min },
  avatarOptionActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  avatarOptionText: { fontSize: 19 },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  editAction: { flex: 1 },
  joinedRow: { flexDirection: 'row', marginBottom: 8 },
  joined: { color: colors.textFaint, fontSize: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  metaLabel: { color: colors.textFaint, fontSize: 12 },
  metaValue: { color: colors.textDim, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  syncWarn: { backgroundColor: colors.warningDim, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 10, marginHorizontal: 16, marginBottom: 12, padding: 12 },
  syncWarnText: { color: colors.warning, fontSize: 12, lineHeight: 17 },
  dailyBtn: { backgroundColor: colors.warningDim, marginHorizontal: 16, marginBottom: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.warningBorder, minHeight: touch.min },
  dailyBtnText: { color: colors.warning, fontSize: 14, fontWeight: '600' },
  dailyBtnDone: { backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft, minHeight: touch.min },
  dailyBtnDoneText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 16, paddingHorizontal: 16 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 6, gap: 12, minHeight: touch.min },
  dangerBtn: { borderColor: colors.dangerBorder },
  actionText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  actionHint: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  actionBadge: { color: colors.onAccent, fontSize: 12, fontWeight: '700', backgroundColor: colors.accentStrong, borderRadius: 9, minWidth: 18, textAlign: 'center', paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  disclaimer: { backgroundColor: colors.warningDim, borderRadius: 10, marginHorizontal: 16, marginBottom: 8, padding: 16, borderWidth: 1, borderColor: colors.warningBorder },
  disclaimerText: { color: colors.warning, fontSize: 13, lineHeight: 20 },
});
