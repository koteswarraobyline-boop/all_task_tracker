import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab, Box } from '@mui/material';
import {
  Dashboard as OverviewIcon,
  ViewKanban as BoardIcon,
  Timeline as TimelineIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  AccountTree as HierarchyIcon,
  Map as RoadmapIcon,
  Groups as TeamIcon,
  ChatBubbleOutlined as CommentsIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme';

const TAB_DEFS = [
  { key: 'overview', label: 'Overview', path: 'overview', icon: <OverviewIcon sx={{ fontSize: 18 }} /> },
  { key: 'hierarchy', label: 'Hierarchy', path: 'hierarchy', icon: <HierarchyIcon sx={{ fontSize: 18 }} /> },
  { key: 'roadmap', label: 'Roadmap', path: 'roadmap', icon: <RoadmapIcon sx={{ fontSize: 18 }} /> },
  { key: 'tasks', label: 'Task Board', path: 'tasks', icon: <BoardIcon sx={{ fontSize: 18 }} /> },
  { key: 'timeline', label: 'Timeline', path: 'timeline', icon: <TimelineIcon sx={{ fontSize: 18 }} /> },
  { key: 'calendar', label: 'Calendar', path: 'calendar', icon: <CalendarIcon sx={{ fontSize: 18 }} /> },
  { key: 'team', label: 'Team', path: 'team', icon: <TeamIcon sx={{ fontSize: 18 }} /> },
  { key: 'comments', label: 'Comments', path: 'comments', icon: <CommentsIcon sx={{ fontSize: 18 }} /> },
  { key: 'analytics', label: 'Analytics', path: 'dashboard', icon: <AnalyticsIcon sx={{ fontSize: 18 }} /> },
  { key: 'settings', label: 'Settings', path: 'settings', icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
];

function tabIndexFromPath(pathname, projectId) {
  const base = `/projects/${projectId}/`;
  const suffix = pathname.startsWith(base) ? pathname.slice(base.length).split('/')[0] : '';
  const hit = TAB_DEFS.findIndex((t) => t.path === suffix);
  if (hit >= 0) return hit;
  if (suffix === 'reports') return TAB_DEFS.findIndex((t) => t.path === 'dashboard');
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
        mb: 2,
        bgcolor: 'background.paper',
        borderRadius: `${tokens.radius.card}px`,
        px: { xs: 0.5, sm: 1 },
        boxShadow: tokens.shadow.card,
        border: '1px solid',
        borderColor: 'divider',
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
          '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          '& .MuiTab-root': {
            minHeight: 48,
            px: { xs: 1.5, sm: 2 },
            gap: 0.75,
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.main', fontWeight: 700 },
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
