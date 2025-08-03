import { Box, Button, Paper, Typography } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      display='flex'
      justifyContent='center'
      alignItems='center'
      minHeight='100vh'
      bgcolor='background.default'
      p={2}
    >
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
        <Typography variant='h1' color='primary' mb={2}>
          404
        </Typography>
        <Typography variant='h4' mb={2}>
          Page Not Found
        </Typography>
        <Typography variant='body1' color='text.secondary' mb={4}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Button variant='contained' startIcon={<HomeIcon />} onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}
