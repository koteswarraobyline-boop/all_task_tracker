import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
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

const REMEMBER_KEY = 'tt_remember_username';

const FEATURES = [
  {
    title: 'Track Progress',
    description: 'Real-time visibility into tasks, deadlines and overall delivery health.',
    icon: TrackIcon,
    bg: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    shadow: '0 8px 20px rgba(79,70,229,0.35)',
  },
  {
    title: 'Collaborate',
    description: 'Assign tasks, share updates and keep everyone aligned.',
    icon: CollaborateIcon,
    bg: 'linear-gradient(135deg, #34D399 0%, #22C55E 100%)',
    shadow: '0 8px 20px rgba(34,197,94,0.3)',
  },
  {
    title: 'Analyze & Improve',
    description: 'Identify risks, analyze delays and make data-driven decisions.',
    icon: AnalyzeIcon,
    bg: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    shadow: '0 8px 20px rgba(245,158,11,0.3)',
  },
  {
    title: 'Secure & Controlled',
    description: 'Role-based access ensures the right information for the right people.',
    icon: SecureIcon,
    bg: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
    shadow: '0 8px 20px rgba(124,58,237,0.35)',
  },
];

function CubeLogo({ size = 48 }) {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 48 48"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        filter: 'drop-shadow(0 6px 16px rgba(99,102,241,0.45))',
      }}
    >
      <defs>
        <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="cubeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#3730A3" />
        </linearGradient>
        <linearGradient id="cubeRight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <polygon points="24,6 42,16 24,26 6,16" fill="url(#cubeTop)" />
      <polygon points="6,16 24,26 24,42 6,32" fill="url(#cubeLeft)" />
      <polygon points="24,26 42,16 42,32 24,42" fill="url(#cubeRight)" />
      <polygon points="24,6 42,16 24,26 6,16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
    </Box>
  );
}

function BrandLogo({ compact = false }) {
  const logoSize = compact ? 40 : 48;
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <CubeLogo size={logoSize} />
      <Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: compact ? '0.95rem' : '1.08rem',
            letterSpacing: '0.05em',
            lineHeight: 1.1,
          }}
        >
          <Box component="span" sx={{ color: '#FFFFFF' }}>
            TASK{' '}
          </Box>
          <Box component="span" sx={{ color: '#818CF8' }}>
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

function DashboardIllustration() {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 420, height: 168, pr: 4 }}>
      <Box
        sx={{
          height: 140,
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(160deg, rgba(15,23,42,0.82) 0%, rgba(30,41,59,0.55) 100%)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
          position: 'relative',
          overflow: 'hidden',
          px: 2,
          pt: 1.5,
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }}>
          {['#EF4444', '#FBBF24', '#22C55E'].map((color) => (
            <Box key={color} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
          ))}
        </Stack>

        <Box
          sx={{
            position: 'absolute',
            left: 18,
            bottom: 18,
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'conic-gradient(#3B82F6 0deg 130deg, #8B5CF6 130deg 240deg, #06B6D4 240deg 360deg)',
            boxShadow: 'inset 0 0 0 14px rgba(15,23,42,0.92)',
          }}
        />

        <Box sx={{ position: 'absolute', left: 108, bottom: 28, right: 88 }}>
          {[48, 64, 40, 72, 52].map((w, i) => (
            <Box
              key={i}
              sx={{
                width: `${w}%`,
                height: 6,
                borderRadius: 999,
                bgcolor: 'rgba(255,255,255,0.1)',
                mb: 0.75,
              }}
            />
          ))}
          <Box
            sx={{
              mt: 1.5,
              height: 36,
              borderRadius: '8px',
              borderBottom: '2px solid rgba(59,130,246,0.55)',
              background: `
                linear-gradient(to top, rgba(59,130,246,0.15) 0%, transparent 100%),
                linear-gradient(to right, transparent 0%, transparent 100%)
              `,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '100%',
                background: `
                  radial-gradient(circle at 15% 80%, rgba(59,130,246,0.8) 2px, transparent 3px),
                  radial-gradient(circle at 35% 55%, rgba(99,102,241,0.75) 2px, transparent 3px),
                  radial-gradient(circle at 55% 70%, rgba(6,182,212,0.7) 2px, transparent 3px),
                  radial-gradient(circle at 75% 40%, rgba(59,130,246,0.65) 2px, transparent 3px),
                  radial-gradient(circle at 90% 60%, rgba(139,92,246,0.6) 2px, transparent 3px)
                `,
              },
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          right: 0,
          bottom: 8,
          width: 76,
          height: 76,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #60A5FA 0%, #4F46E5 55%, #4338CA 100%)',
          boxShadow: '0 0 32px rgba(59,130,246,0.55), 0 12px 28px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '3px solid rgba(255,255,255,0.15)',
        }}
      >
        <LockIcon sx={{ color: '#fff', fontSize: 34 }} />
      </Box>
    </Box>
  );
}

