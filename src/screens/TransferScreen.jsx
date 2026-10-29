// screens/TransferScreen.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TokenBadge } from '../components/TokenBadge';
import { formatToken } from '../utils/format';

export function TransferScreen({ navigation }) {
  const { state, transfer } = useApp();
  const insets = useSafeAreaInsets();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const amountNum = parseInt(amount) || 0;
  const canTransfer = amountNum > 0 && amountNum <= state.user.tokenBalance && recipient.trim().length > 0 && recipient !== state.user.username;

  // Danh sách gợi ý lấy từ tài khoản thật trong hệ thống (bỏ chính mình, ưu tiên người có thể đăng nhập)
  const friends = state.accounts
    .filter(a => a.id !== state.user.id)
    .sort((a, b) => (a.provider === 'system' ? 1 : 0) - (b.provider === 'system' ? 1 : 0))
    .slice(0, 10);

  const handleTransfer = () => {
    if (!canTransfer) { Alert.alert('Lỗi', 'Kiểm tra lại số token và người nhận'); return; }
    // transfer() trả { ok, error } — không còn trả boolean
    const result = transfer(recipient.trim(), amountNum, note.trim() || undefined);
    if (!result.ok) { Alert.alert('Không chuyển được', result.error); return; }
    Alert.alert('Thành công', `Đã chuyển ${formatToken(amountNum)} token cho ${recipient}`);
    setRecipient(''); setAmount(''); setNote('');
  };

  const recentTransfers = state.user.transactions.filter(t => t.type === 'TRANSFER_OUT').slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Chuyển token</Text>
        <TokenBadge size="small" />
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
        <Text style={styles.balanceValue}>{formatToken(state.user.tokenBalance)} {'\u{1F4B0}'}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Người nhận</Text>
        <TextInput style={styles.input} value={recipient} onChangeText={setRecipient} placeholder="Nhập username..." placeholderTextColor="#5C5C5C" autoCapitalize="none" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsRow}>
          {friends.map(f => (
            <TouchableOpacity key={f.id} style={[styles.friendChip, recipient === f.username && styles.friendChipActive]} onPress={() => setRecipient(f.username)}>
              <Text style={styles.friendAvatar}>{f.avatar}</Text>
              <Text style={styles.friendName}>{f.username}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Số token</Text>
        <View style={styles.amountRow}>
          <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor="#5C5C5C" keyboardType="numeric" />
          <Text style={styles.amountSuffix}>{'\u{1F4B0}'}</Text>
        </View>

        <View style={styles.quickRow}>
          {[100, 500, 1000, 5000].map(amt => (
            <TouchableOpacity key={amt} style={[styles.quickBtn, amountNum + amt > state.user.tokenBalance && styles.quickBtnDisabled]} onPress={() => setAmount(String(amountNum + amt))} disabled={amountNum + amt > state.user.tokenBalance}>
              <Text style={styles.quickBtnText}>+{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
        <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Thêm ghi chú..." placeholderTextColor="#5C5C5C" />

        <TouchableOpacity style={[styles.transferBtn, !canTransfer && styles.btnDisabled]} onPress={handleTransfer} disabled={!canTransfer}>
          <Text style={styles.transferBtnText}>Gửi {amountNum > 0 ? formatToken(amountNum) : ''} {'\u{1F4B0}'}</Text>
        </TouchableOpacity>

        {!canTransfer && amountNum > 0 && amountNum > state.user.tokenBalance && (
          <Text style={styles.warning}>{'\u{26A0}'} Không đủ token</Text>
        )}
      </View>

      {recentTransfers.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>{'\u{1F4E4}'} Lịch sử chuyển</Text>
          {recentTransfers.map(tx => (
            <View key={tx.id} style={styles.recentItem}>
              <Text style={styles.recentDesc} numberOfLines={2}>{tx.description}</Text>
              <Text style={styles.recentAmount}>-{formatToken(tx.amount)} {'\u{1F4B0}'}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  balanceCard: { backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36', marginBottom: 16 },
  balanceLabel: { color: '#8E8E93', fontSize: 13, marginBottom: 4 },
  balanceValue: { color: '#A78BFA', fontSize: 24, fontWeight: '700', fontFamily: 'monospace' },
  form: { paddingHorizontal: 16 },
  label: { color: '#8E8E93', fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 },
  friendsRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  friendChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22262E', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, borderWidth: 1, borderColor: '#2A2E36', gap: 4 },
  friendChipActive: { borderColor: '#6C5CE7', backgroundColor: 'rgba(108, 92, 231, 0.1)' },
  friendAvatar: { fontSize: 14 },
  friendName: { color: '#8E8E93', fontSize: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', paddingHorizontal: 14 },
  amountInput: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700', fontFamily: 'monospace', paddingVertical: 12 },
  amountSuffix: { fontSize: 18 },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quickBtn: { flex: 1, backgroundColor: '#22262E', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  quickBtnDisabled: { opacity: 0.3 },
  quickBtnText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  transferBtn: { backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.4 },
  transferBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  warning: { color: '#FFB74D', fontSize: 12, marginTop: 8, textAlign: 'center' },
  recentSection: { marginTop: 24, paddingHorizontal: 16 },
  recentTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 8, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: '#2A2E36', gap: 8 },
  recentDesc: { flex: 1, color: '#E0E0E0', fontSize: 12, lineHeight: 16 },
  recentAmount: { color: '#FF6B6B', fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
});
