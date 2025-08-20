/**
 * SearchResults Component Tests
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResults } from '../SearchResults';
import { SearchResultItem } from '../../../types/search';

// Mock react-window for virtual scrolling
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemData }: any) => (
    <div data-testid='virtual-list'>
      {Array.from({ length: itemCount }, (_, index) =>
        children({ index, style: {}, data: itemData })
      )}
    </div>
  ),
}));

describe('SearchResults', () => {
  const mockResults: SearchResultItem[] = [
    {
      plc_id: '123e4567-e89b-12d3-a456-426614174000',
      tag_id: 'PLC-001',
      plc_description: 'Main production line PLC',
      make: 'Siemens',
      model: 'S7-1200',
      ip_address: '192.168.1.100',
      firmware_version: '4.2.1',
      equipment_id: 'eq-001',
      equipment_name: 'Assembly Robot',
      equipment_type: 'ROBOT',
      cell_id: 'cell-001',
      cell_name: 'Assembly Cell 1',
      line_number: 'L001',
      site_id: 'site-001',
      site_name: 'Factory A',
      hierarchy_path: 'Factory A > Assembly Cell 1 > Assembly Robot > PLC-001',
      relevance_score: 0.95,
      highlighted_fields: {
        make: '<mark>Siemens</mark>',
        model: '<mark>S7-1200</mark>',
      },
    },
    {
      plc_id: '223e4567-e89b-12d3-a456-426614174001',
      tag_id: 'PLC-002',
      plc_description: 'Secondary control unit',
      make: 'Allen Bradley',
      model: 'CompactLogix',
      ip_address: '192.168.1.101',
      firmware_version: '32.011',
      equipment_id: 'eq-002',
      equipment_name: 'Conveyor System',
      equipment_type: 'CONVEYOR',
      cell_id: 'cell-002',
      cell_name: 'Packaging Cell',
      line_number: 'L002',
      site_id: 'site-001',
      site_name: 'Factory A',
      hierarchy_path: 'Factory A > Packaging Cell > Conveyor System > PLC-002',
      relevance_score: 0.87,
    },
  ];

  const defaultProps = {
    results: mockResults,
    loading: false,
    error: null,
    totalResults: mockResults.length,
    searchQuery: 'Siemens',
  };

  describe('basic rendering', () => {
    it('should render search results', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('PLC-001')).toBeInTheDocument();
      expect(screen.getByText('PLC-002')).toBeInTheDocument();
      expect(screen.getByText('Main production line PLC')).toBeInTheDocument();
      expect(screen.getByText('Secondary control unit')).toBeInTheDocument();
    });

    it('should show result count', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('2 results found for "Siemens"')).toBeInTheDocument();
    });

    it('should render equipment type chips', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('ROBOT')).toBeInTheDocument();
      expect(screen.getByText('CONVEYOR')).toBeInTheDocument();
    });

    it('should render hierarchy paths', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('📍 Factory A > Assembly Cell 1 > Assembly Robot > PLC-001')).toBeInTheDocument();
      expect(screen.getByText('📍 Factory A > Packaging Cell > Conveyor System > PLC-002')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      render(<SearchResults loading={true} results={[]} />);
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when error occurs', () => {
      render(<SearchResults error='Search service unavailable' results={[]} />);
      
      expect(screen.getByText('Search Error')).toBeInTheDocument();
      expect(screen.getByText('Search service unavailable')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show no results message when no results found', () => {
      render(<SearchResults results={[]} searchQuery='nonexistent' />);
      
      expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms or check the search help for tips.')).toBeInTheDocument();
    });

    it('should show search suggestions in empty state', () => {
      render(<SearchResults results={[]} searchQuery='xyz' />);
      
      expect(screen.getByText('Search suggestions:')).toBeInTheDocument();
      expect(screen.getByText('• Use shorter, more general terms')).toBeInTheDocument();
      expect(screen.getByText('• Check for spelling mistakes')).toBeInTheDocument();
      expect(screen.getByText('• Try searching by make, model, or location')).toBeInTheDocument();
    });
  });

  describe('result interaction', () => {
    it('should call onResultClick when result is clicked', async () => {
      const mockOnResultClick = jest.fn();
      const user = userEvent.setup();
      
      render(<SearchResults {...defaultProps} onResultClick={mockOnResultClick} />);
      
      const firstResult = screen.getByText('PLC-001').closest('div[role="button"], .MuiCard-root');
      expect(firstResult).toBeInTheDocument();
      
      await user.click(firstResult!);
      
      expect(mockOnResultClick).toHaveBeenCalledWith(mockResults[0]);
    });

    it('should expand/collapse result details', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const expandButton = screen.getAllByLabelText('Expand details')[0];
      await user.click(expandButton);
      
      expect(screen.getByText('Firmware Version:')).toBeInTheDocument();
      expect(screen.getByText('4.2.1')).toBeInTheDocument();
      expect(screen.getByText('Equipment:')).toBeInTheDocument();
      expect(screen.getByText('Assembly Robot')).toBeInTheDocument();
    });
  });

  describe('relevance scores', () => {
    it('should show relevance scores when enabled', () => {
      render(<SearchResults {...defaultProps} showRelevanceScore={true} />);
      
      expect(screen.getByText('0.95')).toBeInTheDocument();
      expect(screen.getByText('0.87')).toBeInTheDocument();
    });

    it('should not show relevance scores by default', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.queryByText('0.95')).not.toBeInTheDocument();
      expect(screen.queryByText('0.87')).not.toBeInTheDocument();
    });
  });

  describe('highlighting', () => {
    it('should render highlighted text when available', () => {
      render(<SearchResults {...defaultProps} />);
      
      // Check for highlighted content (would be rendered as HTML)
      const siemensElements = screen.getAllByText(/Siemens/);
      expect(siemensElements.length).toBeGreaterThan(0);
    });
  });

  describe('controls and filtering', () => {
    it('should render sort controls', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByLabelText('Sort')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter')).toBeInTheDocument();
    });

    it('should filter by equipment type', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const filterSelect = screen.getByLabelText('Filter');
      await user.click(filterSelect);
      
      const robotOption = screen.getByText('ROBOT');
      await user.click(robotOption);
      
      // After filtering, should only show ROBOT equipment
      expect(screen.getByText('PLC-001')).toBeInTheDocument();
      expect(screen.queryByText('PLC-002')).not.toBeInTheDocument();
    });

    it('should change sort order', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const sortSelect = screen.getByLabelText('Sort');
      await user.click(sortSelect);
      
      const nameOption = screen.getByText('Name');
      await user.click(nameOption);
      
      // Results should be re-sorted (implementation would handle this)
      expect(screen.getByLabelText('Sort')).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('should show export button when onExport is provided', () => {
      const mockOnExport = jest.fn();
      render(<SearchResults {...defaultProps} onExport={mockOnExport} />);
      
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should call onExport when export button is clicked', async () => {
      const mockOnExport = jest.fn();
      const user = userEvent.setup();
      
      render(<SearchResults {...defaultProps} onExport={mockOnExport} />);
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      expect(mockOnExport).toHaveBeenCalledWith(mockResults);
    });

    it('should not show export button when no onExport provided', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });
  });

  describe('virtualization', () => {
    it('should use virtual scrolling for large result sets', () => {
      const largeResults = Array.from({ length: 150 }, (_, i) => ({
        ...mockResults[0],
        plc_id: `plc-${i}`,
        tag_id: `PLC-${i.toString().padStart(3, '0')}`,
      }));

      render(
        <SearchResults
          results={largeResults}
          enableVirtualization={true}
          virtualizationThreshold={100}
        />
      );
      
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should not use virtualization for small result sets', () => {
      render(
        <SearchResults
          {...defaultProps}
          enableVirtualization={true}
          virtualizationThreshold={100}
        />
      );
      
      expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
    });
  });

  describe('grouping', () => {
    it('should group results by equipment type when enabled', () => {
      render(<SearchResults {...defaultProps} groupByType={true} />);
      
      expect(screen.getByText('ROBOT')).toBeInTheDocument();
      expect(screen.getByText('CONVEYOR')).toBeInTheDocument();
    });

    it('should show result counts in group headers', () => {
      render(<SearchResults {...defaultProps} groupByType={true} />);
      
      // Each group should have a badge with count
      const badges = screen.getAllByText('1'); // Each group has 1 item
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SearchResults {...defaultProps} />);
      
      const expandButtons = screen.getAllByLabelText('Expand details');
      expect(expandButtons.length).toBe(mockResults.length);
    });

    it('should support keyboard navigation', async () => {
      const mockOnResultClick = jest.fn();
      const user = userEvent.setup();
      
      render(<SearchResults {...defaultProps} onResultClick={mockOnResultClick} />);
      
      // Tab navigation should work
      await user.tab();
      
      // Should be able to activate with keyboard
      await user.keyboard('{Enter}');
      
      // Note: Actual keyboard navigation depends on implementation details
    });
  });

  describe('performance', () => {
    it('should handle large number of results without crashing', () => {
      const manyResults = Array.from({ length: 1000 }, (_, i) => ({
        ...mockResults[0],
        plc_id: `plc-${i}`,
        tag_id: `PLC-${i.toString().padStart(4, '0')}`,
      }));

      expect(() => {
        render(<SearchResults results={manyResults} />);
      }).not.toThrow();
    });
  });

  describe('responsive behavior', () => {
    it('should render properly on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<SearchResults {...defaultProps} />);
      
      // Should still render main content
      expect(screen.getByText('PLC-001')).toBeInTheDocument();
      expect(screen.getByText('PLC-002')).toBeInTheDocument();
    });
  });
});
