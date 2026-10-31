// screens/AISettingsScreen.jsx — Cấu hình AI thật (OpenAI-compatible)
// Cho phép nhập Base URL / API key / model ngay trên điện thoại, lưu AsyncStorage,
// test kết nối. Mặc định đọc từ .env nên không bắt buộc phải nhập ở đây.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AI_PRESETS } from '../config/ai';
import { getAISettings } from '../services/ai';
import { AppIcon } from '../components/ui/AppIcon';
import { AppHeader, Button } from '../components/ui';
import { colors, centeredContent, touch } from '../theme/tokens';

export function AISettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { aiConfig, saveAIConfig, resetAIConfig, testAIConnect } = useApp();

  const initial = getAISettings();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || '');
  const [apiKey, setApiKey] = useState(initial.apiKey || '');
  const [model, setModel] = useState(initial.model || '');
  const [forceModel, setForceModel] = useState(initial.forceModel !== false);
  const [showKey, setShowKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const applyPreset = (preset) => {
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
    // Preset keyless (Pollinations/Ollama): xoá key cũ để không gửi kèm key sai
    if (preset.keyless) setApiKey('');
    setResult(null);
  };

  const currentPresetId = AI_PRESETS.find(p => p.baseUrl === baseUrl.trim().replace(/\/+$/, ''))?.id || null;

  const handleSave = async () => {
    if (saving || testing) return;
    setSaving(true);
    setResult(null);
    try {
      const status = await saveAIConfig({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || 'gpt-4o-mini',
        forceModel,
      });
      setResult(null);
      Alert.alert(
        'Đã lưu cấu hình AI',
        status.mode === 'live'
          ? `Đang gọi AI thật.\nMô hình: ${status.model}`
            + (status.allowsEmptyKey && !status.hasKey ? '\nKhông cần khóa API với nhà cung cấp này.' : '')
          : 'Chưa đủ địa chỉ API / khóa API nên ứng dụng vẫn dùng câu trả lời mô phỏng.'
      );
    } catch (error) {
      Alert.alert(
        'Không lưu được cấu hình',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu cấu hình AI.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (testing || saving) return;
    setTesting(true);
    setResult(null);
    try {
      // Lưu nháp trước để bộ test dùng đúng cấu hình vừa nhập
      await saveAIConfig({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || 'gpt-4o-mini',
        forceModel,
      });
      setResult(await testAIConnect());
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi kiểm tra kết nối.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => {
    if (saving || testing) return;
    Alert.alert(
      'Xoá cấu hình trong app',
      'Cấu hình sẽ quay về giá trị mặc định của ứng dụng (hoặc chế độ mô phỏng nếu chưa có).',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              const status = await resetAIConfig();
              setBaseUrl(status.baseUrl || '');
              setApiKey('');
              setModel(status.model || '');
              setForceModel(status.forceModel !== false);
              setResult(null);
            } catch (error) {
              Alert.alert(
                'Không xoá được cấu hình',
                error instanceof Error ? error.message : 'Đã xảy ra lỗi khi đặt lại cấu hình AI.',
              );
            }
          },
        },
      ]
    );
  };

  const live = aiConfig?.mode === 'live';

  return (
    <ScrollView
      style={styles.container}
      stickyHeaderIndices={[0]}
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <AppHeader navigation={navigation} title="Cấu hình AI" />

      {/* Trạng thái hiện tại */}
      <View style={[styles.statusCard, live ? styles.statusLive : styles.statusMock]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: live ? colors.success : colors.warning }]} />
          <Text style={styles.statusTitle}>{live ? 'Đang gọi AI thật' : 'Đang trả lời mô phỏng'}</Text>
        </View>
        <Text style={styles.statusLine}>Địa chỉ API: {aiConfig?.baseUrl || '(chưa có)'}</Text>
        <Text style={styles.statusLine}>Mô hình mặc định: {aiConfig?.model || '(chưa có)'}</Text>
        <Text style={styles.statusLine}>
          Khóa API: {aiConfig?.hasKey
            ? aiConfig.maskedKey
            : (aiConfig?.allowsEmptyKey ? 'không cần khóa' : '(chưa có)')}
          {aiConfig?.local ? ' · kết nối mạng nội bộ' : ''}
          {!aiConfig?.local && aiConfig?.keyless ? ' · miễn phí, không cần đăng ký' : ''}
        </Text>
        <Text style={styles.statusLine}>
          Nguồn: {aiConfig?.customized ? 'lưu trong ứng dụng' : 'cấu hình mặc định'}
        </Text>
      </View>

      {/* Preset nhà cung cấp */}
      <Text style={styles.sectionTitle}>Chọn nhanh nhà cung cấp</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
        {AI_PRESETS.map(p => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: currentPresetId === p.id }}
            key={p.id}
            style={[styles.presetChip, currentPresetId === p.id && styles.presetChipActive]}
            onPress={() => applyPreset(p)}
            activeOpacity={0.85}
          >
            <AppIcon name={p.icon} size={18} color={currentPresetId === p.id ? colors.accentSoft : colors.textDim} />
            <Text style={[styles.presetName, currentPresetId === p.id && styles.presetNameActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {currentPresetId && (
        <Text style={styles.presetHint}>{AI_PRESETS.find(p => p.id === currentPresetId)?.hint}</Text>
      )}

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Địa chỉ API</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="https://api.openai.com/v1"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="Địa chỉ API của nhà cung cấp AI"
        />
        <Text style={styles.help}>Địa chỉ phải theo chuẩn OpenAI, thường kết thúc bằng /v1</Text>

        <Text style={styles.label}>Khóa API</Text>
        <View style={styles.keyRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showKey}
            accessibilityLabel="Khóa API"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={showKey ? 'Ẩn khóa API' : 'Hiện khóa API'}
            accessibilityState={{ selected: showKey }}
            style={styles.eyeBtn}
            onPress={() => setShowKey(v => !v)}
          >
            <Text style={styles.eyeText}>{showKey ? 'Ẩn' : 'Hiện'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.help}>
          Pollinations và Ollama/LM Studio (mạng nội bộ) không cần khóa — để trống vẫn gọi được.
        </Text>

        <Text style={styles.label}>Mô hình mặc định</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="gpt-4o-mini"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Mô hình AI mặc định"
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Ép dùng mô hình mặc định</Text>
            <Text style={styles.help}>
              Bật: mọi mô hình trong ứng dụng đều gọi bằng mô hình ở trên (an toàn với cổng chỉ có 1 mô hình).
              Tắt: dùng theo tên mô hình đã chọn.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Ép dùng mô hình mặc định"
            accessibilityHint="Bật để mọi mô hình trong ứng dụng dùng cấu hình mô hình mặc định"
            value={forceModel}
            onValueChange={setForceModel}
            trackColor={{ false: colors.surfaceAlt, true: colors.accentBorder }}
            thumbColor={forceModel ? colors.accentSoft : colors.textDim}
          />
        </View>
      </View>

      {/* Kết quả test */}
      {result && (
        <View style={[styles.resultBox, result.ok ? styles.resultOk : styles.resultErr]}>
          <Text style={[styles.resultTitle, { color: result.ok ? colors.success : colors.danger }]}>
            {result.ok ? `Kết nối OK · ${result.totalMs}ms` : 'Kết nối thất bại'}
          </Text>
          {result.ok ? (
            <>
              <Text style={styles.resultText}>Mô hình phản hồi: {result.model}</Text>
              <Text style={styles.resultText}>Trả lời thử: {result.text || '(rỗng)'}</Text>
            </>
          ) : (
            <Text style={styles.resultText}>{result.error}</Text>
          )}
        </View>
      )}

      {/* Hành động */}
      <View style={styles.actions}>
        <Button label="Kiểm tra kết nối" icon="power" variant="secondary" style={styles.actionButton} onPress={handleTest} loading={testing} disabled={testing || saving} />
        <Button label="Lưu cấu hình" style={styles.actionButton} onPress={handleSave} loading={saving} disabled={saving || testing} />
      </View>

      <Button label="Xoá cấu hình trong ứng dụng" variant="secondary" fullWidth onPress={handleReset} disabled={saving || testing} />

      <View style={styles.warnBox}>
        <View style={styles.noticeTitle}><AppIcon name="zap" size={16} color={colors.warning} /><Text style={styles.warnTitle}>Gợi ý nhanh</Text></View>
        <Text style={styles.warnText}>
          • Muốn thử ngay không cần đăng ký: chọn nhanh Pollinations (không cần khóa).{'\n'}
          • Gemini có gói miễn phí: aistudio.google.com/apikey{'\n'}
          • Groq có gói miễn phí: console.groq.com/keys{'\n'}
          • Chưa có khóa: ứng dụng vẫn trả lời mô phỏng để bạn trải nghiệm đủ luồng.{'\n'}
          • Dùng Ollama trên máy tính: điện thoại phải cùng Wi-Fi, địa chỉ dạng
          http://IP-LAN:11434/v1 (không dùng localhost).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  statusCard: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  statusLive: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  statusMock: { backgroundColor: colors.warningDim, borderColor: colors.warningBorder },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  statusLine: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },
  presetRow: { paddingHorizontal: 16, gap: 8 },
  presetChip: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 78, minHeight: touch.min },
  presetChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  presetName: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  presetNameActive: { color: colors.text },
  presetHint: { color: colors.textFaint, fontSize: 12, marginHorizontal: 16, marginTop: 8, lineHeight: 15 },
  form: { marginHorizontal: 16, marginTop: 12 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 13, paddingHorizontal: 12, paddingVertical: 11, minHeight: touch.min },
  keyRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  eyeBtn: { backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 12, minHeight: touch.min, justifyContent: 'center' },
  eyeText: { color: colors.accentSoft, fontSize: 12, fontWeight: '600' },
  help: { color: colors.textFaint, fontSize: 12, marginTop: 6, lineHeight: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  switchLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  resultBox: { marginHorizontal: 16, marginTop: 16, borderRadius: 10, borderWidth: 1, padding: 12 },
  resultOk: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  resultErr: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  resultTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  resultText: { color: colors.textDim, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 18 },
  testBtn: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, minHeight: touch.min, justifyContent: 'center', alignItems: 'center' },
  testBtnText: { color: colors.accentSoft, fontSize: 13, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: colors.accentStrong, borderRadius: 10, minHeight: touch.min, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: colors.onAccent, fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  resetBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 10, minHeight: touch.min },
  resetBtnText: { color: colors.textDim, fontSize: 12, textDecorationLine: 'underline' },
  warnBox: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, marginHorizontal: 16, marginTop: 16, padding: 12 },
  noticeTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  warnTitle: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnText: { color: colors.textDim, fontSize: 12, lineHeight: 17 },
});
