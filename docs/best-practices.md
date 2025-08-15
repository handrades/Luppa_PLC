# TypeScript Best Practices for Luppa PLC

This document outlines TypeScript best practices specifically tailored for the Luppa PLC multi-app framework project.
These practices ensure code quality, maintainability, and performance for industrial-grade applications.

## Table of Contents

1. [Project Configuration](#project-configuration)
2. [Code Structure & Readability](#code-structure--readability)
3. [Type Safety & Error Handling](#type-safety--error-handling)
4. [React Component Best Practices](#react-component-best-practices)
5. [Backend API Best Practices](#backend-api-best-practices)
6. [Testing Standards](#testing-standards)
7. [Performance Optimization](#performance-optimization)
8. [Security Practices](#security-practices)
9. [Monorepo Conventions](#monorepo-conventions)
10. [Industrial Context Considerations](#industrial-context-considerations)

## Project Configuration

### Strict TypeScript Configuration

Our project uses strict TypeScript settings across all workspaces. Key configuration principles:

```json
// config/tsconfig.json
{
  "compilerOptions": {
    "strict": true, // Enable all strict type-checking options
    "noUnusedLocals": true, // Error on unused local variables
    "noUnusedParameters": true, // Error on unused parameters
    "noFallthroughCasesInSwitch": true, // Error on fallthrough switch cases
    "exactOptionalPropertyTypes": true, // Strict optional property types
    "noImplicitReturns": true, // Error when not all code paths return
    "noUncheckedIndexedAccess": true // Add undefined to index signature results
  }
}
```

**✅ Good:**

```typescript
// Explicit typing for PLC data
interface PLCRecord {
  id: string;
  description: string;
  make: string;
  model: string;
  ip: string | null; // Explicit null for optional IP
  tags: string[];
}

function validatePLC(plc: PLCRecord): boolean {
  return plc.description.length > 0 && plc.make.length > 0;
}
```

**❌ Bad:**

```typescript
// Implicit any types and loose validation
function validatePLC(plc: any): any {
  return plc.description && plc.make;
}
```

## Code Structure & Readability

### Meaningful Naming Conventions

Use descriptive names that reflect the industrial domain:

```typescript
// ✅ Good - Industrial context is clear
interface PLCConnectionConfig {
  ipAddress: string;
  port: number;
  timeout: number;
}

const isPlcResponding = (config: PLCConnectionConfig): boolean => {
  // Implementation
};

// ❌ Bad - Generic names without context
interface Config {
  ip: string;
  p: number;
  t: number;
}

const check = (c: any): boolean => {
  // Implementation
};
```

### Function Design

Keep functions small and focused (5-10 lines ideal for pure functions):

```typescript
// ✅ Good - Single responsibility, pure function
const calculatePlcHealthScore = (uptime: number, errorCount: number, lastResponseTime: number): number => {
  const uptimeScore = Math.min(uptime / 100, 1);
  const errorScore = Math.max(1 - errorCount / 10, 0);
  const responseScore = lastResponseTime < 1000 ? 1 : 0.5;

  return (uptimeScore + errorScore + responseScore) / 3;
};

// ❌ Bad - Multiple responsibilities, too long
const processPlcData = (plcs: any[], filters: any, sort: any) => {
  // 50+ lines of mixed logic
  // Filtering, sorting, validation, transformation all in one function
};
```

### Parameter Management

Minimize parameters using configuration objects:

```typescript
// ✅ Good - Configuration object pattern
interface PlcQueryOptions {
  siteFilter?: string;
  cellTypeFilter?: string;
  tags?: string[];
  sortBy?: 'description' | 'make' | 'ip';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

const queryPlcs = async (options: PlcQueryOptions = {}): Promise<PLCRecord[]> => {
  const { siteFilter, cellTypeFilter, tags = [], sortBy = 'description', sortOrder = 'asc', limit = 100 } = options;

  // Implementation
};

// ❌ Bad - Too many parameters
const queryPlcs = (
  site: string,
  cellType: string,
  tags: string[],
  sortBy: string,
  sortOrder: string,
  limit: number
) => {
  // Implementation
};
```

### Use Modern JavaScript Features

Leverage ES2022+ features in our tech stack:

```typescript
// ✅ Good - Template literals and destructuring
const generatePlcReport = ({ description, make, model, ip }: PLCRecord): string => {
  return `PLC Report:
    Description: ${description}
    Make/Model: ${make} ${model}
    IP Address: ${ip ?? 'Not configured'}`;
};

// ✅ Good - Array methods and spread operator
const getActivePlcs = (plcs: PLCRecord[]): PLCRecord[] => {
  return plcs.filter(plc => plc.ip !== null).map(plc => ({ ...plc, status: 'active' }));
};
```

## Type Safety & Error Handling

### Strong Typing for Domain Models

Create comprehensive type definitions for your industrial domain:

```typescript
// Domain-specific types
type PlcMake = 'Allen-Bradley' | 'Siemens' | 'Schneider' | 'Omron' | 'Mitsubishi';
type CellType = 'Production' | 'Quality' | 'Packaging' | 'Shipping' | 'Maintenance';
type EquipmentStatus = 'Running' | 'Stopped' | 'Alarm' | 'Maintenance' | 'Unknown';

interface PlcLocation {
  siteName: string;
  cellType: CellType;
  cellId: string;
  equipmentId?: string;
}

interface PLCRecord {
  readonly id: string; // Immutable ID
  description: string;
  make: PlcMake;
  model: string;
  ip: string | null;
  tags: readonly string[]; // Immutable tags array
  location: PlcLocation;
  status: EquipmentStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### Error Handling Patterns

Use discriminated unions for error handling:

```typescript
// Result pattern for error handling
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// Service layer example
class PlcService {
  async findById(id: string): Promise<Result<PLCRecord, 'NOT_FOUND' | 'DATABASE_ERROR'>> {
    try {
      const plc = await this.repository.findById(id);
      if (!plc) {
        return { success: false, error: 'NOT_FOUND' };
      }
      return { success: true, data: plc };
    } catch (error) {
      logger.error('Database error finding PLC', { id, error });
      return { success: false, error: 'DATABASE_ERROR' };
    }
  }
}

// Usage with type-safe error handling
const result = await plcService.findById('plc-123');
if (!result.success) {
  switch (result.error) {
    case 'NOT_FOUND':
      return res.status(404).json({ message: 'PLC not found' });
    case 'DATABASE_ERROR':
      return res.status(500).json({ message: 'Internal server error' });
  }
}

// TypeScript knows result.data is PLCRecord here
const plc = result.data;
```

### Input Validation with Zod

Leverage Zod for runtime type validation (aligns with our Joi usage):

```typescript
import { z } from 'zod';

const PlcCreateSchema = z.object({
  description: z.string().min(1).max(255),
  make: z.enum(['Allen-Bradley', 'Siemens', 'Schneider', 'Omron', 'Mitsubishi']),
  model: z.string().min(1).max(100),
  ip: z.string().ip().nullable(),
  tags: z.array(z.string()).max(50),
  location: z.object({
    siteName: z.string().min(1),
    cellType: z.enum(['Production', 'Quality', 'Packaging', 'Shipping', 'Maintenance']),
    cellId: z.string().min(1),
    equipmentId: z.string().optional(),
  }),
});

type PlcCreateInput = z.infer<typeof PlcCreateSchema>;

// Controller with validation
const createPlc = async (req: Request, res: Response) => {
  const validation = PlcCreateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'Validation error',
      errors: validation.error.format(),
    });
  }

  // validation.data is properly typed as PlcCreateInput
  const plc = await plcService.create(validation.data);
  res.status(201).json(plc);
};
```

## React Component Best Practices

### Component Structure

Follow consistent patterns for industrial UI components:

```typescript
// ✅ Good - Proper component structure
interface PlcCardProps {
  plc: PLCRecord;
  onStatusChange?: (id: string, status: EquipmentStatus) => void;
  showDetails?: boolean;
}

const PlcCard: React.FC<PlcCardProps> = ({
  plc,
  onStatusChange,
  showDetails = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusChange = useCallback((newStatus: EquipmentStatus) => {
    onStatusChange?.(plc.id, newStatus);
  }, [plc.id, onStatusChange]);

  return (
    <Card>
      <CardHeader
        title={plc.description}
        subheader={`${plc.make} ${plc.model}`}
        action={
          <PlcStatusIndicator
            status={plc.status}
            onChange={handleStatusChange}
          />
        }
      />
      {showDetails && (
        <CardContent>
          <PlcDetails plc={plc} />
        </CardContent>
      )}
    </Card>
  );
};
```

### Custom Hooks

Create reusable hooks for industrial data operations:

```typescript
// Custom hook for PLC data management
interface UsePlcDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const usePlcData = (filters: PlcQueryOptions, options: UsePlcDataOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  const [data, setData] = useState<PLCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await plcApi.query(filters);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, loading, error, refetch: fetchData };
};
```

## Backend API Best Practices

### Repository Pattern

Implement clean repository patterns:

```typescript
interface IPlcRepository {
  findById(id: string): Promise<PLCRecord | null>;
  findByFilters(filters: PlcQueryOptions): Promise<PLCRecord[]>;
  create(data: PlcCreateInput): Promise<PLCRecord>;
  update(id: string, data: Partial<PlcCreateInput>): Promise<PLCRecord>;
  delete(id: string): Promise<void>;
  countByFilters(filters: PlcQueryOptions): Promise<number>;
}

class PlcRepository implements IPlcRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<PLCRecord | null> {
    const query = `
      SELECT p.*, l.site_name, l.cell_type, l.cell_id, l.equipment_id
      FROM plc_records p
      LEFT JOIN plc_locations l ON p.id = l.plc_id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;

    const result = await this.db.query<PLCRecord>(query, [id]);
    return result.rows[0] || null;
  }

  // Additional methods...
}
```

### Service Layer

Implement business logic in service layers:

```typescript
class PlcService {
  constructor(
    private repository: IPlcRepository,
    private auditService: IAuditService,
    private logger: ILogger
  ) {}

  async createPlc(data: PlcCreateInput, userId: string): Promise<Result<PLCRecord, string>> {
    try {
      // Business logic validation
      if (data.ip && (await this.repository.findByIp(data.ip))) {
        return { success: false, error: 'IP address already in use' };
      }

      // Create the PLC
      const plc = await this.repository.create(data);

      // Audit logging for compliance
      await this.auditService.log({
        action: 'plc.created',
        entityType: 'plc',
        entityId: plc.id,
        userId,
        details: { description: plc.description, make: plc.make },
      });

      this.logger.info('PLC created successfully', {
        plcId: plc.id,
        userId,
        make: plc.make,
      });

      return { success: true, data: plc };
    } catch (error) {
      this.logger.error('Error creating PLC', { error, data, userId });
      return { success: false, error: 'Failed to create PLC' };
    }
  }
}
```

## Testing Standards

### Unit Testing Patterns

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
      create: jest.fn(),
      // ... other methods
    } as jest.Mocked<IPlcRepository>;

    mockAuditService = {
      log: jest.fn(),
    } as jest.Mocked<IAuditService>;

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

### React Component Testing

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

## Performance Optimization

### Efficient Data Handling for Large Datasets

Optimize for handling 10,000+ PLCs:

```typescript
// Virtualization for large lists
interface PlcListProps {
  plcs: PLCRecord[];
  itemHeight: number;
}

const VirtualizedPlcList: React.FC<PlcListProps> = ({ plcs, itemHeight }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    plcs.length
  );

  const visiblePlcs = plcs.slice(visibleStart, visibleEnd);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: plcs.length * itemHeight, position: 'relative' }}>
        {visiblePlcs.map((plc, index) => (
          <div
            key={plc.id}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            <PlcCard plc={plc} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Memoization Strategies

```typescript
// Expensive calculations for PLC health metrics
const calculatePlcHealthMetrics = useMemo(() => {
  return plcs.reduce(
    (metrics, plc) => {
      const health = calculatePlcHealthScore(plc.uptime, plc.errorCount, plc.lastResponseTime);

      return {
        ...metrics,
        [plc.id]: health,
        averageHealth: (metrics.averageHealth * metrics.count + health) / (metrics.count + 1),
        count: metrics.count + 1,
      };
    },
    { averageHealth: 0, count: 0 }
  );
}, [plcs]);

// Memoized filter functions
const filteredPlcs = useMemo(() => {
  return plcs.filter(plc => {
    const matchesSite = !filters.site || plc.location.siteName === filters.site;
    const matchesStatus = !filters.status || plc.status === filters.status;
    const matchesTags = !filters.tags?.length || filters.tags.some(tag => plc.tags.includes(tag));

    return matchesSite && matchesStatus && matchesTags;
  });
}, [plcs, filters.site, filters.status, filters.tags]);
```

## Security Practices

### Input Sanitization

Always sanitize inputs for industrial environments:

```typescript
import DOMPurify from 'dompurify';
import { escape } from 'html-escaper';

// Sanitize user inputs
const sanitizePlcDescription = (description: string): string => {
  // Remove any HTML tags and encode special characters
  const cleaned = DOMPurify.sanitize(description, { ALLOWED_TAGS: [] });
  return escape(cleaned).substring(0, 255); // Limit length
};

// Validate IP addresses
const isValidPlcIpAddress = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

// Rate limiting for API endpoints
const createPlcRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many PLC creation requests',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Audit Logging for Compliance

Implement comprehensive audit trails:

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  entityType: 'plc' | 'user' | 'system';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

class AuditService {
  async logPlcChange(
    action: 'create' | 'update' | 'delete',
    plcId: string,
    userId: string,
    oldValues?: Partial<PLCRecord>,
    newValues?: Partial<PLCRecord>,
    request?: Request
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: generateId(),
      timestamp: new Date(),
      userId,
      action: `plc.${action}`,
      entityType: 'plc',
      entityId: plcId,
      oldValues,
      newValues,
      ipAddress: request?.ip || 'unknown',
      userAgent: request?.headers['user-agent'] || 'unknown',
    };

    await this.repository.createAuditLog(auditEntry);

    // Also log to Winston for external monitoring
    logger.info('PLC audit event', {
      auditId: auditEntry.id,
      action: auditEntry.action,
      entityId: auditEntry.entityId,
      userId: auditEntry.userId,
    });
  }
}
```

## Monorepo Conventions

### Workspace-Specific Types

Organize types across workspaces:

```typescript
// packages/shared-types/src/plc.ts
export interface PLCRecord {
  // Core PLC interface
}

export type PLCFilters = {
  // Filter types
};

// apps/api/src/types/api.ts
import type { PLCRecord } from '@shared-types/plc';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export type PlcApiResponse = ApiResponse<PLCRecord[]>;
```

### Path Mapping

Leverage consistent path mapping:

```typescript
// tsconfig.json paths configuration enables clean imports
import { PLCRecord } from '@shared-types/plc';
import { ApiResponse } from '@/types/api';
import { PlcService } from '@/services/PlcService';
import { CONFIG } from '@config/database';
```

## Industrial Context Considerations

### Offline-First Architecture

Design for air-gapped environments:

```typescript
// Service worker for offline functionality
class OfflinePlcService {
  private localCache = new Map<string, PLCRecord>();

  async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    try {
      // Sync pending changes
      const pendingChanges = await this.getPendingChanges();
      for (const change of pendingChanges) {
        await this.syncChange(change);
      }

      // Update local cache
      const latestData = await this.fetchLatestData();
      this.updateLocalCache(latestData);
    } catch (error) {
      logger.error('Sync failed', { error });
    }
  }
}
```

### Industrial Data Validation

Implement domain-specific validation:

```typescript
// Industrial equipment validation rules
const validateIndustrialIP = (ip: string): boolean => {
  // Industrial networks typically use specific IP ranges
  const industrialRanges = [
    /^192\.168\.[0-9]{1,3}\.[0-9]{1,3}$/, // Standard private
    /^10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/, // Class A private
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}$/, // Class B private
  ];

  return industrialRanges.some(range => range.test(ip));
};

const validatePlcTags = (tags: string[]): boolean => {
  // Industrial tag naming conventions
  const tagPattern = /^[A-Z][A-Z0-9_]*$/; // Uppercase, alphanumeric, underscores
  return tags.every(tag => tagPattern.test(tag) && tag.length <= 32);
};
```

### Performance for Industrial Scale

Optimize for industrial data volumes:

```typescript
// Batch operations for efficiency
class BatchPlcOperations {
  async bulkUpdateStatus(updates: Array<{ id: string; status: EquipmentStatus }>): Promise<Result<void, string>> {
    const batchSize = 100;
    const batches = chunk(updates, batchSize);

    try {
      await Promise.all(batches.map(batch => this.processBatch(batch)));

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: 'Batch update failed' };
    }
  }

  private async processBatch(batch: Array<{ id: string; status: EquipmentStatus }>): Promise<void> {
    const query = `
      UPDATE plc_records
      SET status = CASE id
        ${batch.map((_, i) => `WHEN $${i * 2 + 1} THEN $${i * 2 + 2}`).join(' ')}
      END,
      updated_at = NOW()
      WHERE id IN (${batch.map((_, i) => `$${i * 2 + 1}`).join(', ')})
    `;

    const params = batch.flatMap(item => [item.id, item.status]);
    await this.db.query(query, params);
  }
}
```

## Code Quality Checklist

Before committing code, ensure:

- [ ] All functions have explicit return types
- [ ] No `any` types without justification
- [ ] Error cases are handled with Result types
- [ ] Industrial domain terms are used consistently
- [ ] Performance implications considered for 10,000+ records
- [ ] Security validations in place for user inputs
- [ ] Audit logging implemented for data changes
- [ ] Tests written for critical business logic
- [ ] Documentation updated for public APIs
- [ ] ESLint and Prettier rules followed

## Tools Integration

This document aligns with our existing toolchain:

- **ESLint Configuration**: Rules in `config/.eslintrc.cjs`
- **TypeScript**: Strict configuration in `config/tsconfig.json`
- **Testing**: Jest + RTL patterns as established
- **Validation**: Zod schemas complement Joi validation
- **Logging**: Winston integration for audit trails

## Further Reading

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Best Practices](https://react-typescript-cheatsheet.netlify.app/)
- [Industrial IoT Security Guidelines](https://www.nist.gov/itl/applied-cybersecurity/ics)
- [Our Architecture Documentation](./architecture/index.md)
- [Frontend Specification](./front-end-spec.md)
