# Code Structure & Readability

## Meaningful Naming Conventions

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

## Function Design

Keep functions small and focused (5-10 lines ideal for pure functions):

```typescript
// ✅ Good - Single responsibility, pure function
const calculatePlcHealthScore = (
  uptime: number,
  errorCount: number,
  lastResponseTime: number,
): number => {
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

## Parameter Management

Minimize parameters using configuration objects:

```typescript
// ✅ Good - Configuration object pattern
interface PlcQueryOptions {
  siteFilter?: string;
  cellTypeFilter?: string;
  tags?: string[];
  sortBy?: "description" | "make" | "ip";
  sortOrder?: "asc" | "desc";
  limit?: number;
}

const queryPlcs = async (
  options: PlcQueryOptions = {},
): Promise<PLCRecord[]> => {
  const {
    siteFilter,
    cellTypeFilter,
    tags = [],
    sortBy = "description",
    sortOrder = "asc",
    limit = 100,
  } = options;

  // Implementation
};

// ❌ Bad - Too many parameters
const queryPlcs = (
  site: string,
  cellType: string,
  tags: string[],
  sortBy: string,
  sortOrder: string,
  limit: number,
) => {
  // Implementation
};
```

## Use Modern JavaScript Features

Leverage ES2022+ features in our tech stack:

```typescript
// ✅ Good - Template literals and destructuring
const generatePlcReport = ({
  description,
  make,
  model,
  ip,
}: PLCRecord): string => {
  return `PLC Report:
    Description: ${description}
    Make/Model: ${make} ${model}
    IP Address: ${ip ?? "Not configured"}`;
};

// ✅ Good - Array methods and spread operator
const getActivePlcs = (plcs: PLCRecord[]): PLCRecord[] => {
  return plcs
    .filter((plc) => plc.ip !== null)
    .map((plc) => ({ ...plc, status: "active" }));
};
```
