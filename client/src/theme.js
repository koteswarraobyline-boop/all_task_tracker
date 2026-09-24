import { createTheme, alpha } from '@mui/material/styles';

/**
 * Design tokens — Legato / Task Tracker visual system
 * Navy = structure · Blue = primary · White = cards · Gray = secondary
 */
export const tokens = {
  colors: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primarySoft: '#EFF6FF',
    primarySofter: '#F8FBFF',
    success: '#15803D',
    successBg: '#ECFDF5',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    danger: '#DC2626',
    dangerBg: '#FEF2F2',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    text: '#17233C',
    textBody: '#475569',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#EDF2F7',
    background: '#F6F8FC',
    card: '#FFFFFF',
    progressTrack: '#E2E8F0',
    /** Dark navy — plan topbar / login panels */
    sidebar: '#111827',
    sidebarEnd: '#111827',
    sidebarAlt: '#1E293B',
    sidebarText: '#CBD5E1',
    sidebarMuted: '#94A3B8',
    /** Light nav drawer */
    navBg: '#FFFFFF',
    navBorder: '#E2E8F0',
    navText: '#475569',
    navMuted: '#94A3B8',
    navActiveBg: '#EFF6FF',
    navActiveText: '#2563EB',
  },
  radius: {
    card: 12,
    button: 8,
    input: 8,
    badge: 999,
    dialog: 12,
    sm: 8,
    planBar: 12,
  },
  shadow: {
    card: '0 1px 3px rgba(15, 23, 42, 0.04)',
    hover: '0 2px 8px rgba(15, 23, 42, 0.06)',
    dialog: '0 16px 40px rgba(15, 23, 42, 0.12)',
  },
  layout: {
    sidebar: 240,
    sidebarCollapsed: 72,
    header: 64,
    contentPad: 2,
    maxWidth: '100%',
  },
  motion: {
    fast: '180ms ease',
    sidebar: '220ms ease',
  },
};

/** Shared page shell for project-plan views */
export const planPageSx = {
  maxWidth: '100%',
  px: { xs: 1.5, sm: 2, md: 2.5 },
  py: { xs: 1.5, md: 2 },
  bgcolor: tokens.colors.background,
};

export const planCardSx = {
  borderRadius: `${tokens.radius.card}px`,
  border: '1px solid',
  borderColor: tokens.colors.border,
  bgcolor: tokens.colors.card,
  boxShadow: tokens.shadow.card,
};

const lightPalette = {
  mode: 'light',
  primary: {
    main: tokens.colors.primary,
    light: '#60A5FA',
    dark: tokens.colors.primaryHover,
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: tokens.colors.sidebarAlt,
    light: '#334155',
    dark: tokens.colors.sidebar,
    contrastText: '#FFFFFF',
  },
  success: {
    main: tokens.colors.success,
    light: '#4ADE80',
    dark: '#166534',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: tokens.colors.warning,
    light: '#FBBF24',
    dark: '#B45309',
    contrastText: '#0F172A',
  },
  error: {
    main: tokens.colors.danger,
    light: '#F87171',
    dark: '#B91C1C',
    contrastText: '#FFFFFF',
  },
  info: {
    main: tokens.colors.info,
    light: '#60A5FA',
    dark: tokens.colors.primaryHover,
    contrastText: '#FFFFFF',
  },
  background: {
    default: tokens.colors.background,
    paper: tokens.colors.card,
  },
  text: {
    primary: tokens.colors.text,
    secondary: tokens.colors.textSecondary,
    disabled: tokens.colors.textMuted,
  },
  divider: tokens.colors.border,
  action: {
    hover: alpha(tokens.colors.primary, 0.05),
    selected: alpha(tokens.colors.primary, 0.08),
    focus: alpha(tokens.colors.primary, 0.14),
  },
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#94A3B8',
    light: '#CBD5E1',
    dark: '#64748B',
    contrastText: '#0F172A',
  },
  success: {
    main: '#22C55E',
    light: '#4ADE80',
    dark: '#15803D',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    contrastText: '#0F172A',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#60A5FA',
    light: '#93C5FD',
    dark: '#3B82F6',
    contrastText: '#0F172A',
  },
  background: {
    default: '#0F172A',
    paper: '#1E293B',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    disabled: '#64748B',
  },
  divider: 'rgba(148, 163, 184, 0.16)',
  action: {
    hover: 'rgba(37, 99, 235, 0.08)',
    selected: 'rgba(37, 99, 235, 0.12)',
    focus: 'rgba(37, 99, 235, 0.18)',
  },
};

