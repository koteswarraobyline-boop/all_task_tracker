import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  Avatar,
  Stack,
  LinearProgress,
  Button,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../context/RoleContext';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { getTaskProgressPercent, progressBarColor } from '../utils/taskProgress';

const ALL_STATUSES = [
  'Upcoming', 'Assigned', 'In Development',
  'Testing', 'Completed', 'Blocked', 'On Hold',
];

const PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'High', 'Medium', 'Low'];

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
};

/** Split "Title – long description…" when description was stored in the name. */
export function splitTitleAndDescription(taskName = '', description = '') {
  const name = String(taskName || '').trim();
  const desc = String(description || '').trim();
  if (desc || !name) {
    return { title: name, description: desc };
  }

  const separators = [' – ', ' — ', ' - '];
  for (const sep of separators) {
    const idx = name.indexOf(sep);
    if (idx > 0) {
      const title = name.slice(0, idx).trim();
      const rest = name.slice(idx + sep.length).trim();
      // Only split when the second part looks like a real description
      if (title.length >= 3 && rest.length >= 20) {
        return { title, description: rest };
      }
    }
  }

  return { title: name, description: '' };
}

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function buildFormFromTask(task) {
  const { title, description } = splitTitleAndDescription(task.taskName, task.description);
  return {
    taskName: title || task.taskName || '',
    description: description || '',
    status: task.status || '',
    developerId: task.developerId || '',
    priority: task.priority || '',
    module: task.module || '',
    feature: task.feature || '',
    phase: task.phase || '',
    startDate: toDateInput(task.startDate),
    dueDate: toDateInput(task.dueDate),
    estimatedHours:
      task.estimatedHours !== null && task.estimatedHours !== undefined ? String(task.estimatedHours) : '',
    actualHours:
      task.actualHours !== null && task.actualHours !== undefined ? String(task.actualHours) : '',
    estDays: task.estDays !== null && task.estDays !== undefined ? String(task.estDays) : '',
    dependencies: task.dependencies || '',
    remarks: task.remarks || '',
  };
}

function DetailRow({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'flex-start' },
        gap: { xs: 0.5, sm: 2 },
        py: 1.1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          flexShrink: 0,
          pt: { sm: 0.15 }
        }}>
        {label}
      </Typography>
      <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>{children}</Box>
    </Box>
  );
}

