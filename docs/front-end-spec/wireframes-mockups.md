# Wireframes & Mockups

## Primary Design Files

**Primary Design Files:** React Storybook + Component Library

- Build components directly in React/TypeScript for living design system
- Use Storybook for component documentation and testing
- Material-UI base with industrial theme customization
- Live, interactive "designs" that are actually functional code

## Key Screen Layouts

### Equipment List/Search (Dual-Device Design)

**Purpose:** Central hub optimized for both desktop efficiency and tablet mobility

**Key Elements:**

- **Desktop:** Full data grid with 8-10 columns, persistent filter sidebar, keyboard navigation support
- **Tablet:** Card-based layout with 4-5 key fields, collapsible filter drawer, touch-optimized interactions
- **Both:** Prominent search bar, bulk action toolbar, quick add button, consistent search logic

**Interaction Notes:**

- **Desktop:** Mouse hover states, right-click context menus, keyboard shortcuts, multi-selection
- **Tablet:** Touch-friendly 44px+ targets, swipe gestures for actions, long-press context menus
- **Both:** Virtual scrolling for 10,000+ records, debounced search, GSAP animations for state transitions

**Design File Reference:** React components in Storybook - DataGrid, SearchFilters, BulkActions

### Equipment Detail/Edit Form (Responsive Approach)

**Purpose:** Comprehensive editing optimized for each device context

**Key Elements:**

- **Desktop:** Two-column form layout, inline validation, tabbed sections for complex data
- **Tablet:** Single-column layout, larger touch targets, accordion sections for organization
- **Both:** Auto-complete dropdowns, tag chips, visual validation feedback, auto-save with confirmation

**Interaction Notes:**

- **Desktop:** Tab navigation between fields, Enter to save, Esc to cancel, keyboard shortcuts
- **Tablet:** Virtual keyboard optimization, touch-friendly date pickers, gesture support
- **Both:** Auto-save with visual confirmation, unsaved changes warnings, consistent validation

**Design File Reference:** React components - EquipmentForm, ValidationFeedback, TagInput

### Dashboard Overview (Context-Aware)

**Purpose:** Information priority adjusted for device usage context

**Key Elements:**

- **Desktop:** Multi-column layout with detailed charts and data tables, concurrent information display
- **Tablet:** Stacked cards prioritizing actionable information, simplified charts, swipe navigation
- **Both:** Status indicators, quick actions, search widget, real-time updates, offline indicators

**Interaction Notes:**

- **Desktop:** Detailed hover tooltips, multiple simultaneous chart interactions, keyboard navigation
- **Tablet:** Touch-optimized charts, swipe navigation between sections, pull-to-refresh
- **Both:** GSAP-animated data transitions, automatic updates every 5 minutes, responsive chart rendering

**Design File Reference:** React components - DashboardGrid, EquipmentChart, StatusIndicators
