/**
 * Equipment Service for API integration
 * Story 4.3: Equipment List UI
 *
 * Provides methods to interact with the equipment API endpoints
 * Integrates with existing api.client.ts for authentication and error handling
 */

import apiClient from './api.client';
import type {
  Equipment,
  EquipmentListResponse,
  EquipmentSearchFilters,
  EquipmentServiceError,
  EquipmentWithDetails,
} from '../types/equipment';
import type {
  EquipmentFormApiData,
  EquipmentFormData,
  SiteAutocompleteOption,
} from '../types/equipment-form';

/**
 * Equipment Service class providing API integration methods
 */
export class EquipmentService {
  private readonly baseUrl = '/api/v1/equipment';

  /**
   * Fetch equipment list with optional filters and pagination
   *
   * @param filters - Search and filter parameters
   * @returns Promise resolving to equipment list response
   */
  async getEquipment(filters: EquipmentSearchFilters = {}): Promise<EquipmentListResponse> {
    try {
      // Build query parameters from filters
      const queryParams = new URLSearchParams();

      // Add search parameter
      if (filters.search?.trim()) {
        queryParams.append('search', filters.search.trim());
      }

      // Add filter parameters
      if (filters.siteName) {
        queryParams.append('siteName', filters.siteName);
      }

      if (filters.cellName) {
        queryParams.append('cellName', filters.cellName);
      }

      if (filters.equipmentType) {
        queryParams.append('equipmentType', filters.equipmentType);
      }

      if (filters.make) {
        queryParams.append('make', filters.make);
      }

      if (filters.model) {
        queryParams.append('model', filters.model);
      }

      // Add hasIpAddress filter
      if (filters.hasIpAddress !== undefined) {
        queryParams.append('hasIpAddress', filters.hasIpAddress.toString());
      }

      // Add pagination parameters
      if (filters.page) {
        queryParams.append('page', filters.page.toString());
      }

      if (filters.limit) {
        queryParams.append('pageSize', filters.limit.toString());
      }

      // Add sorting parameters
      if (filters.sortBy) {
        queryParams.append('sortBy', filters.sortBy);
      }

      if (filters.sortOrder) {
        // Normalize sort direction to API-expected uppercase values
        const normalizedOrder = filters.sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        queryParams.append('sortOrder', normalizedOrder);
      }

      // Construct URL with query parameters
      const url = queryParams.toString()
        ? `${this.baseUrl}?${queryParams.toString()}`
        : this.baseUrl;

      // Make API request
      const response = await apiClient.get<EquipmentListResponse>(url);

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch equipment list');
    }
  }

  /**
   * Search equipment with a specific search term
   * Convenience method for text-based searching
   *
   * @param searchTerm - Text to search for across equipment fields
   * @param additionalFilters - Optional additional filters to apply
   * @returns Promise resolving to equipment list response
   */
  async searchEquipment(
    searchTerm: string,
    additionalFilters: Omit<EquipmentSearchFilters, 'search'> = {}
  ): Promise<EquipmentListResponse> {
    return this.getEquipment({
      ...additionalFilters,
      search: searchTerm,
    });
  }

