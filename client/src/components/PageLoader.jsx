import React from 'react';
import { Box, CircularProgress } from '@mui/material';

export default function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        width: '100%',
      }}
    >
      <CircularProgress size={36} />
    </Box>
  );
}
