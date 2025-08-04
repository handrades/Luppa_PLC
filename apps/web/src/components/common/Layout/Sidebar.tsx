import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const DRAWER_WIDTH = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigationItems = [
  { label: 'Dashboard', path: '/', icon: DashboardIcon },
  { label: 'Equipment', path: '/equipment', icon: ComputerIcon },
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer
      variant='temporary'
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => handleNavigate(item.path)} selected={isActive}>
                  <ListItemIcon>
                    <Icon color={isActive ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}
