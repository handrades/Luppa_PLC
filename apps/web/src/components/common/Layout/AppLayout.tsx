import { ComponentProps, ReactNode, useState } from 'react';
import { Box, Container, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Header } from './Header';
import { DRAWER_WIDTH, Sidebar } from './Sidebar';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';

interface AppLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disablePadding?: boolean;
  containerProps?: Partial<ComponentProps<typeof Container>>;
}

export function AppLayout({
  children,
  fullWidth = false,
  maxWidth = 'lg',
  disablePadding = false,
  containerProps = {},
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Enable scroll restoration
  useScrollRestoration();

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const contentPadding = disablePadding
    ? 0
    : {
        xs: 2,
        sm: 3,
        md: 3,
      };

  const mainContent = (
    <Box
      component='main'
      sx={{
        flexGrow: 1,
        bgcolor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        ml: isDesktop ? `${DRAWER_WIDTH}px` : 0,
        transition: theme.transitions.create(['margin-left'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar />
      {fullWidth ? (
        <Box sx={{ flexGrow: 1, p: contentPadding }}>{children}</Box>
      ) : (
        <Container
          maxWidth={maxWidth}
          sx={{
            flexGrow: 1,
            py: contentPadding,
            px: contentPadding,
          }}
          {...containerProps}
        >
          {children}
        </Container>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onMenuClick={handleMenuClick} />
      <Sidebar
        open={isMobile ? sidebarOpen : true}
        onClose={handleSidebarClose}
        variant={isMobile ? 'temporary' : 'permanent'}
      />
      {mainContent}
    </Box>
  );
}
