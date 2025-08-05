# Architecture Overview

This document provides a high-level overview of the Industrial Inventory Multi-App Framework architecture, key design decisions, and system organization.

## System Overview

The Industrial Inventory Multi-App Framework is designed as a
**layered multi-application foundation** for industrial environments, starting with PLC
inventory management and extensible to additional industrial applications.

### Architecture Principles

1. **Air-Gap Compatible**: Designed for on-premise, offline industrial networks
2. **Multi-App Foundation**: Shared foundation supporting multiple industrial applications
3. **Industrial-First**: Optimized for industrial environments and requirements
4. **Scalable Performance**: Targets <100ms query response with 10,000+ records
5. **ISO Compliance**: Comprehensive audit trails and security measures
6. **Solo Developer Friendly**: Clear patterns and comprehensive tooling

## Technology Stack

### Core Technologies

| Layer                 | Technology     | Version | Purpose                    |
| --------------------- | -------------- | ------- | -------------------------- |
| **Frontend**          | React          | 18.0+   | UI framework               |
| **Frontend Language** | TypeScript     | 5.8+    | Type-safe development      |
| **UI Library**        | Material-UI    | 5.15+   | Industrial UI components   |
| **State Management**  | Zustand        | 5.0+    | Client state management    |
| **Build Tool**        | Vite           | 6.0+    | Frontend bundling          |
| **Backend Framework** | Express        | 4.19+   | HTTP server                |
| **Backend Language**  | TypeScript     | 5.8+    | Type-safe backend          |
| **Database**          | PostgreSQL     | 16+     | Primary data storage       |
| **Cache**             | Redis          | 7.2+    | Session store and caching  |
| **ORM**               | TypeORM        | 0.3+    | Database abstraction       |
| **Infrastructure**    | Docker Compose | 2.32+   | Container orchestration    |
| **Reverse Proxy**     | Nginx          | 1.24+   | Load balancing and routing |
| **Package Manager**   | pnpm           | 9.0+    | Workspace management       |

### Development & Quality Tools

| Category             | Technology                   | Purpose                          |
| -------------------- | ---------------------------- | -------------------------------- |
| **Testing**          | Jest + React Testing Library | Unit and integration testing     |
| **E2E Testing**      | Playwright                   | End-to-end testing               |
| **Code Quality**     | ESLint + Prettier            | Code formatting and linting      |
| **Type Checking**    | TypeScript                   | Static type analysis             |
| **Git Hooks**        | Husky + lint-staged          | Pre-commit quality checks        |
| **Commit Standards** | Commitizen + Commitlint      | Conventional commits             |
| **Documentation**    | Markdown + JSDoc             | Code and system documentation    |
| **CI/CD**            | GitHub Actions               | Automated testing and deployment |

## High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Industrial Network                        │
│                     (Air-Gapped)                            │
├─────────────────────────────────────────────────────────────┤
│                      Nginx (Port 3000)                      │
│                   Reverse Proxy & SSL                       │
├─────────────────────────────────────────────────────────────┤
│  React Frontend        │        Express API                 │
│  - Material-UI         │        - RESTful APIs              │
│  - TypeScript          │        - TypeORM                   │
│  - Zustand State       │        - JWT Auth                  │
│  - Vite Build          │        - Winston Logging           │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database   │        Redis Cache                 │
│  - PLC Inventory       │        - User Sessions             │
│  - User Management     │        - API Caching               │
│  - Audit Logs          │        - Real-time Data            │
├─────────────────────────────────────────────────────────────┤
│               Monitoring & Observability                    │
│          Grafana Dashboards + Prometheus Metrics           │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

### Monorepo Organization

