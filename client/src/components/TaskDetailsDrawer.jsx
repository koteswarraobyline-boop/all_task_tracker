import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Divider,
  Paper,
  CircularProgress,
  Avatar,
  Stack,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  HourglassEmpty as PendingIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import api from '../services/api';

const STATUS_STEPS = [
  'Upcoming',
  'Assigned',
  'In Development',
  'Code Review',
  'Testing',
  'Completed'
];

const ALL_STATUSES = [
  'Upcoming', 'Assigned', 'In Development', 'Code Review',
  'Testing', 'Completed', 'Blocked', 'On Hold'
];

export default function TaskDetailsDrawer({ open, onClose, task, developers, onTaskUpdated }) {
  const [status, setStatus] = useState('');
  const [developerId, setDeveloperId] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // New screenshot fields
  const [phase, setPhase] = useState('');
  const [week, setWeek] = useState('');
  const [estDays, setEstDays] = useState('');
  const [dependencies, setDependencies] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  
  const prevTaskIdRef = useRef(null);

  useEffect(() => {
    if (task) {
      setStatus(task.status || '');
      setDeveloperId(task.developerId || '');
      setActualHours(task.actualHours !== null && task.actualHours !== undefined ? task.actualHours : '');
      setRemarks(task.remarks || '');
      
      // Sync new states
      setPhase(task.phase || '');
      setWeek(task.week || '');
      setEstDays(task.estDays !== null && task.estDays !== undefined ? task.estDays : '');
      setDependencies(task.dependencies || '');

      setSaveStatus('saved');
      prevTaskIdRef.current = task.id;
    }
  }, [task]);

  if (!task) return null;

  const handleSaveField = async (fieldName, val) => {
    if (task.id !== prevTaskIdRef.current) return;
    
    const dbVal = task[fieldName];
    const normalizedDbVal = dbVal === null || dbVal === undefined ? '' : dbVal;
    const normalizedVal = val === null || val === undefined ? '' : val;
    if (String(normalizedDbVal) === String(normalizedVal)) return;

    setSaving(true);
    setSaveStatus('saving');
    
    try {
      const payload = {
        status,
        developerId: developerId ? parseInt(developerId) : null,
        actualHours: actualHours === '' ? null : parseFloat(actualHours),
        remarks,
        phase,
        week,
        estDays: estDays === '' ? null : parseFloat(estDays),
        dependencies,
        [fieldName]: val
      };

      const updated = await api.updateTask(task.id, payload);
      setSaveStatus('saved');
      onTaskUpdated(updated);
    } catch (error) {
      console.error('Failed to save field:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (prio) => {
    switch (prio?.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (stat) => {
    switch (stat) {
      case 'Completed': return 'success';
      case 'In Development': return 'primary';
      case 'Testing': return 'secondary';
      case 'Code Review': return 'info';
      case 'Blocked': return 'error';
      case 'On Hold': return 'warning';
      default: return 'default';
    }
  };

  const getDevInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  // Determine current active index in linear workflow timeline
  const currentStepIndex = STATUS_STEPS.indexOf(status);

  // Calculate work progress percentage for indicator
  const est = parseFloat(task.estimatedHours || 0);
  const act = parseFloat(actualHours || 0);
  let progressPct = 0;
  if (est > 0) {
    progressPct = Math.min(Math.round((act / est) * 100), 100);
  } else if (status === 'Completed') {
    progressPct = 100;
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 500 }, p: 0 }
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            {task.taskId}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
            Task Controls
          </Typography>
        </Box>
        
        <Stack direction="row" alignItems="center" gap={1.5}>
          {saveStatus === 'saving' && (
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
              <CircularProgress size={12} color="inherit" />
              <Typography variant="caption">Saving...</Typography>
            </Stack>
          )}
          {saveStatus === 'saved' && (
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: 'success.main', fontSize: '0.78rem' }}>
              <SuccessIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 650 }}>Saved</Typography>
            </Stack>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Body Content */}
      <Box sx={{ p: 3.5, overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        
        {/* Title & Description */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 750, mb: 1.5, color: 'text.primary', lineHeight: 1.35 }}>
            {task.taskName}
          </Typography>
          {task.description ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f293730' : '#f8fafc', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {task.description}
              </Typography>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No description text available.
            </Typography>
          )}
        </Box>

        {/* Read-Only Parameters Grid */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Module</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 650 }}>
              {task.module ? <Chip label={task.module} size="small" sx={{ height: 22, fontSize: '0.75rem' }} /> : 'General'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Feature</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 650 }}>
              {task.feature ? <Chip label={task.feature} size="small" sx={{ height: 22, fontSize: '0.75rem' }} /> : 'Base'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Priority</Typography>
            <Box sx={{ mt: 0.5 }}>
              {task.priority ? (
                <Chip label={task.priority} color={getPriorityColor(task.priority)} size="small" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
              ) : (
                <Typography variant="body2" color="text.secondary">Not specified</Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Due Date</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
            </Typography>
          </Grid>
        </Grid>

        <Divider />

        {/* Status Workflow Timeline Stepper */}
        {currentStepIndex !== -1 && (
          <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <TimelineIcon color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Workflow Progress
              </Typography>
            </Stack>
            
            <Stepper activeStep={currentStepIndex} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.68rem', fontWeight: 600 } }}>
              {STATUS_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        <Divider />

        {/* Hours Progress Tracker */}
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
              Hours Budget (Logged: {act}h / Est: {est}h)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {progressPct}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            color={act > est && est > 0 ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Divider />

        {/* Editable Fields */}
        <Stack spacing={3}>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => {
              const val = e.target.value;
              setStatus(val);
              handleSaveField('status', val);
            }}
            fullWidth
          >
            {ALL_STATUSES.map((opt) => (
              <MenuItem key={opt} value={opt}>
                <Chip label={opt} color={getStatusColor(opt)} size="small" sx={{ fontWeight: 600, height: 24, fontSize: '0.75rem' }} />
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Assigned Developer"
            value={developerId}
            onChange={(e) => {
              const val = e.target.value;
              setDeveloperId(val);
              handleSaveField('developerId', val ? parseInt(val) : null);
            }}
            fullWidth
          >
            <MenuItem value="">
              <Stack direction="row" alignItems="center" gap={1}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'grey.300' }}>?</Avatar>
                <Typography variant="body2"><em>Unassigned</em></Typography>
              </Stack>
            </MenuItem>
            {developers.map((dev) => (
              <MenuItem key={dev.id} value={dev.id}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.72rem', bgcolor: dev.color, fontWeight: 700 }}>
                    {getDevInitials(dev.name)}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 550 }}>{dev.name}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Spent Hours"
            type="number"
            value={actualHours}
            onChange={(e) => setActualHours(e.target.value)}
            onBlur={() => {
              const val = actualHours === '' ? null : parseFloat(actualHours);
              handleSaveField('actualHours', val);
            }}
            fullWidth
            inputProps={{ step: '0.5', min: '0' }}
            placeholder="e.g. 8.5"
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Phase"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                onBlur={() => handleSaveField('phase', phase.trim())}
                fullWidth
                placeholder="e.g. Phase 1"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Week"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                onBlur={() => handleSaveField('week', week.trim())}
                fullWidth
                placeholder="e.g. W1"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Est. Days"
                type="number"
                value={estDays}
                onChange={(e) => setEstDays(e.target.value)}
                onBlur={() => {
                  const val = estDays === '' ? null : parseFloat(estDays);
                  handleSaveField('estDays', val);
                }}
                fullWidth
                inputProps={{ step: '0.5', min: '0' }}
                placeholder="e.g. 5"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Dependencies"
                value={dependencies}
                onChange={(e) => setDependencies(e.target.value)}
                onBlur={() => handleSaveField('dependencies', dependencies.trim())}
                fullWidth
                placeholder="e.g. T-1002"
              />
            </Grid>
          </Grid>

          <TextField
            label="Notes & Remarks"
            multiline
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            onBlur={() => handleSaveField('remarks', remarks.trim())}
            fullWidth
            placeholder="Log details, next steps, or blocks here..."
          />
        </Stack>
      </Box>
    </Drawer>
  );
}
