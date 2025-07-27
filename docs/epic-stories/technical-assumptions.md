# Technical Assumptions

## Repository Structure: Monorepo

**Monorepo** approach using a single repository containing:

- Shared framework components and libraries
- Backend API services
- Frontend React applications
- Infrastructure configuration (Docker, CI/CD)
- Documentation and tooling

This supports the multi-app framework vision while maintaining code sharing and consistent development
workflows.

## Service Architecture

**Layered Monolith with Framework Foundation** - A structured monolithic application with clear separation
of concerns:

- **Infrastructure Layer**: Docker Swarm orchestration, PostgreSQL, Redis, Nginx
- **Framework Layer**: Shared authentication, audit logging, user management, notification services
- **Application Layer**: Inventory application with dedicated schemas and business logic
- **Frontend Layer**: React framework with reusable component library

This approach balances development simplicity for a solo developer while providing the foundation for future
application expansion.

The monolith will be structured with clear module boundaries using:

- **Workspace Management**: Organized with Nx workspaces, Yarn workspaces, or pnpm workspaces to maintain clear
  separation between modules
- **Module Independence**: Each major feature area (auth, inventory, monitoring) in separate workspace packages with
  explicit dependencies
- **CI/CD Rules**: Automated checks to prevent circular dependencies, enforce module boundaries, and enable independent testing/releasing
- **Interface Contracts**: Well-defined APIs between modules to facilitate future extraction without major refactors
- **Independent Build Artifacts**: Module structure that allows extracting services as separate deployables when needed

## Testing Requirements

**Unit + Integration Testing** strategy:

- **Unit Tests**: Jest for backend logic and React Testing Library for components
- **Integration Tests**: API endpoint testing with supertest, database integration tests
- **Manual Testing Convenience**: Postman collections for API testing and development
- **Automated Testing**: CI/CD pipeline integration for continuous validation
- Focus on critical paths: authentication, CRUD operations, and audit logging
- Test coverage target of 70% for core modules
- No requirement for full E2E automation initially due to resource constraints

## Additional Technical Assumptions and Requests

- **Database Strategy**: PostgreSQL primary with Redis for session management and caching
- **Authentication**: Local JWT-based auth with bcrypt password hashing (no external providers)
- **API Design**: RESTful APIs with consistent error handling and response formats
- **Frontend Framework**: React + TypeScript + Vite for development speed and type safety
- **UI Component Library**: Material-UI with industrial theme customization
- **Container Strategy**: Docker Swarm for on-premise orchestration and service management
- **Monitoring Stack**: Grafana + Prometheus + Winston logging for observability
- **Air-Gap Compatibility**: All dependencies must support offline installation and updates
- **Performance Optimization**: Database indexing strategy, Redis caching, and query optimization
- **Security Framework**: RBAC implementation, input validation with Joi, SQL injection prevention
- **Error Handling**: Centralized error handling with Winston logging to file and console
- **Session Management**: Redis for session storage with 24-hour timeout
- **File Storage**: Local filesystem for uploaded files with virus scanning consideration
- **Backup Strategy**: Automated PostgreSQL dumps to local storage, retained for 30 days
- **Development Tools**: ESLint, Prettier for code consistency; Husky for pre-commit hooks
