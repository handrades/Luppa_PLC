import { render } from '@testing-library/react';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  test('renders text skeleton by default', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(5); // Default rows count
  });

  test('renders specified number of rows', () => {
    const { container } = render(<LoadingSkeleton rows={3} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-text');
    expect(skeletons.length).toBe(3);
  });

  test('renders table skeleton with header', () => {
    const { container } = render(<LoadingSkeleton variant='table' />);
    // Total skeletons should be header (4) + rows (5 * 4)
    const allSkeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(allSkeletons.length).toBe(24); // 4 header + 20 data cells
  });

  test('renders table skeleton without header', () => {
    const { container } = render(<LoadingSkeleton variant='table' showHeader={false} rows={3} />);
    const allSkeletons = container.querySelectorAll('.MuiSkeleton-root');
    // Should only have data rows (3 * 4)
    expect(allSkeletons.length).toBe(12);
  });

  test('renders card skeleton', () => {
    const { container } = render(<LoadingSkeleton variant='card' />);
    const rectangularSkeleton = container.querySelector('.MuiSkeleton-rectangular');
    expect(rectangularSkeleton).toBeInTheDocument();
  });

  test('renders form skeleton with buttons', () => {
    const { container } = render(<LoadingSkeleton variant='form' rows={2} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-rectangular');
    // 2 input fields + 2 buttons
    expect(skeletons.length).toBe(4);
  });

  test('renders list skeleton with avatars', () => {
    const { container } = render(<LoadingSkeleton variant='list' rows={3} />);
    const circularSkeletons = container.querySelectorAll('.MuiSkeleton-circular');
    expect(circularSkeletons.length).toBe(3);
  });

  test('applies custom skeleton props', () => {
    const { container } = render(
      <LoadingSkeleton variant='text' animation='wave' sx={{ bgcolor: 'red' }} />
    );
    const skeleton = container.querySelector('.MuiSkeleton-wave');
    expect(skeleton).toBeInTheDocument();
  });

  test('renders correct number of list items', () => {
    const { container } = render(<LoadingSkeleton variant='list' rows={4} />);
    // Count circular skeletons which represent list items
    const circularSkeletons = container.querySelectorAll('.MuiSkeleton-circular');
    expect(circularSkeletons.length).toBe(4);
  });

  test('card skeleton has all expected elements', () => {
    const { container } = render(<LoadingSkeleton variant='card' />);
    const rectangularSkeletons = container.querySelectorAll('.MuiSkeleton-rectangular');
    const textSkeletons = container.querySelectorAll('.MuiSkeleton-text');

    expect(rectangularSkeletons.length).toBe(1); // Image placeholder
    expect(textSkeletons.length).toBe(4); // Title and 3 text lines
  });
});
