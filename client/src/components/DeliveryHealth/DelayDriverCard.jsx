import React from 'react';
import {
  Box,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { WarningAmber as WarningIcon } from '@mui/icons-material';

export default function DelayDriverCard({ task, variant = 'primary', showScore = true }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isPrimary = variant === 'primary';

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: isPrimary
          ? isDark
            ? 'rgba(239,68,68,0.4)'
            : '#FECACA'
          : isDark
            ? 'rgba(148,163,184,0.2)'
            : '#E2E8F0',
        borderLeft: isPrimary ? '4px solid #EF4444' : undefined,
        bgcolor: isPrimary
          ? isDark
            ? 'rgba(239,68,68,0.1)'
            : '#FEF2F2'
          : isDark
            ? 'rgba(15,23,42,0.5)'
            : '#F8FAFC',
      }}
    >
      {isPrimary && (
        <Stack direction="row" alignItems="center" gap={0.75} mb={1}>
          <WarningIcon sx={{ color: '#EF4444', fontSize: 18 }} />
          <Chip
            size="small"
            label="PRIMARY DELAY DRIVER"
            sx={{
              height: 22,
              fontWeight: 800,
              fontSize: '0.62rem',
              bgcolor: '#FEE2E2',
              color: '#B91C1C',
            }}
          />
        </Stack>
      )}

      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.25 }}>
        {task.phase ? `Phase: ${task.phase}` : null}
        {task.phase && task.module ? ' · ' : null}
        {task.module ? `Module: ${task.module}` : null}
      </Typography>

      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 1 }}>{task.taskName}</Typography>

      <Stack direction="row" alignItems="center" gap={1} mb={1}>
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={task.progress ?? 0}
            color={isPrimary ? 'error' : 'primary'}
            sx={{ height: 6, borderRadius: 99 }}
          />
        </Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 36 }}>
          {task.progress ?? 0}%
        </Typography>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {task.overdueDays > 0 && (
          <Chip size="small" label={`${task.overdueDays} days overdue`} color="error" variant="outlined" />
        )}
        {task.status && <Chip size="small" label={task.status} variant="outlined" />}
        {showScore && task.delayImpactScore != null && (
          <Chip size="small" label={`Impact ${task.delayImpactScore}`} variant="outlined" />
        )}
      </Stack>

      {task.explanation && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1.25, lineHeight: 1.5 }}>
          {task.explanation}
        </Typography>
      )}
    </Box>
  );
}
