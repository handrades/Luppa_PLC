# ADR-0003: Use React with Material-UI for Frontend

## Status

**Status:** Accepted  
**Date:** 2025-01-24  
**Supersedes:** N/A  
**Superseded by:** N/A

## Context

The Industrial Inventory Multi-App Framework requires a frontend technology stack that can:

1. **Industrial UI Requirements**: Support touch-friendly interfaces optimized for tablets and industrial environments
2. **Component Reusability**: Enable building a shared component library across multiple applications
3. **Performance**: Deliver responsive user experience with <2 second initial load and <500ms navigation
4. **Developer Experience**: Provide excellent TypeScript integration and development tooling
5. **Accessibility**: Meet industrial accessibility requirements for diverse user capabilities
6. **Offline Capability**: Function in air-gapped industrial networks with limited connectivity
7. **Maintainability**: Support long-term maintenance by solo developer with moderate frontend experience

## Decision

We will use **React 18+** with **Material-UI (MUI) v5+** as the primary frontend framework and component library for the Industrial Inventory Multi-App Framework.

## Rationale

### React Advantages

1. **Mature Ecosystem**
   - Extensive community support and documentation
   - Rich ecosystem of libraries and tools
   - Proven track record in enterprise applications
   - Strong TypeScript integration

2. **Component Architecture**
   - Natural fit for building reusable component libraries
   - Clear separation of concerns with hooks and components
   - Excellent testability with React Testing Library
   - Supports micro-frontend patterns for multi-app architecture

3. **Performance Characteristics**
   - Virtual DOM optimization for efficient updates
   - Code splitting and lazy loading support
   - Server-side rendering capabilities (future consideration)
   - Concurrent features for better user experience

4. **Developer Experience**
   - Excellent TypeScript integration
   - Rich development tools (React DevTools)
   - Hot reloading and fast refresh
   - Large talent pool and learning resources

### Material-UI Advantages

1. **Industrial-Friendly Design**
   - Touch-friendly components with appropriate sizing
   - High contrast themes suitable for industrial environments
   - Accessible by default with ARIA support
   - Responsive design system that works on tablets and desktops

2. **Comprehensive Component Library**
   - Complete set of UI components reducing development time
   - Advanced components like DataGrid for industrial data display
   - Form components with built-in validation support
   - Navigation components suitable for complex applications

3. **Customization and Theming**
   - Powerful theming system for brand consistency
   - CSS-in-JS approach eliminates style conflicts
   - Dark mode support for industrial environments
   - Custom component variants for specific use cases

4. **Enterprise Features**
   - Data grid with virtualization for large datasets
   - Advanced form handling with validation
   - Internationalization support
   - Tree view and hierarchical data display

### Technology Stack Comparison

| Aspect                 | React + MUI  | Vue + Vuetify | Angular + Angular Material | Svelte + Carbon |
| ---------------------- | ------------ | ------------- | -------------------------- | --------------- |
| **Learning Curve**     | ⚠️ Medium    | ✅ Easy       | ❌ High                    | ⚠️ Medium       |
| **TypeScript Support** | ✅ Excellent | ⚠️ Good       | ✅ Native                  | ⚠️ Good         |
| **Component Quality**  | ✅ Excellent | ✅ Good       | ✅ Excellent               | ⚠️ Limited      |
| **Industrial UI**      | ✅ Excellent | ⚠️ Good       | ✅ Good                    | ⚠️ Limited      |
| **Performance**        | ✅ Good      | ✅ Excellent  | ⚠️ Good                    | ✅ Excellent    |
| **Ecosystem**          | ✅ Massive   | ⚠️ Good       | ✅ Large                   | ⚠️ Growing      |
| **Enterprise Use**     | ✅ Proven    | ⚠️ Growing    | ✅ Proven                  | ❌ Limited      |
| **Bundle Size**        | ⚠️ Medium    | ✅ Small      | ❌ Large                   | ✅ Small        |
| **Documentation**      | ✅ Excellent | ✅ Good       | ✅ Excellent               | ⚠️ Good         |
| **Solo Developer**     | ✅ Good      | ✅ Excellent  | ❌ Complex                 | ⚠️ Good         |

## Implementation Plan

### Phase 1: Foundation Setup

