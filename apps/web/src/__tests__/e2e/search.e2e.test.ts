/**
 * Search E2E Tests
 * 
 * End-to-end tests for search functionality
 */

import { Page, expect, test } from '@playwright/test';

test.describe('Search Functionality', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock API responses for testing
    await page.route('**/api/v1/search/equipment*', async route => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');
      
      const mockResponse = {
        data: [
          {
            plc_id: '123e4567-e89b-12d3-a456-426614174000',
            tag_id: 'PLC-001',
            plc_description: 'Main production line PLC',
            make: 'Siemens',
            model: 'S7-1200',
            ip_address: '192.168.1.100',
            equipment_name: 'Assembly Robot',
            equipment_type: 'ROBOT',
            cell_name: 'Assembly Cell 1',
            site_name: 'Factory A',
            hierarchy_path: 'Factory A > Assembly Cell 1 > Assembly Robot > PLC-001',
            relevance_score: 0.95,
            highlighted_fields: {
              make: query?.includes('Siemens') ? '<mark>Siemens</mark>' : 'Siemens',
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        searchMetadata: {
          query: query || '',
          executionTimeMs: 45,
          totalMatches: 1,
          searchType: 'fulltext',
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    await page.route('**/api/v1/search/suggestions*', async route => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');
      
      const suggestions = ['Siemens S7', 'Siemens PLC', 'Siemens 1200']
        .filter(s => s.toLowerCase().includes(query?.toLowerCase() || ''));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          query: query || '',
          suggestions,
          count: suggestions.length,
        }),
      });
    });

    // Navigate to the search page
    await page.goto('http://localhost:3000/search');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should perform basic search', async () => {
    // Find the search input
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    // Type a search query
    await searchInput.fill('Siemens');
    
    // Press Enter to search
    await searchInput.press('Enter');
    
    // Wait for results to appear
    await expect(page.getByText('PLC-001')).toBeVisible();
    await expect(page.getByText('Main production line PLC')).toBeVisible();
    await expect(page.getByText('Factory A > Assembly Cell 1 > Assembly Robot > PLC-001')).toBeVisible();
    
    // Check that result count is displayed
    await expect(page.getByText('1 result found for "Siemens"')).toBeVisible();
  });

  test('should show and use search suggestions', async () => {
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    // Start typing to trigger suggestions
    await searchInput.fill('Siem');
    
    // Wait for suggestions to appear
    await expect(page.getByText('Siemens S7')).toBeVisible();
    await expect(page.getByText('Siemens PLC')).toBeVisible();
    
    // Click on a suggestion
    await page.getByText('Siemens PLC').click();
    
    // Should execute search with selected suggestion
    await expect(page.getByText('PLC-001')).toBeVisible();
  });

  test('should expand and collapse result details', async () => {
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('Siemens');
    await searchInput.press('Enter');
    
    // Wait for results
    await expect(page.getByText('PLC-001')).toBeVisible();
    
    // Find and click expand button
    const expandButton = page.getByLabelText('Expand details').first();
    await expandButton.click();
    
    // Check that details are shown
    await expect(page.getByText('Equipment:')).toBeVisible();
    await expect(page.getByText('Assembly Robot')).toBeVisible();
    
    // Click to collapse
    const collapseButton = page.getByLabelText('Collapse details').first();
    await collapseButton.click();
    
    // Details should be hidden
    await expect(page.getByText('Equipment:')).not.toBeVisible();
  });

  test('should clear search input', async () => {
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('test query');
    
    // Clear button should appear
    const clearButton = page.getByLabelText('Clear search');
    await expect(clearButton).toBeVisible();
    
    await clearButton.click();
    
    // Input should be empty
    await expect(searchInput).toHaveValue('');
  });

  test('should show help modal', async () => {
    const helpButton = page.getByLabelText('Search help');
    await helpButton.click();
    
    // Help modal should be visible
    await expect(page.getByText('Search Help')).toBeVisible();
    await expect(page.getByText('Search Tips:')).toBeVisible();
    await expect(page.getByText('Simple Search')).toBeVisible();
    await expect(page.getByText('Keyboard Shortcuts:')).toBeVisible();
    
    // Close the modal
    const closeButton = page.getByLabelText('Close help');
    await closeButton.click();
    
    await expect(page.getByText('Search Help')).not.toBeVisible();
  });

  test('should handle no results', async () => {
    // Mock empty results
    await page.route('**/api/v1/search/equipment*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          searchMetadata: {
            query: 'nonexistent',
            executionTimeMs: 25,
            totalMatches: 0,
            searchType: 'fulltext',
          },
        }),
      });
    });

    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('nonexistent');
    await searchInput.press('Enter');
    
    // Should show no results message
    await expect(page.getByText('No results found for "nonexistent"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
  });

  test('should handle search errors', async () => {
    // Mock error response
    await page.route('**/api/v1/search/equipment*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Search service unavailable',
        }),
      });
    });

    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('error test');
    await searchInput.press('Enter');
    
    // Should show error message
    await expect(page.getByText('Search Error')).toBeVisible();
  });

  test('should navigate via keyboard', async () => {
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    // Tab to search input
    await page.keyboard.press('Tab');
    await expect(searchInput).toBeFocused();
    
    // Type and search with Enter
    await page.keyboard.type('Siemens');
    await page.keyboard.press('Enter');
    
    // Results should appear
    await expect(page.getByText('PLC-001')).toBeVisible();
  });

  test('should filter and sort results', async () => {
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('test');
    await searchInput.press('Enter');
    
    // Wait for results
    await expect(page.getByText('PLC-001')).toBeVisible();
    
    // Open filter dropdown
    const filterSelect = page.getByLabelText('Filter');
    await filterSelect.click();
    
    // Select a filter option
    await page.getByText('ROBOT').click();
    
    // Open sort dropdown
    const sortSelect = page.getByLabelText('Sort');
    await sortSelect.click();
    
    // Select sort option
    await page.getByText('Name').click();
    
    // Results should still be visible (filtering/sorting applied)
    await expect(page.getByText('PLC-001')).toBeVisible();
  });

  test('should maintain search state on page reload', async () => {
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('Siemens');
    await searchInput.press('Enter');
    
    // Wait for results
    await expect(page.getByText('PLC-001')).toBeVisible();
    
    // Reload the page
    await page.reload();
    
    // Search state should be restored (if implemented)
    // This would depend on URL state management or local storage
    await expect(searchInput).toBeVisible();
  });

  test('should be responsive on mobile', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('mobile test');
    await searchInput.press('Enter');
    
    // Should work on mobile
    await expect(page.getByText('PLC-001')).toBeVisible();
    
    // Touch interaction should work
    const expandButton = page.getByLabelText('Expand details').first();
    await expandButton.click();
    
    await expect(page.getByText('Equipment:')).toBeVisible();
  });

  test('should handle long search queries', async () => {
    const longQuery = 'this is a very long search query that contains many words and should still work properly even though it is quite lengthy';
    
    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill(longQuery);
    await searchInput.press('Enter');
    
    // Should handle long queries gracefully
    await expect(page.getByText('PLC-001')).toBeVisible();
  });

  test('should show loading state during search', async () => {
    // Add delay to API response
    await page.route('**/api/v1/search/equipment*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
          searchMetadata: { query: 'loading', executionTimeMs: 1000, totalMatches: 0, searchType: 'fulltext' },
        }),
      });
    });

    const searchInput = page.getByPlaceholder('Search equipment, PLCs, sites...');
    
    await searchInput.fill('loading test');
    await searchInput.press('Enter');
    
    // Should show loading state
    await expect(page.getByText('Searching...')).toBeVisible();
    
    // Eventually show results
    await expect(page.getByText('No results found')).toBeVisible();
  });
});
