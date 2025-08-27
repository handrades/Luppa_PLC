import { SearchResultItem } from '../types/search';
import { exportDataToCSV } from './exportToCSV';

/**
 * Export search results to CSV format
 */
export const exportSearchResultsToCSV = (results: SearchResultItem[], filename?: string): void => {
  const columns = [
    { id: 'tag_id', label: 'Tag ID' },
    { id: 'plc_description', label: 'Description' },
    { id: 'make', label: 'Make' },
    { id: 'model', label: 'Model' },
    { id: 'ip_address', label: 'IP Address' },
    { id: 'firmware_version', label: 'Firmware Version' },
    { id: 'equipment_name', label: 'Equipment Name' },
    { id: 'equipment_type', label: 'Equipment Type' },
    { id: 'cell_name', label: 'Cell Name' },
    { id: 'line_number', label: 'Line Number' },
    { id: 'site_name', label: 'Site Name' },
    { id: 'hierarchy_path', label: 'Hierarchy Path' },
    {
      id: 'relevance_score',
      label: 'Relevance Score',
      format: (value: unknown) => {
        const score = value as number;
        return score ? score.toFixed(3) : '0.000';
      },
    },
  ];

  const exportFilename = filename || `search_results_${new Date().toISOString().split('T')[0]}`;

  exportDataToCSV(results, columns, {
    filename: exportFilename,
    includeHeaders: true,
  });
};

/**
 * Export search results to JSON format
 */
export const exportSearchResultsToJSON = (results: SearchResultItem[], filename?: string): void => {
  // Create clean export data without highlighted fields for cleaner JSON
  const exportData = results.map(result => ({
    tag_id: result.tag_id,
    plc_description: result.plc_description,
    make: result.make,
    model: result.model,
    ip_address: result.ip_address,
    firmware_version: result.firmware_version,
    equipment_id: result.equipment_id,
    equipment_name: result.equipment_name,
    equipment_type: result.equipment_type,
    cell_id: result.cell_id,
    cell_name: result.cell_name,
    line_number: result.line_number,
    site_id: result.site_id,
    site_name: result.site_name,
    hierarchy_path: result.hierarchy_path,
    relevance_score: result.relevance_score,
    tags_text: result.tags_text,
  }));

  const exportFilename =
    filename || `search_results_${new Date().toISOString().split('T')[0]}.json`;
  const jsonContent = JSON.stringify(
    {
      export_info: {
        generated_at: new Date().toISOString(),
        total_results: exportData.length,
        version: '1.0',
      },
      results: exportData,
    },
    null,
    2
  );

  // Create and download JSON file
  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    exportFilename.endsWith('.json') ? exportFilename : `${exportFilename}.json`
  );
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export options interface
 */
export interface SearchExportOptions {
  format: 'csv' | 'json';
  filename?: string;
  includeMetadata?: boolean;
}

/**
 * Main export function with format selection
 */
export const exportSearchResults = (
  results: SearchResultItem[],
  options: SearchExportOptions = { format: 'csv' }
): void => {
  if (!results || results.length === 0) {
    throw new Error('No search results to export');
  }

  const { format, filename } = options;

  try {
    switch (format) {
      case 'csv':
        exportSearchResultsToCSV(results, filename);
        break;
      case 'json':
        exportSearchResultsToJSON(results, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    // console.error('Export failed:', error);
    throw new Error(
      `Failed to export search results: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