function LoginBrandPanel({ showDetails }) {
  return (
    <Box
      component="section"
      aria-label="Task Tracker product overview"
      sx={{
        flex: { xs: '0 0 auto', md: '0 0 40%' },
        minHeight: { xs: 'auto', md: '100vh' },
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(165deg, #070D1A 0%, ${tokens.colors.sidebar} 38%, #152238 72%, #1E3A5F 100%)`,
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
          opacity: 0.5,
          background:
            'radial-gradient(ellipse 90% 60% at 85% 95%, rgba(37,99,235,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 10% 85%, rgba(79,70,229,0.2) 0%, transparent 50%)',
        }}
      />
      <Box
        component="svg"
        aria-hidden
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45%',
          opacity: 0.22,
          pointerEvents: 'none',
        }}
      >
        <path
          d="M0,220 C80,180 160,260 240,210 C320,160 360,240 400,200 L400,300 L0,300 Z"
          fill="none"
          stroke="rgba(96,165,250,0.45)"
          strokeWidth="1.5"
        />
        <path
          d="M0,250 C100,200 180,280 280,230 C340,200 370,260 400,240 L400,300 L0,300 Z"
          fill="none"
          stroke="rgba(129,140,248,0.3)"
          strokeWidth="1"
        />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <BrandLogo compact={!showDetails} />
      </Box>

      {showDetails && (
        <>
          <Box sx={{ position: 'relative', zIndex: 1, mt: { md: 5.5, lg: 6.5 }, maxWidth: 480 }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { md: '2.4rem', lg: '2.85rem' },
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                mb: 2,
                color: '#FFFFFF',
              }}
            >
              Plan. Track. Deliver.
            </Typography>
            <Typography
              sx={{
                fontSize: { md: '1rem', lg: '1.05rem' },
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.78)',
                fontWeight: 500,
                maxWidth: 420,
              }}
            >
              The all-in-one project delivery platform for software teams and their clients.
            </Typography>
          </Box>

          <Stack
            spacing={2.25}
            sx={{
              position: 'relative',
              zIndex: 1,
              mt: { md: 4.5, lg: 5 },
              maxWidth: 460,
              flex: 1,
            }}
          >
            {FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <Stack key={item.title} direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      background: item.bg,
                      boxShadow: item.shadow,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.35, color: '#FFFFFF' }}>
                      {item.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.84rem',
                        lineHeight: 1.55,
                        color: 'rgba(255,255,255,0.62)',
                      }}
                    >
                      {item.description}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
          </Stack>

          <Box
            aria-hidden
            sx={{
              position: 'relative',
              zIndex: 1,
              mt: 'auto',
              pt: 4,
              pb: 1,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <DashboardIllustration />
          </Box>
        </>
      )}
    </Box>
  );
}

