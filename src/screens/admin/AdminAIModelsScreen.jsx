// screens/admin/AdminAIModelsScreen.jsx — Quản lý AI model (bật/tắt) & thống kê usage
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { formatToken } from '../../utils/format';
import { logCost } from '../../services/aiLogStore';
import { AppHeader } from '../../components/ui';
import { AIProviderLogo } from '../../components/AIProviderLogo';
import { colors, centeredContent, touch } from '../../theme/tokens';

export function AdminAIModelsScreen({ navigation }) {
  const { state, toggleModelAvailability } = useApp();
  const insets = useSafeAreaInsets();

  // Đếm lượt gọi + token thu được theo từng model, đọc từ store log duy nhất
  // (cùng nguồn với Home/Logs/Usage/Profile). Gom theo model người dùng chọn
  // trong app (log.modelId) để khớp danh mục model bên dưới.
  const usage = {};
  state.aiLogs.forEach(log => {
    const id = log.modelId;
    if (!id) return;
    if (!usage[id]) usage[id] = { calls: 0, spent: 0 };
    usage[id].calls += 1;
    usage[id].spent += logCost(log);
  });

  const totalCalls = Object.values(usage).reduce((sum, item) => sum + item.calls, 0);
  const totalSpent = Object.values(usage).reduce((sum, item) => sum + item.spent, 0);

  return (
    <ScrollView
      style={styles.container}
      stickyHeaderIndices={[0]}
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 24 }]}
    >
      <AppHeader navigation={navigation} title="Mô hình AI" />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalCalls}</Text>
          <Text style={styles.summaryLabel}>Lượt gọi AI</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{formatToken(totalSpent)}</Text>
          <Text style={styles.summaryLabel}>Token thu được</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        Token được trừ theo đúng số token nhà cung cấp báo về. Bật/tắt "đang mở" để tạm ngưng bán mô hình đó.
      </Text>

      {state.aiModels.map(model => {
        const item = usage[model.id] || { calls: 0, spent: 0 };
        return (
          <View
            key={model.id}
            style={[styles.card, !model.isAvailable && styles.cardOff]}
          >
            <AIProviderLogo provider={model.provider} size={36} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{model.name}</Text>
                <Text style={styles.provider}>{model.providerName}</Text>
              </View>
              <Text style={styles.meta}>
                {item.calls} lượt · thu {formatToken(item.spent)} token · theo mức sử dụng
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${model.isAvailable ? 'Tắt' : 'Mở'} mô hình ${model.name}`}
              accessibilityState={{ selected: model.isAvailable }}
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  summaryValue: { color: colors.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  hint: { color: colors.textFaint, fontSize: 12, paddingHorizontal: 16, marginBottom: 10, lineHeight: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  cardOff: { opacity: 0.6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 13, fontWeight: '600' },
  provider: { color: colors.textFaint, fontSize: 12 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 3, fontVariant: ['tabular-nums'] },
  toggle: { minWidth: touch.min, paddingHorizontal: 10, minHeight: touch.min, justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1 },
  toggleOn: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  toggleOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
  toggleText: { fontSize: 12, fontWeight: '700' },
});
