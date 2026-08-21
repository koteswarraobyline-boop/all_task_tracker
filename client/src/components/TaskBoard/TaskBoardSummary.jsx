import React from 'react';
import { Box, Grid, Stack, Typography, LinearProgress } from '@mui/material';
import {
  AssignmentOutlined as TasksIcon,
  CheckCircleOutlined as DoneIcon,
  Timelapse as ProgressIcon,
  Block as BlockedIcon,
  Groups as DevsIcon,
} from '@mui/icons-material';

const CARDS = [
  {
    key: 'total',
    label: 'Total Tasks',
    icon: TasksIcon,
    gradient: 'linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 70%)',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    bar: '#6366F1',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: DoneIcon,
    gradient: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 70%)',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    bar: '#22C55E',
  },
  {
    key: 'inProgress',
    label: 'In Progress',
    icon: ProgressIcon,
    gradient: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 70%)',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    bar: '#3B82F6',
  },
  {
    key: 'blocked',
    label: 'Blocked',
    icon: BlockedIcon,
    gradient: 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 70%)',
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    bar: '#EF4444',
  },
  {
    key: 'developers',
    label: 'Developers',
    icon: DevsIcon,
    gradient: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 70%)',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    bar: '#8B5CF6',
  },
];

export default function TaskBoardSummary({ stats }) {
  const values = {
    total: stats.total ?? 0,
    completed: stats.completed ?? 0,
    inProgress: stats.inProgress ?? 0,
    blocked: stats.blocked ?? 0,
    developers: stats.developers ?? 0,
  };

  const percents = {
    total: 100,
    completed: values.total ? Math.round((values.completed / values.total) * 100) : 0,
    inProgress: values.total ? Math.round((values.inProgress / values.total) * 100) : 0,
    blocked: values.total ? Math.round((values.blocked / values.total) * 100) : 0,
    developers: Math.min(100, (values.developers || 0) * 12),
  };

  return (
    <Grid container spacing={2}>
      {CARDS.map((card) => {
        const Icon = card.icon;
        const display = values[card.key];
        return (
          <Grid key={card.key} size={{ xs: 6, sm: 4, md: 2 }}>
            <Box
              sx={{
                p: 2,
                height: '100%',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                background: (t) =>
                  t.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                    : card.gradient,
                boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                },
              }}
            >
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: 'text.secondary',
                      letterSpacing: '0.02em',
                      fontSize: '0.7rem',
                    }}
                  >
                    {card.label}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      mt: 0.5,
                      lineHeight: 1.1,
                      fontSize: { xs: '1.25rem', md: '1.5rem' },
                    }}
                  >
                    {display}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: (t) =>
                      t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : card.iconBg,
                    color: card.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </Box>
              </Stack>
              <Box sx={{ mt: 1.75 }}>
                <LinearProgress
                  variant="determinate"
                  value={percents[card.key]}
                  sx={{
                    height: 4,
                    borderRadius: 999,
                    bgcolor: 'rgba(148,163,184,0.2)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      bgcolor: card.bar,
                    },
                  }}
                />
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
