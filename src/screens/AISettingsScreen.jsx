// screens/AISettingsScreen.jsx — Cấu hình AI thật (OpenAI-compatible)
// Cho phép nhập Base URL / API key / model ngay trên điện thoại, lưu AsyncStorage,
// test kết nối. Mặc định đọc từ .env nên không bắt buộc phải nhập ở đây.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AI_PRESETS } from '../config/ai';
import { getAISettings } from '../services/ai';
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
          ? `Đang ở chế độ LIVE.\nModel: ${status.model}`
            + (status.allowsEmptyKey && !status.hasKey ? '\nKhông cần API key với nhà cung cấp này.' : '')
          : 'Chưa đủ Base URL / API key nên app vẫn dùng câu trả lời mô phỏng.'
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
      'Cấu hình sẽ quay về giá trị trong .env (hoặc chế độ mock nếu .env trống).',
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
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu hình AI</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Trạng thái hiện tại */}
      <View style={[styles.statusCard, live ? styles.statusLive : styles.statusMock]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: live ? colors.success : colors.warning }]} />
          <Text style={styles.statusTitle}>{live ? 'LIVE — gọi AI thật' : 'MOCK — câu trả lời mô phỏng'}</Text>
        </View>
        <Text style={styles.statusLine}>Base URL: {aiConfig?.baseUrl || '(chưa có)'}</Text>
        <Text style={styles.statusLine}>Model mặc định: {aiConfig?.model || '(chưa có)'}</Text>
        <Text style={styles.statusLine}>
          API key: {aiConfig?.hasKey
            ? aiConfig.maskedKey
            : (aiConfig?.allowsEmptyKey ? 'không cần key' : '(chưa có)')}
          {aiConfig?.local ? ' · kết nối LAN' : ''}
          {!aiConfig?.local && aiConfig?.keyless ? ' · miễn phí, không cần đăng ký' : ''}
        </Text>
        <Text style={styles.statusLine}>
          Nguồn: {aiConfig?.customized ? 'lưu trong app' : 'file .env'}
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
            <Text style={styles.presetIcon}>{p.icon}</Text>
            <Text style={[styles.presetName, currentPresetId === p.id && styles.presetNameActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {currentPresetId && (
        <Text style={styles.presetHint}>{AI_PRESETS.find(p => p.id === currentPresetId)?.hint}</Text>
      )}

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Base URL</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="https://api.openai.com/v1"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="Base URL của nhà cung cấp AI"
        />
        <Text style={styles.help}>Phải là endpoint chuẩn OpenAI, thường kết thúc bằng /v1</Text>

        <Text style={styles.label}>API key</Text>
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
            accessibilityLabel="API key"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={showKey ? 'Ẩn API key' : 'Hiện API key'}
            accessibilityState={{ selected: showKey }}
            style={styles.eyeBtn}
            onPress={() => setShowKey(v => !v)}
          >
            <Text style={styles.eyeText}>{showKey ? 'Ẩn' : 'Hiện'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.help}>
          Pollinations và Ollama/LM Studio (LAN) không cần key — để trống vẫn gọi được.
        </Text>

        <Text style={styles.label}>Model mặc định</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="gpt-4o-mini"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Model AI mặc định"
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Ép dùng model mặc định</Text>
            <Text style={styles.help}>
              Bật: mọi model trong app đều gọi bằng model ở trên (an toàn với gateway 1 model).
              Tắt: map theo tên model đã chọn.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Ép dùng model mặc định"
            accessibilityHint="Bật để mọi model trong ứng dụng dùng cấu hình model mặc định"
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
              <Text style={styles.resultText}>Model phản hồi: {result.model}</Text>
              <Text style={styles.resultText}>Trả lời thử: {result.text || '(rỗng)'}</Text>
            </>
          ) : (
            <Text style={styles.resultText}>{result.error}</Text>
          )}
        </View>
      )}

      {/* Hành động */}
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kiểm tra kết nối AI"
          accessibilityState={{ busy: testing, disabled: testing || saving }}
          style={[styles.testBtn, testing && styles.btnDisabled]}
          onPress={handleTest}
          disabled={testing || saving}
        >
          {testing ? <ActivityIndicator color={colors.accentSoft} /> : <Text style={styles.testBtnText}>{'\u{1F50C}'} Kiểm tra kết nối</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Lưu cấu hình AI"
          accessibilityState={{ busy: saving, disabled: saving || testing }}
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || testing}
        >
          {saving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveBtnText}>Lưu cấu hình</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Xoá cấu hình AI đã lưu và quay về .env"
        accessibilityState={{ disabled: saving || testing }}
        disabled={saving || testing}
        style={styles.resetBtn}
        onPress={handleReset}
      >
        <Text style={styles.resetBtnText}>Xoá cấu hình trong app (quay về .env)</Text>
      </TouchableOpacity>

      <View style={styles.warnBox}>
        <Text style={styles.warnTitle}>{'\u{26A0}'} Lưu ý bảo mật</Text>
        <Text style={styles.warnText}>
          API key lưu trên thiết bị (AsyncStorage) và mọi biến EXPO_PUBLIC_* đều nằm trong bundle —
          chỉ phù hợp đồ án/demo. Nếu triển khai thật, hãy đặt key ở backend/proxy rồi để app gọi
          server của bạn, đừng nhúng key vào app.
        </Text>
      </View>

      <View style={styles.warnBox}>
        <Text style={styles.warnTitle}>{'\u{1F4A1}'} Gợi ý nhanh</Text>
        <Text style={styles.warnText}>
          • Muốn thử ngay không cần đăng ký: chọn preset Pollinations (keyless).{'\n'}
          • Gemini có free tier: aistudio.google.com/apikey{'\n'}
          • Groq free tier: console.groq.com/keys{'\n'}
          • Không có key: giữ nguyên mock, app vẫn demo đủ luồng.{'\n'}
          • Dùng Ollama trên máy tính: điện thoại phải cùng Wi-Fi, Base URL là
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
  presetIcon: { fontSize: 16, marginBottom: 2 },
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
  warnTitle: { color: colors.warning, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  warnText: { color: colors.textDim, fontSize: 12, lineHeight: 17 },
});
