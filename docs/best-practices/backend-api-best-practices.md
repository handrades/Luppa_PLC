# Backend API Best Practices

## Repository Pattern

Implement clean repository patterns:

```typescript
interface IPlcRepository {
  findById(id: string): Promise<PLCRecord | null>;
  findByFilters(filters: PlcQueryOptions): Promise<PLCRecord[]>;
  findByIp(ip: string): Promise<PLCRecord | null>;
  create(data: PlcCreateInput): Promise<PLCRecord>;
  update(id: string, data: Partial<PlcCreateInput>): Promise<PLCRecord>;
  softDelete(id: string): Promise<void>;
  countByFilters(filters: PlcQueryOptions): Promise<number>;
}

class PlcRepository implements IPlcRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<PLCRecord | null> {
    const query = `
      SELECT p.*
      FROM plc_records p
      LEFT JOIN plc_locations l ON p.id = l.plc_id AND l.deleted_at IS NULL
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;

    const result = await this.db.query<PLCRecord>(query, [id]);
    return result.rows[0] || null;
  }

  async findByIp(ip: string): Promise<PLCRecord | null> {
    const query = `
      SELECT p.*
      FROM plc_records p
      WHERE p.ip_address = $1 AND p.deleted_at IS NULL
    `;

    const result = await this.db.query<PLCRecord>(query, [ip]);
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
    private logger: ILogger,
  ) {}

  async createPlc(
    data: PlcCreateInput,
    userId: string,
  ): Promise<Result<PLCRecord, string>> {
    try {
      // Business logic validation
      if (data.ip && (await this.repository.findByIp(data.ip))) {
        return { success: false, error: "IP address already in use" };
      }

      // Create the PLC
      const plc = await this.repository.create(data);

      // Best-effort audit logging for compliance (does not fail the operation)
      try {
        await this.auditService.log({
          action: "plc.created",
          entityType: "plc",
          entityId: plc.id,
          userId,
          details: { description: plc.description, make: plc.make },
        });
      } catch (auditError) {
        // Log audit failure but continue with successful operation
        this.logger.warn("Audit logging failed for PLC creation", {
          plcId: plc.id,
          userId,
          auditError: auditError.message,
        });
      }

      this.logger.info("PLC created successfully", {
        plcId: plc.id,
        userId,
        make: plc.make,
      });

      return { success: true, data: plc };
    } catch (error) {
      this.logger.error("Error creating PLC", { error, data, userId });
      return { success: false, error: "Failed to create PLC" };
    }
  }
}
```

---
