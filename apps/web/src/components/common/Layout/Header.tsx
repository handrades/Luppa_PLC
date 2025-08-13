import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../../../stores/authStore';

interface HeaderProps {
  onMenuClick: () => void;
}

const roleDisplayNames: Record<string, string> = {
  admin: 'Administrator',
  user: 'User',
  viewer: 'Viewer',
  operator: 'Operator',
  engineer: 'Engineer',
};

export function Header({ onMenuClick }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { user, isLoading, logout, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleProfileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleProfileMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(() => {
    handleProfileMenuClose();
    logout();
  }, [handleProfileMenuClose, logout]);

  const getUserInitials = useMemo(() => {
    if (!user) return '';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }, [user]);

  const getUserDisplayName = useMemo(() => {
    if (!user) return 'Guest';
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }, [user]);

  const getRoleDisplayName = useMemo(() => {
    if (!user) return '';
    return roleDisplayNames[user.roleId] || user.roleId;
  }, [user]);

  return (
    <AppBar position='fixed' sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {isMobile && (
          <IconButton
            color='inherit'
            edge='start'
            onClick={onMenuClick}
            sx={{ mr: 2 }}
            aria-label='open navigation menu'
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
          Luppa Inventory
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThemeToggle />

          {isLoading ? (
            <Skeleton variant='circular' width={32} height={32} />
          ) : (
            <IconButton
              size='large'
              edge='end'
              onClick={handleProfileMenuOpen}
              color='inherit'
              aria-label='user menu'
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user ? getUserInitials : <AccountCircleIcon />}
              </Avatar>
            </IconButton>
          )}
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          onClick={handleProfileMenuClose}
          PaperProps={{
            sx: {
              minWidth: 200,
              mt: 1,
            },
          }}
        >
          {user && (
            <>
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant='subtitle1' fontWeight={600}>
                  {getUserDisplayName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {user.email}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Role: {getRoleDisplayName}
                </Typography>
              </Box>
              <Divider />
            </>
          )}
          <MenuItem onClick={handleProfileMenuClose}>
            <PersonIcon sx={{ mr: 2 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 2 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
