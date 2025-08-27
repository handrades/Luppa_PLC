# Performance Architecture & Optimization Strategy

## Database Performance Strategy for <100ms Queries with 10,000+ Records

### Indexing Strategy

**Query Performance Requirements:** All equipment queries must execute in <100ms with datasets up to 10,000+ records.

**Critical Indexes for Performance:**

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_plcs_search_composite ON plcs(equipment_id, make, model, ip_address)
WHERE ip_address IS NOT NULL;

-- Partial indexes for filtered queries
CREATE INDEX idx_plcs_active_equipment ON plcs(equipment_id)
WHERE equipment_id IS NOT NULL;

-- Full-text search optimization
CREATE INDEX idx_plcs_fulltext ON plcs USING gin(to_tsvector('english',
  description || ' ' || make || ' ' || model || ' ' || COALESCE(tag_id, '')));

-- Site hierarchy navigation optimization
CREATE INDEX idx_hierarchy_path ON equipment(cell_id)
INCLUDE (id, name, equipment_type, created_at);

-- Audit performance optimization
CREATE INDEX idx_audit_logs_performance ON audit_logs(table_name, timestamp DESC)
WHERE risk_level IN ('HIGH', 'CRITICAL');
```

### Connection Pool Optimization

```typescript
// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  type: 'postgres' as const,

  // Performance optimization settings
  pool: {
    min: 2, // Minimum connections
    max: 10, // Maximum connections for industrial workload
    acquireTimeoutMillis: 60000, // Connection timeout
    idleTimeoutMillis: 30000, // Idle connection timeout
  },

  // Query optimization
  extra: {
    max: 10, // pg pool option for maximum connections
    statement_timeout: 30000, // 30 seconds in milliseconds
    lock_timeout: 10000, // 10 seconds in milliseconds
    idle_in_transaction_session_timeout: 300000, // 5 minutes in milliseconds
  },

  // Enable query logging for performance monitoring
  logging: process.env.NODE_ENV === 'development' ? 'all' : ['error', 'warn'],
};
```

### Query Optimization Patterns

```typescript
// Optimized PLC search with hierarchy
export class PLCService {
  async searchPLCsOptimized(filters: PLCSearchFilters): Promise<PLCWithHierarchy[]> {
    const queryBuilder = this.plcRepository
      .createQueryBuilder('plc')
      .leftJoinAndSelect('plc.equipment', 'equipment')
      .leftJoinAndSelect('equipment.cell', 'cell')
      .leftJoinAndSelect('cell.site', 'site')
      .select([
        'plc.id',
        'plc.tagId',
        'plc.description',
        'plc.make',
        'plc.model',
        'plc.ipAddress',
        'equipment.id',
        'equipment.name',
        'equipment.equipmentType',
        'cell.id',
        'cell.name',
        'cell.lineNumber',
        'site.id',
        'site.name',
      ]);

    // Apply filters with optimized WHERE conditions
    if (filters.siteId) {
      queryBuilder.andWhere('site.id = :siteId', { siteId: filters.siteId });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        `to_tsvector('english', 
          COALESCE(plc.tag_id, '') || ' ' || 
          COALESCE(plc.description, '') || ' ' || 
          COALESCE(plc.make, '') || ' ' || 
          COALESCE(plc.model, '')) 
         @@ plainto_tsquery('english', :search)`,
        { search: filters.search }
      );
    }

    // Pagination for performance
    queryBuilder
      .limit(filters.limit || 50)
      .offset(filters.offset || 0)
      .orderBy('site.name', 'ASC')
      .addOrderBy('cell.lineNumber', 'ASC')
      .addOrderBy('plc.tagId', 'ASC');

    return queryBuilder.getMany();
  }
}
```

## Caching Architecture

### Redis Caching Strategy

```typescript
// Cache configuration for optimal performance
export class CacheService {
  private redis: RedisClientType;

  constructor() {
    this.redis = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },

      // Performance settings
      connectTimeout: 5000,
      commandTimeout: 3000,
      retryDelayOnFailover: 100,
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3,
    });
  }

  // Equipment search results caching
  async cacheSearchResults(key: string, results: any[], ttl: number = 300): Promise<void> {
    await this.redis.setEx(key, ttl, JSON.stringify(results));
  }

  // Hierarchy data caching with longer TTL
  async cacheHierarchy(hierarchy: any[], ttl: number = 1800): Promise<void> {
    await this.redis.setEx('hierarchy:full', ttl, JSON.stringify(hierarchy));
  }

  // Invalidation strategy for data consistency
  async invalidateEquipmentCache(equipmentId: string): Promise<void> {
    const pattern = `search:*equipment:${equipmentId}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}
```

### Application-Level Caching

```typescript
// React Query configuration for frontend caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes stale time
      cacheTime: 10 * 60 * 1000, // 10 minutes cache time
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network mode for air-gapped environments
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// Custom hooks with optimized caching
export const usePLCSearch = (filters: PLCFilters) => {
  return useQuery({
    queryKey: ['plcs', 'search', filters],
    queryFn: () => plcService.searchPLCs(filters),
    enabled: Boolean(Object.keys(filters).length),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    select: useCallback(data => {
      // Transform data for UI optimization
      return data.map(plc => ({
        ...plc,
        displayName: `${plc.tagId} - ${plc.description}`,
        hierarchyPath: `${plc.site.name} > ${plc.cell.name} > ${plc.equipment.name}`,
      }));
    }, []),
  });
};
```

## Frontend Performance Optimization

### Virtual Scrolling Implementation

```typescript
// High-performance data grid with virtual scrolling
export const IndustrialDataGrid: React.FC<DataGridProps> = ({
  data,
  columns,
  onRowClick,
  height = 600
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling with react-window
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Row height in pixels
    overscan: 10, // Render 10 rows outside viewport
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index) => columns[index].width || 150, [columns]),
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className="data-grid-container"
      style={{ height, overflow: 'auto' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <DataGridRow
              data={data[virtualRow.index]}
              columns={columns}
              virtualColumns={columnVirtualizer.getVirtualItems()}
              onClick={() => onRowClick?.(data[virtualRow.index])}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### State Management Optimization

```typescript
// Optimized Zustand store with selectors
export const usePLCStore = create<PLCState>((set, get) => ({
  plcs: [],
  filteredPLCs: [],
  filters: {},
  isLoading: false,

  // Optimized actions
  setFilters: newFilters => {
    set(state => {
      const filters = { ...state.filters, ...newFilters };
      return {
        filters,
        filteredPLCs: applyFilters(state.plcs, filters),
      };
    });
  },

  // Bulk operations for performance
  updatePLCs: plcs => {
    set(state => ({
      plcs,
      filteredPLCs: applyFilters(plcs, state.filters),
    }));
  },
}));

// Selector hooks for optimal re-renders
export const usePLCSelectors = () => ({
  plcCount: usePLCStore(state => state.filteredPLCs.length),
  isLoading: usePLCStore(state => state.isLoading),
  hasData: usePLCStore(state => state.filteredPLCs.length > 0),
});
```
