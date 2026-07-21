import { createTheme } from '@mui/material/styles';

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#6366F1', // Premium Indigo
    light: '#818CF8',
    dark: '#4F46E5',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#3B82F6', // Blue
    light: '#60A5FA',
    dark: '#2563EB',
    contrastText: '#ffffff',
  },
  success: {
    main: '#10B981', // Success Emerald
    light: '#34D399',
    dark: '#059669',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#F59E0B', // Amber
    light: '#FBBF24',
    dark: '#D97706',
    contrastText: '#ffffff',
  },
  error: {
    main: '#EF4444', // Red
    light: '#F87171',
    dark: '#DC2626',
    contrastText: '#ffffff',
  },
  background: {
    default: '#F5F7FB', // Light Premium Background
    paper: '#FFFFFF', // White Surface
  },
  text: {
    primary: '#111827', // Dark Gray
    secondary: '#6B7280', // Muted Gray
  },
  divider: 'rgba(0, 0, 0, 0.05)', // Super soft border
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#6366F1',
    light: '#818CF8',
    dark: '#4F46E5',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrastText: '#ffffff',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    contrastText: '#0f172a',
  },
  warning: {
    main: '#FBBF24',
    light: '#FDE047',
    dark: '#F59E0B',
    contrastText: '#0f172a',
  },
  error: {
    main: '#F87171',
    light: '#FCA5A5',
    dark: '#EF4444',
    contrastText: '#ffffff',
  },
  background: {
    default: '#0B0F19', // Dark premium background
    paper: '#111827', // Muted card background
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
  },
  divider: 'rgba(255, 255, 255, 0.05)',
};

export const getCustomTheme = (mode) => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const isDark = mode === 'dark';

  return createTheme({
    palette,
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.035em' },
      h2: { fontSize: '2.1rem', fontWeight: 850, letterSpacing: '-0.03em' },
      h3: { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' },
      h4: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.015em' },
      h5: { fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.005em' },
      subtitle1: { fontSize: '0.95rem', fontWeight: 550, letterSpacing: '-0.005em' },
      subtitle2: { fontSize: '0.85rem', fontWeight: 650 },
      body1: { fontSize: '0.95rem', lineHeight: 1.55, color: palette.text.primary },
      body2: { fontSize: '0.85rem', lineHeight: 1.5, color: palette.text.secondary },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' },
    },
    shape: {
      borderRadius: 20, // Rounded corners 20px
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.background.default,
            color: palette.text.primary,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 99, // Capsule buttons
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 8,
            paddingBottom: 8,
            fontWeight: 600,
            boxShadow: 'none',
            textTransform: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isDark
                ? '0 0 15px rgba(99, 102, 241, 0.4)'
                : '0 4px 15px rgba(99, 102, 241, 0.15)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0px)',
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${palette.primary.main} 0%, ${palette.primary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${palette.primary.light} 0%, ${palette.primary.main} 100%)`,
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.secondary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${palette.secondary.light} 0%, ${palette.secondary.main} 100%)`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 20, // Rounded 20px
            backgroundColor: palette.background.paper,
            // Premium extremely soft shadows
            boxShadow: isDark
              ? '0 10px 30px -10px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.05)'
              : '0 10px 30px -10px rgba(0, 0, 0, 0.03), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
            border: 'none',
            backdropFilter: 'blur(24px)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 20px 40px -15px rgba(99, 102, 241, 0.25), 0 0 1px 1px rgba(99, 102, 241, 0.2)'
                : '0 20px 40px -15px rgba(99, 102, 241, 0.12), 0 0 1px 1px rgba(99, 102, 241, 0.1)',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: palette.background.paper,
            borderLeft: `1px solid ${palette.divider}`,
            boxShadow: isDark
              ? '-10px 0 30px rgba(0,0,0,0.5)'
              : '-10px 0 30px rgba(0,0,0,0.02)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(11, 15, 25, 0.7)' : 'rgba(245, 247, 251, 0.7)',
            backdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${palette.divider}`,
            color: palette.text.primary,
            boxShadow: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
              '& fieldset': {
                borderColor: palette.divider,
              },
              '&:hover fieldset': {
                borderColor: palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: palette.primary.main,
                borderWidth: '1.5px',
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            backgroundImage: 'none',
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark
              ? '0 24px 48px rgba(0,0,0,0.6)'
              : '0 24px 48px rgba(0,0,0,0.05)',
          },
        },
      },
    },
  });
};
