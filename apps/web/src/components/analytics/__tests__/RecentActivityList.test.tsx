import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentActivityList from '../RecentActivityList';
import { RecentActivity } from '../../../types/analytics';
import { useAnalyticsStore } from '../../../stores/analyticsStore';

// Mock the analytics store
jest.mock('../../../stores/analyticsStore');

// Mock analytics service
jest.mock('../../../services/analytics.service', () => ({
  __esModule: true,
  default: {
    formatRelativeTime: jest.fn((_timestamp) => '2 hours ago'),
  },
}));

describe('RecentActivityList', () => {
  const mockActivities: RecentActivity[] = [
    {
      id: '1',
      action: 'create',
      entityType: 'plc',
      entityName: 'PLC-001',
      userId: 'user1',
      userName: 'John Doe',
      timestamp: new Date('2025-01-27T10:00:00Z'),
      details: { ip: '192.168.1.1' },
    },
    {
      id: '2',
      action: 'update',
      entityType: 'equipment',
      entityName: 'Conveyor-01',
      userId: 'user2',
      userName: 'Jane Smith',
      timestamp: new Date('2025-01-27T09:00:00Z'),
      details: { status: 'active' },
    },
    {
      id: '3',
      action: 'delete',
      entityType: 'cell',
      entityName: 'Cell-05',
      userId: 'user3',
      userName: 'Bob Johnson',
      timestamp: new Date('2025-01-27T08:00:00Z'),
    },
  ];

  const mockFetchRecentActivity = jest.fn();

  beforeEach(() => {
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue({
      fetchRecentActivity: mockFetchRecentActivity,
      loadingActivity: false,
      hasMoreActivity: true,
    });
    mockFetchRecentActivity.mockClear();
  });

  it('should render activity list', () => {
    render(<RecentActivityList activities={mockActivities} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should display activity types', () => {
    render(<RecentActivityList activities={mockActivities} />);

    expect(screen.getByText('created')).toBeInTheDocument();
    expect(screen.getByText('updated')).toBeInTheDocument();
    expect(screen.getByText('deleted')).toBeInTheDocument();
  });

  it('should display entity names', () => {
    render(<RecentActivityList activities={mockActivities} />);

    expect(screen.getByText('PLC-001')).toBeInTheDocument();
    expect(screen.getByText('Conveyor-01')).toBeInTheDocument();
    expect(screen.getByText('Cell-05')).toBeInTheDocument();
  });

  it('should display entity type chips', () => {
    render(<RecentActivityList activities={mockActivities} />);

    expect(screen.getByText('plc')).toBeInTheDocument();
    expect(screen.getByText('equipment')).toBeInTheDocument();
    expect(screen.getByText('cell')).toBeInTheDocument();
  });

  it('should display relative time', () => {
    render(<RecentActivityList activities={mockActivities} />);

    // All should show "2 hours ago" as mocked
    const timeElements = screen.getAllByText('2 hours ago');
    expect(timeElements).toHaveLength(3);
  });

  it('should handle empty activity list', () => {
    render(<RecentActivityList activities={[]} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('should show load more button when hasMoreActivity is true', () => {
    render(<RecentActivityList activities={mockActivities} />);

    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('should handle load more click', () => {
    render(<RecentActivityList activities={mockActivities} />);

    const loadMoreButton = screen.getByText('Load More');
    fireEvent.click(loadMoreButton);

    expect(mockFetchRecentActivity).toHaveBeenCalledWith(true);
  });

  it('should show loading state', () => {
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue({
      fetchRecentActivity: mockFetchRecentActivity,
      loadingActivity: true,
      hasMoreActivity: true,
    });

    render(<RecentActivityList activities={mockActivities} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should hide load more button when hasMoreActivity is false', () => {
    (useAnalyticsStore as unknown as jest.Mock).mockReturnValue({
      fetchRecentActivity: mockFetchRecentActivity,
      loadingActivity: false,
      hasMoreActivity: false,
    });

    render(<RecentActivityList activities={mockActivities} />);

    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });

  it('should render correct action icons', () => {
    const { container } = render(<RecentActivityList activities={mockActivities} />);

    // Check for avatar elements with action icons
    const avatars = container.querySelectorAll('.MuiAvatar-root');
    expect(avatars.length).toBeGreaterThan(0);
  });

  it('should apply correct colors to action avatars', () => {
    const { container } = render(<RecentActivityList activities={mockActivities} />);

    const avatars = container.querySelectorAll('.MuiAvatar-root');
    
    // Check first avatar (create action - should be green)
    expect(avatars[0]).toHaveStyle('background-color: rgb(76, 175, 80)');
  });

  it('should handle site entity type', () => {
    const siteActivity: RecentActivity[] = [
      {
        id: '4',
        action: 'create',
        entityType: 'site',
        entityName: 'Site-01',
        userId: 'user4',
        userName: 'Alice Cooper',
        timestamp: new Date(),
      },
    ];

    render(<RecentActivityList activities={siteActivity} />);

    expect(screen.getByText('site')).toBeInTheDocument();
    expect(screen.getByText('Site-01')).toBeInTheDocument();
  });
});
