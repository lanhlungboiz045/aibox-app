// screens/CreateMarketScreen.jsx — Market Creator / Admin tự tạo kèo
import React, { useState } from 'react';
import { BackButton } from '../components/ui/BackButton';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatToken } from '../utils/format';
import { AppIcon } from '../components/ui/AppIcon';
import { colors, centeredContent, touch } from '../theme/tokens';

const CATEGORIES = [
  { key: 'sports', label: 'Sports', icon: 'activity' },
  { key: 'crypto', label: 'Crypto', icon: 'trending-up' },
  { key: 'tech', label: 'Tech', icon: 'monitor' },
  { key: 'entertainment', label: 'Entertain', icon: 'music' },
  { key: 'life', label: 'Life', icon: 'book-open' },
  { key: 'politics', label: 'Politics', icon: 'globe' },
];

const ICONS = ['aperture', 'bar-chart-2', 'activity', 'trending-up', 'target', 'zap', 'award', 'file-text'];
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
  const [icon, setIcon] = useState('aperture');
  const [endDateText, setEndDateText] = useState(defaultEndText);
  const [yesPrice, setYesPrice] = useState('50');
  const [error, setError] = useState(null);
  const parsedYesPrice = Number(yesPrice);
  const noPricePreview = Number.isInteger(parsedYesPrice) && parsedYesPrice >= 5 && parsedYesPrice <= 95
    ? 100 - parsedYesPrice
    : '—';

  const canCreate = user && ['admin', 'creator'].includes(user.role);

  if (!canCreate) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Tạo market</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.lockCard}>
          <AppIcon name="lock" size={32} color={colors.textDim} />
          <Text style={styles.lockTitle}>Cần quyền Market Creator</Text>
          <Text style={styles.lockText}>
            Bạn đang là Standard User. Mua Creator Pass trong Store để tự tạo kèo và nhận 2% fee trên volume market của mình.
          </Text>
          <TouchableOpacity accessibilityRole="button" style={styles.lockBtn} onPress={() => navigation.navigate('Store')}>
            <Text style={styles.lockBtnText}>Mở Store</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const submit = () => {
    setError(null);
    const dateText = endDateText.trim();
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
    const parsed = dateMatch
      ? new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), 23, 59)
      : new Date(Number.NaN);
    if (!dateMatch
      || Number.isNaN(parsed.getTime())
      || parsed.getFullYear() !== Number(dateMatch[1])
      || parsed.getMonth() + 1 !== Number(dateMatch[2])
      || parsed.getDate() !== Number(dateMatch[3])) {
      setError('Ngày kết thúc không hợp lệ. Dùng định dạng YYYY-MM-DD.');
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      setError('Ngày kết thúc phải ở tương lai.');
      return;
    }

    const parsedPrice = Number(yesPrice);
    if (!Number.isInteger(parsedPrice) || parsedPrice < 5 || parsedPrice > 95) {
      setError('Giá YES phải là số nguyên từ 5% đến 95%.');
      return;
    }

    const result = createMarket({
      question: question.trim(),
      description: description.trim() || 'Không có mô tả',
      category,
      icon,
      endDate: parsed.toISOString(),
      yesPrice: parsedPrice,
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
      contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Tạo market</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Tạo với tư cách {user.role === 'admin' ? 'System Admin' : 'Market Creator'} · nhận 2% creator fee trên volume.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Câu hỏi / sự kiện</Text>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={value => { setQuestion(value); setError(null); }}
          placeholder="VD: MU sẽ thắng Chelsea ngày 02/11?"
          placeholderTextColor={colors.textFaint}
          maxLength={140}
          accessibilityLabel="Câu hỏi hoặc sự kiện của market"
        />

        <Text style={styles.label}>Mô tả & điều kiện resolve</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={value => { setDescription(value); setError(null); }}
          placeholder="Nêu rõ nguồn kết quả, mốc thời gian, điều kiện thắng..."
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={400}
          accessibilityLabel="Mô tả và điều kiện resolve market"
        />

        <Text style={styles.label}>Danh mục</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map(item => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: category === item.key }}
              key={item.key}
              style={[styles.chip, category === item.key && styles.chipActive]}
              onPress={() => setCategory(item.key)}
            >
              <AppIcon name={item.icon} size={16} color={category === item.key ? colors.accentSoft : colors.textDim} />
              <Text style={[styles.chipText, category === item.key && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Icon</Text>
        <View style={styles.chipWrap}>
          {ICONS.map(item => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Chọn biểu tượng market ${ICONS.indexOf(item) + 1}`}
              accessibilityState={{ selected: icon === item }}
              key={item}
              style={[styles.iconChip, icon === item && styles.chipActive]}
              onPress={() => setIcon(item)}
            >
              <AppIcon name={item} size={18} color={icon === item ? colors.accentSoft : colors.textDim} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Giá YES ban đầu (%)</Text>
        <View style={styles.priceRow}>
          {PRESET_PRICES.map(price => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Đặt giá YES ban đầu ${price}%`}
              accessibilityState={{ selected: Number(yesPrice) === price }}
              key={price}
              style={[styles.chip, Number(yesPrice) === price && styles.chipActive]}
              onPress={() => { setYesPrice(String(price)); setError(null); }}
            >
              <Text style={[styles.chipText, Number(yesPrice) === price && styles.chipTextActive]}>{price}%</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.priceInput}
            value={yesPrice}
            onChangeText={value => { setYesPrice(value.replace(/\D/g, '')); setError(null); }}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Giá YES ban đầu, từ 5 đến 95 phần trăm"
          />
        </View>
        <Text style={styles.hint}>
          NO price = {noPricePreview}{noPricePreview === '—' ? '' : '%'} · thanh khoản nền tảng: {formatToken(10000)} token
        </Text>

        <Text style={styles.label}>Ngày kết thúc (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={endDateText}
          placeholder="2026-12-31"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          accessibilityLabel="Ngày kết thúc market theo định dạng YYYY-MM-DD"
          onChangeText={value => { setEndDateText(value); setError(null); }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Đăng market"
          style={styles.submitBtn}
          onPress={submit}
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
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { color: colors.accentSoft, fontSize: 14, fontWeight: '600', minWidth: 50, minHeight: touch.min, textAlignVertical: 'center', paddingVertical: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  notice: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10, backgroundColor: colors.warningDim, borderWidth: 1, borderColor: colors.warningBorder },
  noticeText: { color: colors.warning, fontSize: 12, lineHeight: 16 },
  form: { paddingHorizontal: 16 },
  label: { color: colors.textDim, fontSize: 12, marginTop: 14, marginBottom: 8 },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 14, paddingHorizontal: 14, minHeight: touch.min },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: touch.gap },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 10, minHeight: touch.min, justifyContent: 'center' },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.accentSoft },
  iconChip: { width: touch.min, height: touch.min, borderRadius: 8, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  priceInput: { width: 60, minHeight: touch.min, backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, color: colors.accentSoft, fontSize: 15, fontWeight: '700', fontFamily: 'monospace', paddingHorizontal: 10, textAlign: 'center' },
  hint: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  error: { color: colors.danger, fontSize: 12, marginTop: 12, lineHeight: 17 },
  submitBtn: { backgroundColor: colors.accentStrong, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 18, minHeight: touch.min },
  submitText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 15, marginTop: 12 },
  lockCard: { backgroundColor: colors.surface, borderRadius: 16, margin: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  lockIcon: { fontSize: 36, marginBottom: 10 },
  lockTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  lockText: { color: colors.textDim, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  lockBtn: { backgroundColor: colors.accentStrong, borderRadius: 10, paddingHorizontal: 24, marginTop: 16, minHeight: touch.min, justifyContent: 'center' },
  lockBtnText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
});
