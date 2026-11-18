import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  PersonOutlined as PersonIcon,
  LockOutlined as LockIcon,
  VisibilityOutlined as VisibilityIcon,
  VisibilityOffOutlined as VisibilityOffIcon,
  BarChartOutlined as TrackIcon,
  GroupsOutlined as CollaborateIcon,
  AnalyticsOutlined as AnalyzeIcon,
  ShieldOutlined as SecureIcon,
  VerifiedUserOutlined as FooterShieldIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useRole } from '../context/RoleContext';
import { tokens } from '../theme';
import loginHero from '../logo/task.jpg';

const REMEMBER_KEY = 'tt_remember_username';

const FEATURES = [
  {
    title: 'Track Progress',
    description: 'Real-time visibility into tasks, deadlines and overall delivery health.',
    icon: TrackIcon,
  },
  {
    title: 'Collaborate',
    description: 'Assign tasks, share updates and keep everyone aligned.',
    icon: CollaborateIcon,
  },
  {
    title: 'Analyze & Improve',
    description: 'Identify risks, analyze delays and make data-driven decisions.',
    icon: AnalyzeIcon,
  },
  {
    title: 'Secure & Controlled',
    description: 'Role-based access ensures the right information for the right people.',
    icon: SecureIcon,
  },
];

function BrandLogo({ compact = false }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: compact ? '0.95rem' : '1.05rem',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}
        >
          <Box component="span" sx={{ color: '#FFFFFF' }}>
            TASK{' '}
          </Box>
          <Box component="span" sx={{ color: '#C7D2FE' }}>
            TRACKER
          </Box>
        </Typography>
        <Typography
          sx={{
            fontSize: compact ? '0.72rem' : '0.78rem',
            color: 'rgba(255,255,255,0.72)',
            fontWeight: 500,
            mt: 0.25,
          }}
        >
          Project Delivery. Simplified.
        </Typography>
      </Box>
    </Stack>
  );
}

function LoginBrandPanel({ showDetails }) {
  return (
    <Box
      component="section"
      aria-label="Task Tracker product overview"
      sx={{
        flex: { xs: '0 0 auto', md: '0 0 46%' },
        minHeight: { xs: 'auto', md: '100vh' },
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: tokens.colors.sidebar,
        color: '#fff',
        px: { xs: 3, sm: 4, md: 5, lg: 6 },
        py: { xs: 3, md: 4 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.35,
          background:
            'radial-gradient(ellipse 70% 50% at 0% 100%, rgba(79,70,229,0.28) 0%, transparent 55%)',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <BrandLogo compact={!showDetails} />
      </Box>

      {!showDetails && (
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            mt: 2.5,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 220,
          }}
        >
          <Box
            component="img"
            src={loginHero}
            alt="Task Tracker"
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: 240,
              objectFit: 'contain',
              borderRadius: `${tokens.radius.card}px`,
              bgcolor: '#FFFFFF',
            }}
          />
        </Box>
      )}

      {showDetails && (
        <>
          <Box sx={{ position: 'relative', zIndex: 1, mt: 3, maxWidth: 480, flexShrink: 0 }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 650,
                fontSize: { md: '1.75rem', lg: '2rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                mb: 1,
                color: '#FFFFFF',
              }}
            >
              Plan. Track. Deliver.
            </Typography>
            <Typography
              sx={{
                fontSize: '0.95rem',
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.78)',
                fontWeight: 500,
                maxWidth: 420,
              }}
            >
              The all-in-one project delivery platform for software teams and their clients.
            </Typography>
          </Box>

          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              minHeight: 0,
              my: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={loginHero}
              alt="Task Tracker collaboration illustration"
              sx={{
                width: '100%',
                height: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: `${tokens.radius.card}px`,
                bgcolor: '#FFFFFF',
              }}
            />
          </Box>

          <Stack
            direction="row"
            flexWrap="wrap"
            useFlexGap
            sx={{
              position: 'relative',
              zIndex: 1,
              gap: 1.25,
              maxWidth: 480,
              flexShrink: 0,
            }}
          >
            {FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <Stack
                  key={item.title}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', width: { md: 'calc(50% - 6px)' } }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: `${tokens.radius.sm}px`,
                      background: 'rgba(79,70,229,0.18)',
                      color: '#A5B4FC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#FFFFFF' }}>
                    {item.title}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    borderRadius: `${tokens.radius.input}px`,
    bgcolor: '#FFFFFF',
    transition: tokens.motion.fast,
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused': {
      bgcolor: '#FFFFFF',
      '& fieldset': {
        borderColor: tokens.colors.primary,
        borderWidth: 2,
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 600,
    color: '#64748B',
    '&.Mui-focused': { color: tokens.colors.primary },
  },
  '& .MuiInputBase-input::placeholder': {
    color: '#94A3B8',
    opacity: 1,
  },
};

