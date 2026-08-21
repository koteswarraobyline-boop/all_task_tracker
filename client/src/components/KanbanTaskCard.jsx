import React, { memo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Schedule as DueIcon,
  AccessTime as HoursIcon,
} from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { splitTitleAndDescription } from './TaskDetailsDrawer';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { getTaskProgressPercent } from '../utils/taskProgress';
import { initials } from '../utils/formatters';

const CARD_MIN_HEIGHT = 168;
const CHIP_SX = {
  height: 22,
  fontSize: '0.6875rem',
  fontWeight: 700,
  borderRadius: '6px',
  maxWidth: 128,
  '& .MuiChip-label': {
    px: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

const MODULE_CHIP = {
  ...CHIP_SX,
  bgcolor: '#F1F5F9',
  color: '#334155',
  border: '1px solid #E2E8F0',
};

const FEATURE_CHIP = {
  ...CHIP_SX,
  bgcolor: '#EEF2FF',
  color: '#3730A3',
  border: '1px solid #C7D2FE',
};

const PRIORITY_SX = {
  Critical: { bgcolor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
  High: { bgcolor: '#FFEDD5', color: '#9A3412', border: '1px solid #FED7AA' },
  P0: { bgcolor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
  P1: { bgcolor: '#FFEDD5', color: '#9A3412', border: '1px solid #FED7AA' },
  Medium: { bgcolor: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
  P2: { bgcolor: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
  Low: { bgcolor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' },
  P3: { bgcolor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' },
};

function priorityStyle(priority) {
  const key = Object.keys(PRIORITY_SX).find(
    (k) => k.toLowerCase() === String(priority || '').toLowerCase()
  );
  return { ...CHIP_SX, ...(PRIORITY_SX[key] || PRIORITY_SX.Medium) };
}

function formatDue(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

function progressFill(status, columnAccent) {
  if (status === 'Completed') return '#16A34A';
  if (status === 'Blocked') return '#DC2626';
  if (status === 'Testing' || status === 'Code Review') return '#D97706';
  if (status === 'In Development') return '#4F46E5';
  if (status === 'Assigned') return '#2563EB';
  return columnAccent || '#64748B';
}

function KanbanTaskCard({
  task,
  columnAccent,
  canStatus,
  canEdit = false,
  onOpen,
  onEdit,
  isDragOverlay = false,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(task.id),
    disabled: !canStatus || isDragOverlay,
    data: { type: 'task', task },
  });

  const { title, description } = splitTitleAndDescription(task.taskName, task.description);
  const pct = getTaskProgressPercent(task);
  const fill = progressFill(task.status, columnAccent);
  const assigneeName = getDeveloperDisplayName(task.developer) || null;
  const due = formatDue(task.dueDate);
  const tags = String(task.tags || '')
    .split(/[,|]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 2);
  const hours = task.estimatedHours != null ? Number(task.estimatedHours) : null;
  const overdue =
    Boolean(task.dueDate) && task.status !== 'Completed' && new Date(task.dueDate) < new Date();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const openMenu = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuAnchor(e.currentTarget);
  };

  return (
    <>
      <Paper
        ref={isDragOverlay ? undefined : setNodeRef}
        style={isDragOverlay ? undefined : style}
        {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        elevation={0}
        role="article"
        tabIndex={isDragOverlay ? -1 : 0}
        aria-label={`Task ${title}, ${pct}% complete, ${task.status || 'unknown status'}`}
        onClick={() => onOpen?.(task)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen?.(task);
          }
        }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 2,
          mb: 1.5,
          minHeight: CARD_MIN_HEIGHT,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: isDragOverlay ? '#2563EB' : '#E2E8F0',
          bgcolor: '#FFFFFF',
          cursor: canStatus ? 'grab' : 'pointer',
          boxShadow: isDragOverlay
            ? '0 16px 40px rgba(37,99,235,0.28), 0 0 0 2px rgba(37,99,235,0.2)'
            : '0 1px 3px rgba(15,23,42,0.06)',
          transform: isDragOverlay ? 'rotate(1.5deg) scale(1.02)' : undefined,
          transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
          outline: 'none',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
            borderColor: `${columnAccent}66`,
            transform: isDragOverlay ? 'rotate(1.5deg) scale(1.02)' : 'translateY(-2px)',
          },
          '&:focus-visible': {
            boxShadow: `0 0 0 3px ${columnAccent}44`,
            borderColor: columnAccent,
          },
          '&:active': {
            cursor: canStatus ? 'grabbing' : 'pointer',
          },
          userSelect: 'none',
          touchAction: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Title row */}
        <Stack
          direction="row"
          sx={{
            alignItems: "flex-start",
            gap: 0.5,
            minHeight: 40
          }}>
          <Typography
            component="h3"
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: 700,
              fontSize: '0.875rem',
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
              color: '#0F172A',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {title}
          </Typography>
          {(canEdit || canStatus) && (
          <IconButton
            size="small"
            aria-label={`More actions for ${title}`}
            onClick={openMenu}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{
              mt: -0.5,
              mr: -0.75,
              width: 32,
              height: 32,
              color: '#64748B',
              flexShrink: 0,
              '&:focus-visible': { outline: '2px solid #2563EB', outlineOffset: 1 },
            }}
          >
            <MoreIcon sx={{ fontSize: 18 }} />
          </IconButton>
          )}
        </Stack>

        {/* Description — reserved space for alignment */}
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#64748B',
            lineHeight: 1.45,
            minHeight: 34,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {description || '\u00A0'}
        </Typography>

        {/* Badges */}
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 1,
            flexWrap: "wrap",
            minHeight: 22,
            alignItems: 'center'
          }}>
          {task.module ? <Chip size="small" label={task.module} sx={MODULE_CHIP} /> : null}
          {task.feature ? <Chip size="small" label={task.feature} sx={FEATURE_CHIP} /> : null}
          <Chip size="small" label={task.priority || 'Medium'} sx={priorityStyle(task.priority)} />
          {tags.map((tag) => (
            <Chip
              key={tag}
              size="small"
              label={tag}
              sx={{ ...CHIP_SX, bgcolor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}
            />
          ))}
        </Stack>

        {/* Progress — single source of truth */}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            mt: 'auto'
          }}>
          <Box sx={{ flex: 1, minWidth: 0 }} aria-hidden>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 6,
                borderRadius: 99,
                bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 99,
                  bgcolor: fill,
                  transition: 'transform 300ms ease',
                },
              }}
            />
          </Box>
          <Typography
            aria-label={`${pct} percent complete`}
            sx={{
              fontSize: '0.75rem',
              fontWeight: 750,
              color: '#475569',
              minWidth: 36,
              textAlign: 'right',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {pct}%
          </Typography>
        </Stack>

        {/* Footer */}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            minHeight: 28
          }}>
          <Tooltip title={assigneeName || 'Unassigned'}>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                gap: 1,
                minWidth: 0,
                flex: 1
              }}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  bgcolor: assigneeName ? task.developer?.color || columnAccent : '#E2E8F0',
                  color: assigneeName ? '#fff' : '#94A3B8',
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {assigneeName ? initials(assigneeName) : '?'}
              </Avatar>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {assigneeName || 'Unassigned'}
              </Typography>
            </Stack>
          </Tooltip>

          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 1,
              flexShrink: 0
            }}>
            {hours != null && !Number.isNaN(hours) && hours > 0 ? (
              <Tooltip title={`${hours} estimated hours`}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    gap: 0.35,
                    color: '#64748B'
                  }}>
                  <HoursIcon sx={{ fontSize: 14 }} aria-hidden />
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700 }}>{hours}h</Typography>
                </Stack>
              </Tooltip>
            ) : null}
            {due ? (
              <Tooltip title={`Due ${due}${overdue ? ' (overdue)' : ''}`}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    gap: 0.35,
                    color: overdue ? '#DC2626' : '#64748B'
                  }}>
                  <DueIcon sx={{ fontSize: 14 }} aria-hidden />
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700 }}>{due}</Typography>
                </Stack>
              </Tooltip>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
      {(canEdit || canStatus) && (
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        MenuListProps={{ 'aria-label': 'Task actions' }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onOpen?.(task);
          }}
        >
          Open details
        </MenuItem>
        {canEdit ? (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onEdit?.(task);
            }}
          >
            Edit
          </MenuItem>
        ) : null}
      </Menu>
      )}
    </>
  );
}

