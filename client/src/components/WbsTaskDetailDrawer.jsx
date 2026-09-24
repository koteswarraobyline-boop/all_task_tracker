import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { api } from '../services/api';
import { tokens } from '../theme';
import {
  buildBreadcrumbPath,
  calendarDays,
  fmtLongDate,
  ownerName,
  statusChipSx,
  taskProgress,
  workingDays,
} from '../utils/wbsUiHelpers';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

const STATUS_OPTS = [
  'Planned',
  'Not Started',
  'Assigned',
  'In Progress',
  'In Development',
  'Testing',
  'Blocked',
  'Completed',
  'Done',
];

const sectionLabelSx = {
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: tokens.colors.textMuted,
  mb: 0.75,
};

export default function WbsTaskDetailDrawer({
  open,
  node,
  tree,
  projectId,
  canEdit,
  onClose,
  onOpenComments,
  onOpenDependency,
  onSaved,
  commentsBlockingEscape = false,
}) {
  const [status, setStatus] = useState(node?.status || 'Planned');
  const [progress, setProgress] = useState(taskProgress(node));
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!node) return;
    setStatus(node.status || 'Planned');
    setProgress(taskProgress(node));
    setRemark('');
    setError(null);
  }, [node?.id, node?.status, node?.progress]);

  useEffect(() => {
    if (!open || commentsBlockingEscape) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, commentsBlockingEscape]);

  const crumb = useMemo(() => {
    if (!node || !tree) return '';
    return buildBreadcrumbPath(tree, node.id)
      .map((n) => n.name)
      .join(' › ');
  }, [node, tree]);

  const pct = taskProgress(node);
  const wd = workingDays(node?.startDate || node?.rangeStart, node?.dueDate || node?.rangeEnd);
  const cal = calendarDays(node?.startDate || node?.rangeStart, node?.dueDate || node?.rangeEnd);
  const deps = node?.dependsOnNames || [];
  const commentCount = node?.commentCount || 0;
  const linkCount = node?.reviewLinkCount || node?.reviewLinks?.length || 0;

  const saveStatus = async () => {
    if (!canEdit || !node) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateProjectNode(projectId, node.id, {
        status,
        progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      });
      if (remark.trim()) {
        await api.createProjectComment(projectId, {
          nodeId: node.id,
          body: remark.trim(),
          statusFrom: node.status || null,
          statusTo: status,
        });
      }
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!node) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={commentsBlockingEscape ? undefined : onClose}
      ModalProps={{
        keepMounted: true,
        disableEscapeKeyDown: commentsBlockingEscape,
      }}
      hideBackdrop={commentsBlockingEscape}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 440 },
          maxWidth: '100%',
          borderLeft: `1px solid ${tokens.colors.border}`,
          boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.08)',
        },
      }}
      slotProps={{
        backdrop: {
          sx: { bgcolor: 'rgba(15, 23, 42, 0.35)' },
        },
      }}
      transitionDuration={200}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${tokens.colors.border}` }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: tokens.colors.textMuted,
                lineHeight: 1.4,
                pr: 1,
              }}
            >
              {crumb || 'Task'}
            </Typography>
            <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: tokens.colors.textMuted }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Typography
            sx={{
              mt: 1,
              fontSize: '1.2rem',
              fontWeight: 700,
              color: tokens.colors.text,
              lineHeight: 1.3,
            }}
          >
            {node.name}
          </Typography>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
            <Chip
              size="small"
              label={ownerName(node)}
              sx={{
                height: 24,
                fontWeight: 650,
                fontSize: '0.7rem',
                bgcolor: tokens.colors.successBg,
                color: tokens.colors.success,
                borderRadius: '6px',
              }}
            />
            <Chip
              size="small"
              label={node.status || 'Planned'}
              sx={{
                height: 24,
                fontWeight: 650,
                fontSize: '0.7rem',
                borderRadius: '6px',
                ...statusChipSx(node.status),
              }}
            />
            {node.priority && (
              <Chip
                size="small"
                label={node.priority}
                sx={{
                  height: 24,
                  fontWeight: 650,
                  fontSize: '0.7rem',
                  bgcolor: tokens.colors.warningBg,
                  color: tokens.colors.warning,
                  borderRadius: '6px',
                }}
              />
            )}
            {node.isBlockedByDeps && (
              <Chip
                size="small"
                label="Blocked"
                sx={{
                  height: 24,
                  fontWeight: 650,
                  fontSize: '0.7rem',
                  bgcolor: tokens.colors.warningBg,
                  color: tokens.colors.warning,
                  borderRadius: '6px',
                }}
              />
            )}
          </Stack>

          <Typography sx={{ mt: 1.25, fontSize: '0.8125rem', color: tokens.colors.textSecondary }}>
            {fmtLongDate(node.startDate || node.rangeStart)} – {fmtLongDate(node.dueDate || node.rangeEnd)}
            {wd != null && (
              <Box component="span">
                {' '}
                · {wd} working day{wd === 1 ? '' : 's'}
                {cal != null ? ` (${cal} calendar)` : ''}
              </Box>
            )}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={sectionLabelSx}>Description</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: tokens.colors.textBody, lineHeight: 1.55 }}>
              {(node.description || '').trim() || 'No description.'}
            </Typography>
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Typography sx={sectionLabelSx}>Progress</Typography>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: tokens.colors.progressTrack,
                '& .MuiLinearProgress-bar': { bgcolor: tokens.colors.primary, borderRadius: 3 },
              }}
            />
            <Typography sx={{ mt: 0.75, fontSize: '0.75rem', color: tokens.colors.textSecondary }}>
              {pct}% complete
            </Typography>
          </Box>

          {!!deps.length && (
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={sectionLabelSx}>Depends on</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {deps.map((name, i) => (
                  <Chip
                    key={`${name}-${i}`}
                    size="small"
                    label={name}
                    onClick={
                      node.dependsOn?.[i] && onOpenDependency
                        ? () => onOpenDependency(node.dependsOn[i])
                        : undefined
                    }
                    sx={{
                      height: 26,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      bgcolor: '#F1F5F9',
                      color: tokens.colors.text,
                      borderRadius: '6px',
                      cursor: onOpenDependency && node.dependsOn?.[i] ? 'pointer' : 'default',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {canEdit ? (
            <Box
              sx={{
                mb: 2.5,
                p: 1.75,
                borderRadius: `${tokens.radius.sm}px`,
                border: `1px solid ${tokens.colors.border}`,
                bgcolor: tokens.colors.primarySofter,
              }}
            >
              <Typography sx={sectionLabelSx}>Update status</Typography>
              <Stack spacing={1.25}>
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  fullWidth
                >
                  {STATUS_OPTS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="Progress (%)"
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  inputProps={{ min: 0, max: 100 }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Optional note about this update"
                  multiline
                  minRows={2}
                  fullWidth
                />
                {error && (
                  <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.danger }}>{error}</Typography>
                )}
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={saveStatus}
                  sx={{
                    ...btnSx,
                    bgcolor: tokens.colors.primary,
                    '&:hover': { bgcolor: tokens.colors.primaryHover },
                    boxShadow: 'none',
                  }}
                >
                  {saving ? 'Saving…' : 'Save update'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={sectionLabelSx}>Status</Typography>
              <Chip
                size="small"
                label={node.status || 'Planned'}
                sx={{
                  height: 24,
                  fontWeight: 650,
                  fontSize: '0.7rem',
                  borderRadius: '6px',
                  ...statusChipSx(node.status),
                }}
              />
              <Typography sx={{ mt: 1, fontSize: '0.75rem', color: tokens.colors.textMuted, fontStyle: 'italic' }}>
                View only — unlock edit to change dates and structure.
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="outlined"
            onClick={() => onOpenComments?.(node)}
            sx={{
              ...btnSx,
              borderColor: tokens.colors.border,
              color: tokens.colors.text,
              bgcolor: '#FFFFFF',
              py: 1.1,
              '&:hover': { borderColor: tokens.colors.primary, bgcolor: tokens.colors.primarySoft },
            }}
          >
            Comments & review links ({commentCount}
            {linkCount ? ` · ${linkCount} links` : ''})
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
