# Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions.

## Technology Stack Table

| Category             | Technology          | Version           | Purpose                            | Rationale                                                     |
| -------------------- | ------------------- | ----------------- | ---------------------------------- | ------------------------------------------------------------- |
| Frontend Language    | TypeScript          | 5.8.3             | Type-safe frontend development     | Latest stable, catches errors early, improves maintainability |
| Frontend Framework   | React               | 19.1.0            | UI component framework             | Latest with server components, improved performance           |
| UI Component Library | Material-UI (MUI)   | 7.0.0             | Pre-built industrial UI components | CSS layers support, better Tailwind integration               |
| State Management     | Zustand             | 5.0.2             | Client state management            | Latest stable, TypeScript-first, simple API                   |
| Backend Language     | TypeScript          | 5.8.3             | Type-safe backend development      | Code sharing with frontend, consistent DX                     |
| Backend Framework    | Express             | 5.1.0             | HTTP server framework              | Latest LTS, improved security, Node 18+ support               |
| API Style            | REST                | OpenAPI 3.1       | API communication protocol         | Latest spec, better JSON Schema support                       |
| Database             | PostgreSQL          | 17.5              | Primary data storage               | Latest with major performance improvements                    |
| Cache                | Redis               | 8.0               | Session store and caching          | New data structures, 2x performance boost                     |
| File Storage         | Local Filesystem    | N/A               | Equipment documentation storage    | Simplicity for air-gapped environments                        |
| Authentication       | JWT + bcrypt        | jsonwebtoken 10.0 | User authentication                | Latest stable, improved security                              |
| Frontend Testing     | Jest + RTL          | 30.0 / 16.1       | Component and unit testing         | Latest with ESM support                                       |
| Backend Testing      | Jest + Supertest    | 30.0 / 7.0        | API and unit testing               | Consistent with frontend testing                              |
| E2E Testing          | Playwright          | 1.50              | End-to-end testing                 | Latest with improved debugging                                |
| Build Tool           | Vite                | 6.0               | Frontend bundling                  | Latest with Rolldown support                                  |
| Bundler              | Rolldown (via Vite) | 0.15              | JavaScript bundling                | Rust-based, faster than esbuild                               |
| IaC Tool             | Docker Compose      | 2.32              | Infrastructure as code             | Latest with improved performance                              |
| CI/CD                | GitHub Actions      | N/A               | Automation pipeline                | Continuously updated by GitHub                                |
| Monitoring           | Prometheus          | 3.0               | Metrics collection                 | Latest with native histograms                                 |
| Logging              | Winston             | 3.17              | Application logging                | Latest stable version                                         |
| CSS Framework        | Emotion (via MUI)   | 12.0              | CSS-in-JS styling                  | Latest with MUI v7 support                                    |
