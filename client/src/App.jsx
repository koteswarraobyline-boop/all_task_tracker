import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { getCustomTheme } from './theme';
import Layout from './components/Layout';
import Projects from './pages/Projects';
import UploadProject from './pages/UploadProject';
import ProjectTaskBoard from './pages/ProjectTaskBoard';
import Dashboard from './pages/Dashboard';
import Developers from './pages/Developers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  // Read theme mode preference from localStorage, defaulting to 'light'
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

  // Construct theme based on mode selection
  const theme = getCustomTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout mode={mode} toggleMode={toggleThemeMode}>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/upload" element={<UploadProject />} />
            <Route path="/projects/:id/tasks" element={<ProjectTaskBoard />} />
            <Route path="/projects/:id/dashboard" element={<Dashboard />} />
            <Route path="/projects/:id/reports" element={<Reports />} />
            <Route path="/developers" element={<Developers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}
