/**
 * Search Types
 * TypeScript interfaces for search functionality
 */

export interface SearchResultItem {
  plc_id: string;
  tag_id: string;
  plc_description: string;
  make: string;
  model: string;
  ip_address: string | null;
  firmware_version: string | null;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  cell_id: string;
  cell_name: string;
  line_number: string;
  site_id: string;
  site_name: string;
  hierarchy_path: string;
  relevance_score: number;
  highlighted_fields?: {
    description?: string;
    make?: string;
    model?: string;
    tag_id?: string;
    site_name?: string;
    cell_name?: string;
    equipment_name?: string;
  };
  tags_text?: string;
}

export interface SearchResponse {
  data: SearchResultItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchMetadata: {
    query: string;
    executionTimeMs: number;
    totalMatches: number;
    suggestedCorrections?: string[];
    searchType: 'fulltext' | 'similarity' | 'hybrid';
  };
}

export interface SearchQuery {
  q: string;
  page?: number;
  pageSize?: number;
  fields?: string[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  includeHighlights?: boolean;
  maxResults?: number;
}

export interface RecentSearch {
  query: string;
  timestamp: Date;
  resultCount: number;
  executionTime: number;
}

export interface SearchMetrics {
  totalSearches: number;
  averageExecutionTime: number;
  averageResultCount: number;
  popularQueries: string[];
  recentActivity: RecentSearch[];
}

export interface SearchSuggestionsResponse {
  query: string;
  suggestions: string[];
  count: number;
}

export interface SearchFilter {
  field: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
  value: string;
}

export interface SearchPreset {
  id: string;
  name: string;
  description: string;
  query: SearchQuery;
  isDefault: boolean;
  createdAt: Date;
  lastUsed?: Date;
}
