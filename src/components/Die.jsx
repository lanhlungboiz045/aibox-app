// components/Die.jsx — mặt xúc xắc vẽ bằng View (không cần ảnh, tự theo theme)
// 1..6 chấm xếp theo lưới 3x3. Chỉ để hiển thị nên ẩn khỏi trình đọc màn hình;
// màn hình cha đọc kết quả bằng 1 câu ("Xúc xắc 3, 5, 6, tổng 14").
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

// Vị trí chấm trong lưới 3x3 (0..8, đọc từ trái sang phải, trên xuống dưới)
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const TONE_BORDER = {
  normal: colors.borderSoft,
  win: colors.successBorder,
  lose: colors.dangerBorder,
  warn: colors.warningBorder,
};

const TONE_BG = {
  normal: colors.surfaceHi,
  win: colors.successDim,
  lose: colors.dangerDim,
  warn: colors.warningDim,
};

export function Die({ value = 1, size = 56, tone = 'normal' }) {
  const active = PIPS[value] || PIPS[1];
  const dot = Math.max(6, Math.round(size / 7));

  return (
    <View
      style={[
        styles.die,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          borderColor: TONE_BORDER[tone] || TONE_BORDER.normal,
          backgroundColor: TONE_BG[tone] || TONE_BG.normal,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => (
        <View key={index} style={styles.cell}>
          {active.includes(index) ? (
            <View
              style={{
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: colors.text,
              }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  die: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    borderWidth: 1.5,
    padding: spacing.xs,
  },
  cell: { width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' },
});
