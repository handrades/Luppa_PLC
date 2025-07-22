# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **PLC Inventory Multi-App Framework** - a foundation for building multiple industrial applications
starting with a PLC equipment inventory system. The project is designed for solo development with a focus on
open-source technologies, industrial compliance, and scalable architecture.

## Architecture Vision

### Multi-App Framework Approach
The project follows a **layered framework architecture** designed to support multiple industrial applications:

1. **Infrastructure Foundation**: Docker Swarm orchestration with PostgreSQL, Redis, Nginx, and Grafana/Prometheus monitoring
2. **Data & Security Foundation**: Shared authentication, RBAC, audit logging, and app-specific schemas
3. **Shared Business Logic**: Common APIs for user management, notifications, and cross-app services
4. **Frontend Framework**: React component library with industrial theming and reusable widgets

### Technology Stack
- **Frontend**: React + Vite + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeORM + Joi validation
- **Database**: PostgreSQL (primary) + Redis (caching/sessions)
- **Infrastructure**: Docker Swarm, Nginx reverse proxy
- **Monitoring**: Grafana + Prometheus + Winston logging
- **Authentication**: Local JWT with bcrypt (no external providers)

## Database Architecture

The database follows a **shared foundation + app-specific schemas** pattern:

### Core Tables (Shared)
- `users`, `roles`, `permissions` - Authentication and authorization
- `audit_logs` - ISO compliance tracking with proper foreign keys and cascading
- `notifications`, `app_settings`, `feature_flags`

### PLC Inventory Schema
Based on `notes for future.md`, the main entities include:
- **PLC records**: id, description, make, model, ip, tags (TEXT array with GIN indexing)
- **Site hierarchy**: site_name, cell_type, cell_id
- **Equipment mapping**: equipment_id, equipment_type
- **Audit compliance**: All changes tracked with user context and timestamps

Key database patterns:
- UUID primary keys with `gen_random_uuid()`
- Proper foreign key constraints with `ON DELETE CASCADE`
- GIN indexes for array fields (tags)
- Partial unique indexes (e.g., `WHERE ip IS NOT NULL`)
- Auto-updating timestamps with triggers

## Development Commands

### Linting

```bash
markdownlint "**/*.md" --ignore node_modules
```

The project uses relaxed markdown linting rules (see `.markdownlint.json`) with:
- Line length: 120 characters
- Disabled: heading spacing, list spacing, trailing punctuation rules

## Industrial Environment Considerations

### Deployment Context
- **Air-gapped networks** with minimal internet access
- **On-premise only** - no cloud dependencies
- **Industrial reliability** requirements with local backups
- **Process Engineer users** - technical but not developers
- **ISO compliance** focus with comprehensive audit trails

### Performance Targets
- Support 300+ PLCs initially, scale to 10,000+
- Query response: <100ms for filtered results
- Page load: <2 seconds initial, <500ms navigation
- Resource usage: <2GB RAM total system

## Implementation Phases

1. **Framework Foundation** (4-6 weeks): Docker setup, authentication, monitoring
2. **Shared Frontend Framework** (2-3 weeks): Component library, theming
3. **PLC Inventory Application** (3-4 weeks): First app implementation as framework example

## Future Applications
The framework is designed to support additional industrial apps:
- PLC Emulator with metrics generation
- Factory Dashboard for production lines
- Maintenance Scheduler
- Asset Performance Analytics
- Compliance Tracker
- Document Manager

## Key Constraints
- **Solo developer** with average skills
- **Open source only** (budget constraint)
- **No existing infrastructure** - building from scratch
- **Security-first** with comprehensive logging and monitoring

## Development Best Practices

- Before we push anything to GitHub, we need to make sure we run all GitHub workflows locally to speed up development.
