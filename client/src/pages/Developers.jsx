import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Palette as PaletteIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import api from '../services/api';

const PRESET_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#ff9800', '#ff5722', '#795548', '#607d8b'
];

export default function Developers() {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog States
  const [openForm, setOpenForm] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState('#1976d2');
  const [customColor, setCustomColor] = useState('#1976d2');
  
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Snackbar Alert States
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const fetchDevelopers = async () => {
    try {
      setLoading(true);
      const data = await api.getDevelopers();
      setDevelopers(data);
    } catch (error) {
      console.error('Failed to load developers:', error);
      showAlert('Failed to load developers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleOpenAdd = () => {
    setSelectedDeveloper(null);
    setName('');
    setEmail('');
    setColor(PRESET_COLORS[0]);
    setOpenForm(true);
  };

  const handleOpenEdit = (dev) => {
    setSelectedDeveloper(dev);
    setName(dev.name);
    setEmail(dev.email || '');
    setColor(PRESET_COLORS.includes(dev.color) ? dev.color : 'custom');
    if (!PRESET_COLORS.includes(dev.color)) {
      setCustomColor(dev.color);
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setDeleteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert('Developer name is required', 'warning');
      return;
    }

    const devColor = color === 'custom' ? customColor : color;
    const payload = { name: name.trim(), email: email.trim() || null, color: devColor };

    try {
      if (selectedDeveloper) {
        // Edit Mode
        await api.updateDeveloper(selectedDeveloper.id, payload);
        showAlert('Developer updated successfully');
      } else {
        // Add Mode
        await api.createDeveloper(payload);
        showAlert('Developer added successfully');
      }
      fetchDevelopers();
      handleCloseForm();
    } catch (error) {
      console.error('Failed to save developer:', error);
      const msg = error.response?.data?.error || 'Failed to save developer';
      showAlert(msg, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.deleteDeveloper(deleteId);
      showAlert('Developer deleted successfully. Associated tasks have been unassigned.');
      fetchDevelopers();
      handleCloseDelete();
    } catch (error) {
      console.error('Failed to delete developer:', error);
      showAlert('Failed to delete developer', 'error');
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Developers Directory
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Manage team members and view individual task breakdowns.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
        >
          Add Developer
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : developers.length === 0 ? (
        <Paper
          sx={{
            p: 8,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: 'divider',
            backgroundColor: 'transparent',
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No developers added yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Add developers to assign them tasks from CSV imports.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Add First Developer
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {developers.map((dev) => (
            <Grid item xs={12} sm={6} md={4} key={dev.id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                  <Tooltip title="Edit Developer">
                    <IconButton size="small" onClick={() => handleOpenEdit(dev)} sx={{ mr: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Developer">
                    <IconButton size="small" color="error" onClick={() => handleOpenDelete(dev.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar
                      sx={{
                        bgcolor: dev.color,
                        width: 56,
                        height: 56,
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        boxShadow: `0 0 12px ${dev.color}80`,
                      }}
                    >
                      {getInitials(dev.name)}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden', pr: 6 }}>
                      <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                        {dev.name}
                      </Typography>
                      {dev.email ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                          <EmailIcon fontSize="inherit" />
                          <Typography variant="body2" noWrap sx={{ fontSize: '0.85rem' }}>
                            {dev.email}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                          No email provided
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Task Summary
                  </Typography>

                  <Grid container spacing={1}>
                    {[
                      { label: 'Total Tasks', value: dev.totalTasks || 0, color: 'text.secondary' },
                      { label: 'In Dev', value: dev.inDevelopmentTasks || 0, color: 'primary.main' },
                      { label: 'Testing', value: dev.testingTasks || 0, color: 'secondary.main' },
                      { label: 'Completed', value: dev.completedTasks || 0, color: 'success.main' },
                    ].map((stat, idx) => (
                      <Grid item xs={6} key={idx}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f293750' : '#f1f5f9',
                            border: '1px solid',
                            borderColor: 'divider',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                            {stat.label}
                          </Typography>
                          <Typography variant="h6" sx={{ color: stat.color, fontWeight: 700, mt: 0.5 }}>
                            {stat.value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Developer Add/Edit Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 600 }}>
            {selectedDeveloper ? 'Edit Developer' : 'Add Developer'}
          </DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            <TextField
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              margin="normal"
              placeholder="e.g. John Doe"
            />
            <TextField
              label="Email Address (Optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="e.g. john.doe@example.com"
            />

            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, fontWeight: 600 }}>
              Avatar Accent Color
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {PRESET_COLORS.map((preset) => (
                <Grid item key={preset}>
                  <Box
                    onClick={() => setColor(preset)}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: preset,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid',
                      borderColor: color === preset ? 'text.primary' : 'transparent',
                      transition: 'transform 0.1s ease',
                      '&:hover': { transform: 'scale(1.1)' },
                    }}
                  >
                    {color === preset && <CheckIcon sx={{ color: '#fff', fontSize: 18 }} />}
                  </Box>
                </Grid>
              ))}
              <Grid item>
                <Box
                  onClick={() => setColor('custom')}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid',
                    borderColor: color === 'custom' ? 'text.primary' : 'transparent',
                    transition: 'transform 0.1s ease',
                    '&:hover': { transform: 'scale(1.1)' },
                  }}
                >
                  {color === 'custom' && <PaletteIcon sx={{ color: '#fff', fontSize: 18 }} />}
                </Box>
              </Grid>
            </Grid>

            {color === 'custom' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <TextField
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  sx={{ width: 80, height: 48, p: 0, '& input': { p: 0.5, border: 'none', height: '100%' } }}
                />
                <Typography variant="body2" color="text.secondary">
                  Choose a custom color from the swatch
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseForm}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save Developer
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={handleCloseDelete}>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Developer?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to remove this developer from the directory?
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ mt: 1.5, fontWeight: 500 }}>
            Warning: Any active tasks assigned to this developer will become 'Unassigned'. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notification */}
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
