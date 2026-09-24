import React from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
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
import { tokens } from '../../theme';

export default function DeliveryHealthCard({
  analysis,
  compact = false,
  primaryTitleOnly = false,
  onViewAnalysis,
  sx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const status = analysis?.deliveryStatus || (analysis?.isProjectOverdue ? 'OVERDUE' : 'ON_TRACK');
  const primary = analysis?.primaryDelayDriver;
  const completion = analysis?.completionPercent ?? analysis?.progress ?? 0;
  const deliveryLabel = formatShortDate(
    analysis?.deliveryDate || analysis?.activeDeliveryDate || analysis?.dueDate
  );

  const cardBg = isDark ? 'rgba(15,23,42,0.6)' : '#FFFFFF';
  const borderColor =
    status === 'OVERDUE'
      ? isDark
        ? '#7F1D1D'
        : '#FECACA'
      : isDark
        ? 'rgba(148,163,184,0.2)'
        : tokens.colors.border;

  const footerChips = (
    <Stack direction="row" flexWrap="wrap" gap={1}>
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
  );

  if (compact) {
    return (
      <Box
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: `${tokens.radius.card}px`,
          border: '1px solid',
          borderColor,
          bgcolor: cardBg,
          borderLeft: status === 'OVERDUE' ? '4px solid #EF4444' : undefined,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          ...sx,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
            {status === 'OVERDUE' ? (
              <WarningIcon sx={{ color: '#EF4444', fontSize: 22, flexShrink: 0 }} />
            ) : (
              <ScheduleIcon sx={{ color: tokens.colors.primary, fontSize: 22, flexShrink: 0 }} />
            )}
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: tokens.colors.text }}>
              Delivery Health
            </Typography>
          </Stack>
          <ProjectHealthBadge status={status} />
        </Stack>

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.35rem',
                lineHeight: 1.2,
                color: status === 'OVERDUE' ? '#EF4444' : tokens.colors.text,
                mb: 1,
              }}
            >
              {deliveryTimingText(analysis)}
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, fontWeight: 500 }}>
              Target delivery: {deliveryLabel}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: tokens.colors.text, mb: 1 }}>
              {completion}% complete
            </Typography>
            <LinearProgress
              variant="determinate"
              value={completion}
              sx={{
                height: 8,
                borderRadius: 99,
                bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 99,
                  bgcolor: tokens.colors.primary,
                },
              }}
            />
          </Grid>
        </Grid>

        {primary ? (
          <Box
            sx={{
              p: 2,
              borderRadius: `${tokens.radius.button}px`,
              bgcolor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
              border: '1px solid',
              borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FECACA',
            }}
          >
            <Chip
              size="small"
              label="Primary delay driver"
              sx={{
                height: 24,
                mb: 1.25,
                fontWeight: 800,
                fontSize: '0.6875rem',
                bgcolor: '#FEE2E2',
                color: '#B91C1C',
              }}
            />
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.4, color: tokens.colors.text }}>
              {primary.taskName}
            </Typography>
            {!primaryTitleOnly ? (
              <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mt: 0.75 }}>
                {primary.overdueDays > 0 ? `${primary.overdueDays} days overdue · ` : ''}
                {primary.progress}% complete
              </Typography>
            ) : null}
          </Box>
        ) : null}

        <Box sx={{ mt: 'auto', pt: primary ? 0 : 0.5 }}>{footerChips}</Box>

        {onViewAnalysis ? (
          <Button size="small" variant="outlined" onClick={onViewAnalysis} sx={{ fontWeight: 700, alignSelf: 'flex-start' }}>
            View Delay Analysis
          </Button>
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2.75,
        borderRadius: `${tokens.radius.card}px`,
        border: '1px solid',
        borderColor,
        bgcolor: cardBg,
        borderLeft: status === 'OVERDUE' ? '4px solid #EF4444' : undefined,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        ...sx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Stack direction="row" alignItems="center" gap={1.25}>
          {status === 'OVERDUE' ? (
            <WarningIcon sx={{ color: '#EF4444', fontSize: 22 }} />
          ) : (
            <ScheduleIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          )}
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>Delivery Health</Typography>
        </Stack>
        <ProjectHealthBadge status={status} />
      </Stack>

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '1.35rem',
          color: status === 'OVERDUE' ? '#EF4444' : 'text.primary',
        }}
      >
        {deliveryTimingText(analysis)}
      </Typography>

      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1 }}>
          {completion}% complete
        </Typography>
        <LinearProgress
          variant="determinate"
          value={completion}
          sx={{ height: 8, borderRadius: 99, maxWidth: 280 }}
        />
      </Box>

      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
        Target delivery: {deliveryLabel}
      </Typography>

      {primary && (
        <Box
          sx={{
            p: 2,
            borderRadius: `${tokens.radius.button}px`,
            bgcolor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
            border: '1px solid',
            borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FECACA',
          }}
        >
          <Chip
            size="small"
            label="Primary delay driver"
            sx={{
              height: 24,
              mb: 1.25,
              fontWeight: 800,
              fontSize: '0.6875rem',
              bgcolor: '#FEE2E2',
              color: '#B91C1C',
            }}
          />
          <Typography sx={{ fontWeight: 750, fontSize: '0.9375rem' }}>{primary.taskName}</Typography>
          {!primaryTitleOnly ? (
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.75 }}>
              {primary.overdueDays > 0 ? `${primary.overdueDays} days overdue · ` : ''}
              {primary.progress}% complete
            </Typography>
          ) : null}
        </Box>
      )}

      {footerChips}

      {onViewAnalysis && (
        <Button size="small" variant="outlined" onClick={onViewAnalysis} sx={{ fontWeight: 700, alignSelf: 'flex-start' }}>
          View Delay Analysis
        </Button>
      )}
    </Box>
  );
}
