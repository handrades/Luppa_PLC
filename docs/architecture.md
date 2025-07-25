# Industrial Inventory Multi-App Framework Fullstack Architecture Document

This document outlines the complete fullstack architecture for Industrial Inventory Multi-App Framework, including backend
systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven
development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents,
streamlining the development process for modern fullstack applications where these concerns are increasingly
intertwined.

## Starter Template or Existing Project
N/A - Greenfield project

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-24 | 1.0 | Initial architecture document creation | Winston (Architect) |

## High Level Architecture

### Technical Summary
The Industrial Inventory Multi-App Framework employs a layered monolithic architecture deployed via Docker Swarm
for on-premise industrial environments. Built with React + TypeScript frontend and Node.js + Express backend, the
system provides RESTful APIs for communication between layers. The architecture leverages PostgreSQL for persistent
storage and Redis for caching/sessions, with all services orchestrated through Docker Compose. This design achieves
the PRD goals of high performance (<100ms queries), ISO compliance through comprehensive audit logging, and provides
a reusable foundation for future industrial applications while maintaining compatibility with air-gapped networks.

### Platform and Infrastructure Choice
**Platform:** On-Premise Docker Swarm
**Key Services:** PostgreSQL 15, Redis 7, Nginx 1.24, Grafana 9.x, Prometheus 2.x
**Deployment Host and Regions:** Single on-premise data center (air-gapped industrial network)

### Repository Structure
**Structure:** Monorepo with clear module boundaries
**Monorepo Tool:** pnpm workspaces (better performance and disk efficiency than npm/yarn)
**Package Organization:**
- `/apps` - Application packages (web, api)
- `/packages` - Shared libraries (ui, shared-types, config)
- `/infrastructure` - Docker configs and deployment scripts

### High Level Architecture Diagram

```mermaid
graph TB
    subgraph "User Access Layer"
        Browser[Web Browser]
        Tablet[Tablet Device]
    end
    
    subgraph "Infrastructure Layer"
        Nginx[Nginx Reverse Proxy<br/>Load Balancer]
    end
    
    subgraph "Application Layer"
        subgraph "Frontend"
            React[React SPA<br/>Vite + TypeScript]
        end
        
        subgraph "Backend"
            API[Express API Server<br/>REST + JWT Auth]
        end
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Primary Database)]
        Redis[(Redis<br/>Cache + Sessions)]
    end
    
    subgraph "Monitoring Layer"
        Grafana[Grafana Dashboard]
        Prometheus[Prometheus Metrics]
    end
    
    Browser --> Nginx
    Tablet --> Nginx
    Nginx --> React
    React --> API
    API --> PostgreSQL
    API --> Redis
    API --> Prometheus
    Prometheus --> Grafana
```

### Architectural Patterns
- **Layered Architecture:** Clear separation between presentation, business logic, and data layers - *Rationale:* Simplifies development and maintenance for solo developer while enabling future team scaling
- **Component-Based UI:** Reusable React components with TypeScript and Storybook documentation - *Rationale:* Accelerates development of future apps within the framework
- **Repository Pattern:** Abstract data access through TypeORM repositories - *Rationale:* Enables testing and potential future database migrations
- **API Gateway Pattern:** Nginx as single entry point for all requests - *Rationale:* Centralized SSL termination, load balancing, and request routing
- **JWT Authentication:** Stateless auth with Redis session storage - *Rationale:* Scalable authentication that works in distributed environments
- **Audit Trail Pattern:** Comprehensive logging of all data modifications - *Rationale:* ISO compliance requirement with PostgreSQL triggers for reliability
- **Offline-First Design:** Local caching and sync mechanisms - *Rationale:* Critical for air-gapped industrial environments
- **Schema-Per-App Pattern:** Shared core + app-specific schemas - *Rationale:* Enables multi-app framework while maintaining data isolation

## Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions.

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.8.3 | Type-safe frontend development | Latest stable, catches errors early, improves maintainability |
| Frontend Framework | React | 19.1.0 | UI component framework | Latest with server components, improved performance |
| UI Component Library | Material-UI (MUI) | 7.0.0 | Pre-built industrial UI components | CSS layers support, better Tailwind integration |
| State Management | Zustand | 5.0.2 | Client state management | Latest stable, TypeScript-first, simple API |
| Backend Language | TypeScript | 5.8.3 | Type-safe backend development | Code sharing with frontend, consistent DX |
| Backend Framework | Express | 5.1.0 | HTTP server framework | Latest LTS, improved security, Node 18+ support |
| API Style | REST | OpenAPI 3.1 | API communication protocol | Latest spec, better JSON Schema support |
| Database | PostgreSQL | 17.5 | Primary data storage | Latest with major performance improvements |
| Cache | Redis | 8.0 | Session store and caching | New data structures, 2x performance boost |
| File Storage | Local Filesystem | N/A | Equipment documentation storage | Simplicity for air-gapped environments |
| Authentication | JWT + bcrypt | jsonwebtoken 10.0 | User authentication | Latest stable, improved security |
| Frontend Testing | Jest + RTL | 30.0 / 16.1 | Component and unit testing | Latest with ESM support |
| Backend Testing | Jest + Supertest | 30.0 / 7.0 | API and unit testing | Consistent with frontend testing |
| E2E Testing | Playwright | 1.50 | End-to-end testing | Latest with improved debugging |
| Build Tool | Vite | 6.0 | Frontend bundling | Latest with Rolldown support |
| Bundler | Rolldown (via Vite) | 0.15 | JavaScript bundling | Rust-based, faster than esbuild |
| IaC Tool | Docker Compose | 2.32 | Infrastructure as code | Latest with improved performance |
| CI/CD | GitHub Actions | N/A | Automation pipeline | Continuously updated by GitHub |
| Monitoring | Prometheus | 3.0 | Metrics collection | Latest with native histograms |
| Logging | Winston | 3.17 | Application logging | Latest stable version |
| CSS Framework | Emotion (via MUI) | 12.0 | CSS-in-JS styling | Latest with MUI v7 support |

