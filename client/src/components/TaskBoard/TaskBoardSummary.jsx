import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  AssignmentOutlined as TasksIcon,
  CheckCircleOutlined as DoneIcon,
  Timelapse as ProgressIcon,
  EventBusyOutlined as OverdueIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme';

const KPI_DEFS = [
  {
    key: 'total',
    label: 'Total Tasks',
    icon: TasksIcon,
    tint: '#EEF2FF',
    iconColor: '#4F46E5',
    activeBorder: '#4F46E5',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: DoneIcon,
    tint: '#ECFDF5',
    iconColor: '#059669',
    activeBorder: '#059669',
  },
  {
    key: 'inProgress',
    label: 'In Progress',
    icon: ProgressIcon,
    tint: '#EEF2FF',
    iconColor: '#4F46E5',
    activeBorder: '#4F46E5',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: OverdueIcon,
    tint: '#FEF2F2',
    iconColor: '#DC2626',
    activeBorder: '#DC2626',
  },
];

function pct(part, total) {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(2)}%`;
}

export default function TaskBoardSummary({ stats, activeKpi, onKpiClick }) {
  const total = stats?.total ?? 0;
  const values = {
    total,
    completed: stats?.completed ?? 0,
    inProgress: stats?.inProgress ?? 0,
    overdue: stats?.overdue ?? 0,
  };

  const subs = {
    total: null,
    completed: pct(values.completed, total),
    inProgress: pct(values.inProgress, total),
    overdue: pct(values.overdue, total),
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
      }}
    >
      {KPI_DEFS.map((kpi) => {
        const Icon = kpi.icon;
        const active = activeKpi === kpi.key;
        const sub = subs[kpi.key];
        const subColor = kpi.key === 'overdue' && values.overdue > 0 ? 'error.main' : 'text.secondary';

        return (
          <Paper
            key={kpi.key}
            elevation={0}
            onClick={() => onKpiClick?.(kpi.key)}
            sx={{
              p: 2,
              minHeight: 96,
              borderRadius: `${tokens.radius.card}px`,
              border: '2px solid',
              borderColor: active ? kpi.activeBorder : 'divider',
              bgcolor: 'background.paper',
              boxShadow: active ? tokens.shadow.hover : tokens.shadow.card,
              cursor: onKpiClick ? 'pointer' : 'default',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              '&:hover': onKpiClick
                ? {
                    boxShadow: tokens.shadow.hover,
                    borderColor: kpi.activeBorder,
                  }
                : undefined,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: `${tokens.radius.button}px`,
                  bgcolor: kpi.tint,
                  color: kpi.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.25 }}>
                  {kpi.label}
                </Typography>
                <Typography sx={{ fontSize: '1.35rem', fontWeight: 650, lineHeight: 1.2, color: 'text.primary' }}>
                  {values[kpi.key]}
                </Typography>
                {sub ? (
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: subColor, mt: 0.25 }}>
                    {sub}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
