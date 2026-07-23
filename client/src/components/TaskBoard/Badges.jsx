import React from 'react';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { getTaskProgressPercent, progressBarColor } from '../../utils/taskProgress';
import { getStatusStyle } from './constants';

const BAR_COLORS = {
  success: '#22C55E',
  info: '#0EA5E9',
  primary: '#8B5CF6',
  warning: '#F59E0B',
  inherit: '#CBD5E1',
};

export function StatusBadge({ status, isDark = false, size = 'default' }) {
  const style = getStatusStyle(status, isDark);
  return (
    <Chip
      label={style.text}
      size="small"
      sx={{
        height: size === 'small' ? 22 : 26,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        fontWeight: 700,
        bgcolor: style.bgcolor,
        color: style.color,
        border: style.border,
        borderRadius: '8px',
        maxWidth: 140,
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          px: 1,
        },
      }}
    />
  );
}

export function PriorityBadge({ priority, badges }) {
  if (!priority || !badges?.[priority]) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  const style = badges[priority];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        px: 1,
        py: 0.25,
        borderRadius: '8px',
        fontSize: '0.72rem',
        fontWeight: 800,
        lineHeight: 1.4,
        maxWidth: 88,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {priority}
    </Box>
  );
}

export function ProgressCell({
  task,
  pct: pctProp,
  completed,
  total,
  width = 88,
  showFraction = false,
}) {
  const pct =
    pctProp != null
      ? pctProp
      : task
        ? getTaskProgressPercent(task)
        : 0;
  const colorKey = progressBarColor(pct);
  const barColor = BAR_COLORS[colorKey] || BAR_COLORS.inherit;

  return (
    <Stack spacing={0.4} sx={{ minWidth: width + 36 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ width, flexShrink: 0 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, pct))}
            sx={{
              height: 6,
              borderRadius: 999,
              bgcolor: 'rgba(148,163,184,0.25)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                bgcolor: barColor,
                transition: 'transform 0.45s ease',
              },
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'text.secondary',
            minWidth: 28,
          }}
        >
          {pct}%
        </Typography>
      </Stack>
      {showFraction && total != null && (
        <Typography
          variant="caption"
          sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600 }}
        >
          {completed}/{total} Complete
        </Typography>
      )}
    </Stack>
  );
}

export function StatusDot({ status, isDark = false }) {
  const style = getStatusStyle(status, isDark);
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: style.color,
        flexShrink: 0,
      }}
    />
  );
}
