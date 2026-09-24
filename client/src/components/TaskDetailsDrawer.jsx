import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  PersonAdd as AssignIcon,
  SwapHoriz as StatusIcon,
  ContentCopy as DuplicateIcon,
  DeleteOutlined as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  KeyboardArrowDown as ArrowDownIcon,
  CalendarTodayOutlined as CalendarIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../context/RoleContext';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { getTaskProgressPercent } from '../utils/taskProgress';
import { formatShortDate } from '../utils/deliveryHealth';
import { getOverdueDays, isWorkTask, shouldShowOverdueAlert } from '../utils/taskManagementConstants';
import { StatusSelectChip, PriorityLabelChip, OverdueBanner, formatPriorityLabel } from './TaskBoard/Badges';
import {
  ALL_STATUSES,
  STATUS_LABELS,
  normalizeLegacyStatus,
} from './TaskBoard/constants';
import StatusRemarkDialog, { needsStatusRemark } from './StatusRemarkDialog';
import CommentsReviewLinksModal from './CommentsReviewLinksModal';
import { tokens } from '../theme';

const PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'High', 'Medium', 'Low'];

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
};

const DESC_CLAMP = 220;

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

function buildFormFromTask(task) {
  const { title, description } = splitTitleAndDescription(task.taskName, task.description);
  return {
    taskName: title || task.taskName || '',
    description: description || '',
    status: normalizeLegacyStatus(task.status) || task.status || '',
    developerId: task.developerId || '',
    priority: task.priority || '',
    module: task.module || '',
    phase: task.phase || '',
    startDate: toDateInput(task.startDate),
    dueDate: toDateInput(task.dueDate),
    estimatedHours:
      task.estimatedHours !== null && task.estimatedHours !== undefined ? String(task.estimatedHours) : '',
    actualHours:
      task.actualHours !== null && task.actualHours !== undefined ? String(task.actualHours) : '',
    dependencies: task.dependencies || '',
    tags: task.tags || '',
    remarks: task.remarks || '',
    progressPercent:
      task.progressPercent !== null && task.progressPercent !== undefined
        ? String(task.progressPercent)
        : '',
  };
}

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  return String(tags)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDependencyRefs(depsStr, allTasks = []) {
  if (!depsStr) return [];
  const parts = String(depsStr)
    .split(/[,;|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.map((ref) => {
    const lower = ref.toLowerCase();
    const matched =
      allTasks.find((t) => t.taskId === ref) ||
      allTasks.find((t) => String(t.id) === ref) ||
      allTasks.find((t) => String(t.taskName || '').toLowerCase() === lower) ||
      allTasks.find((t) => String(t.taskName || '').toLowerCase().includes(lower));
    return { ref, task: matched || null };
  });
}

function formatHours(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return 'Not recorded';
  }
  return `${Number(value)}h`;
}

function getDevInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function SectionTitle({ children, action }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 800, letterSpacing: '-0.01em', color: 'text.primary' }}
      >
        {children}
      </Typography>
      {action || null}
    </Stack>
  );
}

function DrawerSection({ children, last = false }) {
  return (
    <Box
      sx={{
        py: 2,
        borderBottom: last ? 'none' : '1px solid',
        borderColor: 'divider',
      }}
    >
      {children}
    </Box>
  );
}

function FieldLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.75, fontSize: '0.72rem' }}
    >
      {children}
    </Typography>
  );
}

