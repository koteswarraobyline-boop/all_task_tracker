import React, { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
  IconButton,
  Button,
  Collapse,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import ProjectGantt from './ProjectGantt/ProjectGantt';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import {
  STATUS_FILTER_OPTIONS,
  PRIORITY_OPTIONS,
  getStatusColor,
  getStatusDisplayLabel,
  isWorkTask,
  filterAndSortTasks,
  computeProjectProgress,
} from '../utils/taskManagementConstants';
import { tokens } from '../theme';

const DEFAULT_FILTERS = {
  statusKey: 'all',
  priorities: [],
  developerId: '',
  search: '',
  quickFilter: '',
  sortBy: 'dueDate',
  sortOrder: 'asc',
  projectFilter: '',
  dateFrom: '',
  dateTo: '',
};

/**
 * Compact Overview “Project Timeline” — clean title, light filters, Gantt.
 */
export default function OverviewProjectTimeline({
  tasks = [],
  developers = [],
  projectName = '',
  loading = false,
  readonly = true,
  dark,
  onOpenFull,
  onTaskClick,
  onDatesChange,
  height = 380,
}) {
  const theme = useTheme();
  const isDark = dark ?? theme.palette.mode === 'dark';
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showMore, setShowMore] = useState(false);

  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  const filtered = useMemo(
    () => filterAndSortTasks(tasks, filters, projectName),
    [tasks, filters, projectName]
  );

  const workCount = useMemo(() => (tasks || []).filter(isWorkTask).length, [tasks]);
  const progress = useMemo(
    () => computeProjectProgress(filtered.length ? filtered : tasks),
    [filtered, tasks]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.statusKey !== 'all') n += 1;
    if ((filters.priorities || []).length) n += 1;
    if (filters.developerId) n += 1;
    if (filters.search) n += 1;
    if (filters.quickFilter) n += 1;
    return n;
  }, [filters]);

  const togglePriority = (key) => {
    const current = filters.priorities || [];
    const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
    set({ priorities: next });
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const hasDatedTasks = useMemo(
    () => filtered.some((t) => t.startDate || t.dueDate),
    [filtered]
  );

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      bgcolor: isDark ? 'action.hover' : '#fff',
      fontSize: '0.8125rem',
    },
    '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
  };

  return (
    <Paper
      id="timeline"
      elevation={0}
      sx={{
        borderRadius: `${tokens.radius.card}px`,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 1.75, md: 2 }, pt: 1.75, pb: 1.25 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25, gap: 1, flexWrap: 'wrap' }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography
              component="h2"
              sx={{ fontWeight: 750, fontSize: '0.95rem', letterSpacing: '-0.01em' }}
            >
              Project Timeline
            </Typography>
            <Chip
              size="small"
              label={`${progress}%`}
              sx={{
                height: 22,
                fontWeight: 700,
                fontSize: '0.7rem',
                bgcolor: isDark ? 'rgba(34,197,94,0.18)' : '#DCFCE7',
                color: isDark ? '#86EFAC' : '#166534',
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 650 }}>
              {filtered.length}/{workCount}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {onOpenFull ? (
              <Button
                size="small"
                variant="text"
                endIcon={<OpenIcon sx={{ fontSize: 13 }} />}
                onClick={onOpenFull}
                sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', minWidth: 0, px: 1 }}
              >
                Full view
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            sx={{ flex: 1, minWidth: 140, maxWidth: 260, ...fieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: filters.search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => set({ search: '' })} sx={{ p: 0.25 }}>
                    <ClearIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <TextField
            select
            size="small"
            value={filters.statusKey}
            onChange={(e) => set({ statusKey: e.target.value, quickFilter: '' })}
            sx={{ minWidth: 130, ...fieldSx }}
          >
            <MenuItem value="all">All status</MenuItem>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <MenuItem key={s.key} value={s.key}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            value={filters.developerId}
            onChange={(e) => set({ developerId: e.target.value })}
            sx={{ minWidth: 120, ...fieldSx }}
          >
            <MenuItem value="">Assignee</MenuItem>
            <MenuItem value="unassigned">Unassigned</MenuItem>
            {developers.map((d) => (
              <MenuItem key={d.id} value={String(d.id)}>
                {getDeveloperDisplayName(d)}
              </MenuItem>
            ))}
          </TextField>

          <IconButton
            size="small"
            onClick={() => setShowMore((v) => !v)}
            color={showMore || activeFilterCount ? 'primary' : 'default'}
            aria-label="More filters"
            sx={{
              border: '1px solid',
              borderColor: showMore || activeFilterCount ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              width: 34,
              height: 34,
            }}
          >
            <FilterIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {activeFilterCount > 0 && (
            <Button
              size="small"
              onClick={clearFilters}
              sx={{ fontWeight: 650, textTransform: 'none', fontSize: '0.75rem', minWidth: 0 }}
            >
              Clear
            </Button>
          )}
        </Stack>

        <Collapse in={showMore}>
          <Stack
            direction="row"
            flexWrap="wrap"
            useFlexGap
            sx={{ gap: 0.75, mt: 1.25, alignItems: 'center' }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.5 }}>
              Priority
            </Typography>
            {PRIORITY_OPTIONS.map((p) => {
              const active = (filters.priorities || []).includes(p.key);
              return (
                <Chip
                  key={p.key}
                  size="small"
                  label={p.label}
                  clickable
                  onClick={() => togglePriority(p.key)}
                  color={active ? 'warning' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  sx={{ height: 24, fontWeight: 700, fontSize: '0.7rem' }}
                />
              );
            })}
            <Chip
              size="small"
              label="Overdue"
              clickable
              onClick={() =>
                set({
                  quickFilter: filters.quickFilter === 'overdue' ? '' : 'overdue',
                  statusKey: 'all',
                })
              }
              color={filters.quickFilter === 'overdue' ? 'error' : 'default'}
              variant={filters.quickFilter === 'overdue' ? 'filled' : 'outlined'}
              sx={{ height: 24, fontWeight: 700, fontSize: '0.7rem' }}
            />
          </Stack>
        </Collapse>
      </Box>

      <Box sx={{ px: { xs: 1, md: 1.5 }, pb: 1.5, pt: 0.25 }}>
        {loading ? (
          <Skeleton variant="rounded" height={height} sx={{ borderRadius: 1.5 }} />
        ) : !workCount ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: 'text.secondary' }}>
              No tasks to show on the timeline yet.
            </Typography>
          </Box>
        ) : !filtered.length ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', mb: 1 }}>
              No matching tasks
            </Typography>
            <Button size="small" onClick={clearFilters} sx={{ fontWeight: 700, textTransform: 'none' }}>
              Clear filters
            </Button>
          </Box>
        ) : !hasDatedTasks ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: 'text.secondary', mb: 1 }}>
              No start/due dates set for these tasks.
            </Typography>
            {filtered.slice(0, 4).map((t) => (
              <Chip
                key={t.id}
                size="small"
                label={getStatusDisplayLabel(t.status)}
                onClick={() => onTaskClick?.(t)}
                sx={{
                  m: 0.35,
                  height: 22,
                  fontWeight: 650,
                  fontSize: '0.68rem',
                  bgcolor: `${getStatusColor(t.status)}18`,
                  color: getStatusColor(t.status),
                }}
              />
            ))}
          </Box>
        ) : (
          <ProjectGantt
            tasks={filtered}
            developers={developers}
            readonly={readonly}
            dark={isDark}
            compact
            onTaskClick={onTaskClick}
            onDatesChange={onDatesChange}
            height={Math.max(height, 380)}
          />
        )}
      </Box>
    </Paper>
  );
}
