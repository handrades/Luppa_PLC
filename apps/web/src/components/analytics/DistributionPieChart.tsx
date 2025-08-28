import React from 'react';
import { Box } from '@mui/material';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import { DistributionData } from '../../types/analytics';

interface DistributionPieChartProps {
  data: DistributionData;
  title: string;
  onSegmentClick?: (label: string) => void;
}

interface ChartDataItem {
  name: string;
  value: number;
  percentage: number;
  fill: string;
}

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
        <Box sx={{ fontWeight: 'medium' }}>{data.name}</Box>
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Count: {data.value}</Box>
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          Percentage: {data.percentage.toFixed(1)}%
        </Box>
      </Box>
    );
  }
  return null;
};

const DistributionPieChart: React.FC<DistributionPieChartProps> = ({ data, onSegmentClick }) => {
  const chartData: ChartDataItem[] = data.labels.map((label, index) => ({
    name: label,
    value: data.values[index],
    percentage: data.percentages[index],
    fill: data.colors[index],
  }));

  const handleClick = (entry: ChartDataItem) => {
    if (onSegmentClick) {
      onSegmentClick(entry.name);
    }
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent?: number;
  }) => {
    const percentage = (percent ?? 0) * 100;
    if (percentage < 5) return null; // Don't show label for small slices

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill='white'
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline='central'
        fontSize={12}
        fontWeight='bold'
      >
        {`${Math.round(percentage)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width='100%' height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx='50%'
          cy='50%'
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill='#8884d8'
          dataKey='value'
          onClick={handleClick}
          style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign='bottom'
          height={36}
          formatter={(value: string, entry: { payload?: { value?: number } }) => (
            <span style={{ fontSize: '0.875rem' }}>
              {value} ({entry.payload?.value || 0})
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DistributionPieChart;
