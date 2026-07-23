import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { getCustomTheme } from './theme';
import { RoleProvider, isTokenExpired } from './context/RoleContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Projects from './pages/Projects';
import UploadProject from './pages/UploadProject';
import ProjectTaskBoard from './pages/ProjectTaskBoard';
import ProjectTaskCalendar from './pages/ProjectTaskCalendar';
import ProjectTaskTimeline from './pages/ProjectTaskTimeline';
import Dashboard from './pages/Dashboard';
import Developers from './pages/Developers';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import UserManagement from './pages/UserManagement';
import ClientShell from './pages/ClientShell';

function HomeRedirect() {
  const token = localStorage.getItem('authToken');
  if (token && !isTokenExpired(token)) {
    return <Navigate to="/projects" replace />;
  }
  return <Navigate to="/login" replace />;
}

function ReportsToDashboardRedirect() {
  const { id } = useParams();
  return <Navigate to={`/projects/${id}/dashboard`} replace />;
}

function AppRoutes({ mode, toggleMode }) {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/client/:token/*"
        element={<ClientShell mode={mode} toggleMode={toggleMode} />}
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout mode={mode} toggleMode={toggleMode}>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/upload" element={<UploadProject />} />
                <Route path="/projects/:id/tasks" element={<ProjectTaskBoard />} />
                <Route path="/projects/:id/calendar" element={<ProjectTaskCalendar />} />
                <Route path="/projects/:id/timeline" element={<ProjectTaskTimeline />} />
                <Route path="/projects/:id/dashboard" element={<Dashboard />} />
                <Route path="/projects/:id/reports" element={<ReportsToDashboardRedirect />} />
                <Route path="/developers" element={<Developers />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="*" element={<Navigate to="/projects" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  const toggleThemeMode = () => {
    setMode((prevMode) => {
      const nextMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', nextMode);
      return nextMode;
    });
  };

  const theme = getCustomTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <RoleProvider>
          <AppRoutes mode={mode} toggleMode={toggleThemeMode} />
        </RoleProvider>
      </Router>
    </ThemeProvider>
  );
}
