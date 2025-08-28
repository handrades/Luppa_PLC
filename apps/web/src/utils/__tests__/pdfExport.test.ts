import { captureElementAsImage, exportToPDF } from '../pdfExport';
import html2canvas from 'html2canvas';
import { AnalyticsExportData } from '../../types/analytics';

// Mock jsPDF
const mockSetFontSize = jest.fn();
const mockSetTextColor = jest.fn();
const mockText = jest.fn();
const mockAddPage = jest.fn();
const mockAddImage = jest.fn();
const mockSave = jest.fn();

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    text: mockText,
    addPage: mockAddPage,
    addImage: mockAddImage,
    save: mockSave,
  }));
});

// Mock html2canvas
jest.mock('html2canvas', () => jest.fn());

describe('pdfExport', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockSetFontSize.mockClear();
    mockSetTextColor.mockClear();
    mockText.mockClear();
    mockAddPage.mockClear();
    mockAddImage.mockClear();
    mockSave.mockClear();
    
    // Create mock DOM element
    mockElement = document.createElement('div');
    mockElement.innerHTML = '<div>Dashboard Content</div>';
    
    // Mock html2canvas to return a canvas
    const mockCanvas = {
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImageData'),
      width: 1920,
      height: 1080,
    };
    (html2canvas as jest.Mock).mockResolvedValue(mockCanvas);
  });

  describe('exportToPDF', () => {
    it('should generate PDF with overview data', async () => {
      const exportData: AnalyticsExportData = {
        overview: {
          totalEquipment: 100,
          totalPLCs: 200,
          totalSites: 10,
          totalCells: 50,
          weeklyTrend: { percentage: 5.5, direction: 'up' },
          lastUpdated: new Date('2025-01-27T10:00:00Z'),
        },
        metadata: {
          generatedAt: new Date('2025-01-27T12:00:00Z'),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      // Verify PDF methods were called
      expect(mockSetFontSize).toHaveBeenCalledWith(20);
      expect(mockText).toHaveBeenCalledWith(
        'Equipment Analytics Dashboard',
        15,
        20
      );
      
      // Verify overview data was added
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Total Equipment: 100'),
        15,
        expect.any(Number)
      );
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Total PLCs: 200'),
        15,
        expect.any(Number)
      );
      
      // Verify trend was added
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Trend: ↑ 5.5%'),
        15,
        expect.any(Number)
      );
      
      // Verify save was called
      expect(mockSave).toHaveBeenCalledWith(
        expect.stringMatching(/equipment-analytics-.*\.pdf/)
      );
    });

    it('should include distribution data', async () => {
      const exportData: AnalyticsExportData = {
        distribution: {
          site: {
            labels: ['Site A', 'Site B', 'Site C'],
            values: [100, 75, 25],
            percentages: [50, 37.5, 12.5],
            colors: ['#0088FE', '#00C49F', '#FFBB28'],
          },
          make: {
            labels: ['Allen Bradley', 'Siemens'],
            values: [150, 50],
            percentages: [75, 25],
            colors: ['#0088FE', '#00C49F'],
          },
          type: {
            labels: ['Conveyor', 'Pump'],
            values: [120, 80],
            percentages: [60, 40],
            colors: ['#0088FE', '#00C49F'],
          },
        },
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      // Verify distribution data was added
      expect(mockText).toHaveBeenCalledWith(
        'Distribution Analysis',
        15,
        20
      );
      
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Site A: 100 (50.0%)'),
        20,
        expect.any(Number)
      );
      
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Allen Bradley: 150 (75.0%)'),
        20,
        expect.any(Number)
      );
    });

    it('should include top models', async () => {
      const exportData: AnalyticsExportData = {
        topModels: [
          { make: 'Allen Bradley', model: 'CompactLogix', count: 50, percentage: 50 },
          { make: 'Siemens', model: 'S7-1200', count: 30, percentage: 30 },
          { make: 'Omron', model: 'CJ2M', count: 20, percentage: 20 },
        ],
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      expect(mockText).toHaveBeenCalledWith(
        'Top Equipment Models',
        15,
        20
      );
      
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('1. Allen Bradley CompactLogix: 50 (50.0%)'),
        15,
        expect.any(Number)
      );
    });

    it('should include recent activity', async () => {
      const exportData: AnalyticsExportData = {
        activity: [
          {
            id: '1',
            action: 'create',
            entityType: 'plc',
            entityName: 'PLC-001',
            userId: 'user1',
            userName: 'John Doe',
            timestamp: new Date('2025-01-27T10:00:00Z'),
          },
          {
            id: '2',
            action: 'update',
            entityType: 'equipment',
            entityName: 'Conveyor-01',
            userId: 'user2',
            userName: 'Jane Smith',
            timestamp: new Date('2025-01-27T09:00:00Z'),
          },
        ],
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      expect(mockText).toHaveBeenCalledWith(
        'Recent Activity',
        15,
        20
      );
      
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('John Doe created plc: PLC-001'),
        15,
        expect.any(Number)
      );
    });

    it('should handle empty data gracefully', async () => {
      const exportData: AnalyticsExportData = {
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      // Should still save PDF even with minimal data
      expect(mockSave).toHaveBeenCalled();
    });

    it('should add multiple pages when needed', async () => {
      const exportData: AnalyticsExportData = {
        overview: {
          totalEquipment: 100,
          totalPLCs: 200,
          totalSites: 10,
          totalCells: 50,
          weeklyTrend: { percentage: 5.5, direction: 'up' },
          lastUpdated: new Date(),
        },
        topModels: Array.from({ length: 50 }, (_, i) => ({
          make: `Make ${i}`,
          model: `Model ${i}`,
          count: 100 - i,
          percentage: 2,
        })),
        activity: Array.from({ length: 50 }, (_, i) => ({
          id: `${i}`,
          action: 'create' as const,
          entityType: 'plc' as const,
          entityName: `PLC-${i}`,
          userId: `user${i}`,
          userName: `User ${i}`,
          timestamp: new Date(),
        })),
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      // Should add pages for long content
      expect(mockAddPage).toHaveBeenCalled();
    });

    it('should capture dashboard screenshot', async () => {
      const exportData: AnalyticsExportData = {
        overview: {
          totalEquipment: 100,
          totalPLCs: 200,
          totalSites: 10,
          totalCells: 50,
          weeklyTrend: { percentage: 5.5, direction: 'up' },
          lastUpdated: new Date(),
        },
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      // Add mock buttons to element
      const button = document.createElement('button');
      mockElement.appendChild(button);

      await exportToPDF(mockElement, exportData);

      // Verify html2canvas was called
      expect(html2canvas).toHaveBeenCalledWith(mockElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Verify image was added to PDF
      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,mockImageData',
        'PNG',
        15,
        30,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle screenshot capture failure', async () => {
      // Make html2canvas fail
      (html2canvas as jest.Mock).mockRejectedValue(new Error('Canvas error'));

      const exportData: AnalyticsExportData = {
        overview: {
          totalEquipment: 100,
          totalPLCs: 200,
          totalSites: 10,
          totalCells: 50,
          weeklyTrend: { percentage: 5.5, direction: 'up' },
          lastUpdated: new Date(),
        },
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      // Should still save PDF even if screenshot fails
      expect(mockSave).toHaveBeenCalled();
    });

    it('should format timestamp in filename', async () => {
      const exportData: AnalyticsExportData = {
        metadata: {
          generatedAt: new Date('2025-01-27T14:30:45Z'),
          generatedBy: 'testuser',
          format: 'pdf',
        },
      };

      await exportToPDF(mockElement, exportData);

      // Verify filename format
      expect(mockSave).toHaveBeenCalledWith(
        expect.stringMatching(/equipment-analytics-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf/)
      );
    });

    it('should handle different trend directions', async () => {
      const testCases = [
        { direction: 'up' as const, symbol: '↑' },
        { direction: 'down' as const, symbol: '↓' },
        { direction: 'stable' as const, symbol: '→' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const exportData: AnalyticsExportData = {
          overview: {
            totalEquipment: 100,
            totalPLCs: 200,
            totalSites: 10,
            totalCells: 50,
            weeklyTrend: { percentage: 5.5, direction: testCase.direction },
            lastUpdated: new Date(),
          },
          metadata: {
            generatedAt: new Date(),
            generatedBy: 'testuser',
            format: 'pdf',
          },
        };

        await exportToPDF(mockElement, exportData);

        expect(mockText).toHaveBeenCalledWith(
          expect.stringContaining(`Weekly Trend: ${testCase.symbol} 5.5%`),
          15,
          expect.any(Number)
        );
      }
    });
  });

  describe('captureElementAsImage', () => {
    it('should capture element as base64 image', async () => {
      const result = await captureElementAsImage(mockElement);

      expect(html2canvas).toHaveBeenCalledWith(mockElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      expect(result).toBe('data:image/png;base64,mockImageData');
    });

    it('should handle capture failure', async () => {
      (html2canvas as jest.Mock).mockRejectedValue(new Error('Canvas error'));

      await expect(captureElementAsImage(mockElement)).rejects.toThrow('Canvas error');
    });
  });
});
