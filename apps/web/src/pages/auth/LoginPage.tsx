import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { authService } from '../../services/auth.service';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.login({ username: email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      display='flex'
      justifyContent='center'
      alignItems='center'
      minHeight='100vh'
      bgcolor='background.default'
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant='h4' component='h1' textAlign='center' mb={3}>
            Luppa Inventory
          </Typography>
          <Typography variant='body1' textAlign='center' mb={4} color='text.secondary'>
            Sign in to access the system
          </Typography>

          {error && (
            <Alert severity='error' sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box
            component='form'
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
          >
            <TextField
              label='Email'
              type='email'
              variant='outlined'
              fullWidth
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <TextField
              label='Password'
              type='password'
              variant='outlined'
              fullWidth
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type='submit'
              variant='contained'
              size='large'
              fullWidth
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
