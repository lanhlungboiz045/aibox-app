// screens/ModelCatalogScreen.jsx — Catalog mô hình AI (kiểu AI Box)
// Hiển thị danh sách model theo nhà cung cấp, chi phí trừ theo usage, context, capability.
// Nút "Thử ngay" chuyển sang AI Hub với model đã chọn.
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TokenBadge } from '../components/TokenBadge';
import { formatToken } from '../utils/format';

const TYPE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'text', label: 'Text' },
  { key: 'image', label: 'Image' },
  { key: 'code', label: 'Code' },
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
    // ModelCatalog nằm trong root stack, AIHub nằm trong tab → phải navigate lồng
    navigation.navigate('MainTabs', { screen: 'AIHub', params: { modelId: model.id, ts: Date.now() } });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: item.accentColor + '22' }]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.provider}>{item.providerName}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.price}>usage</Text>
          <Text style={styles.priceUnit}>token thật</Text>
        </View>
      </View>

      <Text style={styles.desc}>{item.description}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>Context: {item.inputLimit.toLocaleString('vi-VN')}</Text>
        <Text style={styles.meta}>⭐ {item.rating}</Text>
        <Text style={styles.meta}>🔥 {item.popularity.toLocaleString('vi-VN')}</Text>
      </View>

      <View style={styles.capRow}>
        {item.capabilities.map(c => (
          <View key={c} style={styles.capChip}>
            <Text style={styles.capText}>{c}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.detailBtn} onPress={() => setDetail(item)} activeOpacity={0.8}>
          <Text style={styles.detailBtnText}>Chi tiết</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tryBtn} onPress={() => tryNow(item)} activeOpacity={0.85}>
          <Text style={styles.tryBtnText}>Thử ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'\u{276C}'} Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Catalog mô hình AI</Text>
        <Text style={styles.sub}>OpenAI-compatible · thanh toán theo usage</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm model hoặc nhà cung cấp..."
          placeholderTextColor="#5C5C5C"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {providers.map(p => (
          <TouchableOpacity
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
        ListEmptyComponent={<Text style={styles.empty}>Không có model phù hợp.</Text>}
      />

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {detail && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>{detail.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{detail.name}</Text>
                    <Text style={styles.modalProvider}>{detail.providerName} · {detail.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetail(null)}>
                    <Text style={styles.modalClose}>{'\u{2715}'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDesc}>{detail.description}</Text>
                <View style={styles.modalMeta}>
                  <Text style={styles.modalMetaText}>Giá: trừ theo token API báo về (usage)</Text>
                  <Text style={styles.modalMetaText}>Context: {detail.inputLimit.toLocaleString('vi-VN')} token</Text>
                  <Text style={styles.modalMetaText}>Đánh giá: {detail.rating} / 5</Text>
                  <Text style={styles.modalMetaText}>Lượt dùng: {detail.popularity.toLocaleString('vi-VN')}</Text>
                  <Text style={styles.modalMetaText}>Capabilities: {detail.capabilities.join(', ')}</Text>
                </View>
                <TouchableOpacity style={styles.tryBtn} onPress={() => { setDetail(null); tryNow(detail); }}>
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
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { color: '#6C5CE7', fontSize: 13, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 4 },
  sub: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  searchBox: { paddingHorizontal: 16, marginTop: 8 },
  searchInput: {
    backgroundColor: '#1A1D24', borderWidth: 1, borderColor: '#2A2E36', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: '#FFFFFF', fontSize: 13,
  },
  chipScroll: { maxHeight: 40, marginTop: 8 },
  chipRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1A1D24', borderWidth: 1, borderColor: '#2A2E36' },
  chipActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  chipText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#1A1D24', borderRadius: 14, borderWidth: 1, borderColor: '#2A2E36', padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  cardInfo: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  provider: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  price: { color: '#FFB74D', fontSize: 16, fontWeight: '800' },
  priceUnit: { color: '#5C5C5C', fontSize: 9 },
  desc: { color: '#C9A66B', fontSize: 12, marginTop: 8, lineHeight: 17 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  meta: { color: '#8E8E93', fontSize: 10 },
  capRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  capChip: { backgroundColor: '#22262E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  capText: { color: '#8E8E93', fontSize: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  detailBtn: { flex: 1, borderWidth: 1, borderColor: '#2A2E36', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  detailBtnText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  tryBtn: { flex: 1, backgroundColor: '#6C5CE7', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  tryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  empty: { color: '#5C5C5C', textAlign: 'center', marginTop: 40, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1A1D24', borderRadius: 16, borderWidth: 1, borderColor: '#2A2E36', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  modalIcon: { fontSize: 28 },
  modalName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  modalProvider: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  modalClose: { color: '#8E8E93', fontSize: 18, padding: 4 },
  modalDesc: { color: '#C9A66B', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  modalMeta: { gap: 4, marginBottom: 14 },
  modalMetaText: { color: '#8E8E93', fontSize: 12 },
});
