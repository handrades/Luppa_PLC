import React from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
  Business as BusinessIcon,
  GridView as GridViewIcon,
  Inventory as InventoryIcon,
  Memory as MemoryIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { DashboardOverview } from '../../types/analytics';

interface OverviewCardProps {
  data: DashboardOverview;
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, trend }) => {
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case 'up':
        return <TrendingUpIcon sx={{ color: 'success.main' }} />;
      case 'down':
        return <TrendingDownIcon sx={{ color: 'error.main' }} />;
      case 'stable':
        return <TrendingFlatIcon sx={{ color: 'text.secondary' }} />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text.secondary';
    switch (trend.direction) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      case 'stable':
        return 'text.secondary';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography color='text.secondary' gutterBottom variant='subtitle2'>
              {title}
            </Typography>
            <Typography variant='h4' component='div' sx={{ mb: 1 }}>
              {value.toLocaleString()}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getTrendIcon()}
                <Typography variant='body2' sx={{ color: getTrendColor() }}>
                  {trend.percentage.toFixed(1)}% this week
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const OverviewCard: React.FC<OverviewCardProps> = ({ data }) => {
  const metrics = [
    {
      title: 'Total Equipment',
      value: data.totalEquipment,
      icon: <InventoryIcon sx={{ color: 'white' }} />,
      color: '#0088FE',
    },
    {
      title: 'Total PLCs',
      value: data.totalPLCs,
      icon: <MemoryIcon sx={{ color: 'white' }} />,
      color: '#00C49F',
      trend: data.weeklyTrend,
    },
    {
      title: 'Total Sites',
      value: data.totalSites,
      icon: <BusinessIcon sx={{ color: 'white' }} />,
      color: '#FFBB28',
    },
    {
      title: 'Total Cells',
      value: data.totalCells,
      icon: <GridViewIcon sx={{ color: 'white' }} />,
      color: '#FF8042',
    },
  ];

  return (
    <Grid container spacing={2}>
      {metrics.map((metric, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <MetricCard {...metric} />
        </Grid>
      ))}
    </Grid>
  );
};

export default OverviewCard;
