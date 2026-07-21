import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Typography,
  Stack,
  LinearProgress,
  Chip,
  Box,
} from '@mui/material';

export default function DeveloperPerformance({ tasks, developers }) {
  // Aggregate data from tasks for each developer
  const performanceData = developers.map((dev) => {
    const devTasks = tasks.filter((t) => t.developerId === dev.id);
    const assignedTasks = devTasks.length;
    const completedTasks = devTasks.filter((t) => t.status === 'Completed').length;
    
    // Sum hours for completed tasks to calculate true task efficiency
    const completedTasksWithHours = devTasks.filter(
      (t) => t.status === 'Completed' && t.actualHours > 0 && t.estimatedHours > 0
    );

    let totalEst = 0;
    let totalAct = 0;
    completedTasksWithHours.forEach((t) => {
      totalEst += parseFloat(t.estimatedHours || 0);
      totalAct += parseFloat(t.actualHours || 0);
    });

    let efficiency = 100;
    if (totalAct > 0) {
      efficiency = Math.round((totalEst / totalAct) * 100);
    } else if (assignedTasks > 0 && completedTasks === 0) {
      efficiency = 0; // Has tasks but completed none yet
    }

    const totalHoursLogged = devTasks.reduce((sum, t) => sum + parseFloat(t.actualHours || 0), 0);

    return {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      color: dev.color,
      assignedTasks,
      completedTasks,
      hours: totalHoursLogged,
      efficiency,
    };
  });

  // Sort by efficiency descending
  performanceData.sort((a, b) => b.efficiency - a.efficiency);

  const getEfficiencyColor = (eff) => {
    if (eff >= 100) return 'success';
    if (eff >= 80) return 'primary';
    if (eff >= 50) return 'warning';
    return 'error';
  };

  const getDevInitials = (name) => {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: 'none' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Developer</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700 }}>Assigned Tasks</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700 }}>Completed</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700 }}>Hours Logged</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Efficiency %</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {performanceData.map((row) => (
            <TableRow
              key={row.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <TableCell sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.8rem',
                      bgcolor: row.color,
                      fontWeight: 700,
                    }}
                  >
                    {getDevInitials(row.name)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 650, fontSize: '0.85rem' }}>
                      {row.name}
                    </Typography>
                    {row.email && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem', mt: -0.2 }}>
                        {row.email}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </TableCell>
              
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.assignedTasks}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: 'success.main' }}>{row.completedTasks}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.hours.toFixed(1)}h</TableCell>
              
              <TableCell sx={{ minWidth: 150 }}>
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ height: 24 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(row.efficiency, 100)}
                      color={getEfficiencyColor(row.efficiency)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Chip
                    label={`${row.efficiency}%`}
                    size="small"
                    color={getEfficiencyColor(row.efficiency)}
                    variant="outlined"
                    sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                  />
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
