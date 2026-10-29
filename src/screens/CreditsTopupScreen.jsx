// screens/CreditsTopupScreen.jsx — Nạp credit/token (kiểu AI Box)
// Mock thanh toán: chọn gói → xác nhận → cộng token vào ví + ghi giao dịch TOPUP.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';

const PACKAGES = [
  { id: 'p1', tokens: 1000, bonus: 0, price: '29.000đ', label: 'Gói Starter' },
  { id: 'p2', tokens: 5000, bonus: 500, price: '129.000đ', label: 'Gói Pro' },
  { id: 'p3', tokens: 10000, bonus: 1500, price: '249.000đ', label: 'Gói Team' },
  { id: 'p4', tokens: 50000, bonus: 10000, price: '999.000đ', label: 'Gói Enterprise' },
];

export function CreditsTopupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state, topUpTokens } = useApp();
  const user = state.user;
  const [selected, setSelected] = useState('p2');

  const pkg = PACKAGES.find(p => p.id === selected);
  const totalTokens = pkg ? pkg.tokens + pkg.bonus : 0;

  const handleTopup = () => {
    if (!pkg) return;
    Alert.alert(
      'Xác nhận nạp token',
      `Nạp ${formatToken(totalTokens)} token (${pkg.label}) với giá ${pkg.price}?\n\nĐây là thanh toán mô phỏng cho đồ án.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Nạp ngay',
          onPress: () => {
            topUpTokens(totalTokens, pkg.label);
            Alert.alert('Thành công', `Đã nạp ${formatToken(totalTokens)} token vào ví.`);
          },
        },
      ]
    );
  };

  const topups = (user?.transactions || []).filter(t => t.type === 'TOPUP');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'\u{276C}'} Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nạp credit / token</Text>
        <Text style={styles.sub}>Thanh toán theo usage · giá tốt</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
          <Text style={styles.balanceValue}>{formatToken(user?.tokenBalance || 0)} token</Text>
        </View>

        <Text style={styles.sectionTitle}>Chọn gói nạp</Text>
        {PACKAGES.map(p => {
          const active = p.id === selected;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.pkgCard, active && styles.pkgCardActive]}
              onPress={() => setSelected(p.id)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.pkgName}>{p.label}</Text>
                <Text style={styles.pkgTokens}>
                  {formatToken(p.tokens)} token
                  {p.bonus > 0 ? `  +${formatToken(p.bonus)} bonus` : ''}
                </Text>
              </View>
              <Text style={styles.pkgPrice}>{p.price}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.payBtn} onPress={handleTopup} activeOpacity={0.85}>
          <Text style={styles.payBtnText}>
            Nạp {formatToken(totalTokens)} token · {pkg?.price}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Lịch sử nạp</Text>
        {topups.length === 0 ? (
          <Text style={styles.empty}>Chưa có giao dịch nạp nào.</Text>
        ) : (
          topups.map(t => (
            <View key={t.id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{t.description}</Text>
                <Text style={styles.txTime}>{new Date(t.timestamp).toLocaleString('vi-VN')}</Text>
              </View>
              <Text style={styles.txAmount}>+{formatToken(t.amount)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { color: '#6C5CE7', fontSize: 13, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 4 },
  sub: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  balanceCard: { backgroundColor: '#1A1D24', borderRadius: 14, borderWidth: 1, borderColor: '#2A2E36', padding: 16, alignItems: 'center' },
  balanceLabel: { color: '#8E8E93', fontSize: 11 },
  balanceValue: { color: '#FFB74D', fontSize: 22, fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  pkgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 12, borderWidth: 1, borderColor: '#2A2E36', padding: 14, gap: 10 },
  pkgCardActive: { borderColor: '#6C5CE7', backgroundColor: 'rgba(108, 92, 231, 0.08)' },
  pkgName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pkgTokens: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  pkgPrice: { color: '#FFB74D', fontSize: 14, fontWeight: '800' },
  payBtn: { backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  payBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  empty: { color: '#5C5C5C', fontSize: 12, marginTop: 6 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D24', borderRadius: 8, borderWidth: 1, borderColor: '#2A2E36', padding: 10, gap: 8 },
  txDesc: { color: '#FFFFFF', fontSize: 12 },
  txTime: { color: '#5C5C5C', fontSize: 10, marginTop: 2 },
  txAmount: { color: '#00CE7E', fontSize: 12, fontWeight: '700' },
});
