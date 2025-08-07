# Industrial Inventory Multi-App Framework - Setup Guide

A comprehensive guide to get the Luppa PLC Industrial Inventory Multi-App Framework up and running on your development machine.

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+ recommended)
- **Memory**: Minimum 8GB RAM (16GB recommended for full Docker environment)
- **Storage**: Minimum 10GB free disk space
- **Network**: Internet connection for initial setup (air-gapped deployment supported after setup)

### Required Software

#### Node.js and Package Manager

```bash
# Install Node.js v20.17.0 (LTS) - required version
# Download from: https://nodejs.org/
node --version  # Should show v20.17.0 or compatible

# Install pnpm (required package manager)
npm install -g pnpm@9.15.0
pnpm --version  # Should show 9.15.0 or compatible
```

#### Docker (For Full Development Environment)

```bash
# Install Docker Desktop (recommended)
# Download from: https://docs.docker.com/desktop/

# Verify installation
docker --version
docker compose version
```

#### PowerShell (For Development Scripts)

- **Windows**: PowerShell 5.1+ (built-in) or PowerShell 7+ (recommended)
- **macOS/Linux**: Install PowerShell 7+

```bash
# Install psake module (required for development scripts)
Install-Module -Name psake -Scope CurrentUser
```

#### Optional Development Tools

```bash
# Git (version control)
git --version

# Visual Studio Code (recommended editor)
# Download from: https://code.visualstudio.com/
```

## Quick Start (30 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/handrades/Luppa_PLC.git
cd Luppa_PLC

# Install all dependencies
pnpm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# Default values are suitable for development
```

### 3. Initial Setup

```bash
# Run complete setup (builds types, sets up database)
pnpm setup
```

### 4. Start Development Environment

Choose one of these options:

#### Option A: Local Development (Recommended for Development)

```bash
# Start API and Web servers locally
pnpm dev

# Access the application
# Web UI: http://localhost:3000
# API: http://localhost:3010
# Health Check: http://localhost:3010/health
```

#### Option B: Full Docker Environment (Production-like)

```bash
# Start all services in Docker
pnpm docker:dev

# Or using PowerShell scripts
Invoke-psake DockerUp

# Access the application
# Web UI: http://localhost:3000
# API (via Nginx): http://localhost:3000/api/health
```

### 5. Verify Installation

```bash
# Run all quality checks
Invoke-psake CI

# Or individual checks
pnpm lint
pnpm test
pnpm type-check
```

## Detailed Setup Instructions

### Environment Configuration

The `.env` file contains essential configuration. Key variables:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luppa_dev
DB_USER=postgres
DB_PASSWORD=dev_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev_redis_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=development
API_PORT=3010
WEB_PORT=3000
```

### Database Setup

#### Using Local PostgreSQL

```bash
# Install PostgreSQL 16+ locally
# Create database
createdb luppa_dev

# Run migrations and seed data
cd apps/api
pnpm db:migrate
pnpm db:seed
```

#### Using Docker PostgreSQL

```bash
# Start PostgreSQL in Docker
Invoke-psake DockerUp

# Database is automatically initialized with migrations and seed data
```

### Development Workflow

#### Project Structure

```text
Luppa_PLC/
├── apps/
│   ├── api/                    # Express.js API server
│   │   ├── src/
│   │   │   ├── entities/       # TypeORM database entities
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── middleware/     # Express middleware
│   │   │   └── config/         # Configuration files
│   │   └── package.json
│   └── web/                    # React frontend application
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── services/       # API client services
│       │   └── stores/         # State management
│       └── package.json
├── packages/                   # Shared libraries (future)
├── infrastructure/
│   ├── docker/                 # Docker configurations
│   └── scripts/                # Deployment scripts
├── docs/                       # Documentation
├── config/                     # Shared configuration
└── package.json               # Root package configuration
```

#### Available Scripts

| Script            | Description               | Usage               |
| ----------------- | ------------------------- | ------------------- |
| `pnpm dev`        | Start development servers | Development work    |
| `pnpm build`      | Build all apps            | Before deployment   |
| `pnpm test`       | Run all tests             | Quality assurance   |
| `pnpm lint`       | Run code linting          | Code quality        |
| `pnpm type-check` | TypeScript checking       | Type safety         |
| `pnpm docker:dev` | Start Docker environment  | Full system testing |
| `pnpm clean`      | Clean build artifacts     | Troubleshooting     |
| `pnpm reset`      | Full clean and reinstall  | Reset everything    |

