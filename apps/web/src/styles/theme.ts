import { PaletteMode, ThemeOptions, createTheme } from '@mui/material/styles';
import './theme.types';

// Industrial color palettes with high contrast for manufacturing environments
const lightPalette = {
  mode: 'light' as PaletteMode,
  primary: {
    main: '#1976d2', // Primary actions, links, active states
    dark: '#115293', // Hover states, emphasis
    light: '#42a5f5',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#424242', // Secondary actions, neutral elements
    light: '#6d6d6d',
    dark: '#1b1b1b',
    contrastText: '#ffffff',
  },
  error: {
    main: '#f44336', // Errors, destructive actions, offline indicators
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ff9800', // Caution orange
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#000000',
  },
  info: {
    main: '#2196f3', // Information blue
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#ffffff',
  },
  success: {
    main: '#4caf50', // Confirmations, online indicators
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#ffffff',
  },
  background: {
    default: '#fafafa', // Main background
    paper: '#ffffff', // Cards, modals, elevated elements
  },
  text: {
    primary: '#212121', // Main text content
    secondary: '#757575', // Supporting text, labels
    disabled: '#bdbdbd',
  },
  divider: '#e0e0e0',
};

const darkPalette = {
  mode: 'dark' as PaletteMode,
  primary: {
    main: '#90caf9', // Lighter for contrast
    dark: '#42a5f5',
    light: '#bbdefb',
    contrastText: '#000000',
  },
  secondary: {
    main: '#b0b0b0', // Lighter gray for dark mode
    light: '#e0e0e0',
    dark: '#616161',
    contrastText: '#000000',
  },
  error: {
    main: '#ef5350',
    light: '#e57373',
    dark: '#f44336',
    contrastText: '#000000',
  },
  warning: {
    main: '#ffb74d',
    light: '#ffd54f',
    dark: '#ff9800',
    contrastText: '#000000',
  },
  info: {
    main: '#64b5f6',
    light: '#90caf9',
    dark: '#42a5f5',
    contrastText: '#000000',
  },
  success: {
    main: '#81c784',
    light: '#a5d6a7',
    dark: '#66bb6a',
    contrastText: '#000000',
  },
  background: {
    default: '#121212', // Material Design dark
    paper: '#1e1e1e', // Cards, modals
  },
  text: {
    primary: '#ffffff', // Main text
    secondary: '#b3b3b3', // Supporting text
    disabled: '#616161',
  },
  divider: '#424242',
};

// Typography configuration optimized for industrial displays
const typographyConfig = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: '-0.01562em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 500,
    lineHeight: 1.3,
    letterSpacing: '-0.00833em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0em',
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.66,
    letterSpacing: '0.03333em',
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: '0.02857em',
    textTransform: 'none' as const,
  },
  // Technical data display fonts
  code: {
    fontFamily: '"Roboto Mono", monospace',
    fontSize: '0.875rem',
  },
};

// Custom breakpoints for responsive industrial layouts
const breakpointsConfig = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
};

// 8px base spacing system
const spacingConfig = 8;

// Create theme with mode support
export const createAppTheme = (mode: PaletteMode = 'light') => {
  const palette = mode === 'light' ? lightPalette : darkPalette;

  // Pre-compute theme-dependent values
  const isDark = mode === 'dark';
  const scrollbarTrack = isDark ? '#2e2e2e' : '#f5f5f5';
  const scrollbarThumb = isDark ? '#616161' : '#bdbdbd';
  const buttonShadow = isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)';
  const buttonHoverShadow = isDark ? '0 4px 8px rgba(0,0,0,0.4)' : '0 4px 8px rgba(0,0,0,0.15)';
  const cardShadow = isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
  const tableHeadBg = isDark ? '#2e2e2e' : '#f5f5f5';
  const tableHeadColor = isDark ? '#e0e0e0' : '#424242';
  const tableBorder = isDark ? '#424242' : '#e0e0e0';

  // Create theme with proper Material-UI structure
  return createTheme({
    palette: {
      mode: palette.mode,
      primary: palette.primary,
      secondary: palette.secondary,
      error: palette.error,
      warning: palette.warning,
      info: palette.info,
      success: palette.success,
      background: palette.background,
      text: palette.text,
      divider: palette.divider,
    },
    typography: typographyConfig,
    breakpoints: breakpointsConfig,
    spacing: spacingConfig,
    shape: {
      borderRadius: 4,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: `${scrollbarThumb} ${scrollbarTrack}`,
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 12,
              height: 12,
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              backgroundColor: scrollbarTrack,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              backgroundColor: scrollbarThumb,
              borderRadius: 6,
              border: `2px solid ${scrollbarTrack}`,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            padding: '8px 16px',
            textTransform: 'none',
            fontWeight: 500,
          },
          contained: {
            boxShadow: buttonShadow,
            '&:hover': {
              boxShadow: buttonHoverShadow,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: cardShadow,
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: tableHeadBg,
            '& .MuiTableCell-head': {
              fontWeight: 600,
              color: tableHeadColor,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${tableBorder}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            maxWidth: 1200,
            paddingLeft: 24,
            paddingRight: 24,
            '@media (max-width: 600px)': {
              paddingLeft: 16,
              paddingRight: 16,
            },
          },
        },
      },
    },
  } as ThemeOptions);
};

// Default light theme export for backwards compatibility
export const theme = createAppTheme('light');

// Theme mode utilities
export const getStoredThemeMode = (): PaletteMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('themeMode');
  return stored === 'dark' || stored === 'light' ? stored : 'light';
};

export const setStoredThemeMode = (mode: PaletteMode): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('themeMode', mode);
  }
};
