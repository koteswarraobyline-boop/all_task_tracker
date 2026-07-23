import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Typography,
} from '@mui/material';
import api from '../services/api';
import { useRole } from '../context/RoleContext';
import Layout from '../components/Layout';
import ClientOverview from './ClientOverview';
import ProjectTaskBoard from './ProjectTaskBoard';
import ProjectTaskCalendar from './ProjectTaskCalendar';
import ProjectTaskTimeline from './ProjectTaskTimeline';
import LinkExpiredPage from './LinkExpiredPage';
import LinkDisabledPage from './LinkDisabledPage';
import LinkNotFoundPage from './LinkNotFoundPage';

export default function ClientShell({ mode, toggleMode }) {
  const { token } = useParams();
  const { setClientSession, setError, clearClientSession } = useRole();

  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const resolveToken = async (sharePassword) => {
    setLoading(true);
    setLinkError(null);
    setPasswordError('');
    clearClientSession();
    try {
      const data = await api.getClientProject(token, sharePassword);
      setClientSession(data.clientMeta, data.project);
      setNeedsPassword(false);
      if (sharePassword) {
        sessionStorage.setItem(`share-password:${token}`, sharePassword);
      }
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data || {};

      if (status === 401 && body.status === 'password_required') {
        setNeedsPassword(true);
        if (sharePassword) {
          setPasswordError(body.error || 'Invalid password');
        }
      } else if (status === 403 && body.status === 'expired') {
        setLinkError('expired');
      } else if (status === 403 && body.status === 'disabled') {
        setLinkError('disabled');
      } else if (status === 404 || status === 400) {
        setLinkError('notfound');
      } else {
        setLinkError('error');
        setError(body.error || 'Failed to open shared project');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = sessionStorage.getItem(`share-password:${token}`);
    resolveToken(cached || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    await resolveToken(password);
    setUnlocking(false);
  };

  if (loading && !needsPassword) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (linkError === 'expired') return <LinkExpiredPage />;
  if (linkError === 'disabled') return <LinkDisabledPage />;
  if (linkError === 'notfound') return <LinkNotFoundPage />;
  if (linkError === 'error') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Alert severity="error">Unable to open this shared project. Please try again later.</Alert>
      </Box>
    );
  }

  if (needsPassword) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: 'background.default' }}>
        <Dialog open fullWidth maxWidth="xs" hideBackdrop PaperProps={{ sx: { borderRadius: 3, m: 0 } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Enter share password</DialogTitle>
          <Box component="form" onSubmit={handleUnlock}>
            <DialogContent>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 2
                }}>
                This project is password protected. Enter the password provided by the admin.
              </Typography>
              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}
              <TextField
                label="Password"
                type="password"
                fullWidth
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button type="submit" variant="contained" disabled={unlocking || !password} fullWidth sx={{ fontWeight: 700 }}>
                {unlocking ? 'Unlocking…' : 'View project'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    );
  }

  return (
    <Layout mode={mode} toggleMode={toggleMode}>
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ClientOverview />} />
        <Route path="tasks" element={<ProjectTaskBoard />} />
        <Route path="calendar" element={<ProjectTaskCalendar />} />
        <Route path="timeline" element={<ProjectTaskTimeline />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </Layout>
  );
}
