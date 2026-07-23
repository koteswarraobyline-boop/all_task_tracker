import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Pagination,
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
import Can from '../components/Can';
import EmptyState from '../components/EmptyState';
import PageContainer, { PageHeader } from '../components/PageContainer';

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Snackbar Alert States
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(9);

  const pageCount = Math.max(1, Math.ceil(developers.length / rowsPerPage));
  const pagedDevelopers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return developers.slice(start, start + rowsPerPage);
  }, [developers, page, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [developers.length, rowsPerPage]);

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

    setSaving(true);
    try {
      if (selectedDeveloper) {
        await api.updateDeveloper(selectedDeveloper.id, payload);
        showAlert('Developer updated successfully');
      } else {
        await api.createDeveloper(payload);
        showAlert('Developer added successfully');
      }
      fetchDevelopers();
      handleCloseForm();
    } catch (error) {
      console.error('Failed to save developer:', error);
      const msg = error.response?.data?.error || 'Failed to save developer';
      showAlert(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteDeveloper(deleteId);
      showAlert('Developer deleted successfully. Associated tasks have been unassigned.');
      fetchDevelopers();
      handleCloseDelete();
    } catch (error) {
      console.error('Failed to delete developer:', error);
      showAlert('Failed to delete developer', 'error');
    } finally {
      setDeleting(false);
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
    <PageContainer>
      <PageHeader
        title="Developers"
        subtitle="Manage team members assigned to project tasks."
        actions={
          <Can permission="developer.manage">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
            >
              Add Developer
            </Button>
          </Can>
        }
      />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : developers.length === 0 ? (
        <EmptyState
          title="No developers yet"
          description="Add developers so you can assign them to tasks after CSV import."
          actionText="Add developer"
          onActionClick={handleOpenAdd}
          actionPermission="developer.manage"
          actionIcon={<AddIcon />}
        />
      ) : (
        <>
        <Grid container spacing={2.5}>
          {pagedDevelopers.map((dev) => (
            <Grid
              key={dev.id}
              size={{
                xs: 12,
                sm: 6,
                md: 4,
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { boxShadow: 2 },
                }}
              >
                <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 }, flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1.25,
                      mb: 2,
                      minWidth: 0,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                      <Avatar
                        sx={{
                          bgcolor: dev.color,
                          width: 44,
                          height: 44,
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(dev.name)}
                      </Avatar>
                      <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
                          {dev.name}
                        </Typography>
                        {dev.email ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35, color: 'text.secondary' }}>
                            <EmailIcon sx={{ fontSize: 14 }} />
                            <Typography noWrap sx={{ fontSize: '0.8rem' }}>
                              {dev.email}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ color: 'text.disabled', fontSize: '0.8rem', fontStyle: 'italic', mt: 0.25 }}>
                            No email provided
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Can permission="developer.manage">
                      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEdit(dev)} aria-label={`Edit ${dev.name}`}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleOpenDelete(dev.id)} aria-label={`Delete ${dev.name}`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Can>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 1,
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.hover' : '#F8FAFC'),
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {[
                      { label: 'Total', value: dev.totalTasks || 0, color: 'text.primary' },
                      { label: 'In Dev', value: dev.inDevelopmentTasks || 0, color: 'primary.main' },
                      { label: 'Testing', value: dev.testingTasks || 0, color: 'secondary.main' },
                      { label: 'Done', value: dev.completedTasks || 0, color: 'success.main' },
                    ].map((stat) => (
                      <Box key={stat.label} sx={{ textAlign: 'center', minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: '1.1rem',
                            fontWeight: 750,
                            color: stat.color,
                            lineHeight: 1.2,
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 650,
                            color: 'text.secondary',
                            mt: 0.25,
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {developers.length > rowsPerPage && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mt: 3
            }}>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              Showing {(page - 1) * rowsPerPage + 1}–
              {Math.min(page * rowsPerPage, developers.length)} of {developers.length} developers
            </Typography>
            <Stack
              direction="row"
              useFlexGap
              sx={{
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap"
              }}>
              <TextField
                select
                size="small"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                sx={{ minWidth: 110, '& .MuiOutlinedInput-root': { height: 36 } }}
                slotProps={{
                  select: { native: true }
                }}
              >
                {[6, 9, 12, 18].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </TextField>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_e, v) => setPage(v)}
                color="primary"
                shape="rounded"
                size="small"
              />
            </Stack>
          </Stack>
        )}
        </>
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
                <Grid key={preset}>
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
              <Grid>
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
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  Choose a custom color from the swatch
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseForm} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Developer'}
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
          <Typography
            variant="body2"
            sx={{
              color: "error.main",
              mt: 1.5,
              fontWeight: 500
            }}>
            Warning: Any active tasks assigned to this developer will become 'Unassigned'. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDelete} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar notification */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
    </PageContainer>
  );
}