```typescript
// Theme configuration for industrial environments
import { createTheme } from "@mui/material/styles";

const industrialTheme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // Blue for reliability
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#dc004e", // Red for alerts/warnings
    },
    background: {
      default: "#f5f5f5", // Light gray for reduced eye strain
      paper: "#ffffff",
    },
  },
  components: {
    // Increase touch targets for industrial use
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // Touch-friendly minimum
          fontSize: "1rem",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          minHeight: 56, // Larger input fields
        },
      },
    },
  },
  typography: {
    // Optimized for industrial displays
    fontSize: 16, // Larger base font
    h1: { fontSize: "2.5rem" },
    h2: { fontSize: "2rem" },
    body1: { fontSize: "1rem", lineHeight: 1.6 },
  },
});
```

### Phase 2: Component Library Structure

```typescript
// Shared component library structure
export * from './components/DataDisplay';  // Tables, charts, metrics
export * from './components/Forms';        // Industrial form components
export * from './components/Feedback';     // Loading, errors, notifications
export * from './components/Navigation';   // Breadcrumbs, menus, tabs
export * from './components/Layout';       // Grid, containers, sidebars

// Example industrial-specific component
interface PlcStatusChipProps {
  status: 'online' | 'offline' | 'unknown';
  size?: 'small' | 'medium';
}

export const PlcStatusChip: React.FC<PlcStatusChipProps> = ({
  status,
  size = 'medium'
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Chip
      label={status.toUpperCase()}
      color={getStatusColor(status)}
      size={size}
      variant="filled"
    />
  );
};
```

### Phase 3: Performance Optimization

```typescript
// Code splitting for multi-app support
import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

const PlcInventoryApp = lazy(() => import('./apps/PlcInventoryApp'));
const MaintenanceApp = lazy(() => import('./apps/MaintenanceApp'));

// Loading fallback for better UX
const AppLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress size={60} />
  </Box>
);

// Route-based code splitting
export const AppRouter = () => (
  <Routes>
    <Route
      path="/inventory/*"
      element={
        <Suspense fallback={<AppLoader />}>
          <PlcInventoryApp />
        </Suspense>
      }
    />
    <Route
      path="/maintenance/*"
      element={
        <Suspense fallback={<AppLoader />}>
          <MaintenanceApp />
        </Suspense>
      }
    />
  </Routes>
);
```

## State Management Strategy

### Zustand for Global State

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppStore {
  // User preferences
  theme: "light" | "dark";
  sidebarCollapsed: boolean;

  // Application state
  selectedPlcs: string[];
  filters: PlcFilters;

  // Actions
  setTheme: (theme: "light" | "dark") => void;
  toggleSidebar: () => void;
  setSelectedPlcs: (ids: string[]) => void;
  updateFilters: (filters: Partial<PlcFilters>) => void;
}

