import React, { useMemo } from 'react';
import { Box } from '@mui/material';

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx, cy, rOut, rIn, startAngle, endAngle) {
  if (endAngle - startAngle >= 359.9) {
    const mid = polar(cx, cy, rOut, -90);
    const midInner = polar(cx, cy, rIn, -90);
    const bot = polar(cx, cy, rOut, 90);
    const botInner = polar(cx, cy, rIn, 90);
    return [
      `M ${mid.x} ${mid.y}`,
      `A ${rOut} ${rOut} 0 1 1 ${bot.x} ${bot.y}`,
      `A ${rOut} ${rOut} 0 1 1 ${mid.x} ${mid.y}`,
      `M ${midInner.x} ${midInner.y}`,
      `A ${rIn} ${rIn} 0 1 0 ${botInner.x} ${botInner.y}`,
      `A ${rIn} ${rIn} 0 1 0 ${midInner.x} ${midInner.y}`,
      'Z',
    ].join(' ');
  }

  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  const outerStart = polar(cx, cy, rOut, endAngle);
  const outerEnd = polar(cx, cy, rOut, startAngle);
  const innerStart = polar(cx, cy, rIn, startAngle);
  const innerEnd = polar(cx, cy, rIn, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

/**
 * Lightweight SVG donut — no Recharts dependency.
 * @param {{ data: Array<{ key?: string, label?: string, color: string, count?: number }>, valueKey?: string, innerRadius?: number, outerRadius?: number, size?: number, paddingAngle?: number, ariaLabel?: string }} props
 */
export default function SimpleDonutChart({
  data,
  valueKey = 'count',
  innerRadius = 62,
  outerRadius = 92,
  size = 220,
  paddingAngle = 2,
  ariaLabel = 'Donut chart',
}) {
  const segments = useMemo(() => {
    const filtered = (data || []).filter((row) => (row[valueKey] ?? 0) > 0);
    const total = filtered.reduce((sum, row) => sum + (row[valueKey] ?? 0), 0);
    if (!total) return [];

    const gap = filtered.length > 1 ? paddingAngle : 0;
    const sweepTotal = 360 - gap * filtered.length;
    let cursor = -90 + gap / 2;

    return filtered.map((row) => {
      const sweep = ((row[valueKey] ?? 0) / total) * sweepTotal;
      const startAngle = cursor;
      const endAngle = cursor + sweep;
      cursor = endAngle + gap;
      return { ...row, startAngle, endAngle };
    });
  }, [data, valueKey, paddingAngle]);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${size} ${size}`}
      sx={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label={ariaLabel}
    >
      {segments.map((seg) => (
        <path
          key={seg.key || seg.label}
          d={segmentPath(cx, cy, outerRadius, innerRadius, seg.startAngle, seg.endAngle)}
          fill={seg.color}
          stroke="none"
        />
      ))}
    </Box>
  );
}
