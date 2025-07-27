# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **PLC Inventory Multi-App Framework** - a foundation for building multiple industrial applications
starting with a PLC equipment inventory system. The project is designed for solo development with a focus on
open-source technologies, industrial compliance, and scalable architecture.

## CRITICAL: Project Initialization Status

**Current State:** The project has comprehensive documentation (PRD, Architecture, Frontend Spec) but NO executable code exists yet.
Epic 0 (Project Initialization) must be completed before any work on Epic 1-5 can begin.

**Epic 0 Requirements:**

- Initialize monorepo structure with pnpm workspaces
- Create Docker development environment
- Scaffold backend (Express + TypeScript) and frontend (React + Vite)
- Set up database migrations and CI/CD pipeline
- Establish development tooling and documentation

**When asked about implementation:** Always check if Epic 0 has been completed by looking for:

- `/apps/api` and `/apps/web` directories
- `package.json` files in the workspace
- `docker-compose.dev.yml` file
- Working health check endpoint

If these don't exist, recommend completing Epic 0 first.

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

### Initial Setup (Epic 0)

```powershell
# First-time setup (after Epic 0 is complete)
pnpm install
Copy-Item .env.example .env
pnpm setup

# Start development environment
pnpm dev
# OR
docker-compose -f docker-compose.dev.yml up
```

### Linting

The project uses matching lint workflows for both local development (psake) and GitHub Actions CI. See [Linting Workflows Documentation](docs/linting-workflows.md) for complete details.

#### Local Development (Recommended)

```powershell
# Install psake if not already installed
Install-Module -Name psake -Scope CurrentUser

# Run all linting checks (default task)
Invoke-psake

# Run specific linters
Invoke-psake Markdown      # Markdown files only
Invoke-psake Json          # JSON files only  
Invoke-psake Yaml          # YAML files only
Invoke-psake TypeScript    # TypeScript/JavaScript files only

# Auto-fix markdown issues
Invoke-psake FixMarkdown

# Run CI checks (matches GitHub workflow exactly)
Invoke-psake CI

# Check if all dependencies are installed
Invoke-psake CheckDependencies

# Show all available tasks
Invoke-psake ?
```

#### Supported File Types

- **Markdown** (`.md`) - markdownlint with relaxed rules (120 char lines)
- **JSON** (`.json`) - jsonlint for syntax validation
- **YAML** (`.yml`, `.yaml`) - yamllint for syntax and formatting
- **TypeScript/JavaScript** - ESLint + Prettier via pnpm workspace scripts

#### GitHub Actions

The lint workflow runs automatically on:

- Push to main/master/develop branches
- Pull requests to main/master/develop branches
- Manual workflow dispatch

Both workflows exclude: `node_modules/`, `.bmad-core/`

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

- **Epic 0 First**: Always ensure Epic 0 (Project Initialization) is complete before starting feature work
- **Check Prerequisites**: Verify monorepo structure, Docker setup, and base scaffolding exist
- **Use Existing Patterns**: Follow the patterns established in Epic 0 for new components/services
- Before we commit anything or push anything to GitHub, we need to make sure we run all GitHub workflows locally
  to speed up development.

## Claude Code Guidance

- All files need to end with a new line

## Personal Preferences

- I dislike bash scripting. Never recommend me to use bash over PowerShell

## Git Workflow Policies

- **NEVER push to master ALWAYS push to a branch. NOTIFY me if no branch has been created**
