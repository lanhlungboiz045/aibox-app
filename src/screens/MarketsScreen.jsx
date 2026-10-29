// screens/MarketsScreen.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TokenBadge } from '../components/TokenBadge';
import { MarketCard } from '../components/MarketCard';
import { CategoryFilter } from '../components/CategoryFilter';

export function MarketsScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = [
    { key: 'all', label: 'All', icon: '\u{2728}' },
    { key: 'sports', label: 'Sports', icon: '\u{26BD}' },
    { key: 'crypto', label: 'Crypto', icon: '\u{23BF}' },
    { key: 'tech', label: 'Tech', icon: '\u{1F4BB}' },
    { key: 'entertainment', label: 'Entertain', icon: '\u{1F3B5}' },
    { key: 'life', label: 'Life', icon: '\u{1F4DA}' },
  ];

  const filtered = state.markets.filter(m => {
    const matchSearch = m.question.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || m.category === category;
    return matchSearch && matchCat;
  });

  return (
    <ScrollView
      style={styles.container}
      // Tab bar bên dưới đã tự chừa insets.bottom → chỉ cần chừa status bar ở trên
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 20 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Markets</Text>
        <TokenBadge size="medium" />
      </View>
      <View style={styles.searchWrap}>
        <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Tìm sự kiện..." placeholderTextColor="#5C5C5C" />
      </View>
      <CategoryFilter categories={categories} selected={category} onSelect={setCategory} />
      <View style={{ marginTop: 8 }}>
        {filtered.map(market => (
          <MarketCard key={market.id} market={market}
            onPress={() => navigation.navigate('MarketDetail', { marketId: market.id })}
            onYes={() => navigation.navigate('MarketDetail', { marketId: market.id, initialSide: 'YES' })}
            onNo={() => navigation.navigate('MarketDetail', { marketId: market.id, initialSide: 'NO' })} />
        ))}
      </View>
      {filtered.length === 0 && <Text style={styles.empty}>Không tìm thấy market nào</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  search: { backgroundColor: '#22262E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2E36', color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },
  empty: { color: '#5C5C5C', fontSize: 13, textAlign: 'center', padding: 20 },
});