## Data Models

### User
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

#### User TypeScript Interface

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

#### User Relationships
- Has one Role (many-to-one with roles table)
- Has many AuditLogs (one-to-many with audit_logs)
- Has many Notifications (one-to-many with notifications)

### Site
**Purpose:** Top-level organizational unit representing physical locations

**Key Attributes:**
- id: UUID - Unique identifier using gen_random_uuid()
- name: string - Site name (e.g., "Plant-A", "Facility-North")
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification
- created_by: UUID - User who created record
- updated_by: UUID - Last user to modify

#### Site TypeScript Interface

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

#### Site Relationships
- Has many Cells (one-to-many with cells)
- Created/Updated by User (many-to-one with users)

### Cell
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

#### Cell TypeScript Interface

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

#### Cell Relationships
- Belongs to Site (many-to-one with sites)
- Has many Equipment (one-to-many with equipment)
- Created/Updated by User (many-to-one with users)

### Equipment
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

#### Equipment TypeScript Interface

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
  PRESS = 'PRESS',
  ROBOT = 'ROBOT',
  OVEN = 'OVEN',
  CONVEYOR = 'CONVEYOR',
  ASSEMBLY_TABLE = 'ASSEMBLY_TABLE',
  OTHER = 'OTHER'
}
```

#### Equipment Relationships
- Belongs to Cell (many-to-one with cells)
- Has many PLCs (one-to-many with plcs)
- Created/Updated by User (many-to-one with users)

### PLC
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

#### PLC TypeScript Interface

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

#### PLC Relationships
- Belongs to Equipment (many-to-one with equipment)
- Has many Tags (one-to-many with tags)
- Created/Updated by User (many-to-one with users)

### Tag
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

#### Tag TypeScript Interface

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
  BOOL = 'BOOL',
  INT = 'INT',
  DINT = 'DINT',
  REAL = 'REAL',
  STRING = 'STRING',
  TIMER = 'TIMER',
  COUNTER = 'COUNTER'
}
```

#### Tag Relationships
- Belongs to PLC (many-to-one with plcs)
- Created/Updated by User (many-to-one with users)

### AuditLog
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

#### AuditLog TypeScript Interface

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
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}
```

#### AuditLog Relationships
- Belongs to User (many-to-one with users)
- Polymorphic relationship to any audited table via table_name/record_id

### Role
**Purpose:** Define permission sets for RBAC across all framework applications

**Key Attributes:**
- id: UUID - Unique identifier
- name: string - Role name (Admin, Engineer, Viewer)
- permissions: JSONB - Permission configuration
- description: string - Role purpose
- is_system: boolean - Protected system role flag
- created_at: timestamp - Creation time
- updated_at: timestamp - Last modification

#### Role TypeScript Interface

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
  equipment: {
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

#### Role Relationships
- Has many Users (one-to-many with users)

## API Specification

### REST API Specification

```yaml
openapi: 3.1.0
info:
  title: Industrial Inventory Multi-App Framework API
  version: 1.0.0
  description: RESTful API for industrial equipment inventory management with hierarchical organization
servers:
  - url: http://localhost:3000/api/v1
    description: Development server
  - url: https://inventory.local/api/v1
    description: Production server (on-premise)

paths:
  # Site Management
  /sites:
    get:
      tags: [Sites]
      summary: List all sites
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/PageSizeParam'
        - name: search
          in: query
          schema:
            type: string
      responses:
        200:
          description: Site list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedSites'
                
    post:
      tags: [Sites]
      summary: Create new site
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SiteInput'
      responses:
        201:
          description: Site created
          
  /sites/{siteId}:
    parameters:
      - $ref: '#/components/parameters/SiteIdParam'
    get:
      tags: [Sites]
      summary: Get site details
      responses:
        200:
          description: Site details with cell count
          
  # Cell Management
  /sites/{siteId}/cells:
    parameters:
      - $ref: '#/components/parameters/SiteIdParam'
    get:
      tags: [Cells]
      summary: List cells in a site
      responses:
        200:
          description: Cell list
          
    post:
      tags: [Cells]
      summary: Create new cell in site
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CellInput'
              
  /cells/{cellId}:
    parameters:
      - $ref: '#/components/parameters/CellIdParam'
    get:
      tags: [Cells]
      summary: Get cell details
      responses:
        200:
          description: Cell details with equipment count
          
  # Equipment Management
  /cells/{cellId}/equipment:
    parameters:
      - $ref: '#/components/parameters/CellIdParam'
    get:
      tags: [Equipment]
      summary: List equipment in a cell
      responses:
        200:
          description: Equipment list
          
    post:
      tags: [Equipment]
      summary: Create new equipment in cell
      
  /equipment/{equipmentId}:
    parameters:
      - $ref: '#/components/parameters/EquipmentIdParam'
    get:
      tags: [Equipment]
      summary: Get equipment details
      
  # PLC Management
  /equipment/{equipmentId}/plcs:
    parameters:
      - $ref: '#/components/parameters/EquipmentIdParam'
    get:
      tags: [PLCs]
      summary: List PLCs in equipment
      
    post:
      tags: [PLCs]
      summary: Create new PLC
      
  /plcs:
    get:
      tags: [PLCs]
      summary: Search all PLCs with filtering
      parameters:
        - name: search
          in: query
          schema:
            type: string
          description: Search in tag_id, description, make, model
        - name: siteId
          in: query
          schema:
            type: string
            format: uuid
        - name: cellId
          in: query
          schema:
            type: string
            format: uuid
        - name: make
          in: query
          schema:
            type: string
        - name: model
          in: query
          schema:
            type: string
        - name: hasIpAddress
          in: query
          schema:
            type: boolean
      responses:
        200:
          description: PLC search results with full hierarchy
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/PLCWithHierarchy'
                      
  /plcs/{plcId}:
    parameters:
      - $ref: '#/components/parameters/PLCIdParam'
    get:
      tags: [PLCs]
      summary: Get PLC details with full hierarchy
      
  # Tag Management
  /plcs/{plcId}/tags:
    parameters:
      - $ref: '#/components/parameters/PLCIdParam'
    get:
      tags: [Tags]
      summary: List tags for a PLC
      
    post:
      tags: [Tags]
      summary: Create new tag
      
  # Bulk Operations
  /import/plcs:
    post:
      tags: [Import/Export]
      summary: Bulk import PLCs with hierarchy
      description: CSV must include site_name, cell_name, equipment_name
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                createMissing:
                  type: boolean
                  description: Auto-create sites/cells/equipment if not found
                  
  /export/plcs:
    post:
      tags: [Import/Export]
      summary: Export PLCs to CSV with full hierarchy
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                filters:
                  $ref: '#/components/schemas/PLCFilters'
                includeHierarchy:
                  type: boolean
                  default: true
                includeTags:
                  type: boolean
                  default: false
                  
  # Hierarchy Operations
  /hierarchy/tree:
    get:
      tags: [Hierarchy]
      summary: Get complete hierarchy tree
      responses:
        200:
          description: Hierarchical tree structure
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                    name:
                      type: string
                    type:
                      type: string
                      enum: [site, cell, equipment, plc]
                    children:
                      type: array
                      items:
                        type: object
                        
  /hierarchy/move:
    post:
      tags: [Hierarchy]
      summary: Move equipment between cells
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                equipmentId:
                  type: string
                  format: uuid
                targetCellId:
                  type: string
                  format: uuid
                  
