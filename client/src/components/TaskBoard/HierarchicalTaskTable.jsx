import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowRight as CollapseIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { splitTitleAndDescription } from '../TaskDetailsDrawer';
import { getDeveloperDisplayName } from '../../utils/developerDisplay';
import { getOverdueDays } from '../../utils/taskManagementConstants';
import { ProgressCell, PriorityBadge, StatusBadge, StatusDot } from './Badges';
import TaskActionsMenu from './TaskActionsMenu';
import { ALL_STATUSES, phaseAccent, normalizeLegacyStatus } from './constants';

function InlineStatusSelect({ value, onChange, isDark, canEdit }) {
  if (!canEdit) return <StatusBadge status={value} isDark={isDark} />;
  const displayValue = normalizeLegacyStatus(value);
  return (
    <Select
      value={displayValue}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      size="small"
      variant="standard"
      disableUnderline
      sx={{ fontSize: '0.8125rem', maxWidth: 150 }}
      renderValue={(v) => <StatusBadge status={v} isDark={isDark} size="small" />}
    >
      {ALL_STATUSES.map((opt) => (
        <MenuItem key={opt} value={opt}>
          <StatusBadge status={opt} isDark={isDark} size="small" />
        </MenuItem>
      ))}
    </Select>
  );
}

function InlineDeveloperSelect({ value, onChange, developers, canEdit }) {
  const selected = developers.find((d) => d.id === value || d.id === parseInt(value, 10));
  const displayName = getDeveloperDisplayName(selected);
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const avatar = (
    <Avatar
      sx={{
        width: 24,
        height: 24,
        fontSize: '0.65rem',
        bgcolor: selected?.color || 'grey.300',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </Avatar>
  );

  if (!canEdit) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, maxWidth: 140 }}>
        {selected && avatar}
        <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.8125rem' }} noWrap>
          {displayName || '—'}
        </Typography>
      </Stack>
    );
  }

  return (
    <Select
      value={value || ''}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      size="small"
      variant="standard"
      disableUnderline
      sx={{ fontSize: '0.8125rem', minWidth: 120, maxWidth: 150 }}
      renderValue={() => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          {avatar}
          <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.8125rem' }} noWrap>
            {displayName || 'Unassigned'}
          </Typography>
        </Stack>
      )}
    >
      <MenuItem value="">
        <em>Unassigned</em>
      </MenuItem>
      {developers.map((dev) => {
        const label = getDeveloperDisplayName(dev);
        return (
          <MenuItem key={dev.id} value={dev.id}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{
                  width: 18,
                  height: 18,
                  fontSize: '0.55rem',
                  bgcolor: dev.color,
                  fontWeight: 700,
                }}
              >
                {label
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </Avatar>
              <Typography variant="caption" noWrap>
                {label}
              </Typography>
            </Stack>
          </MenuItem>
        );
      })}
    </Select>
  );
}

const headCellSx = {
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  bgcolor: (t) => (t.palette.mode === 'dark' ? '#1e293b' : '#F8FAFC'),
  borderBottom: '1px solid',
  borderColor: 'divider',
  whiteSpace: 'nowrap',
  py: 1.5,
  top: 0,
  zIndex: 3,
};

