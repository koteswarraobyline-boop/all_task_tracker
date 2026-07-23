import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { FactCheck as LogoIcon, SearchOff as NotFoundIcon } from '@mui/icons-material';

export default function LinkNotFoundPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'background.default' }}>
      <Paper sx={{ p: { xs: 3.5, md: 5 }, maxWidth: 460, textAlign: 'center', borderRadius: '4px', width: '100%' }}>
        <Stack spacing={2} sx={{
          alignItems: "center"
        }}>
          <LogoIcon color="primary" sx={{ fontSize: 36 }} />
          <NotFoundIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Link not found
          </Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>
            This share URL is invalid or was removed. Double-check the link or ask the admin for a new one.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
