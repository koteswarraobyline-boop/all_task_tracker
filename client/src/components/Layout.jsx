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
  InputBase,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  Collapse,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  FolderOpen as ProjectsIcon,
  People as DevelopersIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  FactCheck as LogoIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  ListAlt as TasksIcon,
  Timeline as ReportsIcon,
  Business as ClientIcon,
  ChevronRight as ChevronRightIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import api from '../services/api';

const DRAWER_WIDTH = 260;

// Mock notifications list
const MOCK_NOTIFICATIONS = [
  { id: 1, text: 'John Doe completed OAuth Login (T-1001)', time: '5m ago', read: false },
  { id: 2, text: 'Jane Smith started working on Stats Cards (T-1003)', time: '20m ago', read: false },
  { id: 3, text: 'CSV File sample_tasks.csv imported successfully', time: '1h ago', read: true },
];

export default function Layout({ children, mode, toggleMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Menu Anchors
  const [notiAnchorEl, setNotiAnchorEl] = useState(null);
  const [userAnchorEl, setUserAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  // Active project state
  const [activeProject, setActiveProject] = useState(null);

  // Extract projectId from URL if present
  // Matches '/projects/:id/tasks', '/projects/:id/dashboard', '/projects/:id/reports'
  const matchDashboard = matchPath('/projects/:id/dashboard', location.pathname);
  const matchTasks = matchPath('/projects/:id/tasks', location.pathname);
  const matchReports = matchPath('/projects/:id/reports', location.pathname);
  const matchUpload = matchPath('/projects/upload', location.pathname);
  
  const activeProjectId = matchDashboard?.params?.id || matchTasks?.params?.id || matchReports?.params?.id;

  useEffect(() => {
    if (activeProjectId) {
      const loadProject = async () => {
        try {
          const projects = await api.getProjects();
          const found = projects.find(p => p.id === parseInt(activeProjectId));
          if (found) {
            setActiveProject(found);
          }
        } catch (e) {
          console.error('Failed to load active project name for layout:', e);
        }
      };
      loadProject();
    } else {
      setActiveProject(null);
    }
  }, [activeProjectId]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNotiClick = (e) => {
    setNotiAnchorEl(e.currentTarget);
  };

  const handleNotiClose = () => {
    setNotiAnchorEl(null);
  };

  const handleUserClick = (e) => {
    setUserAnchorEl(e.currentTarget);
  };

  const handleUserClose = () => {
    setUserAnchorEl(null);
  };

  const markAllNotiRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadNotiCount = notifications.filter(n => !n.read).length;
  const isDark = theme.palette.mode === 'dark';

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Brand Logo Header */}
      <Toolbar sx={{ gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', px: 2.5 }}>
        <LogoIcon color="primary" sx={{ fontSize: 26 }} />
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 800, 
            fontSize: '1.1rem',
            letterSpacing: '-0.02em', 
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}
        >
          DevTask Tracker
        </Typography>
      </Toolbar>

      {/* Navigation Links */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 2.5 }}>
        {/* Core Items */}
        <List sx={{ p: 0, mb: 2 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => { navigate('/projects'); setMobileOpen(false); }}
              sx={{
                borderRadius: 3,
                py: 1.1,
                px: 2,
                backgroundColor: location.pathname === '/projects' || location.pathname === '/' || matchUpload ? 'primary.main' : 'transparent',
                color: location.pathname === '/projects' || location.pathname === '/' || matchUpload ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  backgroundColor: location.pathname === '/projects' || location.pathname === '/' || matchUpload ? 'primary.dark' : (isDark ? '#1f293750' : '#f1f5f9'),
                },
                transition: 'all 0.2s',
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                <ProjectsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Projects" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => { navigate('/developers'); setMobileOpen(false); }}
              sx={{
                borderRadius: 3,
                py: 1.1,
                px: 2,
                backgroundColor: location.pathname === '/developers' ? 'primary.main' : 'transparent',
                color: location.pathname === '/developers' ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  backgroundColor: location.pathname === '/developers' ? 'primary.dark' : (isDark ? '#1f293750' : '#f1f5f9'),
                },
                transition: 'all 0.2s',
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                <DevelopersIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Developers" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        </List>

        {/* Project Specific Section */}
        {activeProject && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" sx={{ px: 2, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              Active Project
            </Typography>

            {/* Active Project Card */}
            <Paper
              variant="outlined"
              sx={{
                mx: 1,
                mt: 1.5,
                mb: 2.5,
                p: 1.8,
                borderRadius: 3,
                bgcolor: isDark ? '#1f293720' : '#f8fafc',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 750, color: 'primary.main' }}>
                {activeProject.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <ClientIcon sx={{ fontSize: 12 }} />
                {activeProject.clientName || 'Internal Project'}
              </Typography>
            </Paper>

            <List sx={{ p: 0 }}>
              {[
                { text: 'Task Board', icon: <TasksIcon fontSize="small" />, path: `/projects/${activeProject.id}/tasks` },
                { text: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: `/projects/${activeProject.id}/dashboard` },
                { text: 'Reports', icon: <ReportsIcon fontSize="small" />, path: `/projects/${activeProject.id}/reports` },
              ].map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => { navigate(item.path); setMobileOpen(false); }}
                      sx={{
                        borderRadius: 3,
                        py: 1.1,
                        px: 2,
                        backgroundColor: isActive ? 'primary.main' : 'transparent',
                        color: isActive ? 'primary.contrastText' : 'text.primary',
                        '&:hover': {
                          backgroundColor: isActive ? 'primary.dark' : (isDark ? '#1f293750' : '#f1f5f9'),
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 500 }} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Settings at Sidebar bottom */}
      <Box sx={{ px: 2, py: 2 }}>
        <List sx={{ p: 0 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => { navigate('/settings'); setMobileOpen(false); }}
              sx={{
                borderRadius: 3,
                py: 1.1,
                px: 2,
                backgroundColor: location.pathname === '/settings' ? 'primary.main' : 'transparent',
                color: location.pathname === '/settings' ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  backgroundColor: location.pathname === '/settings' ? 'primary.dark' : (isDark ? '#1f293750' : '#f1f5f9'),
                },
                transition: 'all 0.2s',
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }} className="theme-transition">
      {/* Top Header AppBar */}
      <AppBar
        position="fixed"
        sx={{
          top: 16,
          right: 16,
          left: { xs: 16, md: `${DRAWER_WIDTH + 8}px` },
          width: 'auto',
          borderRadius: '20px',
          backgroundImage: 'none',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 10px 30px -10px rgba(0, 0, 0, 0.4)'
            : '0 10px 30px -10px rgba(0, 0, 0, 0.02)',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2.5, md: 4 } }}>
          {/* Left section: Hamburger toggler */}
          <Stack direction="row" alignItems="center" gap={1.5}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Breadcrumb Info */}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
              {activeProject ? (
                <Stack direction="row" alignItems="center" gap={1}>
                  <span style={{ color: theme.palette.text.secondary }}>Projects</span>
                  <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <span>{activeProject.name}</span>
                </Stack>
              ) : (
                <span>Workspace</span>
              )}
            </Typography>
          </Stack>

          {/* Center: Search Bar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(79, 70, 229, 0.04)',
              borderRadius: '20px',
              px: 2,
              py: 0.6,
              width: { xs: '150px', sm: '300px', md: '350px' },
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(79, 70, 229, 0.08)',
              transition: 'width 0.2s',
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18, mr: 1 }} />
            <InputBase
              placeholder="Search..."
              fullWidth
              sx={{ fontSize: '0.875rem' }}
            />
          </Box>

          {/* Right section: Icons & Profile */}
          <Stack direction="row" alignItems="center" gap={2}>
            {/* Dark Mode toggle */}
            <Tooltip title="Toggle Theme">
              <IconButton onClick={toggleMode} color="inherit">
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Notifications icon */}
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotiClick}>
                <Badge badgeContent={unreadNotiCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Notification Menu popover */}
            <Menu
              anchorEl={notiAnchorEl}
              open={Boolean(notiAnchorEl)}
              onClose={handleNotiClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{ sx: { width: 320, mt: 1, p: 1 } }}
            >
              <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notifications</Typography>
                {unreadNotiCount > 0 && (
                  <Typography variant="caption" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }} onClick={markAllNotiRead}>
                    Mark all read
                  </Typography>
                )}
              </Box>
              <Divider sx={{ mb: 1 }} />
              {notifications.map((noti) => (
                <MenuItem
                  key={noti.id}
                  onClick={handleNotiClose}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    py: 1,
                    bgcolor: !noti.read ? (isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(79, 70, 229, 0.02)') : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: !noti.read ? 600 : 400, fontSize: '0.85rem', whiteSpace: 'normal' }}>
                    {noti.text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{noti.time}</Typography>
                </MenuItem>
              ))}
            </Menu>

            {/* User Profile Avatar */}
            <Tooltip title="Account settings">
              <IconButton onClick={handleUserClick} size="small" sx={{ p: 0 }}>
                <Avatar 
                  sx={{ 
                    width: 34, 
                    height: 34, 
                    bgcolor: 'primary.main', 
                    fontWeight: 700, 
                    fontSize: '0.85rem' 
                  }}
                >
                  JD
                </Avatar>
              </IconButton>
            </Tooltip>

            {/* Profile Dropdown Menu */}
            <Menu
              anchorEl={userAnchorEl}
              open={Boolean(userAnchorEl)}
              onClose={handleUserClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{ sx: { width: 220, mt: 1, p: 1 } }}
            >
              <Box sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>John Doe</Typography>
                <Typography variant="caption" color="text.secondary">john.doe@example.com</Typography>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <MenuItem onClick={() => { handleUserClose(); navigate('/settings'); }}>Account Settings</MenuItem>
              <MenuItem onClick={handleUserClose}>Logout</MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Navigation drawer (Sidebar) */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Sidebar Panel */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            position: 'fixed',
            width: DRAWER_WIDTH - 24,
            height: 'calc(100vh - 32px)',
            top: 16,
            left: 16,
            borderRadius: '24px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 10px 30px -10px rgba(0, 0, 0, 0.6)'
              : '0 10px 30px -10px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden',
            zIndex: 1100,
          }}
        >
          {drawerContent}
        </Box>
      </Box>

      {/* Main Page Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '96px',
          pl: { md: `${DRAWER_WIDTH - 12}px` },
          pr: { md: 2 },
          pb: 4,
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
