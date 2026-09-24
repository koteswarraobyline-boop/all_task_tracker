import React, { useMemo } from 'react';
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';

const NAVY_HEADER = '#12254A';

export const STATUS_CHART_COLORS = {
  Completed: '#20BF5A',
  Cancelled: '#687384',
  Pending: '#E5A500',
  'Not Started': '#94A3B8',
  'In Development': '#2563EB',
  Testing: '#9333EA',
  Blocked: '#EF4444',
};

export const PRIORITY_CHART_COLORS = {
  Critical: '#DC2626',
  High: '#F15A0A',
  Medium: '#C98B00',
  Low: '#16A34A',
  Other: '#687384',
};

const CX = 170;
const CY = 148;
const OUTER_R = 82;
const INNER_R = 34;

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function donutSegmentPath(cx, cy, rOut, rIn, startAngle, endAngle) {
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

function withRoundedPercents(rows) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!total) return rows.map((row) => ({ ...row, pct: 0 }));

  const working = rows.map((row) => {
    const exact = (row.value / total) * 100;
    return { ...row, exact, pct: Math.floor(exact) };
  });

  let remainder = 100 - working.reduce((sum, row) => sum + row.pct, 0);
  const order = [...working].sort((a, b) => b.exact - b.pct - (a.exact - a.pct));
  for (let i = 0; i < remainder; i += 1) {
    order[i % order.length].pct += 1;
  }
  return working;
}

function resolveColor(name, colorMap, fallback) {
  return colorMap[name] || fallback || '#64748B';
}

function buildSegments(data, colorMap) {
  const filtered = (data || []).filter((row) => row.value > 0);
  const enriched = withRoundedPercents(
    filtered.map((row) => ({
      ...row,
      color: resolveColor(row.name, colorMap, row.color),
    }))
  );

  const total = enriched.reduce((sum, row) => sum + row.value, 0);
  const gap = enriched.length > 1 ? 2.2 : 0;
  const sweepTotal = 360 - gap * enriched.length;
  let cursor = -90 + gap / 2;

  return enriched.map((row) => {
    const sweep = total ? (row.value / total) * sweepTotal : 0;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    const midAngle = startAngle + sweep / 2;
    cursor = endAngle + gap;
    return { ...row, startAngle, endAngle, midAngle, sweep };
  });
}

/** Curved arc connector that runs parallel to the donut outer edge. */
function buildCurvedConnector(cx, cy, midAngle, outerR, color) {
  const norm = normalizeAngle(midAngle);
  const isLeft = norm > 90 && norm < 270;
  const arcSpan = Math.min(28, Math.max(14, 12));
  const arcR = outerR + 14;
  const startA = midAngle - arcSpan / 2;
  const endA = midAngle + arcSpan / 2;
  const start = polar(cx, cy, arcR, startA);
  const end = polar(cx, cy, arcR, endA);
  const sweep = isLeft ? 0 : 1;

  const dotAngle = isLeft ? endA : startA;
  const dot = polar(cx, cy, arcR, dotAngle);

  const labelR = outerR + 36;
  const labelAngle = midAngle + (isLeft ? -arcSpan * 0.15 : arcSpan * 0.15);
  const label = polar(cx, cy, labelR, labelAngle);

  const textAnchor = isLeft ? 'end' : 'start';
  const dx = isLeft ? -8 : 8;

  return {
    arcPath: `M ${start.x} ${start.y} A ${arcR} ${arcR} 0 0 ${sweep} ${end.x} ${end.y}`,
    dot,
    label: { x: label.x + dx, y: label.y, anchor: textAnchor },
    color,
  };
}

/** SVG text on a curved path for premium external labels. */
function CurvedLabel({ id, name, midAngle, outerR }) {
  const norm = normalizeAngle(midAngle);
  const isLeft = norm > 90 && norm < 270;
  const textR = outerR + 34;
  const span = 22;
  const startA = midAngle - span / 2;
  const endA = midAngle + span / 2;
  const start = polar(CX, CY, textR, startA);
  const end = polar(CX, CY, textR, endA);
  const sweep = isLeft ? 0 : 1;
  const pathD = `M ${start.x} ${start.y} A ${textR} ${textR} 0 0 ${sweep} ${end.x} ${end.y}`;

  return (
    <>
      <path id={id} d={pathD} fill="none" />
      <text fill="#1E293B" fontSize={11} fontWeight={700} style={{ fontFamily: 'inherit' }}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {name}
        </textPath>
      </text>
    </>
  );
}

