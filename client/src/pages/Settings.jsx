import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Avatar,
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Storage as DbIcon,
  Palette as PaintIcon,
  Info as InfoIcon,
  FolderOpen as ProjIcon,
  People as DevIcon,
  AssignmentTurnedIn as TaskIcon,
} from '@mui/icons-material';
import api from '../services/api';

export default function Settings() {
  const [stats, setStats] = useState({ projects: 0, developers: 0, tasks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettingsStats = async () => {
      try {
        setLoading(true);
        // Fetch projects
        const projs = await api.getProjects();
        // Fetch developers
        const devs = await api.getDevelopers();
        
        let taskCount = 0;
        projs.forEach(p => {
          taskCount += p.totalTasks || 0;
        });

        setStats({
          projects: projs.length,
          developers: devs.length,
          tasks: taskCount
        });
      } catch (error) {
        console.error('Failed to load settings statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettingsStats();
  }, []);

  return (
    <Box sx={{ p: 4, maxWidth: 1000 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Workspace Settings
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage preferences, inspect database environments, and view system statistics.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Section 1: System Statistics */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3 }}>
                  <DbIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Database Statistics
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Current row counts inside local MySQL tables.
                </Typography>

                <Stack spacing={2.5}>
                  {[
                    { label: 'Active Projects', value: stats.projects, icon: <ProjIcon />, color: '#4F46E5' },
                    { label: 'Registered Developers', value: stats.developers, icon: <DevIcon />, color: '#06B6D4' },
                    { label: 'Imported Tasks', value: stats.tasks, icon: <TaskIcon />, color: '#22C55E' },
                  ].map((stat, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" gap={1.5}>
                          <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color, width: 38, height: 38 }}>
                            {stat.icon}
                          </Avatar>
                          <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>
                            {stat.label}
                          </Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {stat.value}
                        </Typography>
                      </Stack>
                      {idx < 2 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Section 2: Environment Parameters */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3 }}>
                  <InfoIcon color="secondary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Environment Variables
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Current system configurations sourced from local `.env`.
                </Typography>

                <Stack spacing={2}>
                  {[
                    { key: 'API Endpoint', value: 'http://localhost:5000/api' },
                    { key: 'Database Dialect', value: 'MySQL (Sequelize ORM)' },
                    { key: 'Host Name', value: 'localhost' },
                    { key: 'Database Name', value: 'dev_task_tracker' },
                    { key: 'Port Bind', value: '3306' },
                  ].map((item, idx) => (
                    <Paper
                      key={idx}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f293730' : '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {item.key}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.value}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Section 3: Visual Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                  <PaintIcon color="warning" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Personalization
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Customize the look and behavior of the dashboard.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <FormControlLabel
                  control={<Switch defaultChecked disabled />}
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Enable Glassmorphism Cards</Typography>
                      <Typography variant="caption" color="text.secondary">Apply soft blurs and light borders to metrics containers.</Typography>
                    </Box>
                  }
                  sx={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row-reverse', mx: 0, py: 1 }}
                />
                
                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={<Switch defaultChecked disabled />}
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Framer Motion Page Transitions</Typography>
                      <Typography variant="caption" color="text.secondary">Enable slide and fade entry animations on layout navigate.</Typography>
                    </Box>
                  }
                  sx={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row-reverse', mx: 0, py: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