export default function TaskDetailsDrawer({ open, onClose, task, developers, onTaskUpdated, startInEditMode = false }) {
  const { role } = useRole();
  const isClient = role === 'client';
  const canEditPerm = usePermission('task.edit');
  const canStatusPerm = usePermission('task.status');
  const canAssignPerm = usePermission('task.assign');
  const canEdit = !isClient && canEditPerm;
  const canStatus = !isClient && canStatusPerm;
  const canAssign = !isClient && canAssignPerm;
  const canModify = !isClient && (canEdit || canStatus || canAssign);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset form when a *different* task is opened or drawer opens fresh.
  // We intentionally exclude the full `task` object to avoid overwriting
  // in-progress edits when the parent calls onTaskUpdated with the saved data.
  useEffect(() => {
    if (task) {
      setForm(buildFormFromTask(task));
      setEditing(Boolean(startInEditMode && canModify));
      setError('');
      setSuccessMsg('');
    } else {
      setForm(null);
      setEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, open, startInEditMode, canModify]);

  const display = useMemo(() => {
    // Use form state (which is updated immediately after save) so the
    // view-mode reflects the saved values before the parent re-renders.
    if (!form) return { title: '', description: '' };
    return { title: form.taskName || '', description: form.description || '' };
  }, [form]);

  if (!task || !form) return null;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccessMsg('');
    setError('');
  };

  const handleCancelEdit = () => {
    setForm(buildFormFromTask(task));
    setEditing(false);
    setError('');
    setSuccessMsg('');
  };

  const handleSaveChanges = async () => {
    if (!canModify) return;
    if (!form.taskName.trim()) {
      setError('Task name is required');
      return;
    }
    if (
      (form.status === 'Blocked' || form.status === 'On Hold') &&
      !form.remarks.trim()
    ) {
      setError(
        form.status === 'On Hold'
          ? 'Add a hold reason in Notes — it appears on the overview timeline.'
          : 'Add a block reason in Notes — it appears on the overview timeline.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        taskName: form.taskName.trim(),
        description: form.description.trim() || null,
        status: form.status || null,
        developerId: form.developerId ? parseInt(form.developerId, 10) : null,
        priority: form.priority || null,
        module: form.module.trim() || null,
        feature: form.feature.trim() || null,
        phase: form.phase.trim() || null,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        estimatedHours: form.estimatedHours === '' ? null : parseFloat(form.estimatedHours),
        actualHours: form.actualHours === '' ? null : parseFloat(form.actualHours),
        estDays: form.estDays === '' ? null : parseFloat(form.estDays),
        dependencies: form.dependencies.trim() || null,
        remarks: form.remarks.trim() || null,
      };

      const updated = await api.updateTask(task.id, payload);
      // Update form with the fresh server response BEFORE calling onTaskUpdated
      // so the view-mode shows correct saved values immediately
      const freshForm = buildFormFromTask(updated);
      setForm(freshForm);
      setEditing(false);
      setSuccessMsg('Changes saved');
      // Notify parent last — this changes the task prop but our effect
      // only watches task?.id so it won't overwrite the fresh form
      onTaskUpdated(updated);
    } catch (err) {
      console.error('Failed to save task:', err);
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (prio) => {
    const p = String(prio || '').toLowerCase();
    if (p === 'p0' || p === 'high') return 'error';
    if (p === 'p1' || p === 'medium') return 'warning';
    if (p === 'p2' || p === 'low') return 'info';
    return 'default';
  };

  const getStatusColor = (stat) => {
    switch (stat) {
      case 'Completed': return 'success';
      case 'In Development': return 'primary';
      case 'Testing': return 'secondary';
      case 'Blocked': return 'error';
      case 'On Hold': return 'warning';
      default: return 'default';
    }
  };

  const getDevInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const est = parseFloat(form.estimatedHours || task.estimatedHours || 0) || 0;
  const act = parseFloat(form.actualHours || 0) || 0;
  // Bar follows status; while editing, ignore stored Progress % so the bar updates with the dropdown
  const progressPct = getTaskProgressPercent({
    status: form.status,
    progressPercent: editing ? null : task.progressPercent,
  });

  const assignedDev = developers.find(
    (d) => d.id === form.developerId || d.id === parseInt(form.developerId, 10)
  );
  const developerLabel = getDeveloperDisplayName(assignedDev);

  const grid2 = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    gap: 2,
  };

  const viewTitle = editing ? form.taskName : display.title;
  const viewDescription = editing ? form.description : display.description;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => {
        if (editing) handleCancelEdit();
        onClose();
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 440, md: 480 },
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRadius: 0,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              mb: 0.75
            }}>
            <Chip
              label={task.taskId || 'Task'}
              size="small"
              sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', borderRadius: 2 }}
            />
            <Chip
              label={form.status || 'Upcoming'}
              color={getStatusColor(form.status)}
              size="small"
              sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', borderRadius: 2 }}
            />
          </Stack>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {editing ? 'Edit task' : (viewTitle || 'Task')}
          </Typography>
        </Box>

        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 0.75,
            flexShrink: 0
          }}>
          {canModify && !editing && (
            <Button
              variant="contained"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setEditing(true)}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
            >
              Edit
            </Button>
          )}
          <IconButton
            onClick={() => {
              if (editing) handleCancelEdit();
              onClose();
            }}
            size="small"
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2.5,
          overflowY: 'auto',
          flexGrow: 1,
        }}
      >
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        {successMsg && !editing && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{successMsg}</Alert>
        )}

        {editing ? (
          <Stack spacing={2.5}>
            <TextField
              label="Title"
              value={form.taskName}
              onChange={(e) => setField('taskName', e.target.value)}
              fullWidth
              required
              disabled={!canEdit}
              sx={fieldSx}
            />
            {canEdit && (
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                fullWidth
                multiline
                minRows={4}
                placeholder="What needs to be done…"
                sx={fieldSx}
              />
            )}

            <Box sx={grid2}>
              {canStatus ? (
                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  fullWidth
                  sx={fieldSx}
                >
                  {ALL_STATUSES.map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </TextField>
              ) : null}

              {canAssign ? (
                <TextField
                  select
                  label="Developer"
                  value={form.developerId}
                  onChange={(e) => setField('developerId', e.target.value)}
                  fullWidth
                  sx={fieldSx}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {developers.map((dev) => {
                    const label = getDeveloperDisplayName(dev);
                    return (
                      <MenuItem key={dev.id} value={dev.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', columnGap: 1, minWidth: 0 }}>
                          <Avatar
                            sx={{
                              width: 22,
                              height: 22,
                              flex: '0 0 22px',
                              fontSize: '0.65rem',
                              bgcolor: dev.color,
                            }}
                          >
                            {getDevInitials(label)}
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                            {label}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </TextField>
              ) : null}
            </Box>

            {canEdit && (
              <>
                <Typography
                  variant="overline"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 800,
                    letterSpacing: 0.8
                  }}>
                  Details
                </Typography>
                <Box sx={grid2}>
                  <TextField
                    select
                    label="Priority"
                    value={form.priority}
                    onChange={(e) => setField('priority', e.target.value)}
                    fullWidth
                    sx={fieldSx}
                  >
                    <MenuItem value="">None</MenuItem>
                    {PRIORITIES.map((p) => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Module"
                    value={form.module}
                    onChange={(e) => setField('module', e.target.value)}
                    fullWidth
                    sx={fieldSx}
                  />
                  <TextField
                    label="Feature"
                    value={form.feature}
                    onChange={(e) => setField('feature', e.target.value)}
                    fullWidth
                    sx={fieldSx}
                  />
                  <TextField
                    label="Phase"
                    value={form.phase}
                    onChange={(e) => setField('phase', e.target.value)}
                    fullWidth
                    sx={fieldSx}
                  />
                  <TextField
                    label="Est. days"
                    type="number"
                    value={form.estDays}
                    onChange={(e) => setField('estDays', e.target.value)}
                    fullWidth
                    sx={fieldSx}
                    slotProps={{
                      htmlInput: { min: 0, step: 0.5 }
                    }}
                  />
                  <TextField
                    label="Start date"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setField('startDate', e.target.value)}
                    fullWidth
                    slotProps={{ inputLabel: {
                      ...{ shrink: true },
                      ...{ shrink: true }
                    }, htmlInput: { placeholder: '' } }}
                    sx={fieldSx} />
                  <TextField
                    label="Due date"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setField('dueDate', e.target.value)}
                    fullWidth
                    slotProps={{ inputLabel: {
                      ...{ shrink: true },
                      ...{ shrink: true }
                    }, htmlInput: { placeholder: '' } }}
                    sx={fieldSx} />
                  <TextField
                    label="Estimated hours"
                    type="number"
                    value={form.estimatedHours}
                    onChange={(e) => setField('estimatedHours', e.target.value)}
                    fullWidth
                    sx={fieldSx}
                    slotProps={{
                      htmlInput: { min: 0, step: 0.5 }
                    }}
                  />
                  <TextField
                    label="Spent hours"
                    type="number"
                    value={form.actualHours}
                    onChange={(e) => setField('actualHours', e.target.value)}
                    fullWidth
                    sx={fieldSx}
                    slotProps={{
                      htmlInput: { min: 0, step: 0.5 }
                    }}
                  />
                </Box>
                <TextField
                  label="Dependencies"
                  value={form.dependencies}
                  onChange={(e) => setField('dependencies', e.target.value)}
                  fullWidth
                  placeholder="e.g. T-1002"
                  sx={fieldSx}
                />
                <TextField
                  label={
                    form.status === 'Blocked'
                      ? 'Block reason (Notes)'
                      : form.status === 'On Hold'
                        ? 'Hold reason (Notes)'
                        : 'Notes'
                  }
                  value={form.remarks}
                  onChange={(e) => setField('remarks', e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  required={form.status === 'Blocked' || form.status === 'On Hold'}
                  helperText={
                    form.status === 'Blocked' || form.status === 'On Hold'
                      ? 'Shown on the overview timeline only'
                      : undefined
                  }
                  placeholder={
                    form.status === 'Blocked'
                      ? 'Why is this task blocked?'
                      : form.status === 'On Hold'
                        ? 'Why is this task on hold?'
                        : undefined
                  }
                  sx={fieldSx}
                />
              </>
            )}
          </Stack>
        ) : (
          <Stack spacing={0}>
            {/* Title */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 750,
                lineHeight: 1.4,
                mb: viewDescription ? 2 : 2.5,
                letterSpacing: '-0.01em',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
              }}
            >
              {viewTitle || 'Untitled task'}
            </Typography>

            {/* Description */}
            {viewDescription ? (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    display: 'block',
                    mb: 0.75,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6
                  }}>
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'text.primary' }}>
                  {viewDescription}
                </Typography>
              </Box>
            ) : null}

            {/* Compact details — only filled values */}
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                px: 2,
                mb: 3,
              }}
            >
              <DetailRow label="Developer">
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    gap: 1,
                    justifyContent: "flex-end"
                  }}>
                  {assignedDev && (
                    <Avatar
                      sx={{
                        width: 22,
                        height: 22,
                        fontSize: '0.65rem',
                        bgcolor: assignedDev.color,
                      }}
                    >
                      {getDevInitials(developerLabel)}
                    </Avatar>
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {developerLabel}
                  </Typography>
                </Stack>
              </DetailRow>

              {form.priority ? (
                <DetailRow label="Priority">
                  <Chip
                    label={form.priority}
                    color={getPriorityColor(form.priority)}
                    size="small"
                    sx={{ height: 22, fontWeight: 700, borderRadius: 2 }}
                  />
                </DetailRow>
              ) : null}

              {form.phase ? (
                <DetailRow label="Phase">
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>{form.phase}</Typography>
                </DetailRow>
              ) : null}

              {form.module ? (
                <DetailRow label="Module">
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>{form.module}</Typography>
                </DetailRow>
              ) : null}

              {form.feature ? (
                <DetailRow label="Feature">
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>{form.feature}</Typography>
                </DetailRow>
              ) : null}

              {form.startDate ? (
                <DetailRow label="Start">
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>{formatDate(form.startDate)}</Typography>
                </DetailRow>
              ) : null}

              {form.dueDate ? (
                <DetailRow label="Due">
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>{formatDate(form.dueDate)}</Typography>
                </DetailRow>
              ) : null}

              {form.dependencies ? (
                <DetailRow label="Depends on">
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>{form.dependencies}</Typography>
                </DetailRow>
              ) : null}
            </Box>

            {/* Hours */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                mb: form.remarks ? 3 : 0,
              }}
            >
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  mb: 1
                }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Progress
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600
                  }}>
                  {form.status || 'Upcoming'} · {progressPct}%
                  {est > 0 ? ` · ${act}h / ${est}h` : ''}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                color={progressBarColor(progressPct)}
                sx={{ height: 8, borderRadius: 2 }}
              />
            </Box>

            {form.remarks ? (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    display: 'block',
                    mb: 0.75,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6
                  }}>
                  {form.status === 'Blocked'
                    ? 'Block reason'
                    : form.status === 'On Hold'
                      ? 'Hold reason'
                      : 'Notes'}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {form.remarks}
                </Typography>
                {(form.status === 'Blocked' || form.status === 'On Hold') && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}
                  >
                    Visible on overview timeline
                  </Typography>
                )}
              </Box>
            ) : null}
          </Stack>
        )}
      </Box>
      {editing && (
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 1.5,
            bgcolor: 'background.paper',
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={handleCancelEdit}
            disabled={saving}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveChanges}
            disabled={saving}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
