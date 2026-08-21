import React from 'react';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { WarningAmber as WarningIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import ProjectHealthBadge from './ProjectHealthBadge';
import {
  deliveryTimingText,
  formatShortDate,
} from '../../utils/deliveryHealth';

export default function DeliveryHealthCard({
  analysis,
  compact = false,
  onViewAnalysis,
  sx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const status = analysis?.deliveryStatus || (analysis?.isProjectOverdue ? 'OVERDUE' : 'ON_TRACK');
  const primary = analysis?.primaryDelayDriver;

  const cardBg = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.88)';
  const borderColor =
    status === 'OVERDUE'
      ? isDark
        ? '#7F1D1D'
        : '#FECACA'
      : isDark
        ? 'rgba(148,163,184,0.2)'
        : '#E2E8F0';

  return (
    <Box
      sx={{
        p: compact ? 2 : 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor,
        bgcolor: cardBg,
        borderLeft: status === 'OVERDUE' ? '4px solid' : undefined,
        borderLeftColor: status === 'OVERDUE' ? '#EF4444' : undefined,
        ...sx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1.5}>
        <Stack direction="row" alignItems="center" gap={1}>
          {status === 'OVERDUE' ? (
            <WarningIcon sx={{ color: '#EF4444', fontSize: 20 }} />
          ) : (
            <ScheduleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          )}
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Delivery Health</Typography>
        </Stack>
        <ProjectHealthBadge status={status} />
      </Stack>

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: compact ? '1.1rem' : '1.35rem',
          color: status === 'OVERDUE' ? '#EF4444' : 'text.primary',
          mb: 0.5,
        }}
      >
        {deliveryTimingText(analysis)}
      </Typography>

      <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
          {analysis?.completionPercent ?? analysis?.progress ?? 0}% complete
        </Typography>
        <Box sx={{ flex: 1, maxWidth: 120 }}>
          <LinearProgress
            variant="determinate"
            value={analysis?.completionPercent ?? analysis?.progress ?? 0}
            sx={{ height: 6, borderRadius: 99 }}
          />
        </Box>
      </Stack>

      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 1.5 }}>
        Target delivery: {formatShortDate(analysis?.deliveryDate || analysis?.activeDeliveryDate || analysis?.dueDate)}
      </Typography>

      {primary && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
            border: '1px solid',
            borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FECACA',
            mb: 1.5,
          }}
        >
          <Chip
            size="small"
            label="Primary delay driver"
            sx={{
              height: 22,
              mb: 1,
              fontWeight: 800,
              fontSize: '0.65rem',
              bgcolor: '#FEE2E2',
              color: '#B91C1C',
            }}
          />
          <Typography sx={{ fontWeight: 750, fontSize: '0.875rem' }}>{primary.taskName}</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            {primary.overdueDays > 0 ? `${primary.overdueDays} days overdue · ` : ''}
            {primary.progress}% complete
          </Typography>
        </Box>
      )}

      <Stack direction="row" flexWrap="wrap" gap={0.75} mb={onViewAnalysis ? 1.5 : 0}>
        {(analysis?.lateTaskCount ?? 0) > 0 && (
          <Chip size="small" label={`${analysis.lateTaskCount} late`} variant="outlined" />
        )}
        {(analysis?.blockedTaskCount ?? analysis?.blocked ?? 0) > 0 && (
          <Chip size="small" label={`${analysis.blockedTaskCount ?? analysis.blocked} blocked`} variant="outlined" />
        )}
        {(analysis?.remainingTaskCount ?? analysis?.remaining ?? 0) > 0 && (
          <Chip
            size="small"
            label={`${analysis.remainingTaskCount ?? analysis.remaining} remaining`}
            variant="outlined"
          />
        )}
      </Stack>

      {onViewAnalysis && (
        <Button size="small" variant="outlined" onClick={onViewAnalysis} sx={{ fontWeight: 700 }}>
          View Delay Analysis
        </Button>
      )}
    </Box>
  );
}
