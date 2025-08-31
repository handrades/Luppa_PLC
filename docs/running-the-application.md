# Running the Luppa PLC Application

> **Quick Start?** See [QUICK_START.md](../QUICK_START.md) for the fastest way to get running!

## Overview

The Luppa PLC Inventory system consists of multiple services that work together:

- **PostgreSQL Database** - Primary data storage
- **Redis** - Session management and caching
- **API Server** - Backend Node.js/Express application
- **Web Frontend** - React/Vite application
- **Nginx** - Reverse proxy for routing

## Different Deployment Configurations

### 1. Development Environment (`config/docker-compose.dev.yml`)

- **Purpose**: Local development with hot-reload
- **Ports**:
  - Web: <http://localhost:3100> (Vite dev server)
  - API: <http://localhost:3010>
  - PostgreSQL: localhost:5433
  - Redis: localhost:6380
  - Nginx: <http://localhost:3011>
- **Features**: Hot-reload, debug logging, volume mounts for code

### 2. Production Environment (`docker-compose.prod.yml`)

- **Purpose**: Production-like setup for testing
- **Ports**:
  - Application: <http://localhost> (port 80/443)
- **Features**: Optimized builds, production configs, SSL support

### 3. Swarm Deployment (`infrastructure/swarm/docker-compose.swarm.yml`)

- **Purpose**: High-availability production deployment
- **Features**: Load balancing, rolling updates, monitoring stack (Grafana/Prometheus)

## Quick Start - Running the Full Application

### Prerequisites

- Docker and Docker Compose installed
- PowerShell (for psake tasks) or bash
- Node.js 18+ and pnpm installed
- At least 4GB RAM available

### Method 1: Using VSCode Tasks (Recommended)

1. **Start All Services**:
   - Press `Ctrl+Shift+P` → "Tasks: Run Task" → "Docker: Start All Services"
   - Or from terminal: `pwsh -c "Invoke-psake DockerUp"`

2. **Check Status**:
   - Run task: "Docker: Status"
   - Or from terminal: `pwsh -c "Invoke-psake DockerStatus"`

3. **Access the Application**:
   - Main App (via Nginx): <http://localhost:3011>
   - Direct Frontend: <http://localhost:3100>
   - Direct API: <http://localhost:3010>
   - API Health: <http://localhost:3010/health>

### Method 2: Using Docker Compose Directly

```bash
# Set environment variables
export COMPOSE_PROJECT_NAME=luppa-dev
export ALLOWED_ORIGINS="http://localhost:3011,http://localhost:3010,http://localhost:3100,http://localhost:3000,http://localhost:5173,http://localhost:4173"

# Start all services
docker compose -f config/docker-compose.dev.yml up -d

# Check status
docker compose -f config/docker-compose.dev.yml ps

# View logs
docker compose -f config/docker-compose.dev.yml logs -f

# Stop all services
docker compose -f config/docker-compose.dev.yml down
```

### Method 3: Using pnpm Scripts (Development Mode)

```bash
# Install dependencies first
pnpm install

# Run database migrations
cd apps/api
pnpm migration:run

# Start services individually (in separate terminals)
# Terminal 1: Start database and Redis
docker compose -f config/docker-compose.dev.yml up postgres redis

# Terminal 2: Start API
cd apps/api
pnpm dev

# Terminal 3: Start Frontend
cd apps/web
pnpm dev
```

## Service URLs and Ports

| Service      | Container Name     | Internal Port | External Port | URL                     |
| ------------ | ------------------ | ------------- | ------------- | ----------------------- |
| Nginx Proxy  | luppa-nginx-dev    | 80            | 3011          | <http://localhost:3011> |
| Web Frontend | luppa-web-dev      | 5173          | 3100          | <http://localhost:3100> |
| API Backend  | luppa-api-dev      | 3010          | 3010          | <http://localhost:3010> |
| PostgreSQL   | luppa-postgres-dev | 5432          | 5433          | localhost:5433          |
| Redis        | luppa-redis-dev    | 6379          | 6380          | localhost:6380          |

## Common Operations

### View Logs

```bash
# All services
pwsh -c "Invoke-psake DockerLogs"

# Specific service
docker compose -f config/docker-compose.dev.yml logs -f api
docker compose -f config/docker-compose.dev.yml logs -f web
```

### Reset Database

```bash
pwsh -c "Invoke-psake DockerResetDb"
```

### Run Database Migrations

```bash
docker compose -f config/docker-compose.dev.yml exec api npm run migration:run
```

### Seed Database with Sample Data

```bash
docker compose -f config/docker-compose.dev.yml exec api npm run seed
```

### Access Database Console

```bash
pwsh -c "Invoke-psake DockerPsql"
# or
docker compose -f config/docker-compose.dev.yml exec postgres psql -U postgres -d luppa_dev
```

### Rebuild Services (After Code Changes)

```bash
pwsh -c "Invoke-psake DockerBuild"
```

## Troubleshooting

### Services Not Starting

1. Check Docker is running: `docker version`
2. Check port conflicts: `netstat -an | grep -E "3010|3100|3011|5433|6380"`
3. View logs: `docker compose -f config/docker-compose.dev.yml logs`

### Database Connection Issues

1. Ensure PostgreSQL is healthy: `docker compose -f config/docker-compose.dev.yml ps postgres`
2. Check migrations: `docker compose -f config/docker-compose.dev.yml exec api npm run migration:status`
3. Reset if needed: `pwsh -c "Invoke-psake DockerResetDb"`

### Frontend Not Loading

1. Check API health: <http://localhost:3010/health>
2. Verify CORS settings in .env
3. Check browser console for errors

### Memory Issues

Adjust Docker Desktop memory allocation to at least 4GB in Docker Desktop settings.

## Environment Variables

Create a `.env` file in the root directory with:

```env
# Database
POSTGRES_DB=luppa_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev_password
POSTGRES_PORT=5433

# Redis
REDIS_PASSWORD=dev_redis_password
REDIS_PORT=6380

# API
API_PORT=3010
JWT_SECRET=dev-jwt-secret-that-is-at-least-32-characters-long-for-development

# Frontend
VITE_API_URL=http://localhost:3011/api/v1

# CORS
ALLOWED_ORIGINS=http://localhost:3011,http://localhost:3010,http://localhost:3100,http://localhost:3000,http://localhost:5173,http://localhost:4173
```

## Development Workflow

1. **Start the stack**: `pwsh -c "Invoke-psake DockerUp"`
2. **Make code changes** - they auto-reload in development mode
3. **Run tests**: `pnpm test`
4. **Check linting**: `pnpm lint`
5. **View logs**: `pwsh -c "Invoke-psake DockerLogs"`
6. **Stop when done**: `pwsh -c "Invoke-psake DockerDown"`

## Production Deployment

For production deployment, use the swarm configuration:

```bash
# Initialize swarm (if not already)
docker swarm init

# Deploy stack
docker stack deploy -c infrastructure/swarm/docker-compose.swarm.yml luppa-prod

# Check status
docker stack services luppa-prod
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [psake Build System](https://github.com/psake/psake)
- [Application Architecture](./architecture/overview.md)
