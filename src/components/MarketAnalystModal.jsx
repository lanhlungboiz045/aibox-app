// components/MarketAnalystModal.jsx — "Hỏi AI về kèo này"
// Truyền context của market vào prompt rồi tính phí như 1 lần gọi AI bình thường.
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getStoreItem } from '../data/storeItems';
import { formatToken } from '../utils/format';

export function MarketAnalystModal({ visible, market, onClose }) {
  const { state, analyzeMarketAI, aiConfig } = useApp();
  const user = state.user;

  const availableModels = state.aiModels.filter(m => m.isAvailable);
  const [modelId, setModelId] = useState(availableModels[0]?.id || null);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Reset khi mở modal cho market khác
  useEffect(() => {
    if (!visible) return;
    setResult(null);
    setError(null);
    setExtraPrompt('');
    setModelId(prev => (availableModels.some(m => m.id === prev) ? prev : availableModels[0]?.id || null));
  }, [visible, market?.id]);

  if (!market || !user) return null;

  const model = availableModels.find(m => m.id === modelId) || null;
  const cost = model?.tokenCost || 0;
  const canAfford = user.tokenBalance >= cost;
  // Prompt pack mua trong Store → dùng làm yêu cầu thêm
  const promptPacks = user.inventory.map(getStoreItem).filter(item => item && item.type === 'prompt');

  const run = async () => {
    if (!model) { setError('Chưa chọn model.'); return; }
    setBusy(true);
    setError(null);
    const response = await analyzeMarketAI({
      marketId: market.id,
      modelId: model.id,
      extraPrompt: extraPrompt.trim(),
    });
    setBusy(false);
    if (!response.ok) { setError(response.error); return; }
    setResult({ text: response.text, modelName: model.name, cost, mode: response.mode });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{'\u{1F916}'} Hỏi AI về kèo này</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>{'\u{2715}'}</Text></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <Text style={styles.marketQuestion} numberOfLines={3}>{market.question}</Text>

            {!result && (
              <>
                <Text style={styles.label}>Chọn model</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {availableModels.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelChip, m.id === modelId && styles.modelChipActive]}
                      onPress={() => { setModelId(m.id); setError(null); }}
                    >
                      <Text style={styles.modelIcon}>{m.icon}</Text>
                      <Text style={[styles.modelName, m.id === modelId && styles.modelNameActive]}>{m.name}</Text>
                      <Text style={styles.modelCost}>{m.tokenCost} {'\u{1F4B0}'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {promptPacks.length > 0 && (
                  <>
                    <Text style={styles.label}>Prompt đã mua</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {promptPacks.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.packChip, extraPrompt === item.prompt && styles.packChipActive]}
                          onPress={() => setExtraPrompt(item.prompt)}
                        >
                          <Text style={styles.packText}>{item.icon} {item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                <Text style={styles.label}>Yêu cầu thêm (tùy chọn)</Text>
                <TextInput
                  style={styles.input}
                  value={extraPrompt}
                  onChangeText={setExtraPrompt}
                  placeholder="VD: nên vào YES hay NO? rủi ro lớn nhất là gì?"
                  placeholderTextColor="#5C5C5C"
                  multiline
                />

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Chi phí</Text>
                  <Text style={[styles.costValue, !canAfford && { color: '#FF6B6B' }]}>
                    {cost} {'\u{1F4B0}'} · số dư {formatToken(user.tokenBalance)}
                  </Text>
                </View>

                {error ? <Text style={styles.error}>{'\u{26A0}'} {error}</Text> : null}

                <TouchableOpacity
                  style={[styles.runBtn, (!model || !canAfford || busy) && styles.runBtnDisabled]}
                  onPress={run}
                  disabled={!model || !canAfford || busy}
                >
                  {busy
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={styles.runText}>{'\u{2728}'} Phân tích ngay</Text>}
                </TouchableOpacity>
                {!canAfford && <Text style={styles.hint}>Không đủ token — vào Store hoặc nhận thưởng quests.</Text>}
                {aiConfig?.mode !== 'live' && (
                  <Text style={styles.hint}>
                    {'\u{26A0}\u{FE0F}'} Chưa cấu hình AI thật — kết quả là phân tích mẫu (Profile → Cấu hình AI).
                  </Text>
                )}
              </>
            )}

            {result && (
              <>
                <View style={styles.resultMeta}>
                  <Text style={styles.resultMetaText}>
                    {result.modelName} · -{result.cost} {'\u{1F4B0}'} · {result.mode === 'live' ? 'LIVE' : 'MOCK'}
                  </Text>
                </View>
                <Text style={styles.resultText} selectable>{result.text}</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => { setResult(null); setError(null); }}
                  >
                    <Text style={styles.secondaryText}>Hỏi lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                    <Text style={styles.primaryText}>Xong</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1A1D24', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '88%', borderWidth: 1, borderColor: '#2A2E36' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  close: { color: '#8E8E93', fontSize: 16, fontWeight: '700' },
  marketQuestion: { color: '#A78BFA', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  label: { color: '#8E8E93', fontSize: 12, marginTop: 14, marginBottom: 8 },
  modelChip: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 92 },
  modelChipActive: { borderColor: '#6C5CE7', backgroundColor: 'rgba(108, 92, 231, 0.12)' },
  modelIcon: { fontSize: 16, marginBottom: 2 },
  modelName: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  modelNameActive: { color: '#FFFFFF' },
  modelCost: { color: '#A78BFA', fontSize: 10, marginTop: 2, fontFamily: 'monospace' },
  packChip: { backgroundColor: '#22262E', borderRadius: 8, borderWidth: 1, borderColor: '#2A2E36', paddingHorizontal: 10, paddingVertical: 6 },
  packChipActive: { borderColor: '#00CE7E' },
  packText: { color: '#E0E0E0', fontSize: 11 },
  input: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, minHeight: 64, textAlignVertical: 'top' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  costLabel: { color: '#8E8E93', fontSize: 12 },
  costValue: { color: '#A78BFA', fontSize: 12, fontWeight: '600', fontFamily: 'monospace' },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 10, lineHeight: 17 },
  runBtn: { backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  runBtnDisabled: { opacity: 0.4 },
  runText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  hint: { color: '#FFB74D', fontSize: 11, marginTop: 8, textAlign: 'center' },
  resultMeta: { backgroundColor: '#22262E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 6, marginBottom: 10 },
  resultMetaText: { color: '#8E8E93', fontSize: 11, fontFamily: 'monospace' },
  resultText: { color: '#E0E0E0', fontSize: 13, lineHeight: 21 },
  resultActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  secondaryBtn: { flex: 1, backgroundColor: '#22262E', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  secondaryText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },
  primaryBtn: { flex: 1, backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
