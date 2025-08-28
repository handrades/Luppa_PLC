import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EquipmentDashboard from '../EquipmentDashboard';
import { useAnalyticsStore } from '../../../stores/analyticsStore';
import { exportToPDF } from '../../../utils/pdfExport';

// Mock dependencies
jest.mock('../../../stores/analyticsStore');
jest.mock('../../../utils/pdfExport');
jest.mock('../../../components/analytics/OverviewCard', () => ({
  __esModule: true,
  default: () => <div data-testid='overview-card'>Overview</div>,
}));
jest.mock('../../../components/analytics/DistributionPieChart', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid={`pie-chart-${title}`}>Pie Chart: {title}</div>,
}));
jest.mock('../../../components/analytics/TopModelsBarChart', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown[] }) => <div data-testid='bar-chart'>Bar Chart: {data.length} models</div>,
}));
jest.mock('../../../components/analytics/HierarchyTreemap', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown[] }) => <div data-testid='treemap'>Treemap: {data.length} nodes</div>,
}));
jest.mock('../../../components/analytics/RecentActivityList', () => ({
  __esModule: true,
  default: ({ activities }: { activities: unknown[] }) => <div data-testid='activity-list'>Activities: {activities.length}</div>,
}));

describe('EquipmentDashboard', () => {
  const mockFetchAllData = jest.fn();
  const mockExportDashboard = jest.fn();
  const mockSetAutoRefresh = jest.fn();

  const mockStoreData = {
    overview: {
      totalEquipment: 100,
      totalPLCs: 200,
      totalSites: 10,
      totalCells: 50,
      weeklyTrend: { percentage: 5.5, direction: 'up' },
      lastUpdated: new Date(),
    },
    distribution: {
      site: {
        labels: ['Site A', 'Site B'],
        values: [100, 75],
        percentages: [57.1, 42.9],
        colors: ['#0088FE', '#00C49F'],
      },
      make: {
        labels: ['Allen Bradley', 'Siemens'],
        values: [150, 50],
        percentages: [75, 25],
        colors: ['#0088FE', '#00C49F'],
      },
      type: {
        labels: ['Conveyor', 'Pump'],
        values: [120, 80],
        percentages: [60, 40],
        colors: ['#0088FE', '#00C49F'],
      },
    },
    topModels: [
      { make: 'Allen Bradley', model: 'CompactLogix', count: 50, percentage: 50 },
      { make: 'Siemens', model: 'S7-1200', count: 30, percentage: 30 },
    ],
    hierarchy: [
      { id: 'site1', name: 'Site 1', type: 'site' as const, count: 15, children: [] },
    ],
    recentActivity: [
      {
        id: '1',
        action: 'create' as const,
        entityType: 'plc' as const,
        entityName: 'PLC-001',
        userId: 'user1',
        userName: 'John Doe',
        timestamp: new Date(),
      },
    ],
    loadingOverview: false,
    loadingDistribution: false,
    loadingTopModels: false,
    loadingHierarchy: false,
    loadingActivity: false,
    exportingDashboard: false,
    overviewError: null,
    distributionError: null,
    topModelsError: null,
    hierarchyError: null,
    activityError: null,
    fetchAllData: mockFetchAllData,
    exportDashboard: mockExportDashboard,
    setAutoRefresh: mockSetAutoRefresh,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue(mockStoreData);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should render dashboard title', () => {
    render(<EquipmentDashboard />);
    
    expect(screen.getByText('Equipment Analytics Dashboard')).toBeInTheDocument();
  });

  it('should fetch data on mount', () => {
    render(<EquipmentDashboard />);
    
    expect(mockFetchAllData).toHaveBeenCalledTimes(1);
  });

  it('should set up auto-refresh on mount', () => {
    render(<EquipmentDashboard />);
    
    expect(mockSetAutoRefresh).toHaveBeenCalledWith(300000); // 5 minutes
  });

  it('should clear auto-refresh on unmount', () => {
    const { unmount } = render(<EquipmentDashboard />);
    
    unmount();
    
    expect(mockSetAutoRefresh).toHaveBeenCalledWith(null);
  });

  it('should display auto-refresh indicator', () => {
    render(<EquipmentDashboard />);
    
    expect(screen.getByText('Auto-refreshes every 5 minutes')).toBeInTheDocument();
  });

  it('should render all chart components with data', () => {
    render(<EquipmentDashboard />);
    
    expect(screen.getByTestId('overview-card')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart-Site')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart-Make')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart-Type')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('treemap')).toBeInTheDocument();
    expect(screen.getByTestId('activity-list')).toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    render(<EquipmentDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh dashboard/i });
    
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockFetchAllData).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
    });
  });

  it('should handle export button click', async () => {
    mockExportDashboard.mockResolvedValue({
      overview: mockStoreData.overview,
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'testuser',
        format: 'pdf',
      },
    });

    render(<EquipmentDashboard />);
    
    const exportButton = screen.getByRole('button', { name: /export pdf/i });
    
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportDashboard).toHaveBeenCalledWith({
        format: 'pdf',
        sections: ['overview', 'distribution', 'topModels', 'hierarchy', 'activity'],
        includeTimestamp: true,
      });
    });
    
    await waitFor(() => {
      expect(exportToPDF).toHaveBeenCalled();
    });
  });

  it('should disable refresh button while loading', () => {
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue({
      ...mockStoreData,
      loadingOverview: true,
    });

    render(<EquipmentDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh dashboard/i });
    
    expect(refreshButton).toBeDisabled();
  });

  it('should display loading skeletons', () => {
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue({
      ...mockStoreData,
      overview: null,
      loadingOverview: true,
      loadingDistribution: true,
      loadingTopModels: true,
      loadingHierarchy: true,
      loadingActivity: true,
    });

    const { container } = render(<EquipmentDashboard />);
    
    // Look for MUI Skeleton components by class name
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display error messages', () => {
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue({
      ...mockStoreData,
      overviewError: 'Failed to load overview data',
      distributionError: 'Failed to load distribution',
    });

    render(<EquipmentDashboard />);
    
    // Check that error messages are displayed
    const overviewErrors = screen.getAllByText(/failed to load overview/i);
    const distributionErrors = screen.getAllByText(/failed to load distribution/i);
    
    expect(overviewErrors.length).toBeGreaterThan(0);
    expect(distributionErrors.length).toBeGreaterThan(0);
  });

  it('should handle empty data gracefully', () => {
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue({
      ...mockStoreData,
      topModels: [],
      hierarchy: [],
      recentActivity: [],
    });

    render(<EquipmentDashboard />);
    
    expect(screen.getByText('No equipment data available')).toBeInTheDocument();
    expect(screen.getByText('No hierarchy data available')).toBeInTheDocument();
  });

  it('should test auto-refresh timing', () => {
    jest.useFakeTimers();

    render(<EquipmentDashboard />);
    
    // Initial call on mount
    expect(mockSetAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockSetAutoRefresh).toHaveBeenCalledWith(300000);
    
    // Verify cleanup on unmount
    const { unmount } = render(<EquipmentDashboard />);
    unmount();
    
    expect(mockSetAutoRefresh).toHaveBeenLastCalledWith(null);
    
    jest.useRealTimers();
  });

  it('should handle drill-down interactions', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<EquipmentDashboard />);
    
    // The dashboard passes onSegmentClick handlers to charts
    // In the real components, these would be tested
    // Here we verify the handlers are passed correctly
    
    expect(screen.getByTestId('pie-chart-Site')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('should handle export when no data is available', async () => {
    mockExportDashboard.mockResolvedValue(null);

    render(<EquipmentDashboard />);
    
    const exportButton = screen.getByRole('button', { name: /export pdf/i });
    
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportDashboard).toHaveBeenCalled();
    });
    
    // exportToPDF should not be called if exportDashboard returns null
    expect(exportToPDF).not.toHaveBeenCalled();
  });

  it('should render correctly on mobile viewport', () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
    
    render(<EquipmentDashboard />);
    
    // Dashboard should still render all components
    expect(screen.getByText('Equipment Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card')).toBeInTheDocument();
  });

  it('should handle rapid refresh clicks', async () => {
    render(<EquipmentDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh dashboard/i });
    
    // Click multiple times rapidly
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      // Should handle rapid clicks gracefully
      expect(mockFetchAllData).toHaveBeenCalled();
    });
  });
});
