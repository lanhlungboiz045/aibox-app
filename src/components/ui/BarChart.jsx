// components/ui/BarChart.jsx — Biểu đồ cột theo ngày (thuần View, không thêm thư viện)
// Dùng cho màn Thống kê sử dụng: mỗi cột là token đã dùng trong 1 ngày.
// Chạm vào cột để xem đúng số token của ngày đó; cột đang chọn được làm nổi.
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, type } from '../../theme/tokens';

// "2026-10-31" → "31/10"
function shortDay(key) {
  const parts = String(key || '').split('-');
  if (parts.length < 3) return '';
  return `${parts[2]}/${parts[1]}`;
}

export function BarChart({ data = [], height = 140, formatValue = value => String(value) }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const safeData = Array.isArray(data) ? data : [];
  const max = useMemo(
    () => Math.max(...safeData.map(item => Math.max(0, Number(item.value) || 0)), 1),
    [safeData]
  );
  const active = activeIndex !== null ? safeData[activeIndex] : null;

  if (safeData.length === 0) return null;

  // Nhãn trục X: 7 ngày hiện đủ, 30 ngày chỉ hiện đầu · giữa · cuối để không chồng chữ.
  const labelIndexes = safeData.length <= 7
    ? safeData.map((_, index) => index)
    : [0, Math.floor((safeData.length - 1) / 2), safeData.length - 1];

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {/* 3 đường lưới mờ giúp đọc độ cao cột */}
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: '50%' }]} />
        <View style={[styles.gridLine, { bottom: 0 }]} />

        <View style={styles.bars}>
          {safeData.map((item, index) => {
            const value = Math.max(0, Number(item.value) || 0);
            const barHeight = value > 0
              ? Math.max(4, Math.round((value / max) * (height - spacing.sm)))
              : 2;
            const isActive = activeIndex === index;
            return (
              <TouchableOpacity
                key={item.key || index}
                style={styles.barSlot}
                activeOpacity={0.7}
                onPress={() => setActiveIndex(isActive ? null : index)}
                accessibilityRole="button"
                accessibilityLabel={`Ngày ${shortDay(item.key)}, ${formatValue(value)} token`}
                accessibilityState={{ selected: isActive }}
              >
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: isActive
                        ? colors.accentSoft
                        : value > 0
                          ? colors.accent
                          : colors.surfaceHi,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.axis, safeData.length <= 7 && styles.axisEven]}>
        {labelIndexes.map(index => (
          <Text
            key={safeData[index].key || index}
            style={[styles.axisLabel, safeData.length <= 7 && styles.axisLabelEven]}
            maxFontSizeMultiplier={1.4}
          >
            {shortDay(safeData[index].key)}
          </Text>
        ))}
      </View>

      <Text style={styles.caption} numberOfLines={1} maxFontSizeMultiplier={1.5}>
        {active
          ? `${shortDay(active.key)} · ${formatValue(active.value)} token`
          : 'Chạm vào cột để xem token từng ngày'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { position: 'relative', justifyContent: 'flex-end', marginTop: spacing.sm },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    minWidth: 2,
  },
  bar: { width: '100%', borderRadius: radius.xs / 2, minHeight: 2 },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  axisEven: { justifyContent: 'space-between' },
  axisLabel: { ...type.small, color: colors.textFaint },
  axisLabelEven: { flex: 1, textAlign: 'center' },
  caption: { ...type.small, color: colors.textDim, marginTop: spacing.sm },
});
