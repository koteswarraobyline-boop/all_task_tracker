import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function EmptyState({ title, description, actionText, onActionClick }) {
  return (
    <Paper
      variant="outlined"
      component={motion.div}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      sx={{
        p: 6,
        textAlign: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: 'primary.light',
        borderRadius: 4,
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#11182740' : '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 600,
        mx: 'auto',
        mt: 4,
      }}
    >
      {/* SaaS Vector Illustration */}
      <Box sx={{ width: 220, height: 160, mb: 4, opacity: 0.85 }}>
        <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect x="30" y="20" width="140" height="100" rx="10" fill="#4F46E5" fillOpacity="0.1" stroke="#4F46E5" strokeWidth="2" />
          <path d="M50 45H150" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 65H110" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 85H130" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <circle cx="150" cy="85" r="15" fill="#06B6D4" fillOpacity="0.2" stroke="#06B6D4" strokeWidth="2" />
          <path d="M145 85L148 88L155 81" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="75" y="105" width="50" height="30" rx="6" fill="#22C55E" fillOpacity="0.15" stroke="#22C55E" strokeWidth="2" />
          <path d="M92 120H108" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
          <path d="M100 112V128" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 750, color: 'text.primary', mb: 1.5 }}>
        {title || 'No data imported yet'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 4.5, lineHeight: 1.6 }}>
        {description || 'Import your project tasks from a CSV spreadsheet to start logging developer assignments and monitoring visual analytics.'}
      </Typography>

      {onActionClick && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<UploadIcon />}
          onClick={onActionClick}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: 3,
            fontWeight: 700,
            boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.4)',
          }}
        >
          {actionText || 'Upload Project CSV'}
        </Button>
      )}
    </Paper>
  );
}
