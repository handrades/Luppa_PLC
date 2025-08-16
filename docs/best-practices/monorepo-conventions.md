# Monorepo Conventions

## Workspace-Specific Types

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

## Path Mapping

Leverage consistent path mapping:

```typescript
// tsconfig.json paths configuration enables clean imports
import { PLCRecord } from '@shared-types/plc';
import { ApiResponse } from '@/types/api';
import { PlcService } from '@/services/PlcService';
import { CONFIG } from '@config/database';
```
