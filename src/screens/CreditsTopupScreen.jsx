// screens/CreditsTopupScreen.jsx — Nạp token (Bước 3)
//
// Luồng 3 chạm: chọn gói → "Nạp ngay" → "Tôi đã chuyển khoản".
// Sheet thanh toán mô phỏng có: mã đơn, thông tin chuyển khoản copy 1 chạm,
// trạng thái đơn (tạo → xác nhận → cộng token) và xác nhận cuối.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import {
  TOKENS_PER_CHAT_MIN, TOKENS_PER_CHAT_MAX, chatsRange,
} from '../utils/economy';
import { copyText } from '../utils/clipboard';
import { hapticError, hapticSuccess } from '../utils/feedback';
import {
  AppIcon, AppHeader, BottomSheet, Button, EmptyState, Row, TokenIcon, useToast,
} from '../components/ui';
import { centeredContent, colors, layout, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

// Gói nạp neo theo chi phí chat thật: mỗi lượt chat tốn ~500–1.000 token.
// Nhân 10 so với bản cũ để một gói dùng được nhiều lượt (Starter ≈ 10–20 câu),
// giá và tỉ lệ bonus giữ nguyên nên kinh tế token không đổi.
const PACKAGES = [
  { id: 'p1', tokens: 10000, bonus: 0, price: '29.000đ', label: 'Starter' },
  { id: 'p2', tokens: 50000, bonus: 5000, price: '129.000đ', label: 'Pro' },
  { id: 'p3', tokens: 100000, bonus: 15000, price: '249.000đ', label: 'Team' },
  { id: 'p4', tokens: 500000, bonus: 100000, price: '999.000đ', label: 'Enterprise' },
];

// Thông tin chuyển khoản mô phỏng (đồ án) — không phải tài khoản thật
const BANK = {
  bank: 'Vietcombank (demo)',
  account: '0123 456 789 012',
  holder: 'CONG TY AIBOX',
};

export function CreditsTopupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state, topUpTokens } = useApp();
  const toast = useToast();
  const user = state.user;

  const [selected, setSelected] = useState('p2');
  const [payOpen, setPayOpen] = useState(false);
  // idle (chờ chuyển) → processing (đang xác nhận) → done (đã cộng token)
  const [step, setStep] = useState('idle');
  const [order, setOrder] = useState(null);
  const timerRef = useRef(null);

  const pkg = PACKAGES.find(p => p.id === selected) || PACKAGES[1];
  const totalTokens = pkg.tokens + pkg.bonus;

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const openPayment = () => {
    if (step === 'processing') return;
    setOrder({
      code: `AIBOX${Date.now().toString().slice(-6)}`,
      amount: pkg.price,
      tokens: totalTokens,
      label: pkg.label,
    });
    setStep('idle');
    setPayOpen(true);
  };

  const closePayment = () => {
    if (step === 'processing') return; // không cho đóng khi đang xác nhận
    setPayOpen(false);
    setStep('idle');
  };

  const confirmTransfer = () => {
    if (step !== 'idle' || !order) return;
    setStep('processing');
    // Mô phỏng thời gian cổng thanh toán xác nhận
    timerRef.current = setTimeout(() => {
      topUpTokens(order.tokens, `Gói ${order.label} · ${order.code}`);
      hapticSuccess();
      setStep('done');
      toast.success(`Đã nạp ${formatToken(order.tokens)} token · ≈ ${chatsRange(order.tokens)} câu hỏi AI`);
    }, 1400);
  };

  const handleCopy = async (value, label) => {
    const ok = await copyText(value);
    if (ok) toast.success(`Đã sao chép ${label}`);
    else { hapticError(); toast.error('Không sao chép được.'); }
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
            1 token = 1 token AI xử lý. Mỗi lượt chat tốn ~{formatToken(TOKENS_PER_CHAT_MIN)}–{formatToken(TOKENS_PER_CHAT_MAX)} token;
            gói {PACKAGES[0].label} ≈ {chatsRange(PACKAGES[0].tokens + PACKAGES[0].bonus)} câu hỏi AI.
          </Text>
        </View>

        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.6}>Chọn gói nạp</Text>
        <View style={styles.grid}>
          {PACKAGES.map(p => {
            const active = p.id === selected;
            const bonus = p.bonus > 0;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={p.id}
                style={[styles.pkgCard, active && styles.pkgCardActive]}
                onPress={() => setSelected(p.id)}
                activeOpacity={0.85}
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${p.label}, ${formatToken(p.tokens)} token${bonus ? `, tặng ${formatToken(p.bonus)}` : ''}, ≈ ${chatsRange(p.tokens + p.bonus)} câu hỏi AI, ${p.price}`}
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
                  token{bonus ? ` +${formatToken(p.bonus)}` : ''}
                </Text>
                <Text style={styles.pkgChats} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                  ≈ {chatsRange(p.tokens + p.bonus)} câu hỏi AI
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
        <Text style={styles.payNote} maxFontSizeMultiplier={1.6}>
          Thanh toán mô phỏng cho đồ án — không phát sinh giao dịch thật.
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

      <BottomSheet
        visible={payOpen}
        onClose={closePayment}
        title={step === 'done' ? 'Nạp thành công' : 'Thanh toán chuyển khoản'}
        subtitle={order ? `Mã đơn ${order.code}` : ''}
        footer={
          step === 'done' ? (
            <Button label="Xong" onPress={() => { setPayOpen(false); setStep('idle'); }} fullWidth />
          ) : (
            <Button
              label={step === 'processing' ? 'Đang xác nhận…' : 'Tôi đã chuyển khoản'}
              icon={step === 'processing' ? undefined : 'check'}
              onPress={confirmTransfer}
              loading={step === 'processing'}
              disabled={step === 'processing'}
              fullWidth
            />
          )
        }
      >
        {step === 'done' ? (
          <View style={styles.doneBox}>
            <View style={styles.doneIcon}>
              <AppIcon name="check" size={28} color={colors.success} />
            </View>
            <Text style={styles.doneTitle} maxFontSizeMultiplier={1.6}>
              +{formatToken(order?.tokens || 0)} token
            </Text>
            <View style={styles.doneBalance}>
              <Text style={styles.doneText} maxFontSizeMultiplier={1.8}>
                Số dư mới: {formatToken(user?.tokenBalance || 0)}
              </Text>
              <TokenIcon size={14} />
            </View>
            <Text style={styles.doneHint} maxFontSizeMultiplier={1.6}>
              Giao dịch đã được ghi vào lịch sử nạp bên dưới.
            </Text>
          </View>
        ) : (
          <View style={styles.payBody}>
            <StatusSteps step={step} />

            <View style={styles.amountBox}>
              <Text style={styles.amountLabel} maxFontSizeMultiplier={1.5}>Số tiền cần chuyển</Text>
              <Text style={styles.amountValue} maxFontSizeMultiplier={1.5}>{order?.amount}</Text>
              <Text style={styles.amountNote} maxFontSizeMultiplier={1.6}>
                Nhận {formatToken(order?.tokens || 0)} token (đã gồm bonus) · ≈ {chatsRange(order?.tokens || 0)} câu hỏi AI
              </Text>
            </View>

            {/* QR mô phỏng: đồ án chưa nối cổng thanh toán nên không tạo mã thật */}
            <View style={styles.qrBox}>
              <AppIcon name="grid" size={28} color={colors.textFaint} />
              <Text style={styles.qrTitle} maxFontSizeMultiplier={1.6}>QR chuyển khoản</Text>
              <Text style={styles.qrHint} maxFontSizeMultiplier={1.6}>
                Bản demo chưa nối cổng thanh toán. Dùng thông tin bên dưới để mô phỏng.
              </Text>
            </View>

            <View style={styles.bankBox}>
              <Row label="Ngân hàng" value={BANK.bank} />
              <Row
                label="Số tài khoản"
                value={BANK.account}
                right={<IconButton icon="copy" label="Sao chép số tài khoản" size={16} onPress={() => handleCopy(BANK.account, 'số tài khoản')} />}
              />
              <Row label="Chủ tài khoản" value={BANK.holder} />
              <Row
                label="Nội dung"
                value={order?.code || ''}
                right={<IconButton icon="copy" label="Sao chép nội dung chuyển khoản" size={16} onPress={() => handleCopy(order?.code || '', 'nội dung')} />}
              />
            </View>

            <Button
              label="Sao chép tất cả thông tin"
              icon="copy"
              variant="ghost"
              fullWidth
              onPress={() => handleCopy(
                `${BANK.bank}\nSTK: ${BANK.account}\nChủ TK: ${BANK.holder}\nSố tiền: ${order?.amount}\nNội dung: ${order?.code}`,
                'thông tin chuyển khoản'
              )}
            />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

// 3 bước trạng thái đơn: tạo → xác nhận → cộng token
function StatusSteps({ step }) {
  const activeIndex = step === 'processing' ? 1 : 0;
  const steps = ['Tạo đơn', 'Xác nhận', 'Cộng token'];
  return (
    <View style={styles.steps} accessibilityLabel={`Trạng thái: ${steps[activeIndex]}`}>
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
              {done ? <AppIcon name="check" size={10} color={colors.bg} /> : null}
            </View>
            <Text style={[styles.stepLabel, (done || active) && styles.stepLabelOn]} maxFontSizeMultiplier={1.5}>
              {label}
            </Text>
            {i < steps.length - 1 ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
          </View>
        );
      })}
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
  payBody: { gap: spacing.lg },
  steps: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: colors.accentSoft, backgroundColor: colors.accentDim },
  stepDotDone: { borderColor: colors.success, backgroundColor: colors.success },
  stepLabel: { ...type.small, color: colors.textFaint },
  stepLabelOn: { color: colors.text },
  stepLine: { flex: 1, height: 1.5, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  stepLineDone: { backgroundColor: colors.success },
  amountBox: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  amountLabel: { ...type.small, color: colors.textDim },
  amountValue: { ...type.h1, ...type.numeric, color: colors.text },
  amountNote: { ...type.small, color: colors.textFaint },
  qrBox: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderSoft,
  },
  qrTitle: { ...type.bodyStrong, color: colors.textDim },
  qrHint: { ...type.small, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },
  bankBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  doneBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successDim,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  doneTitle: { ...type.h1, color: colors.success },
  doneText: { ...type.body, color: colors.text },
  doneBalance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  doneHint: { ...type.small, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },
});
