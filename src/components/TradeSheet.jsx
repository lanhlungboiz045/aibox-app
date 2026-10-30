// components/TradeSheet.jsx — Form đặt cược YES/NO shares
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { colors, touch } from '../theme/tokens';

export function TradeSheet({ visible, market, initialSide, onClose }) {
  const { state, buyShares, sellShares } = useApp();
  const insets = useSafeAreaInsets();
  const [side, setSide] = useState(initialSide);
  const [shares, setShares] = useState('10');

  useEffect(() => {
    if (visible) setSide(initialSide);
  }, [visible, initialSide]);

  if (!market) return null;

  const sharesNum = Number(shares);
  const sharesValid = Number.isSafeInteger(sharesNum) && sharesNum > 0;
  const price = side === 'YES' ? market.yesPrice : market.noPrice;
  const cost = sharesNum * price;
  const potentialPayout = sharesNum * 100;
  const profit = potentialPayout - cost;
  const canAfford = Boolean(state.user && Number.isFinite(cost) && state.user.tokenBalance >= cost);
  const position = state.user?.positions.find(p => p.marketId === market.id && p.side === side);
  const canBuy = sharesValid && cost > 0 && Number.isFinite(cost) && canAfford && !market.resolved;
  const canSell = sharesValid && Boolean(position) && sharesNum <= (position?.shares || 0) && !market.resolved;
  const validationMessage = !sharesValid
    ? 'Nhập số shares nguyên lớn hơn 0.'
    : position && sharesNum > position.shares
      ? `Bạn chỉ có ${position.shares} shares ${side} để bán.`
      : null;

  const handleBuy = () => {
    if (!sharesValid || !Number.isFinite(cost)) { Alert.alert('Lỗi', 'Nhập số shares nguyên hợp lệ.'); return; }
    if (!canAfford) {
      Alert.alert('Không đủ token', `Cần ${formatToken(cost)} token, bạn chỉ có ${formatToken(state.user.tokenBalance)}.`);
      return;
    }
    if (market.resolved) return;
    buyShares(market.id, side, sharesNum);
    Alert.alert('Thành công', `Đã mua ${sharesNum} shares ${side} với giá ${formatToken(cost)} token`);
    onClose();
  };

  const handleSell = () => {
    if (!canSell) {
      Alert.alert('Không thể bán', validationMessage || 'Số lượng shares không hợp lệ.');
      return;
    }
    sellShares(market.id, side, sharesNum);
    Alert.alert('Thành công', `Đã bán ${sharesNum} shares ${side}`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{market.question}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng" style={styles.closeAction} onPress={onClose}>
              <Text style={styles.closeBtn}>{'\u{2715}'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sideToggle}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: side === 'YES' }}
              style={[styles.sideBtn, side === 'YES' && styles.sideBtnYes]}
              onPress={() => setSide('YES')}
            >
              <Text style={[styles.sideBtnText, side === 'YES' && { color: colors.success }]}>YES</Text>
              <Text style={[styles.sideBtnPrice, side === 'YES' && { color: colors.success }]}>{market.yesPrice}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: side === 'NO' }}
              style={[styles.sideBtn, side === 'NO' && styles.sideBtnNo]}
              onPress={() => setSide('NO')}
            >
              <Text style={[styles.sideBtnText, side === 'NO' && { color: colors.danger }]}>NO</Text>
              <Text style={[styles.sideBtnPrice, side === 'NO' && { color: colors.danger }]}>{market.noPrice}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Số shares</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Giảm 10 shares"
              onPress={() => setShares(String(Math.max(1, (sharesValid ? sharesNum : 10) - 10)))}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>-10</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={shares}
              onChangeText={value => setShares(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              textAlign="center"
              accessibilityLabel="Số shares"
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Tăng 10 shares"
              onPress={() => setShares(String(Math.min(Number.MAX_SAFE_INTEGER, (sharesValid ? sharesNum : 0) + 10)))}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>+10</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {[10, 50, 100, 500].map(amt => (
              <TouchableOpacity accessibilityRole="button" key={amt} onPress={() => setShares(String(amt))} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>{amt}</Text>
              </TouchableOpacity>
            ))}
            {position && (
              <TouchableOpacity accessibilityRole="button" onPress={() => setShares(String(position.shares))} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>Tối đa</Text>
              </TouchableOpacity>
            )}
          </View>
          {validationMessage ? <Text style={styles.warning}>{validationMessage}</Text> : null}

          <View style={styles.summary}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Giá / share</Text><Text style={styles.summaryValue}>{price} token</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tổng cost</Text><Text style={[styles.summaryValue, { color: colors.danger }]}>{formatToken(cost)} {'\u{1F4B0}'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Potential payout</Text><Text style={[styles.summaryValue, { color: colors.success }]}>{formatToken(potentialPayout)} {'\u{1F4B0}'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Lợi nhuận nếu đúng</Text><Text style={[styles.summaryValue, { color: colors.success }]}>+{formatToken(profit)} {'\u{1F4B0}'}</Text></View>
            <View style={[styles.summaryRow, styles.balanceRow]}><Text style={styles.summaryLabel}>Số dư của bạn</Text><Text style={styles.balanceValue}>{formatToken(state.user.tokenBalance)} {'\u{1F4B0}'}</Text></View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity accessibilityRole="button" style={[styles.buyBtn, !canBuy && styles.btnDisabled]} onPress={handleBuy} disabled={!canBuy}>
              <Text style={styles.buyBtnText}>Mua {sharesNum} shares {side}</Text>
            </TouchableOpacity>
            {position && (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.sellBtn, !canSell && styles.btnDisabled]}
                onPress={handleSell}
                disabled={!canSell}
              >
                <Text style={styles.sellBtnText}>Bán {sharesNum}</Text>
              </TouchableOpacity>
            )}
          </View>

          {sharesValid && !canAfford && (
            <Text style={styles.warning}>{'\u{26A0}'} Không đủ token. Nhận thưởng hàng ngày hoặc chơi prediction market!</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
  closeAction: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { color: colors.textDim, fontSize: 18, fontWeight: '600' },
  sideToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sideBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft },
  sideBtnYes: { borderColor: colors.successBorder, backgroundColor: colors.successDim },
  sideBtnNo: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerDim },
  sideBtnText: { fontSize: 14, fontWeight: '700', color: colors.textDim },
  sideBtnPrice: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: colors.textDim },
  label: { color: colors.textDim, fontSize: 13, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qtyBtn: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft },
  qtyBtnText: { color: colors.accentSoft, fontSize: 13, fontWeight: '600' },
  input: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 18, fontWeight: '700', fontFamily: 'monospace', paddingVertical: 10 },
  quickRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  quickBtn: { flex: 1, minHeight: touch.min, backgroundColor: colors.surfaceAlt, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  quickBtnText: { color: colors.textDim, fontSize: 12 },
  summary: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginBottom: 16, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.textDim, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
  balanceRow: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  balanceValue: { color: colors.accentSoft, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  actionRow: { flexDirection: 'row', gap: 8 },
  buyBtn: { flex: 1, backgroundColor: colors.accentStrong, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  buyBtnText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
  sellBtn: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.danger, minHeight: touch.min },
  sellBtnText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  warning: { color: colors.warning, fontSize: 12, marginTop: 8, textAlign: 'center' },
});
