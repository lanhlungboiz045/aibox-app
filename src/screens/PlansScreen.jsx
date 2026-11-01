// screens/PlansScreen.jsx — Bảng giá "Các gói" token
//
// 5 gói theo tháng, mua bằng luồng chuyển khoản sẵn có (PaymentSheet): xác nhận
// xong token được cộng thẳng vào ví. Giá và số token hiển thị bằng mono
// theo "The Money Is Monospace Rule"; gói 2 Triệu Token là gói nổi bật.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatToken } from '../utils/format';
import { chatsRange } from '../utils/economy';
import { AppHeader, Button } from '../components/ui';
import { PaymentSheet } from '../components/PaymentSheet';
import { centeredContent, colors, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

// tokens = số token cộng vào ví sau khi thanh toán (1 token = 1đ giá trị).
const PLANS = [
  { id: 'q2m', name: '2 Triệu Token', tokens: 2000000, price: '936.000', featured: true },
  { id: 'q1m', name: '1 Triệu Token', tokens: 1000000, price: '520.000' },
  { id: 'q400k', name: '400K Token', tokens: 400000, price: '249.600' },
  { id: 'q180k', name: '180K Token', tokens: 180000, price: '130.000' },
  { id: 'q90k', name: '90K Token', tokens: 90000, price: '70.200' },
];

export function PlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState(null);
  const [payOpen, setPayOpen] = useState(false);

  const buy = (plan) => {
    setOrder({
      code: `AIBOX${Date.now().toString().slice(-6)}`,
      amount: `${plan.price}đ`,
      tokens: plan.tokens,
      label: 'Gói tháng',
    });
    setPayOpen(true);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        navigation={navigation}
        title={t('screen.plans')}
        subtitle="Gói token theo tháng"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead} maxFontSizeMultiplier={1.6}>
          Chọn gói theo tháng. Token cộng vào ví ngay sau khi xác nhận chuyển khoản.
        </Text>

        <View style={styles.list}>
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} onBuy={() => buy(plan)} />
          ))}
        </View>

        <Text style={styles.note} maxFontSizeMultiplier={1.6}>
          Thanh toán mô phỏng — không phát sinh giao dịch thật.
        </Text>
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

function PlanCard({ plan, onBuy }) {
  const { name, tokens, price, featured } = plan;

  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <View style={styles.cardHead}>
        <Text style={styles.name} maxFontSizeMultiplier={1.6}>{name}</Text>
        {featured ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} maxFontSizeMultiplier={1.6}>Phổ biến</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.desc} maxFontSizeMultiplier={1.6}>
        Dùng cho mọi mô hình AI, không giới hạn số lượt gọi
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price} maxFontSizeMultiplier={1.6}>{price}đ</Text>
        <Text style={styles.period} maxFontSizeMultiplier={1.5}>/tháng</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.total} maxFontSizeMultiplier={1.5}>
          {formatToken(tokens)} token
        </Text>
        <Text style={styles.chats} maxFontSizeMultiplier={1.5}>
          ≈ {chatsRange(tokens)} câu hỏi AI
        </Text>
      </View>

      <View style={styles.divider} />

      <Button
        label="Mua gói"
        variant="contrast"
        pill
        fullWidth
        onPress={onBuy}
        accessibilityLabel={`Mua gói ${name}`}
        accessibilityHint="Mở thanh toán chuyển khoản"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { ...centeredContent, padding: spacing.lg, gap: spacing.lg },
  lead: { ...type.small, color: colors.textFaint, lineHeight: 18 },

  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  // Gói nổi bật: viền tím + nền tím mờ, không đổ bóng (theo DESIGN.md)
  cardFeatured: {
    borderWidth: 1.5,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentDim,
  },

  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...type.subtitle, color: colors.text, flexShrink: 1 },
  badge: {
    backgroundColor: colors.accentStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...type.small, color: colors.onAccent, fontWeight: '700' },

  desc: { ...type.small, color: colors.textDim, lineHeight: 18 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  price: { ...type.h1, ...type.mono, color: colors.accentSoft },
  period: { ...type.small, color: colors.textFaint },

  meta: { gap: 2 },
  total: { ...type.small, ...type.mono, color: colors.textDim },
  chats: { ...type.small, color: colors.textFaint },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  note: { ...type.small, color: colors.textFaint, textAlign: 'center' },
});
