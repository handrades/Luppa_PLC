import { Box, Link, Breadcrumbs as MuiBreadcrumbs, Typography } from '@mui/material';
import { Home as HomeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ElementType;
}

interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
}

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/equipment': 'Equipment',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

export function Breadcrumbs({
  customItems,
  separator = <NavigateNextIcon fontSize='small' />,
  maxItems = 4,
}: BreadcrumbsProps) {
  const location = useLocation();

  const breadcrumbItems = useMemo(() => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: 'Home', path: '/', icon: HomeIcon }];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label =
        routeLabels[currentPath] ||
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

      items.push({
        label,
        path: index === pathSegments.length - 1 ? undefined : currentPath,
      });
    });

    return items;
  }, [location.pathname, customItems]);

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <MuiBreadcrumbs
        separator={separator}
        maxItems={maxItems}
        itemsAfterCollapse={2}
        aria-label='breadcrumb navigation'
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;

          if (isLast || !item.path) {
            return (
              <Typography
                key={item.label}
                color='text.primary'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 500,
                }}
              >
                {Icon && <Icon sx={{ mr: 0.5, fontSize: 20 }} />}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.path}
              component={RouterLink}
              to={item.path}
              color='inherit'
              underline='hover'
              sx={{
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {Icon && <Icon sx={{ mr: 0.5, fontSize: 20 }} />}
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
}
