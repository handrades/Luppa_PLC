# Backend API Best Practices

## Repository Pattern

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

## Service Layer

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
