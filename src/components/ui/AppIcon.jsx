// components/ui/AppIcon.jsx — Bộ icon dùng chung (Feather, vẽ bằng SVG)
//
// Trước đây file này bọc @expo/vector-icons (font Feather tải lúc chạy). Nếu font
// không nạp được (bản release thiếu asset, expo-font lỗi trên máy thật...) thì
// icon biến thành ô trống mà app không báo lỗi. Vẽ trực tiếp bằng react-native-svg
// loại bỏ hoàn toàn phụ thuộc đó: icon luôn hiện, không cần chờ font.
//
// Dữ liệu path nằm ở featherPaths.js (tự sinh từ feather-icons 4.29.2, MIT).
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { FEATHER_PATHS } from './featherPaths';

const LEGACY_ICON_NAMES = {
  '🤖': 'cpu',
  '⚡': 'zap',
  '🎭': 'smile',
  '🍃': 'feather',
  '♊': 'star',
  '🦙': 'code',
  '🎨': 'image',
  '🖼️': 'image',
  '🌬️': 'wind',
  '💻': 'monitor',
  '⚽': 'activity',
  '₿': 'dollar-sign',
  '📱': 'smartphone',
  '🎵': 'music',
  'Ξ': 'trending-up',
  '🏆': 'award',
  '🎤': 'mic',
  '🎬': 'film',
  '🌧️': 'cloud-rain',
  '📚': 'book-open',
  '👥': 'users',
  '📈': 'trending-up',
  '📊': 'bar-chart-2',
  '🛒': 'shopping-bag',
  '⚠️': 'alert-triangle',
  '🔒': 'lock',
  '👑': 'award',
  '🔮': 'aperture',
  '🎲': 'grid',
  '🎯': 'target',
  '🚀': 'send',
  '📰': 'file-text',
  '🪙': 'dollar-sign',
  '🎁': 'gift',
  '🎉': 'gift',
  '🛡️': 'shield',
  '🔔': 'bell',
  '🔑': 'key',
  '⚙️': 'settings',
  '➕': 'plus',
  '📡': 'radio',
  '📤': 'upload',
  '🚪': 'log-out',
  '🔄': 'refresh-cw',
  '📄': 'file-text',
  '💸': 'dollar-sign',
  '🧪': 'cpu',
  '💼': 'briefcase',
  '📝': 'edit-3',
  '🛡': 'shield',
  '🔐': 'lock',
  '⚠': 'alert-triangle',
  '✅': 'check-circle',
  '✓': 'check',
  '✕': 'x',
  '❯': 'chevron-right',
  '❮': 'chevron-left',
  '✨': 'star',
  '💬': 'message-square',
  '📋': 'clipboard',
  '🔍': 'search',
  '💡': 'zap',
  '🔌': 'power',
};

export function AppIcon({ name, size = 20, color = colors.accentSoft, style }) {
  const iconName = LEGACY_ICON_NAMES[name] || name || 'circle';
  const paths = FEATHER_PATHS[iconName] || FEATHER_PATHS.circle;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {paths.map(d => (
        <Path
          key={d}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
