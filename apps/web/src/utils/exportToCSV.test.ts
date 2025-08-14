import { exportToCSV, escapeCSVValue, downloadCSV, getSafeFilename } from './exportToCSV';

describe('exportToCSV', () => {
  interface TestData {
    id: number;
    name: string;
    value: number;
    date: Date;
    tags: string[];
    description: string | null;
  }

  const testData: TestData[] = [
    {
      id: 1,
      name: 'Item 1',
      value: 100,
      date: new Date('2024-01-01'),
      tags: ['tag1', 'tag2'],
      description: 'Simple description',
    },
    {
      id: 2,
      name: 'Item, with comma',
      value: 200,
      date: new Date('2024-01-02'),
      tags: ['tag3'],
      description: null,
    },
    {
      id: 3,
      name: 'Item "with quotes"',
      value: 300,
      date: new Date('2024-01-03'),
      tags: [],
      description: 'Line 1\nLine 2',
    },
  ];

  const columns = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
    { id: 'value', label: 'Value' },
    { id: 'date', label: 'Date' },
    { id: 'tags', label: 'Tags' },
    { id: 'description', label: 'Description' },
  ];

  describe('CSV escaping', () => {
    it('should not escape simple values', () => {
      const result = exportToCSV(
        [{ id: 1, name: 'Simple' }],
        [
          { id: 'id', label: 'ID' },
          { id: 'name', label: 'Name' },
        ],
        { includeHeaders: false }
      );
      expect(result).toBe('1,Simple');
    });

    it('should escape values with commas', () => {
      const result = exportToCSV(
        [{ name: 'Value, with comma' }],
        [{ id: 'name', label: 'Name' }],
        { includeHeaders: false }
      );
      expect(result).toBe('"Value, with comma"');
    });

    it('should escape values with quotes', () => {
      const result = exportToCSV(
        [{ name: 'Value "with quotes"' }],
        [{ id: 'name', label: 'Name' }],
        { includeHeaders: false }
      );
      expect(result).toBe('"Value ""with quotes"""');
    });

    it('should escape values with newlines', () => {
      const result = exportToCSV(
        [{ name: 'Line 1\nLine 2' }],
        [{ id: 'name', label: 'Name' }],
        { includeHeaders: false }
      );
      expect(result).toBe('"Line 1\nLine 2"');
    });

    it('should handle null and undefined values', () => {
      const result = exportToCSV(
        [{ id: 1, name: null, value: undefined }],
        [
          { id: 'id', label: 'ID' },
          { id: 'name', label: 'Name' },
          { id: 'value', label: 'Value' },
        ],
        { includeHeaders: false }
      );
      expect(result).toBe('1,,');
    });
  });

  describe('Headers', () => {
    it('should include headers by default', () => {
      const result = exportToCSV(
        [{ id: 1, name: 'Test' }],
        [
          { id: 'id', label: 'ID' },
          { id: 'name', label: 'Name' },
        ]
      );
      const lines = result.split('\n');
      expect(lines[0]).toBe('ID,Name');
      expect(lines[1]).toBe('1,Test');
    });

    it('should exclude headers when specified', () => {
      const result = exportToCSV(
        [{ id: 1, name: 'Test' }],
        [
          { id: 'id', label: 'ID' },
          { id: 'name', label: 'Name' },
        ],
        { includeHeaders: false }
      );
      expect(result).toBe('1,Test');
    });
  });

  describe('Formatting', () => {
    it('should apply column formatters', () => {
      const result = exportToCSV(
        [{ value: 100 }],
        [
          {
            id: 'value',
            label: 'Value',
            format: (value) => `$${value.toFixed(2)}`,
          },
        ],
        { includeHeaders: false }
      );
      expect(result).toBe('$100.00');
    });

    it('should format dates with custom formatter', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = exportToCSV(
        [{ date }],
        [{ id: 'date', label: 'Date' }],
        {
          includeHeaders: false,
          dateFormat: (d) => d.toISOString().split('T')[0],
        }
      );
      expect(result).toBe('2024-01-01');
    });

    it('should handle arrays by joining with semicolon', () => {
      const result = exportToCSV(
        [{ tags: ['tag1', 'tag2', 'tag3'] }],
        [{ id: 'tags', label: 'Tags' }],
        { includeHeaders: false }
      );
      expect(result).toBe('tag1; tag2; tag3');
    });

    it('should handle objects by stringifying', () => {
      const result = exportToCSV(
        [{ meta: { key: 'value' } }],
        [{ id: 'meta', label: 'Meta' }],
        { includeHeaders: false }
      );
      expect(result).toBe('"{""key"":""value""}"');
    });
  });

  describe('Custom delimiters', () => {
    it('should use custom delimiter', () => {
      const result = exportToCSV(
        [{ id: 1, name: 'Test' }],
        [
          { id: 'id', label: 'ID' },
          { id: 'name', label: 'Name' },
        ],
        { includeHeaders: false, delimiter: ';' }
      );
      expect(result).toBe('1;Test');
    });

    it('should escape custom delimiter', () => {
      const result = exportToCSV(
        [{ name: 'Value;with;semicolon' }],
        [{ id: 'name', label: 'Name' }],
        { includeHeaders: false, delimiter: ';' }
      );
      expect(result).toBe('"Value;with;semicolon"');
    });
  });

  describe('Line endings', () => {
    it('should use custom line ending', () => {
      const result = exportToCSV(
        [{ id: 1 }, { id: 2 }],
        [{ id: 'id', label: 'ID' }],
        { includeHeaders: false, lineEnding: '\r\n' }
      );
      expect(result).toBe('1\r\n2');
    });
  });

  describe('Complete export', () => {
    it('should export complete dataset with all features', () => {
      const result = exportToCSV(testData, columns);
      const lines = result.split('\n');
      
      // Check headers
      expect(lines[0]).toBe('ID,Name,Value,Date,Tags,Description');
      
      // Check first data row
      expect(lines[1]).toContain('1,Item 1,100');
      expect(lines[1]).toContain('tag1; tag2');
      expect(lines[1]).toContain('Simple description');
      
      // Check escaped values
      expect(lines[2]).toContain('"Item, with comma"');
      expect(lines[3]).toContain('"Item ""with quotes"""');
      // The newline test is platform-dependent, just check it's escaped
      expect(lines[3]).toContain('"Line 1');
    });
  });
});

