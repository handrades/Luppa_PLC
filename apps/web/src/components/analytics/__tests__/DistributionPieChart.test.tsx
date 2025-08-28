import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DistributionPieChart from '../DistributionPieChart';
import { DistributionData } from '../../../types/analytics';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const originalModule = jest.requireActual('recharts');
  return {
    ...originalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid='pie-chart'>{children}</div>,
    Pie: ({ data, onClick, children }: { data?: unknown[]; onClick?: (item: unknown) => void; children?: React.ReactNode }) => (
      <div data-testid='pie'>
        {(data as { name: string; value: number }[])?.map((item, index) => (
          <div
            key={index}
            data-testid={`pie-segment-${index}`}
            onClick={() => onClick && onClick(item)}
          >
            {item.name}: {item.value}
          </div>
        ))}
        {children}
      </div>
    ),
    Cell: ({ fill }: { fill?: string }) => <div data-testid='cell' style={{ backgroundColor: fill }} />,
    Tooltip: () => <div data-testid='tooltip' />,
    Legend: () => <div data-testid='legend' />,
  };
});

describe('DistributionPieChart', () => {
  const mockData: DistributionData = {
    labels: ['Site A', 'Site B', 'Site C'],
    values: [100, 75, 25],
    percentages: [50, 37.5, 12.5],
    colors: ['#0088FE', '#00C49F', '#FFBB28'],
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('should render pie chart with correct data', () => {
    render(
      <DistributionPieChart
        data={mockData}
        title='Test Distribution'
        onSegmentClick={mockOnClick}
      />
    );

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByText('Site A: 100')).toBeInTheDocument();
    expect(screen.getByText('Site B: 75')).toBeInTheDocument();
    expect(screen.getByText('Site C: 25')).toBeInTheDocument();
  });

  it('should handle segment click', () => {
    render(
      <DistributionPieChart
        data={mockData}
        title='Test Distribution'
        onSegmentClick={mockOnClick}
      />
    );

    const firstSegment = screen.getByTestId('pie-segment-0');
    fireEvent.click(firstSegment);

    expect(mockOnClick).toHaveBeenCalledWith('Site A');
  });

  it('should render without onSegmentClick handler', () => {
    render(
      <DistributionPieChart
        data={mockData}
        title='Test Distribution'
      />
    );

    const firstSegment = screen.getByTestId('pie-segment-0');
    fireEvent.click(firstSegment);

    // Should not throw error
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should render legend and tooltip', () => {
    render(
      <DistributionPieChart
        data={mockData}
        title='Test Distribution'
      />
    );

    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    const emptyData: DistributionData = {
      labels: [],
      values: [],
      percentages: [],
      colors: [],
    };

    render(
      <DistributionPieChart
        data={emptyData}
        title='Empty Distribution'
      />
    );

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should apply correct colors', () => {
    const { container } = render(
      <DistributionPieChart
        data={mockData}
        title='Test Distribution'
      />
    );

    const cells = container.querySelectorAll('[data-testid="cell"]');
    expect(cells).toHaveLength(mockData.colors.length);
    
    cells.forEach((cell, index) => {
      expect(cell).toHaveStyle(`background-color: ${mockData.colors[index]}`);
    });
  });

  it('should handle single value data', () => {
    const singleData: DistributionData = {
      labels: ['Only One'],
      values: [100],
      percentages: [100],
      colors: ['#0088FE'],
    };

    render(
      <DistributionPieChart
        data={singleData}
        title='Single Value'
      />
    );

    expect(screen.getByText('Only One: 100')).toBeInTheDocument();
  });
});
