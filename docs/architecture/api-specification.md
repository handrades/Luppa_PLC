# API Specification

## REST API Specification

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
  parameters:
    PageParam:
      name: page
      in: query
      description: Page number for pagination
      required: false
      schema:
        type: integer
        minimum: 1
        default: 1
    PageSizeParam:
      name: pageSize
      in: query
      description: Number of items per page
      required: false
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
    SiteIdParam:
      name: siteId
      in: path
      description: Unique identifier for the site
      required: true
      schema:
        type: string
        format: uuid
    CellIdParam:
      name: cellId
      in: path
      description: Unique identifier for the cell
      required: true
      schema:
        type: string
        format: uuid
    EquipmentIdParam:
      name: equipmentId
      in: path
      description: Unique identifier for the equipment
      required: true
      schema:
        type: string
        format: uuid
    PLCIdParam:
      name: plcId
      in: path
      description: Unique identifier for the PLC
      required: true
      schema:
        type: string
        format: uuid

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
