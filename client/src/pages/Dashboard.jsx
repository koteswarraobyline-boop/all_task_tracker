import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Stack,
  Avatar,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ListAlt as ListIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckIcon,
  PlayCircle as DevIcon,
  Timer as TestingIcon,
  Block as BlockIcon,
  HourglassEmpty as UpcomingIcon,
  TrendingUp as TrendUpIcon,
  Assignment as TotalIcon,
} from '@mui/icons-material';
import api from '../services/api';
import ActivityTimeline from '../components/ActivityTimeline';
import DeveloperPerformance from '../components/DeveloperPerformance';
import { SkeletonCard, SkeletonChart } from '../components/SkeletonCard';

// Status colors matching SaaS requirements
const STATUS_COLORS = {
  'Upcoming': '#64748B',       // Slate 500
  'Assigned': '#3B82F6',       // Blue 500
  'In Development': '#4F46E5', // Indigo 600
  'Code Review': '#6366F1',    // Indigo 500
  'Testing': '#06B6D4',       // Cyan 500
  'Completed': '#22C55E',     // Green 500
  'Blocked': '#EF4444',       // Red 500
  'On Hold': '#F59E0B',       // Amber 500
};

// Framer motion variants
const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 }
  }
};

const cardVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function Dashboard() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [project, setProject] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [estVsSpentModuleData, setEstVsSpentModuleData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllDashboardMetrics = async () => {
      try {
        setLoading(true);
        // Start api calls
        const projects = await api.getProjects();
        const found = projects.find(p => p.id === parseInt(projectId));
        setProject(found || { name: `Project #${projectId}` });

        const devs = await api.getDevelopers();
        setDevelopers(devs);

        const metrics = await api.getProjectDashboard(projectId);
        setDashboardData(metrics);

        const tasksResponse = await api.getProjectTasks(projectId, { limit: -1 });
        setTasks(tasksResponse.tasks);

        // Compile Estimated vs Spent Hours by Module
        const modHoursMap = {};
        tasksResponse.tasks.forEach((t) => {
          const mod = t.module || 'General';
          if (!modHoursMap[mod]) {
            modHoursMap[mod] = { moduleName: mod, estimated: 0, spent: 0 };
          }
          modHoursMap[mod].estimated += parseFloat(t.estimatedHours || 0);
          modHoursMap[mod].spent += parseFloat(t.actualHours || 0);
        });
        const compiledModuleHours = Object.values(modHoursMap).filter(
          m => m.estimated > 0 || m.spent > 0
        );
        setEstVsSpentModuleData(compiledModuleHours);

        // Simulated high-fidelity delay to showcase clean skeleton screens
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAllDashboardMetrics();
  }, [projectId]);

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        {/* Header Skeleton */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Stack direction="row" gap={2}>
            <SkeletonCard style={{ width: 40, height: 40 }} />
            <Box>
              <Box sx={{ width: 250, height: 32, bgcolor: 'divider', borderRadius: 1 }} />
              <Box sx={{ width: 400, height: 16, bgcolor: 'divider', borderRadius: 1, mt: 1 }} />
            </Box>
          </Stack>
        </Stack>
        {/* KPI Cards Skeletons */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={2} key={i}>
              <SkeletonCard />
            </Grid>
          ))}
        </Grid>
        {/* Chart Skeletons */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <SkeletonChart />
          </Grid>
          <Grid item xs={12} md={7}>
            <SkeletonChart />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">Failed to compile dashboard data</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/projects')} sx={{ mt: 2 }}>Back to Projects</Button>
      </Box>
    );
  }

  const { summary, statusDistribution, developerWorkload, taskProgressTimeline } = dashboardData;
  const isDark = theme.palette.mode === 'dark';
  
  // Style configurations
  const gridColor = isDark ? '#1f2937' : '#e2e8f0';
  const tooltipBg = isDark ? '#111827' : '#ffffff';
  const tooltipBorder = isDark ? '#1f2937' : '#e2e8f0';
  const textFill = isDark ? '#9ca3af' : '#475569';

  // KPI metadata
  const total = summary.total || 0;
  const kpis = [
    { label: 'Total Tasks', value: total, icon: <TotalIcon />, color: '#4F46E5', desc: 'tasks in scope' },
    { label: 'Completed', value: summary.completed, icon: <CheckIcon />, color: '#22C55E', desc: total > 0 ? `${Math.round((summary.completed/total)*100)}% of total` : '0% of total' },
    { label: 'In Progress', value: summary.inDevelopment, icon: <DevIcon />, color: '#3B82F6', desc: total > 0 ? `${Math.round((summary.inDevelopment/total)*100)}% of total` : '0% of total' },
    { label: 'Testing', value: summary.testing, icon: <TestingIcon />, color: '#06B6D4', desc: total > 0 ? `${Math.round((summary.testing/total)*100)}% of total` : '0% of total' },
    { label: 'Blocked', value: summary.blocked, icon: <BlockIcon />, color: '#EF4444', desc: total > 0 ? `${Math.round((summary.blocked/total)*100)}% of total` : '0% of total' },
    { label: 'Upcoming', value: summary.upcoming, icon: <UpcomingIcon />, color: '#64748B', desc: total > 0 ? `${Math.round((summary.upcoming/total)*100)}% of total` : '0% of total' },
  ];

  return (
    <Box sx={{ p: 4 }}>
      {/* AppBar Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(`/projects/${projectId}/tasks`)}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
              {project?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Overviewing statistics, timelines, workloads, and developer efficiency.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ListIcon />}
          onClick={() => navigate(`/projects/${projectId}/tasks`)}
        >
          Task Board
        </Button>
      </Box>

      {/* KPI Cards animated with framer motion */}
      <motion.div variants={containerVariants} initial="initial" animate="animate">
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={2} key={idx}>
              <motion.div variants={cardVariants}>
                <Card sx={{ borderLeft: `4px solid ${kpi.color}`, cursor: 'default' }}>
                  <CardContent sx={{ py: 2.2, px: 2.5, '&:last-child': { pb: 2.2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {kpi.label}
                      </Typography>
                      <Box sx={{ color: kpi.color, mt: -0.2 }}>
                        {kpi.icon}
                      </Box>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {kpi.value}
                    </Typography>
                    <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.8 }}>
                      <TrendUpIcon sx={{ fontSize: 13, color: kpi.color }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {kpi.desc}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Row 1: Status Doughnut & Workload Bar Chart */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid item xs={12} md={5}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: 420, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Project Status Doughnut
                  </Typography>
                  {statusDistribution.length === 0 ? (
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">No status values logged</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ flexGrow: 1, width: '100%', height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={105}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#9e9e9e'} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10 }} />
                          <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={7}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: 420, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Developer Workload
                  </Typography>
                  {developerWorkload.length === 0 ? (
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">No workload allocated</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ flexGrow: 1, width: '100%', height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={developerWorkload} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="developerName" stroke={textFill} tick={{ fontSize: 11 }} />
                          <YAxis stroke={textFill} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10 }} />
                          <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                          <Bar dataKey="upcoming" name="Upcoming" stackId="a" fill="#64748B" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="inProgress" name="Active" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="completed" name="Completed" stackId="a" fill="#22C55E" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Row 2: Burnup Chart & Estimated vs Spent Time Comparison */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid item xs={12} md={7}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: 420, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Project Burnup (Scope Progress)
                  </Typography>
                  <Box sx={{ flexGrow: 1, width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={taskProgressTimeline} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="date"
                          stroke={textFill}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => {
                            const parsed = new Date(d);
                            return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis stroke={textFill} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10 }} />
                        <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                        <Line type="monotone" dataKey="totalTasks" name="Total Scope" stroke="#4F46E5" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="completedTasks" name="Completed Tasks" stroke="#22C55E" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={5}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: 420, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Effort Hours Comparison (by Module)
                  </Typography>
                  {estVsSpentModuleData.length === 0 ? (
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">No effort hours logged</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ flexGrow: 1, width: '100%', height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={estVsSpentModuleData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="moduleName" stroke={textFill} tick={{ fontSize: 10 }} />
                          <YAxis stroke={textFill} />
                          <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10 }} />
                          <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                          <Bar dataKey="estimated" name="Est. Hours" fill="#4F46E5" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="spent" name="Spent Hours" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Row 3: Recent Activity & Developer Performance */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
                    <TimelineIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Recent Activity Timeline
                    </Typography>
                  </Stack>
                  <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                    <ActivityTimeline tasks={tasks} />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={7}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
                    <CheckIcon color="secondary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Developer Performance Matrix
                    </Typography>
                  </Stack>
                  <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <DeveloperPerformance tasks={tasks} developers={developers} />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
}
