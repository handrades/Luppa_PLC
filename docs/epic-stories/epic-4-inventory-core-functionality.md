# Epic 4: Inventory Core Functionality

This epic implements the core inventory management features, delivering the primary business value of equipment
tracking. It establishes the data model, CRUD operations, and basic UI for managing PLC and equipment records
with proper site hierarchy organization.

## Story 4.1: Inventory Database Schema

As a database administrator,
I want the equipment inventory tables properly structured,
so that all equipment data is stored efficiently with proper relationships.

### Acceptance Criteria

1: equipment_inventory table created with columns: id, description, make, model, ip, site_name, cell_type, cell_id
2: equipment_id and equipment_type columns link to equipment classification system
3: tags column implemented as TEXT array with GIN index for fast searching
4: Unique constraint on IP address where not null using partial index
5: Foreign key to users table for created_by and updated_by tracking
6: Indexes created on site_name, cell_type, and make/model for query performance
7: TypeORM entities created with proper decorators matching schema
8: Migration includes seed data for testing with 50 sample records

## Story 4.2: Equipment CRUD API

As an API developer,
I want RESTful endpoints for equipment management,
so that the frontend can perform all necessary operations.

### Acceptance Criteria

1: POST /api/equipment creates new equipment with validation
2: GET /api/equipment lists all equipment with pagination (default 50 per page)
3: GET /api/equipment/:id returns single equipment record with full details
4: PUT /api/equipment/:id updates equipment with optimistic locking
5: DELETE /api/equipment/:id soft deletes equipment, preserving audit trail
6: All endpoints validate user permissions based on role
7: Joi schemas validate all input fields with appropriate rules
8: API returns consistent error format with field-level validation errors

## Story 4.3: Equipment List UI

As an engineer,
I want to view all equipment in a searchable list,
so that I can quickly find specific PLCs or controllers.

### Acceptance Criteria

1: Equipment list page displays data grid with virtual scrolling
2: Default columns show: description, make, model, IP, site, cell type
3: Search box filters across all text fields with debouncing
4: Column headers allow sorting with visual indicators
5: Click on row navigates to equipment detail/edit view
6: Bulk selection checkboxes enable multi-record operations
7: Empty state displays helpful message when no records found
8: Loading state shows skeleton screen during data fetch

## Story 4.4: Equipment Form UI

As an engineer,
I want to create and edit equipment records through an intuitive form,
so that I can maintain accurate inventory data.

### Acceptance Criteria

1: Form displays all equipment fields with appropriate input types
2: Site name autocompletes from existing values in database
3: Tag input allows adding multiple tags with chip display
4: IP address field validates format and checks uniqueness
5: Save button disabled until form is valid
6: Success/error notifications display after save attempts
7: Cancel button prompts if unsaved changes exist
8: Form pre-populates when editing existing equipment

## Story 4.5: Site Hierarchy Management

As a **process engineer**,  
I want **to organize equipment by site hierarchy**,  
so that **I can quickly locate equipment by physical location and organization structure**.

### Acceptance Criteria

1: Site dropdown populated from existing equipment data
2: Cell type and cell ID fields with validation
3: Hierarchical display option in equipment listing
4: Filtering by site, cell type, and cell ID
5: Site hierarchy validation prevents orphaned records
