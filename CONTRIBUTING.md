# Contributing to Industrial Inventory Multi-App Framework

Thank you for your interest in contributing to the Luppa PLC Industrial Inventory Multi-App Framework! This document provides comprehensive guidelines for contributing to the project.

## Getting Started

### Prerequisites

1. **Read the Setup Guide**: Follow [SETUP.md](SETUP.md) to get your development environment ready
2. **Understand the Architecture**: Review [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
3. **Check the Project Status**: Review [docs/prd.md](docs/prd.md) and current epic progress

### First-Time Setup

```bash
# Fork the repository and clone your fork
git clone https://github.com/YOUR_USERNAME/Luppa_PLC.git
cd Luppa_PLC

# Add upstream remote
git remote add upstream https://github.com/handrades/Luppa_PLC.git

# Install dependencies and setup
pnpm install
pnpm setup

# Verify everything works
Invoke-psake CI
```

## Development Workflow

### Branch Strategy

We use **Git Flow** with the following branch structure:

- `main` - Production-ready code, protected branch
- `develop` - Integration branch for features, default target for PRs
- `feature/*` - Feature development branches
- `hotfix/*` - Critical bug fixes
- `release/*` - Release preparation branches

#### Creating Feature Branches

```bash
# Always branch from develop
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/story-0.8-documentation-onboarding

# Or for bug fixes
git checkout -b hotfix/fix-database-connection-timeout
```

### Epic and Story Development

This project follows an **Epic-based development approach**:

1. **Epics** contain multiple related stories
2. **Stories** are implemented in individual feature branches
3. Each story should be completable in one development session

#### Story Implementation Process

```bash
# 1. Check story status in docs/stories/
# 2. Create feature branch
git checkout -b feature/story-X.Y-story-name

# 3. Implement the story requirements
# 4. Run quality checks
Invoke-psake CI

# 5. Commit with conventional commits
git add .
pnpm commit  # Uses Commitizen for conventional commits

# 6. Push and create PR
git push origin feature/story-X.Y-story-name
```

## Code Standards

### TypeScript Standards

#### Code Style

```typescript
// Use strict TypeScript configuration
// Follow existing patterns in the codebase

// Interface naming: PascalCase with descriptive names
interface PlcInventoryItem {
  id: string;
  description: string;
  make: string;
  model: string;
  ipAddress?: string;
  tags: string[];
}

// Function naming: camelCase with verb prefix
async function getPlcById(id: string): Promise<PlcInventoryItem | null> {
  // Implementation
}

// Component naming: PascalCase
export const PlcInventoryList: React.FC<PlcInventoryListProps> = ({
  items,
  onSelectItem
}) => {
  // Implementation
};
```

#### Type Safety

```typescript
// Use strict typing, avoid 'any'
// Prefer interfaces over types for object shapes
// Use enums for constants

enum PlcStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

// Use utility types when appropriate
type PartialPlcItem = Partial<PlcInventoryItem>;
type PlcUpdateData = Omit<PlcInventoryItem, 'id'>;
```

### React Standards

#### Component Structure

```typescript
// Component organization
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { usePlcInventory } from '../hooks/usePlcInventory';
import type { PlcInventoryItem } from '../types';

interface PlcListProps {
  onItemSelect: (item: PlcInventoryItem) => void;
  filters?: PlcFilters;
}

export const PlcList: React.FC<PlcListProps> = ({ 
  onItemSelect, 
  filters 
}) => {
  // Hooks first
  const { items, loading, error } = usePlcInventory(filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    // Side effects
  }, [filters]);

  // Event handlers
  const handleItemClick = (item: PlcInventoryItem) => {
    setSelectedId(item.id);
    onItemSelect(item);
  };

  // Render functions (if complex)
  const renderItem = (item: PlcInventoryItem) => (
    // JSX
  );

  // Main render
  return (
    <Box>
      {/* JSX content */}
    </Box>
  );
};
```

#### Hooks and State Management

```typescript
// Custom hooks should be focused and reusable
export const usePlcInventory = (filters?: PlcFilters) => {
  const [items, setItems] = useState<PlcInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Implementation with proper error handling
  
  return { items, loading, error, refetch };
};

// Use Zustand for global state
interface PlcStore {
  items: PlcInventoryItem[];
  selectedItem: PlcInventoryItem | null;
  setItems: (items: PlcInventoryItem[]) => void;
  selectItem: (item: PlcInventoryItem) => void;
}
```

### Backend Standards

#### API Design

```typescript
// RESTful endpoint structure
// /api/v1/plcs - Collection endpoints
// /api/v1/plcs/:id - Resource endpoints

// Use proper HTTP methods and status codes
app.get('/api/v1/plcs', async (req, res) => {
  try {
    const plcs = await plcService.findAll(req.query);
    res.json({ data: plcs, meta: { total: plcs.length } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Input validation with Joi
const createPlcSchema = Joi.object({
  description: Joi.string().required().max(255),
  make: Joi.string().required().max(100),
  model: Joi.string().required().max(100),
  ipAddress: Joi.string().ip().optional(),
  tags: Joi.array().items(Joi.string()).default([])
});
```

#### Database Patterns

```typescript
// Entity definition with TypeORM
@Entity('plcs')
export class PlcEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  make: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'inet', nullable: true })
  @Index({ unique: true, where: 'ip_address IS NOT NULL' })
  ipAddress?: string;

  @Column('text', { array: true, default: [] })
  @Index('idx_plcs_tags', { using: 'gin' })
  tags: string[];
}
```

### Testing Standards

#### Unit Tests

```typescript
// Test file naming: *.test.ts or *.test.tsx
// Use descriptive test names

describe('PlcService', () => {
  let service: PlcService;
  let mockRepository: jest.Mocked<Repository<PlcEntity>>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new PlcService(mockRepository);
  });

  describe('findById', () => {
    it('should return PLC when found', async () => {
      // Arrange
      const plcId = 'test-id';
      const expectedPlc = createMockPlc({ id: plcId });
      mockRepository.findOne.mockResolvedValue(expectedPlc);

      // Act
      const result = await service.findById(plcId);

      // Assert
      expect(result).toEqual(expectedPlc);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: plcId }
      });
    });

    it('should return null when PLC not found', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests

```typescript
// API integration tests
describe('PLC API', () => {
  let app: Application;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = createTestApp(testDb);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('GET /api/v1/plcs', () => {
    it('should return paginated PLC list', async () => {
      // Seed test data
      await testDb.seed('plcs', [
        { description: 'Test PLC 1', make: 'Siemens' },
        { description: 'Test PLC 2', make: 'Allen Bradley' }
      ]);

      const response = await request(app)
        .get('/api/v1/plcs')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });
  });
});
```

### Documentation Standards

#### JSDoc Comments

```typescript
/**
 * Service for managing PLC inventory items
 * Handles CRUD operations and business logic for PLCs
 */
export class PlcService {
  /**
   * Retrieves a PLC by its unique identifier
   * @param id - The UUID of the PLC to retrieve
   * @returns Promise resolving to PLC item or null if not found
   * @throws {ValidationError} When id format is invalid
   * @throws {DatabaseError} When database query fails
   */
  async findById(id: string): Promise<PlcInventoryItem | null> {
    // Implementation
  }

  /**
   * Creates a new PLC inventory item
   * @param data - PLC data without ID (auto-generated)
   * @param userId - ID of user creating the item (for audit trail)
   * @returns Promise resolving to created PLC with generated ID
   */
  async create(
    data: Omit<PlcInventoryItem, 'id'>, 
    userId: string
  ): Promise<PlcInventoryItem> {
    // Implementation
  }
}
```

#### Component Documentation

```typescript
/**
 * Displays a filterable list of PLC inventory items
 * 
 * Features:
 * - Real-time search and filtering
 * - Pagination for large datasets
 * - Touch-friendly interface for industrial environments
 * - Keyboard navigation support
 * 
 * @example
 * ```tsx
 * <PlcInventoryList
 *   onItemSelect={handlePlcSelect}
 *   filters={{ make: 'Siemens', status: 'online' }}
 *   pageSize={50}
 * />
 * ```
 */
export const PlcInventoryList: React.FC<PlcInventoryListProps> = (props) => {
  // Implementation
};
```

## Quality Assurance

### Required Checks

All code must pass these checks before merging:

```bash
# Run complete CI pipeline
Invoke-psake CI

# Individual checks
pnpm lint              # ESLint + Prettier
pnpm type-check        # TypeScript type checking
pnpm test              # Jest unit tests
Invoke-psake Markdown  # Markdown linting
Invoke-psake Json      # JSON validation
Invoke-psake Yaml      # YAML validation
```

### Code Coverage

- **Minimum Coverage**: 60% overall
- **Critical Functions**: 80% coverage required
- **New Code**: Should not decrease overall coverage

```bash
# Run tests with coverage
pnpm test --coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Performance Requirements

- **Build Time**: Full build under 5 minutes
- **Test Suite**: Complete in under 2 minutes
- **Development Server**: Start in under 30 seconds
- **API Response**: Under 100ms for typical queries
- **Bundle Size**: Keep frontend bundles under 2MB

## Pull Request Process

### PR Preparation

```bash
# 1. Ensure branch is up to date
git checkout develop
git pull upstream develop
git checkout feature/your-branch
git rebase develop

# 2. Run quality checks
Invoke-psake CI

# 3. Squash commits if needed (optional)
git rebase -i HEAD~n

# 4. Push to your fork
git push origin feature/your-branch
```

### PR Creation

1. **Create PR** targeting `develop` branch
2. **Use Template**: Fill out the PR template completely
3. **Link Issues**: Reference related issues/stories
4. **Add Labels**: Use appropriate labels for categorization
5. **Request Review**: Add relevant reviewers

#### PR Title Format

```text
type(scope): brief description

Examples:
feat(api): add PLC inventory CRUD operations
fix(web): resolve login form validation issue
docs(setup): update installation instructions
refactor(database): optimize PLC query performance
```

#### PR Description Template

```markdown
## Changes

Brief description of what this PR accomplishes.

## Related Issues

- Closes #123
- Addresses Story 0.8 requirements

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Quality Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code comments added where necessary
- [ ] Documentation updated if needed
- [ ] No console.log or debug statements left
- [ ] All quality checks pass (`Invoke-psake CI`)

## Screenshots (if applicable)

Include screenshots for UI changes.

## Additional Notes

Any additional information for reviewers.
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one approved review required
3. **Testing**: Manual testing by reviewer if needed
4. **Documentation**: Verify documentation is updated
5. **Merge**: Squash and merge to maintain clean history

## Git Commit Guidelines

### Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Use commitizen for guided commits
pnpm commit

# Manual format
type(scope): description

[optional body]

[optional footer]
```

#### Commit Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `perf`: Performance improvements
- `ci`: CI/CD changes

#### Examples

```bash
feat(api): add PLC inventory search endpoint

- Implement full-text search across PLC descriptions
- Add filtering by make, model, and tags
- Include pagination with configurable page size
- Add comprehensive input validation

Closes #45

fix(web): resolve memory leak in PLC list component

The useEffect cleanup was missing, causing subscriptions
to persist after component unmount.

test(api): add integration tests for PLC endpoints

- Cover all CRUD operations
- Test error scenarios
- Verify audit log creation
```

## Development Environment

### IDE Configuration

#### Visual Studio Code (Recommended)

Install these extensions:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker"
  ]
}
```

Workspace settings (`.vscode/settings.json`):

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.suggest.autoImports": true,
  "editor.rulers": [80, 120]
}
```

