# ADR-0002: Use TypeORM for Database Access Layer

## Status

**Status:** Accepted  
**Date:** 2025-01-24  
**Supersedes:** N/A  
**Superseded by:** N/A

## Context

The Industrial Inventory Multi-App Framework needs a robust Object-Relational Mapping (ORM) solution that can:

1. **Type Safety**: Provide TypeScript-first development with compile-time type checking
2. **Database Abstraction**: Abstract database operations while allowing raw SQL when needed
3. **Migration Management**: Handle schema evolution and database migrations systematically
4. **Multi-App Support**: Support multiple applications with shared and isolated schemas
5. **Performance**: Allow optimization for industrial workloads without sacrificing developer experience
6. **Enterprise Features**: Support transactions, connection pooling, and advanced PostgreSQL features

## Decision

We will use **TypeORM 0.3+** as the primary database access layer and ORM for the Industrial Inventory Multi-App Framework.

## Rationale

### Technical Advantages

1. **TypeScript-First Design**
   - Native TypeScript support with decorators for entity definition
   - Compile-time type checking for queries and entity properties
   - Excellent IDE support with auto-completion and refactoring
   - Type-safe query builder with strong typing

2. **Advanced PostgreSQL Integration**
   - Full support for PostgreSQL-specific features (JSONB, arrays, custom types)
   - Native enum support matching TypeScript enums
   - Advanced indexing options (GIN, GiST, partial indexes)
   - Support for PostgreSQL functions and custom operators

3. **Enterprise-Grade Features**
   - Comprehensive transaction support with isolation levels
   - Connection pooling with configurable options
   - Database replication support for read scaling
   - Query caching and performance optimization features

4. **Migration and Schema Management**
   - Robust migration system with version control
   - Schema synchronization for development
   - Supports both code-first and database-first approaches
   - Rollback capabilities and migration validation

### Comparison with Alternatives

| Feature                 | TypeORM      | Prisma       | Sequelize  | Knex.js      | Raw SQL    |
| ----------------------- | ------------ | ------------ | ---------- | ------------ | ---------- |
| **TypeScript Support**  | ✅ Native    | ✅ Excellent | ⚠️ Good    | ⚠️ Basic     | ❌ Manual  |
| **PostgreSQL Features** | ✅ Excellent | ✅ Good      | ⚠️ Limited | ✅ Full      | ✅ Full    |
| **Migration System**    | ✅ Robust    | ✅ Good      | ✅ Good    | ✅ Excellent | ❌ Manual  |
| **Performance**         | ✅ Good      | ✅ Excellent | ⚠️ Medium  | ✅ Excellent | ✅ Maximum |
| **Learning Curve**      | ⚠️ Medium    | ✅ Easy      | ⚠️ Medium  | ⚠️ Steep     | ⚠️ High    |
| **Ecosystem**           | ✅ Mature    | ⚠️ Growing   | ✅ Mature  | ✅ Mature    | ✅ Native  |
| **Raw Query Support**   | ✅ Yes       | ⚠️ Limited   | ✅ Yes     | ✅ Yes       | ✅ Native  |
| **Decorators**          | ✅ Yes       | ❌ No        | ❌ No      | ❌ No        | ❌ No      |
| **Multi-DB Support**    | ✅ Yes       | ✅ Yes       | ✅ Yes     | ✅ Yes       | ❌ No      |

### Industrial Requirements Alignment

1. **Data Integrity**: Strong typing prevents data corruption at compile time
2. **Audit Trails**: Subscribers/listeners for automatic audit log generation
3. **Complex Relationships**: Advanced relationship mapping for equipment hierarchies
4. **Performance Monitoring**: Built-in query logging and performance metrics
5. **Multi-Tenancy**: Support for multiple schemas and database connections

## Implementation Plan

### Phase 1: Core Setup

```typescript
// Entity example for PLC inventory
@Entity("plcs")
export class PlcEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  description: string;

  @Column({ type: "varchar", length: 100 })
  make: string;

  @Column({ type: "inet", nullable: true })
  @Index({ unique: true, where: "ip_address IS NOT NULL" })
  ipAddress?: string;

  @Column("text", { array: true, default: [] })
  @Index("idx_plcs_tags", { using: "gin" })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Phase 2: Advanced Features

```typescript
// Repository pattern for business logic
@Injectable()
export class PlcRepository extends Repository<PlcEntity> {
  async findByTags(tags: string[]): Promise<PlcEntity[]> {
    return this.createQueryBuilder("plc")
      .where("plc.tags && :tags", { tags })
      .getMany();
  }