describe('downloadCSV', () => {
  let createElementSpy: jest.SpyInstance;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;
  let clickSpy: jest.Mock;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    clickSpy = jest.fn();
    const linkElement = document.createElement('a');
    linkElement.click = clickSpy;
    createElementSpy = jest.spyOn(document, 'createElement');
    createElementSpy.mockReturnValue(linkElement);
    
    // Mock URL methods directly
    URL.createObjectURL = jest.fn().mockReturnValue('blob:url');
    URL.revokeObjectURL = jest.fn();
    
    appendChildSpy = jest.spyOn(document.body, 'appendChild');
    removeChildSpy = jest.spyOn(document.body, 'removeChild');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should trigger download with correct filename', () => {
    downloadCSV('test,content', 'export.csv');
    
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });

  it('should add .csv extension if missing', () => {
    downloadCSV('content', 'export');
    
    const link = createElementSpy.mock.results[0].value;
    expect(link.download).toBe('export.csv');
  });

  it('should not add .csv extension if already present', () => {
    downloadCSV('content', 'export.csv');
    
    const link = createElementSpy.mock.results[0].value;
    expect(link.download).toBe('export.csv');
  });
});

describe('getSafeFilename', () => {
  it('should keep valid characters', () => {
    expect(getSafeFilename('valid_name-123.csv')).toBe('valid_name-123.csv');
  });

  it('should replace invalid characters with underscore', () => {
    expect(getSafeFilename('file@name#2024')).toBe('file_name_2024');
  });

  it('should replace spaces with underscore', () => {
    expect(getSafeFilename('my file name')).toBe('my_file_name');
  });

  it('should collapse multiple underscores', () => {
    expect(getSafeFilename('file___name')).toBe('file_name');
  });

  it('should trim underscores from start and end', () => {
    expect(getSafeFilename('_filename_')).toBe('filename');
  });

  it('should handle complex cases', () => {
    expect(getSafeFilename('My File (2024) - Copy.csv')).toBe('My_File_2024_-_Copy.csv');
  });
});