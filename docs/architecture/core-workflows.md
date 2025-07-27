# Core Workflows

## User Authentication Flow

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

## PLC Creation with Hierarchy Flow

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

## Bulk PLC Import Flow

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

## PLC Search and Filter Flow

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

## Audit Trail for Critical Changes Flow

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

## Hierarchy Navigation Flow

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

## Export with Filters Flow

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
