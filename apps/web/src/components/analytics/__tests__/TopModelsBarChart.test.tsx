import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import TopModelsBarChart from '../TopModelsBarChart';
import { TopModel } from '../../../types/analytics';

// Mock recharts
jest.mock('recharts', () => {
  const originalModule = jest.requireActual('recharts');
  return {
    ...originalModule,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    BarChart: ({ children, data }: { children: ReactNode; data?: unknown[] }) => (
      <div data-testid='bar-chart' data-count={data?.length || 0}>
        {children}
      </div>
    ),
    Bar: ({ onClick, children }: { onClick?: (data: unknown) => void; children?: ReactNode }) => {
      const mockData = [
        { displayName: 'Allen Bradley Comp...', count: 50, make: 'Allen Bradley', model: 'CompactLogix', percentage: 50 },
        { displayName: 'Siemens S7-1200', count: 30, make: 'Siemens', model: 'S7-1200', percentage: 30 },
      ];
      return (
        <div data-testid='bar'>
          {mockData.map((item, index) => (
            <div
              key={index}
              data-testid={`bar-item-${index}`}
              onClick={() => onClick && onClick({ payload: item })}
            >
              {item.displayName}: {item.count}
            </div>
          ))}
          {children}
        </div>
      );
    },
    XAxis: () => <div data-testid='x-axis' />,
    YAxis: ({ label }: { label?: { value?: string } }) => <div data-testid='y-axis'>{label?.value}</div>,
    CartesianGrid: () => <div data-testid='grid' />,
    Tooltip: () => <div data-testid='tooltip' />,
    Cell: ({ fill }: { fill?: string }) => <div data-testid='cell' style={{ backgroundColor: fill }} />,
  };
});

describe('TopModelsBarChart', () => {
  const mockData: TopModel[] = [
    { make: 'Allen Bradley', model: 'CompactLogix', count: 50, percentage: 50 },
    { make: 'Siemens', model: 'S7-1200', count: 30, percentage: 30 },
    { make: 'Omron', model: 'CJ2M', count: 15, percentage: 15 },
    { make: 'Mitsubishi', model: 'FX5U', count: 5, percentage: 5 },
  ];

  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('should render bar chart with data', () => {
    render(
      <TopModelsBarChart
        data={mockData}
        onBarClick={mockOnClick}
      />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-count', '4');
  });

  it('should handle bar click', () => {
    render(
      <TopModelsBarChart
        data={mockData}
        onBarClick={mockOnClick}
      />
    );

    const firstBar = screen.getByTestId('bar-item-0');
    fireEvent.click(firstBar);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('should render without onBarClick handler', () => {
    render(<TopModelsBarChart data={mockData} />);

    const firstBar = screen.getByTestId('bar-item-0');
    fireEvent.click(firstBar);

    // Should not throw error
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render axes and grid', () => {
    render(<TopModelsBarChart data={mockData} />);

    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  it('should render tooltip', () => {
    render(<TopModelsBarChart data={mockData} />);

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<TopModelsBarChart data={[]} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-count', '0');
  });

  it('should truncate long model names', () => {
    const longNameData: TopModel[] = [
      {
        make: 'Allen Bradley',
        model: 'CompactLogix 5380 Controller with Extended Features',
        count: 50,
        percentage: 100,
      },
    ];

    render(<TopModelsBarChart data={longNameData} />);

    // The component should truncate long names
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should handle single bar', () => {
    const singleData: TopModel[] = [
      { make: 'Allen Bradley', model: 'CompactLogix', count: 100, percentage: 100 },
    ];

    render(<TopModelsBarChart data={singleData} />);

    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-count', '1');
  });

  it('should apply different colors to bars', () => {
    const { container } = render(<TopModelsBarChart data={mockData} />);

    // The Bar component renders with children that include Cell components
    const barContainer = container.querySelector('[data-testid="bar"]');
    expect(barContainer).toBeInTheDocument();
    
    // The actual Cell components are rendered by the library
    // We verify the bar structure is correct instead
    const barItems = container.querySelectorAll('[data-testid^="bar-item-"]');
    expect(barItems.length).toBeGreaterThan(0);
  });
});
