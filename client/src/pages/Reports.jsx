import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  IconButton,
  Button,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Timeline as ReportIcon,
  Timer as TimerIcon,
  HourglassEmpty as EstIcon,
  HourglassFull as LogIcon,
  CheckCircle as ProdIcon,
} from '@mui/icons-material';
import api from '../services/api';

export default function Reports() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        // Load project metadata
        const projects = await api.getProjects();
        const found = projects.find(p => p.id === parseInt(projectId));
        setProject(found || { name: `Project #${projectId}` });

        // Load developers
        const devs = await api.getDevelopers();
        setDevelopers(devs);

        // Load all tasks unpaginated
        const response = await api.getProjectTasks(projectId, { limit: -1 });
        setTasks(response.tasks);
      } catch (error) {
        console.error('Failed to load report data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [projectId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 1. KPI Calculations
  const totalTasksCount = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const completedCount = completedTasks.length;
  
  // Productivity %
  const productivity = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  // Estimated vs Logged
  const totalEstHours = tasks.reduce((sum, t) => sum + parseFloat(t.estimatedHours || 0), 0);
  const totalLoggedHours = tasks.reduce((sum, t) => sum + parseFloat(t.actualHours || 0), 0);

  // Average Completion Time (in Days)
  let avgCompletionTime = 'N/A';
  const completedWithDates = completedTasks.filter((t) => t.startDate && t.dueDate);
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, t) => {
      const start = new Date(t.startDate);
      const due = new Date(t.dueDate);
      const days = Math.max(1, Math.round((due - start) / 86400000));
      return sum + days;
    }, 0);
    avgCompletionTime = `${(totalDays / completedWithDates.length).toFixed(1)} Days`;
  }

  // 2. Chart Data: Tasks by Module
  const moduleMap = {};
  tasks.forEach((t) => {
    const mod = t.module || 'Unassigned';
    moduleMap[mod] = (moduleMap[mod] || 0) + 1;
  });
  const tasksByModuleData = Object.entries(moduleMap).map(([name, value]) => ({ name, tasks: value }));

  // 3. Chart Data: Tasks by Developer (Estimated vs Logged Hours)
  const devHoursMap = {};
  developers.forEach((d) => {
    devHoursMap[d.id] = {
      developerName: d.name,
      estimated: 0,
      logged: 0,
    };
  });
  devHoursMap['unassigned'] = {
    developerName: 'Unassigned',
    estimated: 0,
    logged: 0,
  };

  tasks.forEach((t) => {
    const devId = t.developerId || 'unassigned';
    if (!devHoursMap[devId]) {
      devHoursMap[devId] = {
        developerName: t.developer ? t.developer.name : 'Unassigned',
        estimated: 0,
        logged: 0,
      };
    }
    devHoursMap[devId].estimated += parseFloat(t.estimatedHours || 0);
    devHoursMap[devId].logged += parseFloat(t.actualHours || 0);
  });

  const tasksByDevData = Object.values(devHoursMap).filter((d) => d.estimated > 0 || d.logged > 0);

  // 4. Chart Data: Tasks by Status
  const statusMap = {};
  tasks.forEach((t) => {
    statusMap[t.status] = (statusMap[t.status] || 0) + 1;
  });
  const tasksByStatusData = Object.entries(statusMap).map(([name, value]) => ({ name, count: value }));

  const isDark = theme.palette.mode === 'dark';
  const gridColor = isDark ? '#1f2937' : '#e2e8f0';
  const tooltipBg = isDark ? '#111827' : '#ffffff';
  const tooltipBorder = isDark ? '#1f2937' : '#e2e8f0';
  const textFill = isDark ? '#9ca3af' : '#475569';

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(`/projects/${projectId}/tasks`)}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {project?.name} - Project Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Project performance insights, workload balances, and module completions.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* KPI Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Avg. Completion Time', value: avgCompletionTime, icon: <TimerIcon sx={{ fontSize: 26 }} />, color: '#06B6D4' },
          { label: 'Total Estimated Effort', value: `${totalEstHours.toFixed(0)} Hours`, icon: <EstIcon sx={{ fontSize: 26 }} />, color: '#4F46E5' },
          { label: 'Total Logged Effort', value: `${totalLoggedHours.toFixed(0)} Hours`, icon: <LogIcon sx={{ fontSize: 26 }} />, color: '#F59E0B' },
          { label: 'Productivity Index', value: `${productivity}%`, icon: <ProdIcon sx={{ fontSize: 26 }} />, color: '#22C55E' },
        ].map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ borderLeft: `4px solid ${card.color}` }}>
              <CardContent sx={{ py: 2.5, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 550 }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: 'text.primary' }}>
                    {card.value}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${card.color}15`, color: card.color, width: 48, height: 48 }}>
                  {card.icon}
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={4}>
        {/* Developer Hours: Est vs Logged */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: 420, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
                Developer Hours Balance (Estimated vs Actual Logged)
              </Typography>
              <Box sx={{ flexGrow: 1, width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksByDevData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="developerName" stroke={textFill} tick={{ fontSize: 11 }} />
                    <YAxis stroke={textFill} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    <Bar dataKey="estimated" name="Estimated Hours" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="logged" name="Logged Hours" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tasks by Module */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: 420, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
                Module Distribution (Task Volume)
              </Typography>
              <Box sx={{ flexGrow: 1, width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksByModuleData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={textFill} tick={{ fontSize: 11 }} />
                    <YAxis stroke={textFill} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    <Bar dataKey="tasks" name="Tasks Count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tasks by Status Chart */}
        <Grid item xs={12}>
          <Card sx={{ height: 380, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Status Summary Curve
              </Typography>
              <Box sx={{ flexGrow: 1, width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tasksByStatusData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={textFill} tick={{ fontSize: 11 }} />
                    <YAxis stroke={textFill} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    <Area type="monotone" dataKey="count" name="Tasks" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