```text
Luppa_PLC/
├── apps/                           # Application packages
│   ├── api/                       # Express.js API server
│   │   ├── src/
│   │   │   ├── entities/          # TypeORM database entities
│   │   │   ├── routes/            # API route handlers
│   │   │   ├── middleware/        # Express middleware
│   │   │   ├── services/          # Business logic layer
│   │   │   └── config/            # Configuration management
│   │   ├── migrations/            # Database migrations
│   │   └── package.json
│   └── web/                       # React frontend application
│       ├── src/
│       │   ├── components/        # Reusable React components
│       │   ├── pages/             # Page-level components
│       │   ├── services/          # API client services
│       │   ├── stores/            # Zustand state stores
│       │   ├── hooks/             # Custom React hooks
│       │   └── utils/             # Utility functions
│       └── package.json
├── packages/                      # Shared libraries (future)
│   ├── shared-types/              # TypeScript type definitions
│   ├── ui-components/             # Reusable UI component library
│   └── config/                    # Shared configuration
├── infrastructure/                # Infrastructure and deployment
│   ├── docker/                    # Docker configurations
│   │   ├── nginx.conf             # Nginx configuration
│   │   └── postgres/              # PostgreSQL initialization
│   └── scripts/                   # Deployment and utility scripts
├── docs/                          # Comprehensive documentation
│   ├── architecture/              # Detailed architecture docs
│   ├── epic-stories/              # Epic and story documentation
│   └── stories/                   # Individual story specifications
├── config/                        # Root-level shared configuration
├── docker-compose.dev.yml         # Development environment
├── pnpm-workspace.yaml           # pnpm workspace configuration
└── package.json                  # Root package configuration
```

### Application Layers

#### Frontend Architecture (React App)

```text
┌─────────────────────────────────────────┐
│              Presentation Layer          │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Pages     │  │   Components    │   │
│  │ (Routing)   │  │  (UI Elements)  │   │
│  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────┤
│               Business Layer            │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │    Hooks    │  │     Stores      │   │
│  │ (Data Mgmt) │  │ (Global State)  │   │
│  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────┤
│               Service Layer             │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ API Client  │  │     Utils       │   │
│  │ (HTTP Comm) │  │  (Utilities)    │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

#### Backend Architecture (Express API)

```text
┌─────────────────────────────────────────┐
│              Controller Layer           │
│         (HTTP Request Handling)         │
├─────────────────────────────────────────┤
│              Middleware Layer           │
│  Authentication │ Validation │ Logging  │
├─────────────────────────────────────────┤
│              Business Layer             │
│           (Application Logic)           │
├─────────────────────────────────────────┤
│              Data Access Layer          │
│      (TypeORM Entities & Repositories)  │
├─────────────────────────────────────────┤
│              Infrastructure Layer       │
│    Database │ Cache │ External APIs     │
└─────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Multi-App Framework Approach

**Decision**: Build a shared foundation that supports multiple industrial applications

**Rationale**:

- **Reusability**: Common infrastructure, authentication, and UI components
- **Consistency**: Shared patterns and technologies across applications
- **Efficiency**: Avoid rebuilding common functionality for each app
- **Maintenance**: Centralized updates and security patches

**Implementation**:

- Shared database schemas for users, roles, audit logs
- Common React component library
- Standardized API patterns and middleware
- Unified Docker infrastructure

### 2. Monorepo with pnpm Workspaces

**Decision**: Use pnpm workspaces for monorepo management

**Rationale**:

- **Performance**: Faster installs and better disk efficiency
- **Dependency Management**: Shared dependencies across packages
- **Type Safety**: Cross-package TypeScript references
- **Build Optimization**: Incremental builds and caching

**Implementation**:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 3. PostgreSQL as Primary Database

**Decision**: PostgreSQL for primary data storage

**Rationale**:

- **Industrial Compliance**: ACID transactions and data integrity
- **Performance**: Excellent query performance for complex queries
- **Features**: JSON support, full-text search, GIN indexes for arrays
- **Reliability**: Proven in industrial environments
- **Air-Gap Compatible**: No external dependencies

**Implementation**:

- UUID primary keys for distributed compatibility
- GIN indexes for tag arrays and full-text search
- Audit logging with proper foreign key relationships
- Database migrations with TypeORM

