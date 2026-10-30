// components/ui/AppIcon.jsx — Bọc @expo/vector-icons (Feather gần style lucide)
// Dùng 1 chỗ để đổi bộ icon về sau mà không sửa toàn bộ màn hình.
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';

export function AppIcon({ name, size = 20, color = colors.accentSoft, style }) {
  return <Feather name={name} size={size} color={color} style={style} />;
}
