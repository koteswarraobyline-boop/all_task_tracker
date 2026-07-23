import { createTheme, alpha } from '@mui/material/styles';

/** Design tokens — premium SaaS (8px grid) */
export const tokens = {
  colors: {
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E5E7EB',
    background: '#F8FAFC',
    card: '#FFFFFF',
    sidebar: '#0B1220',
    sidebarEnd: '#111827',
  },
  radius: {
    card: 16,
    button: 12,
    input: 12,
    badge: 999,
    dialog: 20,
    sm: 8,
  },
  shadow: {
    card: '0 4px 12px rgba(0,0,0,0.06)',
    hover: '0 12px 30px rgba(0,0,0,0.12)',
    dialog: '0 16px 48px rgba(15,23,42,0.14)',
  },
  layout: {
    sidebar: 260,
    sidebarCollapsed: 80,
    header: 72,
    contentPad: 4, // theme.spacing(4) = 32px
    maxWidth: 1600,
  },
  motion: {
    fast: '250ms ease',
    sidebar: '300ms ease',
  },
};

const lightPalette = {
  mode: 'light',
  primary: {
    main: tokens.colors.primary,
    light: '#818CF8',
    dark: tokens.colors.primaryHover,
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#2563EB',
    light: '#60A5FA',
    dark: '#1D4ED8',
    contrastText: '#FFFFFF',
  },
  success: {
    main: tokens.colors.success,
    light: '#4ADE80',
    dark: '#16A34A',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: tokens.colors.warning,
    light: '#FBBF24',
    dark: '#D97706',
    contrastText: '#0F172A',
  },
  error: {
    main: tokens.colors.danger,
    light: '#F87171',
    dark: '#DC2626',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#0EA5E9',
    light: '#38BDF8',
    dark: '#0284C7',
    contrastText: '#FFFFFF',
  },
  background: {
    default: tokens.colors.background,
    paper: tokens.colors.card,
  },
  text: {
    primary: tokens.colors.text,
    secondary: tokens.colors.textSecondary,
    disabled: '#94A3B8',
  },
  divider: tokens.colors.border,
  action: {
    hover: alpha(tokens.colors.primary, 0.06),
    selected: alpha(tokens.colors.primary, 0.1),
    focus: alpha(tokens.colors.primary, 0.16),
  },
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#818CF8',
    light: '#A5B4FC',
    dark: '#6366F1',
    contrastText: '#0F172A',
  },
  secondary: {
    main: '#60A5FA',
    light: '#93C5FD',
    dark: '#3B82F6',
    contrastText: '#0F172A',
  },
  success: {
    main: '#4ADE80',
    light: '#86EFAC',
    dark: '#22C55E',
    contrastText: '#0F172A',
  },
  warning: {
    main: '#FBBF24',
    light: '#FDE047',
    dark: '#F59E0B',
    contrastText: '#0F172A',
  },
  error: {
    main: '#F87171',
    light: '#FCA5A5',
    dark: '#EF4444',
    contrastText: '#0F172A',
  },
  info: {
    main: '#38BDF8',
    light: '#7DD3FC',
    dark: '#0EA5E9',
    contrastText: '#0F172A',
  },
  background: {
    default: '#0B1220',
    paper: '#111827',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    disabled: '#64748B',
  },
  divider: 'rgba(148, 163, 184, 0.18)',
  action: {
    hover: 'rgba(129, 140, 248, 0.08)',
    selected: 'rgba(129, 140, 248, 0.14)',
    focus: 'rgba(129, 140, 248, 0.2)',
  },
};