### 4. TypeScript-First Development

**Decision**: TypeScript for both frontend and backend

**Rationale**:

- **Type Safety**: Catch errors at compile time
- **Code Quality**: Better refactoring and IDE support
- **Documentation**: Types serve as living documentation
- **Shared Types**: Common interfaces between frontend/backend

**Implementation**:

- Strict TypeScript configuration
- Shared type definitions in separate package
- Runtime validation with type guards
- Comprehensive JSDoc documentation

### 5. Docker-Based Infrastructure

**Decision**: Docker Compose for development, Docker Swarm for production

**Rationale**:

- **Environment Consistency**: Same containers in dev/prod
- **Air-Gap Deployment**: Self-contained application stack
- **Scalability**: Easy horizontal scaling with Swarm
- **Industrial Compatibility**: Reliable deployment in industrial networks

**Implementation**:

```yaml
# docker-compose.dev.yml structure
services:
  - nginx (reverse proxy)
  - web (React frontend)
  - api (Express backend)
  - postgres (database)
  - redis (cache)
  - grafana (monitoring)
  - prometheus (metrics)
```

### 6. RESTful API Design

**Decision**: REST API with OpenAPI specification

**Rationale**:

- **Simplicity**: Well-understood HTTP semantics
- **Industrial Standard**: Widely supported in industrial systems
- **Documentation**: Automated API documentation with Swagger
- **Tooling**: Excellent TypeScript and testing support

**Implementation**:

```text
API Structure:
├── /api/v1/auth          # Authentication endpoints
├── /api/v1/users         # User management
├── /api/v1/plcs          # PLC inventory
├── /api/v1/audit         # Audit log queries
└── /api/v1/health        # Health checks
```

### 7. Component-Based Frontend Architecture

**Decision**: Material-UI with custom component library

**Rationale**:

- **Industrial UI**: Touch-friendly, accessible components
- **Consistency**: Shared design system across applications
- **Performance**: Tree-shaking and code splitting
- **Maintenance**: Single source of truth for UI components

**Implementation**:

```text
Component Hierarchy:
├── Layout Components (Header, Sidebar, etc.)
├── Form Components (Inputs, Validation, etc.)
├── Data Display (Tables, Cards, etc.)
├── Feedback Components (Loading, Errors, etc.)
└── Domain Components (PLC-specific, etc.)
```

## Database Design

### Core Schema Pattern

```sql
-- Shared foundation tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application-specific tables
CREATE TABLE plcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description VARCHAR(255) NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  ip_address INET UNIQUE,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logging for compliance
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_plcs_tags ON plcs USING gin(tags);
CREATE INDEX idx_plcs_make ON plcs(make);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);
```

## Performance Architecture

### Performance Targets

| Metric              | Target     | Implementation                         |
| ------------------- | ---------- | -------------------------------------- |
| Query Response      | <100ms     | Database indexes, query optimization   |
| Page Load (Initial) | <2 seconds | Code splitting, lazy loading           |
| Page Navigation     | <500ms     | Client-side routing, caching           |
| Build Time          | <5 minutes | Incremental builds, caching            |
| Memory Usage        | <2GB total | Efficient algorithms, memory profiling |

### Optimization Strategies

1. **Database Performance**:
   - GIN indexes for array/JSON queries
   - Partial indexes for optional fields
   - Query optimization with EXPLAIN ANALYZE
   - Connection pooling

2. **Frontend Performance**:
   - Code splitting with React.lazy()
   - Virtual scrolling for large lists
   - Memoization with React.memo and useMemo
   - Service worker for offline functionality

3. **API Performance**:
   - Redis caching for frequent queries
   - Request/response compression
   - Pagination for large datasets
   - Database query optimization

4. **Infrastructure Performance**:
   - Nginx compression and caching
   - Docker multi-stage builds
   - Container resource limits
   - Monitoring and alerting