function getFilledFieldSx(hasValue) {
  if (!hasValue) return fieldSx;
  return {
    ...fieldSx,
    '& .MuiOutlinedInput-root:not(.Mui-focused)': {
      bgcolor: tokens.colors.primarySoft,
      '& fieldset': { borderColor: '#C7D2FE' },
      '&:hover fieldset': { borderColor: '#A5B4FC' },
    },
  };
}

export default function LoginPage() {
  const theme = useTheme();
  const showBrandDetails = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshAdminSession } = useRole();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const validate = () => {
    const next = { username: '', password: '' };
    if (!username.trim()) next.username = 'Email or username is required';
    if (!password) next.password = 'Password is required';
    setFieldErrors(next);
    return !next.username && !next.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotOpen(false);
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await api.login(username.trim(), password);
      localStorage.setItem('authToken', data.token);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      refreshAdminSession();
      const redirectTo = location.state?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const apiError = err.response?.data?.error;
      if (!err.response) {
        setError('Cannot reach server. Is the API running on this machine? Start server with npm run dev.');
      } else if (status === 502 || status === 503 || status === 504) {
        setError(
          'Backend is down (HTTP ' +
            status +
            '). On production, restart the Node app in your host panel. For local use http://localhost:5173.'
        );
      } else if (status === 401) {
        setError(typeof apiError === 'string' ? apiError : 'Invalid email/username or password.');
      } else if (typeof apiError === 'string' && apiError.trim()) {
        setError(apiError);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: tokens.colors.background,
      }}
    >
      <LoginBrandPanel showDetails={showBrandDetails} />

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: { xs: 'auto', md: '100vh' },
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          bgcolor: tokens.colors.background,
        }}
      >

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 2, sm: 3 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 420,
              bgcolor: '#FFFFFF',
              borderRadius: `${tokens.radius.card}px`,
              border: `1px solid ${tokens.colors.border}`,
              boxShadow: tokens.shadow.card,
              px: { xs: 2.75, sm: 4 },
              py: { xs: 3.25, sm: 4.25 },
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontWeight: 650,
                fontSize: { xs: '1.35rem', sm: '1.5rem' },
                letterSpacing: '-0.03em',
                color: tokens.colors.text,
                mb: 0.75,
                textAlign: { xs: 'left', sm: 'center' },
              }}
            >
              Welcome back!
            </Typography>
            <Typography
              sx={{
                color: tokens.colors.textSecondary,
                mb: 3.25,
                fontWeight: 500,
                textAlign: { xs: 'left', sm: 'center' },
              }}
            >
              Sign in to your account to continue
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} role="alert">
                {error}
              </Alert>
            )}

            {forgotOpen && (
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }} role="status">
                Password reset is managed by your administrator. Please contact them for assistance.
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate aria-label="Sign in form">
              <Stack spacing={2.25}>
                <TextField
                  label="Email or Username"
                  name="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: '' }));
                  }}
                  placeholder="Enter your email or username"
                  fullWidth
                  autoFocus
                  autoComplete="username"
                  error={Boolean(fieldErrors.username)}
                  helperText={fieldErrors.username || undefined}
                  sx={getFilledFieldSx(Boolean(username.trim()))}
                  slotProps={{
                    input: {
                      'aria-invalid': Boolean(fieldErrors.username),
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  placeholder="Enter your password"
                  fullWidth
                  autoComplete="current-password"
                  error={Boolean(fieldErrors.password)}
                  helperText={fieldErrors.password || undefined}
                  sx={getFilledFieldSx(Boolean(password))}
                  slotProps={{
                    input: {
                      'aria-invalid': Boolean(fieldErrors.password),
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            edge="end"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((v) => !v)}
                            sx={{ color: '#94A3B8' }}
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        size="small"
                        sx={{
                          color: '#94A3B8',
                          '&.Mui-checked': { color: tokens.colors.primary },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B' }}>
                        Remember me
                      </Typography>
                    }
                  />
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => {
                      setForgotOpen(true);
                      setError('');
                    }}
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: tokens.colors.primary,
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      p: 0,
                    }}
                  >
                    Forgot password?
                  </Link>
                </Stack>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  sx={{
                    mt: 0.5,
                    minHeight: 40,
                    borderRadius: `${tokens.radius.button}px`,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    background: tokens.colors.primary,
                    boxShadow: 'none',
                    transition: tokens.motion.fast,
                    '&:hover': {
                      background: tokens.colors.primaryHover,
                      boxShadow: 'none',
                    },
                    '&:focus-visible': {
                      outline: '3px solid rgba(79,70,229,0.35)',
                      outlineOffset: 2,
                    },
                  }}
                >
                  {loading ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CircularProgress size={20} color="inherit" aria-hidden />
                      <span>Signing in…</span>
                    </Stack>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Box
          component="footer"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.25,
            width: '100%',
            pb: 2.5,
            pt: 1,
            px: { xs: 2, sm: 3, md: 4 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <FooterShieldIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: '0.8125rem', color: '#94A3B8', fontWeight: 600 }}>
              Secure • Reliable • Always Available
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            © 2026 Task Tracker. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
