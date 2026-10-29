// screens/CreateMarketScreen.jsx — Market Creator / Admin tự tạo kèo
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';

const CATEGORIES = [
  { key: 'sports', label: 'Sports', icon: '\u{26BD}' },
  { key: 'crypto', label: 'Crypto', icon: '\u{20BF}' },
  { key: 'tech', label: 'Tech', icon: '\u{1F4BB}' },
  { key: 'entertainment', label: 'Entertain', icon: '\u{1F3B5}' },
  { key: 'life', label: 'Life', icon: '\u{1F4DA}' },
  { key: 'politics', label: 'Politics', icon: '\u{1F3DB}' },
];

const ICONS = ['\u{1F52E}', '\u{1F4C8}', '\u{26BD}', '\u{20BF}', '\u{1F3AF}', '\u{1F680}', '\u{1F3B2}', '\u{1F4F0}'];
const PRESET_PRICES = [30, 50, 70];

export function CreateMarketScreen({ navigation }) {
  const { state, createMarket } = useApp();
  const insets = useSafeAreaInsets();
  const user = state.user;

  const defaultEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const defaultEndText = defaultEnd.toISOString().slice(0, 10);

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('sports');
  const [icon, setIcon] = useState('\u{1F52E}');
  const [endDateText, setEndDateText] = useState(defaultEndText);
  const [yesPrice, setYesPrice] = useState('50');
  const [error, setError] = useState(null);

  const canCreate = user && ['admin', 'creator'].includes(user.role);

  if (!canCreate) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
          <Text style={styles.title}>Tạo market</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.lockCard}>
          <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>
          <Text style={styles.lockTitle}>Cần quyền Market Creator</Text>
          <Text style={styles.lockText}>
            Bạn đang là Standard User. Mua Creator Pass trong Store để tự tạo kèo và nhận 2% fee trên volume market của mình.
          </Text>
          <TouchableOpacity style={styles.lockBtn} onPress={() => navigation.navigate('Store')}>
            <Text style={styles.lockBtnText}>Mở Store</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const submit = () => {
    setError(null);
    const parsed = new Date(`${endDateText.trim()}T23:59:00`);
    if (Number.isNaN(parsed.getTime())) {
      setError('Ngày kết thúc không hợp lệ. Dùng định dạng YYYY-MM-DD.');
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      setError('Ngày kết thúc phải ở tương lai.');
      return;
    }

    const result = createMarket({
      question: question.trim(),
      description: description.trim() || 'Không có mô tả',
      category,
      icon,
      endDate: parsed.toISOString(),
      yesPrice: Number(yesPrice) || 50,
    });

    if (!result.ok) { setError(result.error); return; }

    Alert.alert(
      'Đã tạo market',
      'Market của bạn đã được đưa lên sàn. Platform tài trợ 10,000 token thanh khoản ban đầu; bạn nhận 2% fee trên volume khi market được resolve.',
      [{ text: 'Xem ngay', onPress: () => navigation.replace('MarketDetail', { marketId: result.marketId }) }]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>{'\u{276C}'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Tạo market</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          {'\u{1F451}'} Tạo với tư cách {user.role === 'admin' ? 'System Admin' : 'Market Creator'} · nhận 2% creator fee trên volume.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Câu hỏi / sự kiện</Text>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="VD: MU sẽ thắng Chelsea ngày 02/11?"
          placeholderTextColor="#5C5C5C"
          maxLength={140}
        />

        <Text style={styles.label}>Mô tả & điều kiện resolve</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Nêu rõ nguồn kết quả, mốc thời gian, điều kiện thắng..."
          placeholderTextColor="#5C5C5C"
          multiline
          maxLength={400}
        />

        <Text style={styles.label}>Danh mục</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, category === item.key && styles.chipActive]}
              onPress={() => setCategory(item.key)}
            >
              <Text style={[styles.chipText, category === item.key && styles.chipTextActive]}>{item.icon} {item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Icon</Text>
        <View style={styles.chipWrap}>
          {ICONS.map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.iconChip, icon === item && styles.chipActive]}
              onPress={() => setIcon(item)}
            >
              <Text style={styles.iconText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Giá YES ban đầu (%)</Text>
        <View style={styles.priceRow}>
          {PRESET_PRICES.map(price => (
            <TouchableOpacity
              key={price}
              style={[styles.chip, Number(yesPrice) === price && styles.chipActive]}
              onPress={() => setYesPrice(String(price))}
            >
              <Text style={[styles.chipText, Number(yesPrice) === price && styles.chipTextActive]}>{price}%</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.priceInput}
            value={yesPrice}
            onChangeText={setYesPrice}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>
        <Text style={styles.hint}>NO price = {100 - (Number(yesPrice) || 50)}% · thanh khoản nền tảng: {formatToken(10000)} {'\u{1F4B0}'}</Text>

        <Text style={styles.label}>Ngày kết thúc (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={endDateText}
          onChangeText={setEndDateText}
          placeholder="2026-12-31"
          placeholderTextColor="#5C5C5C"
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{'\u{26A0}'} {error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, (!question.trim() || !endDateText.trim()) && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!question.trim() || !endDateText.trim()}
        >
          <Text style={styles.submitText}>Đăng market</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Market do người dùng tạo sẽ do System Admin resolve thủ công để tránh tranh chấp.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: '#6C5CE7', fontSize: 14, fontWeight: '600', width: 50 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  notice: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255, 183, 77, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.3)' },
  noticeText: { color: '#FFB74D', fontSize: 11, lineHeight: 16 },
  form: { paddingHorizontal: 16 },
  label: { color: '#8E8E93', fontSize: 12, marginTop: 14, marginBottom: 8 },
  input: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#22262E', borderRadius: 8, borderWidth: 1, borderColor: '#2A2E36', paddingHorizontal: 10, paddingVertical: 7, marginRight: 6, marginBottom: 6 },
  chipActive: { borderColor: '#6C5CE7', backgroundColor: 'rgba(108, 92, 231, 0.15)' },
  chipText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  iconChip: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#22262E', borderWidth: 1, borderColor: '#2A2E36', alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  iconText: { fontSize: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  priceInput: { width: 60, backgroundColor: '#22262E', borderRadius: 8, borderWidth: 1, borderColor: '#2A2E36', color: '#A78BFA', fontSize: 15, fontWeight: '700', fontFamily: 'monospace', paddingHorizontal: 10, paddingVertical: 8, textAlign: 'center' },
  hint: { color: '#5C5C5C', fontSize: 11, marginTop: 2 },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 12, lineHeight: 17 },
  submitBtn: { backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footnote: { color: '#5C5C5C', fontSize: 10, lineHeight: 15, marginTop: 12 },
  lockCard: { backgroundColor: '#1A1D24', borderRadius: 16, margin: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2A2E36' },
  lockIcon: { fontSize: 36, marginBottom: 10 },
  lockTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  lockText: { color: '#8E8E93', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  lockBtn: { backgroundColor: '#6C5CE7', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  lockBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
