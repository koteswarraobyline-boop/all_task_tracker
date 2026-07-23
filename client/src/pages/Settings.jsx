import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Avatar,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Storage as DbIcon,
  Palette as PaintIcon,
  FolderOpen as ProjIcon,
  People as DevIcon,
  AssignmentTurnedIn as TaskIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer, { PageHeader } from '../components/PageContainer';

export default function Settings() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [stats, setStats] = useState({ projects: 0, developers: 0, tasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettingsStats = async () => {
      try {
        setLoading(true);
        setError('');
        const [projs, devs] = await Promise.all([api.getProjects(), api.getDevelopers()]);
        let taskCount = 0;
        projs.forEach((p) => {
          taskCount += p.totalTasks || 0;
        });
        setStats({
          projects: projs.length,
          developers: devs.length,
          tasks: taskCount,
        });
      } catch (err) {
        console.error('Failed to load settings statistics:', err);
        setError('Could not load workspace statistics.');
      } finally {
        setLoading(false);
      }
    };
    loadSettingsStats();
  }, []);

  return (
    <PageContainer narrow>
      <PageHeader title="Workspace Settings" subtitle="Live counts and appearance." />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 2.5 }}>
                <DbIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Workspace overview
                </Typography>
              </Stack>

              <Stack spacing={2.5}>
                {[
                  { label: 'Projects', value: stats.projects, icon: <ProjIcon />, color: '#4F46E5' },
                  { label: 'Developers', value: stats.developers, icon: <DevIcon />, color: '#06B6D4' },
                  { label: 'Tasks', value: stats.tasks, icon: <TaskIcon />, color: '#22C55E' },
                ].map((stat, idx) => (
                  <Box key={stat.label}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: `${stat.color}18`, color: stat.color, width: 40, height: 40 }}>
                          {stat.icon}
                        </Avatar>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
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

          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 2 }}>
                <PaintIcon color="warning" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Appearance
                </Typography>
              </Stack>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                }}
              >
                {isDark ? <DarkIcon color="primary" /> : <LightIcon color="primary" />}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {isDark ? 'Dark mode' : 'Light mode'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Switch with the theme icon in the header.
                  </Typography>
                </Box>
              </Paper>
            </CardContent>
          </Card>
        </Stack>
      )}
    </PageContainer>
  );
}
