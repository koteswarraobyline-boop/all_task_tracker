import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Stack,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  Paper,
  Chip,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  FolderOpen as ProjectsIcon,
  People as DevelopersIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  FactCheck as LogoIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  ListAlt as TasksIcon,
  CalendarMonth as CalendarIcon,
  Business as ClientIcon,
  ChevronRight as ChevronRightIcon,
  ManageAccounts as UsersIcon,
  ChevronLeft as ChevronLeftIcon,
  MenuOpen as MenuOpenIcon,
  Logout as LogoutIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useRole } from '../context/RoleContext';
import { Can } from './Can';
import { tokens } from '../theme';

const DRAWER_WIDTH = tokens.layout.sidebar;
const DRAWER_COLLAPSED = tokens.layout.sidebarCollapsed;
const SIDEBAR_GRADIENT = `linear-gradient(180deg, ${tokens.colors.sidebar} 0%, ${tokens.colors.sidebarEnd} 100%)`;

function NavItem({ text, icon, path, active, onNavigate, collapsed }) {
  const labelColor = active ? '#FFFFFF' : '#E2E8F0';
  const iconColor = active ? '#FFFFFF' : '#CBD5E1';

  const button = (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => onNavigate(path)}
        aria-current={active ? 'page' : undefined}
        sx={{
          borderRadius: `${tokens.radius.button}px`,
          py: 1.25,
          px: 2,
          minHeight: 44,
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: active
            ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
            : 'transparent',
          color: labelColor,
          '&:hover': {
            backgroundColor: active ? undefined : 'rgba(255,255,255,0.08)',
            background: active
              ? 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)'
              : undefined,
            color: '#FFFFFF',
            '& .MuiListItemIcon-root': { color: '#FFFFFF' },
            '& .MuiListItemText-primary': { color: '#FFFFFF' },
          },
          transition: tokens.motion.fast,
        }}
      >
        <ListItemIcon
          sx={{
            color: `${iconColor} !important`,
            minWidth: collapsed ? 0 : 40,
            justifyContent: 'center',
            '& .MuiSvgIcon-root': { fontSize: 22, color: 'inherit' },
          }}
        >
          {icon}
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={text}
            sx={{
              m: 0,
              '& .MuiTypography-root': {
                color: `${labelColor} !important`,
              },
            }}
            slotProps={{
              primary: {
                fontSize: '0.875rem',
                fontWeight: active ? 700 : 600,
                noWrap: true,
                sx: {
                  color: `${labelColor} !important`,
                  opacity: 1,
                },
              }
            }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );

  if (collapsed) {
    return (
      <Tooltip title={text} placement="right">
        {button}
      </Tooltip>
    );
  }
  return button;
}

