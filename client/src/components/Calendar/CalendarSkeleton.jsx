import React from 'react';
import { Box, Paper, Skeleton, Stack } from '@mui/material';
import { tokens } from '../../theme';

export default function CalendarSkeleton() {
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Skeleton width={220} height={36} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={80} height={36} />
          <Skeleton variant="rounded" width={80} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: `${tokens.radius.card}px` }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={44} />
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: `${tokens.radius.card}px` }}>
        <Skeleton variant="rounded" height={480} />
      </Paper>
    </Stack>
  );
}
