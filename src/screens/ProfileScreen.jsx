// screens/ProfileScreen.jsx — Hồ sơ người dùng (Firebase Auth + Firestore)
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, ROLE_COLORS, PROVIDER_LABELS, AVATARS } from '../data/accounts';
import { formatToken, formatDate } from '../utils/format';

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
    signOut, updateMyProfile, unreadNotifications, myCopyTrades, questState, aiConfig,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

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
  const shortUid = user.id ? `${user.id.slice(0, 6)}…${user.id.slice(-4)}` : '—';

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
    const result = await updateMyProfile({ username: name, avatar: draftAvatar });
    setSaving(false);
    setEditing(false);
    if (result.ok) {
      // Firestore lỗi thì thay đổi vẫn được giữ trên máy, chỉ cảnh báo đồng bộ
      if (result.syncError) {
        Alert.alert('Đã lưu trên máy', `Chưa đồng bộ được lên Firestore:\n${result.syncError}`);
      }
    } else {
      Alert.alert('Không lưu được', result.error);
    }
  };

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
        <UserAvatar user={editing ? { ...user, avatar: draftAvatar, photoURL: null } : user} />

        {editing ? (
          <View style={styles.editBlock}>
            <TextInput
              style={styles.nameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Tên hiển thị"
              placeholderTextColor="#5C5C5C"
              maxLength={24}
              autoCapitalize="none"
            />
            <Text style={styles.avatarPickerLabel}>Chọn avatar</Text>
            <View style={styles.avatarPicker}>
              {AVATARS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.avatarOption, draftAvatar === emoji && styles.avatarOptionActive]}
                  onPress={() => setDraftAvatar(emoji)}
                >
                  <Text style={styles.avatarOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Đang lưu…' : 'Lưu'}</Text>
              </TouchableOpacity>
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

            <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
              <Text style={styles.editBtnText}>{'\u{270F}'} Sửa hồ sơ</Text>
            </TouchableOpacity>

            <View style={styles.rankRow}>
              <Text style={styles.rank}>{'\u{1F3C6}'} Rank #{user.rank}</Text>
              <Text style={styles.joined}>Tham gia: {formatDate(user.joinedDate)}</Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Token balance</Text>
              <Text style={styles.balanceValue}>{formatToken(user.tokenBalance)} {'\u{1F4B0}'}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Firebase UID</Text>
              <Text style={styles.metaValue}>{shortUid}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Trạng thái</Text>
              <Text style={[styles.metaValue, { color: user.status === 'banned' ? '#FF6B6B' : '#00CE7E' }]}>
                {user.status === 'banned' ? 'Bị khoá' : 'Hoạt động'}
              </Text>
            </View>
          </>
        )}
      </View>

      {state.demoMode && (
        <View style={styles.demoBox}>
          <Text style={styles.demoBoxText}>
            {'\u{1F9EA}'} Chế độ demo (Expo Go): ví và dữ liệu chỉ lưu trên máy này,
            không đồng bộ Firebase. Bấm đăng xuất để thoát, hoặc build dev client để đăng nhập Google thật.
          </Text>
        </View>
      )}

      {state.profileSync && (
        <View style={styles.syncWarn}>
          <Text style={styles.syncWarnText}>
            {'\u{26A0}'} Chưa đồng bộ được hồ sơ với Firestore: {state.profileSync}
          </Text>
        </View>
      )}

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
          {link('\u{2699}', 'Admin Dashboard', () => navigation.navigate('AdminHome'), { hint: 'Markets, AI models, users, rủi ro dòng tiền' })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'\u{1F9F0}'} Công cụ</Text>
        {canCreateMarket && link('\u{2795}', 'Tạo market', () => navigation.navigate('CreateMarket'), {
          hint: user.role === 'creator' ? 'Bạn là Market Creator · nhận 2% fee' : 'Tạo kèo với tư cách admin',
        })}
        {link('\u{1F9F0}', 'Cấu hình AI', () => navigation.navigate('AISettings'), {
          hint: aiConfig?.mode === 'live'
            ? `LIVE · ${aiConfig.model}`
            : 'Chưa có API key · đang trả lời mô phỏng',
          badge: aiConfig?.mode === 'live' ? 'LIVE' : 'MOCK',
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
        {link('\u{1F6AA}', 'Đăng xuất', handleSignOut, { danger: true, hint: 'Đăng xuất khỏi Google trên thiết bị này' })}
        {link('\u{1F504}', 'Reset token (demo)', handleReset, { danger: true, hint: 'Chỉ reset ví của tài khoản hiện tại' })}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{'\u{26A0}'} AIBox là nền tảng giải trí. Token là credit nội bộ, không có giá trị tiền tệ và không thể đổi tiền thật. Prediction market là game dự đoán, không phải cá cược.</Text>
      </View>
      <Text style={styles.mockNote}>
        Đăng nhập bằng Google qua Firebase Authentication. Hồ sơ (tên, avatar, quyền) lưu ở Firestore;
        ví token và dữ liệu game lưu trên thiết bị theo UID Firebase.
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
  avatarWrap: { backgroundColor: '#22262E', alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' },
  username: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge: { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  providerBadge: { color: '#8E8E93', fontSize: 10, fontWeight: '600', backgroundColor: '#22262E', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  email: { color: '#8E8E93', fontSize: 12, marginBottom: 10, maxWidth: '90%' },
  editBtn: { backgroundColor: '#22262E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14 },
  editBtnText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  editBlock: { width: '100%', marginTop: 4 },
  nameInput: { backgroundColor: '#0F1115', borderWidth: 1, borderColor: '#2A2E36', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#FFFFFF', fontSize: 15, textAlign: 'center' },
  avatarPickerLabel: { color: '#8E8E93', fontSize: 11, marginTop: 12, marginBottom: 6 },
  avatarPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  avatarOption: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#22262E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  avatarOptionActive: { borderColor: '#6C5CE7', backgroundColor: 'rgba(108, 92, 231, 0.18)' },
  avatarOptionText: { fontSize: 19 },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#22262E', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#6C5CE7', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  rankRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  rank: { color: '#FFB74D', fontSize: 13, fontWeight: '600' },
  joined: { color: '#5C5C5C', fontSize: 12 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F1115', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, width: '100%', justifyContent: 'center' },
  balanceLabel: { color: '#8E8E93', fontSize: 14 },
  balanceValue: { color: '#A78BFA', fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#22262E' },
  metaLabel: { color: '#5C5C5C', fontSize: 11 },
  metaValue: { color: '#8E8E93', fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },
  syncWarn: { backgroundColor: 'rgba(255, 183, 77, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.25)', borderRadius: 10, marginHorizontal: 16, marginBottom: 12, padding: 12 },
  syncWarnText: { color: '#FFB74D', fontSize: 11, lineHeight: 17 },
  demoBox: { backgroundColor: 'rgba(142, 142, 147, 0.10)', borderWidth: 1, borderColor: '#2A2E36', borderRadius: 10, marginHorizontal: 16, marginBottom: 12, padding: 12 },
  demoBoxText: { color: '#8E8E93', fontSize: 11, lineHeight: 17 },
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
