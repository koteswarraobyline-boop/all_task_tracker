import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import Can from './Can';
import { tokens } from '../theme';

export default function EmptyState({
  title,
  description,
  actionText,
  onActionClick,
  actionPermission = 'csv.upload',
  actionIcon,
}) {
  return (
    <Paper
      variant="outlined"
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      sx={{
        p: { xs: 4, md: 5 },
        textAlign: 'center',
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderColor: 'divider',
        borderRadius: `${tokens.radius.card}px`,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'action.hover' : '#FFFFFF',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 560,
        mx: 'auto',
        width: '100%',
        boxSizing: 'border-box',
        '&:hover': { transform: 'none', boxShadow: 'none' },
      }}
    >
      <Box
        sx={{
          width: { xs: 120, sm: 160 },
          height: { xs: 90, sm: 120 },
          mb: 3,
          opacity: 0.9,
          color: 'primary.main',
        }}
      >
        <svg
          viewBox="0 0 200 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%' }}
          aria-hidden
        >
          <rect
            x="30"
            y="20"
            width="140"
            height="100"
            rx="16"
            fill="currentColor"
            fillOpacity="0.1"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M50 45H150" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 65H110" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 85H130" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5, px: 1 }}>
        {title || 'No data yet'}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          maxWidth: 400,
          mb: onActionClick ? 4 : 0,
          lineHeight: 1.5,
          px: 1
        }}>
        {description || 'Nothing to show here yet.'}
      </Typography>
      {onActionClick && actionText && (
        <Can permission={actionPermission}>
          <Button
            variant="contained"
            color="primary"
            startIcon={actionIcon || <UploadIcon />}
            onClick={onActionClick}
          >
            {actionText}
          </Button>
        </Can>
      )}
    </Paper>
  );
}
