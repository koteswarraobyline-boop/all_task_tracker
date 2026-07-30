import React from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  CalendarTodayOutlined as CalendarIcon,
  ViewList as TableViewIcon,
  ViewKanban as KanbanViewIcon,
  FilterList as FilterIcon,
  LayersOutlined as PhaseIcon,
  ViewModuleOutlined as ModuleIcon,
  PersonOutlined as DevIcon,
  FlagOutlined as PriorityIcon,
  DonutLargeOutlined as StatusIcon,
  TimelineOutlined as SprintIcon,
} from '@mui/icons-material';
import FilterDropdown from './FilterDropdown';
import Can from '../Can';
import { ALL_STATUSES, STATUS_LABELS, getStatusStyle } from './constants';

export default function TaskBoardToolbar({
  boardLayout,
  onBoardLayoutChange,
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
  filterOptions,
  onCalendar,
  onImportCsv,
  onAddTask,
  onAddSprint,
  isClient,
  statusCounts,
  onStatusChipClick,
  activeStatusFilters = [],
  isDark = false,
}) {
  return (
    <Stack spacing={2}>
      {/* Header — matches mockup */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              lineHeight: 1.15,
              color: 'text.primary',
            }}
          >
            Task Board
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}
          >
            Plan, track and manage all project tasks in one place.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
        >
          {!isClient && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CalendarIcon />}
              onClick={onCalendar}
              sx={actionBtnSx}
            >
              Calendar
            </Button>
          )}
          {!isClient && (
            <Can permission="task.edit">
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={onImportCsv}
                sx={actionBtnSx}
              >
                Import CSV
              </Button>
              <Button
                variant="text"
                size="small"
                startIcon={<AddIcon />}
                onClick={onAddTask}
                sx={{
                  ...actionBtnSx,
                  color: 'primary.main',
                  fontWeight: 700,
                }}
              >
                Add Task
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={onAddSprint}
                sx={{
                  ...actionBtnSx,
                  bgcolor: '#5B5CE2',
                  boxShadow: '0 4px 14px rgba(91,92,226,0.35)',
                  '&:hover': { bgcolor: '#4A4BD0' },
                }}
              >
                Add Sprint
              </Button>
            </Can>
          )}
        </Stack>
      </Stack>

      {/* Filter toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
        >
          <FilterDropdown
            label="Phase"
            icon={<PhaseIcon sx={{ fontSize: 16 }} />}
            options={filterOptions.phases}
            value={filters.phases}
            onChange={(v) => onFilterChange('phases', v)}
            multiple
            searchable
            searchPlaceholder="Search phase..."
            allLabel="Select All"
            minWidth={120}
          />
          <FilterDropdown
            label="Module"
            icon={<ModuleIcon sx={{ fontSize: 16 }} />}
            options={filterOptions.modules}
            value={filters.modules}
            onChange={(v) => onFilterChange('modules', v)}
            multiple
            searchable
            searchPlaceholder="Search module..."
            allLabel="Select All"
            minWidth={120}
          />
          <FilterDropdown
            label="Status"
            icon={<StatusIcon sx={{ fontSize: 16 }} />}
            options={ALL_STATUSES.map((s) => ({
              value: s,
              label: STATUS_LABELS[s] || s,
            }))}
            value={filters.statuses}
            onChange={(v) => onFilterChange('statuses', v)}
            multiple
            searchable
            searchPlaceholder="Search status..."
            allLabel="Select All"
            minWidth={120}
          />
          {!isClient && (
            <FilterDropdown
              label="Developer"
              icon={<DevIcon sx={{ fontSize: 16 }} />}
              options={filterOptions.developers}
              value={filters.developer}
              onChange={(v) => onFilterChange('developer', v)}
              searchable
              searchPlaceholder="Search developer..."
              minWidth={130}
            />
          )}
          <FilterDropdown
            label="Priority"
            icon={<PriorityIcon sx={{ fontSize: 16 }} />}
            options={filterOptions.priorities}
            value={filters.priority}
            onChange={(v) => onFilterChange('priority', v)}
            minWidth={120}
          />
          <FilterDropdown
            label="Sprint"
            icon={<SprintIcon sx={{ fontSize: 16 }} />}
            options={filterOptions.sprints}
            value={filters.sprint}
            onChange={(v) => onFilterChange('sprint', v)}
            searchable
            searchPlaceholder="Search sprint..."
            minWidth={120}
          />

          <TextField
            placeholder="Search Tasks"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            size="small"
            sx={{
              flex: { xs: '1 1 100%', sm: '1 1 180px' },
              minWidth: { xs: '100%', sm: 180 },
              maxWidth: { md: 260 },
              ml: { md: 'auto' },
              '& .MuiOutlinedInput-root': {
                height: 36,
                borderRadius: '10px',
                fontSize: '0.8125rem',
                bgcolor: 'background.paper',
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => onSearchChange('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          {activeFilterCount > 0 && (
            <Button
              size="small"
              onClick={onClearFilters}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                color: 'text.secondary',
                height: 36,
                px: 1,
              }}
            >
              Clear All
            </Button>
          )}

          <Chip
            icon={<FilterIcon sx={{ fontSize: '16px !important' }} />}
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      minWidth: 18,
                      height: 18,
                      px: 0.5,
                      borderRadius: '999px',
                      bgcolor: '#2563EB',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {activeFilterCount}
                  </Box>
                )}
              </Stack>
            }
            size="small"
            sx={{
              height: 36,
              borderRadius: '10px',
              fontWeight: 700,
              bgcolor: activeFilterCount ? 'rgba(37,99,235,0.08)' : '#F8FAFC',
              color: activeFilterCount ? '#2563EB' : 'text.secondary',
              border: '1px solid',
              borderColor: activeFilterCount ? 'rgba(37,99,235,0.25)' : 'divider',
              '& .MuiChip-icon': {
                color: activeFilterCount ? '#2563EB' : 'text.secondary',
              },
            }}
          />
        </Stack>
      </Paper>

      {/* View toggle + status chips + group by */}
      {boardLayout !== 'kanban' ? (
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            useFlexGap
            flexWrap="wrap"
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={boardLayout}
              onChange={(_e, v) => v && onBoardLayoutChange(v)}
              sx={toggleSx}
            >
              <ToggleButton value="table">
                <TableViewIcon sx={{ fontSize: 16 }} />
                Table
              </ToggleButton>
              <ToggleButton value="kanban">
                <KanbanViewIcon sx={{ fontSize: 16 }} />
                Kanban
              </ToggleButton>
            </ToggleButtonGroup>

            {ALL_STATUSES.map((status) => {
              const count = statusCounts?.[status] ?? 0;
              const active = activeStatusFilters.includes(status);
              const style = getStatusStyle(status, isDark);
              const label = STATUS_LABELS[status] || status;
              return (
                <Chip
                  key={status}
                  label={`${label} (${count})`}
                  size="small"
                  onClick={() => onStatusChipClick?.(status)}
                  sx={{
                    height: 28,
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    bgcolor: active ? style.color : style.bgcolor,
                    color: active ? '#fff' : style.color,
                    border: style.border,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      filter: 'brightness(0.97)',
                      boxShadow: '0 2px 6px rgba(15,23,42,0.08)',
                    },
                  }}
                />
              );
            })}
          </Stack>

          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              px: 1.25,
              py: 0.75,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              alignSelf: { xs: 'flex-start', lg: 'center' },
            }}
          >
            Group by: Phase › Module
          </Typography>
        </Stack>
      ) : (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={boardLayout}
          onChange={(_e, v) => v && onBoardLayoutChange(v)}
          sx={toggleSx}
        >
          <ToggleButton value="table">
            <TableViewIcon sx={{ fontSize: 16 }} />
            Table
          </ToggleButton>
          <ToggleButton value="kanban">
            <KanbanViewIcon sx={{ fontSize: 16 }} />
            Kanban
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </Stack>
  );
}

const actionBtnSx = {
  height: 36,
  borderRadius: '10px',
  textTransform: 'none',
  fontWeight: 700,
  fontSize: '0.8125rem',
  whiteSpace: 'nowrap',
  px: 1.5,
};

const toggleSx = {
  height: 34,
  bgcolor: '#F1F5F9',
  borderRadius: '10px',
  p: 0.25,
  border: 'none',
  '& .MuiToggleButton-root': {
    border: 'none',
    borderRadius: '8px !important',
    px: 1.25,
    textTransform: 'none',
    fontWeight: 700,
    fontSize: '0.78rem',
    gap: 0.5,
    color: 'text.secondary',
    '&.Mui-selected': {
      bgcolor: '#0F172A',
      color: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
      '&:hover': { bgcolor: '#1E293B' },
    },
  },
};
