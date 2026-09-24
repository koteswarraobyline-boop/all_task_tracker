import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { getCustomTheme } from './theme';
import { RoleProvider, isTokenExpired } from './context/RoleContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ClientShell = React.lazy(() => import('./pages/ClientShell'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const Projects = React.lazy(() => import('./pages/Projects'));
const UploadProject = React.lazy(() => import('./pages/UploadProject'));
const ProjectTaskBoard = React.lazy(() => import('./pages/ProjectTaskBoard'));
const ProjectTaskCalendar = React.lazy(() => import('./pages/ProjectTaskCalendar'));
const ProjectTaskTimeline = React.lazy(() => import('./pages/ProjectTaskTimeline'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ProjectProgramOverview = React.lazy(() => import('./pages/ProjectProgramOverview'));
const ProjectHierarchy = React.lazy(() => import('./pages/ProjectHierarchy'));
const ProjectRoadmap = React.lazy(() => import('./pages/ProjectRoadmap'));
const ProjectComments = React.lazy(() => import('./pages/ProjectComments'));
const ProjectTeam = React.lazy(() => import('./pages/ProjectTeam'));
const ProjectFiles = React.lazy(() => import('./pages/ProjectFiles'));
const ProjectSettings = React.lazy(() => import('./pages/ProjectSettings'));
const Developers = React.lazy(() => import('./pages/Developers'));
const DeveloperDetails = React.lazy(() => import('./pages/DeveloperDetails'));
const Settings = React.lazy(() => import('./pages/Settings'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));

function HomeRedirect() {
  const token = localStorage.getItem('authToken');
  if (token && !isTokenExpired(token)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function ReportsToDashboardRedirect() {
  const { id } = useParams();
  return <Navigate to={`/projects/${id}/dashboard`} replace />;
}

function AppRoutes({ mode, toggleMode }) {
  return (
    <Suspense fallback={<PageLoader />}>
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
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<HomeRedirect />} />
                    <Route path="/dashboard" element={<AdminDashboard />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/upload" element={<UploadProject />} />
                    <Route path="/projects/:id/tasks" element={<ProjectTaskBoard />} />
                    <Route path="/projects/:id/calendar" element={<ProjectTaskCalendar />} />
                    <Route path="/projects/:id/timeline" element={<ProjectTaskTimeline />} />
                    <Route path="/projects/:id/overview" element={<ProjectProgramOverview />} />
                    <Route path="/projects/:id/hierarchy" element={<ProjectHierarchy />} />
                    <Route path="/projects/:id/roadmap" element={<ProjectRoadmap />} />
                    <Route path="/projects/:id/comments" element={<ProjectComments />} />
                    <Route path="/projects/:id/team" element={<ProjectTeam />} />
                    <Route path="/projects/:id/dashboard" element={<Dashboard />} />
                    <Route path="/projects/:id/files" element={<ProjectFiles />} />
                    <Route path="/projects/:id/settings" element={<ProjectSettings />} />
                    <Route path="/projects/:id/reports" element={<ReportsToDashboardRedirect />} />
                    <Route path="/developers" element={<Developers />} />
                    <Route path="/developers/:id" element={<DeveloperDetails />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
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
      <ErrorBoundary>
        <Router>
          <RoleProvider>
            <AppRoutes mode={mode} toggleMode={toggleThemeMode} />
          </RoleProvider>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
