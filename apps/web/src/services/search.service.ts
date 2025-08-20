/**
 * Search Service
 * 
 * Handles API communication for search functionality
 */

import { apiClient } from './api.client';
import { 
  SearchMetrics, 
  SearchQuery, 
  SearchResponse,
  SearchSuggestionsResponse 
} from '../types/search';

class SearchService {
  private readonly baseUrl = '/api/v1/search';

  /**
   * Execute search query
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams();
      
      // Add query parameters
      params.append('q', query.q);
      
      if (query.page) params.append('page', query.page.toString());
      if (query.pageSize) params.append('pageSize', query.pageSize.toString());
      if (query.maxResults) params.append('maxResults', query.maxResults.toString());
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);
      if (query.includeHighlights !== undefined) {
        params.append('includeHighlights', query.includeHighlights.toString());
      }
      if (query.fields && query.fields.length > 0) {
        query.fields.forEach(field => params.append('fields', field));
      }

      const response = await apiClient.get(
        `${this.baseUrl}/equipment?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to execute search');
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(partialQuery: string, limit = 10): Promise<SearchSuggestionsResponse> {
    try {
      const params = new URLSearchParams({
        q: partialQuery,
        limit: limit.toString(),
      });

      const response = await apiClient.get(
        `${this.baseUrl}/suggestions?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get search suggestions');
    }
  }

  /**
   * Refresh search materialized view (admin only)
   */
  async refreshSearchView(): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/refresh`);
    } catch (error) {
      throw this.handleError(error, 'Failed to refresh search view');
    }
  }

  /**
   * Get search performance metrics (admin only)
   */
  async getMetrics(timeRange = '24h'): Promise<SearchMetrics> {
    try {
      const params = new URLSearchParams({
        timeRange,
        includeDetails: 'false',
      });

      const response = await apiClient.get(
        `${this.baseUrl}/metrics?${params.toString()}`
      );

      return response.data.metrics;
    } catch (error) {
      throw this.handleError(error, 'Failed to get search metrics');
    }
  }

  /**
   * Check search service health
   */
  async checkHealth(): Promise<{ status: string; responseTime: number }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Search health check failed');
    }
  }

  /**
   * Handle API errors with consistent error messages
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error?.message || 
                     error.response.data?.message || 
                     defaultMessage;
      return new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Search service is unavailable. Please try again later.');
    } else {
      // Something else happened
      return new Error(error.message || defaultMessage);
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();