components:
  schemas:
    PLCWithHierarchy:
      allOf:
        - $ref: '#/components/schemas/PLC'
        - type: object
          properties:
            hierarchy:
              type: object
              properties:
                site:
                  $ref: '#/components/schemas/Site'
                cell:
                  $ref: '#/components/schemas/Cell'
                equipment:
                  $ref: '#/components/schemas/Equipment'
```

## Components

### Auth Service
**Responsibility:** Handle all authentication and authorization logic including JWT token management, password hashing, role validation, and session management

**Key Interfaces:**
- `login(email: string, password: string): Promise<AuthResponse>`
- `validateToken(token: string): Promise<User>`
- `refreshToken(token: string): Promise<string>`
- `logout(userId: string): Promise<void>`

**Dependencies:** PostgreSQL (users, roles tables), Redis (session storage), bcrypt, jsonwebtoken

**Technology Stack:** TypeScript, Express middleware, JWT tokens with 24-hour expiry, Redis for token blacklisting

### Site Management Service
**Responsibility:** CRUD operations for sites, validation of site names, cascade handling for site deletion

**Key Interfaces:**
- `createSite(data: SiteInput): Promise<Site>`
- `getSites(filters: SiteFilters): Promise<PaginatedResponse<Site>>`
- `updateSite(id: string, data: SiteUpdate): Promise<Site>`
- `deleteSite(id: string): Promise<void>`

**Dependencies:** PostgreSQL (sites table), Audit Service

**Technology Stack:** TypeScript, TypeORM repositories, Joi validation

### Cell Management Service
**Responsibility:** Manage production cells within sites, enforce site-cell relationships, handle cell-to-equipment cascade operations

**Key Interfaces:**
- `createCell(siteId: string, data: CellInput): Promise<Cell>`
- `getCellsBySite(siteId: string): Promise<Cell[]>`
- `moveCell(cellId: string, newSiteId: string): Promise<Cell>`
- `getCellWithCounts(cellId: string): Promise<CellDetails>`

**Dependencies:** PostgreSQL (cells table), Site Service, Audit Service

**Technology Stack:** TypeScript, TypeORM with relations, transaction support

### Equipment Service
**Responsibility:** Equipment lifecycle management, type validation, equipment-to-PLC relationship management

**Key Interfaces:**
- `createEquipment(cellId: string, data: EquipmentInput): Promise<Equipment>`
- `getEquipmentByCell(cellId: string): Promise<Equipment[]>`
- `moveEquipment(equipmentId: string, newCellId: string): Promise<Equipment>`
- `getEquipmentWithPLCCount(equipmentId: string): Promise<EquipmentDetails>`

**Dependencies:** PostgreSQL (equipment table), Cell Service, Audit Service

**Technology Stack:** TypeScript, TypeORM, enum validation for equipment types

### PLC Service
**Responsibility:** Core PLC management including IP address uniqueness, tag ID validation, firmware tracking, search functionality

**Key Interfaces:**
- `createPLC(equipmentId: string, data: PLCInput): Promise<PLC>`
- `searchPLCs(filters: PLCSearchFilters): Promise<PLCWithHierarchy[]>`
- `updatePLCFirmware(plcId: string, version: string): Promise<PLC>`
- `findByIPAddress(ip: string): Promise<PLC | null>`

**Dependencies:** PostgreSQL (plcs table), Equipment Service, Audit Service, Redis (search cache)

**Technology Stack:** TypeScript, PostgreSQL full-text search, Redis caching for frequent queries

### Tag Service
**Responsibility:** PLC tag management, data type validation, address conflict detection

**Key Interfaces:**
- `createTag(plcId: string, data: TagInput): Promise<Tag>`
- `getTagsByPLC(plcId: string): Promise<Tag[]>`
- `bulkCreateTags(plcId: string, tags: TagInput[]): Promise<Tag[]>`
- `validateTagAddress(plcId: string, address: string): Promise<boolean>`

**Dependencies:** PostgreSQL (tags table), PLC Service, Audit Service

**Technology Stack:** TypeScript, batch operations for performance, enum validation for data types

### Hierarchy Service
**Responsibility:** Complex hierarchy queries, tree generation, breadcrumb creation, move operations across levels

**Key Interfaces:**
- `getFullHierarchy(): Promise<HierarchyNode[]>`
- `getBreadcrumbs(entityType: string, entityId: string): Promise<Breadcrumb[]>`
- `getAncestors(plcId: string): Promise<HierarchyPath>`
- `validateMove(sourceId: string, targetId: string): Promise<boolean>`

**Dependencies:** All entity services, PostgreSQL recursive CTEs

**Technology Stack:** TypeScript, PostgreSQL recursive queries, Redis caching for tree structure

### Import/Export Service
**Responsibility:** Bulk data operations, CSV parsing/generation, hierarchy validation during import, auto-creation of missing entities

**Key Interfaces:**
- `importPLCs(file: Buffer, options: ImportOptions): Promise<ImportResult>`
- `exportPLCs(filters: PLCFilters, format: ExportFormat): Promise<Buffer>`
- `validateCSV(file: Buffer): Promise<ValidationResult>`
- `generateTemplate(): Promise<Buffer>`

**Dependencies:** All entity services, csv-parse, csv-stringify libraries

**Technology Stack:** TypeScript, streaming for large files, transaction support for atomic imports

### Audit Service
**Responsibility:** Comprehensive audit logging, risk assessment, compliance reporting, audit log integrity

**Key Interfaces:**
- `logChange(change: AuditEntry): Promise<void>`
- `getAuditTrail(entityId: string): Promise<AuditLog[]>`
- `generateComplianceReport(dateRange: DateRange): Promise<Report>`
- `calculateRiskLevel(change: AuditEntry): RiskLevel`

**Dependencies:** PostgreSQL (audit_logs table), User Service

**Technology Stack:** TypeScript, PostgreSQL triggers, scheduled checksums for integrity

### Notification Service
**Responsibility:** In-app notifications, system alerts, batch notification processing

**Key Interfaces:**
- `createNotification(userId: string, notification: NotificationInput): Promise<void>`
- `getUserNotifications(userId: string): Promise<Notification[]>`
- `markAsRead(notificationId: string): Promise<void>`
- `broadcastSystemAlert(alert: SystemAlert): Promise<void>`

**Dependencies:** PostgreSQL (notifications table), WebSocket for real-time

**Technology Stack:** TypeScript, Socket.io for real-time updates, batch processing

### Component Interaction Diagram

```mermaid
graph TD
    subgraph "API Layer"
        REST[REST API Controllers]
    end
    
    subgraph "Service Layer"
        Auth[Auth Service]
        Site[Site Service]
        Cell[Cell Service]
        Equipment[Equipment Service]
        PLC[PLC Service]
        Tag[Tag Service]
        Hierarchy[Hierarchy Service]
        Import[Import/Export Service]
        Audit[Audit Service]
        Notify[Notification Service]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL)]
        Redis[(Redis)]
    end
    
    REST --> Auth
    REST --> Site
    REST --> Cell
    REST --> Equipment
    REST --> PLC
    REST --> Tag
    REST --> Hierarchy
    REST --> Import
    
    Site --> Audit
    Cell --> Audit
    Equipment --> Audit
    PLC --> Audit
    Tag --> Audit
    
    Import --> Site
    Import --> Cell
    Import --> Equipment
    Import --> PLC
    
    Hierarchy --> Site
    Hierarchy --> Cell
    Hierarchy --> Equipment
    Hierarchy --> PLC
    
    Auth --> PG
    Auth --> Redis
    Site --> PG
    Cell --> PG
    Equipment --> PG
    PLC --> PG
    Tag --> PG
    Audit --> PG
    Notify --> PG
    
    PLC --> Redis
    Hierarchy --> Redis
