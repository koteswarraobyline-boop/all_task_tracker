import React from 'react';
import { Box, Chip, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { getTaskProgressPercent, progressBarColor } from '../../utils/taskProgress';
import { formatShortDate } from '../../utils/deliveryHealth';
import { getStatusStyle, normalizeLegacyStatus, PRIORITY_BADGES_DARK, PRIORITY_BADGES_LIGHT } from './constants';

const BAR_COLORS = {
  success: '#22C55E',
  info: '#0EA5E9',
  primary: '#8B5CF6',
  warning: '#F59E0B',
  inherit: '#CBD5E1',
};

export function StatusBadge({ status, isDark = false, size = 'default' }) {
  const normalized = normalizeLegacyStatus(status);
  const style = getStatusStyle(normalized, isDark);
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
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          px: 1,
        },
      }}
    />
  );
}

export function formatPriorityLabel(priority) {
  const raw = String(priority || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const tierMap = {
    P0: 'High',
    P1: 'Medium',
    P2: 'Low',
    P3: 'Low',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
    CRITICAL: 'High',
  };
  if (/^P[0-3]$/.test(upper)) {
    return `${upper} - ${tierMap[upper] || raw}`;
  }
  if (tierMap[upper]) {
    const code = { HIGH: 'P0', CRITICAL: 'P0', MEDIUM: 'P1', LOW: 'P2' }[upper];
    return `${code} - ${tierMap[upper]}`;
  }
  return raw;
}

/** Unified status pill with optional chevron inside the control. */
export function StatusSelectChip({
  status,
  isDark = false,
  interactive = false,
  onClick,
  disabled = false,
  size = 'default',
}) {
  const normalized = normalizeLegacyStatus(status);
  const style = getStatusStyle(normalized, isDark);
  const height = size === 'small' ? 24 : 28;

  return (
    <Box
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        height,
        px: 1,
        borderRadius: '8px',
        bgcolor: style.bgcolor,
        color: style.color,
        border: style.border,
        cursor: interactive && !disabled ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        font: 'inherit',
        outline: 'none',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.15s ease',
        '&:hover': interactive && !disabled ? { opacity: 0.9 } : undefined,
        '&:focus-visible': interactive
          ? { boxShadow: '0 0 0 2px rgba(79,70,229,0.35)' }
          : undefined,
      }}
    >
      <Typography component="span" sx={{ fontSize: size === 'small' ? '0.7rem' : '0.75rem', fontWeight: 700, lineHeight: 1 }}>
        {style.text}
      </Typography>
      {interactive ? (
        <ArrowDownIcon sx={{ fontSize: 16, opacity: 0.75, flexShrink: 0 }} aria-hidden />
      ) : null}
    </Box>
  );
}

/** Priority pill matching drawer / task detail styling. */
export function PriorityLabelChip({ priority, isDark, size = 'default' }) {
  const label = formatPriorityLabel(priority);
  if (!label) return null;
  const badges = isDark ? PRIORITY_BADGES_DARK : PRIORITY_BADGES_LIGHT;
  const style = badges[priority] || badges.High;
  const height = size === 'small' ? 24 : 28;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height,
        px: 1,
        borderRadius: '8px',
        fontSize: size === 'small' ? '0.7rem' : '0.72rem',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        color: style.color,
        bgcolor: style.bgcolor,
        border: '1px solid',
        borderColor: style.borderColor,
      }}
    >
      {label}
    </Box>
  );
}

/** Shared overdue alert — used in drawer, calendar panels, etc. */
export function OverdueBanner({ dueDate, overdueDays, compact = false, sx = {} }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (!overdueDays || overdueDays <= 0) return null;

  return (
    <Box
      role="alert"
      sx={{
        p: compact ? 1.25 : 1.75,
        borderRadius: 2,
        bgcolor: isDark ? '#450a0a' : '#FEF2F2',
        border: '1px solid',
        borderColor: isDark ? '#7f1d1d' : '#FECACA',
        ...sx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: dueDate ? 0.5 : 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <ScheduleIcon sx={{ fontSize: compact ? 16 : 18, color: '#DC2626' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#DC2626', fontSize: compact ? '0.75rem' : '0.875rem' }}>
            OVERDUE
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#DC2626' }}>
          {overdueDays} day{overdueDays === 1 ? '' : 's'} late
        </Typography>
      </Stack>
      {dueDate ? (
        <Typography variant="body2" sx={{ color: isDark ? '#FCA5A5' : '#991B1B', fontWeight: 600, fontSize: compact ? '0.75rem' : '0.875rem' }}>
          Due: {formatShortDate(dueDate)}
        </Typography>
      ) : null}
    </Box>
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
  const style = getStatusStyle(normalizeLegacyStatus(status), isDark);
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
