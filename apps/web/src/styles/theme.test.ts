import { createAppTheme, getStoredThemeMode, setStoredThemeMode } from './theme';
import './theme.types';

describe('Theme Configuration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('createAppTheme', () => {
    it('should create a light theme by default', () => {
      const theme = createAppTheme('light');
      expect(theme.palette.mode).toBe('light');
      expect(theme.palette.primary.main).toBe('#1976d2');
      expect(theme.palette.background.default).toBe('#fafafa');
      expect(theme.palette.text.primary).toBe('#212121');
    });

    it('should create a dark theme when specified', () => {
      const theme = createAppTheme('dark');
      expect(theme.palette.mode).toBe('dark');
      expect(theme.palette.primary.main).toBe('#90caf9');
      expect(theme.palette.background.default).toBe('#121212');
      expect(theme.palette.text.primary).toBe('#ffffff');
    });

    it('should have proper color palette structure', () => {
      const lightTheme = createAppTheme('light');
      expect(lightTheme.palette.primary.main).toBe('#1976d2');
      expect(lightTheme.palette.secondary.main).toBe('#424242');
      expect(lightTheme.palette.success.main).toBe('#4caf50');
      expect(lightTheme.palette.warning.main).toBe('#ff9800');
      expect(lightTheme.palette.error.main).toBe('#f44336');

      const darkTheme = createAppTheme('dark');
      expect(darkTheme.palette.primary.main).toBe('#90caf9');
      expect(darkTheme.palette.success.main).toBe('#81c784');
      expect(darkTheme.palette.warning.main).toBe('#ffb74d');
      expect(darkTheme.palette.error.main).toBe('#ef5350');
    });

    it('should have correct typography configuration', () => {
      const theme = createAppTheme('light');
      expect(theme.typography.fontFamily).toContain('Roboto');
      expect(theme.typography.h1.fontSize).toBe('2.5rem');
      expect(theme.typography.h2.fontSize).toBe('2rem');
      expect(theme.typography.h3.fontSize).toBe('1.75rem');
      expect(theme.typography.body1.fontSize).toBe('1rem');
      expect(theme.typography.button.textTransform).toBe('none');
    });

    it('should have correct breakpoint configuration', () => {
      const theme = createAppTheme('light');
      expect(theme.breakpoints.values).toEqual({
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      });
    });

    it('should use 8px spacing system', () => {
      const theme = createAppTheme('light');
      expect(theme.spacing(1)).toBe('8px');
      expect(theme.spacing(2)).toBe('16px');
      expect(theme.spacing(3)).toBe('24px');
    });

    it('should have high contrast ratios for industrial environment', () => {
      const lightTheme = createAppTheme('light');

      // Check primary colors have sufficient contrast
      expect(lightTheme.palette.primary.contrastText).toBe('#ffffff');
      expect(lightTheme.palette.secondary.contrastText).toBe('#ffffff');
      expect(lightTheme.palette.error.contrastText).toBe('#ffffff');
      expect(lightTheme.palette.success.contrastText).toBe('#ffffff');
    });
  });

  describe('Theme Mode Utilities', () => {
    describe('getStoredThemeMode', () => {
      it('should return light mode by default', () => {
        const mode = getStoredThemeMode();
        expect(mode).toBe('light');
      });

      it('should return stored dark mode', () => {
        localStorage.setItem('themeMode', 'dark');
        const mode = getStoredThemeMode();
        expect(mode).toBe('dark');
      });

      it('should return stored light mode', () => {
        localStorage.setItem('themeMode', 'light');
        const mode = getStoredThemeMode();
        expect(mode).toBe('light');
      });

      it('should return light mode for invalid stored values', () => {
        localStorage.setItem('themeMode', 'invalid');
        const mode = getStoredThemeMode();
        expect(mode).toBe('light');
      });
    });

    describe('setStoredThemeMode', () => {
      it('should store light mode', () => {
        setStoredThemeMode('light');
        expect(localStorage.getItem('themeMode')).toBe('light');
      });

      it('should store dark mode', () => {
        setStoredThemeMode('dark');
        expect(localStorage.getItem('themeMode')).toBe('dark');
      });
    });
  });

  describe('Theme Object Structure', () => {
    it('should have all required MUI theme properties', () => {
      const theme = createAppTheme('light');

      // Check core theme properties
      expect(theme).toHaveProperty('palette');
      expect(theme).toHaveProperty('typography');
      expect(theme).toHaveProperty('breakpoints');
      expect(theme).toHaveProperty('spacing');
      expect(theme).toHaveProperty('shape');
      expect(theme).toHaveProperty('components');
    });

    it('should have custom component overrides', () => {
      const theme = createAppTheme('light');

      expect(theme.components).toHaveProperty('MuiButton');
      expect(theme.components).toHaveProperty('MuiCard');
      expect(theme.components).toHaveProperty('MuiTextField');
      expect(theme.components).toHaveProperty('MuiTableHead');
      expect(theme.components).toHaveProperty('MuiCssBaseline');
    });

    it('should have correct shape configuration', () => {
      const theme = createAppTheme('light');
      expect(theme.shape.borderRadius).toBe(4);
    });
  });
});
