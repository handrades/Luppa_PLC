/**
 * CSV Export Utility
 * Handles exporting data to CSV format with proper escaping and formatting
 */

export interface CSVExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
  lineEnding?: string;
  dateFormat?: (_date: Date) => string;
}

/**
 * Escapes special characters in CSV values
 */
function escapeCSVValue(value: unknown, delimiter: string = ','): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);

  // Check if escaping is needed
  const needsEscaping = 
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r');

  if (needsEscaping) {
    // Escape double quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    // Wrap in quotes
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Formats a row of data as CSV
 */
function formatCSVRow(
  row: unknown[],
  delimiter: string = ','
): string {
  return row.map(value => escapeCSVValue(value, delimiter)).join(delimiter);
}

/**
 * Exports data to CSV format
 */
export function exportToCSV<T = Record<string, unknown>>(
  data: T[],
  columns: Array<{
    id: string;
    label: string;
    format?: (_value: unknown, _row: T) => unknown;
  }>,
  options: CSVExportOptions = {}
): string {
  const {
    includeHeaders = true,
    delimiter = ',',
    lineEnding = '\n',
    dateFormat = (date: Date) => date.toISOString(),
  } = options;

  const lines: string[] = [];

  // Add headers if requested
  if (includeHeaders) {
    const headers = columns.map(col => col.label);
    lines.push(formatCSVRow(headers, delimiter));
  }

  // Add data rows
  for (const row of data) {
    const values = columns.map(col => {
      const rawValue = (row as Record<string, unknown>)[col.id];
      
      // Apply column formatter if available
      if (col.format) {
        return col.format(rawValue, row);
      }
      
      // Handle dates
      if (rawValue instanceof Date) {
        return dateFormat(rawValue);
      }
      
      // Handle arrays
      if (Array.isArray(rawValue)) {
        return rawValue.join('; ');
      }
      
      // Handle objects
      if (typeof rawValue === 'object' && rawValue !== null) {
        return JSON.stringify(rawValue);
      }
      
      return rawValue;
    });
    
    lines.push(formatCSVRow(values, delimiter));
  }

  return lines.join(lineEnding);
}

/**
 * Downloads CSV content as a file
 */
export function downloadCSV(
  content: string,
  filename: string = 'export.csv'
): void {
  // Ensure filename ends with .csv
  if (!filename.endsWith('.csv')) {
    filename += '.csv';
  }

  // Create blob with BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports selected or filtered data to CSV and downloads it
 */
export function exportDataToCSV<T = Record<string, unknown>>(
  data: T[],
  columns: Array<{
    id: string;
    label: string;
    format?: (_value: unknown, _row: T) => unknown;
  }>,
  options: CSVExportOptions & {
    selectedRows?: Set<string | number>;
    rowKey?: (row: T, index: number) => string | number;
    filename?: string;
  } = {}
): void {
  const {
    selectedRows,
    rowKey = (_row: T, index: number) => index,
    filename = `export_${new Date().toISOString().split('T')[0]}`,
    ...csvOptions
  } = options;

  // Filter data if selectedRows is provided
  let exportData = data;
  if (selectedRows && selectedRows.size > 0) {
    exportData = data.filter((row, index) => {
      const key = rowKey(row, index);
      return selectedRows.has(key);
    });
  }

  // Generate CSV content
  const csvContent = exportToCSV(exportData, columns, csvOptions);
  
  // Download the file
  downloadCSV(csvContent, filename);
}

/**
 * Utility to get a safe filename
 */
export function getSafeFilename(name: string): string {
  // Remove or replace invalid characters
  return name
    .replace(/[^a-z0-9\-.]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}