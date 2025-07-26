# Industrial Inventory Multi-App Framework

A comprehensive multi-application framework designed for industrial equipment inventory management,
built with modern TypeScript, React, and Node.js technologies optimized for air-gapped industrial environments.

## Overview

This framework provides a foundation for building multiple industrial applications, starting with a PLC equipment inventory system.
The project is designed for solo development with a focus on open-source technologies, industrial compliance, and scalable architecture.

### Key Features

- **Multi-App Architecture**: Shared foundation supporting multiple industrial applications
- **Air-Gapped Compatible**: Optimized for on-premise, offline industrial environments
- **ISO Compliance**: Comprehensive audit trails and security measures
- **High Performance**: Targets <100ms query response times with 10,000+ records
- **Industrial UI**: Touch-friendly interface optimized for tablets and work gloves

## Technology Stack

- **Frontend**: React 19.1.0 + TypeScript 5.8.3 + Material-UI 7.0 + Vite 6.0
- **Backend**: Node.js + Express 5.1.0 + TypeORM + PostgreSQL 17.5
- **Database**: PostgreSQL (primary) + Redis 8.0 (caching/sessions)
- **Infrastructure**: Docker Swarm, Nginx reverse proxy
- **Monitoring**: Grafana + Prometheus + Winston logging
- **Testing**: Jest 30.0 with ESM support
- **Package Management**: pnpm workspaces

## Quick Start

### Prerequisites

- Node.js v20.19.4 (specified in `.nvmrc`)
- pnpm >= 9.0.0
- Docker and Docker Compose (for full development environment)

### Setup

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd Luppa_PLC
   pnpm install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run initial setup:**

   ```bash
   pnpm setup
   ```

4. **Start development environment:**

   ```bash
   # Option 1: Local development
   pnpm dev
   
   # Option 2: Full Docker environment
   pnpm docker:dev
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development servers for all apps |
| `pnpm build` | Build all packages and applications |
| `pnpm test` | Run tests across all packages |
| `pnpm lint` | Run linting across all packages |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm setup` | Initial project setup (install + build types + db setup) |
| `pnpm docker:dev` | Start full Docker development environment |
| `pnpm docker:down` | Stop Docker development environment |
| `pnpm clean` | Clean all build artifacts and node_modules |
| `pnpm reset` | Clean and reinstall everything |

## Project Structure

```text
├── apps/                          # Application packages
│   ├── api/                       # Express API server
│   └── web/                       # React frontend application
├── packages/                      # Shared libraries
│   ├── shared-types/              # TypeScript type definitions
│   ├── ui-components/             # Reusable React components
│   └── config/                    # Shared configuration
├── infrastructure/                # Infrastructure and deployment
│   ├── docker/                    # Docker configurations
│   └── scripts/                   # Deployment and utility scripts
├── docs/                          # Documentation
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── config/tsconfig.json          # Root TypeScript configuration
└── package.json                  # Root package configuration
```

## Development Workflow

1. **Epic 0**: Project Initialization & Foundation (current)
2. **Epic 1**: Framework Foundation & Core Infrastructure
3. **Epic 2**: Shared Services & Monitoring
4. **Epic 3**: Frontend Framework & Component Library
5. **Epic 4**: Inventory Core Functionality
6. **Epic 5**: Advanced Inventory Features

## Documentation

- [Architecture Documentation](docs/architecture.md)
- [Product Requirements](docs/prd.md)
- [Frontend Specification](docs/front-end-spec.md)
- [Epic Stories](docs/epic-stories/)
- [Development Stories](docs/stories/)

## Industrial Environment Considerations

- **Air-gapped networks** with minimal internet access
- **On-premise only** deployment - no cloud dependencies
- **Industrial reliability** requirements with local backups
- **Process Engineer users** - technical but not developers
- **ISO compliance** focus with comprehensive audit trails

## Performance Targets

- Support 300+ PLCs initially, scale to 10,000+
- Query response: <100ms for filtered results
- Page load: <2 seconds initial, <500ms navigation
- Resource usage: <2GB RAM total system

## Future Applications

The framework is designed to support additional industrial apps:
- PLC Emulator with metrics generation
- Factory Dashboard for production lines
- Maintenance Scheduler
- Asset Performance Analytics
- Compliance Tracker
- Document Manager

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
