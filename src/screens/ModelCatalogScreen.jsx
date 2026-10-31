// screens/ModelCatalogScreen.jsx — Catalog mô hình AI (kiểu AI Box)
// Hiển thị danh sách model theo nhà cung cấp, chi phí trừ theo usage, context, capability.
// Nút "Thử ngay" chuyển sang AI Hub với model đã chọn.
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { AppHeader, AppIcon, Button } from '../components/ui';
import { AIProviderLogo } from '../components/AIProviderLogo';
import { formatToken } from '../utils/format';
import { capabilityLabel, modelTypeLabel } from '../utils/modelLabels';
import { centeredContent, colors, touch } from '../theme/tokens';

const TYPE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'text', label: 'Văn bản' },
  { key: 'image', label: 'Hình ảnh' },
  { key: 'code', label: 'Mã nguồn' },
];

export function ModelCatalogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('all');
  const [type, setType] = useState('all');
  const [detail, setDetail] = useState(null);

  const providers = useMemo(() => {
    const map = new Map();
    state.aiModels.forEach(m => { if (!map.has(m.provider)) map.set(m.provider, m.providerName); });
    return [{ key: 'all', label: 'Tất cả' }, ...Array.from(map, ([key, label]) => ({ key, label }))];
  }, [state.aiModels]);

  const filtered = useMemo(() => state.aiModels.filter(m => {
    const ms = !search.trim()
      || m.name.toLowerCase().includes(search.toLowerCase())
      || m.providerName.toLowerCase().includes(search.toLowerCase());
    const mp = provider === 'all' || m.provider === provider;
    const mt = type === 'all' || m.type === type;
    return ms && mp && mt && m.isAvailable;
  }), [state.aiModels, search, provider, type]);

  const tryNow = (model) => {
    navigation.navigate('AIHub', { modelId: model.id, ts: Date.now() });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: item.accentColor + '22' }]}>
          <AIProviderLogo provider={item.provider} size={40} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.provider}>{item.providerName}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.price}>Theo mức dùng</Text>
          <Text style={styles.priceUnit}>token thực tế</Text>
        </View>
      </View>

      <Text style={styles.desc}>{item.description}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>Ngữ cảnh: {formatToken(item.inputLimit)} token</Text>
        <Text style={styles.meta}>⭐ {item.rating}</Text>
        <Text style={styles.meta}>🔥 {item.popularity.toLocaleString('vi-VN')}</Text>
      </View>

      <View style={styles.capRow}>
        {item.capabilities.map(c => (
          <View key={c} style={styles.capChip}>
            <Text style={styles.capText}>{capabilityLabel(c)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Chi tiết" variant="secondary" onPress={() => setDetail(item)} />
        <Button label="Thử ngay" onPress={() => tryNow(item)} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} title="Mô hình AI" subtitle="Danh mục và bộ lọc" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm mô hình hoặc nhà cung cấp..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {providers.map(p => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: provider === p.key }}
            key={p.key}
            style={[styles.chip, provider === p.key && styles.chipActive]}
            onPress={() => setProvider(p.key)}
          >
            <Text style={[styles.chipText, provider === p.key && styles.chipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {TYPE_FILTERS.map(t => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: type === t.key }}
            key={t.key}
            style={[styles.chip, type === t.key && styles.chipActive]}
            onPress={() => setType(t.key)}
          >
            <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Không có mô hình phù hợp.</Text>}
      />

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {detail && (
              <>
                <View style={styles.modalHeader}>
                  <AIProviderLogo provider={detail.provider} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{detail.name}</Text>
                    <Text style={styles.modalProvider}>{detail.providerName} · {modelTypeLabel(detail.type)}</Text>
                  </View>
                  <TouchableOpacity accessibilityRole="button" onPress={() => setDetail(null)}>
                    <AppIcon name="x" size={18} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDesc}>{detail.description}</Text>
                <View style={styles.modalMeta}>
                  <Text style={styles.modalMetaText}>Giá: trừ theo token nhà cung cấp báo về</Text>
                  <Text style={styles.modalMetaText}>Ngữ cảnh: {formatToken(detail.inputLimit)} token</Text>
                  <Text style={styles.modalMetaText}>Đánh giá: {detail.rating} / 5</Text>
                  <Text style={styles.modalMetaText}>Lượt dùng: {detail.popularity.toLocaleString('vi-VN')}</Text>
                  <Text style={styles.modalMetaText}>Khả năng: {detail.capabilities.map(capabilityLabel).join(', ')}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" style={styles.tryBtn} onPress={() => { setDetail(null); tryNow(detail); }}>
                  <Text style={styles.tryBtnText}>Thử ngay</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { alignSelf: 'flex-start', minHeight: touch.min, justifyContent: 'center', paddingVertical: 8 },
  backText: { color: colors.accentSoft, fontSize: 13, fontWeight: '600' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  searchBox: { paddingHorizontal: 16, marginTop: 8 },
  searchInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13,
  },
  chipScroll: { maxHeight: 40, marginTop: 8 },
  chipRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, minHeight: touch.min },
  chipActive: { backgroundColor: colors.accentStrong, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.onAccent },
  list: { ...centeredContent, padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  cardInfo: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  provider: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  price: { color: colors.warning, fontSize: 16, fontWeight: '800' },
  priceUnit: { color: colors.textFaint, fontSize: 12 },
  desc: { color: colors.gold, fontSize: 12, marginTop: 8, lineHeight: 17 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  meta: { color: colors.textDim, fontSize: 12 },
  capRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  capChip: { backgroundColor: colors.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  capText: { color: colors.textDim, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  detailBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  detailBtnText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  tryBtn: { flex: 1, backgroundColor: colors.accentStrong, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  tryBtnText: { color: colors.onAccent, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textFaint, textAlign: 'center', marginTop: 40, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  modalIcon: { fontSize: 28 },
  modalName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  modalProvider: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  modalClose: { color: colors.textDim, fontSize: 18, padding: 4 },
  modalDesc: { color: colors.gold, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  modalMeta: { gap: 4, marginBottom: 14 },
  modalMetaText: { color: colors.textDim, fontSize: 12 },
});
