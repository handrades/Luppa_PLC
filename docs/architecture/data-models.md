# Data Models

## User

**Purpose:** Core authentication and authorization entity for all framework applications

**Key Attributes:**

- id: UUID - Unique identifier using gen_random_uuid()
- email: string - Unique email for authentication
- password_hash: string - bcrypt hashed password
- first_name: string - User's first name
- last_name: string - User's last name
- role_id: UUID - Foreign key to roles table
- is_active: boolean - Account status flag
- last_login: timestamp - Track user activity
- created_at: timestamp - Account creation time
- updated_at: timestamp - Last modification time

### User TypeScript Interface

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### User Relationships

- Has one Role (many-to-one with roles table)
- Has many AuditLogs (one-to-many with audit_logs)
- Has many Notifications (one-to-many with notifications)

## Site

**Purpose:** Top-level organizational unit representing physical locations

**Key Attributes:**

- id: UUID - Unique identifier using gen_random_uuid()
- name: string - Site name (e.g., "Plant-A", "Facility-North")
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification
- created_by: UUID - User who created record
- updated_by: UUID - Last user to modify

### Site TypeScript Interface

```typescript
interface Site {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

### Site Relationships

- Has many Cells (one-to-many with cells)
- Created/Updated by User (many-to-one with users)

## Cell

**Purpose:** Production cells or areas within a site

**Key Attributes:**

- id: UUID - Unique identifier
- site_id: UUID - Foreign key to sites table
- name: string - Cell name (e.g., "Assembly-Line-1")
- line_number: string - Production line identifier
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification
- created_by: UUID - User who created record
- updated_by: UUID - Last user to modify

### Cell TypeScript Interface

```typescript
interface Cell {
  id: string;
  siteId: string;
  name: string;
  lineNumber: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

### Cell Relationships

- Belongs to Site (many-to-one with sites)
- Has many Equipment (one-to-many with equipment)
- Created/Updated by User (many-to-one with users)

## Equipment

**Purpose:** Physical equipment units within a cell

**Key Attributes:**

- id: UUID - Unique identifier
- cell_id: UUID - Foreign key to cells table
- name: string - Equipment name/identifier
- equipment_type: string - Category (PRESS, ROBOT, OVEN, CONVEYOR, ASSEMBLY_TABLE, OTHER)
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification
- created_by: UUID - User who created record
- updated_by: UUID - Last user to modify

### Equipment TypeScript Interface

```typescript
interface Equipment {
  id: string;
  cellId: string;
  name: string;
  equipmentType: EquipmentType;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

enum EquipmentType {
  PRESS = "PRESS",
  ROBOT = "ROBOT",
  OVEN = "OVEN",
  CONVEYOR = "CONVEYOR",
  ASSEMBLY_TABLE = "ASSEMBLY_TABLE",
  OTHER = "OTHER",
}
```

### Equipment Relationships

- Belongs to Cell (many-to-one with cells)
- Has many PLCs (one-to-many with plcs)
- Created/Updated by User (many-to-one with users)

## PLC

**Purpose:** Programmable Logic Controllers and industrial control devices

**Key Attributes:**

- id: UUID - Unique identifier
- equipment_id: UUID - Foreign key to equipment table
- tag_id: string - Unique PLC identifier/tag
- description: string - Human-readable description
- make: string - Manufacturer (Allen-Bradley, Siemens, etc.)
- model: string - Model number
- ip_address: string | null - Network address (unique when present)
- firmware_version: string | null - Current firmware
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification
- created_by: UUID - User who created record
- updated_by: UUID - Last user to modify

### PLC TypeScript Interface

```typescript
interface PLC {
  id: string;
  equipmentId: string;
  tagId: string;
  description: string;
  make: string;
  model: string;
  ipAddress: string | null;
  firmwareVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

### PLC Relationships

- Belongs to Equipment (many-to-one with equipment)
- Has many Tags (one-to-many with tags)
- Created/Updated by User (many-to-one with users)

## Tag

**Purpose:** Data points and I/O tags associated with PLCs

**Key Attributes:**

- id: UUID - Unique identifier
- plc_id: UUID - Foreign key to plcs table
- name: string - Tag name (e.g., "START_BUTTON", "TEMP_SENSOR_1")
- data_type: string - Data type (BOOL, INT, REAL, STRING)
- description: string | null - Tag purpose/description
- address: string | null - Memory address or I/O point
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification
- created_by: UUID - User who created record
- updated_by: UUID - Last user to modify

### Tag TypeScript Interface

```typescript
interface Tag {
  id: string;
  plcId: string;
  name: string;
  dataType: TagDataType;
  description: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

enum TagDataType {
  BOOL = "BOOL",
  INT = "INT",
  DINT = "DINT",
  REAL = "REAL",
  STRING = "STRING",
  TIMER = "TIMER",
  COUNTER = "COUNTER",
}
```

### Tag Relationships

- Belongs to PLC (many-to-one with plcs)
- Created/Updated by User (many-to-one with users)

## AuditLog

**Purpose:** ISO compliance tracking for all data modifications across the framework

**Key Attributes:**

- id: UUID - Unique identifier
- table_name: string - Table where change occurred
- record_id: UUID - ID of modified record
- action: string - INSERT, UPDATE, DELETE
- old_values: JSONB - Previous state (for updates)
- new_values: JSONB - New state
- user_id: UUID - User who made the change
- timestamp: timestamp - When change occurred
- ip_address: string - Client IP for security
- user_agent: string - Client information

### AuditLog TypeScript Interface

```typescript
interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

enum AuditAction {
  INSERT = "INSERT",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
```

### AuditLog Relationships

- Belongs to User (many-to-one with users)
- Polymorphic relationship to any audited table via table_name/record_id

## Role

**Purpose:** Define permission sets for RBAC across all framework applications

**Key Attributes:**

- id: UUID - Unique identifier
- name: string - Role name (Admin, Engineer, Viewer)
- permissions: JSONB - Permission configuration
- description: string - Role purpose
- is_system: boolean - Protected system role flag
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification

### Role TypeScript Interface

```typescript
interface Role {
  id: string;
  name: string;
  permissions: RolePermissions;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RolePermissions {
  [resource: string]: {
    [action: string]: boolean;
  };
  equipment: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    export: boolean;
  };
  plcs: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    export: boolean;
  };
  users: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  audit: {
    read: boolean;
    export: boolean;
  };
}
```

### Role Relationships

- Has many Users (one-to-many with users)
