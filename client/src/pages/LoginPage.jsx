import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
} from '@mui/material';
import { FactCheck as LogoIcon, LockOutlined as LockIcon } from '@mui/icons-material';
import api from '../services/api';
import { useRole } from '../context/RoleContext';
import { tokens } from '../theme';

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshAdminSession } = useRole();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username.trim(), password);
      localStorage.setItem('authToken', data.token);
      refreshAdminSession();
      const redirectTo = location.state?.from || '/projects';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const apiError = err.response?.data?.error;
      if (!err.response) {
        setError('Cannot reach server. Is the API running?');
      } else if (status === 502 || status === 503 || status === 504) {
        setError('API unavailable (server error). Try again later.');
      } else if (status === 401) {
        setError(typeof apiError === 'string' ? apiError : 'Invalid credentials');
      } else if (typeof apiError === 'string' && apiError.trim()) {
        setError(apiError);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: isDark
          ? 'radial-gradient(ellipse at top, #1e1b4b 0%, #0B1220 60%)'
          : 'radial-gradient(ellipse at top, #EEF2FF 0%, #F8FAFC 55%)',
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          '&:hover': { transform: 'none', boxShadow: tokens.shadow.card },
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Stack
            spacing={2.5}
            sx={{
              alignItems: "center",
              mb: 3.5
            }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <LogoIcon aria-hidden />
            </Box>
            <Box
              sx={{
                textAlign: "center",
                px: 1
              }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Super Admin Login
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.55
                }}>
                Sign in to manage projects, tasks, and client links
              </Typography>
            </Box>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} role="alert">
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                autoFocus
                required
                autoComplete="username"
                size="medium"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                autoComplete="current-password"
                size="medium"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !username.trim() || !password}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                fullWidth
                sx={{ mt: 0.5 }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
