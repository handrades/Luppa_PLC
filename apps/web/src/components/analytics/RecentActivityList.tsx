import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  GridView as CellIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings as EquipmentIcon,
  Memory as PLCIcon,
  Business as SiteIcon,
} from '@mui/icons-material';
import { RecentActivity } from '../../types/analytics';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import analyticsService from '../../services/analytics.service';

interface RecentActivityListProps {
  activities: RecentActivity[];
}

const RecentActivityList: React.FC<RecentActivityListProps> = ({ activities }) => {
  const { fetchRecentActivity, loadingActivity, hasMoreActivity } = useAnalyticsStore();

  const getActionIcon = (action: RecentActivity['action']) => {
    switch (action) {
      case 'create':
        return <AddIcon />;
      case 'update':
        return <EditIcon />;
      case 'delete':
        return <DeleteIcon />;
      default:
        return <EditIcon />;
    }
  };

  const getActionColor = (action: RecentActivity['action']) => {
    switch (action) {
      case 'create':
        return '#4caf50';
      case 'update':
        return '#2196f3';
      case 'delete':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getEntityIcon = (entityType: RecentActivity['entityType']) => {
    switch (entityType) {
      case 'plc':
        return <PLCIcon fontSize='small' />;
      case 'equipment':
        return <EquipmentIcon fontSize='small' />;
      case 'cell':
        return <CellIcon fontSize='small' />;
      case 'site':
        return <SiteIcon fontSize='small' />;
      default:
        return <EquipmentIcon fontSize='small' />;
    }
  };

  const getEntityColor = (entityType: RecentActivity['entityType']) => {
    switch (entityType) {
      case 'plc':
        return 'primary';
      case 'equipment':
        return 'secondary';
      case 'cell':
        return 'info';
      case 'site':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatRelativeTime = (timestamp: Date | string) => {
    return analyticsService.formatRelativeTime(timestamp);
  };

  const handleLoadMore = () => {
    fetchRecentActivity(true);
  };

  if (activities.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color='text.secondary'>No recent activity</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <List sx={{ flex: 1, overflow: 'auto', maxHeight: 320 }}>
        {activities.map(activity => (
          <ListItem
            key={activity.id}
            data-testid='activity-item'
            alignItems='flex-start'
            sx={{ px: 0 }}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: getActionColor(activity.action),
                  width: 32,
                  height: 32,
                }}
              >
                {getActionIcon(activity.action)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='body2' component='span'>
                    {activity.userName}
                  </Typography>
                  <Typography variant='body2' component='span' color='text.secondary'>
                    {activity.action}d
                  </Typography>
                  <Chip
                    icon={getEntityIcon(activity.entityType)}
                    label={activity.entityType}
                    size='small'
                    color={
                      getEntityColor(activity.entityType) as
                        | 'default'
                        | 'primary'
                        | 'secondary'
                        | 'error'
                        | 'info'
                        | 'success'
                        | 'warning'
                    }
                    variant='outlined'
                  />
                </Box>
              }
              secondary={
                <React.Fragment>
                  <Typography
                    component='span'
                    variant='body2'
                    color='text.primary'
                    sx={{ fontWeight: 500 }}
                  >
                    {activity.entityName}
                  </Typography>
                  <Typography
                    component='span'
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block' }}
                  >
                    {formatRelativeTime(activity.timestamp)}
                  </Typography>
                </React.Fragment>
              }
            />
          </ListItem>
        ))}
      </List>

      {hasMoreActivity && (
        <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button fullWidth size='small' onClick={handleLoadMore} disabled={loadingActivity}>
            {loadingActivity ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default RecentActivityList;