export const getCustomTheme = (mode) => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const isDark = mode === 'dark';
  const cardShadow = isDark
    ? '0 4px 16px rgba(0,0,0,0.35)'
    : tokens.shadow.card;
  const hoverShadow = isDark
    ? '0 12px 32px rgba(0,0,0,0.45)'
    : tokens.shadow.hover;

  return createTheme({
    palette,
    spacing: 8,
    typography: {
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      fontSize: 14,
      htmlFontSize: 16,
      h1: {
        fontSize: '2.25rem', // 36px
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1.5,
        color: palette.text.primary,
      },
      h2: {
        fontSize: '1.5rem', // 24px
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      h5: {
        fontSize: '1.125rem', // 18px
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      subtitle1: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '0.875rem', // 14px
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.5,
        color: palette.text.primary,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.5,
        color: palette.text.secondary,
      },
      caption: {
        fontSize: '0.75rem', // 12px
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.5,
        color: palette.text.secondary,
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        letterSpacing: 0,
        lineHeight: 1.5,
      },
    },
    shape: {
      borderRadius: tokens.radius.card,
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 250,
        complex: 300,
      },
      easing: {
        easeInOut: 'ease',
        easeOut: 'ease',
        easeIn: 'ease',
        sharp: 'ease',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          body: {
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            overflowX: 'hidden',
          },
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          'a:focus-visible, button:focus-visible, [tabindex]:focus-visible, .MuiButtonBase-root:focus-visible':
            {
              outline: `2px solid ${palette.primary.main}`,
              outlineOffset: 2,
            },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.button,
            minHeight: 44,
            height: 44,
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 0,
            paddingBottom: 0,
            fontWeight: 600,
            boxShadow: 'none',
            textTransform: 'none',
            gap: 8,
            transition: tokens.motion.fast,
            '&:hover': {
              boxShadow: 'none',
              transform: 'scale(1.02)',
            },
            '&:active': {
              transform: 'scale(1)',
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            },
            '& .MuiButton-startIcon': { marginRight: 0, marginLeft: 0 },
            '& .MuiButton-endIcon': { marginRight: 0, marginLeft: 0 },
          },
          sizeSmall: {
            minHeight: 36,
            height: 36,
            paddingLeft: 14,
            paddingRight: 14,
            fontSize: '0.8125rem',
            borderRadius: 10,
          },
          sizeLarge: {
            minHeight: 48,
            height: 48,
            paddingLeft: 24,
            paddingRight: 24,
          },
          containedPrimary: {
            backgroundColor: tokens.colors.primary,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: tokens.colors.primaryHover,
            },
          },
          outlined: {
            borderWidth: 1,
            borderColor: tokens.colors.border,
            '&:hover': {
              borderWidth: 1,
              borderColor: alpha(tokens.colors.primary, 0.4),
              backgroundColor: alpha(tokens.colors.primary, 0.04),
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.button,
            minWidth: 44,
            minHeight: 44,
            transition: tokens.motion.fast,
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
          },
          sizeSmall: {
            minWidth: 36,
            minHeight: 36,
            padding: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: tokens.radius.card,
            backgroundColor: palette.background.paper,
            boxShadow: cardShadow,
            border: `1px solid ${isDark ? palette.divider : tokens.colors.border}`,
            transition: tokens.motion.fast,
            '&:hover': {
              boxShadow: hoverShadow,
              transform: 'translateY(-3px)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: tokens.radius.card,
          },
          outlined: {
            borderColor: isDark ? palette.divider : tokens.colors.border,
            boxShadow: 'none',
          },
          elevation1: {
            boxShadow: cardShadow,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            borderRadius: 0,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark
              ? alpha('#0B1220', 0.92)
              : alpha('#FFFFFF', 0.92),
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${isDark ? palette.divider : tokens.colors.border}`,
            color: palette.text.primary,
            boxShadow: 'none',
            minHeight: tokens.layout.header,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: `${tokens.layout.header}px !important`,
            height: tokens.layout.header,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'medium',
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: tokens.radius.input,
              backgroundColor: isDark
                ? alpha('#fff', 0.03)
                : tokens.colors.card,
              minHeight: 48,
              transition: tokens.motion.fast,
              '& fieldset': {
                borderColor: isDark ? palette.divider : tokens.colors.border,
              },
              '&:hover fieldset': {
                borderColor: alpha(tokens.colors.primary, 0.45),
              },
              '&.Mui-focused fieldset': {
                borderColor: tokens.colors.primary,
                borderWidth: 1.5,
              },
            },
            '& .MuiInputLabel-root': {
              lineHeight: 1.5,
            },
            '&:has(input[type="date"]), &:has(input[type="time"]), &:has(input[type="datetime-local"]), &:has(input[type="month"]), &:has(input[type="week"])':
              {
                '& .MuiInputLabel-root': {
                  transform: 'translate(14px, -9px) scale(0.75) !important',
                  transformOrigin: 'top left',
                  backgroundColor: palette.background.paper,
                  paddingLeft: 4,
                  paddingRight: 4,
                },
                '& .MuiOutlinedInput-notchedOutline legend': {
                  maxWidth: '100% !important',
                },
              },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.input,
            minHeight: 48,
          },
          input: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.input,
          },
        },
      },
      MuiStack: {
        defaultProps: {
          useFlexGap: true,
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: tokens.radius.dialog,
            backgroundImage: 'none',
            border: `1px solid ${isDark ? palette.divider : tokens.colors.border}`,
            boxShadow: isDark
              ? '0 20px 48px rgba(0,0,0,0.5)'
              : tokens.shadow.dialog,
            margin: 16,
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '24px 24px 12px',
            fontWeight: 700,
            fontSize: '1.125rem',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '8px 24px 16px',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '16px 24px 24px',
            gap: 12,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.badge,
            fontWeight: 600,
            height: 28,
          },
          sizeSmall: {
            height: 24,
            fontSize: '0.75rem',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.card,
            border: `1px solid ${isDark ? palette.divider : tokens.colors.border}`,
            boxShadow: cardShadow,
            backgroundColor: palette.background.paper,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: isDark ? '#E2E8F0' : '#F8FAFC',
              backgroundColor: isDark ? '#1E293B' : '#0F172A',
              borderBottom: 'none',
              whiteSpace: 'nowrap',
              paddingTop: 14,
              paddingBottom: 14,
              paddingLeft: 16,
              paddingRight: 16,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? palette.divider : tokens.colors.border,
            fontSize: '0.875rem',
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 16,
            paddingRight: 16,
            lineHeight: 1.5,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: tokens.motion.fast,
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 48 },
          indicator: {
            height: 3,
            borderRadius: '3px 3px 0 0',
            backgroundColor: tokens.colors.primary,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
            fontSize: '0.875rem',
            paddingLeft: 16,
            paddingRight: 16,
            letterSpacing: 0,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: tokens.radius.sm,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '8px 12px',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.button,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.badge,
            height: 8,
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.button,
            minHeight: 44,
            transition: tokens.motion.fast,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
            minHeight: 44,
            marginLeft: 8,
            marginRight: 8,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: `${tokens.radius.button}px !important`,
            paddingLeft: 16,
            paddingRight: 16,
            minHeight: 40,
            letterSpacing: 0,
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .MuiPaginationItem-root': {
              borderRadius: tokens.radius.sm,
              minWidth: 36,
              height: 36,
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 24,
            '&:last-child': {
              paddingBottom: 24,
            },
          },
        },
      },
      MuiCardActions: {
        styleOverrides: {
          root: {
            padding: '0 24px 24px',
            gap: 12,
          },
        },
      },
    },
  });
};