function DonutSvg({ segments }) {
  const theme = useTheme();
  const showExternal = useMediaQuery(theme.breakpoints.up('sm'));

  return (
    <Box sx={{ width: '100%', maxWidth: 340, mx: 'auto' }}>
      <Box
        component="svg"
        viewBox="0 0 340 280"
        sx={{ width: '100%', maxHeight: 240, height: 'auto', display: 'block', overflow: 'visible' }}
        role="img"
        aria-hidden
      >
        {segments.map((seg) => (
          <path
            key={seg.name}
            d={donutSegmentPath(CX, CY, OUTER_R, INNER_R, seg.startAngle, seg.endAngle)}
            fill={seg.color}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}

        {segments.map((seg) => {
          if (seg.pct <= 0) return null;
          const mid = polar(CX, CY, (OUTER_R + INNER_R) / 2, seg.midAngle);
          const fontSize = seg.pct >= 25 ? 16 : seg.pct >= 12 ? 13 : 10;
          return (
            <text
              key={`${seg.name}-inner`}
              x={mid.x}
              y={mid.y}
              fill="#fff"
              fontSize={fontSize}
              fontWeight={800}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ pointerEvents: 'none', fontFamily: 'inherit' }}
            >
              {seg.pct}%
            </text>
          );
        })}

        {showExternal &&
          segments.map((seg, idx) => {
            if (seg.pct < 3) return null;
            const conn = buildCurvedConnector(CX, CY, seg.midAngle, OUTER_R, seg.color);
            return (
              <g key={`${seg.name}-ext`}>
                <path
                  d={conn.arcPath}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={1.75}
                  strokeLinecap="round"
                />
                <circle cx={conn.dot.x} cy={conn.dot.y} r={4} fill={seg.color} stroke="#fff" strokeWidth={1.25} />
                <CurvedLabel id={`label-arc-${idx}`} name={seg.name} midAngle={seg.midAngle} outerR={OUTER_R} />
              </g>
            );
          })}
      </Box>
    </Box>
  );
}

function BottomLegend({ segments }) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      justifyContent="center"
      gap={{ xs: 2, md: 3 }}
      sx={{ mt: 1, pt: 1.5, borderTop: '1px solid', borderColor: 'rgba(148,163,184,0.35)' }}
    >
      {segments.map((seg) => (
        <Stack key={seg.name} direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 72 }}>
          <Box
            sx={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              bgcolor: seg.color,
              flexShrink: 0,
              mt: 0.25,
              boxShadow: '0 1px 2px rgba(15,23,42,0.1)',
            }}
          />
          <Box>
            <Typography
              sx={{
                fontSize: { xs: '0.75rem', md: '0.8125rem' },
                fontWeight: 700,
                lineHeight: 1.2,
                color: '#1E293B',
              }}
            >
              {seg.name}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '0.6875rem', md: '0.75rem' },
                fontWeight: 600,
                color: '#64748B',
                mt: 0.15,
              }}
            >
              {seg.pct}%
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

export default function PerformanceDonutChart({ title, data, colorMap = {}, emptyMessage = 'No data available.' }) {
  const segments = useMemo(() => buildSegments(data, colorMap), [data, colorMap]);

  return (
    <Box
      sx={{
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'rgba(148,163,184,0.25)',
        bgcolor: '#FAFBFC',
        boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          bgcolor: NAVY_HEADER,
          px: { xs: 1.75, md: 2 },
          py: { xs: 1, md: 1.25 },
          minHeight: { xs: 40, md: 44 },
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography
          component="h3"
          sx={{
            color: '#fff',
            fontWeight: 800,
            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8125rem' },
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.25,
          }}
        >
          {title}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, px: { xs: 1.25, md: 1.75 }, py: { xs: 1.5, md: 1.75 }, bgcolor: '#fff' }}>
        {segments.length ? (
          <>
            <DonutSvg segments={segments} />
            <BottomLegend segments={segments} />
          </>
        ) : (
          <Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary', fontWeight: 600, fontSize: '0.8125rem' }}>
            {emptyMessage}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
