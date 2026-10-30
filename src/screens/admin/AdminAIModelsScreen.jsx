// screens/admin/AdminAIModelsScreen.jsx — Quản lý AI model (bật/tắt) & thống kê usage
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { formatTokenShort } from '../../utils/format';

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
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>AI Models</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalCalls}</Text>
          <Text style={styles.summaryLabel}>Lượt gọi AI</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#FFB74D' }]}>{formatTokenShort(totalSpent)}</Text>
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
              style={[styles.toggle, model.isAvailable ? styles.toggleOn : styles.toggleOff]}
              onPress={() => toggleModelAvailability(model.id)}
            >
              <Text style={[styles.toggleText, { color: model.isAvailable ? '#00CE7E' : '#8E8E93' }]}>
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
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  summaryCard: { flex: 1, backgroundColor: '#1A1D24', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  summaryValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  summaryLabel: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  hint: { color: '#5C5C5C', fontSize: 11, paddingHorizontal: 16, marginBottom: 10, lineHeight: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1D24', borderRadius: 12, marginHorizontal: 16, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: '#2A2E36' },
  cardOff: { opacity: 0.6 },
  icon: { fontSize: 22 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  provider: { color: '#5C5C5C', fontSize: 10 },
  meta: { color: '#8E8E93', fontSize: 11, marginTop: 3, fontFamily: 'monospace' },
  toggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  toggleOn: { backgroundColor: 'rgba(0, 206, 126, 0.12)', borderColor: 'rgba(0, 206, 126, 0.4)' },
  toggleOff: { backgroundColor: '#22262E', borderColor: '#2A2E36' },
  toggleText: { fontSize: 11, fontWeight: '700' },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, marginTop: 16 },
});
