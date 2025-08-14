import { Box, Skeleton, SkeletonProps } from '@mui/material';

export type SkeletonVariant = 'table' | 'card' | 'form' | 'list' | 'text';

interface LoadingSkeletonProps extends Omit<SkeletonProps, 'variant'> {
  variant?: SkeletonVariant;
  rows?: number;
  showHeader?: boolean;
}

export function LoadingSkeleton({
  variant = 'text',
  rows = 5,
  showHeader = true,
  ...skeletonProps
}: LoadingSkeletonProps) {
  const renderTableSkeleton = () => (
    <Box>
      {showHeader && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, bgcolor: 'grey.100' }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant='text' width='25%' height={24} {...skeletonProps} />
          ))}
        </Box>
      )}
      {[...Array(rows)].map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            gap: 2,
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {[...Array(4)].map((_, j) => (
            <Skeleton key={j} variant='text' width='25%' height={20} {...skeletonProps} />
          ))}
        </Box>
      ))}
    </Box>
  );

  const renderCardSkeleton = () => (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Skeleton variant='rectangular' height={200} sx={{ mb: 2 }} {...skeletonProps} />
      <Skeleton variant='text' width='60%' height={32} sx={{ mb: 1 }} {...skeletonProps} />
      <Skeleton variant='text' width='100%' height={20} sx={{ mb: 0.5 }} {...skeletonProps} />
      <Skeleton variant='text' width='100%' height={20} sx={{ mb: 0.5 }} {...skeletonProps} />
      <Skeleton variant='text' width='80%' height={20} {...skeletonProps} />
    </Box>
  );

  const renderFormSkeleton = () => (
    <Box sx={{ p: 3 }}>
      {[...Array(rows)].map((_, i) => (
        <Box key={i} sx={{ mb: 3 }}>
          <Skeleton variant='text' width='30%' height={16} sx={{ mb: 1 }} {...skeletonProps} />
          <Skeleton variant='rectangular' height={56} {...skeletonProps} />
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Skeleton variant='rectangular' width={100} height={42} {...skeletonProps} />
        <Skeleton variant='rectangular' width={100} height={42} {...skeletonProps} />
      </Box>
    </Box>
  );

  const renderListSkeleton = () => (
    <Box>
      {[...Array(rows)].map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Skeleton variant='circular' width={40} height={40} {...skeletonProps} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant='text' width='40%' height={24} sx={{ mb: 0.5 }} {...skeletonProps} />
            <Skeleton variant='text' width='60%' height={16} {...skeletonProps} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderTextSkeleton = () => {
    const safeRows = Math.max(0, Math.floor(rows || 0));
    return (
      <Box>
        {[...Array(safeRows)].map((_, i) => (
          <Skeleton
            key={i}
            variant='text'
            width={i === safeRows - 1 ? '60%' : '100%'}
            height={20}
            sx={{ mb: 1 }}
            data-testid={`text-skeleton-${i}`}
            animation={skeletonProps.animation ?? 'wave'}
            {...skeletonProps}
          />
        ))}
      </Box>
    );
  };

  switch (variant) {
    case 'table':
      return renderTableSkeleton();
    case 'card':
      return renderCardSkeleton();
    case 'form':
      return renderFormSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'text':
    default:
      return renderTextSkeleton();
  }
}
