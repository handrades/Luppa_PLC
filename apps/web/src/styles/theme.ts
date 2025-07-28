import { createTheme } from '@mui/material/styles'

// Industrial color palette suitable for manufacturing environments
const industrialColors = {
  primary: {
    main: '#1565C0', // Deep blue - trust, reliability
    light: '#42A5F5',
    dark: '#0D47A1',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#424242', // Industrial gray
    light: '#6D6D6D',
    dark: '#1B1B1B',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#D32F2F', // Safety red
    light: '#EF5350',
    dark: '#C62828',
  },
  warning: {
    main: '#F57C00', // Caution orange
    light: '#FF9800',
    dark: '#E65100',
  },
  info: {
    main: '#0288D1', // Information blue
    light: '#03A9F4',
    dark: '#01579B',
  },
  success: {
    main: '#388E3C', // Equipment operational green
    light: '#4CAF50',
    dark: '#1B5E20',
  },
  background: {
    default: '#F5F5F5', // Light gray for readability
    paper: '#FFFFFF',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
  },
}

export const theme = createTheme({
  palette: industrialColors,
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none', // Preserve case for industrial readability
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
          backgroundColor: '#F5F5F5',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: '#424242',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1565C0',
          color: '#FFFFFF',
        },
      },
    },
  },
})

