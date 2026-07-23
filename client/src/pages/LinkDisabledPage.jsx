import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { FactCheck as LogoIcon, LinkOff as DisabledIcon } from '@mui/icons-material';

export default function LinkDisabledPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'background.default' }}>
      <Paper sx={{ p: { xs: 3.5, md: 5 }, maxWidth: 460, textAlign: 'center', borderRadius: '4px', width: '100%' }}>
        <Stack spacing={2} sx={{
          alignItems: "center"
        }}>
          <LogoIcon color="primary" sx={{ fontSize: 36 }} />
          <DisabledIcon color="error" sx={{ fontSize: 48 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Sharing disabled
          </Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>
            The project admin has turned off this share link. Request a new one if you still need access.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
