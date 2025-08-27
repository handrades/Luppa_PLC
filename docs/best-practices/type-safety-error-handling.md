# Type Safety & Error Handling

## Strong Typing for Domain Models

Create comprehensive type definitions for your industrial domain:

```typescript
// Domain-specific types
type PlcMake =
  | "Allen-Bradley"
  | "Siemens"
  | "Schneider"
  | "Omron"
  | "Mitsubishi";
type CellType =
  | "Production"
  | "Quality"
  | "Packaging"
  | "Shipping"
  | "Maintenance";
type EquipmentStatus =
  | "Running"
  | "Stopped"
  | "Alarm"
  | "Maintenance"
  | "Unknown";

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

## Error Handling Patterns

Use discriminated unions for error handling:

```typescript
// Result pattern for error handling
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Service layer example
class PlcService {
  async findById(
    id: string,
  ): Promise<Result<PLCRecord, "NOT_FOUND" | "DATABASE_ERROR">> {
    try {
      const plc = await this.repository.findById(id);
      if (!plc) {
        return { success: false, error: "NOT_FOUND" };
      }
      return { success: true, data: plc };
    } catch (error) {
      logger.error("Database error finding PLC", { id, error });
      return { success: false, error: "DATABASE_ERROR" };
    }
  }
}

// Usage with type-safe error handling
const result = await plcService.findById("plc-123");
if (!result.success) {
  switch (result.error) {
    case "NOT_FOUND":
      return res.status(404).json({ message: "PLC not found" });
    case "DATABASE_ERROR":
      return res.status(500).json({ message: "Internal server error" });
  }
}

// TypeScript knows result.data is PLCRecord here
const plc = result.data;
```

## Input Validation with Zod

Leverage Zod for runtime type validation (aligns with our Joi usage):

```typescript
import { z } from "zod";

const PlcCreateSchema = z.object({
  description: z.string().min(1).max(255),
  make: z.enum([
    "Allen-Bradley",
    "Siemens",
    "Schneider",
    "Omron",
    "Mitsubishi",
  ]),
  model: z.string().min(1).max(100),
  ip: z.string().ip().nullable(),
  tags: z.array(z.string()).max(50),
  location: z.object({
    siteName: z.string().min(1),
    cellType: z.enum([
      "Production",
      "Quality",
      "Packaging",
      "Shipping",
      "Maintenance",
    ]),
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
      message: "Validation error",
      errors: validation.error.format(),
    });
  }

  // validation.data is properly typed as PlcCreateInput
  const plc = await plcService.create(validation.data);
  res.status(201).json(plc);
};
```
