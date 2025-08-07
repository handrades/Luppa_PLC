# Troubleshooting Guide

## Common Development Issues and Solutions

This guide covers common issues you might encounter when developing with the Luppa PLC Inventory Framework.

## Table of Contents

- [Setup Issues](#setup-issues)
- [Development Environment](#development-environment)
- [Database Problems](#database-problems)
- [Build and Test Issues](#build-and-test-issues)
- [Docker Issues](#docker-issues)
- [Git and Commit Issues](#git-and-commit-issues)
- [IDE and Editor Issues](#ide-and-editor-issues)
- [Performance Issues](#performance-issues)

## Setup Issues

### `pnpm install` fails with permission errors

**Problem**: Permission denied errors during dependency installation.

**Solution**:

```powershell
# Clear pnpm cache
pnpm store prune

# Install with explicit registry
pnpm install --registry https://registry.npmjs.org/

# If still failing, try with elevated permissions (Windows)
# Run PowerShell as Administrator
```

### `pnpm install` hangs or is very slow

**Problem**: Network issues or cache problems.

**Solution**:

```powershell
# Clear cache and reinstall
pnpm store prune
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
pnpm install
```

### TypeScript compilation errors after fresh install

**Problem**: Version mismatches or missing type definitions.

**Solution**:

```powershell
# Ensure consistent TypeScript version across workspace
pnpm add -D -w typescript@~5.5.4

# Rebuild type definitions
pnpm generate:types

# Clear TypeScript cache
Remove-Item -Recurse -Force apps/*/tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
```

## Development Environment

### API server won't start

**Problem**: Port conflicts, database connection issues, or missing dependencies.

**Symptoms**:

- Error: `listen EADDRINUSE :::3010`
- Database connection timeout
- Module not found errors

**Solutions**:

1. **Port conflicts**:

   ```powershell
   # Check what's using port 3010
   netstat -ano | findstr :3010

   # Kill the process (replace PID)
   taskkill /PID <process_id> /F
   ```

2. **Database connection**:

   ```powershell
   # Ensure Docker is running
   docker info

   # Start database services
   docker-compose -f config/config/docker-compose.dev.yml up -d

   # Check database container status
   docker-compose -f config/config/docker-compose.dev.yml ps
   ```

3. **Missing dependencies**:

   ```powershell
   # Reinstall API dependencies
   pnpm -C apps/api install
   ```

### Frontend development server crashes

**Problem**: Memory issues, dependency conflicts, or build configuration problems.

**Solutions**:

1. **Memory issues**:

   ```powershell
   # Increase Node.js memory limit
   $env:NODE_OPTIONS="--max-old-space-size=4096"
   pnpm -C apps/web dev
   ```

2. **Clear build cache**:

   ```powershell
   # Clear Vite cache
   Remove-Item -Recurse apps/web/node_modules/.vite -ErrorAction SilentlyContinue
   Remove-Item -Recurse apps/web/dist -ErrorAction SilentlyContinue
   ```

### Hot reload not working

**Problem**: File watcher issues or network configuration.

**Solutions**:

1. **Increase file watcher limits (Linux/WSL)**:

   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Check network configuration**:
   - Ensure `localhost:3000` is accessible
   - Check firewall settings
   - Try using `127.0.0.1:3000` instead

## Database Problems

### Cannot connect to database

**Problem**: Database container not running or connection configuration issues.

**Solutions**:

1. **Check Docker containers**:

   ```powershell
   docker-compose -f config/config/docker-compose.dev.yml ps
   docker-compose -f config/config/docker-compose.dev.yml logs postgres
   ```

2. **Reset database container**:

   ```powershell
   docker-compose -f config/config/docker-compose.dev.yml down
   docker-compose -f config/config/docker-compose.dev.yml up -d
   ```

3. **Check environment variables**:
   - Verify `.env` file exists and contains correct database URL
   - Ensure database credentials match `config/docker-compose.dev.yml`

### Migration errors

**Problem**: Database schema conflicts or failed migrations.

**Solutions**:

1. **Reset database completely**:

   ```powershell
   ./scripts/reset-db.ps1 -Confirm
   ```

2. **Manual migration reset**:

   ```powershell
   # Navigate to API directory
   cd apps/api

   # Drop and recreate schema
   npx typeorm schema:drop -d src/config/typeorm.config.ts
   npx typeorm migration:run -d src/config/typeorm.config.ts
   ```

### Database seeding fails

**Problem**: Data conflicts or missing dependencies.

**Solutions**:

1. **Check seed data**:
   - Review `apps/api/src/database/seeds/` files
   - Ensure no duplicate key conflicts

2. **Run seeds individually**:

   ```powershell
   cd apps/api
   npx ts-node src/database/seeds/01-roles.ts
   npx ts-node src/database/seeds/02-users.ts
   ```

## Build and Test Issues

### Build fails with TypeScript errors

**Problem**: Type mismatches, missing imports, or configuration issues.

**Solutions**:

1. **Check for type errors**:

   ```powershell
   pnpm type-check
   ```

2. **Update type definitions**:

   ```powershell
   pnpm generate:types
   ```

3. **Clear build artifacts**:

   ```powershell
   pnpm clean
   pnpm install
   pnpm build
   ```

### Tests fail randomly

**Problem**: Race conditions, database state issues, or asynchronous operation problems.

**Solutions**:

1. **Run tests in isolation**:

   ```powershell
   pnpm test --runInBand
   ```

2. **Reset test database**:

   ```powershell
   # Ensure test database is clean
   $env:NODE_ENV="test"
   ./scripts/reset-db.ps1 -Confirm
   ```

3. **Check test setup**:
   - Verify `setupTests.ts` configurations
   - Ensure proper cleanup in test files

### Linting errors prevent commits

**Problem**: ESLint or Prettier configuration issues.

**Solutions**:

1. **Fix automatically**:

   ```powershell
   pnpm lint:fix
   pnpm format
   ```

2. **Check configuration files**:
   - Verify `config/.eslintrc.cjs`
   - Check `config/.prettierrc`
   - Ensure lint-staged configuration in `package.json`

## Docker Issues

### `pnpm docker:dev` fails with "docker-compose: not found"

**Problem**: Modern Docker installations use `docker compose` (plugin) instead of `docker-compose` (standalone).

**Solution**: This has been fixed in the project. If you still see this error, ensure you have Docker Compose v2+ installed:

```powershell
# Check Docker Compose version
docker compose version

# If not available, install Docker Desktop or Docker Compose plugin
# The project now uses: docker compose -f config/config/docker-compose.dev.yml up
```

### Docker containers start but web app fails with "Cannot find module 'vite'"

**Problem**: Dependencies are not installed before Docker containers start.

**Solution**: Always run the complete setup sequence:

```powershell
# 1. Install dependencies first
pnpm install

# 2. Copy environment file
Copy-Item .env.example .env

# 3. Run initial setup (builds types, sets up database)
pnpm setup

# 4. THEN start Docker containers
pnpm docker:dev
```

**Quick fix if already running**:

```powershell
# Stop containers
pnpm docker:down

# Install dependencies
pnpm install

# Restart containers
pnpm docker:dev
```

### Docker containers won't start

**Problem**: Docker daemon issues, port conflicts, or resource constraints.

**Solutions**:

1. **Check Docker status**:

   ```powershell
   docker info
   docker system df
   ```

2. **Clean up Docker resources**:

   ```powershell
   # Remove unused containers and images
   docker system prune -f

   # Remove project containers specifically
   docker compose -f config/config/docker-compose.dev.yml down --volumes --remove-orphans
   ```

3. **Rebuild containers**:

   ```powershell
   docker compose -f config/config/docker-compose.dev.yml build --no-cache
   docker compose -f config/config/docker-compose.dev.yml up -d
   ```

### "Docker is running but I don't know which URLs to access"

**Problem**: After starting `pnpm docker:dev`, unclear which URLs to use.

**Solution**: Use these URLs to access your application:

**Main Application** (Recommended):

- **<http://localhost:3011>** - Full application via Nginx reverse proxy

**Individual Services** (for debugging):

- **<http://localhost:3010>** - API server direct access
- **<http://localhost:5174>** - Frontend (Vite) direct access
- **<http://localhost:3010/health>** - API health check

**Database connections** (for tools like pgAdmin):

- **PostgreSQL**: `localhost:5433` (user: `postgres`, password: `dev_password`)
- **Redis**: `localhost:6380` (password: `dev_redis_password`)

**Check service status**:

```powershell
# Check running containers
docker compose -f config/config/docker-compose.dev.yml ps

# View logs
docker compose -f config/config/docker-compose.dev.yml logs -f
```

### Docker development fixed - Volume mounting issues resolved

**Fixed Issues** (August 2025):

- ✅ **Docker Compose v2 commands** updated in package.json
- ✅ **Volume mounting** restructured to preserve built dependencies
- ✅ **Web container** now starts successfully with Vite
- ✅ **Database services** working perfectly
- ✅ **React application** loads correctly at <http://localhost:3011>

**Architecture** (Updated):

```yaml
# New volume strategy (fixed):
volumes:
  - ./apps/web/src:/workspace/apps/web/src # Source code hot-reload
  - web-node-modules:/workspace/node_modules # Named volume for deps
  - web-app-node-modules:/workspace/apps/web/node_modules # App-specific deps
```

**Benefits**:

- Hot-reload works for source code changes
- Dependencies preserved in containers
- Faster startup times
- No more "Cannot find module 'vite'" errors

### Container logs show permission errors

**Problem**: File permission issues between host and container.

**Solutions**:

1. **Check file permissions**:

   ```powershell
   # Ensure project files are readable
   icacls . /grant Everyone:F /T
   ```

2. **Review Docker volume mounts**:
   - Check `config/docker-compose.dev.yml` volume configurations
   - Ensure paths are correct

## Git and Commit Issues

### Commit hooks fail

**Problem**: Husky hooks or lint-staged configuration issues.

**Solutions**:

1. **Reinstall Husky**:

   ```powershell
   pnpm husky install
   ```

2. **Check hook permissions**:

   ```powershell
   # Make hooks executable (Linux/WSL)
   chmod +x .husky/*
   ```

3. **Bypass hooks temporarily** (not recommended):

   ```powershell
   git commit -m "message" --no-verify
   ```

### Conventional commit validation fails

**Problem**: Commit message doesn't follow conventional format.

**Solution**:

```powershell
# Use conventional commit format:
# type(scope): description
#
# Examples:
git commit -m "feat(api): add PLC inventory endpoints"
git commit -m "fix(web): resolve authentication redirect issue"
git commit -m "docs: update troubleshooting guide"
```

**Valid types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## IDE and Editor Issues

### VS Code extensions not working

**Problem**: Extension conflicts or configuration issues.

**Solutions**:

1. **Reload VS Code window**:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

2. **Check extension configuration**:
   - Verify `.vscode/settings.json`
   - Check workspace-specific settings

3. **Reinstall problematic extensions**:
   - Disable and re-enable extensions
   - Check extension logs in Output panel

### IntelliSense not working for TypeScript

**Problem**: TypeScript language server issues or workspace configuration.

**Solutions**:

1. **Restart TypeScript server**:
   - Press `Ctrl+Shift+P`
   - Run "TypeScript: Restart TS Server"

2. **Check TypeScript version**:
   - Ensure workspace uses correct TypeScript version
   - Check `.vscode/settings.json` TypeScript configuration

### Debugging not working

**Problem**: Debug configuration issues or source map problems.

**Solutions**:

1. **Check debug configuration**:
   - Verify `.vscode/launch.json`
   - Ensure correct ports and paths

2. **Rebuild source maps**:

   ```powershell
   pnpm build
   ```

## Performance Issues

### Slow build times

**Problem**: Large node_modules, inefficient build configuration, or resource constraints.

**Solutions**:

1. **Use build cache**:

   ```powershell
   # TypeScript incremental compilation is enabled by default
   # Ensure .tsbuildinfo files are not deleted unnecessarily
   ```

2. **Optimize dependencies**:

   ```powershell
   # Analyze bundle size
   pnpm -C apps/web build --report

   # Remove unused dependencies
   pnpm dlx depcheck
   ```

### High memory usage during development

**Problem**: Memory leaks or inefficient development tools.

**Solutions**:

1. **Increase Node.js memory limit**:

   ```powershell
   $env:NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Monitor memory usage**:

   ```powershell
   # Windows Task Manager
   # Or use process monitoring tools
   ```

## Getting Help

If none of these solutions work:

1. **Check logs**:
   - Application logs in `logs/` directory
   - Container logs: `docker-compose -f config/config/docker-compose.dev.yml logs`
   - VS Code Developer Tools: Help → Toggle Developer Tools

2. **Create an issue**:
   - Include error messages
   - Describe steps to reproduce
   - Include environment information:

     ```powershell
     node --version
     pnpm --version
     docker --version
     ```

3. **Environment information**:

   ```powershell
   # System information
   systeminfo | findstr /B /C:"OS Name" /C:"OS Version"

   # PowerShell version
   $PSVersionTable.PSVersion
   ```

## Useful Commands for Debugging

```powershell
# Health checks
curl http://localhost:3010/health
curl http://localhost:3000

# Process monitoring
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Port usage
netstat -ano | findstr :3000
netstat -ano | findstr :3010

# Docker debugging
docker-compose -f config/config/docker-compose.dev.yml logs --tail=50
docker stats

# File permissions (Linux/WSL)
ls -la
chmod -R 755 .

# Network connectivity
Test-NetConnection localhost -Port 3000
Test-NetConnection localhost -Port 3010
```
