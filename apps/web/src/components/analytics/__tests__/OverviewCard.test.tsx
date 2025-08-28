import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OverviewCard from '../OverviewCard';
import { DashboardOverview } from '../../../types/analytics';

describe('OverviewCard', () => {
  const mockData: DashboardOverview = {
    totalEquipment: 1234,
    totalPLCs: 567,
    totalSites: 12,
    totalCells: 45,
    weeklyTrend: {
      percentage: 15.5,
      direction: 'up',
    },
    lastUpdated: new Date('2025-01-27T10:00:00Z'),
  };

  it('should render all metric cards', () => {
    render(<OverviewCard data={mockData} />);
    
    expect(screen.getByText('Total Equipment')).toBeInTheDocument();
    expect(screen.getByText('Total PLCs')).toBeInTheDocument();
    expect(screen.getByText('Total Sites')).toBeInTheDocument();
    expect(screen.getByText('Total Cells')).toBeInTheDocument();
  });

  it('should display correct values', () => {
    render(<OverviewCard data={mockData} />);
    
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('567')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('should show trend indicator for PLCs', () => {
    render(<OverviewCard data={mockData} />);
    
    expect(screen.getByText('15.5% this week')).toBeInTheDocument();
  });

  it('should render down trend correctly', () => {
    const downTrendData: DashboardOverview = {
      ...mockData,
      weeklyTrend: {
        percentage: 8.2,
        direction: 'down',
      },
    };

    render(<OverviewCard data={downTrendData} />);
    expect(screen.getByText('8.2% this week')).toBeInTheDocument();
  });

  it('should render stable trend correctly', () => {
    const stableTrendData: DashboardOverview = {
      ...mockData,
      weeklyTrend: {
        percentage: 0,
        direction: 'stable',
      },
    };

    render(<OverviewCard data={stableTrendData} />);
    expect(screen.getByText('0.0% this week')).toBeInTheDocument();
  });

  it('should handle large numbers with proper formatting', () => {
    const largeNumberData: DashboardOverview = {
      ...mockData,
      totalEquipment: 1234567,
      totalPLCs: 890123,
    };

    render(<OverviewCard data={largeNumberData} />);
    
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('890,123')).toBeInTheDocument();
  });

  it('should render all icons', () => {
    const { container } = render(<OverviewCard data={mockData} />);
    
    // Check for SVG icons
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });
});