  /**
   * Get equipment by ID (for future use in detail views)
   *
   * @param id - Equipment ID
   * @returns Promise resolving to equipment details
   */
  async getEquipmentById(id: string): Promise<EquipmentWithDetails> {
    try {
      const response = await apiClient.get<EquipmentWithDetails>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to fetch equipment with ID: ${id}`);
    }
  }

  /**
   * Get equipment statistics (for future dashboard use)
   *
   * @returns Promise resolving to equipment statistics
   */
  async getEquipmentStats(): Promise<{
    totalCount: number;
    byType: Record<string, number>;
    bySite: Record<string, number>;
  }> {
    try {
      const response = await apiClient.get<{
        totalCount: number;
        byType: Record<string, number>;
        bySite: Record<string, number>;
      }>(`${this.baseUrl}/stats`);

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch equipment statistics');
    }
  }

  /**
   * Delete equipment by ID
   *
   * @param id - Equipment ID to delete
   * @returns Promise resolving when deletion is complete
   */
  async deleteEquipment(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      throw this.handleError(error, `Failed to delete equipment with ID: ${id}`);
    }
  }

  /**
   * Delete multiple equipment items by IDs
   *
   * @param ids - Array of equipment IDs to delete
   * @returns Promise resolving when all deletions are complete
   */
  async deleteMultipleEquipment(ids: string[]): Promise<void> {
    try {
      // Delete all items in parallel for better performance
      await Promise.all(ids.map(id => this.deleteEquipment(id)));
    } catch (error) {
      throw this.handleError(error, `Failed to delete ${ids.length} equipment items`);
    }
  }

  /**
   * Export equipment data (for future CSV export functionality)
   *
   * @param filters - Filters to apply to export
   * @param format - Export format (csv, xlsx)
   * @returns Promise resolving to blob data
   */
  async exportEquipment(
    filters: EquipmentSearchFilters = {},
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<Blob> {
    try {
      // Build query parameters with explicit mapping
      const queryParams = new URLSearchParams();

      // Map client parameters to server parameters
      if (filters.search?.trim()) {
        queryParams.append('search', filters.search.trim());
      }

      if (filters.siteName) {
        queryParams.append('siteName', filters.siteName);
      }

      if (filters.cellName) {
        queryParams.append('cellName', filters.cellName);
      }

      if (filters.equipmentType) {
        queryParams.append('equipmentType', filters.equipmentType);
      }

      if (filters.make) {
        queryParams.append('make', filters.make);
      }

      if (filters.model) {
        queryParams.append('model', filters.model);
      }

      if (filters.hasIpAddress !== undefined) {
        queryParams.append('hasIpAddress', filters.hasIpAddress.toString());
      }

      if (filters.page) {
        queryParams.append('page', filters.page.toString());
      }

      if (filters.limit) {
        queryParams.append('pageSize', filters.limit.toString()); // Map limit to pageSize
      }

      if (filters.sortBy) {
        queryParams.append('sortBy', filters.sortBy);
      }

      if (filters.sortOrder) {
        // Transform sortOrder to uppercase
        const normalizedOrder = filters.sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        queryParams.append('sortOrder', normalizedOrder);
      }

      queryParams.append('format', format);

      const url = `${this.baseUrl}/export?${queryParams.toString()}`;

      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to export equipment data');
    }
  }

  // ===== FORM-SPECIFIC METHODS (Story 4.4) =====

  /**
   * Get site suggestions for autocomplete functionality
   *
   * @param query - Search query for site names
   * @returns Promise resolving to array of site options
   */
  async getSiteSuggestions(query: string): Promise<SiteAutocompleteOption[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      const queryParams = new URLSearchParams();
      queryParams.append('q', query.trim());

      const response = await apiClient.get<{
        suggestions: SiteAutocompleteOption[];
      }>(`${this.baseUrl}/sites/suggestions?${queryParams.toString()}`);

      return response.data.suggestions.map(site => ({
        ...site,
        label: `${site.siteName} (${site.usageCount} equipment)`,
      }));
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch site suggestions');
    }
  }

  /**
   * Check IP address uniqueness for validation
   *
   * @param ip - IP address to check
   * @param excludeId - Equipment ID to exclude from uniqueness check (for edit mode)
   * @returns Promise resolving to true if IP is available, false if already in use
   */
  async checkIpUniqueness(ip: string, excludeId?: string): Promise<boolean> {
    try {
      if (!ip.trim()) {
        return true; // Empty IP is valid (optional field)
      }

      const response = await apiClient.post<{
        isAvailable: boolean;
        conflictingEquipment?: Equipment;
      }>(`${this.baseUrl}/validate-ip`, {
        ipAddress: ip.trim(),
        excludeEquipmentId: excludeId,
      });

      return response.data.isAvailable;
    } catch {
      // If validation endpoint doesn't exist, assume IP is unique
      // This allows the form to work even if the backend doesn't implement this endpoint yet
      // IP uniqueness validation failed, assuming unique
      return true;
    }
  }

  /**
   * Create new equipment record
   *
   * @param data - Equipment form data
   * @returns Promise resolving to created equipment
   */
  async createEquipment(data: EquipmentFormData): Promise<Equipment> {
    try {
      const apiData: EquipmentFormApiData = {
        name: data.name.trim(),
        equipmentType: data.equipmentType,
        cellId: data.cellId,
        tagId: data.tagId.trim(),
        description: data.description.trim(),
        make: data.make.trim(),
        model: data.model.trim(),
        ipAddress: data.ipAddress?.trim() || undefined,
        firmwareVersion: data.firmwareVersion?.trim() || undefined,
        tags: data.tags.length > 0 ? data.tags.map(tag => tag.trim()) : undefined,
      };

      const response = await apiClient.post<Equipment>(this.baseUrl, apiData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create equipment');
    }
  }

  /**
   * Update existing equipment record
   *
   * @param id - Equipment ID to update
   * @param data - Equipment form data
   * @returns Promise resolving to updated equipment
   */
  async updateEquipment(id: string, data: EquipmentFormData): Promise<Equipment> {
    try {
      const apiData: EquipmentFormApiData = {
        name: data.name.trim(),
        equipmentType: data.equipmentType,
        cellId: data.cellId,
        tagId: data.tagId.trim(),
        description: data.description.trim(),
        make: data.make.trim(),
        model: data.model.trim(),
        ipAddress: data.ipAddress?.trim() || undefined,
        firmwareVersion: data.firmwareVersion?.trim() || undefined,
        tags: data.tags.length > 0 ? data.tags.map(tag => tag.trim()) : undefined,
        updatedAt: data.updatedAt, // For optimistic locking
      };

      const response = await apiClient.put<Equipment>(`${this.baseUrl}/${id}`, apiData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to update equipment with ID: ${id}`);
    }
  }

  /**
   * Get equipment by ID for editing (enhanced version with full details)
   *
   * @param id - Equipment ID
   * @returns Promise resolving to equipment details for editing
   */
  async getEquipmentForEdit(id: string): Promise<EquipmentWithDetails> {
    try {
      const response = await apiClient.get<EquipmentWithDetails>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to fetch equipment for editing with ID: ${id}`);
    }
  }

  /**
   * Handle API errors and convert to standardized format
   *
   * @param error - The caught error
   * @param defaultMessage - Default error message
   * @returns Standardized error object
   */
  private handleError(error: unknown, defaultMessage: string): EquipmentServiceError {
    // If it's already an AxiosError with response data
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: {
          status: number;
          data?: {
            message?: string;
            code?: string;
            details?: Record<string, unknown>;
          };
        };
        message?: string;
      };

      if (axiosError.response) {
        return {
          message: axiosError.response.data?.message || defaultMessage,
          status: axiosError.response.status,
          code: axiosError.response.data?.code,
          details: axiosError.response.data?.details,
        };
      }
    }

    // If it's a standard Error object
    if (error instanceof Error) {
      return {
        message: error.message || defaultMessage,
        status: 500,
      };
    }

    // Fallback for unknown error types
    return {
      message: defaultMessage,
      status: 500,
    };
  }
}

// Export singleton instance
export const equipmentService = new EquipmentService();

// Export default for convenience
export default equipmentService;

/**
 * React Query query keys for equipment-related queries
 * Used for cache invalidation and query management
 */
export const equipmentQueryKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentQueryKeys.all, 'list'] as const,
  list: (filters: EquipmentSearchFilters) => [...equipmentQueryKeys.lists(), filters] as const,
  details: () => [...equipmentQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...equipmentQueryKeys.details(), id] as const,
  edit: (id: string) => [...equipmentQueryKeys.all, 'edit', id] as const,
  stats: () => [...equipmentQueryKeys.all, 'stats'] as const,
  siteSuggestions: (query: string) =>
    [...equipmentQueryKeys.all, 'siteSuggestions', query] as const,
  ipValidation: (ip: string, excludeId?: string) =>
    [...equipmentQueryKeys.all, 'ipValidation', ip, excludeId] as const,
};
