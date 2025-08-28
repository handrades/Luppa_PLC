import React from 'react';
import { Box } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { TopModel } from '../../types/analytics';

interface TopModelsBarChartProps {
  data: TopModel[];
  onBarClick?: (model: TopModel) => void;
}

interface ChartDataItem extends TopModel {
  displayName: string;
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#8DD1E1',
  '#D084D0',
  '#F67280',
];

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataItem;
    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          p: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 2,
        }}
      >
        <Box sx={{ fontWeight: 'medium' }}>{data.make}</Box>
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Model: {data.model}</Box>
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Count: {data.count}</Box>
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          Percentage: {data.percentage.toFixed(1)}%
        </Box>
      </Box>
    );
  }
  return null;
};

const TopModelsBarChart: React.FC<TopModelsBarChartProps> = ({ data, onBarClick }) => {
  const chartData: ChartDataItem[] = data.map(item => ({
    ...item,
    displayName:
      `${item.make} ${item.model}`.substring(0, 15) +
      (`${item.make} ${item.model}`.length > 15 ? '...' : ''),
  }));

  const handleClick = (data: unknown) => {
    interface BarClickData {
      payload?: TopModel;
    }
    const barData = data as BarClickData;
    if (onBarClick && barData?.payload) {
      onBarClick(barData.payload);
    }
  };

  const CustomXAxisTick = (props: { x?: number; y?: number; payload?: { value: string } }) => {
    const { x, y, payload } = props;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor='end'
          fill='#666'
          transform='rotate(-45)'
          fontSize={11}
        >
          {payload?.value || ''}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 80,
        }}
      >
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='displayName' tick={<CustomXAxisTick />} height={100} />
        <YAxis
          label={{
            value: 'Count',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 12 },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey='count'
          onClick={handleClick}
          style={{ cursor: onBarClick ? 'pointer' : 'default' }}
        >
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopModelsBarChart;
