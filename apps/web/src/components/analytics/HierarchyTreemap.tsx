import React from 'react';
import { Box, Typography } from '@mui/material';
import { ResponsiveContainer, Tooltip, TooltipProps, Treemap } from 'recharts';
import { HierarchyNode } from '../../types/analytics';

interface HierarchyTreemapProps {
  data: HierarchyNode[];
  onNodeClick?: (node: HierarchyNode) => void;
}

interface TreemapData {
  name: string;
  size: number;
  fill: string;
  originalNode: HierarchyNode;
  children?: TreemapData[];
}

const COLORS = {
  site: '#0088FE',
  cell: '#00C49F',
  equipment: '#FFBB28',
};

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TreemapData;
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
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          Type: {data.originalNode?.type || 'unknown'}
        </Box>
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>PLC Count: {data.size}</Box>
      </Box>
    );
  }
  return null;
};

const HierarchyTreemap: React.FC<HierarchyTreemapProps> = ({ data, onNodeClick }) => {
  const transformData = (nodes: HierarchyNode[]): TreemapData[] => {
    return nodes.map(node => ({
      name: node.name,
      size: Math.max(node.count, 1), // Ensure minimum size of 1
      fill: COLORS[node.type],
      originalNode: node,
      children: node.children ? transformData(node.children) : undefined,
    }));
  };

  const treemapData = transformData(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (onNodeClick && data?.originalNode) {
      onNodeClick(data.originalNode);
    }
  };

  if (data.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Typography color='text.secondary'>No hierarchy data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width='100%' height='100%'>
        <Treemap
          data={treemapData}
          dataKey='size'
          aspectRatio={4 / 3}
          stroke='#fff'
          fill='#8884d8'
          onClick={handleClick}
          style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      {/* Legend */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
        {Object.entries(COLORS).map(([key, color]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: color,
                borderRadius: '2px',
              }}
            />
            <Typography variant='caption' sx={{ textTransform: 'capitalize' }}>
              {key}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default HierarchyTreemap;
