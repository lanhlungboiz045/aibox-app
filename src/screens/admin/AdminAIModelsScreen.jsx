// screens/admin/AdminAIModelsScreen.jsx — Quản lý AI model (bật/tắt) & thống kê usage
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { formatTokenShort } from '../../utils/format';
import { colors, centeredContent, touch } from '../../theme/tokens';

export function AdminAIModelsScreen({ navigation }) {
  const { state, toggleModelAvailability } = useApp();
  const insets = useSafeAreaInsets();

  // Đếm lượt gọi + token thu được theo từng model (dữ liệu từ transactions)
  const usage = {};
  state.accounts.forEach(account => {
    (account.transactions || []).forEach(tx => {
      if (tx.type !== 'AI_CALL' || !tx.modelId) return;
      if (!usage[tx.modelId]) usage[tx.modelId] = { calls: 0, spent: 0 };
      usage[tx.modelId].calls += 1;
      usage[tx.modelId].spent += Math.abs(tx.amount || 0);
    });
  });

  const totalCalls = Object.values(usage).reduce((sum, item) => sum + item.calls, 0);
  const totalSpent = Object.values(usage).reduce((sum, item) => sum + item.spent, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>AI Models</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalCalls}</Text>
          <Text style={styles.summaryLabel}>Lượt gọi AI</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{formatTokenShort(totalSpent)}</Text>
          <Text style={styles.summaryLabel}>Token thu được</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        Token được trừ theo đúng usage API trả về. Bật/tắt "đang mở" để tạm ngưng bán model đó.
      </Text>

      {state.aiModels.map(model => {
        const item = usage[model.id] || { calls: 0, spent: 0 };
        return (
          <View
            key={model.id}
            style={[styles.card, !model.isAvailable && styles.cardOff]}
          >
            <Text style={styles.icon}>{model.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{model.name}</Text>
                <Text style={styles.provider}>{model.providerName}</Text>
              </View>
              <Text style={styles.meta}>
                {item.calls} lượt · thu {formatTokenShort(item.spent)} {'\u{1F4B0}'} · theo usage
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.toggle, model.isAvailable ? styles.toggleOn : styles.toggleOff]}
              onPress={() => toggleModelAvailability(model.id)}
            >
              <Text style={[styles.toggleText, { color: model.isAvailable ? colors.success : colors.textDim }]}>
                {model.isAvailable ? 'Mở' : 'Tắt'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <Text style={styles.footnote}>
        Số token bị trừ lấy từ usage của nhà cung cấp AI; nếu gateway không trả usage thì app ước lượng ~4 ký tự/token.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  summaryValue: { color: colors.text, fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  summaryLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  hint: { color: colors.textFaint, fontSize: 12, paddingHorizontal: 16, marginBottom: 10, lineHeight: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  cardOff: { opacity: 0.6 },
  icon: { fontSize: 22 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 13, fontWeight: '600' },
  provider: { color: colors.textFaint, fontSize: 12 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 3, fontFamily: 'monospace' },
  toggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, minHeight: touch.min },
  toggleOn: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  toggleOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
  toggleText: { fontSize: 12, fontWeight: '700' },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
