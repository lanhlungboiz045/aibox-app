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
import { colors, centeredContent, touch, spacing, layout, radius, type } from '../theme/tokens';
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
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + spacing.xxxl }]}
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
  primaryStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: layout.gutter,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  primaryStat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
  },
  primaryStatLabel: { ...type.small, color: colors.textDim, marginBottom: spacing.xs },
  primaryStatValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  primaryStatValue: { ...type.bodyStrong, fontWeight: '700', color: colors.text },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: layout.gutter,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.md,
  },
  avatarWrap: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  username: { ...type.h1, color: colors.text, marginBottom: spacing.sm },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roleBadge: {
    ...type.smallStrong,
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    overflow: 'hidden',
  },
  providerBadge: {
    ...type.smallStrong,
    color: colors.textDim,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    overflow: 'hidden',
  },
  email: { ...type.small, color: colors.textDim, marginBottom: spacing.sm, maxWidth: '90%' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  editBlock: { width: '100%', marginTop: spacing.xs },
  nameInput: {
    ...type.body,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    textAlign: 'center',
  },
  avatarPickerLabel: { ...type.small, color: colors.textDim, marginTop: spacing.md, marginBottom: spacing.sm },
  avatarPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  avatarOption: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: touch.min,
  },
  avatarOptionActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  avatarOptionText: { ...type.section },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  editAction: { flex: 1 },
  joinedRow: { flexDirection: 'row', marginBottom: spacing.sm },
  joined: { ...type.small, color: colors.textFaint },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaLabel: { ...type.small, color: colors.textFaint },
  metaValue: { ...type.smallStrong, color: colors.textDim },
  syncWarn: {
    backgroundColor: colors.warningDim,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.sm,
    marginHorizontal: layout.gutter,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  syncWarnText: { ...type.small, color: colors.warning },
  dailyBtn: {
    backgroundColor: colors.warningDim,
    marginHorizontal: layout.gutter,
    marginBottom: spacing.lg,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warningBorder,
    minHeight: touch.min,
  },
  dailyBtnText: { ...type.bodyStrong, color: colors.warning },
  dailyBtnDone: {
    backgroundColor: colors.surface,
    marginHorizontal: layout.gutter,
    marginBottom: spacing.lg,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    minHeight: touch.min,
  },
  dailyBtnDoneText: { ...type.smallStrong, color: colors.textDim },
  section: { marginBottom: spacing.lg, paddingHorizontal: layout.gutter },
  sectionTitle: { ...type.subtitle, color: colors.text, marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statValue: { ...type.h1, color: colors.text },
  statLabel: { ...type.small, color: colors.textDim, marginTop: spacing.xs },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.sm,
    gap: spacing.md,
    minHeight: touch.min,
  },
  dangerBtn: { borderColor: colors.dangerBorder },
  actionText: { ...type.body, color: colors.text, fontWeight: '500' },
  actionHint: { ...type.small, color: colors.textFaint, marginTop: spacing.xs },
  actionBadge: {
    ...type.smallStrong,
    color: colors.onAccent,
    backgroundColor: colors.accentStrong,
    borderRadius: radius.pill,
    minWidth: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    overflow: 'hidden',
  },
  disclaimer: {
    backgroundColor: colors.warningDim,
    borderRadius: radius.sm,
    marginHorizontal: layout.gutter,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  disclaimerText: { ...type.small, color: colors.warning },
});
