# Frontend Application Verification Guide

This guide helps you verify that the frontend application scaffolding from
Story 0.3 is working correctly.

## Quick Verification Steps

### 1. Using Psake Commands (Recommended)

```powershell
# Build both applications
Invoke-psake Build

# Start API server (in one terminal)
Invoke-psake StartApi

# Start web application (in another terminal)
Invoke-psake StartWeb

# Run frontend tests
cd apps/web && pnpm test

# Run all linting and validation
Invoke-psake CI
```

### 2. Using VS Code Tasks

Press `Ctrl+Shift+P` and type "Tasks: Run Task", then select:

- **Start API Server** - Starts backend on port 3010
- **Start Web Application** - Starts frontend on port 3100 (with API proxy)
- **Build All Applications** - Production build
- **Psake: CI** - Full validation pipeline

**Note:** Use direct command for frontend tests: `cd apps/web && pnpm test`

### 3. Manual Verification

```powershell
# Navigate to web directory
cd apps/web

# Install dependencies (if needed)
pnpm install

# Start development server
pnpm dev

# In another terminal - run tests
pnpm test

# Build for production
pnpm build
```

## What to Verify

### ✅ Frontend Application Features

1. **Application Loads**: Navigate to `http://localhost:3100`
2. **Dashboard Page**: Should show PLC inventory dashboard with cards
3. **Navigation**: Click menu icon to open sidebar navigation
4. **Routing**:
   - `/` - Dashboard page
   - `/login` - Login form
   - `/equipment` - Equipment page
   - Any invalid URL - 404 page
5. **Material-UI Theme**: Industrial blue colors and typography
6. **Responsive Design**: Try resizing browser window

### ✅ API Integration

1. **Health Check**: `http://localhost:3010/health` should return JSON status
2. **Proxy Working**: Frontend API calls route through `/api/*` to backend
3. **Error Handling**: API errors are caught and logged properly

### ✅ Development Workflow

1. **Hot Reload**: Edit a React component and see instant updates
2. **TypeScript**: No TypeScript errors in VS Code
3. **Linting**: No ESLint errors
4. **Testing**: All tests pass
5. **Build**: Production build completes successfully

## Expected Results

### Dashboard Page

- Header with "Luppa Inventory" title and menu icon
- Four metric cards showing "Total PLCs", "Online", "Alerts", "Sites"
  (all showing 0)
- "Recent Activity" section

### Login Page

- Centered login form with username/password fields
- "Sign In" button
- Industrial styling

### Equipment Page

- "Add PLC" button (disabled)
- Empty state message about no PLCs found

### 404 Page

- "404 Page Not Found" message
- "Back to Dashboard" button

## Troubleshooting

### Port Conflicts

- Frontend defaults to port 3100, will auto-increment if busy
- Backend runs on port 3010
- Check for conflicts with `lsof -i :3100` or `lsof -i :3010`

### Build Issues

- Run `pnpm install` in both `apps/api` and `apps/web`
- Check Node.js version (should be 18+)
- Verify pnpm is installed globally

### Proxy Issues

- Ensure backend is running on port 3010 before starting frontend
- Check browser network tab for failed `/api/*` requests
- Verify Vite proxy configuration in `apps/web/vite.config.ts`

## File Structure Verification

The following key files should exist:

```text
apps/web/
├── package.json                   # Dependencies and scripts
├── vite.config.ts                # Build and proxy config
├── src/
│   ├── App.tsx                   # Main app with routing
│   ├── main.tsx                  # React entry point
│   ├── components/
│   │   └── common/
│   │       ├── Layout/
│   │       │   ├── AppLayout.tsx
│   │       │   ├── Header.tsx
│   │       │   └── Sidebar.tsx
│   │       └── Feedback/
│   │           ├── ErrorBoundary.tsx
│   │           └── LoadingSpinner.tsx
│   ├── pages/
│   │   ├── auth/LoginPage.tsx
│   │   ├── dashboard/DashboardPage.tsx
│   │   ├── plcs/EquipmentPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── services/
│   │   ├── api.client.ts
│   │   └── auth.service.ts
│   ├── styles/
│   │   ├── theme.ts             # Material-UI theme
│   │   └── globals.css
│   └── utils/
│       ├── api-health.ts
│       └── env.ts
└── .env.example                 # Environment variables template
```

## Success Criteria

✅ All applications build without errors
✅ Frontend loads on <http://localhost:3100>
✅ Backend API responds on <http://localhost:3010/health>
✅ All routes work (dashboard, login, equipment, 404)
✅ Navigation and UI components function properly
✅ Tests pass
✅ Linting passes
✅ No TypeScript errors

If all items above are working, the frontend application scaffolding is
successfully implemented!
