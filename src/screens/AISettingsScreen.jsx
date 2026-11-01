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
import { colors, centeredContent, touch, spacing, layout, radius, type } from '../theme/tokens';

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
      contentContainerStyle={[centeredContent, { paddingBottom: insets.bottom + spacing.xxxl }]}
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
  statusCard: {
    marginHorizontal: layout.gutter,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusLive: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  statusMock: { backgroundColor: colors.warningDim, borderColor: colors.warningBorder },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  statusDot: { width: spacing.sm, height: spacing.sm, borderRadius: spacing.xs },
  statusTitle: { ...type.bodyStrong, color: colors.text },
  statusLine: { ...type.small, color: colors.textDim, marginTop: spacing.xs },
  sectionTitle: {
    ...type.bodyStrong,
    color: colors.text,
    marginHorizontal: layout.gutter,
    marginBottom: spacing.sm,
  },
  presetRow: { paddingHorizontal: layout.gutter, gap: spacing.sm },
  presetChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 78,
    minHeight: touch.min,
  },
  presetChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  presetName: { ...type.smallStrong, color: colors.textDim },
  presetNameActive: { color: colors.text },
  presetHint: {
    ...type.small,
    color: colors.textFaint,
    marginHorizontal: layout.gutter,
    marginTop: spacing.sm,
  },
  form: { marginHorizontal: layout.gutter, marginTop: spacing.md },
  label: {
    ...type.smallStrong,
    color: colors.textDim,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    ...type.body,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: touch.min,
  },
  keyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  eyeBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    minHeight: touch.min,
    justifyContent: 'center',
  },
  eyeText: { ...type.smallStrong, color: colors.accentSoft },
  help: { ...type.small, color: colors.textFaint, marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  switchLabel: { ...type.bodyStrong, color: colors.text },
  resultBox: {
    marginHorizontal: layout.gutter,
    marginTop: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  resultOk: { backgroundColor: colors.successDim, borderColor: colors.successBorder },
  resultErr: { backgroundColor: colors.dangerDim, borderColor: colors.dangerBorder },
  resultTitle: { ...type.smallStrong, marginBottom: spacing.sm },
  resultText: { ...type.small, color: colors.textDim },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: layout.gutter,
    marginTop: spacing.lg,
  },
  actionButton: { flex: 1 },
  warnBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginHorizontal: layout.gutter,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  noticeTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  warnTitle: { ...type.smallStrong, color: colors.warning },
  warnText: { ...type.small, color: colors.textDim },
});