export default function HierarchicalTaskTable({
  phaseTree,
  developers,
  isDark,
  canStatus,
  canAssign,
  canEdit,
  isClient,
  priorityBadges,
  expandedPhases,
  expandedModules,
  onTogglePhase,
  onToggleModule,
  onRowClick,
  onDeleteTask,
  onStatusChange,
  onDeveloperChange,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  totalCount,
  primaryDelayTaskId = null,
  delayTaskMap = {},
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(15,23,42,0.05)',
      }}
    >
      <TableContainer
        sx={{
          maxHeight: 'calc(100vh - 320px)',
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 8, width: 8 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#CBD5E1',
            borderRadius: 8,
          },
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, minWidth: 280 }}>Task & Module</TableCell>
              <TableCell sx={headCellSx}>Task ID</TableCell>
              <TableCell sx={headCellSx}>Status</TableCell>
              {!isClient && <TableCell sx={headCellSx}>Developer</TableCell>}
              <TableCell sx={headCellSx}>Start Date</TableCell>
              <TableCell sx={headCellSx}>End Date</TableCell>
              <TableCell sx={headCellSx}>Priority</TableCell>
              <TableCell sx={headCellSx}>Progress</TableCell>
              {!isClient && (
                <TableCell sx={{ ...headCellSx, width: 56 }} align="center">
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {phaseTree.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isClient ? 7 : 9} sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary" fontWeight={600}>
                    No phases or modules match your filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              phaseTree.map((phase, phaseIdx) => {
                const phaseOpen = expandedPhases[phase.id] !== false;
                const accent = phaseAccent(phaseIdx);
                return (
                  <React.Fragment key={phase.id}>
                    {/* PHASE ROW */}
                    <TableRow
                      onClick={() => onTogglePhase(phase.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.95)',
                        '& td': {
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          py: 1.5,
                        },
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(241,245,249,1)',
                        },
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <TableCell colSpan={isClient ? 6 : 6} sx={{ pl: 1.5 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Box
                            sx={{
                              width: 4,
                              alignSelf: 'stretch',
                              minHeight: 36,
                              borderRadius: 2,
                              bgcolor: accent,
                              flexShrink: 0,
                            }}
                          />
                          <IconButton size="small" sx={{ p: 0.35 }}>
                            {phaseOpen ? (
                              <ExpandIcon fontSize="small" />
                            ) : (
                              <CollapseIcon fontSize="small" />
                            )}
                          </IconButton>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.9rem',
                                  letterSpacing: '-0.01em',
                                }}
                                noWrap
                              >
                                {phase.name}
                              </Typography>
                              <Chip
                                label={`${phase.taskCount} tasks`}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2FF',
                                  color: accent,
                                }}
                              />
                              {!isClient && phase.developerCount > 0 && (
                                <Chip
                                  label={`${phase.developerCount} devs`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontWeight: 600,
                                    fontSize: '0.68rem',
                                    bgcolor: 'transparent',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                />
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell colSpan={2}>
                        <ProgressCell
                          pct={phase.completionPct}
                          completed={phase.completedTasks}
                          total={phase.taskCount}
                          showFraction
                          width={100}
                        />
                      </TableCell>
                      {!isClient && <TableCell />}
                    </TableRow>

                    {/* MODULES */}
                    {phaseOpen &&
                      phase.modules.map((mod) => {
                        const modOpen = expandedModules[mod.id] !== false;
                        const moduleHasPrimaryDelay =
                          primaryDelayTaskId != null &&
                          mod.tasks.some((t) => String(t.id) === String(primaryDelayTaskId));
                        return (
                          <React.Fragment key={mod.id}>
                            <TableRow
                              onClick={() => onToggleModule(mod.id)}
                              sx={{
                                cursor: 'pointer',
                                bgcolor: moduleHasPrimaryDelay
                                  ? isDark
                                    ? 'rgba(239,68,68,0.08)'
                                    : 'rgba(254,242,242,0.7)'
                                  : isDark
                                    ? 'rgba(15,23,42,0.35)'
                                    : 'rgba(255,255,255,0.7)',
                                borderLeft: moduleHasPrimaryDelay ? '3px solid #FCA5A5' : undefined,
                                '& td': {
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  py: 1.25,
                                },
                                '&:hover': {
                                  bgcolor: isDark
                                    ? 'rgba(51,65,85,0.35)'
                                    : 'rgba(248,250,252,1)',
                                },
                              }}
                            >
                              <TableCell colSpan={isClient ? 6 : 6} sx={{ pl: 5 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <IconButton size="small" sx={{ p: 0.25 }}>
                                    {modOpen ? (
                                      <ExpandIcon sx={{ fontSize: 18 }} />
                                    ) : (
                                      <CollapseIcon sx={{ fontSize: 18 }} />
                                    )}
                                  </IconButton>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                      flexWrap="wrap"
                                    >
                                      <Typography
                                        sx={{
                                          fontWeight: 750,
                                          fontSize: '0.85rem',
                                          color: 'primary.main',
                                        }}
                                        noWrap
                                      >
                                        Module {mod.moduleId}
                                        {mod.name ? ` — ${mod.name}` : ''}
                                      </Typography>
                                      <Chip
                                        label={`${mod.taskCount} Tasks`}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                                        }}
                                      />
                                    </Stack>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        fontWeight: 600,
                                        display: 'block',
                                        mt: 0.25,
                                      }}
                                    >
                                      Progress {mod.completionPct}% · {mod.completedTasks} /{' '}
                                      {mod.taskCount} Completed
                                      {!isClient && mod.ownerName ? ` · ${mod.ownerName}` : ''}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell colSpan={2}>
                                <ProgressCell
                                  pct={mod.completionPct}
                                  completed={mod.completedTasks}
                                  total={mod.taskCount}
                                  width={88}
                                />
                              </TableCell>
                              {!isClient && <TableCell />}
                            </TableRow>

                            {/* TASKS */}
                            {modOpen &&
                              mod.tasks.map((task) => {
                                const title = splitTitleAndDescription(
                                  task.taskName,
                                  task.description
                                ).title;
                                const delayInfo = delayTaskMap[task.id];
                                const isPrimaryDelay =
                                  primaryDelayTaskId != null &&
                                  String(task.id) === String(primaryDelayTaskId);
                                const isContributor = delayInfo?.isContributor && !isPrimaryDelay;
                                return (
                                  <TableRow
                                    key={task.id}
                                    onClick={() => onRowClick(task)}
                                    sx={{
                                      cursor: 'pointer',
                                      bgcolor: isPrimaryDelay
                                        ? 'rgba(239,68,68,0.08)'
                                        : isContributor
                                          ? 'rgba(249,115,22,0.06)'
                                          : undefined,
                                      borderLeft: isPrimaryDelay ? '4px solid #EF4444' : undefined,
                                      '& td': {
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        py: 1.15,
                                        fontSize: '0.8125rem',
                                      },
                                      '&:hover': {
                                        bgcolor: isPrimaryDelay
                                          ? 'rgba(239,68,68,0.12)'
                                          : 'action.hover',
                                        '& .row-actions': { opacity: 1 },
                                      },
                                      transition: 'background 0.12s ease',
                                    }}
                                  >
                                    <TableCell sx={{ pl: 8, maxWidth: 320 }}>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ minWidth: 0 }}
                                      >
                                        <StatusDot status={task.status} isDark={isDark} />
                                        {isPrimaryDelay && (
                                          <Tooltip
                                            title={
                                              delayInfo?.explanation ||
                                              'Likely primary delay driver for this project'
                                            }
                                          >
                                            <Chip
                                              icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                                              label="Primary delay"
                                              size="small"
                                              sx={{
                                                height: 22,
                                                fontWeight: 800,
                                                fontSize: '0.62rem',
                                                bgcolor: '#FEE2E2',
                                                color: '#B91C1C',
                                                flexShrink: 0,
                                              }}
                                            />
                                          </Tooltip>
                                        )}
                                        <Typography
                                          sx={{
                                            fontWeight: 600,
                                            fontSize: '0.8125rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                          title={title}
                                        >
                                          {title || '—'}
                                        </Typography>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        sx={{
                                          fontWeight: 650,
                                          color: 'text.secondary',
                                          fontSize: '0.8rem',
                                          fontFamily: 'ui-monospace, monospace',
                                        }}
                                      >
                                        {task.taskId || '—'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <InlineStatusSelect
                                        value={task.status}
                                        onChange={(e) =>
                                          onStatusChange(task.id, e.target.value)
                                        }
                                        isDark={isDark}
                                        canEdit={canStatus}
                                      />
                                    </TableCell>
                                    {!isClient && (
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <InlineDeveloperSelect
                                        value={task.developerId}
                                        onChange={(e) =>
                                          onDeveloperChange(task.id, e.target.value)
                                        }
                                        developers={developers}
                                        canEdit={canAssign}
                                      />
                                    </TableCell>
                                    )}
                                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                      {task.startDate || '—'}
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                      {task.dueDate || '—'}
                                      {(() => {
                                        const daysLate = getOverdueDays(task);
                                        if (!daysLate) return null;
                                        return (
                                          <Chip
                                            size="small"
                                            label={`${daysLate}d late`}
                                            sx={{
                                              ml: 0.75,
                                              height: 20,
                                              fontSize: '0.65rem',
                                              fontWeight: 700,
                                              bgcolor: '#FEE2E2',
                                              color: '#B91C1C',
                                            }}
                                          />
                                        );
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      <PriorityBadge
                                        priority={task.priority}
                                        badges={priorityBadges}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <ProgressCell task={task} width={72} />
                                    </TableCell>
                                    {!isClient && (
                                    <TableCell
                                      align="center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <TaskActionsMenu
                                        task={task}
                                        canEdit={canEdit}
                                        canAssign={canAssign}
                                        canStatus={canStatus}
                                        onView={() => onRowClick(task)}
                                        onEdit={() => onRowClick(task, true)}
                                        onAssign={() => onRowClick(task, true)}
                                        onMoveStatus={() => onRowClick(task, true)}
                                        onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
                                      />
                                    </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Rows per page:"
        labelDisplayedRows={({ from, to, count }) =>
          `Showing ${from} to ${to} of ${count !== -1 ? count : `more than ${to}`} tasks`
        }
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'transparent' : '#FAFBFC'),
          '.MuiTablePagination-toolbar': {
            px: 2.5,
            minHeight: 56,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 1,
          },
          '.MuiTablePagination-spacer': { flex: '1 1 auto' },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-select':
            {
              fontSize: '0.8125rem',
              fontWeight: 600,
            },
        }}
      />
    </Paper>
  );
}
