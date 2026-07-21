import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Stack,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Dashboard as DashboardIcon,
  ListAlt as ListIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import api from '../services/api';
import EmptyState from '../components/EmptyState';

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 }
  }
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.95, y: 15 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteProj, setDeleteProj] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      showAlert('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleOpenDelete = (proj, e) => {
    e.stopPropagation();
    setDeleteProj(proj);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setDeleteProj(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.deleteProject(deleteProj.id);
      showAlert('Project deleted successfully');
      fetchProjects();
      handleCloseDelete();
    } catch (error) {
      console.error('Failed to delete project:', error);
      showAlert('Failed to delete project', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
            Projects Directory
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Open a board to map columns, log developers, and track sprint metrics.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<UploadIcon />}
          onClick={() => navigate('/projects/upload')}
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: 3,
            fontWeight: 700,
            boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.3)',
          }}
        >
          Upload New Project
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Projects Uploaded"
          description="Import your task backlog from a CSV spreadsheet. You will be able to configure column headers, preview mappings, and auto-provision developer resource logs."
          actionText="Upload Project CSV"
          onActionClick={() => navigate('/projects/upload')}
        />
      ) : (
        <Grid
          container
          spacing={3}
          component={motion.div}
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {projects.map((proj) => (
            <Grid item xs={12} md={6} lg={4} key={proj.id} component={motion.div} variants={cardVariants}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {proj.name}
                    </Typography>
                    <Tooltip title="Delete Project">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => handleOpenDelete(proj, e)}
                        sx={{ mt: -0.5, mr: -0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {proj.clientName ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary', mb: 3 }}>
                      <BusinessIcon fontSize="inherit" sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ fontWeight: 550 }}>{proj.clientName}</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary', mb: 3, fontStyle: 'italic' }}>
                      <BusinessIcon fontSize="inherit" />
                      <Typography variant="body2">Internal Scope</Typography>
                    </Box>
                  )}

                  {/* Tasks count stats */}
                  <Grid container spacing={1} sx={{ mb: 3.5 }}>
                    {[
                      { label: 'Total', value: proj.totalTasks, color: isDark ? '#fff' : '#0f172a' },
                      { label: 'Completed', value: proj.completed, color: 'success.main' },
                      { label: 'In Dev', value: proj.inDevelopment, color: 'primary.main' },
                      { label: 'Pending', value: proj.pending, color: 'warning.main' },
                      { label: 'Blocked', value: proj.blocked, color: 'error.main' },
                      { label: 'Upcoming', value: proj.upcoming, color: 'text.secondary' }
                    ].map((stat, idx) => (
                      <Grid item xs={4} key={idx}>
                        <Box
                          sx={{
                            p: 1.2,
                            borderRadius: 3,
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                            border: '1px solid',
                            borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', fontWeight: 650, textTransform: 'uppercase' }}>
                            {stat.label}
                          </Typography>
                          <Typography variant="h6" sx={{ color: stat.color, fontWeight: 800, mt: 0.2, fontSize: '1.05rem' }}>
                            {stat.value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary' }}>
                    <TimeIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      Last Sync: {formatDate(proj.lastUpdated)}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 3, pb: 3, pt: 0, gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ListIcon />}
                    fullWidth
                    onClick={() => navigate(`/projects/${proj.id}/tasks`)}
                    sx={{ py: 1.2 }}
                  >
                    Open Board
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<DashboardIcon />}
                    fullWidth
                    onClick={() => navigate(`/projects/${proj.id}/dashboard`)}
                    sx={{ py: 1.2 }}
                  >
                    Metrics
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Project Dialog */}
      <Dialog open={openDelete} onClose={handleCloseDelete}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Project?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the project <strong>"{deleteProj?.name}"</strong>?
          </DialogContentText>
          <DialogContentText sx={{ color: 'error.main', mt: 2, fontWeight: 600 }}>
            Warning: This action will permanently drop all associated tasks. It cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert alerts */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