### Development Scripts

```bash
# Code generation
pnpm generate:component  # Create new React component
pnpm generate:api       # Create new API endpoint
pnpm generate:entity    # Create new database entity

# Database operations
pnpm db:migrate         # Run database migrations
pnpm db:seed           # Seed with test data
pnpm db:reset          # Reset database to initial state

# Docker development
Invoke-psake DockerUp     # Start all services
Invoke-psake DockerDown   # Stop all services  
Invoke-psake DockerHealth # Check service health
```

## Debugging

### Frontend Debugging

```typescript
// Use proper logging instead of console.log
import { logger } from '../utils/logger';

logger.debug('PLC item selected', { plcId: item.id });
logger.warn('API response delayed', { responseTime: elapsed });
logger.error('Failed to load PLCs', { error: error.message });
```

### Backend Debugging

```typescript
// Use Winston logger
import { logger } from '../config/logger';

logger.info('PLC search initiated', { 
  userId: req.user.id, 
  filters: req.query 
});

logger.error('Database query failed', {
  error: error.message,
  stack: error.stack,
  query: query
});
```

### Performance Debugging

```bash
# Analyze bundle size
pnpm -C apps/web build:analyze

# Profile API performance
# Use built-in winston performance logging

# Monitor database queries
# Enable TypeORM query logging in development
```

