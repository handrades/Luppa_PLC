# Information Architecture (IA)

## Site Map / Screen Inventory

```mermaid
graph TD
    A[Login] --> B[Dashboard]
    B --> C[Equipment Management]
    B --> D[Reports & Analytics]
    B --> E[Administration]
    B --> F[User Profile]
    
    C --> C1[Equipment List]
    C --> C2[Add Equipment]
    C --> C3[Bulk Import/Export]
    C --> C4[Advanced Search]
    
    C1 --> C1a[Equipment Details]
    C1a --> C1b[Edit Equipment]
    
    D --> D1[Analytics Dashboard]
    D --> D2[Compliance Reports]
    D --> D3[Audit Trail]
    D --> D4[Site Hierarchy View]
    
    E --> E1[User Management]
    E --> E2[Role Management]
    E --> E3[System Settings]
    E --> E4[App Configuration]
    
    F --> F1[Profile Settings]
    F --> F2[Logout]
```

## Navigation Structure

**Primary Navigation:** Top-level app areas (Dashboard, Equipment, Reports, Admin) - persistent header
optimized for desktop efficiency and tablet accessibility

**Secondary Navigation:** Context-sensitive sidebar for sub-functions within each area, collapsible on
tablet devices for space efficiency

**Breadcrumb Strategy:** Essential for multi-level equipment hierarchy (Site > Cell Type > Cell ID >
Equipment), providing clear location context and quick navigation back to parent levels