```

## Core Workflows

### User Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant React
    participant API
    participant AuthService
    participant PostgreSQL
    participant Redis

    Browser->>React: Enter credentials
    React->>API: POST /api/v1/auth/login
    API->>AuthService: login(email, password)
    AuthService->>PostgreSQL: SELECT user with email
    PostgreSQL-->>AuthService: User data
    AuthService->>AuthService: Verify password (bcrypt)
    
    alt Invalid credentials
        AuthService-->>API: Unauthorized error
        API-->>React: 401 Unauthorized
        React-->>Browser: Show error message
    else Valid credentials
        AuthService->>PostgreSQL: UPDATE last_login
        AuthService->>AuthService: Generate JWT
        AuthService->>Redis: Store session data
        AuthService-->>API: Auth response
        API-->>React: 200 OK + JWT token
        React->>React: Store token (localStorage)
        React-->>Browser: Redirect to dashboard
    end
```

### PLC Creation with Hierarchy Flow

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API
    participant PLCService
    participant EquipmentService
    participant AuditService
    participant PostgreSQL

    User->>React: Navigate to Equipment
    React->>API: GET /api/v1/equipment/{id}
    API->>EquipmentService: getEquipment(id)
    EquipmentService->>PostgreSQL: SELECT with relations
    PostgreSQL-->>EquipmentService: Equipment + Cell + Site
    EquipmentService-->>API: Equipment details
    API-->>React: Equipment with hierarchy
    React-->>User: Show equipment page
    
    User->>React: Click "Add PLC"
    React->>React: Show PLC form
    User->>React: Fill PLC details
    React->>API: POST /api/v1/equipment/{id}/plcs
    
    API->>PLCService: createPLC(equipmentId, data)
    PLCService->>PLCService: Validate tag_id uniqueness
    PLCService->>PLCService: Validate IP uniqueness
    
    alt Validation fails
        PLCService-->>API: Validation error
        API-->>React: 400 Bad Request
        React-->>User: Show validation errors
    else Validation passes
        PLCService->>PostgreSQL: BEGIN TRANSACTION
        PLCService->>PostgreSQL: INSERT INTO plcs
        PostgreSQL-->>PLCService: New PLC record
        
        PLCService->>AuditService: logChange(INSERT, plc)
        AuditService->>PostgreSQL: INSERT INTO audit_logs
        
        PLCService->>PostgreSQL: COMMIT
        PLCService-->>API: Created PLC
        API-->>React: 201 Created
        React-->>User: Success message + PLC details
    end
