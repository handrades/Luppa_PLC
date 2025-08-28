import React, { useEffect, useRef } from 'react';
import { Alert, Box, Button, Grid, IconButton, Paper, Skeleton, Typography } from '@mui/material';
import {
  AutorenewOutlined as AutoRefreshIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import OverviewCard from '../../components/analytics/OverviewCard';
import DistributionPieChart from '../../components/analytics/DistributionPieChart';
import TopModelsBarChart from '../../components/analytics/TopModelsBarChart';
import HierarchyTreemap from '../../components/analytics/HierarchyTreemap';
import RecentActivityList from '../../components/analytics/RecentActivityList';
import { exportToPDF } from '../../utils/pdfExport';

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const EquipmentDashboard: React.FC = () => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const {
    overview,
    distribution,
    topModels,
    hierarchy,
    recentActivity,
    loadingOverview,
    loadingDistribution,
    loadingTopModels,
    loadingHierarchy,
    loadingActivity,
    exportingDashboard,
    overviewError,
    distributionError,
    topModelsError,
    hierarchyError,
    activityError,
    fetchAllData,
    exportDashboard,
    setAutoRefresh,
  } = useAnalyticsStore();

  useEffect(() => {
    // Initial data fetch
    fetchAllData();

    // Setup auto-refresh
    setAutoRefresh(AUTO_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      setAutoRefresh(null);
    };
  }, [fetchAllData, setAutoRefresh]);

  const handleRefresh = async () => {
    await fetchAllData();
  };

  const handleExport = async () => {
    const exportData = await exportDashboard({
      format: 'pdf',
      sections: ['overview', 'distribution', 'topModels', 'hierarchy', 'activity'],
      includeTimestamp: true,
    });

    if (exportData && dashboardRef.current) {
      await exportToPDF(dashboardRef.current, exportData);
    }
  };

  const renderError = (error: string | null, title: string) => {
    if (!error) return null;
    return (
      <Alert severity='error' sx={{ mb: 2 }}>
        <Typography variant='subtitle2'>{title}</Typography>
        <Typography variant='body2'>{error}</Typography>
      </Alert>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant='h4' component='h1'>
          Equipment Analytics Dashboard
        </Typography>
        <Box>
          <IconButton
            onClick={handleRefresh}
            color='primary'
            title='Refresh Dashboard'
            disabled={loadingOverview || loadingDistribution || loadingTopModels}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant='contained'
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exportingDashboard}
            sx={{ ml: 1 }}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Auto-refresh indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AutoRefreshIcon fontSize='small' sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant='caption' color='text.secondary'>
          Auto-refreshes every 5 minutes
        </Typography>
      </Box>

      <div ref={dashboardRef}>
        <Grid container spacing={3}>
          {/* Overview Cards */}
          <Grid item xs={12}>
            {renderError(overviewError, 'Failed to load overview')}
            {loadingOverview ? (
              <Grid container spacing={2}>
                {[1, 2, 3, 4].map(i => (
                  <Grid item xs={12} sm={6} md={3} key={i}>
                    <Skeleton variant='rectangular' height={120} />
                  </Grid>
                ))}
              </Grid>
            ) : overview ? (
              <OverviewCard data={overview} />
            ) : null}
          </Grid>

          {/* Distribution Charts */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant='h6' gutterBottom>
                Distribution by Site
              </Typography>
              {renderError(distributionError, 'Failed to load distribution')}
              {loadingDistribution ? (
                <Skeleton variant='circular' width={240} height={240} sx={{ mx: 'auto' }} />
              ) : distribution.site ? (
                <DistributionPieChart
                  data={distribution.site}
                  title='Site'
                  onSegmentClick={() => {
                    /* Handle click */
                  }}
                />
              ) : null}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant='h6' gutterBottom>
                Distribution by Manufacturer
              </Typography>
              {loadingDistribution ? (
                <Skeleton variant='circular' width={240} height={240} sx={{ mx: 'auto' }} />
              ) : distribution.make ? (
                <DistributionPieChart
                  data={distribution.make}
                  title='Make'
                  onSegmentClick={() => {
                    /* Handle click */
                  }}
                />
              ) : null}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant='h6' gutterBottom>
                Distribution by Equipment Type
              </Typography>
              {loadingDistribution ? (
                <Skeleton variant='circular' width={240} height={240} sx={{ mx: 'auto' }} />
              ) : distribution.type ? (
                <DistributionPieChart
                  data={distribution.type}
                  title='Type'
                  onSegmentClick={() => {
                    /* Handle click */
                  }}
                />
              ) : null}
            </Paper>
          </Grid>

          {/* Top Models Bar Chart */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant='h6' gutterBottom>
                Top 10 Equipment Models
              </Typography>
              {renderError(topModelsError, 'Failed to load top models')}
              {loadingTopModels ? (
                <Skeleton variant='rectangular' height={320} />
              ) : topModels.length > 0 ? (
                <TopModelsBarChart
                  data={topModels}
                  onBarClick={() => {
                    /* Handle click */
                  }}
                />
              ) : (
                <Typography color='text.secondary' align='center' sx={{ mt: 10 }}>
                  No equipment data available
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2, height: 400, overflow: 'hidden' }}>
              <Typography variant='h6' gutterBottom>
                Recent Activity
              </Typography>
              {renderError(activityError, 'Failed to load activity')}
              {loadingActivity && recentActivity.length === 0 ? (
                <Box>
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : (
                <RecentActivityList activities={recentActivity} />
              )}
            </Paper>
          </Grid>

          {/* Hierarchy Visualization */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: 500 }}>
              <Typography variant='h6' gutterBottom>
                Site Hierarchy Overview
              </Typography>
              {renderError(hierarchyError, 'Failed to load hierarchy')}
              {loadingHierarchy ? (
                <Skeleton variant='rectangular' height={440} />
              ) : hierarchy.length > 0 ? (
                <HierarchyTreemap
                  data={hierarchy}
                  onNodeClick={() => {
                    /* Handle click */
                  }}
                />
              ) : (
                <Typography color='text.secondary' align='center' sx={{ mt: 10 }}>
                  No hierarchy data available
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </div>
    </Box>
  );
};

export default EquipmentDashboard;
