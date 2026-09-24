import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { StatusBadge, PriorityBadge, ProgressCell } from '../TaskBoard/Badges';
import { PRIORITY_BADGES_LIGHT, PRIORITY_BADGES_DARK } from '../TaskBoard/constants';
import { splitTitleAndDescription } from '../TaskDetailsDrawer';
import { getDeveloperDisplayName } from '../../utils/developerDisplay';
import { formatShortDate } from '../../utils/deliveryHealth';
import { getOverdueDays, shouldShowOverdueAlert } from '../../utils/taskManagementConstants';
import { tokens } from '../../theme';

export default function CalendarListView({
  tasks,
  developers,
  isClient,
  isDark,
  onTaskClick,
}) {
  const priorityBadges = isDark ? PRIORITY_BADGES_DARK : PRIORITY_BADGES_LIGHT;

  const grouped = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const key = toDateOnly(task.dueDate) || toDateOnly(task.startDate) || 'unscheduled';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    return [...map.entries()].sort(([a], [b]) => {
      if (a === 'unscheduled') return 1;
      if (b === 'unscheduled') return -1;
      return a.localeCompare(b);
    });
  }, [tasks]);

  if (!tasks.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No tasks match the current filters.
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      {grouped.map(([dateKey, dayTasks]) => (
        <Box key={dateKey}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
            {dateKey === 'unscheduled'
              ? 'Unscheduled'
              : formatShortDate(dateKey)}
          </Typography>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: `${tokens.radius.card}px` }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Task</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Task ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  {!isClient && <TableCell sx={{ fontWeight: 700 }}>Developer</TableCell>}
                  <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dayTasks.map((task) => {
                  const { title } = splitTitleAndDescription(task.taskName, task.description);
                  const dev = developers.find(
                    (d) => d.id === task.developerId || d.id === parseInt(task.developerId, 10)
                  );
                  const overdue = shouldShowOverdueAlert(task);
                  return (
                    <TableRow
                      key={task.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <TableCell sx={{ fontWeight: 650, maxWidth: 200 }}>{title}</TableCell>
                      <TableCell>{task.taskId || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} isDark={isDark} size="small" />
                      </TableCell>
                      {!isClient && (
                        <TableCell>{getDeveloperDisplayName(dev) || 'Unassigned'}</TableCell>
                      )}
                      <TableCell>{task.startDate ? formatShortDate(task.startDate) : '—'}</TableCell>
                      <TableCell>
                        {task.dueDate ? formatShortDate(task.dueDate) : '—'}
                        {overdue && (
                          <Typography component="span" variant="caption" sx={{ color: 'error.main', fontWeight: 700, ml: 0.5 }}>
                            {getOverdueDays(task)}d late
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={task.priority} badges={priorityBadges} />
                      </TableCell>
                      <TableCell>
                        <ProgressCell task={task} width={60} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Stack>
  );
}