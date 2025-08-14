const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.send('healthy');
});

// Basic auth endpoints (mock for now)
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Mock authentication - accept any credentials for now
  if (username && password) {
    res.json({
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: '1',
        username: username,
        email: username + '@luppa.local',
        roles: ['user'],
      },
      expiresIn: 3600,
    });
  } else {
    res.status(400).json({ error: 'Username and password required' });
  }
});

app.post('/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

app.get('/auth/me', (req, res) => {
  res.json({
    id: '1',
    username: 'demo',
    email: 'demo@luppa.local',
    roles: ['user'],
  });
});

// Basic equipment endpoint (mock)
app.get('/equipment', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'PLC-001',
      type: 'Allen Bradley',
      ip: '192.168.1.100',
      status: 'online',
    },
  ]);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close();
});
