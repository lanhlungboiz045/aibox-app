// components/MarketAnalystModal.jsx — "Hỏi AI về kèo này"
// Truyền context của market vào prompt rồi tính phí như 1 lần gọi AI bình thường.
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getStoreItem } from '../data/storeItems';
import { AppIcon } from './ui/AppIcon';
import { AIProviderLogo } from './AIProviderLogo';
import { formatToken } from '../utils/format';
import { MIN_AI_CALL_BALANCE } from '../utils/aiCost';
import { colors, centeredContent, touch } from '../theme/tokens';

// Hiển thị kết quả phân tích: bỏ ký hiệu markdown (**bold**) và làm nổi 3 dòng kết luận/hành động
function AnalysisText({ text }) {
  const lines = String(text || '').split('\n');
  return (
    <View>
      {lines.map((raw, index) => {
        const line = raw.replace(/\*\*/g, '').replace(/^#{1,6}\s*/, '').trimEnd();
        if (!line.trim()) return <View key={index} style={styles.spacer} />;
        const isVerdict = /^(kết luận|nhận định|chốt lại|quan điểm|khuyến nghị|verdict)\b/i.test(line);
        return (
          <Text key={index} style={isVerdict ? styles.verdictLine : styles.resultText} selectable>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

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
  // Trừ theo usage thật nên chưa biết trước chi phí → chỉ cần số dư tối thiểu
  const canAfford = user.tokenBalance >= MIN_AI_CALL_BALANCE;
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
    setResult({
      text: response.text,
      modelName: model.name,
      cost: response.cost || 0,
      usage: response.usage,
      mode: response.mode,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AppIcon name="cpu" size={18} color={colors.accentSoft} />
              <Text style={styles.title}>Hỏi AI về kèo này</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose}><AppIcon name="x" size={18} color={colors.textDim} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[centeredContent, { paddingBottom: 16 }]}>
            <Text style={styles.marketQuestion} numberOfLines={3}>{market.question}</Text>

            {!result && (
              <>
                <Text style={styles.label}>Chọn model</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {availableModels.map(m => (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ selected: m.id === modelId }}
                      key={m.id}
                      style={[styles.modelChip, m.id === modelId && styles.modelChipActive]}
                      onPress={() => { setModelId(m.id); setError(null); }}
                    >
                      <AIProviderLogo provider={m.provider} size={24} />
                      <Text style={[styles.modelName, m.id === modelId && styles.modelNameActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {promptPacks.length > 0 && (
                  <>
                    <Text style={styles.label}>Prompt đã mua</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {promptPacks.map(item => (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityState={{ selected: extraPrompt === item.prompt }}
                          key={item.id}
                          style={[styles.packChip, extraPrompt === item.prompt && styles.packChipActive]}
                          onPress={() => setExtraPrompt(item.prompt)}
                        >
                          <AppIcon name={item.icon} size={14} color={colors.textDim} />
                          <Text style={styles.packText}>{item.name}</Text>
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
                  placeholderTextColor={colors.textFaint}
                  multiline
                />

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Chi phí</Text>
                  <Text style={[styles.costValue, !canAfford && { color: colors.danger }]}>
                    trừ theo token thật · số dư {formatToken(user.tokenBalance)}
                  </Text>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.runBtn, (!model || !canAfford || busy) && styles.runBtnDisabled]}
                  onPress={run}
                  disabled={!model || !canAfford || busy}
                >
                  {busy
                    ? <ActivityIndicator color={colors.onAccent} />
                    : <View style={styles.runContent}><AppIcon name="zap" size={16} color={colors.onAccent} /><Text style={styles.runText}>Phân tích ngay</Text></View>}
                </TouchableOpacity>
                {!canAfford && <Text style={styles.hint}>Không đủ token — cần tối thiểu {MIN_AI_CALL_BALANCE} token để gọi AI.</Text>}
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
                    {result.modelName} · -{formatToken(result.cost)} {'\u{1F4B0}'}
                    {result.usage && result.usage.total_tokens
                      ? ` (${result.usage.total_tokens}${result.usage.estimated ? ' ~' : ''} token)`
                      : ''}
                    {' · '}{result.mode === 'live' ? 'LIVE' : 'MOCK'}
                  </Text>
                </View>
                <AnalysisText text={result.text} />
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.secondaryBtn}
                    onPress={() => { setResult(null); setError(null); }}
                  >
                    <Text style={styles.secondaryText}>Hỏi lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={onClose}>
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
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '88%', borderWidth: 1, borderColor: colors.borderSoft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  close: { color: colors.textDim, fontSize: 16, fontWeight: '700' },
  marketQuestion: { color: colors.accentSoft, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  label: { color: colors.textDim, fontSize: 12, marginTop: 14, marginBottom: 8 },
  modelChip: { backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 92, minHeight: touch.min },
  modelChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  modelName: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginTop: 4 },
  modelNameActive: { color: colors.text },
  packChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 10, minHeight: touch.min },
  packChipActive: { borderColor: colors.success },
  packText: { color: colors.text, fontSize: 12 },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, minHeight: 64, textAlignVertical: 'top' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  costLabel: { color: colors.textDim, fontSize: 12 },
  costValue: { color: colors.accentSoft, fontSize: 12, fontWeight: '600', fontFamily: 'monospace' },
  error: { color: colors.danger, fontSize: 12, marginTop: 10, lineHeight: 17 },
  runBtn: { backgroundColor: colors.accentStrong, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14, minHeight: touch.min },
  runBtnDisabled: { opacity: 0.4 },
  runContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
  hint: { color: colors.warning, fontSize: 12, marginTop: 8, textAlign: 'center' },
  resultMeta: { backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 6, marginBottom: 10 },
  resultMetaText: { color: colors.textDim, fontSize: 12, fontFamily: 'monospace' },
  resultText: { color: colors.text, fontSize: 13, lineHeight: 21 },
  verdictLine: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '600', backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6, overflow: 'hidden' },
  spacer: { height: 6 },
  resultActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  secondaryBtn: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  secondaryText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  primaryBtn: { flex: 1, backgroundColor: colors.accentStrong, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
});