```

### Bulk PLC Import Flow

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API
    participant ImportService
    participant SiteService
    participant CellService
    participant EquipmentService
    participant PLCService
    participant PostgreSQL

    User->>React: Select CSV file
    React->>React: Preview first 10 rows
    User->>React: Configure import options
    React->>API: POST /api/v1/import/plcs (multipart)
    
    API->>ImportService: importPLCs(file, options)
    ImportService->>ImportService: Parse CSV
    ImportService->>ImportService: Validate headers
    
    ImportService->>PostgreSQL: BEGIN TRANSACTION
    
    loop For each row
        ImportService->>ImportService: Validate row data
        
        alt Site doesn't exist AND createMissing=true
            ImportService->>SiteService: createSite(name)
            SiteService->>PostgreSQL: INSERT site
        end
        
        alt Cell doesn't exist AND createMissing=true
            ImportService->>CellService: createCell(siteId, data)
            CellService->>PostgreSQL: INSERT cell
        end
        
        alt Equipment doesn't exist AND createMissing=true
            ImportService->>EquipmentService: createEquipment(cellId, data)
            EquipmentService->>PostgreSQL: INSERT equipment
        end
        
        ImportService->>PLCService: createPLC(equipmentId, plcData)
        PLCService->>PostgreSQL: INSERT plc
    end
    
    alt Any error occurs
        ImportService->>PostgreSQL: ROLLBACK
        ImportService-->>API: Import failed
        API-->>React: 400 with error details
        React-->>User: Show error report
    else All successful
        ImportService->>PostgreSQL: COMMIT
        ImportService-->>API: Import result
        API-->>React: 202 Accepted
        React-->>User: Show success summary
    end
```

### PLC Search and Filter Flow

```mermaid
sequenceDiagram
    participant User
    participant React
    participant Zustand
    participant API
    participant PLCService
    participant Redis
    participant PostgreSQL

    User->>React: Enter search term
    React->>React: Debounce 300ms
    React->>Zustand: Update search state
    
    React->>API: GET /api/v1/plcs?search=term
    API->>PLCService: searchPLCs(filters)
    
    PLCService->>Redis: Check cache key
    
    alt Cache hit
        Redis-->>PLCService: Cached results
    else Cache miss
        PLCService->>PostgreSQL: Complex JOIN query
        Note over PostgreSQL: SELECT plcs.*<br/>FROM plcs<br/>JOIN equipment ON...<br/>JOIN cells ON...<br/>JOIN sites ON...<br/>WHERE search conditions
        PostgreSQL-->>PLCService: Results with hierarchy
        PLCService->>Redis: Cache results (60s TTL)
    end
    
    PLCService-->>API: PLC results
    API-->>React: 200 OK with data
    React->>Zustand: Update PLC list
    React-->>User: Display results (<100ms)
```

### Audit Trail for Critical Changes Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant PLCService
    participant AuditService
    participant PostgreSQL
    participant NotificationService

    User->>API: PUT /api/v1/plcs/{id}
    Note over API: Change IP address
    
    API->>API: Set audit context
    API->>PostgreSQL: SET LOCAL app.current_user_id
    API->>PostgreSQL: SET LOCAL app.client_ip
    
    API->>PLCService: updatePLC(id, {ip: newIP})
    PLCService->>PostgreSQL: UPDATE plcs SET ip = $1
    
    Note over PostgreSQL: Trigger fires automatically
    PostgreSQL->>PostgreSQL: audit_trigger_function()
    PostgreSQL->>PostgreSQL: Assess risk level (MEDIUM)
    PostgreSQL->>PostgreSQL: INSERT INTO audit_logs
    
    PLCService-->>API: Updated PLC
    
    API->>NotificationService: notifyAdmins(ipChange)
    NotificationService->>PostgreSQL: INSERT notifications
    NotificationService->>NotificationService: Emit WebSocket event
    
    API-->>User: 200 OK
```

### Hierarchy Navigation Flow

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API
    participant HierarchyService
    participant Redis
    participant PostgreSQL

    User->>React: Click on PLC
    React->>API: GET /api/v1/plcs/{id}
    
    API->>HierarchyService: getBreadcrumbs('plc', id)
    
    HierarchyService->>Redis: Check breadcrumb cache
    
    alt Cache miss
        HierarchyService->>PostgreSQL: Recursive CTE query
        Note over PostgreSQL: WITH RECURSIVE ancestors AS (<br/>  SELECT sites, cells, equipment<br/>  FROM hierarchy view<br/>)
        PostgreSQL-->>HierarchyService: Full hierarchy path
        HierarchyService->>Redis: Cache breadcrumbs
    end
    
    HierarchyService-->>API: Breadcrumb array
    API-->>React: PLC with breadcrumbs
    React-->>User: Display: Site > Cell > Equipment > PLC
    
    User->>React: Click breadcrumb (Cell)
    React->>React: Navigate to /cells/{cellId}
```

