import type { Preview } from '@storybook/react-vite';
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { PaletteMode } from '@mui/material';
import { createAppTheme } from '../src/styles/theme';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
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
    (Story, context) => {
      const [mode, setMode] = useState<PaletteMode>('light');

      useEffect(() => {
        // Use the theme toolbar value, fallback to background-based detection
        const themeMode = context.globals.theme as PaletteMode;
        if (themeMode === 'light' || themeMode === 'dark') {
          setMode(themeMode);
        } else {
          // Fallback: Check if dark background is selected
          const isDark = context.globals.backgrounds?.value === '#121212';
          setMode(isDark ? 'dark' : 'light');
        }
      }, [context.globals.theme, context.globals.backgrounds]);

      const theme = createAppTheme(mode);

      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div style={{ minHeight: '100vh', padding: '1rem' }}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light Mode', icon: 'sun' },
          { value: 'dark', title: 'Dark Mode', icon: 'moon' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