  async getInventoryStats(): Promise<InventoryStats> {
    return this.createQueryBuilder("plc")
      .select("COUNT(*)", "total")
      .addSelect("COUNT(CASE WHEN status = :online THEN 1 END)", "online")
      .setParameter("online", PlcStatus.ONLINE)
      .getRawOne();
  }
}
```

### Phase 3: Performance Optimization

```typescript
// Connection configuration for industrial workloads
const dataSource = new DataSource({
  type: "postgres",
  // ... connection details
  extra: {
    max: 20, // Maximum connections
    min: 5, // Minimum connections
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
  },
  cache: {
    type: "redis", // Optional Redis caching
    options: {
      host: "localhost",
      port: 6379,
    },
  },
  logging: ["query", "error", "warn"],
  logger: "advanced-console",
});
```

## Database Schema Patterns

### Shared Foundation Pattern

```typescript
// Base entity with common audit fields
export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "uuid", nullable: true })
  createdBy?: string;

  @Column({ type: "uuid", nullable: true })
  updatedBy?: string;
}

// Audit subscriber for automatic logging
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  afterInsert(event: InsertEvent<any>) {
    // Create audit log entry
  }

  afterUpdate(event: UpdateEvent<any>) {
    // Create audit log entry with changes
  }
}
```

### Multi-App Schema Support

```typescript
// App-specific entities can use different schemas
@Entity("inventory_plcs", { schema: "inventory" })
export class PlcEntity extends BaseEntity {
  // PLC-specific fields
}

@Entity("maintenance_schedules", { schema: "maintenance" })
export class MaintenanceEntity extends BaseEntity {
  // Maintenance-specific fields
}
```

## Migration Strategy

### Development Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- -n AddPlcTags

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Production Deployment

```typescript
// Migration with data transformation
export class AddPlcTags1642680000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE plcs 
      ADD COLUMN tags text[] DEFAULT '{}'
    `);

    // Create GIN index for array operations
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY idx_plcs_tags 
      ON plcs USING gin(tags)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_plcs_tags`);
    await queryRunner.query(`ALTER TABLE plcs DROP COLUMN tags`);
  }
}
```

## Consequences

### Positive Consequences

1. **Type Safety**: Compile-time error detection prevents runtime database errors
2. **Developer Productivity**: Rich TypeScript integration and IDE support
3. **Maintainability**: Clear entity definitions serve as living documentation
4. **Performance**: Query builder optimization and caching support
5. **Feature Rich**: Advanced PostgreSQL features accessible through TypeScript
6. **Migration Safety**: Robust migration system with rollback capabilities

### Negative Consequences

1. **Learning Curve**: Developers need to understand ORM concepts and decorators
2. **Performance Overhead**: ORM abstraction adds some performance cost vs raw SQL
3. **Complex Queries**: Some advanced SQL queries may be difficult to express
4. **Bundle Size**: Adds significant runtime dependencies
5. **Magic Behavior**: Decorator-based configuration can be less explicit

### Risk Mitigation

1. **Training**: Comprehensive TypeORM documentation and examples
2. **Performance Monitoring**: Regular query performance analysis and optimization
3. **Escape Hatches**: Use raw SQL for complex queries when needed
4. **Testing**: Comprehensive database layer testing with test containers
5. **Code Reviews**: Focus on entity design and query optimization

## Performance Considerations

### Query Optimization

```typescript
// Use query builder for complex queries
const results = await this.plcRepository
  .createQueryBuilder("plc")
  .leftJoinAndSelect("plc.site", "site")
  .where("plc.status = :status", { status: "online" })
  .andWhere("plc.tags && :tags", { tags: ["critical"] })
  .orderBy("plc.lastSeen", "DESC")
  .take(50)
  .getMany();

// Use raw SQL for performance-critical queries
const stats = await this.dataSource.query(`
  SELECT 
    make,
    COUNT(*) as count,
    AVG(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as uptime_ratio
  FROM plcs 
  GROUP BY make
  ORDER BY count DESC
`);
```

### Connection Management

```typescript
// Use transactions for data consistency
await this.dataSource.transaction(async (manager) => {
  const plc = await manager.save(PlcEntity, plcData);
  await manager.save(AuditLogEntity, {
    action: "CREATE",
    entityId: plc.id,
    changes: plcData,
  });
});
```

## Monitoring and Success Metrics

### Performance Metrics

- Query execution time: <100ms for 95% of queries
- Connection pool utilization: <80%
- Cache hit ratio: >90%
- Migration execution time: <5 minutes

### Developer Experience Metrics

- Build time impact: <10% increase
- Type error detection: >95% of data access bugs caught at compile time
- Code review feedback: Reduced data access related issues

## Review and Evolution

This decision will be reviewed:

- After Epic 1 completion (initial implementation feedback)
- When performance issues arise that can't be resolved with optimization
- When TypeORM major version updates are released
- When new database access patterns emerge that TypeORM can't support

## References

- [TypeORM Documentation](https://typeorm.io/)
- [TypeORM PostgreSQL Guide](https://typeorm.io/connection-options#postgres--cockroachdb-connection-options)
- [Industrial Database Patterns](https://martinfowler.com/eaaCatalog/)
- [PostgreSQL Performance with ORMs](https://use-the-index-luke.com/)

## Related ADRs

- ADR-0001: Use PostgreSQL as Primary Database
- ADR-0003: Implement Multi-Schema Pattern for Multi-App Support
- ADR-0005: Use Repository Pattern for Data Access Abstraction
