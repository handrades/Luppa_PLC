import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material'

export function LoginPage() {
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" textAlign="center" mb={3}>
            Luppa PLC Inventory
          </Typography>
          <Typography variant="body1" textAlign="center" mb={4} color="text.secondary">
            Sign in to access the system
          </Typography>
          
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              required
            />
            <Button 
              variant="contained" 
              size="large" 
              fullWidth
              sx={{ mt: 2 }}
            >
              Sign In
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