### Export with Filters Flow

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API
    participant ExportService
    participant PLCService
    participant PostgreSQL

    User->>React: Configure export filters
    React->>React: Show estimated count
    User->>React: Click "Export to CSV"
    
    React->>API: POST /api/v1/export/plcs
    Note over API: Body: {filters, includeHierarchy: true}
    
    API->>ExportService: exportPLCs(filters, format)
    ExportService->>PLCService: searchPLCs(filters)
    PLCService->>PostgreSQL: SELECT with filters
    PostgreSQL-->>PLCService: Filtered PLCs
    
    ExportService->>ExportService: Transform to CSV
    Note over ExportService: Include hierarchy columns:<br/>site_name, cell_name,<br/>equipment_name, plc_tag_id...
    
    ExportService->>ExportService: Stream to buffer
    ExportService-->>API: CSV buffer
    
    API-->>React: 200 OK (text/csv)
    React->>React: Trigger download
    React-->>User: plc_export_2025-01-24.csv
```

## Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE equipment_type AS ENUM ('PRESS', 'ROBOT', 'OVEN', 'CONVEYOR', 'ASSEMBLY_TABLE', 'OTHER');
CREATE TYPE tag_data_type AS ENUM ('BOOL', 'INT', 'DINT', 'REAL', 'STRING', 'TIMER', 'COUNTER');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Users table (shared across framework)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Roles table (shared across framework)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sites table
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_sites_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_sites_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Cells table
CREATE TABLE cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    line_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_cells_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    CONSTRAINT fk_cells_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_cells_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT uk_cells_site_line UNIQUE (site_id, line_number)
);

-- Equipment table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    equipment_type equipment_type NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_equipment_cell FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_equipment_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- PLCs table
CREATE TABLE plcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL,
    tag_id VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    ip_address INET,
    firmware_version VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_plcs_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    CONSTRAINT fk_plcs_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_plcs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT uk_plcs_ip_address UNIQUE (ip_address),
    CONSTRAINT check_ip_format CHECK (ip_address IS NULL OR family(ip_address) = 4)
);

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plc_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    data_type tag_data_type NOT NULL,
    description TEXT,
    address VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_tags_plc FOREIGN KEY (plc_id) REFERENCES plcs(id) ON DELETE CASCADE,
    CONSTRAINT fk_tags_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_tags_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT uk_tags_plc_name UNIQUE (plc_id, name)
);

-- Audit logs table (enhanced for ISO compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    risk_level risk_level DEFAULT 'LOW',
    compliance_notes TEXT,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Notifications table (framework feature)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_cells_site_id ON cells(site_id);
CREATE INDEX idx_equipment_cell_id ON equipment(cell_id);
CREATE INDEX idx_plcs_equipment_id ON plcs(equipment_id);
CREATE INDEX idx_plcs_make_model ON plcs(make, model);
CREATE INDEX idx_plcs_tag_id ON plcs(tag_id);
CREATE INDEX idx_tags_plc_id ON tags(plc_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_data_type ON tags(data_type);

-- Audit log indexes
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level) WHERE risk_level IN ('HIGH', 'CRITICAL');

-- Created/Updated by indexes for all tables
CREATE INDEX idx_sites_created_by ON sites(created_by);
CREATE INDEX idx_sites_updated_by ON sites(updated_by);
CREATE INDEX idx_cells_created_by ON cells(created_by);
CREATE INDEX idx_cells_updated_by ON cells(updated_by);
CREATE INDEX idx_equipment_created_by ON equipment(created_by);
CREATE INDEX idx_equipment_updated_by ON equipment(updated_by);
CREATE INDEX idx_plcs_created_by ON plcs(created_by);
CREATE INDEX idx_plcs_updated_by ON plcs(updated_by);
CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_tags_updated_by ON tags(updated_by);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON cells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plcs_updated_at BEFORE UPDATE ON plcs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create comprehensive audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id UUID;
    audit_ip INET;
    audit_user_agent TEXT;
    audit_session_id VARCHAR(255);
    changed_fields TEXT[];
    risk_level risk_level;
BEGIN
    -- Get audit context from session variables
    audit_user_id := current_setting('app.current_user_id', true)::UUID;
    audit_ip := current_setting('app.client_ip', true)::INET;
    audit_user_agent := current_setting('app.user_agent', true);
    audit_session_id := current_setting('app.session_id', true);
    
    -- Determine risk level
    risk_level := CASE 
        WHEN TG_TABLE_NAME IN ('users', 'roles') THEN 'HIGH'
        WHEN TG_TABLE_NAME = 'plcs' AND TG_OP = 'DELETE' THEN 'HIGH'
        WHEN TG_TABLE_NAME = 'plcs' AND OLD.ip_address IS DISTINCT FROM NEW.ip_address THEN 'MEDIUM'
        WHEN TG_OP = 'DELETE' THEN 'MEDIUM'
        ELSE 'LOW'
    END;
    
    -- Calculate changed fields for UPDATE
    IF (TG_OP = 'UPDATE') THEN
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
    END IF;
    
    -- Insert audit record
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values,
            changed_fields, user_id, ip_address, user_agent, session_id, risk_level
        ) VALUES (
            TG_TABLE_NAME, OLD.id, TG_OP::audit_action, to_jsonb(OLD), NULL,
            NULL, audit_user_id, audit_ip, audit_user_agent, audit_session_id, risk_level
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values,
            changed_fields, user_id, ip_address, user_agent, session_id, risk_level
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP::audit_action, to_jsonb(OLD), to_jsonb(NEW),
            changed_fields, audit_user_id, audit_ip, audit_user_agent, audit_session_id, risk_level
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values,
            changed_fields, user_id, ip_address, user_agent, session_id, risk_level
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP::audit_action, NULL, to_jsonb(NEW),
            NULL, audit_user_id, audit_ip, audit_user_agent, audit_session_id, risk_level
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to all tables
CREATE TRIGGER audit_sites AFTER INSERT OR UPDATE OR DELETE ON sites
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_cells AFTER INSERT OR UPDATE OR DELETE ON cells
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_equipment AFTER INSERT OR UPDATE OR DELETE ON equipment
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_plcs AFTER INSERT OR UPDATE OR DELETE ON plcs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_tags AFTER INSERT OR UPDATE OR DELETE ON tags
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create views for common queries

-- Enhanced hierarchy view for PLCs with all tags
CREATE VIEW v_plc_hierarchy AS
SELECT 
    p.id as plc_id,
    p.tag_id,
    p.description as plc_description,
    p.make,
    p.model,
    p.ip_address,
    p.firmware_version,
    e.id as equipment_id,
    e.name as equipment_name,
    e.equipment_type,
    c.id as cell_id,
    c.name as cell_name,
    c.line_number,
    s.id as site_id,
    s.name as site_name,
    CONCAT(s.name, ' > ', c.name, ' > ', e.name, ' > ', p.tag_id) as full_path,
    -- Aggregate tags as JSON array
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', t.id,
                'name', t.name,
                'data_type', t.data_type,
                'description', t.description,
                'address', t.address
            ) ORDER BY t.name
        ) FILTER (WHERE t.id IS NOT NULL), 
        '[]'::json
    ) as tags
FROM plcs p
JOIN equipment e ON p.equipment_id = e.id
JOIN cells c ON e.cell_id = c.id
JOIN sites s ON c.site_id = s.id
LEFT JOIN tags t ON p.id = t.plc_id
GROUP BY 
    p.id, p.tag_id, p.description, p.make, p.model, p.ip_address, p.firmware_version,
    e.id, e.name, e.equipment_type,
    c.id, c.name, c.line_number,
    s.id, s.name;

-- Alternative view with tags as separate rows (for different use cases)
CREATE VIEW v_plc_hierarchy_with_tag_rows AS
SELECT 
    p.id as plc_id,
    p.tag_id as plc_tag_id,
    p.description as plc_description,
    p.make,
    p.model,
    p.ip_address,
    p.firmware_version,
    e.id as equipment_id,
    e.name as equipment_name,
    e.equipment_type,
    c.id as cell_id,
    c.name as cell_name,
    c.line_number,
    s.id as site_id,
    s.name as site_name,
    CONCAT(s.name, ' > ', c.name, ' > ', e.name, ' > ', p.tag_id) as full_path,
    t.id as tag_id,
    t.name as tag_name,
    t.data_type as tag_data_type,
    t.description as tag_description,
    t.address as tag_address
FROM plcs p
JOIN equipment e ON p.equipment_id = e.id
JOIN cells c ON e.cell_id = c.id
JOIN sites s ON c.site_id = s.id
LEFT JOIN tags t ON p.id = t.plc_id
ORDER BY s.name, c.line_number, e.name, p.tag_id, t.name;

-- View for PLC summary with tag counts
CREATE VIEW v_plc_summary AS
SELECT 
    p.id as plc_id,
    p.tag_id,
    p.description,
    p.make,
    p.model,
    p.ip_address,
    e.name as equipment_name,
    e.equipment_type,
    c.name as cell_name,
    s.name as site_name,
    COUNT(t.id) as tag_count,
    STRING_AGG(DISTINCT t.data_type::text, ', ' ORDER BY t.data_type::text) as tag_data_types
FROM plcs p
JOIN equipment e ON p.equipment_id = e.id
JOIN cells c ON e.cell_id = c.id
JOIN sites s ON c.site_id = s.id
LEFT JOIN tags t ON p.id = t.plc_id
GROUP BY 
    p.id, p.tag_id, p.description, p.make, p.model, p.ip_address,
    e.name, e.equipment_type, c.name, s.name;

-- PLC count by site
CREATE VIEW v_site_plc_counts AS
SELECT 
    s.id,
    s.name,
    COUNT(DISTINCT c.id) as cell_count,
    COUNT(DISTINCT e.id) as equipment_count,
    COUNT(DISTINCT p.id) as plc_count,
    COUNT(DISTINCT t.id) as tag_count
FROM sites s
LEFT JOIN cells c ON s.id = c.site_id
LEFT JOIN equipment e ON c.id = e.cell_id
LEFT JOIN plcs p ON e.id = p.equipment_id
LEFT JOIN tags t ON p.id = t.plc_id
GROUP BY s.id, s.name;

-- Recent audit events view
CREATE VIEW v_recent_audit_events AS
SELECT 
    al.timestamp,
    al.table_name,
    al.action,
    al.risk_level,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    al.ip_address,
    al.changed_fields
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY al.timestamp DESC
LIMIT 1000;

-- Initial data insertion
INSERT INTO roles (name, permissions, description, is_system) VALUES
('Admin', '{"sites": {"create": true, "read": true, "update": true, "delete": true}, "cells": {"create": true, "read": true, "update": true, "delete": true}, "equipment": {"create": true, "read": true, "update": true, "delete": true}, "plcs": {"create": true, "read": true, "update": true, "delete": true}, "tags": {"create": true, "read": true, "update": true, "delete": true}, "users": {"create": true, "read": true, "update": true, "delete": true}, "audit": {"read": true, "export": true}}', 'Full system access', true),
('Engineer', '{"sites": {"create": false, "read": true, "update": false, "delete": false}, "cells": {"create": false, "read": true, "update": false, "delete": false}, "equipment": {"create": true, "read": true, "update": true, "delete": false}, "plcs": {"create": true, "read": true, "update": true, "delete": false}, "tags": {"create": true, "read": true, "update": true, "delete": true}, "users": {"create": false, "read": false, "update": false, "delete": false}, "audit": {"read": true, "export": false}}', 'Equipment management access', true),
('Viewer', '{"sites": {"create": false, "read": true, "update": false, "delete": false}, "cells": {"create": false, "read": true, "update": false, "delete": false}, "equipment": {"create": false, "read": true, "update": false, "delete": false}, "plcs": {"create": false, "read": true, "update": false, "delete": false}, "tags": {"create": false, "read": true, "update": false, "delete": false}, "users": {"create": false, "read": false, "update": false, "delete": false}, "audit": {"read": false, "export": false}}', 'Read-only access', true);

-- Create default admin user (password: AdminPassword123!)
-- Note: In production, this would be created via secure setup script
INSERT INTO users (email, password_hash, first_name, last_name, role_id) 
SELECT 
    'admin@industrial.local',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
    'System',
    'Administrator',
    id 
FROM roles WHERE name = 'Admin';
```