## Security Guidelines

### Input Validation

```typescript
// Always validate inputs
const createPlcSchema = Joi.object({
  description: Joi.string().trim().min(1).max(255).required(),
  ipAddress: Joi.string().ip().optional()
});

// Sanitize inputs
const sanitizedDescription = validator.escape(req.body.description);
```

### Authentication & Authorization

```typescript
// Use middleware for protected routes
app.get('/api/v1/plcs', authenticateUser, authorizePlcRead, (req, res) => {
  // Implementation
});

// Implement proper RBAC
const userCan = await rbac.can(user.role, 'read', 'plc');
```

### SQL Injection Prevention

```typescript
// Use parameterized queries with TypeORM
const plcs = await repository.find({
  where: { make: Like(`%${searchTerm}%`) },
  take: limit,
  skip: offset
});

// Never concatenate user input into SQL
// ❌ BAD: `SELECT * FROM plcs WHERE make = '${userInput}'`
// ✅ GOOD: Use TypeORM query builder or repository methods
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Release Workflow

1. **Create Release Branch**: `release/v1.2.0`
2. **Update Version**: Update package.json versions
3. **Update Changelog**: Document all changes
4. **Final Testing**: Run full test suite
5. **Create PR**: Merge to main
6. **Tag Release**: Create git tag
7. **Deploy**: Automated deployment via GitHub Actions

## Community

### Getting Help

1. **Documentation**: Check existing docs first
2. **Issues**: Search existing issues before creating new ones
3. **Discussions**: Use GitHub Discussions for questions
4. **Code Review**: Ask specific questions in PR comments

### Reporting Issues

Use the issue templates and provide:

- **Environment**: OS, Node version, browser
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: For UI issues
- **Logs**: Relevant error logs

### Contributing Ideas

- **Features**: Discuss in issues before implementing
- **Bug Reports**: Include reproduction steps
- **Documentation**: Always welcome improvements
- **Performance**: Profile before and after changes

Thank you for contributing to the Industrial Inventory Multi-App Framework! Your contributions help build better industrial software solutions.
