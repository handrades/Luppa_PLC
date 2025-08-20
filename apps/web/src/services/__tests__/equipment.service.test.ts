/**
 * Equipment Service Tests
 * Story 4.3: Equipment List UI
 */

import { equipmentQueryKeys, equipmentService } from '../equipment.service';
import apiClient from '../api.client';
import type {
  EquipmentListResponse,
  EquipmentSearchFilters,
  EquipmentType,
} from '../../types/equipment';

// Mock api.client
jest.mock('../api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('EquipmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEquipment', () => {
    const mockResponse: EquipmentListResponse = {
      data: [
        {
          id: '1',
          cellId: 'cell-1',
          name: 'Test Equipment',
          equipmentType: 'PRESS' as EquipmentType,
          createdBy: 'user-1',
          updatedBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          description: 'Test PLC',
          make: 'Allen-Bradley',
          model: 'ControlLogix',
          ip: '192.168.1.100',
          siteName: 'Test Site',
          cellName: 'Test Cell',
          cellType: 'Assembly',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
      },
    };

    it('should fetch equipment with default parameters', async () => {
      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await equipmentService.getEquipment();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/v1/equipment');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch equipment with search filters', async () => {
      const filters: EquipmentSearchFilters = {
        search: 'test',
        siteName: 'Test Site',
        page: 2,
        limit: 25,
        sortBy: 'name',
        sortOrder: 'desc',
      };

      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await equipmentService.getEquipment(filters);

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/v1/equipment?search=test&siteName=Test+Site&page=2&pageSize=25&sortBy=name&sortOrder=DESC'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty search term', async () => {
      const filters: EquipmentSearchFilters = {
        search: '   ',
        siteName: 'Test Site',
      };

      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      await equipmentService.getEquipment(filters);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/v1/equipment?siteName=Test+Site');
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockedApiClient.get.mockRejectedValue(error);

      await expect(equipmentService.getEquipment()).rejects.toMatchObject({
        message: 'API Error',
        status: 500,
      });
    });

    it('should handle Axios errors with response data', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
          },
        },
      };
      mockedApiClient.get.mockRejectedValue(axiosError);

      await expect(equipmentService.getEquipment()).rejects.toMatchObject({
        message: 'Validation failed',
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    });
  });

  describe('searchEquipment', () => {
    it('should search equipment with search term', async () => {
      const mockResponse: EquipmentListResponse = {
        data: [],
        pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
      };

      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await equipmentService.searchEquipment('test search');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/v1/equipment?search=test+search');
      expect(result).toEqual(mockResponse);
    });

    it('should combine search term with additional filters', async () => {
      const mockResponse: EquipmentListResponse = {
        data: [],
        pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
      };

      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await equipmentService.searchEquipment('test', {
        siteName: 'Site A',
        limit: 25,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/v1/equipment?search=test&siteName=Site+A&pageSize=25'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEquipmentById', () => {
    it('should fetch equipment by ID', async () => {
      const mockEquipment = {
        id: '1',
        name: 'Test Equipment',
        equipmentType: 'PRESS' as EquipmentType,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockEquipment });

      const result = await equipmentService.getEquipmentById('1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/v1/equipment/1');
      expect(result).toEqual(mockEquipment);
    });

    it('should handle not found errors', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: {
            message: 'Equipment not found',
          },
        },
      };
      mockedApiClient.get.mockRejectedValue(axiosError);

      await expect(equipmentService.getEquipmentById('999')).rejects.toMatchObject({
        message: 'Equipment not found',
        status: 404,
      });
    });
  });

  describe('exportEquipment', () => {
    it('should export equipment data', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      mockedApiClient.get.mockResolvedValue({ data: mockBlob });

      const result = await equipmentService.exportEquipment(
        {
          siteName: 'Test Site',
        },
        'csv'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/v1/equipment/export?siteName=Test+Site&format=csv',
        { responseType: 'blob' }
      );
      expect(result).toEqual(mockBlob);
    });
  });
});

describe('equipmentQueryKeys', () => {
  it('should generate correct query keys', () => {
    expect(equipmentQueryKeys.all).toEqual(['equipment']);
    expect(equipmentQueryKeys.lists()).toEqual(['equipment', 'list']);
    expect(equipmentQueryKeys.list({ search: 'test' })).toEqual([
      'equipment',
      'list',
      { search: 'test' },
    ]);
    expect(equipmentQueryKeys.detail('123')).toEqual(['equipment', 'detail', '123']);
    expect(equipmentQueryKeys.stats()).toEqual(['equipment', 'stats']);
  });
});
