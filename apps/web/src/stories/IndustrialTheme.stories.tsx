import type { Meta, StoryObj } from '@storybook/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { createAppTheme } from '../styles/theme';

const ThemeShowcase = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={4}>
        {/* Typography Section */}
        <Card>
          <CardContent>
            <Typography variant='h1' gutterBottom>
              H1: Industrial Control System
            </Typography>
            <Typography variant='h2' gutterBottom>
              H2: Equipment Monitoring
            </Typography>
            <Typography variant='h3' gutterBottom>
              H3: PLC Configuration
            </Typography>
            <Typography variant='body1' gutterBottom>
              Body 1: This is the standard body text used throughout the application for general
              content and descriptions. It provides optimal readability on various industrial
              display types.
            </Typography>
            <Typography variant='caption' display='block' gutterBottom>
              Caption: Used for labels, timestamps, and secondary information
            </Typography>
            <Typography
              variant='body1'
              component='div'
              sx={{ fontFamily: 'Roboto Mono, monospace' }}
            >
              IP Address: 192.168.1.100
            </Typography>
          </CardContent>
        </Card>

        {/* Color Palette Section */}
        <Card>
          <CardContent>
            <Typography variant='h3' gutterBottom>
              Color Palette
            </Typography>
            <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
              <Chip label='Primary' color='primary' />
              <Chip label='Secondary' color='secondary' />
              <Chip label='Success' color='success' />
              <Chip label='Warning' color='warning' />
              <Chip label='Error' color='error' />
              <Chip label='Info' color='info' />
            </Stack>
            <Stack spacing={2}>
              <Alert severity='success' icon={<CheckCircleIcon />}>
                Equipment Online - All systems operational
              </Alert>
              <Alert severity='warning' icon={<WarningIcon />}>
                Warning - High temperature detected in Zone 3
              </Alert>
              <Alert severity='error' icon={<ErrorIcon />}>
                Critical - Connection lost to PLC Unit 5
              </Alert>
              <Alert severity='info' icon={<InfoIcon />}>
                Information - Scheduled maintenance in 2 hours
              </Alert>
            </Stack>
          </CardContent>
        </Card>

        {/* Buttons Section */}
        <Card>
          <CardContent>
            <Typography variant='h3' gutterBottom>
              Button Variants
            </Typography>
            <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
              <Button variant='contained' color='primary'>
                Start Process
              </Button>
              <Button variant='contained' color='secondary'>
                Configure
              </Button>
              <Button variant='contained' color='success'>
                Connect
              </Button>
              <Button variant='contained' color='error'>
                Emergency Stop
              </Button>
            </Stack>
            <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
              <Button variant='outlined' color='primary'>
                View Details
              </Button>
              <Button variant='outlined' color='secondary'>
                Export Data
              </Button>
              <Button variant='text' color='primary'>
                Cancel
              </Button>
              <IconButton color='primary' aria-label='settings'>
                <SettingsIcon />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>

        {/* Form Controls Section */}
        <Card>
          <CardContent>
            <Typography variant='h3' gutterBottom>
              Form Controls
            </Typography>
            <Stack spacing={2}>
              <TextField
                label='Equipment ID'
                variant='outlined'
                placeholder='Enter equipment identifier'
                fullWidth
              />
              <TextField
                label='IP Address'
                variant='outlined'
                placeholder='192.168.1.100'
                fullWidth
                sx={{ '& input': { fontFamily: 'Roboto Mono, monospace' } }}
              />
              <TextField
                label='Description'
                variant='outlined'
                multiline
                rows={3}
                placeholder='Enter equipment description'
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Data Table Section */}
        <Card>
          <CardContent>
            <Typography variant='h3' gutterBottom>
              Data Display
            </Typography>
            <Paper variant='outlined'>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>PLC ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Last Update</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>PLC-001</TableCell>
                    <TableCell>
                      <Chip label='Online' color='success' size='small' />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace' }}>
                      192.168.1.101
                    </TableCell>
                    <TableCell>2 min ago</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>PLC-002</TableCell>
                    <TableCell>
                      <Chip label='Warning' color='warning' size='small' />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace' }}>
                      192.168.1.102
                    </TableCell>
                    <TableCell>5 min ago</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>PLC-003</TableCell>
                    <TableCell>
                      <Chip label='Offline' color='error' size='small' />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace' }}>
                      192.168.1.103
                    </TableCell>
                    <TableCell>1 hour ago</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

const meta = {
  title: 'Theme/Industrial Theme',
  component: ThemeShowcase,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightMode: Story = {
  decorators: [
    Story => (
      <ThemeProvider theme={createAppTheme('light')}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: { default: 'light' },
  },
};

export const DarkMode: Story = {
  decorators: [
    Story => (
      <ThemeProvider theme={createAppTheme('dark')}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
