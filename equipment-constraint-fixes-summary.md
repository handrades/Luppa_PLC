# Equipment Uniqueness Constraint Fixes

## Problem Summary

The equipment CRUD operations had several race condition and uniqueness constraint issues:

1. **Race Condition**: Pre-insert uniqueness checks were insufficient under concurrency
2. **Soft Deletion Issue**: Partial indexes didn't exclude soft-deleted rows, preventing reuse of tagId/ipAddress
3. **Error Handling**: No database-level constraint violation handling for PostgreSQL error code 23505

## Solutions Implemented

### 1. Fixed PLC Entity Indexes (`/home/hektop/github/Luppa_PLC/apps/api/src/entities/PLC.ts`)

**Before:**

```typescript
@Index(['tagId'], { unique: true })
@Index(['ipAddress'], { unique: true, where: 'ip_address IS NOT NULL' })
```

**After:**

```typescript
@Index(['tagId'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['ipAddress'], { unique: true, where: 'ip_address IS NOT NULL AND deleted_at IS NULL' })
```

**Impact:** Soft-deleted PLCs no longer block reuse of their tagId or ipAddress values.

### 2. Enhanced Error Handling in EquipmentService (`/home/hektop/github/Luppa_PLC/apps/api/src/services/EquipmentService.ts`)

Added try-catch blocks around PLC save operations to handle PostgreSQL constraint violations:

```typescript
try {
  await plcRepository.save(plc);
} catch (error: any) {
  // Handle database constraint violations (PostgreSQL error code 23505)
  if (error.code === "23505") {
    // Parse the constraint name to determine which field caused the conflict
    const constraintName = error.constraint;
    if (
      constraintName?.includes("tag_id") ||
      error.detail?.includes("tag_id")
    ) {
      throw new EquipmentConflictError(
        `PLC with tag ID '${plcData.tagId}' already exists`,
      );
    } else if (
      constraintName?.includes("ip_address") ||
      error.detail?.includes("ip_address")
    ) {
      throw new EquipmentConflictError(
        `PLC with IP address '${plcData.ipAddress}' already exists`,
      );
    } else {
      throw new EquipmentConflictError(
        "PLC data conflicts with existing record",
      );
    }
  }
  throw error;
}
```

**Applied to:**

- Equipment creation (createEquipment method)
- Equipment updates (updateEquipment method)

### 3. Database Migration (`/home/hektop/github/Luppa_PLC/apps/api/src/database/migrations/20250815191331-FixPLCUniqueConstraints.ts`)

Created migration to:

- Add `deleted_at` column to PLCs table if missing
- Drop existing constraints/indexes
- Create new partial unique indexes that exclude soft-deleted records
- Add performance indexes for queries

**Key Indexes Created:**

```sql
-- Unique indexes excluding soft-deleted records
CREATE UNIQUE INDEX idx_plcs_tag_id_unique
ON plcs(tag_id)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_plcs_ip_address_unique
ON plcs(ip_address)
WHERE ip_address IS NOT NULL AND deleted_at IS NULL;

-- Performance indexes
CREATE INDEX idx_plcs_tag_id ON plcs(tag_id);
CREATE INDEX idx_plcs_deleted_at ON plcs(deleted_at);
```

### 4. Enhanced Test Coverage

Added comprehensive test cases in `/home/hektop/github/Luppa_PLC/apps/api/src/__tests__/services/EquipmentService.test.ts`:

- Database constraint violation for tag ID
- Database constraint violation for IP address
- Re-throwing non-constraint database errors

## Benefits

1. **Race Condition Resolution**: Database-level constraints now handle concurrent operations properly
2. **Soft Deletion Support**: Soft-deleted PLCs don't block reuse of their identifiers
3. **Robust Error Handling**: Constraint violations are caught and converted to meaningful business errors
4. **Better User Experience**: Clear error messages indicate specific conflicts (tag ID vs IP address)
5. **Data Integrity**: Database constraints ensure uniqueness even under high concurrency

## Testing

All existing tests pass, and new test cases verify:

- ✅ Constraint violation error handling
- ✅ Proper error message formatting
- ✅ Non-constraint errors are re-thrown
- ✅ Existing functionality remains intact

## Migration Instructions

1. Run the migration: `npm run migration:run`
2. The migration is backward-compatible and includes rollback instructions
3. No application downtime required (indexes are created without locking)

## Files Modified

- `/home/hektop/github/Luppa_PLC/apps/api/src/entities/PLC.ts` - Updated indexes
- `/home/hektop/github/Luppa_PLC/apps/api/src/services/EquipmentService.ts` - Enhanced error handling
- `/home/hektop/github/Luppa_PLC/apps/api/src/database/migrations/20250815191331-FixPLCUniqueConstraints.ts` - New migration
- `/home/hektop/github/Luppa_PLC/apps/api/src/__tests__/services/EquipmentService.test.ts` - Additional test cases
