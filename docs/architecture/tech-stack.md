# Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions or latest stable until target versions are released.

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | ^5.8.0 | Type-safe frontend development | Latest stable, catches errors early, improves maintainability |
| Frontend Framework | React | ^18.0.0* | UI component framework | Current stable (target: 19.x when released) |
| UI Component Library | Material-UI (MUI) | ^5.15.0* | Pre-built industrial UI components | Current stable (target: 7.x when released) |
| State Management | Zustand | ^5.0.0 | Client state management | Latest stable, TypeScript-first, simple API |
| Backend Language | TypeScript | ^5.8.0 | Type-safe backend development | Code sharing with frontend, consistent DX |
| Backend Framework | Express | ^4.19.0 | HTTP server framework | Current stable, proven reliability |
| API Style | REST | OpenAPI 3.1 | API communication protocol | Latest spec, better JSON Schema support |
| Database | PostgreSQL | ^16.0* | Primary data storage | Current stable (target: 17.x when released) |
| Cache | Redis | ^7.2.0* | Session store and caching | Current stable (target: 8.x when released) |
| File Storage | Local Filesystem | N/A | Equipment documentation storage | Simplicity for air-gapped environments |
| Authentication | JWT + bcrypt | jsonwebtoken 10.0 | User authentication | Latest stable, improved security |
| Frontend Testing | Jest + RTL | 30.0 / 16.1 | Component and unit testing | Latest with ESM support |
| Backend Testing | Jest + Supertest | 30.0 / 7.0 | API and unit testing | Consistent with frontend testing |
| E2E Testing | Playwright | 1.50 | End-to-end testing | Latest with improved debugging |
| Build Tool | Vite | 6.0 | Frontend bundling | Latest with Rolldown support |
| Bundler | Rolldown (via Vite) | 0.15 | JavaScript bundling | Rust-based, faster than esbuild |
| IaC Tool | Docker Compose | 2.32 | Infrastructure as code | Latest with improved performance |
| CI/CD | GitHub Actions | N/A | Automation pipeline | Continuously updated by GitHub |
| Monitoring | Prometheus | 3.0 | Metrics collection | Latest with native histograms |
| Logging | Winston | 3.17 | Application logging | Latest stable version |
| CSS Framework | Emotion (via MUI) | ^12.0 | CSS-in-JS styling | Latest stable with MUI support |

**Note:** Versions marked with * indicate target future releases. Use current stable versions during development until target versions are officially released and tested.