export default function Layout({ children, mode, toggleMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { role, clientMeta, project: clientProject, logout, clearClientSession } = useRole();
  const isClient = role === 'client';

  const [userAnchorEl, setUserAnchorEl] = useState(null);
  const [activeProject, setActiveProject] = useState(null);

  const drawerWidth = sidebarCollapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const matchDashboard = matchPath('/projects/:id/dashboard', location.pathname);
  const matchTasks = matchPath('/projects/:id/tasks', location.pathname);
  const matchCalendar = matchPath('/projects/:id/calendar', location.pathname);
  const matchTimeline = matchPath('/projects/:id/timeline', location.pathname);
  const matchUpload = matchPath('/projects/upload', location.pathname);
  const clientMatch = matchPath('/client/:token/*', location.pathname);
  const clientToken = clientMatch?.params?.token || clientMeta?.token;

  const activeProjectId =
    matchDashboard?.params?.id ||
    matchTasks?.params?.id ||
    matchCalendar?.params?.id ||
    matchTimeline?.params?.id ||
    (isClient ? clientMeta?.projectId : null);

  useEffect(() => {
    if (isClient && clientProject) {
      setActiveProject(clientProject);
      return;
    }

    if (activeProjectId && !isClient) {
      const loadProject = async () => {
        try {
          const projects = await api.getProjects();
          const found = projects.find((p) => p.id === parseInt(activeProjectId, 10));
          if (found) setActiveProject(found);
        } catch (e) {
          console.error('Failed to load active project name for layout:', e);
        }
      };
      loadProject();
    } else if (!isClient) {
      setActiveProject(null);
    }
  }, [activeProjectId, isClient, clientProject]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const projectBasePath = isClient
    ? `/client/${clientToken}`
    : activeProject
      ? `/projects/${activeProject.id}`
      : null;

  const isDark = theme.palette.mode === 'dark';

  const handleLeaveClient = () => {
    clearClientSession();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  const profileInitial = isClient
    ? (clientMeta?.clientName || clientMeta?.company || 'C').charAt(0).toUpperCase()
    : 'A';
  const profileRoleLabel = isClient ? 'Client' : 'Admin';
  const profileSubtitle = isClient
    ? clientMeta?.clientName || clientMeta?.company || 'Read-only access'
    : 'Full workspace access';

  const drawerContent = (collapsed = false) => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: SIDEBAR_GRADIENT,
        color: '#E2E8F0',
        // Force readable light labels/icons on dark sidebar
        '& .MuiListItemButton-root:not([aria-current="page"]) .MuiListItemText-primary': {
          color: '#E2E8F0 !important',
        },
        '& .MuiListItemButton-root:not([aria-current="page"]) .MuiListItemIcon-root': {
          color: '#CBD5E1 !important',
        },
        '& .MuiListItemButton-root[aria-current="page"] .MuiListItemText-primary, & .MuiListItemButton-root[aria-current="page"] .MuiListItemIcon-root': {
          color: '#FFFFFF !important',
        },
        '& .MuiListItemIcon-root .MuiSvgIcon-root': {
          color: 'inherit !important',
        },
      }}
    >
      <Toolbar
        sx={{
          gap: 1.25,
          borderBottom: '1px solid',
          borderColor: 'rgba(148,163,184,0.16)',
          px: 2,
          minHeight: '64px !important',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <LogoIcon sx={{ fontSize: 28, color: tokens.colors.primary }} />
        {!collapsed && (
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            Task Tracker
          </Typography>
        )}
      </Toolbar>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 2,
          py: 3,
        }}
      >
        {!isClient && (
          <List sx={{ p: 0, mb: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <NavItem
              text="Projects"
              icon={<ProjectsIcon />}
              path="/projects"
              active={location.pathname === '/projects' || location.pathname === '/' || Boolean(matchUpload)}
              onNavigate={go}
              collapsed={collapsed}
            />
            <NavItem
              text="Developers"
              icon={<DevelopersIcon />}
              path="/developers"
              active={location.pathname === '/developers'}
              onNavigate={go}
              collapsed={collapsed}
            />
            <Can permission="users.manage">
              <NavItem
                text="User Management"
                icon={<UsersIcon />}
                path="/users"
                active={location.pathname === '/users'}
                onNavigate={go}
                collapsed={collapsed}
              />
            </Can>
          </List>
        )}

        {(activeProject || (isClient && clientProject)) && projectBasePath && (
          <Box sx={{ mt: isClient ? 0 : 2.5 }}>
            {!collapsed && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    mb: 1,
                    display: 'block',
                    color: '#94A3B8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  {isClient ? 'Shared Project' : 'Active Project'}
                </Typography>

                <Paper
                  variant="outlined"
                  sx={{
                    mx: 0,
                    mt: 1,
                    mb: 2.5,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(148,163,184,0.2)',
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 750,
                      color: '#A5B4FC',
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={(activeProject || clientProject)?.name}
                  >
                    {(activeProject || clientProject)?.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      mt: 0.75,
                      fontSize: '0.75rem',
                      minWidth: 0,
                      color: '#94A3B8',
                    }}
                  >
                    <ClientIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                    <Box
                      component="span"
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {isClient
                        ? clientMeta?.clientName || clientMeta?.company || 'Client View'
                        : (activeProject?.clientName || 'Internal Project')}
                    </Box>
                  </Typography>
                  {isClient && (
                    <Chip
                      size="small"
                      label="Read Only"
                      sx={{
                        mt: 1.25,
                        height: 22,
                        fontWeight: 750,
                        fontSize: '0.65rem',
                        bgcolor: 'rgba(59,130,246,0.2)',
                        color: '#93C5FD',
                        border: '1px solid rgba(147,197,253,0.35)',
                      }}
                    />
                  )}
                </Paper>
              </>
            )}

            <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(isClient
                ? [
                    { text: 'Overview', icon: <DashboardIcon />, path: `${projectBasePath}/overview` },
                    { text: 'Tasks', icon: <TasksIcon />, path: `${projectBasePath}/tasks` },
                    { text: 'Calendar', icon: <CalendarIcon />, path: `${projectBasePath}/calendar` },
                  ]
                : [
                    { text: 'Overview', icon: <DashboardIcon />, path: `${projectBasePath}/dashboard` },
                    { text: 'Tasks', icon: <TasksIcon />, path: `${projectBasePath}/tasks` },
                    { text: 'Calendar', icon: <CalendarIcon />, path: `${projectBasePath}/calendar` },
                  ]
              ).map((item) => (
                <NavItem
                  key={item.text}
                  text={item.text}
                  icon={item.icon}
                  path={item.path}
                  active={
                    item.text === 'Overview'
                      ? location.pathname.includes('/overview') || location.pathname.includes('/dashboard')
                      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                  }
                  onNavigate={(path) => {
                    go(path);
                  }}
                  collapsed={collapsed}
                />
              ))}
            </List>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 2, pb: 2, mt: 'auto' }}>
        {isClient && !collapsed && (
          <Paper
            elevation={0}
            sx={{
              mb: 2,
              p: 1.75,
              borderRadius: 2,
              bgcolor: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(147,197,253,0.25)',
            }}
          >
            
          </Paper>
        )}

        <Can permission="settings.view">
          <List sx={{ p: 0, mb: 1 }}>
            <NavItem
              text="Settings"
              icon={<SettingsIcon />}
              path="/settings"
              active={location.pathname === '/settings'}
              onNavigate={go}
              collapsed={collapsed}
            />
          </List>
        </Can>

        <Divider sx={{ borderColor: 'rgba(148,163,184,0.16)', mb: 1.5 }} />

        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
          <IconButton
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            sx={{
              width: '100%',
              borderRadius: `${tokens.radius.button}px`,
              py: 1,
              mb: 1,
              color: '#CBD5E1',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              display: { xs: 'none', md: 'inline-flex' },
              transition: tokens.motion.fast,
            }}
          >
            {collapsed ? <MenuOpenIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>

        {!isClient ? (
          collapsed ? (
            <Tooltip title={profileRoleLabel} placement="right">
              <IconButton
                onClick={(e) => setUserAnchorEl(e.currentTarget)}
                sx={{
                  width: '100%',
                  borderRadius: `${tokens.radius.button}px`,
                  py: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: tokens.colors.primary,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {profileInitial}
                </Avatar>
              </IconButton>
            </Tooltip>
          ) : (
            <Box
              onClick={(e) => setUserAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.25,
                borderRadius: `${tokens.radius.button}px`,
                cursor: 'pointer',
                transition: tokens.motion.fast,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: tokens.colors.primary,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {profileInitial}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{ fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}
                >
                  {profileRoleLabel}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: '#94A3B8', display: 'block', lineHeight: 1.3 }}
                >
                  {profileSubtitle}
                </Typography>
              </Box>
            </Box>
          )
        ) : (
          !collapsed && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.25,
                borderRadius: `${tokens.radius.button}px`,
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: tokens.colors.primary,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {profileInitial}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{ fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}
                >
                  {profileRoleLabel}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: '#94A3B8', display: 'block', lineHeight: 1.3 }}
                >
                  {profileSubtitle}
                </Typography>
              </Box>
            </Box>
          )
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }} className="theme-transition">
      <AppBar
        position="fixed"
        sx={{
          top: 0,
          right: 0,
          left: { xs: 0, md: `${drawerWidth}px` },
          transition: `left ${tokens.motion.sidebar}`,
          width: 'auto',
          borderRadius: 0,
          backgroundImage: 'none',
          backgroundColor: (t) => (t.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.92)'),
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          color: 'text.primary',
          zIndex: 1200,
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            px: { xs: 2, md: 3 },
            minHeight: `${tokens.layout.header}px !important`,
            height: tokens.layout.header,
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 1.5
            }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
              {isClient ? (
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    gap: 1.25,
                    flexWrap: "wrap"
                  }}>
                  <Chip
                    size="small"
                    label="Read only"
                    color="primary"
                    sx={{ height: 26, fontWeight: 700, fontSize: '0.75rem' }}
                  />
                  <span>{(activeProject || clientProject)?.name || 'Shared Project'}</span>
                </Stack>
              ) : activeProject ? (
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    gap: 1
                  }}>
                  <span style={{ color: theme.palette.text.secondary }}>Projects</span>
                  <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <span>{activeProject.name}</span>
                </Stack>
              ) : (
                <span>Workspace</span>
              )}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 1
            }}>
            <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
              <IconButton onClick={toggleMode} color="inherit" size="small">
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {isClient ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLeaveClient}
                sx={{ ml: 0.5, fontWeight: 700, borderRadius: 2 }}
              >
                Leave
              </Button>
            ) : (
              <>
                <Tooltip title="Account">
                  <IconButton onClick={(e) => setUserAnchorEl(e.currentTarget)} size="small" sx={{ p: 0, ml: 0.5 }}>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: tokens.colors.primary,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {profileInitial}
                    </Avatar>
                  </IconButton>
                </Tooltip>

              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Menu
        anchorEl={userAnchorEl}
        open={Boolean(userAnchorEl)}
        onClose={() => setUserAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { width: 220, mt: 1, p: 1 } }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{profileRoleLabel}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{profileSubtitle}</Typography>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <MenuItem
          onClick={() => {
            setUserAnchorEl(null);
            navigate('/settings');
          }}
        >
          Settings
        </MenuItem>
        <MenuItem
          onClick={() => {
            setUserAnchorEl(null);
            logout();
            navigate('/login');
          }}
        >
          Logout
        </MenuItem>
      </Menu>
      <Box
        component="nav"
        sx={{
          width: { xs: 0, md: 0 },
          flexShrink: 0,
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              background: SIDEBAR_GRADIENT,
              border: 'none',
            },
          }}
        >
          {drawerContent(false)}
        </Drawer>
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            position: 'fixed',
            width: drawerWidth,
            height: '100vh',
            top: 0,
            left: 0,
            borderRadius: 0,
            borderRight: '1px solid',
            borderColor: 'rgba(148,163,184,0.16)',
            background: SIDEBAR_GRADIENT,
            overflow: 'hidden',
            zIndex: 1100,
            transition: `width ${tokens.motion.sidebar}`,
          }}
        >
          {drawerContent(sidebarCollapsed)}
        </Box>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: `${tokens.layout.header}px`,
          pl: { xs: 0, md: `${drawerWidth}px` },
          pr: 0,
          pb: 0,
          width: '100%',
          maxWidth: '100%',
          minHeight: '100vh',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
          minWidth: 0,
          bgcolor: 'background.default',
          transition: `padding-left ${tokens.motion.sidebar}`,
          // Consistent scrollbars
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
          '&::-webkit-scrollbar': { width: 10, height: 10 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#CBD5E1',
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
