// components/PriceChart.jsx — Simple SVG line chart hiển thị giá YES 7 ngày
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';

const PADDING = { top: 10, right: 10, bottom: 20, left: 30 };

export function PriceChart({ data, height = 120 }) {
  // Đo bề rộng thực tế của card thay vì hardcode → không tràn trên máy hẹp
  const [width, setWidth] = useState(0);

  const handleLayout = (event) => {
    const next = event.nativeEvent.layout.width;
    if (!next) return;
    setWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  };

  if (!data || data.length === 0) return null;

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;
  const maxVal = 100;
  const minVal = 0;
  const steps = Math.max(data.length - 1, 1);

  const points = width > 0
    ? data.map((val, i) => {
      const x = PADDING.left + (i / steps) * chartW;
      const y = PADDING.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, val };
    })
    : [];

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridLines = [0, 25, 50, 75, 100].map(val => {
    const y = PADDING.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { y, val };
  });

  return (
    <View style={[styles.container, { minHeight: height }]} onLayout={handleLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {gridLines.map(gl => (
            <React.Fragment key={gl.val}>
              <Line x1={PADDING.left} y1={gl.y} x2={width - PADDING.right} y2={gl.y}
                stroke="#2A2E36" strokeWidth={0.5} strokeDasharray="4,4" />
              <SvgText x={PADDING.left - 5} y={gl.y + 3} fill="#5C5C5C" fontSize={10}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, width: '100%' },
});