## Security Architecture

### Security Layers

1. **Network Security**:
   - Air-gapped deployment
   - Nginx reverse proxy
   - Internal container networking
   - TLS encryption

2. **Application Security**:
   - JWT authentication
   - Role-based access control (RBAC)
   - Input validation and sanitization
   - CORS configuration

3. **Data Security**:
   - Password hashing with bcrypt
   - Database connection encryption
   - Audit logging for all changes
   - Data backup and recovery

4. **Infrastructure Security**:
   - Container isolation
   - Secret management
   - Regular security updates
   - Monitoring and alerting

## Development Workflow

### Epic-Based Development

The project follows an **Epic-based development approach**:

1. **Epic 0**: Project Foundation & Tooling
2. **Epic 1**: Framework Foundation & Core Infrastructure
3. **Epic 2**: Shared Services & Monitoring
4. **Epic 3**: Frontend Framework & Component Library
5. **Epic 4**: Inventory Core Functionality
6. **Epic 5**: Advanced Inventory Features

### Quality Assurance

```bash
# Comprehensive quality checks
Invoke-psake CI

# Individual checks
pnpm lint              # Code style and quality
pnpm type-check        # TypeScript type checking
pnpm test              # Unit and integration tests
Invoke-psake Security  # Security vulnerability scanning
```

### Continuous Integration

```yaml
# GitHub Actions pipeline
name: CI Pipeline
on: [push, pull_request]
jobs:
  - lint-and-format
  - type-check
  - test-coverage
  - build-verification
  - security-scan
```

## Monitoring and Observability

### Monitoring Stack

- **Grafana**: Dashboards and visualization
- **Prometheus**: Metrics collection and alerting
- **Winston**: Application logging
- **PostgreSQL Logs**: Database performance monitoring

### Key Metrics

1. **Application Metrics**:
   - API response times
   - Error rates
   - User activity
   - System resource usage

2. **Business Metrics**:
   - PLC inventory changes
   - User authentication events
   - Audit log entries
   - System availability

3. **Performance Metrics**:
   - Database query performance
   - Frontend bundle sizes
   - Memory and CPU usage
   - Network latency

## Future Extensibility

### Multi-App Framework

The architecture supports additional industrial applications:

- **PLC Emulator**: Simulate PLC behavior for testing
- **Factory Dashboard**: Real-time production monitoring
- **Maintenance Scheduler**: Equipment maintenance tracking
- **Asset Performance Analytics**: Historical data analysis
- **Compliance Tracker**: Regulatory compliance management

### Extension Points

1. **Database Schemas**: App-specific tables with shared foundation
2. **API Routes**: Modular route organization
3. **Frontend Components**: Shared component library
4. **Authentication**: Centralized user management
5. **Monitoring**: Unified observability across apps

## Detailed Documentation

For more detailed architectural information, see:

- [High-Level Architecture](docs/architecture/high-level-architecture.md)
- [Database Schema](docs/architecture/database-schema.md)
- [Frontend Architecture](docs/architecture/frontend-architecture.md)
- [API Specification](docs/architecture/api-specification.md)
- [Infrastructure Architecture](docs/architecture/infrastructure-architecture-deployment.md)
- [Security Architecture](docs/architecture/security-architecture-audit-system.md)
- [Performance Architecture](docs/architecture/performance-architecture-optimization-strategy.md)

## Conclusion

This architecture provides a solid foundation for industrial inventory management while supporting future multi-app expansion. The design emphasizes:

- **Industrial Requirements**: Air-gap compatibility, reliability, compliance
- **Developer Experience**: Clear patterns, comprehensive tooling, quality automation
- **Performance**: Sub-100ms queries, efficient resource usage
- **Maintainability**: Type safety, comprehensive testing, clear documentation
- **Extensibility**: Multi-app support, modular design, shared foundation

The architecture balances complexity with maintainability, ensuring the system
can grow and evolve while remaining manageable for solo development.
