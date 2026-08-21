import React from 'react';
import { Box, Stack, Typography, Card, CardContent } from '@mui/material';
import { tokens } from '../theme';

/**
 * Standard page shell — 32px padding, max content width.
 */
export default function PageContainer({
  children,
  maxWidth = tokens.layout.maxWidth,
  narrow = false,
  sx = {},
}) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: narrow ? 960 : maxWidth,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: tokens.layout.contentPad }, // 16 / 24 / 32
        py: { xs: 3, md: tokens.layout.contentPad },
        boxSizing: 'border-box',
        minWidth: 0,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Page title row with optional actions — 40px section rhythm below */
export function PageHeader({ title, subtitle, actions, back, sx = {} }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        justifyContent: "space-between",
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 3,
        mb: 5,
        minWidth: 0,
        ...sx
      }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 2,
          minWidth: 0,
          flex: 1
        }}>
        {back}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 700,
              letterSpacing: 0,
              lineHeight: 1.5,
              mb: subtitle ? 1 : 0,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                lineHeight: 1.5,
                fontSize: '0.875rem'
              }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {actions ? (
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 2,
            flexWrap: "wrap",
            flexShrink: 0,
            alignItems: 'center'
          }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

/** KPI / metric card matching premium dashboard style */
export function MetricCard({
  label,
  value,
  icon,
  tint = '#EEF2FF',
  iconColor = '#4F46E5',
  trend,
  trendUp = true,
  onClick,
  sx = {},
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        ...(onClick ? { cursor: 'pointer' } : {}),
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: tokens.shadow.hover,
        },
        ...sx,
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            mb: 2
          }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: `${tokens.radius.button}px`,
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.hover' : tint),
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            mb: 1,
            lineHeight: 1.5
          }}>
          {label}
        </Typography>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '1.75rem', md: '2rem' },
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.3,
            mb: trend ? 1.5 : 0,
          }}
        >
          {value}
        </Typography>
        {trend ? (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: trendUp ? 'success.main' : 'error.main',
              lineHeight: 1.5,
              display: 'block',
            }}
          >
            {trend}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
