// components/CategoryFilter.jsx
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

export function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {categories.map(cat => {
        const isActive = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            onPress={() => onSelect(cat.key)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  content: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#22262E', borderWidth: 1, borderColor: '#2A2E36', gap: 4,
  },
  chipActive: { backgroundColor: 'rgba(108, 92, 231, 0.2)', borderColor: '#6C5CE7' },
  chipIcon: { fontSize: 14 },
  chipText: { color: '#8E8E93', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#A78BFA' },
});
