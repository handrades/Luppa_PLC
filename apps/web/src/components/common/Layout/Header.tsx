import { 
  AppBar, 
  Avatar, 
  Box, 
  IconButton, 
  Menu,
  MenuItem,
  Toolbar,
  Typography
} from '@mui/material'
import { 
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon
} from '@mui/icons-material'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
          aria-label="menu"
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Luppa Inventory
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="large"
            edge="end"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              <AccountCircleIcon />
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          onClick={handleProfileMenuClose}
        >
          <MenuItem>
            <AccountCircleIcon sx={{ mr: 2 }} />
            Profile
          </MenuItem>
          <MenuItem>
            <LogoutIcon sx={{ mr: 2 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