function DateFieldBox({ label, value, overdueDays: lateDays = 0 }) {
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1.1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          minHeight: 44,
        }}
      >
        <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 650, lineHeight: 1.3 }}>
            {value || '—'}
          </Typography>
          {lateDays > 0 && (
            <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700, display: 'block', mt: 0.25 }}>
              {lateDays} day{lateDays === 1 ? '' : 's'} late
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function LocationRow({ label, value }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '88px 1fr',
        gap: 1.5,
        py: 0.65,
        alignItems: 'start',
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.8125rem' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 650, fontSize: '0.8125rem', wordBreak: 'break-word', color: value && value !== '—' ? '#2563EB' : 'text.secondary' }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

function DrawerSkeleton() {
  return (
    <Stack spacing={2} sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
      <Skeleton variant="rounded" height={56} />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={120} height={28} />
        <Skeleton variant="rounded" width={90} height={28} />
      </Stack>
      <Skeleton variant="rounded" height={72} />
      {['Description', 'Location', 'Assignment', 'Schedule', 'Progress', 'Tags', 'Dependencies', 'Activity'].map(
        (key) => (
          <Box key={key}>
            <Skeleton width={100} height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={key === 'Description' ? 80 : 48} />
          </Box>
        )
      )}
    </Stack>
  );
}

export default function TaskDetailsDrawer({
  open,
  onClose,
  task,
  developers = [],
  onTaskUpdated,
  startInEditMode = false,
  project = null,
  allTasks = [],
  onOpenTask,
  onDeleteTask,
  onDuplicateTask,
  loading = false,
  loadError = false,
  onRetry,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { role, clientMeta } = useRole();
  const isClient = role === 'client';
  const canEditPerm = usePermission('task.edit');
  const canStatusPerm = usePermission('task.status');
  const canAssignPerm = usePermission('task.assign');
  const canDeletePerm = usePermission('task.delete');
  const canEdit = !isClient && canEditPerm;
  const canStatus = !isClient && canStatusPerm;
  const canAssign = !isClient && canAssignPerm;
  const canDelete = !isClient && canDeletePerm;
  const canModify = !isClient && (canEdit || canStatus || canAssign);

  const closeBtnRef = useRef(null);
  const triggerRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [assignAnchor, setAssignAnchor] = useState(null);
  const [devSearch, setDevSearch] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabCounts, setCollabCounts] = useState({ comments: 0, links: 0 });
  const [remarkDialog, setRemarkDialog] = useState({
    open: false,
    status: '',
    mode: 'quick',
    pendingStatus: '',
  });
  const [quickSaving, setQuickSaving] = useState(false);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  useEffect(() => {
    if (task) {
      setForm(buildFormFromTask(task));
      setEditing(Boolean(startInEditMode && canModify));
      setError('');
      setSuccessMsg('');
      setDescExpanded(false);
      setCollabOpen(false);
      setCollabCounts({
        comments: task.commentCount || 0,
        links: task.reviewLinkCount || 0,
      });
    } else {
      setForm(null);
      setEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, open, startInEditMode, canModify]);

  useEffect(() => {
    if (!open || !task?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        let data = null;
        if (isClient) {
          const token = clientMeta?.token;
          if (!token) return;
          const pwd = sessionStorage.getItem(`share-password:${token}`) || undefined;
          data = await api.getClientTaskCollab(token, task.id, pwd);
        } else if (project?.id) {
          data = await api.getTaskCollab(project.id, task.id);
        }
        if (!cancelled && data) {
          setCollabCounts({
            comments: data.commentCount ?? data.comments?.length ?? 0,
            links: data.reviewLinkCount ?? data.reviewLinks?.length ?? 0,
          });
        }
      } catch {
        /* keep existing counts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, task?.id, isClient, clientMeta?.token, project?.id]);

  const handleClose = useCallback(() => {
    if (editing) {
      if (task) setForm(buildFormFromTask(task));
      setEditing(false);
    }
    setError('');
    setSuccessMsg('');
    onClose();
    requestAnimationFrame(() => {
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    });
  }, [editing, onClose, task]);

  const workTasks = useMemo(
    () => (allTasks || []).filter(isWorkTask),
    [allTasks]
  );

  const display = useMemo(() => {
    if (!form) return { title: '', description: '' };
    return { title: form.taskName || '', description: form.description || '' };
  }, [form]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccessMsg('');
    setError('');
  };

  const handleCancelEdit = () => {
    if (task) setForm(buildFormFromTask(task));
    setEditing(false);
    setError('');
    setSuccessMsg('');
  };

  const applyTaskUpdate = (updated) => {
    const freshForm = buildFormFromTask(updated);
    setForm(freshForm);
    onTaskUpdated?.(updated);
  };

  const handleSaveChanges = async () => {
    if (!canModify || !task) return;
    if (!form.taskName.trim()) {
      setError('Task name is required');
      return;
    }
    if (needsStatusRemark(form.status) && !form.remarks.trim()) {
      setRemarkDialog({ open: true, status: form.status, mode: 'save', pendingStatus: form.status });
      return;
    }
    await saveFormWithData(form);
  };

  const handleQuickStatusChange = async (newStatus, remark = '') => {
    if (!task || !canStatus) return;
    setQuickSaving(true);
    setError('');
    try {
      const payload = {
        status: newStatus,
        ...(needsStatusRemark(newStatus) ? { remarks: remark } : {}),
      };
      const updated = await api.updateTask(task.id, payload);
      applyTaskUpdate(updated);
      setSuccessMsg('Task updated successfully.');
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleQuickAssign = async (developerId) => {
    if (!task || !canAssign) return;
    setQuickSaving(true);
    setError('');
    try {
      const updated = await api.updateTask(task.id, {
        developerId: developerId ? parseInt(developerId, 10) : null,
      });
      applyTaskUpdate(updated);
      setSuccessMsg('Task updated successfully.');
    } catch (err) {
      console.error('Failed to assign developer:', err);
      setError(err.response?.data?.error || 'Failed to assign developer');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleRemarkConfirm = async (remark) => {
    const { mode, pendingStatus, status } = remarkDialog;
    const nextStatus = pendingStatus || status;

    if (mode === 'save') {
      setRemarkDialog({ open: false, status: '', mode: 'quick', pendingStatus: '' });
      setForm((prev) => {
        const next = { ...prev, remarks: remark, status: nextStatus };
        queueMicrotask(() => saveFormWithData(next));
        return next;
      });
      return;
    }
    if (mode === 'edit') {
      setField('remarks', remark);
      setField('status', nextStatus);
      setRemarkDialog({ open: false, status: '', mode: 'quick', pendingStatus: '' });
      return;
    }
    setRemarkDialog({ open: false, status: '', mode: 'quick', pendingStatus: '' });
    await handleQuickStatusChange(nextStatus, remark);
  };

  const saveFormWithData = async (formData) => {
    if (!canModify || !task) return;
    if (!formData.taskName.trim()) {
      setError('Task name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        taskName: formData.taskName.trim(),
        description: formData.description.trim() || null,
        status: formData.status || null,
        developerId: formData.developerId ? parseInt(formData.developerId, 10) : null,
        priority: formData.priority || null,
        module: formData.module.trim() || null,
        phase: formData.phase.trim() || null,
        startDate: formData.startDate || null,
        dueDate: formData.dueDate || null,
        estimatedHours: formData.estimatedHours === '' ? null : parseFloat(formData.estimatedHours),
        actualHours: formData.actualHours === '' ? null : parseFloat(formData.actualHours),
        dependencies: formData.dependencies.trim() || null,
        tags: formData.tags.trim() || null,
        remarks: formData.remarks.trim() || null,
        progressPercent: formData.progressPercent === '' ? null : parseFloat(formData.progressPercent),
      };

      const updated = await api.updateTask(task.id, payload);
      applyTaskUpdate(updated);
      setEditing(false);
      setSuccessMsg('Task updated successfully.');
    } catch (err) {
      console.error('Failed to save task:', err);
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusFieldChange = (newStatus) => {
    if (needsStatusRemark(newStatus) && !form.remarks.trim()) {
      setRemarkDialog({ open: true, status: newStatus, mode: 'edit', pendingStatus: newStatus });
      return;
    }
    setField('status', newStatus);
  };

  const handleViewStatusChange = (newStatus) => {
    if (needsStatusRemark(newStatus)) {
      setRemarkDialog({ open: true, status: newStatus, mode: 'quick', pendingStatus: newStatus });
      return;
    }
    handleQuickStatusChange(newStatus);
  };

  const handleDeleteConfirm = async () => {
    if (!task || !onDeleteTask) return;
    setDeleting(true);
    try {
      await onDeleteTask(task);
      setDeleteOpen(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError(err.response?.data?.error || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const drawerWidth = {
    xs: '100%',
    sm: '70vw',
    md: 480,
    lg: 520,
  };

  const showSkeleton = open && (loading || (!task && !loadError));
  const showError = open && loadError && !loading;

  const renderContent = () => {
    if (showSkeleton) return <DrawerSkeleton />;

    if (showError) {
      return (
        <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
            Unable to load task details.
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            {onRetry && (
              <Button variant="contained" onClick={onRetry}>
                Retry
              </Button>
            )}
            <Button variant="outlined" onClick={handleClose}>
              Close
            </Button>
          </Stack>
        </Box>
      );
    }

    if (!task || !form) return null;

    const assignedDev = developers.find(
      (d) => d.id === form.developerId || d.id === parseInt(form.developerId, 10)
    );
    const developerLabel = assignedDev ? getDeveloperDisplayName(assignedDev) : 'Unassigned';

    const progressTask = {
      status: normalizeLegacyStatus(form.status),
      progressPercent: editing ? form.progressPercent : task.progressPercent,
    };
    const progressPct = getTaskProgressPercent(progressTask);

    const taskSnapshot = { ...task, status: form.status };
    const showOverdueAlert = shouldShowOverdueAlert(taskSnapshot);
    const overdueDays = showOverdueAlert ? getOverdueDays(taskSnapshot) : 0;

    const tags = parseTags(form.tags || task.tags);
    const dependencies = parseDependencyRefs(form.dependencies || task.dependencies, workTasks);

    const viewTitle = display.title || 'Untitled task';
    const viewDescription = display.description;
    const longDesc = viewDescription && viewDescription.length > DESC_CLAMP;
    const shownDescription =
      longDesc && !descExpanded ? `${viewDescription.slice(0, DESC_CLAMP).trim()}…` : viewDescription;

    const priorityLabel = formatPriorityLabel(form.priority);

    const grid2 = {
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      gap: 2,
    };

    const moreItems = [
      {
        key: 'edit',
        label: 'Edit Task',
        icon: <EditIcon fontSize="small" />,
        show: canEdit,
        onClick: () => setEditing(true),
      },
      {
        key: 'status',
        label: 'Change Status',
        icon: <StatusIcon fontSize="small" />,
        show: canStatus,
        onClick: () => setEditing(true),
      },
      {
        key: 'assign',
        label: 'Assign Developer',
        icon: <AssignIcon fontSize="small" />,
        show: canAssign,
        onClick: () => setEditing(true),
      },
      {
        key: 'duplicate',
        label: 'Duplicate',
        icon: <DuplicateIcon fontSize="small" />,
        show: canEdit && Boolean(onDuplicateTask),
        dividerBefore: true,
        onClick: () => onDuplicateTask?.(task),
      },
      {
        key: 'delete',
        label: 'Delete Task',
        icon: <DeleteIcon fontSize="small" />,
        show: canDelete && Boolean(onDeleteTask),
        danger: true,
        onClick: () => setDeleteOpen(true),
      },
    ].filter((i) => i.show);

    return (
      <>
        {/* Header */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: tokens.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CodeIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <TextField
                  value={form.taskName}
                  onChange={(e) => setField('taskName', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!canEdit}
                  sx={{ ...fieldSx, mb: 0.5 }}
                />
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 650, lineHeight: 1.3, wordBreak: 'break-word', fontSize: '1.05rem' }}>
                  {viewTitle}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.25, display: 'block' }}>
                {task.taskId || '—'}
              </Typography>
            </Box>

            <Stack direction="row" alignItems="center" spacing={0.25} flexShrink={0}>
              {!isClient && (
                <IconButton size="small" aria-label={starred ? 'Remove favorite' : 'Add favorite'} onClick={() => setStarred((s) => !s)}>
                  {starred ? <StarIcon fontSize="small" sx={{ color: '#F59E0B' }} /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              )}
              {moreItems.length > 0 && (
                <>
                  <IconButton
                    size="small"
                    aria-label="More actions"
                    onClick={(e) => setMoreAnchor(e.currentTarget)}
                  >
                    <MoreIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={moreAnchor}
                    open={Boolean(moreAnchor)}
                    onClose={() => setMoreAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                      paper: {
                        sx: { borderRadius: '12px', minWidth: 200, border: '1px solid', borderColor: 'divider' },
                      },
                    }}
                  >
                    {moreItems.map((item) => (
                      <React.Fragment key={item.key}>
                        {item.dividerBefore && <Divider sx={{ my: 0.5 }} />}
                        <MenuItem
                          onClick={() => {
                            setMoreAnchor(null);
                            item.onClick?.();
                          }}
                          sx={{ color: item.danger ? 'error.main' : 'text.primary' }}
                        >
                          <ListItemIcon sx={{ color: item.danger ? 'error.main' : 'text.secondary', minWidth: 36 }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem' }} />
                        </MenuItem>
                      </React.Fragment>
                    ))}
                  </Menu>
                </>
              )}
              <IconButton ref={closeBtnRef} size="small" aria-label="Close task details" onClick={handleClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Status + Priority row */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.75, alignItems: 'center' }}>
            {editing && canStatus ? (
              <TextField
                select
                size="small"
                value={form.status}
                onChange={(e) => handleStatusFieldChange(e.target.value)}
                sx={{ minWidth: 160, ...fieldSx }}
              >
                {ALL_STATUSES.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {STATUS_LABELS[opt] || opt}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <StatusSelectChip
                status={form.status}
                isDark={isDark}
                interactive={canStatus}
                disabled={quickSaving}
                onClick={canStatus ? (e) => setStatusAnchor(e.currentTarget) : undefined}
              />
            )}

            {priorityLabel ? (
              editing && canEdit ? (
                <TextField
                  select
                  size="small"
                  value={form.priority}
                  onChange={(e) => setField('priority', e.target.value)}
                  sx={{ minWidth: 130, ...fieldSx }}
                >
                  <MenuItem value="">None</MenuItem>
                  {PRIORITIES.map((p) => (
                    <MenuItem key={p} value={p}>
                      {formatPriorityLabel(p) || p}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <PriorityLabelChip priority={form.priority} isDark={isDark} />
              )
            ) : null}
          </Stack>

          {showOverdueAlert && !editing && (
            <OverdueBanner
              dueDate={form.dueDate || task.dueDate}
              overdueDays={overdueDays}
              sx={{ mt: 1.5 }}
            />
          )}

          {canStatus && !editing && (
            <Menu
              anchorEl={statusAnchor}
              open={Boolean(statusAnchor)}
              onClose={() => setStatusAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{
                paper: {
                  sx: { borderRadius: '12px', minWidth: 180, border: '1px solid', borderColor: 'divider' },
                },
              }}
            >
              {ALL_STATUSES.map((opt) => (
                <MenuItem
                  key={opt}
                  selected={normalizeLegacyStatus(form.status) === opt}
                  onClick={() => {
                    setStatusAnchor(null);
                    handleViewStatusChange(opt);
                  }}
                  sx={{ fontSize: '0.8125rem', fontWeight: 600 }}
                >
                  {STATUS_LABELS[opt] || opt}
                </MenuItem>
              ))}
            </Menu>
          )}
        </Box>

        {/* Scrollable body */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            pb: 3,
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {successMsg && !editing && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {successMsg}
            </Alert>
          )}

          {editing ? (
            <Stack spacing={2.5}>
              {canEdit && (
                <Box>
                  <SectionTitle>Description</SectionTitle>
                  <TextField
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="What needs to be done…"
                    sx={fieldSx}
                  />
                </Box>
              )}

              <Box sx={grid2}>
                {canAssign && (
                  <Autocomplete
                    options={developers}
                    getOptionLabel={(dev) => getDeveloperDisplayName(dev)}
                    value={assignedDev || null}
                    onChange={(_, dev) => setField('developerId', dev?.id || '')}
                    renderInput={(params) => <TextField {...params} label="Developer" sx={fieldSx} placeholder="Search developers" />}
                    renderOption={(props, dev) => (
                      <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: dev.color }}>
                          {getDevInitials(getDeveloperDisplayName(dev))}
                        </Avatar>
                        {getDeveloperDisplayName(dev)}
                      </Box>
                    )}
                  />
                )}
              </Box>

              {canEdit && (
                <>
                  <Box sx={grid2}>
                    <TextField label="Phase" value={form.phase} onChange={(e) => setField('phase', e.target.value)} fullWidth sx={fieldSx} />
                    <TextField label="Module" value={form.module} onChange={(e) => setField('module', e.target.value)} fullWidth sx={fieldSx} />
                    <TextField
                      label="Start date"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setField('startDate', e.target.value)}
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={fieldSx}
                    />
                    <TextField
                      label="Due date"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setField('dueDate', e.target.value)}
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={fieldSx}
                    />
                    <TextField
                      label="Estimated hours"
                      type="number"
                      value={form.estimatedHours}
                      onChange={(e) => setField('estimatedHours', e.target.value)}
                      fullWidth
                      sx={fieldSx}
                      slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                    />
                    <TextField
                      label="Actual hours"
                      type="number"
                      value={form.actualHours}
                      onChange={(e) => setField('actualHours', e.target.value)}
                      fullWidth
                      sx={fieldSx}
                      slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                    />
                    <TextField
                      label="Progress %"
                      type="number"
                      value={form.progressPercent}
                      onChange={(e) => setField('progressPercent', e.target.value)}
                      fullWidth
                      sx={fieldSx}
                      slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                    />
                  </Box>
                  <TextField
                    label="Tags"
                    value={form.tags}
                    onChange={(e) => setField('tags', e.target.value)}
                    fullWidth
                    placeholder="API, Authentication, Backend"
                    helperText="Comma-separated"
                    sx={fieldSx}
                  />
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
                        ? 'Block reason'
                        : form.status === 'On Hold'
                          ? 'Hold reason'
                          : 'Notes'
                    }
                    value={form.remarks}
                    onChange={(e) => setField('remarks', e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    sx={fieldSx}
                  />
                </>
              )}
            </Stack>
          ) : (
            <Box>
              {/* Description */}
              <DrawerSection>
                <SectionTitle>Description</SectionTitle>
                {viewDescription ? (
                  <>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, color: 'text.primary', fontSize: '0.8125rem' }}>
                      {shownDescription}
                    </Typography>
                    {longDesc && (
                      <Button
                        size="small"
                        sx={{
                          mt: 0.75,
                          p: 0,
                          minWidth: 0,
                          textTransform: 'none',
                          fontWeight: 700,
                          color: '#2563EB',
                        }}
                        onClick={() => setDescExpanded((e) => !e)}
                      >
                        {descExpanded ? 'Show less' : 'Show more'}
                      </Button>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                    No description provided.
                  </Typography>
                )}
              </DrawerSection>

              {/* Location */}
              <DrawerSection>
                <SectionTitle>Location</SectionTitle>
                <LocationRow
                  label="Project"
                  value={project?.name || project?.projectName || '—'}
                />
                <LocationRow label="Phase" value={form.phase || '—'} />
                <LocationRow label="Module" value={form.module || '—'} />
              </DrawerSection>

              {/* Assignment */}
              <DrawerSection>
                <SectionTitle>Assignment</SectionTitle>
                <FieldLabel>Developer</FieldLabel>
                {canAssign ? (
                  <>
                    <Box
                      component="button"
                      type="button"
                      disabled={quickSaving}
                      onClick={(e) => {
                        setDevSearch('');
                        setAssignAnchor(e.currentTarget);
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: '100%',
                        px: 1.5,
                        py: 1.1,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        cursor: 'pointer',
                        textAlign: 'left',
                        minHeight: 44,
                      }}
                    >
                      {assignedDev ? (
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: assignedDev.color }}>
                          {getDevInitials(developerLabel)}
                        </Avatar>
                      ) : null}
                      <Typography variant="body2" sx={{ fontWeight: 650, flex: 1, minWidth: 0 }} noWrap>
                        {developerLabel}
                      </Typography>
                      <ArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
                    </Box>
                    <Menu
                      anchorEl={assignAnchor}
                      open={Boolean(assignAnchor)}
                      onClose={() => setAssignAnchor(null)}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      slotProps={{
                        paper: {
                          sx: { borderRadius: '12px', width: 280, border: '1px solid', borderColor: 'divider', p: 1 },
                        },
                      }}
                    >
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Search developers"
                        value={devSearch}
                        onChange={(e) => setDevSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{ mb: 0.5, ...fieldSx }}
                      />
                      <MenuItem
                        onClick={() => {
                          setAssignAnchor(null);
                          handleQuickAssign('');
                        }}
                        sx={{ fontSize: '0.8125rem', fontWeight: 600, borderRadius: 1 }}
                      >
                        Unassigned
                      </MenuItem>
                      {developers
                        .filter((dev) =>
                          getDeveloperDisplayName(dev).toLowerCase().includes(devSearch.trim().toLowerCase())
                        )
                        .map((dev) => {
                          const label = getDeveloperDisplayName(dev);
                          return (
                            <MenuItem
                              key={dev.id}
                              selected={assignedDev?.id === dev.id}
                              onClick={() => {
                                setAssignAnchor(null);
                                handleQuickAssign(dev.id);
                              }}
                              sx={{ fontSize: '0.8125rem', fontWeight: 600, borderRadius: 1 }}
                            >
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: dev.color, mr: 1 }}>
                                {getDevInitials(label)}
                              </Avatar>
                              {label}
                            </MenuItem>
                          );
                        })}
                    </Menu>
                  </>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    {assignedDev && (
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: assignedDev.color }}>
                        {getDevInitials(developerLabel)}
                      </Avatar>
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {developerLabel}
                    </Typography>
                  </Stack>
                )}
              </DrawerSection>

              {/* Schedule */}
              <DrawerSection>
                <SectionTitle>Schedule</SectionTitle>
                <Box sx={grid2}>
                  <DateFieldBox
                    label="Start Date"
                    value={form.startDate ? formatShortDate(form.startDate) : null}
                  />
                  <DateFieldBox
                    label="Due Date"
                    value={form.dueDate ? formatShortDate(form.dueDate) : null}
                    overdueDays={showOverdueAlert ? overdueDays : 0}
                  />
                </Box>
              </DrawerSection>

              {/* Progress */}
              <DrawerSection>
                <SectionTitle>Progress</SectionTitle>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.25 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', minWidth: 52 }}>
                    {progressPct}%
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progressPct}
                      sx={{
                        height: 10,
                        borderRadius: 999,
                        bgcolor: 'rgba(148,163,184,0.25)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          bgcolor: progressPct >= 100 ? '#22C55E' : '#2563EB',
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </DrawerSection>

              {/* Time Tracking */}
              <DrawerSection>
                <SectionTitle>Time Tracking</SectionTitle>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isDark ? 'grey.900' : 'grey.50',
                  }}
                >
                  <Box>
                    <FieldLabel>Estimated Hours</FieldLabel>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {formatHours(form.estimatedHours || task.estimatedHours)}
                    </Typography>
                  </Box>
                  <Box>
                    <FieldLabel>Actual Hours</FieldLabel>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {formatHours(form.actualHours || task.actualHours)}
                    </Typography>
                  </Box>
                </Box>
              </DrawerSection>

              {/* Tags */}
              <DrawerSection>
                <SectionTitle>Tags</SectionTitle>
                {tags.length ? (
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          height: 26,
                          bgcolor: isDark ? '#1e3a8a' : '#EFF6FF',
                          color: isDark ? '#93C5FD' : '#2563EB',
                          border: '1px solid',
                          borderColor: isDark ? '#1e40af' : '#BFDBFE',
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                    No tags
                  </Typography>
                )}
              </DrawerSection>

              {/* Dependencies */}
              <DrawerSection>
                <SectionTitle>Dependencies</SectionTitle>
                {dependencies.length ? (
                  <Stack spacing={1.5}>
                    {dependencies.map(({ ref, task: depTask }) => {
                      const depTitle = depTask?.taskName
                        ? splitTitleAndDescription(depTask.taskName, depTask.description).title
                        : ref;
                      return (
                        <Box key={ref}>
                          {depTask && onOpenTask ? (
                            <Link
                              component="button"
                              variant="body2"
                              onClick={() => onOpenTask(depTask)}
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                color: '#2563EB',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.35,
                                p: 0,
                                border: 'none',
                                bgcolor: 'transparent',
                                cursor: 'pointer',
                              }}
                            >
                              {depTask.taskId || ref}
                              <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8125rem' }}>
                              {ref}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8125rem' }}>
                            {depTitle}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                    No dependencies
                  </Typography>
                )}
              </DrawerSection>

              {/* Block / Hold reason */}
              {(form.status === 'Blocked' || form.status === 'On Hold') && (
                <DrawerSection>
                  <SectionTitle>{form.status === 'Blocked' ? 'Block Reason' : 'Hold Reason'}</SectionTitle>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.8125rem' }}>
                    {form.remarks?.trim() || 'Reason not provided'}
                  </Typography>
                </DrawerSection>
              )}

              {/* Comments & review links */}
              <DrawerSection>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setCollabOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 650,
                    borderRadius: 2,
                    borderColor: tokens.colors.border,
                    color: tokens.colors.text,
                    py: 1.15,
                    bgcolor: '#FFFFFF',
                    '&:hover': {
                      borderColor: tokens.colors.primary,
                      bgcolor: tokens.colors.primarySoft,
                    },
                  }}
                >
                  Comments & review links ({collabCounts.comments}
                  {collabCounts.links ? ` · ${collabCounts.links} links` : ''})
                </Button>
              </DrawerSection>

              {/* Activity */}
              <DrawerSection last>
                <SectionTitle>Activity</SectionTitle>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  {collabCounts.comments
                    ? `${collabCounts.comments} comment${collabCounts.comments === 1 ? '' : 's'} on this task.`
                    : 'No activity yet. Open comments to start a conversation.'}
                </Typography>
              </DrawerSection>
            </Box>
          )}
        </Box>
      </>
    );
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        ModalProps={{
          keepMounted: false,
          disableScrollLock: true,
        }}
        PaperProps={{
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': 'task-details-drawer-title',
          sx: {
            width: drawerWidth,
            maxWidth: '100%',
            borderRadius: 0,
            boxShadow: '-8px 0 24px rgba(15,23,42,0.08)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            bgcolor: 'background.paper',
          }}
        >
          <Box id="task-details-drawer-title" sx={{ display: 'none' }}>
            Task details
          </Box>

          {renderContent()}

          {/* Footer */}
          {task && form && !showSkeleton && !showError && (
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                py: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                bgcolor: 'background.paper',
                flexShrink: 0,
              }}
            >
            {editing ? (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setEditing(true)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      py: 1.1,
                      borderColor: 'divider',
                      color: 'text.primary',
                    }}
                  >
                    Edit Task
                  </Button>
                )}
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleClose}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1.1,
                    bgcolor: '#4F46E5',
                    '&:hover': { bgcolor: '#4338CA' },
                  }}
                >
                  Close
                </Button>
              </>
            )}
            </Box>
          )}
        </Box>
      </Drawer>

      <StatusRemarkDialog
        open={remarkDialog.open}
        status={remarkDialog.status}
        taskName={display.title}
        initialRemark={form?.remarks || ''}
        saving={quickSaving || saving}
        onCancel={() => setRemarkDialog({ open: false, status: '', mode: 'quick', pendingStatus: '' })}
        onConfirm={handleRemarkConfirm}
      />

      <Dialog open={deleteOpen} onClose={deleting ? undefined : () => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Task?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button disabled={deleting} onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={handleDeleteConfirm}>
            {deleting ? 'Deleting…' : 'Delete Task'}
          </Button>
        </DialogActions>
      </Dialog>

      <CommentsReviewLinksModal
        open={collabOpen && Boolean(task)}
        task={task}
        projectId={project?.id || null}
        canManage={!isClient && canEdit}
        onClose={() => setCollabOpen(false)}
        onChanged={() => {
          setCollabCounts((prev) => prev);
          // Refresh counts from server
          (async () => {
            try {
              let data = null;
              if (isClient && clientMeta?.token) {
                const pwd = sessionStorage.getItem(`share-password:${clientMeta.token}`) || undefined;
                data = await api.getClientTaskCollab(clientMeta.token, task.id, pwd);
              } else if (project?.id) {
                data = await api.getTaskCollab(project.id, task.id);
              }
              if (data) {
                setCollabCounts({
                  comments: data.commentCount ?? data.comments?.length ?? 0,
                  links: data.reviewLinkCount ?? data.reviewLinks?.length ?? 0,
                });
              }
            } catch {
              /* ignore */
            }
          })();
        }}
      />
    </>
  );
}
