// components/PriceChart.jsx — Simple SVG line chart hiển thị giá YES 7 ngày
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';

export function PriceChart({ data, width = 320, height = 120 }) {
  if (!data || data.length === 0) return null;

  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = 100;
  const minVal = 0;

  const points = data.map((val, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, val };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridLines = [0, 25, 50, 75, 100].map(val => {
    const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { y, val };
  });

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {gridLines.map(gl => (
          <React.Fragment key={gl.val}>
            <Line x1={padding.left} y1={gl.y} x2={width - padding.right} y2={gl.y}
              stroke="#2A2E36" strokeWidth={0.5} strokeDasharray="4,4" />
            <SvgText x={padding.left - 5} y={gl.y + 3} fill="#5C5C5C" fontSize={10}
              textAnchor="end" fontFamily="monospace">{gl.val}</SvgText>
          </React.Fragment>
        ))}
        <Polyline points={polylinePoints} fill="none" stroke="#00CE7E" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#00CE7E" />
        ))}
        {points.map((p, i) => {
          const daysAgo = data.length - 1 - i;
          const label = daysAgo === 0 ? 'now' : `${daysAgo}d`;
          return (
            <SvgText key={`label-${i}`} x={p.x} y={height - 5} fill="#5C5C5C"
              fontSize={9} textAnchor="middle">{label}</SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
});
