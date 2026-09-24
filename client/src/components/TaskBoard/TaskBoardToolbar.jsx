import React from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
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
  LayersOutlined as PhaseIcon,
  ViewModuleOutlined as ModuleIcon,
  PersonOutlined as DevIcon,
  DonutLargeOutlined as StatusIcon,
  EventBusyOutlined as OverdueIcon,
  ChevronRight as ChevronIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import FilterDropdown from './FilterDropdown';
import Can from '../Can';
import { ProjectHealthBadge } from '../DeliveryHealth';
import { ALL_STATUSES, STATUS_LABELS } from './constants';

const FILTER_CONTROL_HEIGHT = 36;

function ScrollStrip({ children }) {
  return (
    <Box
      sx={{
        overflowX: 'auto',
        overflowY: 'hidden',
        minWidth: 0,
        maxWidth: '100%',
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': { height: 5 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 8 },
      }}
    >
      <Box sx={{ display: 'inline-flex', flexWrap: 'nowrap', gap: 0.75, minWidth: 'min-content', pb: 0.25 }}>
        {children}
      </Box>
    </Box>
  );
}

function HeaderIconButton({ title, onClick, children, primary = false }) {
  return (
    <Tooltip title={title}>
      <IconButton
        onClick={onClick}
        size="small"
        aria-label={title}
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          border: primary ? 'none' : '1px solid',
          borderColor: 'divider',
          bgcolor: primary ? 'primary.main' : 'background.paper',
          color: primary ? '#fff' : 'text.secondary',
          '&:hover': {
            bgcolor: primary ? 'primary.dark' : 'action.hover',
          },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

function HeaderActions({ boardLayout, onBoardLayoutChange, isClient, onCalendar, onImportCsv, onAddTask }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        flexShrink: 0,
        p: 0.5,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <ViewToggle boardLayout={boardLayout} onBoardLayoutChange={onBoardLayoutChange} />
      {!isClient && (
        <>
          <HeaderIconButton title="Calendar" onClick={onCalendar}>
            <CalendarIcon sx={{ fontSize: 18 }} />
          </HeaderIconButton>
          <Can permission="task.edit">
            <HeaderIconButton title="Import CSV" onClick={onImportCsv}>
              <UploadIcon sx={{ fontSize: 18 }} />
            </HeaderIconButton>
            <HeaderIconButton title="Add Task" onClick={onAddTask} primary>
              <AddIcon sx={{ fontSize: 18 }} />
            </HeaderIconButton>
          </Can>
        </>
      )}
    </Stack>
  );
}
function ViewToggle({ boardLayout, onBoardLayoutChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={boardLayout}
      onChange={(_e, v) => v && onBoardLayoutChange(v)}
      sx={toggleSx}
      aria-label="View mode"
    >
      <Tooltip title="Table">
        <ToggleButton value="table" aria-label="Table view">
          <TableViewIcon sx={{ fontSize: 18 }} />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Kanban">
        <ToggleButton value="kanban" aria-label="Kanban view">
          <KanbanViewIcon sx={{ fontSize: 18 }} />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}

export default function TaskBoardToolbar({
  projectName,
  projectDeliveryStatus,
  breadcrumbProjectId,
  summarySlot,
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
  isClient,
}) {
  return (
    <Stack spacing={1} sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      {!isClient && breadcrumbProjectId && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
          <Link component={RouterLink} to="/projects" underline="hover" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', flexShrink: 0 }}>
            Projects
          </Link>
          <ChevronIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
          <Typography
            noWrap
            sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', minWidth: 0, maxWidth: { xs: 160, sm: 280 } }}
            title={projectName}
          >
            {projectName || 'Project'}
          </Typography>
        </Stack>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ minWidth: 0, gap: 1 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            component="h1"
            noWrap
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.25rem', md: '1.4rem' },
              letterSpacing: '-0.02em',
              minWidth: 0,
            }}
          >
            Task Board
          </Typography>
          {projectDeliveryStatus && !isClient && <ProjectHealthBadge status={projectDeliveryStatus} />}
        </Stack>

        <HeaderActions
          boardLayout={boardLayout}
          onBoardLayoutChange={onBoardLayoutChange}
          isClient={isClient}
          onCalendar={onCalendar}
          onImportCsv={onImportCsv}
          onAddTask={onAddTask}
        />
      </Stack>

      {summarySlot}

      <Paper
        elevation={0}
        sx={{
          p: 1.25,
          borderRadius: '14px',
          border: '1px solid',
          borderColor: 'divider',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Stack spacing={1}>
          <ScrollStrip>
            <FilterDropdown
              label="Phase"
              icon={<PhaseIcon sx={{ fontSize: 16 }} />}
              options={filterOptions.phases}
              value={filters.phases}
              onChange={(v) => onFilterChange('phases', v)}
              multiple
              searchable
              minWidth={100}
            />
            <FilterDropdown
              label="Module"
              icon={<ModuleIcon sx={{ fontSize: 16 }} />}
              options={filterOptions.modules}
              value={filters.modules}
              onChange={(v) => onFilterChange('modules', v)}
              multiple
              searchable
              minWidth={100}
            />
            <FilterDropdown
              label="Status"
              icon={<StatusIcon sx={{ fontSize: 16 }} />}
              options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] || s }))}
              value={filters.statuses}
              onChange={(v) => onFilterChange('statuses', v)}
              multiple
              searchable
              minWidth={100}
            />
            {!isClient && (
              <FilterDropdown
                label="Developer"
                icon={<DevIcon sx={{ fontSize: 16 }} />}
                options={filterOptions.developers}
                value={filters.developer}
                onChange={(v) => onFilterChange('developer', v)}
                searchable
                minWidth={108}
              />
            )}
            <FilterDropdown
              label="Overdue"
              icon={<OverdueIcon sx={{ fontSize: 16 }} />}
              options={[
                { value: '', label: 'All Tasks' },
                { value: 'overdue', label: `Overdue (${filterOptions.overdueCount ?? 0})` },
              ]}
              value={filters.overdueOnly ? 'overdue' : ''}
              onChange={(v) => onFilterChange('overdueOnly', v === 'overdue')}
              minWidth={100}
            />
          </ScrollStrip>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              size="small"
              fullWidth
              sx={{
                flex: 1,
                minWidth: 0,
                '& .MuiOutlinedInput-root': { height: FILTER_CONTROL_HEIGHT, borderRadius: '10px', fontSize: '0.8125rem' },
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
                      <IconButton size="small" onClick={() => onSearchChange('')} aria-label="Clear search">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
            {activeFilterCount > 0 && (
              <Button size="small" onClick={onClearFilters} sx={{ textTransform: 'none', fontWeight: 700, height: FILTER_CONTROL_HEIGHT, flexShrink: 0, whiteSpace: 'nowrap' }}>
                Clear filters
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

const toggleSx = {
  height: 36,
  bgcolor: 'transparent',
  borderRadius: '10px',
  p: 0,
  flexShrink: 0,
  boxShadow: 'none',
  '& .MuiToggleButton-root': {
    border: 'none',
    borderRadius: '8px !important',
    px: 0.75,
    py: 0.5,
    minWidth: 34,
    lineHeight: 0,
    '&.Mui-selected': { bgcolor: '#4F46E5', color: '#fff' },
  },
};