function GoogleIcon() {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 24 24"
      sx={{ width: 20, height: 20 }}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 50,
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
      bgcolor: '#EFF6FF',
      '& fieldset': { borderColor: '#BFDBFE' },
      '&:hover fieldset': { borderColor: '#93C5FD' },
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
        setError('Cannot reach server. Is the API running?');
      } else if (status === 502 || status === 503 || status === 504) {
        setError('API unavailable (server error). Try again later.');
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
          overflow: 'hidden',
          bgcolor: '#F4F6FB',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 55% at 15% 20%, rgba(199,210,254,0.35) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 85% 75%, rgba(219,234,254,0.45) 0%, transparent 50%)',
          }}
        />
        <Box
          component="svg"
          aria-hidden
          viewBox="0 0 800 600"
          preserveAspectRatio="none"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        >
          <path
            d="M0,420 C180,320 320,480 520,400 C640,350 720,430 800,380 L800,600 L0,600 Z"
            fill="rgba(226,232,240,0.35)"
          />
          <path
            d="M0,480 C200,400 360,520 580,460 C680,430 740,490 800,450 L800,600 L0,600 Z"
            fill="rgba(241,245,249,0.5)"
          />
        </Box>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 28,
            right: 28,
            width: 132,
            height: 132,
            backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
            backgroundSize: '14px 14px',
            opacity: 0.55,
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 72,
            right: 48,
            width: 96,
            height: 96,
            backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
            backgroundSize: '12px 12px',
            opacity: 0.45,
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 120,
            left: 32,
            width: 72,
            height: 72,
            backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
            backgroundSize: '11px 11px',
            opacity: 0.35,
          }}
        />

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
              maxWidth: 500,
              bgcolor: '#FFFFFF',
              borderRadius: '20px',
              boxShadow: '0 12px 48px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
              px: { xs: 2.75, sm: 4 },
              py: { xs: 3.25, sm: 4.25 },
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.75rem', sm: '1.95rem' },
                letterSpacing: '-0.03em',
                color: '#0F172A',
                mb: 0.75,
                textAlign: { xs: 'left', sm: 'center' },
              }}
            >
              Welcome back!
            </Typography>
            <Typography
              sx={{
                color: '#64748B',
                fontSize: '0.9375rem',
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
                  alignItems="center"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  gap={1}
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
                      color: '#6366F1',
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
                    minHeight: 52,
                    borderRadius: `${tokens.radius.button}px`,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1rem',
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 55%, #4338CA 100%)',
                    boxShadow: '0 8px 24px rgba(79,70,229,0.38)',
                    transition: tokens.motion.fast,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                      boxShadow: '0 10px 28px rgba(79,70,229,0.42)',
                    },
                    '&:focus-visible': {
                      outline: '3px solid rgba(79,70,229,0.35)',
                      outlineOffset: 2,
                    },
                  }}
                >
                  {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} color="inherit" aria-hidden />
                      <span>Signing in…</span>
                    </Stack>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <Divider
                  sx={{
                    my: 0.5,
                    '&::before, &::after': { borderColor: tokens.colors.border },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, px: 1 }}
                  >
                    or
                  </Typography>
                </Divider>

                <Button
                  type="button"
                  variant="outlined"
                  fullWidth
                  startIcon={<GoogleIcon />}
                  onClick={() => {
                    setForgotOpen(false);
                    setError(
                      'Google sign-in is not configured for this workspace. Use your administrator credentials.'
                    );
                  }}
                  sx={{
                    minHeight: 52,
                    borderRadius: `${tokens.radius.button}px`,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    color: '#334155',
                    borderColor: '#E2E8F0',
                    bgcolor: '#FFFFFF',
                    '& .MuiButton-startIcon': { mr: 1.25 },
                    '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' },
                  }}
                >
                  Sign in with Google
                </Button>

                <Typography
                  sx={{
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#64748B',
                    pt: 0.75,
                  }}
                >
                  Don&apos;t have an account?{' '}
                  <Link
                    component={RouterLink}
                    to="/login"
                    underline="hover"
                    onClick={(e) => {
                      e.preventDefault();
                      setForgotOpen(true);
                      setError('');
                    }}
                    sx={{ fontWeight: 700, color: '#334155' }}
                  >
                    Contact your administrator
                  </Link>
                </Typography>
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
          <Stack direction="row" spacing={0.75} alignItems="center">
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
