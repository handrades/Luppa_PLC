import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from '../src/styles/theme';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: {
        base: 'light',
        colorPrimary: '#1976d2',
        colorSecondary: '#dc004e',
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#121212',
        },
        {
          name: 'industrial',
          value: '#f5f5f5',
        },
      ],
    },
  },
  decorators: [
    Story => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ minHeight: '100vh' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
