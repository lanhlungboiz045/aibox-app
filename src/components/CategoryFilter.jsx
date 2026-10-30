// components/CategoryFilter.jsx — Hàng chip lọc loại model (Bước 3)
// Chip có vùng chạm tối thiểu 48dp theo Material và accessibilityState.selected.
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

export function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="Lọc theo loại model"
    >
      {categories.map(cat => {
        const isActive = selected === cat.key;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            key={cat.key}
            onPress={() => onSelect(cat.key)}
            style={[styles.chip, isActive && styles.chipActive]}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            accessibilityLabel={cat.label}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]} maxFontSizeMultiplier={1.6}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  chipActive: { backgroundColor: colors.accentDim, borderColor: colors.accentBorder },
  chipIcon: { fontSize: 14 },
  chipText: { ...type.smallStrong, color: colors.textDim },
  chipTextActive: { color: colors.accentSoft },
});
