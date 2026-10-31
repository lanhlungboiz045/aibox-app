// screens/CreditsTopupScreen.jsx — Nạp token (Bước 3)
//
// Luồng 3 chạm: chọn gói → "Nạp ngay" → "Tôi đã chuyển khoản".
// Sheet thanh toán nằm ở components/PaymentSheet.jsx để màn Các gói dùng chung.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import {
  TOKENS_PER_CHAT_MIN, TOKENS_PER_CHAT_MAX, chatsRange,
} from '../utils/economy';
import { PaymentSheet } from '../components/PaymentSheet';
import {
  AppIcon, AppHeader, Button, EmptyState, TokenIcon,
} from '../components/ui';
import { centeredContent, colors, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

// Nạp lẻ dùng chung thang giá với màn Các gói: 1 token = 1đ giá trị,
// nạp lẻ 0,9đ/token (giảm 10%), gói quota giảm sâu hơn theo bậc (0,78 → 0,468đ).
// Nhờ vậy hai màn không còn lệch giá: nạp 500.000 token = 450.000đ,
// còn gói 2 Triệu Quota chỉ 936.000đ.
const PACKAGES = [
  { id: 'p1', tokens: 10000, price: '9.000đ', label: 'Khởi đầu' },
  { id: 'p2', tokens: 50000, price: '45.000đ', label: 'Phổ biến' },
  { id: 'p3', tokens: 100000, price: '90.000đ', label: 'Nhóm' },
  { id: 'p4', tokens: 500000, price: '450.000đ', label: 'Doanh nghiệp' },
];

export function CreditsTopupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const user = state.user;

  const [selected, setSelected] = useState('p2');
  const [payOpen, setPayOpen] = useState(false);
  const [order, setOrder] = useState(null);

  const pkg = PACKAGES.find(p => p.id === selected) || PACKAGES[1];
  const totalTokens = pkg.tokens;

  const openPayment = () => {
    setOrder({
      code: `AIBOX${Date.now().toString().slice(-6)}`,
      amount: pkg.price,
      tokens: totalTokens,
      label: pkg.label,
    });
    setPayOpen(true);
  };

  const topups = (user?.transactions || []).filter(t => t.type === 'TOPUP');
  const totalTopup = topups.reduce((sum, item) => sum + Math.abs(item.amount || 0), 0);

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} title={t('screen.topup')} subtitle="Trả theo mức sử dụng" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel} maxFontSizeMultiplier={1.5}>Số dư hiện tại</Text>
            <View style={styles.balancePill}>
              <Text style={styles.balancePillText} maxFontSizeMultiplier={1.5}>Đã nạp {formatToken(totalTopup)}</Text>
            </View>
          </View>
          <View style={styles.balanceValueRow}>
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.5}>
              {formatToken(user?.tokenBalance || 0)}
            </Text>
            <TokenIcon size={18} color={colors.accentSoft} />
          </View>
          <Text style={styles.balanceHint} maxFontSizeMultiplier={1.6}>
            1 token = 1 token AI xử lý · nạp lẻ 0,9đ/token. Mỗi lượt chat tốn ~{formatToken(TOKENS_PER_CHAT_MIN)}–{formatToken(TOKENS_PER_CHAT_MAX)} token;
            gói {PACKAGES[0].label} ≈ {chatsRange(PACKAGES[0].tokens)} câu hỏi AI. Mua gói quota để rẻ hơn (từ 0,78đ/token).
          </Text>
        </View>

        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.6}>Chọn gói nạp</Text>
        <View style={styles.grid}>
          {PACKAGES.map(p => {
            const active = p.id === selected;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={p.id}
                style={[styles.pkgCard, active && styles.pkgCardActive]}
                onPress={() => setSelected(p.id)}
                activeOpacity={0.85}
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${p.label}, ${formatToken(p.tokens)} token, ≈ ${chatsRange(p.tokens)} câu hỏi AI, ${p.price}`}
              >
                <View style={styles.pkgTop}>
                  <Text style={[styles.pkgName, active && { color: colors.accentSoft }]} maxFontSizeMultiplier={1.5}>
                    {p.label}
                  </Text>
                  {active ? <AppIcon name="check-circle" size={16} color={colors.accentSoft} /> : null}
                </View>
                <Text style={styles.pkgTokens} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                  {formatToken(p.tokens)}
                </Text>
                <Text style={styles.pkgUnit} maxFontSizeMultiplier={1.5}>
                  token
                </Text>
                <Text style={styles.pkgChats} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                  ≈ {chatsRange(p.tokens)} câu hỏi AI
                </Text>
                <Text style={styles.pkgPrice} maxFontSizeMultiplier={1.5}>{p.price}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          label={`Nạp ${formatToken(totalTokens)} token · ${pkg.price}`}
          icon="credit-card"
          size="lg"
          fullWidth
          onPress={openPayment}
        />
        <Button
          label="Xem các gói quota theo tháng"
          icon="package"
          variant="ghost"
          fullWidth
          onPress={() => navigation.navigate('Plans')}
        />
        <Text style={styles.payNote} maxFontSizeMultiplier={1.6}>
          Thanh toán mô phỏng — không phát sinh giao dịch thật.
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.6}>Lịch sử nạp</Text>
          <Text style={styles.sectionMeta} maxFontSizeMultiplier={1.5}>{topups.length} giao dịch</Text>
        </View>

        {topups.length === 0 ? (
          <EmptyState
            compact
            icon="credit-card"
            title="Chưa có giao dịch nạp"
            message="Chọn một gói ở trên để bắt đầu."
          />
        ) : (
          topups.map(t => (
            <View key={t.id} style={styles.txRow}>
              <View style={styles.txIcon}>
                <AppIcon name="arrow-down-left" size={16} color={colors.success} />
              </View>
              <View style={styles.txBody}>
                <Text style={styles.txDesc} numberOfLines={1} maxFontSizeMultiplier={1.6}>{t.description}</Text>
                <Text style={styles.txTime} maxFontSizeMultiplier={1.5}>
                  {new Date(t.timestamp).toLocaleString('vi-VN')}
                </Text>
              </View>
              <View style={styles.txRight}>
                <View style={styles.txAmountRow}>
                  <Text style={styles.txAmount} maxFontSizeMultiplier={1.5}>+{formatToken(Math.abs(t.amount || 0))}</Text>
                  <TokenIcon size={12} color={colors.success} />
                </View>
                <Text style={styles.txStatus} maxFontSizeMultiplier={1.5}>Thành công</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <PaymentSheet
        key={order?.code || 'none'}
        visible={payOpen}
        order={order}
        onClose={() => setPayOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { ...centeredContent, padding: spacing.lg, gap: spacing.lg },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  balanceLabel: { ...type.smallStrong, color: colors.textFaint },
  balancePill: {
    backgroundColor: colors.successDim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  balancePillText: { ...type.small, ...type.numeric, color: colors.success, fontWeight: '600' },
  balanceValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  balanceValue: { ...type.display, ...type.numeric, color: colors.text },
  balanceHint: { ...type.small, color: colors.textFaint, lineHeight: 18 },
  sectionTitle: { ...type.section, color: colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionMeta: { ...type.small, color: colors.textFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pkgCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
    minHeight: 132,
    justifyContent: 'center',
  },
  pkgCardActive: { borderColor: colors.accentBorder, backgroundColor: colors.accentDim },
  pkgTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  pkgName: { ...type.smallStrong, color: colors.textDim },
  pkgTokens: { ...type.h1, ...type.numeric, color: colors.text, marginTop: spacing.xs },
  pkgUnit: { ...type.small, color: colors.textFaint },
  pkgChats: { ...type.small, color: colors.accentSoft },
  pkgPrice: { ...type.smallStrong, color: colors.warning, marginTop: spacing.xs },
  payNote: { ...type.small, color: colors.textFaint, textAlign: 'center', marginTop: -spacing.sm },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 64,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.successDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: { flex: 1, gap: 2 },
  txDesc: { ...type.bodyStrong, color: colors.text },
  txTime: { ...type.small, color: colors.textFaint },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  txAmount: { ...type.bodyStrong, ...type.numeric, color: colors.success },
  txStatus: { ...type.small, color: colors.textFaint },
});
