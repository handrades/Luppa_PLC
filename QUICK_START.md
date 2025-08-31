# 🚀 Luppa PLC - Quick Start Guide

## You ARE Running the Full Application!

When you run the Docker tasks from VSCode, you're running the **complete application stack**:

✅ **PostgreSQL Database** (Port 5433)  
✅ **Redis Cache** (Port 6380)  
✅ **API Backend** (Port 3010)  
✅ **React Frontend** (Port 3100)  
✅ **Nginx Reverse Proxy** (Port 3011) - **This is your main entry point!**

## How to Start the Full Application

### Option 1: VSCode Tasks (Easiest)

1. Press `Ctrl+Shift+P` → "Tasks: Run Task"
2. Choose: **🚀 Start Full Application Stack**
3. Wait for all services to start
4. Open: **<http://localhost:3011>**

### Option 2: PowerShell Script

```powershell
./start-app.ps1
```

### Option 3: Direct Command

```powershell
pwsh -c "Invoke-psake DockerUp"
```

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Main Application** | <http://localhost:3011> | Full app via Nginx (USE THIS!) |
| API Health Check | <http://localhost:3010/health> | Direct API health endpoint |
| Direct Frontend | <http://localhost:3100> | Vite dev server (hot reload) |
| Direct API | <http://localhost:3010> | Express API server |

## What's the Difference Between Configurations?

### 1. Development (`config/docker-compose.dev.yml`) - **You're Using This!**

- What you run with VSCode tasks
- Hot-reload enabled
- Debug logging
- All services containerized
- Perfect for development

### 2. Production (`docker-compose.prod.yml`)

- Optimized builds
- No hot-reload
- Production configs
- SSL support
- For testing production setup locally

### 3. Swarm (`infrastructure/swarm/docker-compose.swarm.yml`)

- For actual production deployment
- High availability with replicas
- Load balancing
- Monitoring stack (Grafana/Prometheus)
- Used when deploying to server clusters

## Common Commands

```powershell
# Check if everything is running
pwsh -c "Invoke-psake DockerStatus"

# View logs
pwsh -c "Invoke-psake DockerLogs"

# Stop everything
pwsh -c "Invoke-psake DockerDown"

# Restart everything
pwsh -c "Invoke-psake DockerRestart"

# Reset database
pwsh -c "Invoke-psake DockerResetDb"
```

## Architecture Diagram

```text
Internet Browser
       ↓
[http://localhost:3011]
       ↓
   NGINX (Port 3011)
    ├─────────────┤
    ↓             ↓
Frontend      API Backend
(Port 3100)   (Port 3010)
                  ↓
            ┌─────┴─────┐
            ↓           ↓
        PostgreSQL    Redis
        (Port 5433)  (Port 6380)
```

## Troubleshooting

### "I don't see my changes!"

- Frontend changes: Should auto-reload at <http://localhost:3011>
- API changes: Should auto-restart (watch the logs)
- If not working: `pwsh -c "Invoke-psake DockerRestart"`

### "Port already in use"

Check what's using the ports:

```powershell
netstat -an | findstr "3011 3010 3100 5433 6380"
```

### "Services won't start"

1. Check Docker is running: `docker version`
2. Check logs: `pwsh -c "Invoke-psake DockerLogs"`
3. Reset everything: `pwsh -c "Invoke-psake DockerDown"` then `DockerUp`

## You're All Set! 🎉

You've been running the full application all along! The Docker setup includes everything:

- Database with migrations
- Redis caching
- Full API with authentication
- Complete React frontend
- Nginx routing everything properly

**Just use <http://localhost:3011> and you have the complete system!**