## Frontend Architecture

### Component Architecture

#### Component Organization

```text
apps/web/src/
├── components/               # Reusable UI components
│   ├── common/              # Shared across all features
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   ├── DataDisplay/
│   │   │   ├── DataGrid.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── Forms/
│   │   │   ├── FormField.tsx
│   │   │   ├── SelectField.tsx
│   │   │   └── ValidationError.tsx
│   │   └── Feedback/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── Toast.tsx
│   ├── hierarchy/           # Hierarchy-specific components
│   │   ├── SiteCard.tsx
│   │   ├── CellList.tsx
│   │   ├── EquipmentGrid.tsx
│   │   └── HierarchyTree.tsx
│   ├── plc/                 # PLC management components
│   │   ├── PLCForm.tsx
│   │   ├── PLCTable.tsx
│   │   ├── PLCDetails.tsx
│   │   └── PLCSearch.tsx
│   └── tags/                # Tag management components
│       ├── TagList.tsx
│       ├── TagForm.tsx
│       └── TagDataTypeIcon.tsx
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   └── useToast.ts
├── pages/                   # Page components (routes)
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── sites/
│   │   ├── SitesPage.tsx
│   │   └── SiteDetailsPage.tsx
│   ├── plcs/
│   │   ├── PLCListPage.tsx
│   │   └── PLCDetailsPage.tsx
│   └── admin/
│       └── UsersPage.tsx
├── services/               # API client services
│   ├── api.client.ts      # Axios instance setup
│   ├── auth.service.ts
│   ├── plc.service.ts
│   └── hierarchy.service.ts
├── stores/                # Zustand state stores
│   ├── auth.store.ts
│   ├── plc.store.ts
│   └── ui.store.ts
├── styles/               # Global styles & themes
│   ├── theme.ts         # MUI theme configuration
│   └── globals.css
└── utils/               # Utility functions
    ├── validators.ts
    ├── formatters.ts
    └── constants.ts
```

