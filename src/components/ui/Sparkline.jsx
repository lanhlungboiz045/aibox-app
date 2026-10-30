// components/ui/Sparkline.jsx — Sparkline nhỏ (SVG) cho card "Chi tiêu 7 ngày"
// Không dùng thư viện chart để giữ bundle nhẹ; cao tối đa 60px.
import React from 'react';
import Svg, { Polyline, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme/tokens';

export function Sparkline({
  values = [], width = 96, height = 40,
  stroke = colors.accent, fill = colors.accent, strokeWidth = 2,
}) {
  const data = (values.length ? values : [0, 0]).map(v => Math.max(0, Number(v) || 0));
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPath = `M0,${height} L${points.join(' L')} L${width},${height} Z`;
  // id gradient phải khác nhau giữa các instance cùng kích thước
  const gradientId = React.useMemo(
    () => `spark-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fill} stopOpacity="0.35" />
          <Stop offset="1" stopColor={fill} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradientId})`} />
      <Polyline
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
