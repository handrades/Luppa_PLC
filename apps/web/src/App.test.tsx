import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import { theme } from './styles/theme';

const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

describe('App', () => {
  test('renders without crashing', () => {
    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );
  });

  test('renders dashboard by default', () => {
    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
