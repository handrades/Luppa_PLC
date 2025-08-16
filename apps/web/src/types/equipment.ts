/**
 * Equipment TypeScript interfaces for the Equipment List UI
 * Story 4.3: Equipment List UI
 */

import { ReactNode } from 'react';

// Equipment Type Enum
export enum EquipmentType {
  PRESS = 'PRESS',
  ROBOT = 'ROBOT',
  OVEN = 'OVEN',
  CONVEYOR = 'CONVEYOR',
  ASSEMBLY_TABLE = 'ASSEMBLY_TABLE',
  OTHER = 'OTHER',
}

// Base Equipment interface matching API response
export interface Equipment {
  id: string;
  cellId: string;
  name: string;
  equipmentType: EquipmentType;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

// Extended equipment interface with PLC and hierarchy data for list view
export interface EquipmentWithDetails extends Equipment {
  // PLC relationship data (optional if no PLC associated)
  description?: string;  // From associated PLC
  make?: string;         // From associated PLC
  model?: string;        // From associated PLC
  ip?: string;          // From associated PLC
  tags?: string[];      // From associated PLC
  
  // Hierarchy data (always present from joins)
  siteName: string;     // From site relationship
  cellName: string;     // From cell relationship
  cellType: string;     // From cell relationship
}

// Search and filter parameters for API requests
export interface EquipmentSearchFilters {
  search?: string;        // Global text search across all fields
  siteName?: string;      // Filter by specific site
  cellName?: string;      // Filter by specific cell
  equipmentType?: string; // Filter by equipment type
  make?: string;          // Filter by PLC make
  model?: string;         // Filter by PLC model
  page?: number;          // Page number (1-based)
  limit?: number;         // Page size (max 100)
  sortBy?: string;        // Sort field name
  sortOrder?: 'asc' | 'desc'; // Sort direction
}

// Pagination metadata from API responses
export interface PaginationMetadata {
  page: number;           // Current page (1-based)
  pageSize: number;       // Items per page
  totalItems: number;     // Total number of items
  totalPages: number;     // Total number of pages
}

// Complete API response format for equipment list
export interface EquipmentListResponse {
  data: EquipmentWithDetails[];
  pagination: PaginationMetadata;
}

// Equipment service response for error handling
export interface EquipmentServiceError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

// Equipment selection state for bulk operations
export interface EquipmentSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  selectedCount: number;
}

// Equipment list UI state
export interface EquipmentListState {
  equipment: EquipmentWithDetails[];
  pagination: PaginationMetadata;
  filters: EquipmentSearchFilters;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  selection: EquipmentSelectionState;
}

// Equipment store actions interface
export interface EquipmentActions {
  fetchEquipment: (filters?: EquipmentSearchFilters) => Promise<void>;
  searchEquipment: (searchTerm: string) => Promise<void>;
  setFilters: (filters: Partial<EquipmentSearchFilters>) => void;
  setSelection: (selectedIds: Set<string>) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearError: () => void;
  reset: () => void;
}

// Complete equipment store interface
export interface EquipmentStore extends EquipmentListState, EquipmentActions {}

// Props for equipment list page component
export interface EquipmentListPageProps {
  initialFilters?: Partial<EquipmentSearchFilters>;
}

// Props for equipment empty state component
export interface EquipmentEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAddEquipment?: () => void;
}

// Props for equipment actions toolbar component
export interface EquipmentActionsProps {
  selectedCount: number;
  onExport?: () => void;
  onDelete?: () => void;
  onClearSelection: () => void;
}

// Column definition for DataGrid integration
export interface EquipmentColumn<T = EquipmentWithDetails> {
  id: keyof T;
  label: string;
  sortable: boolean;
  filterable: boolean;
  width: number;
  format?: (value: T[keyof T], row: T) => ReactNode;
}

// Search hook return type
export interface UseEquipmentSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  isSearching: boolean;
  clearSearch: () => void;
}

// Equipment hook return type
export interface UseEquipmentReturn {
  equipment: EquipmentWithDetails[];
  pagination: PaginationMetadata;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
  hasNextPage: boolean;
}
