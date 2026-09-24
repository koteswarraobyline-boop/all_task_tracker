import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { tokens } from '../theme';
import {
  TYPE_LABEL,
  collectTasks,
  fmtShortDate,
  ownerName,
  statusChipSx,
  taskProgress,
  isDoneStatus,
} from '../utils/wbsUiHelpers';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

function CategoryContents({ node, depth = 0, onOpenTask }) {
  if (node.type === 'task') {
    const pct = taskProgress(node);
    return (
      <Box
        component="button"
        type="button"
        onClick={() => onOpenTask(node)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          bgcolor: '#FFFFFF',
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: `${tokens.radius.sm}px`,
          px: 1.5,
          py: 1.1,
          ml: `${Math.min(depth, 3) * 8}px`,
          transition: tokens.motion.fast,
          '&:hover': {
            borderColor: tokens.colors.primary,
            bgcolor: tokens.colors.primarySofter,
          },
        }}
      >
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: '0.8125rem',
            fontWeight: 550,
            color: tokens.colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={node.name}
        >
          {node.name}
        </Typography>
        <Chip
          size="small"
          label={ownerName(node)}
          sx={{
            height: 22,
            fontSize: '0.68rem',
            fontWeight: 600,
            bgcolor: tokens.colors.primarySoft,
            color: tokens.colors.primary,
            borderRadius: '6px',
            maxWidth: 110,
            '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' },
          }}
        />
        <Chip
          size="small"
          label={node.status || 'Planned'}
          sx={{
            height: 22,
            fontSize: '0.68rem',
            fontWeight: 650,
            borderRadius: '6px',
            ...statusChipSx(node.status),
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: tokens.colors.textSecondary,
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {pct}%
        </Typography>
      </Box>
    );
  }

  const tasks = collectTasks(node);
  const done = tasks.filter((t) => isDoneStatus(t.status)).length;
  const prog = tasks.length
    ? Math.round(tasks.reduce((sum, t) => sum + taskProgress(t), 0) / tasks.length)
    : Number(node.progress) || 0;
  const typeKey = String(node.type || 'category').toLowerCase();
  const typeLabel = TYPE_LABEL[typeKey] || 'GROUP';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 0.5,
          py: 0.5,
          pl: `${8 + Math.min(depth, 3) * 8}px`,
        }}
      >
        <Box
          sx={{
            px: 0.75,
            py: 0.2,
            borderRadius: '4px',
            bgcolor: tokens.colors.primarySoft,
            color: tokens.colors.primary,
            fontSize: '0.62rem',
            fontWeight: 750,
            letterSpacing: '0.04em',
            lineHeight: 1.6,
          }}
        >
          {typeLabel}
        </Box>
        <Typography
          sx={{
            flex: 1,
            fontSize: '0.8125rem',
            fontWeight: 650,
            color: tokens.colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.name}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.textSecondary, fontWeight: 600 }}>
          {done}/{tasks.length} · {prog}%
        </Typography>
      </Stack>
      {(node.children || []).map((child) => (
        <CategoryContents key={child.id} node={child} depth={depth + 1} onOpenTask={onOpenTask} />
      ))}
    </Box>
  );
}

export default function PhaseDetailModal({
  open,
  phase,
  projectId,
  onClose,
  onOpenTask,
  lockWhileNested = false,
}) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!phase) return { tasks: [], done: 0, prog: 0, groups: 0 };
    const tasks = collectTasks(phase);
    const done = tasks.filter((t) => isDoneStatus(t.status)).length;
    const prog =
      phase.progress != null
        ? Math.round(Number(phase.progress) || 0)
        : tasks.length
          ? Math.round(tasks.reduce((s, t) => s + taskProgress(t), 0) / tasks.length)
          : 0;
    return {
      tasks,
      done,
      prog,
      groups: (phase.children || []).length,
    };
  }, [phase]);

  if (!phase) return null;

  const rangeLabel =
    phase.rangeStart && phase.rangeEnd
      ? `${fmtShortDate(phase.rangeStart)} – ${fmtShortDate(phase.rangeEnd)}`
      : 'No dated tasks';

  const openInHierarchy = () => {
    onClose?.();
    navigate(`/projects/${projectId}/hierarchy?phase=${phase.id}`);
  };

  const handleDialogClose = (_e, reason) => {
    if (lockWhileNested) return;
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      onClose?.();
      return;
    }
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      disableEscapeKeyDown={lockWhileNested}
      hideBackdrop={lockWhileNested}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: `${tokens.radius.dialog}px`,
          border: `1px solid ${tokens.colors.border}`,
          boxShadow: tokens.shadow.dialog,
          maxHeight: '90vh',
          width: { xs: '100%', sm: 680 },
          m: { xs: 1, sm: 2 },
        },
      }}
      slotProps={{
        backdrop: {
          sx: { bgcolor: 'rgba(15, 23, 42, 0.45)' },
        },
      }}
      TransitionProps={{ timeout: 200 }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                display: 'inline-block',
                px: 0.85,
                py: 0.25,
                mb: 1,
                borderRadius: '4px',
                bgcolor: tokens.colors.sidebar,
                color: '#FFFFFF',
                fontSize: '0.65rem',
                fontWeight: 750,
                letterSpacing: '0.05em',
              }}
            >
              PHASE
            </Box>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: tokens.colors.text,
                lineHeight: 1.3,
                pr: 1,
              }}
            >
              {phase.name}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', color: tokens.colors.textSecondary }}>
              {rangeLabel} · {stats.done}/{stats.tasks.length} done · {stats.prog}%
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: tokens.colors.textMuted }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={Math.min(100, stats.prog)}
          sx={{
            mt: 2,
            height: 8,
            borderRadius: 4,
            bgcolor: tokens.colors.progressTrack,
            '& .MuiLinearProgress-bar': {
              bgcolor: tokens.colors.primary,
              borderRadius: 4,
            },
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 1.75 }}
        >
          <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary }}>
            {stats.groups} categories / groups · {stats.tasks.length} tasks
          </Typography>
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
            onClick={openInHierarchy}
            sx={{
              ...btnSx,
              borderColor: tokens.colors.border,
              color: tokens.colors.text,
              bgcolor: '#FFFFFF',
              '&:hover': { borderColor: tokens.colors.primary, bgcolor: tokens.colors.primarySoft },
            }}
          >
            Open in Hierarchy
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          px: 2.5,
          py: 2,
          borderColor: tokens.colors.border,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        {!stats.groups && !stats.tasks.length ? (
          <Typography sx={{ fontSize: '0.875rem', color: tokens.colors.textSecondary, textAlign: 'center', py: 4 }}>
            No categories or tasks in this phase yet.
          </Typography>
        ) : (
          (phase.children || []).map((child) => (
            <CategoryContents key={child.id} node={child} onOpenTask={onOpenTask} />
          ))
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75 }}>
        <Button
          onClick={onClose}
          sx={{
            ...btnSx,
            border: `1px solid ${tokens.colors.border}`,
            color: tokens.colors.text,
            bgcolor: '#FFFFFF',
            px: 2,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
