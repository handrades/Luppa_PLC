/**
 * Hierarchy API Service
 * Handles all API operations for site hierarchy management
 * Story 4.5: Site Hierarchy Management
 */

import axios, { AxiosResponse } from 'axios';
import { apiClient } from './api.client';
import {
  Cell,
  CellStatistics,
  CellSuggestion,
  CellWithDetails,
  CreateCellDto,
  CreateSiteDto,
  HierarchyBulkOperation,
  HierarchyBulkResult,
  HierarchyNode,
  HierarchyServiceError,
  HierarchyValidationResult,
  OrphanedRecord,
  PaginatedHierarchyResponse,
  Site,
  SiteStatistics,
  SiteSuggestion,
  SiteWithDetails,
  UpdateCellDto,
  UpdateSiteDto,
} from '../types/hierarchy';

/**
 * Site list request parameters
 */
interface SiteListParams {
  /** Text search across site names */
  search?: string;
  /** Include sites with no cells/equipment */
  includeEmpty?: boolean;
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: 'name' | 'createdAt' | 'cellCount' | 'equipmentCount';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Cell list request parameters
 */
interface CellListParams {
  /** Filter by specific site */
  siteId?: string;
  /** Text search across cell names and line numbers */
  search?: string;
  /** Include cells with no equipment */
  includeEmpty?: boolean;
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: 'name' | 'lineNumber' | 'createdAt' | 'equipmentCount';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Hierarchy tree request parameters
 */
interface HierarchyTreeParams {
  /** Default expansion level (0=sites only, 1=+cells, 2=+equipment) */
  expandLevel?: number;
  /** Filter to specific site */
  siteId?: string;
  /** Filter to specific cell */
  cellId?: string;
  /** Include nodes with no children */
  includeEmpty?: boolean;
  /** Text search across all levels */
  search?: string;
  /** Include equipment counts */
  includeCounts?: boolean;
}

/**
 * API response wrapper for error handling
 */
interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Hierarchy service class with comprehensive API integration
 */
class HierarchyService {
  /**
   * Get all sites with optional filtering and pagination
   */
  async getSites(params: SiteListParams = {}): Promise<PaginatedHierarchyResponse<Site>> {
    try {
      const response: AxiosResponse<PaginatedHierarchyResponse<Site>> = await apiClient.get(
        '/sites',
        {
          params: {
            search: params.search,
            includeEmpty: params.includeEmpty,
            page: params.page || 1,
            pageSize: params.pageSize || 50,
            sortBy: params.sortBy || 'name',
            sortOrder: params.sortOrder || 'asc',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch sites');
    }
  }

  /**
   * Get site by ID with detailed information
   */
  async getSiteById(id: string): Promise<SiteWithDetails> {
    try {
      const response: AxiosResponse<ApiResponse<SiteWithDetails>> = await apiClient.get(
        `/sites/${id}`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to fetch site with ID: ${id}`);
    }
  }

  /**
   * Create a new site
   */
  async createSite(data: CreateSiteDto): Promise<Site> {
    try {
      const response: AxiosResponse<ApiResponse<Site>> = await apiClient.post('/sites', data);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to create site');
    }
  }

  /**
   * Update an existing site
   */
  async updateSite(id: string, data: UpdateSiteDto): Promise<Site> {
    try {
      const response: AxiosResponse<ApiResponse<Site>> = await apiClient.put(`/sites/${id}`, data);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to update site with ID: ${id}`);
    }
  }

  /**
   * Delete a site (with cascade validation)
   */
  async deleteSite(id: string): Promise<void> {
    try {
      await apiClient.delete(`/sites/${id}`);
    } catch (error) {
      throw this.handleApiError(error, `Failed to delete site with ID: ${id}`);
    }
  }

  /**
   * Get site statistics for dashboard display
   */
  async getSiteStatistics(id: string): Promise<SiteStatistics> {
    try {
      const response: AxiosResponse<ApiResponse<SiteStatistics>> = await apiClient.get(
        `/sites/${id}/statistics`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to fetch site statistics for ID: ${id}`);
    }
  }

  /**
   * Check if site is in use (has cells or equipment)
   */
  async checkSiteInUse(id: string): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ inUse: boolean; details: string }>> =
        await apiClient.get(`/sites/${id}/usage`);
      return response.data.data.inUse;
    } catch (error) {
      throw this.handleApiError(error, `Failed to check site usage for ID: ${id}`);
    }
  }

  /**
   * Get all cells with optional filtering and pagination
   */
  async getCells(params: CellListParams = {}): Promise<PaginatedHierarchyResponse<Cell>> {
    try {
      const response: AxiosResponse<PaginatedHierarchyResponse<Cell>> = await apiClient.get(
        '/cells',
        {
          params: {
            siteId: params.siteId,
            search: params.search,
            includeEmpty: params.includeEmpty,
            page: params.page || 1,
            pageSize: params.pageSize || 50,
            sortBy: params.sortBy || 'name',
            sortOrder: params.sortOrder || 'asc',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch cells');
    }
  }

  /**
   * Get cell by ID with detailed information
   */
  async getCellById(id: string): Promise<CellWithDetails> {
    try {
      const response: AxiosResponse<ApiResponse<CellWithDetails>> = await apiClient.get(
        `/cells/${id}`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to fetch cell with ID: ${id}`);
    }
  }

  /**
   * Get all cells for a specific site
   */
  async getCellsBySite(siteId: string): Promise<Cell[]> {
    try {
      const response: AxiosResponse<ApiResponse<Cell[]>> = await apiClient.get(
        `/sites/${siteId}/cells`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to fetch cells for site ID: ${siteId}`);
    }
  }

  /**
   * Create a new cell
   */
  async createCell(data: CreateCellDto): Promise<Cell> {
    try {
      const response: AxiosResponse<ApiResponse<Cell>> = await apiClient.post('/cells', data);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to create cell');
    }
  }

  /**
   * Update an existing cell
   */
  async updateCell(id: string, data: UpdateCellDto): Promise<Cell> {
    try {
      const response: AxiosResponse<ApiResponse<Cell>> = await apiClient.put(`/cells/${id}`, data);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to update cell with ID: ${id}`);
    }
  }

  /**
   * Delete a cell (with equipment validation)
   */
  async deleteCell(id: string): Promise<void> {
    try {
      await apiClient.delete(`/cells/${id}`);
    } catch (error) {
      throw this.handleApiError(error, `Failed to delete cell with ID: ${id}`);
    }
  }

  /**
   * Get cell statistics for detailed view
   */
  async getCellStatistics(id: string): Promise<CellStatistics> {
    try {
      const response: AxiosResponse<ApiResponse<CellStatistics>> = await apiClient.get(
        `/cells/${id}/statistics`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to fetch cell statistics for ID: ${id}`);
    }
  }

  /**
   * Check if cell is in use (has equipment)
   */
  async checkCellInUse(id: string): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ inUse: boolean; details: string }>> =
        await apiClient.get(`/cells/${id}/usage`);
      return response.data.data.inUse;
    } catch (error) {
      throw this.handleApiError(error, `Failed to check cell usage for ID: ${id}`);
    }
  }

  /**
   * Get complete hierarchy tree structure
   */
  async getHierarchyTree(params: HierarchyTreeParams = {}): Promise<{
    tree: HierarchyNode[];
    statistics: {
      totalSites: number;
      totalCells: number;
      totalEquipment: number;
    };
  }> {
    try {
      const response: AxiosResponse<
        ApiResponse<{
          tree: HierarchyNode[];
          statistics: {
            totalSites: number;
            totalCells: number;
            totalEquipment: number;
          };
        }>
      > = await apiClient.get('/hierarchy/tree', {
        params: {
          expandLevel: params.expandLevel || 1,
          siteId: params.siteId,
          cellId: params.cellId,
          includeEmpty: params.includeEmpty,
          search: params.search,
          includeCounts: params.includeCounts !== false, // Default to true
        },
      });

      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch hierarchy tree');
    }
  }

  /**
   * Get overall hierarchy statistics
   */
  async getHierarchyStatistics(): Promise<{
    totalSites: number;
    totalCells: number;
    totalEquipment: number;
    totalPlcs: number;
    avgCellsPerSite: number;
    avgEquipmentPerCell: number;
    topSitesByEquipment: Array<{
      siteId: string;
      siteName: string;
      equipmentCount: number;
    }>;
  }> {
    try {
      const response = await apiClient.get('/hierarchy/statistics');
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to fetch hierarchy statistics');
    }
  }

  /**
   * Validate hierarchy integrity
   */
  async validateHierarchy(
    options: {
      checkOrphans?: boolean;
      checkConstraints?: boolean;
      checkCounts?: boolean;
    } = {}
  ): Promise<HierarchyValidationResult> {
    try {
      const response: AxiosResponse<ApiResponse<HierarchyValidationResult>> = await apiClient.post(
        '/hierarchy/validate',
        options
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to validate hierarchy');
    }
  }

  /**
   * Detect orphaned records in hierarchy
   */
  async detectOrphanedRecords(): Promise<OrphanedRecord[]> {
    try {
      const response: AxiosResponse<ApiResponse<OrphanedRecord[]>> =
        await apiClient.get('/hierarchy/orphans');
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to detect orphaned records');
    }
  }

  /**
   * Get site suggestions for autocomplete
   */
  async getSiteSuggestions(query: string, limit: number = 10): Promise<SiteSuggestion[]> {
    try {
      const response: AxiosResponse<ApiResponse<SiteSuggestion[]>> = await apiClient.get(
        '/sites/suggestions',
        {
          params: { q: query, limit },
        }
      );
      return response.data.data;
    } catch (error) {
      // For autocomplete, return empty array on error rather than throwing
      // Failed to fetch site suggestions - returning empty array
      return [];
    }
  }

  /**
   * Get cell suggestions for autocomplete (within a site)
   */
  async getCellSuggestions(
    siteId: string,
    query: string,
    limit: number = 10
  ): Promise<CellSuggestion[]> {
    try {
      const response: AxiosResponse<ApiResponse<CellSuggestion[]>> = await apiClient.get(
        `/sites/${siteId}/cells/suggestions`,
        {
          params: { q: query, limit },
        }
      );
      return response.data.data;
    } catch (error) {
      // For autocomplete, return empty array on error rather than throwing
      // Failed to fetch cell suggestions - returning empty array
      return [];
    }
  }

  /**
   * Validate site name uniqueness
   */
  async validateSiteUniqueness(name: string, excludeId?: string): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ isUnique: boolean; conflictingSite?: Site }>> =
        await apiClient.post('/sites/validate-name', {
          name,
          excludeId,
        });
      return response.data.data.isUnique;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to validate site name uniqueness');
    }
  }

  /**
   * Validate cell line number uniqueness within site
   */
  async validateCellUniqueness(
    siteId: string,
    lineNumber: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ isUnique: boolean; conflictingCell?: Cell }>> =
        await apiClient.post('/cells/validate-line-number', {
          siteId,
          lineNumber,
          excludeId,
        });
      return response.data.data.isUnique;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to validate cell line number uniqueness');
    }
  }

  /**
   * Perform bulk operations on hierarchy items
   */
  async performBulkOperation(operation: HierarchyBulkOperation): Promise<HierarchyBulkResult> {
    try {
      const response: AxiosResponse<ApiResponse<HierarchyBulkResult>> = await apiClient.post(
        '/hierarchy/bulk',
        operation
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to perform bulk ${operation.operation} operation`);
    }
  }

  /**
   * Export hierarchy data in various formats
   */
  async exportHierarchy(
    format: 'json' | 'csv' | 'xlsx',
    params: {
      siteIds?: string[];
      includeEquipment?: boolean;
      includePlcs?: boolean;
    } = {}
  ): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> = await apiClient.get('/hierarchy/export', {
        params: {
          format,
          ...params,
        },
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to export hierarchy data as ${format}`);
    }
  }

  /**
   * Import hierarchy data from file
   */
  async importHierarchy(
    file: File,
    options: {
      format: 'json' | 'csv' | 'xlsx';
      validateOnly?: boolean;
      skipDuplicates?: boolean;
    }
  ): Promise<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    errors: Array<{ row: number; field: string; message: string }>;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', options.format);
      formData.append('validateOnly', String(options.validateOnly || false));
      formData.append('skipDuplicates', String(options.skipDuplicates || false));

      const response = await apiClient.post('/hierarchy/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to import hierarchy data');
    }
  }

  /**
   * Get hierarchy audit trail for a specific entity
   */
  async getHierarchyAuditTrail(
    entityType: 'site' | 'cell',
    entityId: string,
    params: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<
    PaginatedHierarchyResponse<{
      id: string;
      action: 'INSERT' | 'UPDATE' | 'DELETE';
      timestamp: string;
      userId: string;
      userName: string;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      changedFields?: string[];
    }>
  > {
    try {
      const response = await apiClient.get(`/hierarchy/${entityType}/${entityId}/audit`, {
        params: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleApiError(error, `Failed to fetch audit trail for ${entityType} ${entityId}`);
    }
  }

  /**
   * Create a new client instance for testing
   */
  static createTestInstance(mockApiClient: typeof apiClient): HierarchyService {
    const service = new HierarchyService();
    // Replace the apiClient with mock for testing
    (service as { apiClient: typeof apiClient }).apiClient = mockApiClient;
    return service;
  }

  /**
   * Handle API errors consistently
   */
  private handleApiError(error: unknown, defaultMessage: string): HierarchyServiceError {
    if (axios.isAxiosError(error)) {
      const response = error.response;

      // Handle different error response formats
      const errorData = response?.data;
      const message = errorData?.message || defaultMessage;
      const status = response?.status || 500;
      const code = errorData?.code || 'UNKNOWN_ERROR';
      const details = errorData?.details || {};
      const fieldErrors = errorData?.fieldErrors || {};

      return {
        message,
        status,
        code,
        details,
        fieldErrors,
      };
    }

    // Handle non-Axios errors
    if (error instanceof Error) {
      return {
        message: error.message || defaultMessage,
        status: 500,
        code: 'CLIENT_ERROR',
        details: { originalError: error.name },
      };
    }

    // Handle unknown errors
    return {
      message: defaultMessage,
      status: 500,
      code: 'UNKNOWN_ERROR',
      details: { error: String(error) },
    };
  }
}

/**
 * Singleton instance of the hierarchy service
 */
export const hierarchyService = new HierarchyService();

/**
 * Default export for convenience
 */
export default hierarchyService;

/**
 * Named export of the service class for testing and custom instantiation
 */
export { HierarchyService };

/**
 * Type exports for external usage
 */
export type { SiteListParams, CellListParams, HierarchyTreeParams, ApiResponse };
