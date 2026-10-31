// components/PaymentSheet.jsx — Sheet thanh toán chuyển khoản dùng chung
//
// Trước đây luồng này nằm trong CreditsTopupScreen. Tách ra để màn Nạp token và
// màn Các gói dùng đúng một luồng: tạo đơn → xác nhận → cộng token vào ví.
// `order` = { code, amount, tokens, label } do màn gọi truyền vào.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { chatsRange } from '../utils/economy';
import { copyText } from '../utils/clipboard';
import { hapticError, hapticSuccess } from '../utils/feedback';
import { AppIcon, BottomSheet, Button, IconButton, Row, TokenIcon, useToast } from './ui';
import { colors, radius, spacing, type } from '../theme/tokens';

// Thông tin chuyển khoản mô phỏng — không phải tài khoản thật
const BANK = {
  bank: 'Vietcombank (mô phỏng)',
  account: '0123 456 789 012',
  holder: 'CONG TY AIBOX',
};

export function PaymentSheet({ visible, order, onClose }) {
  const { state, topUpTokens } = useApp();
  const toast = useToast();
  // idle (chờ chuyển) → processing (đang xác nhận) → done (đã cộng token)
  const [step, setStep] = useState('idle');
  const timerRef = useRef(null);
  const user = state.user;

  // Mỗi đơn mới mở lại từ trạng thái chờ xác nhận
  useEffect(() => {
    if (visible) setStep('idle');
  }, [visible, order?.code]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const close = () => {
    if (step === 'processing') return; // không cho đóng khi đang xác nhận
    onClose();
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

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={step === 'done' ? 'Nạp thành công' : 'Thanh toán chuyển khoản'}
      subtitle={order ? `Mã đơn ${order.code}` : ''}
      footer={
        step === 'done' ? (
          <Button label="Xong" onPress={onClose} fullWidth />
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
            Giao dịch đã được ghi vào lịch sử nạp.
          </Text>
        </View>
      ) : (
        <View style={styles.payBody}>
          <StatusSteps step={step} />

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel} maxFontSizeMultiplier={1.5}>Số tiền cần chuyển</Text>
            <Text style={styles.amountValue} maxFontSizeMultiplier={1.5}>{order?.amount}</Text>
            <Text style={styles.amountNote} maxFontSizeMultiplier={1.6}>
              Nhận {formatToken(order?.tokens || 0)} token · ≈ {chatsRange(order?.tokens || 0)} câu hỏi AI
            </Text>
          </View>

          {/* QR mô phỏng: đồ án chưa nối cổng thanh toán nên không tạo mã thật */}
          <View style={styles.qrBox}>
            <AppIcon name="grid" size={28} color={colors.textFaint} />
            <Text style={styles.qrTitle} maxFontSizeMultiplier={1.6}>QR chuyển khoản</Text>
            <Text style={styles.qrHint} maxFontSizeMultiplier={1.6}>
              Bản mô phỏng chưa nối cổng thanh toán. Dùng thông tin bên dưới để thử.
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
  amountValue: { ...type.h1, ...type.mono, color: colors.text },
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