const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarCollapsed: false,
      selectedPlcs: [],
      filters: {},

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
      setSelectedPlcs: (selectedPlcs) => set({ selectedPlcs }),
      updateFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),
    }),
    {
      name: "app-storage",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
```

### React Query for Server State

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Custom hooks for data fetching
export const usePlcs = (filters?: PlcFilters) => {
  return useQuery({
    queryKey: ["plcs", filters],
    queryFn: () => plcApi.getPlcs(filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true, // Refresh when user returns
  });
};

export const useCreatePlc = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: plcApi.createPlc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plcs"] });
    },
  });
};
```

## Industrial UI Patterns

### Data-Dense Displays

```typescript
// Industrial data table with virtualization
import { DataGrid } from '@mui/x-data-grid';

const PlcDataGrid: React.FC<PlcDataGridProps> = ({ plcs, loading }) => {
  const columns = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'description', headerName: 'Description', flex: 1 },
    { field: 'make', headerName: 'Make', width: 120 },
    { field: 'model', headerName: 'Model', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <PlcStatusChip status={params.value} />
    },
    { field: 'ipAddress', headerName: 'IP Address', width: 140 },
    {
      field: 'lastSeen',
      headerName: 'Last Seen',
      width: 180,
      type: 'dateTime',
    },
  ];

  return (
    <DataGrid
      rows={plcs}
      columns={columns}
      loading={loading}
      pageSizeOptions={[25, 50, 100]}
      initialState={{
        pagination: { paginationModel: { pageSize: 50 } },
      }}
      checkboxSelection
      disableRowSelectionOnClick
      autoHeight
    />
  );
};
```

### Touch-Friendly Controls

```typescript
// Industrial control panel with large touch targets
const PlcControlPanel: React.FC<PlcControlPanelProps> = ({ plc, onUpdate }) => (
  <Box display="flex" gap={2} flexWrap="wrap">
    <Button
      variant="contained"
      size="large"
      startIcon={<PlayArrowIcon />}
      sx={{ minWidth: 120, minHeight: 56 }}
      onClick={() => onUpdate(plc.id, { status: 'online' })}
    >
      Start
    </Button>
    <Button
      variant="contained"
      color="error"
      size="large"
      startIcon={<StopIcon />}
      sx={{ minWidth: 120, minHeight: 56 }}
      onClick={() => onUpdate(plc.id, { status: 'offline' })}
    >
      Stop
    </Button>
    <Button
      variant="outlined"
      size="large"
      startIcon={<RestartAltIcon />}
      sx={{ minWidth: 120, minHeight: 56 }}
      onClick={() => onUpdate(plc.id, { action: 'restart' })}
    >
      Restart
    </Button>
  </Box>
);
```

## Consequences

### Positive Consequences

1. **Rapid Development**: Rich component library accelerates development
2. **Consistent UI**: Material Design ensures professional, consistent interface
3. **Accessibility**: Built-in accessibility features meet industrial requirements
4. **Mobile-First**: Responsive design works well on tablets and mobile devices
5. **Type Safety**: Excellent TypeScript integration prevents runtime errors
6. **Community Support**: Large ecosystem provides solutions for complex requirements
7. **Performance**: Modern React features enable excellent user experience

### Negative Consequences

1. **Bundle Size**: Material-UI adds significant JavaScript bundle size (~300KB gzipped)
2. **Learning Curve**: Developers need to learn React patterns and MUI theming system
3. **Customization Complexity**: Deep customization requires understanding MUI internals
4. **Runtime Overhead**: CSS-in-JS approach has performance implications
5. **Version Management**: Keeping React and MUI versions synchronized

### Risk Mitigation

1. **Bundle Size**: Use tree shaking and code splitting to minimize bundle size
2. **Performance**: Implement proper memoization and lazy loading patterns
3. **Learning**: Comprehensive documentation and examples for team onboarding
4. **Customization**: Create design system documentation with approved patterns
5. **Testing**: Comprehensive component testing with React Testing Library

## Performance Optimization

### Bundle Optimization

```typescript
// Tree shaking - import specific components
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
// Instead of: import { Button, TextField } from '@mui/material';

// Dynamic imports for large components
const DataGrid = lazy(() =>
  import("@mui/x-data-grid").then((module) => ({
    default: module.DataGrid,
  })),
);
```

### Rendering Optimization

```typescript
// Memoization for expensive components
const PlcList = memo(({ plcs, onSelect }: PlcListProps) => {
  const sortedPlcs = useMemo(
    () => plcs.sort((a, b) => a.description.localeCompare(b.description)),
    [plcs]
  );

  return (
    <List>
      {sortedPlcs.map(plc => (
        <PlcListItem key={plc.id} plc={plc} onSelect={onSelect} />
      ))}
    </List>
  );
});
```

## Monitoring and Success Metrics

### Performance Metrics

- Initial load time: <2 seconds
- Navigation time: <500ms
- Largest Contentful Paint: <2.5 seconds
- First Input Delay: <100ms
- Cumulative Layout Shift: <0.1

### User Experience Metrics

- Touch target compliance: 100% (min 44px)
- Accessibility score: >95% (WAVE/axe)
- Mobile usability: 100% (Google PageSpeed)
- Component reusability: >80% shared components across apps

## Review and Evolution

This decision will be reviewed:

- After Epic 3 completion (frontend framework implementation)
- When React 19 is released (concurrent features evaluation)
- When Material-UI v6 is released (new features assessment)
- If performance issues can't be resolved with optimization
- When new industrial UI requirements emerge

## References

- [React Documentation](https://react.dev/)
- [Material-UI Documentation](https://mui.com/)
- [React Query Documentation](https://tanstack.com/query/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Industrial UI Design Guidelines](https://www.iso.org/standard/73973.html)

## Related ADRs

- ADR-0004: Use Vite for Frontend Build System
- ADR-0005: Use Zustand for Client State Management
- ADR-0006: Implement Component Library for Multi-App Support
