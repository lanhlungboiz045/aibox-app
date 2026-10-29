// components/TradeSheet.jsx — Form đặt cược YES/NO shares
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';

export function TradeSheet({ visible, market, initialSide, onClose }) {
  const { state, buyShares, sellShares } = useApp();
  const insets = useSafeAreaInsets();
  const [side, setSide] = useState(initialSide);
  const [shares, setShares] = useState('10');

  useEffect(() => {
    if (visible) setSide(initialSide);
  }, [visible, initialSide]);

  if (!market) return null;

  const sharesNum = parseInt(shares) || 0;
  const price = side === 'YES' ? market.yesPrice : market.noPrice;
  const cost = sharesNum * price;
  const potentialPayout = sharesNum * 100;
  const profit = potentialPayout - cost;
  const canAfford = state.user.tokenBalance >= cost;
  const hasPosition = state.user.positions.some(p => p.marketId === market.id && p.side === side);

  const handleBuy = () => {
    if (sharesNum <= 0) { Alert.alert('Lỗi', 'Số shares phải > 0'); return; }
    if (!canAfford) {
      Alert.alert('Không đủ token', `Cần ${formatToken(cost)} token, bạn chỉ có ${formatToken(state.user.tokenBalance)}.`);
      return;
    }
    buyShares(market.id, side, sharesNum);
    Alert.alert('Thành công', `Đã mua ${sharesNum} shares ${side} với giá ${formatToken(cost)} token`);
    onClose();
  };

  const handleSell = () => {
    if (sharesNum <= 0) return;
    sellShares(market.id, side, sharesNum);
    Alert.alert('Thành công', `Đã bán ${sharesNum} shares ${side}`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{market.question}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>{'\u{2715}'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sideToggle}>
            <TouchableOpacity style={[styles.sideBtn, side === 'YES' && styles.sideBtnYes]} onPress={() => setSide('YES')}>
              <Text style={[styles.sideBtnText, side === 'YES' && { color: '#00CE7E' }]}>YES</Text>
              <Text style={[styles.sideBtnPrice, side === 'YES' && { color: '#00CE7E' }]}>{market.yesPrice}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sideBtn, side === 'NO' && styles.sideBtnNo]} onPress={() => setSide('NO')}>
              <Text style={[styles.sideBtnText, side === 'NO' && { color: '#FF6B6B' }]}>NO</Text>
              <Text style={[styles.sideBtnPrice, side === 'NO' && { color: '#FF6B6B' }]}>{market.noPrice}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Số shares</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setShares(String(Math.max(1, sharesNum - 10)))} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>-10</Text>
            </TouchableOpacity>
            <TextInput style={styles.input} value={shares} onChangeText={setShares} keyboardType="numeric" textAlign="center" />
            <TouchableOpacity onPress={() => setShares(String(sharesNum + 10))} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>+10</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {[10, 50, 100, 500].map(amt => (
              <TouchableOpacity key={amt} onPress={() => setShares(String(amt))} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Giá / share</Text><Text style={styles.summaryValue}>{price} token</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tổng cost</Text><Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>{formatToken(cost)} {'\u{1F4B0}'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Potential payout</Text><Text style={[styles.summaryValue, { color: '#00CE7E' }]}>{formatToken(potentialPayout)} {'\u{1F4B0}'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Lợi nhuận nếu đúng</Text><Text style={[styles.summaryValue, { color: '#00CE7E' }]}>+{formatToken(profit)} {'\u{1F4B0}'}</Text></View>
            <View style={[styles.summaryRow, styles.balanceRow]}><Text style={styles.summaryLabel}>Số dư của bạn</Text><Text style={styles.balanceValue}>{formatToken(state.user.tokenBalance)} {'\u{1F4B0}'}</Text></View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.buyBtn, !canAfford && styles.btnDisabled]} onPress={handleBuy} disabled={!canAfford}>
              <Text style={styles.buyBtnText}>Mua {sharesNum} shares {side}</Text>
            </TouchableOpacity>
            {hasPosition && (
              <TouchableOpacity style={styles.sellBtn} onPress={handleSell}>
                <Text style={styles.sellBtnText}>Bán</Text>
              </TouchableOpacity>
            )}
          </View>

          {!canAfford && (
            <Text style={styles.warning}>{'\u{26A0}'} Không đủ token. Nhận thưởng hàng ngày hoặc chơi prediction market!</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#1A1D24', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
  closeBtn: { color: '#8E8E93', fontSize: 18, fontWeight: '600' },
  sideToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sideBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#22262E', borderWidth: 1, borderColor: '#2A2E36' },
  sideBtnYes: { borderColor: 'rgba(0, 206, 126, 0.5)', backgroundColor: 'rgba(0, 206, 126, 0.1)' },
  sideBtnNo: { borderColor: 'rgba(255, 107, 107, 0.5)', backgroundColor: 'rgba(255, 107, 107, 0.1)' },
  sideBtnText: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
  sideBtnPrice: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: '#8E8E93' },
  label: { color: '#8E8E93', fontSize: 13, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qtyBtn: { backgroundColor: '#22262E', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2A2E36' },
  qtyBtnText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
  input: { flex: 1, backgroundColor: '#22262E', borderRadius: 8, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 18, fontWeight: '700', fontFamily: 'monospace', paddingVertical: 10 },
  quickRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  quickBtn: { flex: 1, backgroundColor: '#22262E', paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#2A2E36', alignItems: 'center' },
  quickBtnText: { color: '#8E8E93', fontSize: 12 },
  summary: { backgroundColor: '#0F1115', borderRadius: 10, padding: 12, marginBottom: 16, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#8E8E93', fontSize: 13 },
  summaryValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
  balanceRow: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#2A2E36' },
  balanceValue: { color: '#A78BFA', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  actionRow: { flexDirection: 'row', gap: 8 },
  buyBtn: { flex: 1, backgroundColor: '#6C5CE7', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  buyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sellBtn: { backgroundColor: '#22262E', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#FF6B6B' },
  sellBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '700' },
  warning: { color: '#FFB74D', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
