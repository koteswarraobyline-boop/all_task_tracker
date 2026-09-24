import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { StatusDot } from '../TaskBoard/Badges';

const LEGEND_ITEMS = [
  { status: 'Completed', label: 'Completed' },
  { status: 'In Development', label: 'In Development' },
  { status: 'Testing', label: 'Testing' },
  { status: 'On Hold', label: 'On Hold' },
  { status: 'Blocked', label: 'Blocked' },
  { status: 'Upcoming', label: 'Planned' },
];

export default function CalendarLegend({ isDark = false }) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      alignItems="center"
      gap={2}
      sx={{ py: 1.5, px: 0.5 }}
    >
      {LEGEND_ITEMS.map(({ status, label }) => (
        <Stack key={status} direction="row" alignItems="center" spacing={0.75}>
          <StatusDot status={status} isDark={isDark} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {label}
          </Typography>
        </Stack>
      ))}
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#DC2626' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Overdue
        </Typography>
      </Stack>
    </Stack>
  );
}
