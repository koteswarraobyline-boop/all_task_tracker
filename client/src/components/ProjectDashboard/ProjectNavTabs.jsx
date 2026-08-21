import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab, Box } from '@mui/material';
import {
  Dashboard as OverviewIcon,
  ViewKanban as BoardIcon,
  Timeline as TimelineIcon,
  CalendarMonth as CalendarIcon,
  FolderOpen as FilesIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme';

const TAB_DEFS = [
  { key: 'overview', label: 'Overview', path: 'dashboard', icon: <OverviewIcon sx={{ fontSize: 18 }} /> },
  { key: 'tasks', label: 'Task Board', path: 'tasks', icon: <BoardIcon sx={{ fontSize: 18 }} /> },
  { key: 'timeline', label: 'Timeline', path: 'timeline', icon: <TimelineIcon sx={{ fontSize: 18 }} /> },
  { key: 'calendar', label: 'Calendar', path: 'calendar', icon: <CalendarIcon sx={{ fontSize: 18 }} /> },
  { key: 'files', label: 'Files', path: 'files', icon: <FilesIcon sx={{ fontSize: 18 }} /> },
  { key: 'settings', label: 'Settings', path: 'settings', icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
];

function tabIndexFromPath(pathname, projectId) {
  const base = `/projects/${projectId}/`;
  const suffix = pathname.startsWith(base) ? pathname.slice(base.length).split('/')[0] : '';
  const hit = TAB_DEFS.findIndex((t) => t.path === suffix || (t.path === 'dashboard' && suffix === 'dashboard'));
  if (hit >= 0) return hit;
  if (suffix === 'reports') return 0;
  return 0;
}

export default function ProjectNavTabs({ projectId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = tabIndexFromPath(location.pathname, projectId);

  if (!projectId) return null;

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 2,
        bgcolor: 'background.paper',
        borderRadius: `${tokens.radius.card}px`,
        px: { xs: 0.5, sm: 1 },
        boxShadow: tokens.shadow.card,
        border: '1px solid',
        borderColor: (t) => (t.palette.mode === 'dark' ? 'divider' : tokens.colors.border),
      }}
    >
      <Tabs
        value={active}
        onChange={(_e, idx) => {
          const tab = TAB_DEFS[idx];
          if (tab) navigate(`/projects/${projectId}/${tab.path}`);
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 48,
          '& .MuiTab-root': {
            minHeight: 48,
            gap: 0.75,
            fontWeight: 650,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.main', fontWeight: 750 },
          },
        }}
      >
        {TAB_DEFS.map((tab) => (
          <Tab
            key={tab.key}
            icon={tab.icon}
            iconPosition="start"
            label={tab.label}
            sx={{ textTransform: 'none' }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