export default memo(KanbanTaskCard, (prev, next) => {
  if (prev.isDragOverlay !== next.isDragOverlay) return false;
  if (prev.canStatus !== next.canStatus) return false;
  if (prev.canEdit !== next.canEdit) return false;
  if (prev.columnAccent !== next.columnAccent) return false;
  const a = prev.task;
  const b = next.task;
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.taskName === b.taskName &&
    a.description === b.description &&
    a.priority === b.priority &&
    a.module === b.module &&
    a.feature === b.feature &&
    a.dueDate === b.dueDate &&
    a.estimatedHours === b.estimatedHours &&
    a.progressPercent === b.progressPercent &&
    a.developerId === b.developerId &&
    a.updatedAt === b.updatedAt
  );
});

export function KanbanAssigneeStack({ developers = [], max = 4 }) {
  if (!developers.length) return null;
  return (
    <AvatarGroup
      max={max}
      sx={{
        justifyContent: 'flex-start',
        '& .MuiAvatar-root': {
          width: 24,
          height: 24,
          fontSize: '0.625rem',
          fontWeight: 700,
          border: '2px solid #fff',
        },
      }}
    >
      {developers.map((d) => (
        <Tooltip key={d.id} title={d.name || 'Assignee'}>
          <Avatar sx={{ bgcolor: d.color || '#2563EB' }} aria-label={d.name}>
            {initials(d.name)}
          </Avatar>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
}
