# Responsiveness Strategy

## Breakpoints

| Breakpoint | Min Width | Max Width | Target Devices |
|------------|-----------|-----------|----------------|
| Mobile | 320px | 599px | Phones (emergency access only) |
| Tablet | 600px | 959px | Industrial tablets, rugged tablets, field devices |
| Desktop | 960px | 1279px | Control room workstations, office desktops |
| Wide | 1280px | - | Large monitors, multi-monitor setups, control centers |

## Adaptation Patterns

**Layout Changes:**

- **Desktop/Wide:** Multi-column layouts with sidebar navigation, full data tables, multiple concurrent views
- **Tablet:** Single-column primary content with collapsible navigation, card-based data display, touch-optimized spacing
- **Mobile:** Stacked navigation, essential information only, progressive disclosure for complex data

**Navigation Changes:**

- **Desktop/Wide:** Persistent sidebar with full labels, breadcrumb navigation, tabbed interfaces
- **Tablet:** Collapsible drawer navigation, prominent search, swipe gestures for quick actions
- **Mobile:** Bottom navigation or hamburger menu, search-first approach, simplified hierarchy

**Content Priority:**

- **Desktop/Wide:** High information density, multiple data columns, detailed status information, advanced filtering always visible
- **Tablet:** Key information prioritized, secondary details on tap/expand, simplified filtering with drawer panels
- **Mobile:** Essential data only, drill-down for details, single-action focus

**Interaction Changes:**

- **Desktop/Wide:** Hover states, right-click context menus, keyboard shortcuts, multi-selection with Shift/Ctrl
- **Tablet:** Touch-first interactions, long-press context menus, swipe gestures, drag-and-drop for reordering
- **Mobile:** Large touch targets, tap-to-reveal actions, pull-to-refresh, simplified gestures
