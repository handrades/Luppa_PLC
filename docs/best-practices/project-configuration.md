# Project Configuration

## Strict TypeScript Configuration

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
