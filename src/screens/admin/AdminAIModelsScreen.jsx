// screens/admin/AdminAIModelsScreen.jsx — Quản lý giá token từng AI model
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { formatToken, formatTokenShort } from '../../utils/format';

export function AdminAIModelsScreen({ navigation }) {
  const { state, setModelPrice, toggleModelAvailability } = useApp();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(null);
  const [priceDraft, setPriceDraft] = useState('');

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

  const openEdit = (model) => {
    setEditing(model);
    setPriceDraft(String(model.tokenCost));
  };

  const save = () => {
    const price = Math.round(Number(priceDraft));
    if (!Number.isFinite(price) || price < 1 || price > 10000) {
      Alert.alert('Giá không hợp lệ', 'Giá phải là số từ 1 đến 10,000 token.');
      return;
    }
    setModelPrice(editing.id, price);
    setEditing(null);
  };

  const totalCalls = Object.values(usage).reduce((sum, item) => sum + item.calls, 0);
  const totalSpent = Object.values(usage).reduce((sum, item) => sum + item.spent, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Giá AI Models</Text>
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

      <Text style={styles.hint}>Nhấn vào model để sửa giá. Tắt "đang mở" để tạm ngưng bán model đó.</Text>

      {state.aiModels.map(model => {
        const item = usage[model.id] || { calls: 0, spent: 0 };
        return (
          <TouchableOpacity
            key={model.id}
            style={[styles.card, !model.isAvailable && styles.cardOff]}
            onPress={() => openEdit(model)}
            activeOpacity={0.8}
          >
            <Text style={styles.icon}>{model.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{model.name}</Text>
                <Text style={styles.provider}>{model.providerName}</Text>
              </View>
              <Text style={styles.meta}>
                {formatToken(model.tokenCost)} {'\u{1F4B0}'}/call · {item.calls} lượt · thu {formatTokenShort(item.spent)}
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
          </TouchableOpacity>
        );
      })}

      <Text style={styles.footnote}>
        Giá trong CMS phải được lưu ở server để mọi client dùng chung; ở bản demo này giá nằm trong AsyncStorage.
      </Text>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing?.icon} {editing?.name}</Text>
            <Text style={styles.modalLabel}>Giá token mỗi lần gọi</Text>
            <TextInput
              style={styles.modalInput}
              value={priceDraft}
              onChangeText={setPriceDraft}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor="#5C5C5C"
              autoFocus
            />
            <Text style={styles.modalHint}>Hiện tại: {formatToken(editing?.tokenCost || 0)} {'\u{1F4B0}'} · min 1 · max 10,000</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#1A1D24', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2A2E36' },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalLabel: { color: '#8E8E93', fontSize: 12, marginBottom: 6 },
  modalInput: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 18, fontWeight: '700', fontFamily: 'monospace', paddingHorizontal: 14, paddingVertical: 10 },
  modalHint: { color: '#5C5C5C', fontSize: 11, marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: '#22262E', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  cancelText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
