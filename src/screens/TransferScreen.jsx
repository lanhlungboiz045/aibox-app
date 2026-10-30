// screens/TransferScreen.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppHeader, Button, TokenIcon } from '../components/ui';
import { formatToken } from '../utils/format';
import { colors, centeredContent, touch } from '../theme/tokens';

export function TransferScreen({ navigation }) {
  const { state, transfer } = useApp();
  const insets = useSafeAreaInsets();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const amountNum = Number(amount);
  const hasValidAmount = Number.isSafeInteger(amountNum) && amountNum > 0;
  const isSelf = recipient.trim().toLowerCase() === state.user.username.toLowerCase();
  const canTransfer = hasValidAmount
    && amountNum <= state.user.tokenBalance
    && recipient.trim().length > 0
    && !isSelf;

  // Chỉ gợi ý các ví đã đăng nhập trên thiết bị này.
  const friends = state.accounts
    .filter(a => a.id !== state.user.id)
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
      stickyHeaderIndices={[0]}
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 20 }]}
    >
      <AppHeader navigation={navigation} title="Chuyển token" />

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
        <View style={styles.balanceValueRow}>
          <Text style={styles.balanceValue}>{formatToken(state.user.tokenBalance)}</Text>
          <TokenIcon size={18} />
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Người nhận</Text>
        <TextInput
          style={styles.input}
          value={recipient}
          onChangeText={setRecipient}
          placeholder="Nhập username..."
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          accessibilityLabel="Tên người nhận"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsRow}>
          {friends.map(f => (
            <TouchableOpacity accessibilityRole="button" key={f.id} style={[styles.friendChip, recipient === f.username && styles.friendChipActive]} onPress={() => setRecipient(f.username)}>
              <Text style={styles.friendAvatar}>{f.avatar}</Text>
              <Text style={styles.friendName}>{f.username}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {friends.length === 0 && <Text style={styles.hint}>Đăng nhập thêm tài khoản trên thiết bị này để chuyển token.</Text>}

        <Text style={styles.label}>Số token</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={value => setAmount(value.replace(/\D/g, ''))}
            placeholder="0"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            accessibilityLabel="Số token cần chuyển"
          />
          <Text style={styles.amountSuffix}>token</Text>
        </View>

        <View style={styles.quickRow}>
          {[100, 500, 1000, 5000].map(amt => (
            <TouchableOpacity accessibilityRole="button" key={amt} style={[styles.quickBtn, amountNum + amt > state.user.tokenBalance && styles.quickBtnDisabled]} onPress={() => setAmount(String(amountNum + amt))} disabled={amountNum + amt > state.user.tokenBalance}>
              <Text style={styles.quickBtnText}>+{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
        <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Thêm ghi chú..." placeholderTextColor={colors.textFaint} />

        <Button
          label={`Gửi ${amountNum > 0 ? formatToken(amountNum) : ''} token`}
          onPress={handleTransfer}
          disabled={!canTransfer}
        />

        {!canTransfer && hasValidAmount && amountNum > state.user.tokenBalance && (
          <Text style={styles.warning}>Không đủ token</Text>
        )}
        {!canTransfer && isSelf && (
          <Text style={styles.warning}>Không thể chuyển token cho chính mình.</Text>
        )}
      </View>

      {recentTransfers.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Lịch sử chuyển</Text>
          {recentTransfers.map(tx => (
            <View key={tx.id} style={styles.recentItem}>
              <Text style={styles.recentDesc} numberOfLines={2}>{tx.description}</Text>
              <Text style={styles.recentAmount}>-{formatToken(tx.amount)} <TokenIcon size={12} /></Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  balanceCard: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 16 },
  balanceLabel: { color: colors.textDim, fontSize: 13, marginBottom: 4 },
  balanceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceValue: { color: colors.accentSoft, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  form: { paddingHorizontal: 16 },
  label: { color: colors.textDim, fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: touch.min },
  friendsRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  hint: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
  friendChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, borderWidth: 1, borderColor: colors.borderSoft, gap: 4, minHeight: touch.min },
  friendChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  friendAvatar: { fontSize: 14 },
  friendName: { color: colors.textDim, fontSize: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 14 },
  amountInput: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], paddingVertical: 12 },
  amountSuffix: { fontSize: 18 },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quickBtn: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, minHeight: touch.min, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  quickBtnDisabled: { opacity: 0.3 },
  quickBtnText: { color: colors.accentSoft, fontSize: 12, fontWeight: '600' },
  transferBtn: { backgroundColor: colors.accentStrong, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20, minHeight: touch.min },
  btnDisabled: { opacity: 0.4 },
  transferBtnText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  warning: { color: colors.warning, fontSize: 12, marginTop: 8, textAlign: 'center' },
  recentSection: { marginTop: 24, paddingHorizontal: 16 },
  recentTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: colors.borderSoft, gap: 8 },
  recentDesc: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 16 },
  recentAmount: { color: colors.danger, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
