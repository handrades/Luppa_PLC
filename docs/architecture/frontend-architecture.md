# Frontend Architecture

## Component Architecture

### Component Organization

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

### Component Template

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
  ipAddress: z
    .string()
    .trim()
    .ip({ version: 'v4' })
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
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

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Partial<PLCInput>>({
    resolver: zodResolver(plcSchema),
    defaultValues: {
      tagId: '',
      description: '',
      make: '',
      model: '',
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

  const onSubmit = (data: Partial<PLCInput>) => {
    // Zod validation ensures all required fields are present
    createPLCMutation.mutate(data as PLCInput);
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

## State Management Architecture

### State Structure

```typescript
// stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
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
      isLoading: false,

      login: async credentials => {
        set({ isLoading: true });
        try {
          const response = await authService.login(credentials);
          set({
            user: response.user,
            token: response.token,
            isLoading: false,
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
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);

// Selector for isAuthenticated
export const useIsAuthenticated = () => useAuthStore(state => !!state.token);

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

export const usePLCStore = create<PLCState>(set => ({
  plcs: [],
  filters: {},
  isLoading: false,

  fetchPLCs: async filters => {
    set({ isLoading: true });
    try {
      const plcs = await plcService.getPLCs(filters);
      set({ plcs, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setFilters: filters => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));
```