#### PowerShell Development Commands

```powershell
# Run all quality checks (recommended before commits)
Invoke-psake CI

# Individual linting tasks
Invoke-psake Markdown      # Markdown files
Invoke-psake Json          # JSON files
Invoke-psake Yaml          # YAML files
Invoke-psake TypeScript    # TypeScript/JavaScript

# Docker management
Invoke-psake DockerUp      # Start all services
Invoke-psake DockerDown    # Stop all services
Invoke-psake DockerHealth  # Check service health
Invoke-psake DockerLogs    # View all logs

# Database management
Invoke-psake DockerResetDb   # Reset database
Invoke-psake DockerBackupDb  # Backup database
Invoke-psake DockerPsql      # Connect to PostgreSQL

# Show all available commands
Invoke-psake ?
```

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check what's using ports 3000, 3010, 5432, 6379
netstat -tulpn | grep :3000
netstat -tulpn | grep :3010

# Kill processes if needed
kill -9 $(lsof -t -i:3000)
```

#### Permission Issues

```bash
# Fix npm/pnpm permissions (Linux/macOS)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/.local/share/pnpm

# Docker permission issues (Linux)
sudo usermod -aG docker $USER
# Logout and login again
```

#### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check Docker PostgreSQL
Invoke-psake DockerHealth

# Reset database if corrupted
Invoke-psake DockerResetDb
```

#### Node Version Issues

```bash
# Use Node Version Manager (recommended)
# Install nvm: https://github.com/nvm-sh/nvm

# Use project's Node version
nvm install 20.17.0
nvm use 20.17.0

# Or check .nvmrc file exists
cat .nvmrc
nvm use
```

### Performance Optimization

#### Development Performance

```bash
# Use local development for faster iteration
pnpm dev

# Only use Docker for integration testing
Invoke-psake DockerUp

# Use TypeScript project references for faster builds
pnpm type-check --build
```

#### Docker Performance

```bash
# Allocate more resources to Docker Desktop
# - Memory: 4GB minimum, 8GB recommended
# - CPUs: 2 minimum, 4 recommended

# Use Docker BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### Diagnostic Commands

```bash
# System information
node --version
pnpm --version
docker --version
docker compose version

# Project health check
Invoke-psake CheckDependencies
Invoke-psake CheckSecurity
Invoke-psake CheckApiHealth

# Docker system information
docker system info
docker system df

# View container logs
Invoke-psake DockerLogs
Invoke-psake DockerLogsApi
```

## Air-Gapped Environment Setup

For industrial environments without internet access:

### 1. Prepare Dependencies

```bash
# On internet-connected machine
pnpm install
pnpm store path  # Note the store location

# Create offline bundle
tar -czf luppa-offline-deps.tar.gz node_modules/ ~/.local/share/pnpm/
```

### 2. Transfer and Install

```bash
# On air-gapped machine
tar -xzf luppa-offline-deps.tar.gz
pnpm install --offline --frozen-lockfile
```

### 3. Docker Images

```bash
# On internet-connected machine
docker save postgres:16 redis:7.2 node:20.17-alpine -o luppa-docker-images.tar

# On air-gapped machine
docker load -i luppa-docker-images.tar
```

## Next Steps

1. **Read the Architecture Documentation**: [docs/architecture.md](docs/architecture.md)
2. **Check Contributing Guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)
3. **Review the Product Requirements**: [docs/prd.md](docs/prd.md)
4. **Explore the Frontend Specification**: [docs/front-end-spec.md](docs/front-end-spec.md)
5. **Start with Epic Stories**: [docs/epic-stories/](docs/epic-stories/)

## Support

- **Documentation**: Check the `docs/` directory
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Issues**: Create an issue in the project repository
- **Development**: Follow the guide in [CONTRIBUTING.md](CONTRIBUTING.md)

## Performance Targets

- **Initial Setup**: Should complete in under 30 minutes
- **Build Time**: Full build should complete in under 5 minutes
- **Development Server**: Should start in under 30 seconds
- **Test Suite**: Should complete in under 2 minutes
- **Docker Environment**: Should start in under 60 seconds

Verify your setup meets these targets using the diagnostic commands above.
