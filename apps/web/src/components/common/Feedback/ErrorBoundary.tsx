import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Home as HomeIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight='100vh'
          bgcolor='background.default'
          p={2}
        >
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600 }}>
            <Typography variant='h4' color='error' mb={2}>
              Something went wrong
            </Typography>
            <Typography variant='body1' color='text.secondary' mb={3}>
              An unexpected error occurred. Please refresh the page or return to the dashboard.
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  textAlign: 'left',
                  bgcolor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  mb: 3,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                }}
              >
                <Typography variant='subtitle2' mb={1}>
                  Error Details:
                </Typography>
                <Typography variant='body2'>{this.state.error.message}</Typography>
                {this.state.errorInfo && (
                  <Typography variant='body2' sx={{ mt: 1 }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Box>
            )}

            <Box display='flex' gap={2} justifyContent='center'>
              <Button
                variant='contained'
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
              <Button
                variant='outlined'
                startIcon={<HomeIcon />}
                onClick={() => (window.location.href = '/')}
              >
                Go to Dashboard
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
