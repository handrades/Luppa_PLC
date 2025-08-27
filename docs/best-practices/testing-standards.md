# Testing Standards

## Unit Testing Patterns

Follow consistent testing patterns using Jest:

```typescript
// Service layer testing
describe('PlcService', () => {
  let service: PlcService;
  let mockRepository: jest.Mocked<IPlcRepository>;
  let mockAuditService: jest.Mocked<IAuditService>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByIp: jest.fn(),
      create: jest.fn(),
      // ... other methods
    } as jest.Mocked<IPlcRepository>;

    mockAuditService = {
      log: jest.fn(),
    } as jest.Mocked<IAuditService>;

    const mockLogger: jest.Mocked<ILogger> = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    service = new PlcService(mockRepository, mockAuditService, mockLogger);
  });

  describe('createPlc', () => {
    const validPlcData: PlcCreateInput = {
      description: 'Test PLC',
      make: 'Allen-Bradley',
      model: 'CompactLogix 5370',
      ip: '192.168.1.100',
      tags: ['production', 'line1'],
      location: {
        siteName: 'Plant A',
        cellType: 'Production',
        cellId: 'CELL-001',
      },
    };

    it('should create PLC successfully with valid data', async () => {
      const expectedPlc: PLCRecord = {
        id: 'plc-123',
        ...validPlcData,
        status: 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(expectedPlc);
      mockRepository.findByIp.mockResolvedValue(null);

      const result = await service.createPlc(validPlcData, 'user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expectedPlc);
      }
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'plc.created',
          entityId: 'plc-123',
          userId: 'user-123',
        })
      );
    });

    it('should return error when IP address is already in use', async () => {
      mockRepository.findByIp.mockResolvedValue(expectedPlc);

      const result = await service.createPlc(validPlcData, 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('IP address already in use');
      }
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });
});
```

## React Component Testing

Test industrial UI components thoroughly:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlcCard } from './PlcCard';

describe('PlcCard', () => {
  const mockPlc: PLCRecord = {
    id: 'plc-123',
    description: 'Line 1 Controller',
    make: 'Allen-Bradley',
    model: 'CompactLogix 5370',
    ip: '192.168.1.100',
    tags: ['production', 'line1'],
    location: {
      siteName: 'Plant A',
      cellType: 'Production',
      cellId: 'CELL-001'
    },
    status: 'Running',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('should display PLC information correctly', () => {
    render(<PlcCard plc={mockPlc} />);

    expect(screen.getByText('Line 1 Controller')).toBeInTheDocument();
    expect(screen.getByText('Allen-Bradley CompactLogix 5370')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('should handle status change events', async () => {
    const onStatusChange = jest.fn();
    render(<PlcCard plc={mockPlc} onStatusChange={onStatusChange} />);

    const statusButton = screen.getByRole('button', { name: /status/i });
    await userEvent.click(statusButton);

    const alarmOption = screen.getByText('Alarm');
    await userEvent.click(alarmOption);

    expect(onStatusChange).toHaveBeenCalledWith('plc-123', 'Alarm');
  });
});
```