export const getCustomTheme = (mode) => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const isDark = mode === 'dark';
  const cardShadow = isDark ? '0 1px 2px rgba(0,0,0,0.35)' : tokens.shadow.card;
  const borderColor = isDark ? palette.divider : tokens.colors.border;
  const inputBg = isDark ? alpha('#fff', 0.03) : tokens.colors.card;

  return createTheme({
    palette,
    spacing: 8,
    typography: {
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      fontSize: 14,
      htmlFontSize: 16,
      h1: {
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.3,
      },
      h2: {
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
        lineHeight: 1.35,
      },
      h3: {
        fontSize: '1.125rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.0625rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.45,
      },
      h6: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.45,
      },
      subtitle1: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '0.875rem',
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.55,
      },
      body2: {
        fontSize: '0.8125rem',
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.5,
        color: palette.text.secondary,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.45,
        color: palette.text.secondary,
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        letterSpacing: 0,
        lineHeight: 1.4,
      },
    },
    shape: {
      borderRadius: tokens.radius.card,
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 180,
        short: 200,
        standard: 220,
        complex: 280,
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
            minHeight: 36,
            height: 36,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 0,
            paddingBottom: 0,
            fontWeight: 600,
            boxShadow: 'none',
            textTransform: 'none',
            gap: 6,
            transition: tokens.motion.fast,
            '&:hover': {
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            },
            '& .MuiButton-startIcon': { marginRight: 0, marginLeft: 0 },
            '& .MuiButton-endIcon': { marginRight: 0, marginLeft: 0 },
          },
          sizeSmall: {
            minHeight: 32,
            height: 32,
            paddingLeft: 10,
            paddingRight: 10,
            fontSize: '0.8125rem',
            borderRadius: tokens.radius.sm,
          },
          sizeLarge: {
            minHeight: 40,
            height: 40,
            paddingLeft: 18,
            paddingRight: 18,
          },
          containedPrimary: {
            backgroundColor: tokens.colors.primary,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: tokens.colors.primaryHover,
            },
          },
          containedError: {
            backgroundColor: tokens.colors.danger,
            '&:hover': {
              backgroundColor: '#DC2626',
            },
          },
          outlined: {
            borderWidth: 1,
            borderColor,
            backgroundColor: isDark ? 'transparent' : tokens.colors.card,
            color: palette.text.primary,
            '&:hover': {
              borderWidth: 1,
              borderColor: isDark ? alpha('#fff', 0.28) : '#D1D5DB',
              backgroundColor: palette.action.hover,
            },
          },
          text: {
            color: tokens.colors.primary,
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.button,
            minWidth: 36,
            minHeight: 36,
            transition: tokens.motion.fast,
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
          },
          sizeSmall: {
            minWidth: 32,
            minHeight: 32,
            padding: 6,
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
            border: `1px solid ${borderColor}`,
            transition: tokens.motion.fast,
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
            borderColor,
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
            boxShadow: isDark
              ? '-8px 0 24px rgba(0,0,0,0.4)'
              : '-8px 0 24px rgba(15,23,42,0.08)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? tokens.colors.sidebar : '#FFFFFF',
            borderBottom: `1px solid ${borderColor}`,
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
          size: 'small',
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: tokens.radius.input,
              backgroundColor: inputBg,
              minHeight: 40,
              transition: tokens.motion.fast,
              '& fieldset': {
                borderColor,
              },
              '&:hover fieldset': {
                borderColor: isDark ? alpha('#fff', 0.28) : '#D1D5DB',
              },
              '&.Mui-focused fieldset': {
                borderColor: tokens.colors.primary,
                borderWidth: 1,
              },
            },
            '& .MuiInputLabel-root': {
              lineHeight: 1.4,
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
            minHeight: 40,
            backgroundColor: inputBg,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha('#fff', 0.28) : '#D1D5DB',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.colors.primary,
              borderWidth: 1,
            },
          },
          input: {
            paddingTop: 10,
            paddingBottom: 10,
          },
          notchedOutline: {
            borderColor,
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
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? '0 20px 48px rgba(0,0,0,0.5)' : tokens.shadow.dialog,
            margin: 16,
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '20px 24px 8px',
            fontWeight: 600,
            fontSize: '1.0625rem',
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
            padding: '12px 24px 20px',
            gap: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
            height: 24,
          },
          sizeSmall: {
            height: 22,
            fontSize: '0.75rem',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.card,
            border: `1px solid ${borderColor}`,
            boxShadow: 'none',
            backgroundColor: palette.background.paper,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: palette.text.secondary,
              backgroundColor: isDark ? alpha('#fff', 0.03) : '#F8FAFC',
              borderBottom: `1px solid ${borderColor}`,
              whiteSpace: 'nowrap',
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: 14,
              paddingRight: 14,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor,
            fontSize: '0.8125rem',
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 14,
            paddingRight: 14,
            lineHeight: 1.45,
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
          root: { minHeight: 40 },
          indicator: {
            height: 2,
            borderRadius: 0,
            backgroundColor: tokens.colors.primary,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 40,
            fontSize: '0.875rem',
            paddingLeft: 12,
            paddingRight: 12,
            letterSpacing: 0,
            color: palette.text.secondary,
            '&.Mui-selected': {
              color: tokens.colors.primary,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: tokens.radius.sm,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
            backgroundColor: isDark ? '#1E293B' : '#0F172A',
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
            height: 6,
            backgroundColor: isDark ? 'rgba(148,163,184,0.2)' : '#E5E7EB',
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
            minHeight: 40,
            transition: tokens.motion.fast,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: tokens.radius.card,
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.45)' : tokens.shadow.dialog,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
            minHeight: 36,
            marginLeft: 4,
            marginRight: 4,
            fontSize: '0.875rem',
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: `${tokens.radius.button}px !important`,
            paddingLeft: 12,
            paddingRight: 12,
            minHeight: 32,
            letterSpacing: 0,
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .MuiPagination-ul': {
              gap: 4,
            },
            '& .MuiPaginationItem-root': {
              borderRadius: tokens.radius.sm,
              minWidth: 32,
              height: 32,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: palette.text.secondary,
              border: '1px solid transparent',
              '&.Mui-selected': {
                backgroundColor: tokens.colors.primary,
                color: '#FFFFFF',
                borderColor: tokens.colors.primary,
                '&:hover': {
                  backgroundColor: tokens.colors.primaryHover,
                },
              },
              '&:hover': {
                backgroundColor: palette.action.hover,
              },
            },
            '& .MuiPaginationItem-previousNext, & .MuiPaginationItem-firstLast': {
              borderColor,
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            '&:last-child': {
              paddingBottom: 20,
            },
          },
        },
      },
      MuiCardActions: {
        styleOverrides: {
          root: {
            padding: '0 20px 20px',
            gap: 8,
          },
        },
      },
    },
  });
};
