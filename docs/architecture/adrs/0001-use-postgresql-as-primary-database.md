# ADR-0001: Use PostgreSQL as Primary Database

## Status

**Status:** Accepted  
**Date:** 2025-01-24  
**Supersedes:** N/A  
**Superseded by:** N/A  

## Context

The Industrial Inventory Multi-App Framework requires a robust, reliable database system that can:

1. **Handle Industrial Workloads**: Support complex queries for equipment data, relationships, and reporting
2. **Air-Gap Compatibility**: Function in isolated industrial networks without external dependencies
3. **Data Integrity**: Provide ACID compliance for critical inventory and audit data
4. **Performance**: Support <100ms query response times for datasets up to 10,000+ records
5. **Advanced Features**: Handle JSON data, full-text search, and array operations for PLC tags
6. **Scalability**: Support both current needs and future multi-app expansion

## Decision

We will use **PostgreSQL 16+** as the primary database for the Industrial Inventory Multi-App Framework.

## Rationale

### Technical Advantages

1. **Industrial-Grade Reliability**
   - ACID compliance ensures data consistency critical for industrial applications
   - Proven track record in enterprise and industrial environments
   - Excellent crash recovery and data durability

2. **Performance Characteristics**
   - Advanced query planner and indexing (B-tree, GIN, GiST, Hash)
   - GIN indexes ideal for PLC tag arrays and full-text search
   - Excellent performance for read-heavy workloads typical in industrial dashboards
   - Supports query optimization for complex joins and aggregations

3. **Advanced Data Types**
   - Native JSON/JSONB support for flexible equipment metadata
   - Array types perfect for PLC tags
   - Network address types (INET) for IP address storage
   - UUID support for distributed-friendly primary keys

4. **Air-Gap Compatibility**
   - Self-contained database with no external service dependencies
   - Local installation and management
   - No license fees or connectivity requirements

5. **Extensibility**
   - Rich ecosystem of extensions (though we'll avoid them for simplicity)
   - Custom functions and stored procedures for complex business logic
   - Support for multiple schema patterns (shared + app-specific)

### Comparison with Alternatives

| Feature | PostgreSQL | MySQL | SQLite | MongoDB |
|---------|------------|-------|---------|---------|
| **ACID Compliance** | ✅ Full | ✅ Full (with InnoDB) | ✅ Full | ⚠️ Limited |
| **Complex Queries** | ✅ Excellent | ✅ Good | ✅ Good | ❌ Limited |
| **JSON Support** | ✅ Native JSONB | ⚠️ Basic JSON | ⚠️ JSON functions | ✅ Native |
| **Array Types** | ✅ Native arrays | ❌ No | ❌ No | ✅ Native |
| **Full-text Search** | ✅ Built-in | ✅ Built-in | ✅ FTS5 | ✅ Text indexes |
| **Network Types** | ✅ INET, CIDR | ❌ No | ❌ No | ❌ No |
| **Concurrent Writes** | ✅ MVCC | ⚠️ Row-level | ⚠️ Limited | ✅ Good |
| **Industrial Use** | ✅ Proven | ✅ Common | ❌ Limited | ⚠️ Growing |
| **Air-gap Friendly** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Operational Complexity** | ⚠️ Medium | ⚠️ Medium | ✅ Low | ⚠️ Medium |

### Specific Industrial Requirements

1. **Audit Logging**: PostgreSQL's JSONB and timestamp handling excel at audit trail storage
2. **Equipment Relationships**: Advanced JOIN capabilities for complex equipment hierarchies
3. **PLC Tag Management**: Native array support with GIN indexing for efficient tag queries
4. **Reporting**: Excellent window functions and aggregation for industrial dashboards
5. **Data Validation**: Rich constraint system ensures data quality

## Implementation Plan

### Phase 1: Foundation Setup

- Configure PostgreSQL 16+ with optimized settings for industrial workloads
- Set up connection pooling with appropriate limits
- Configure backup and recovery procedures

### Phase 2: Schema Design

- Implement shared foundation tables (users, roles, audit_logs)
- Create PLC inventory schema with proper indexing
- Set up audit triggers for compliance tracking

### Phase 3: Performance Optimization

- Configure GIN indexes for array fields
- Set up query performance monitoring
- Implement connection pooling optimization

### Database Configuration

```sql
-- Example optimization settings for industrial workloads
-- postgresql.conf adjustments

# Memory settings (adjust based on available RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100
max_prepared_transactions = 20

# Logging for monitoring
log_min_duration_statement = 1000  # Log slow queries
log_checkpoints = on
log_connections = on

# Performance settings
checkpoint_completion_target = 0.7
wal_buffers = 16MB
```

## Consequences

### Positive Consequences

1. **Reliability**: Rock-solid foundation for critical industrial data
2. **Performance**: Excellent query performance with proper indexing
3. **Feature Rich**: Advanced data types reduce application complexity
4. **Standards Compliant**: SQL standard compliance aids development
5. **Ecosystem**: Large community and extensive documentation
6. **Future-Proof**: Supports advanced features for future application needs

### Negative Consequences

1. **Operational Complexity**: Requires PostgreSQL administration knowledge
2. **Resource Usage**: Higher memory and CPU requirements than SQLite
3. **Setup Complexity**: More complex initial setup than embedded databases
4. **Backup Complexity**: Requires proper backup strategy implementation

### Risk Mitigation

1. **Training**: Document PostgreSQL administration procedures
2. **Monitoring**: Implement comprehensive database monitoring
3. **Backup Strategy**: Automated backup with tested recovery procedures
4. **Performance Monitoring**: Regular query performance analysis
5. **Connection Management**: Proper connection pooling to prevent resource exhaustion

## Monitoring and Success Metrics

### Performance Metrics

- Query response time: Target <100ms for 95% of queries
- Connection utilization: <80% of max_connections
- Cache hit ratio: >95%
- Index usage: Monitor unused indexes

### Operational Metrics

- Database uptime: >99.9%
- Backup success rate: 100%
- Recovery time objective: <1 hour
- Data integrity: Zero corruption incidents

## Review and Evolution

This decision will be reviewed:

- After Epic 1 completion (initial implementation)
- When reaching 1,000+ PLC records (performance validation)
- Annually or when performance issues arise
- When adding new applications to the framework

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Industrial Database Design Patterns](https://www.postgresql.org/docs/current/tutorial-concepts.html)
- [TypeORM PostgreSQL Guide](https://typeorm.io/connection-options#postgres--cockroachdb-connection-options)

## Related ADRs

- ADR-0002: Use TypeORM for Database Access Layer
- ADR-0003: Implement Multi-Schema Pattern for Multi-App Support
- ADR-0004: Use UUID Primary Keys for Distributed Compatibility
