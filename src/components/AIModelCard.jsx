// components/AIModelCard.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatTokenShort } from '../utils/format';

export function AIModelCard({ model, onPress, compact }) {
  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.stripe, { backgroundColor: model.accentColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: model.accentColor + '22' }]}>
            <Text style={styles.icon}>{model.icon}</Text>
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{model.name}</Text>
            <Text style={styles.provider}>{model.providerName}</Text>
          </View>
          <View style={styles.costWrap}>
            <Text style={styles.costIcon}>{'\u{1F4B0}'}</Text>
            <Text style={styles.cost}>{model.tokenCost}</Text>
            <Text style={styles.costSuffix}>/call</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>{model.description}</Text>
        <View style={styles.bottomRow}>
          <View style={styles.capWrap}>
            {model.capabilities.slice(0, 3).map(cap => (
              <View key={cap} style={styles.capTag}>
                <Text style={styles.capText}>{cap}</Text>
              </View>
            ))}
          </View>
          <View style={styles.stats}>
            <Text style={styles.rating}>{'\u{2B50}'} {model.rating}</Text>
            <Text style={styles.popularity}>{formatTokenShort(model.popularity)} uses</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#22262E', borderRadius: 12, marginHorizontal: 16, marginVertical: 6, borderWidth: 1, borderColor: '#2A2E36', flexDirection: 'row', overflow: 'hidden' },
  cardCompact: { width: 240, marginHorizontal: 4 },
  stripe: { width: 4 },
  content: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  nameCol: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  provider: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  costWrap: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(108, 92, 231, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  costIcon: { fontSize: 12 },
  cost: { color: '#A78BFA', fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  costSuffix: { color: '#5C5C5C', fontSize: 11 },
  description: { color: '#8E8E93', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capWrap: { flexDirection: 'row', gap: 4 },
  capTag: { backgroundColor: '#1A1D24', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#2A2E36' },
  capText: { color: '#8E8E93', fontSize: 11 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rating: { color: '#FFB74D', fontSize: 12, fontWeight: '600' },
  popularity: { color: '#5C5C5C', fontSize: 12 },
});