#### Component Template

```typescript
// Example: PLCForm component with industrial patterns
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Grid,
  Paper,
  Typography,
  Skeleton
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { plcService } from '@/services/plc.service';
import { PLCInput, EquipmentType } from '@/types';

const plcSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required').max(100),
  description: z.string().min(1, 'Description is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  ipAddress: z.string().ip({ version: 'v4' }).optional().or(z.literal('')),
  firmwareVersion: z.string().optional()
});

interface PLCFormProps {
  equipmentId: string;
  onSuccess?: () => void;
  initialData?: Partial<PLCInput>;
}

export const PLCForm: React.FC<PLCFormProps> = ({ 
  equipmentId, 
  onSuccess,
  initialData 
}) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<PLCInput>({
    resolver: zodResolver(plcSchema),
    defaultValues: {
      tagId: '',
      description: '',
      make: '',
      model: '',
      ipAddress: '',
      firmwareVersion: '',
      ...initialData
    }
  });

  const createPLCMutation = useMutation({
    mutationFn: (data: PLCInput) => plcService.createPLC(equipmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plcs', equipmentId] });
      showToast('PLC created successfully', 'success');
      onSuccess?.();
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create PLC', 'error');
    }
  });

  const onSubmit = (data: PLCInput) => {
    createPLCMutation.mutate(data);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Add New PLC
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Controller
              name="tagId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tag ID"
                  error={!!errors.tagId}
                  helperText={errors.tagId?.message}
                  placeholder="PLC-A-01-001"
                  required
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Controller
              name="ipAddress"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="IP Address"
                  error={!!errors.ipAddress}
                  helperText={errors.ipAddress?.message}
                  placeholder="192.168.1.100"
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  required
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Controller
              name="make"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.make}>
                  <FormLabel>Make</FormLabel>
                  <Select {...field}>
                    <MenuItem value="">Select Make</MenuItem>
                    <MenuItem value="Allen-Bradley">Allen-Bradley</MenuItem>
                    <MenuItem value="Siemens">Siemens</MenuItem>
                    <MenuItem value="Schneider">Schneider</MenuItem>
                    <MenuItem value="Omron">Omron</MenuItem>
                    <MenuItem value="Mitsubishi">Mitsubishi</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                  {errors.make && (
                    <FormHelperText>{errors.make.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                onClick={() => onSuccess?.()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create PLC'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
```

### State Management Architecture

#### State Structure

```typescript
// stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(credentials);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },
      
      refreshToken: async () => {
        const currentToken = get().token;
        if (!currentToken) return;
        
        try {
          const newToken = await authService.refreshToken(currentToken);
          set({ token: newToken });
        } catch (error) {
          get().logout();
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user 
      })
    }
  )
);

// stores/plc.store.ts
interface PLCFilters {
  siteId?: string;
  cellId?: string;
  equipmentId?: string;
  search?: string;
}

interface PLCState {
  plcs: PLC[];
  filters: PLCFilters;
  isLoading: boolean;
  fetchPLCs: (filters: PLCFilters) => Promise<void>;
  setFilters: (filters: PLCFilters) => void;
}

export const usePLCStore = create<PLCState>((set) => ({
  plcs: [],
  filters: {},
  isLoading: false,
  
  fetchPLCs: async (filters) => {
    set({ isLoading: true });
    try {
      const plcs = await plcService.getPLCs(filters);
      set({ plcs, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters }
    }));
  }
}));
```
