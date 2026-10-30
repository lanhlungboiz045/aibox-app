// screens/MarketsScreen.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TokenBadge } from '../components/TokenBadge';
import { MarketCard } from '../components/MarketCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { AppDrawer } from '../components/AppDrawer';
import { IconButton } from '../components/ui';
import { useAppDrawer } from '../hooks/useAppDrawer';
import { t } from '../i18n';
import { colors, centeredContent } from '../theme/tokens';

export function MarketsScreen({ navigation }) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const { open: openDrawer, drawerProps } = useAppDrawer();
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
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[centeredContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton icon="menu" label={t('nav.openMenu')} onPress={openDrawer} />
            <Text style={styles.title}>Markets</Text>
          </View>
          <TokenBadge size="medium" />
        </View>
        <View style={styles.searchWrap}>
          <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Tìm sự kiện..." placeholderTextColor={colors.textFaint} />
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
      <AppDrawer {...drawerProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  search: { backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, color: colors.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', padding: 20 },
});
