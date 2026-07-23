import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { FactCheck as LogoIcon, EventBusy as ExpiredIcon } from '@mui/icons-material';

export default function LinkExpiredPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Paper sx={{ p: { xs: 3.5, md: 5 }, maxWidth: 460, textAlign: 'center', borderRadius: '4px', width: '100%' }}>
        <Stack spacing={2} sx={{
          alignItems: "center"
        }}>
          <LogoIcon color="primary" sx={{ fontSize: 36, mb: 0.5 }} />
          <ExpiredIcon color="warning" sx={{ fontSize: 48 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Link no longer available
          </Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>
            This shared project link is no longer valid. Ask the project admin for a new link.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
