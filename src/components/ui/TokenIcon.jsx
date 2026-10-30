import React from 'react';
import { AppIcon } from './AppIcon';
import { colors } from '../../theme/tokens';

export function TokenIcon({ size = 16, color = colors.accentSoft, style }) {
  return <AppIcon name="database" size={size} color={color} style={style} />;
}
