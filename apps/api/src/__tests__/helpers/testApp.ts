/**
 * Test App Helper
 *
 * Creates a test Express application for integration testing
 * Uses real routes with mock authentication and services
 */

import express, { Express, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { TokenType, jwtConfig } from '../../config/jwt';

// Mock authentication helper
interface MockUser {
  sub: string;
  email: string;
  roleId: string;
  permissions: string[];
  type: TokenType;
}

// In-memory storage for test data
const testData = {
  sites: new Map<string, Record<string, unknown>>(),
  cells: new Map<string, Record<string, unknown>>(),
};

// Mock SiteService
jest.mock('../../services/SiteService', () => {
  return {
    SiteService: jest.fn().mockImplementation(() => ({
      createSite: jest.fn().mockImplementation(async (data: { name: string }) => {
        // Check for duplicate site names
        const existingSites = Array.from(testData.sites.values());
        const duplicate = existingSites.find(
          (site: Record<string, unknown>) => site.name === data.name
        );
        if (duplicate) {
          const error = new Error(`Site name '${data.name}' already exists`);
          error.name = 'ConflictError';
          throw error;
        }

        const siteId = randomUUID();
        const site = {
          id: siteId,
          name: data.name,
          cellCount: 0,
          equipmentCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        testData.sites.set(siteId, site);
        return site;
      }),
      searchSites: jest.fn().mockImplementation(async (filters: Record<string, unknown> = {}) => {
        let sites = Array.from(testData.sites.values());

        // Apply search filter
        if (filters.search && typeof filters.search === 'string') {
          const searchTerm = filters.search.toLowerCase();
          sites = sites.filter((site: Record<string, unknown>) =>
            String(site.name).toLowerCase().includes(searchTerm)
          );
        }

        // Apply sorting
        if (filters.sortBy && typeof filters.sortBy === 'string') {
          const sortField = filters.sortBy;
          const sortOrder = String(filters.sortOrder || '').toUpperCase() === 'DESC' ? -1 : 1;
          sites.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const aVal = String(a[sortField] || '');
            const bVal = String(b[sortField] || '');
            return aVal.localeCompare(bVal) * sortOrder;
          });
        }

        // Apply pagination
        const page = Number(filters.page) || 1;
        const pageSize = Number(filters.pageSize) || 20;
        const totalItems = sites.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (page - 1) * pageSize;
        const paginatedSites = sites.slice(startIndex, startIndex + pageSize);

        return {
          data: paginatedSites,
          pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
          },
        };
      }),
      getSiteById: jest.fn().mockImplementation(async (id: string) => {
        const site = testData.sites.get(id);
        if (!site) {
          throw new Error(`Site with ID '${id}' not found`);
        }
        return site;
      }),
      getSiteStatistics: jest.fn().mockImplementation(async () => ({
        totalSites: testData.sites.size,
        totalCells: testData.cells.size,
        totalEquipment: 0,
        averageCellsPerSite:
          testData.sites.size > 0 ? testData.cells.size / testData.sites.size : 0,
        averageEquipmentPerSite: 0,
        sitesWithoutCells: 0,
        sitesWithoutEquipment: testData.sites.size, // Assuming no equipment in test data
      })),
      getSiteSuggestions: jest.fn().mockImplementation(async (query?: string, limit = 10) => {
        let sites = Array.from(testData.sites.values());

        // Filter by query if provided
        if (query) {
          const searchTerm = query.toLowerCase();
          sites = sites.filter((site: Record<string, unknown>) =>
            String(site.name).toLowerCase().includes(searchTerm)
          );
        }

        // Return limited suggestions
        return sites.slice(0, limit).map((site: Record<string, unknown>) => ({
          id: site.id,
          name: site.name,
        }));
      }),
      validateSiteUniqueness: jest
        .fn()
        .mockImplementation(async (name: string, excludeId?: string) => {
          const existingSites = Array.from(testData.sites.values());
          const duplicate = existingSites.find(
            (site: Record<string, unknown>) => site.name === name && site.id !== excludeId
          );
          return !duplicate;
        }),
      updateSite: jest
        .fn()
        .mockImplementation(
          async (
            id: string,
            data: Record<string, unknown>,
            expectedUpdatedAt: Date,
            _options: Record<string, unknown>
          ) => {
            const site = testData.sites.get(id);
            if (!site) {
              throw new Error(`Site with ID '${id}' not found`);
            }

            // Check optimistic locking
            const siteUpdatedAt = new Date(String(site.updatedAt));
            if (siteUpdatedAt.getTime() !== expectedUpdatedAt.getTime()) {
              throw new Error('Site was modified by another user');
            }

            // Check name uniqueness if name is being changed
            if (data.name && data.name !== site.name) {
              const existingSites = Array.from(testData.sites.values());
              const duplicate = existingSites.find(
                (s: Record<string, unknown>) => s.name === data.name && s.id !== id
              );
              if (duplicate) {
                const error = new Error(`Site name '${data.name}' already exists`);
                error.name = 'ConflictError';
                throw error;
              }
            }

            const updatedSite = {
              ...site,
              ...data,
              updatedAt: new Date().toISOString(),
            };
            testData.sites.set(id, updatedSite);
            return updatedSite;
          }
        ),
      deleteSite: jest.fn().mockImplementation(async (id: string) => {
        const site = testData.sites.get(id);
        if (!site) {
          throw new Error(`Site with ID '${id}' not found`);
        }
        // Check if site has cells
        const siteCells = Array.from(testData.cells.values()).filter(
          (cell: Record<string, unknown>) => cell.siteId === id
        );
        if (siteCells.length > 0) {
          throw new Error(
            `Cannot delete site '${site.name}' because it contains ${siteCells.length} cells`
          );
        }
        testData.sites.delete(id);
      }),
    })),
  };
});

// Mock CellService
jest.mock('../../services/CellService', () => {
  return {
    CellService: jest.fn().mockImplementation(() => ({
      createCell: jest
        .fn()
        .mockImplementation(async (data: { siteId: string; name: string; lineNumber: string }) => {
          // Check if site exists
          const site = testData.sites.get(data.siteId);
          if (!site) {
            throw new Error(`Site with ID '${data.siteId}' not found`);
          }

          // Check for duplicate line numbers
          const existingCells = Array.from(testData.cells.values());
          const duplicate = existingCells.find(
            (cell: Record<string, unknown>) =>
              cell.siteId === data.siteId && cell.lineNumber === data.lineNumber.toUpperCase()
          );
          if (duplicate) {
            const error = new Error(`Line number '${data.lineNumber}' already exists in this site`);
            error.name = 'ConflictError';
            throw error;
          }

          const cellId = randomUUID();
          const cell = {
            id: cellId,
            siteId: data.siteId,
            name: data.name,
            lineNumber: data.lineNumber.toUpperCase(),
            equipmentCount: 0,
            siteName: site.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          testData.cells.set(cellId, cell);
          return cell;
        }),
      searchCells: jest.fn().mockImplementation(async (filters: Record<string, unknown> = {}) => {
        let cells = Array.from(testData.cells.values());

        // Apply search filter
        if (filters.search && typeof filters.search === 'string') {
          const searchTerm = filters.search.toLowerCase();
          cells = cells.filter(
            (cell: Record<string, unknown>) =>
              String(cell.name).toLowerCase().includes(searchTerm) ||
              String(cell.lineNumber).toLowerCase().includes(searchTerm)
          );
        }

        // Apply site filter
        if (filters.siteId) {
          cells = cells.filter((cell: Record<string, unknown>) => cell.siteId === filters.siteId);
        }

        // Apply sorting
        if (filters.sortBy && typeof filters.sortBy === 'string') {
          const sortField = filters.sortBy;
          const sortOrder = String(filters.sortOrder || '').toUpperCase() === 'DESC' ? -1 : 1;
          cells.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const aVal = String(a[sortField] || '');
            const bVal = String(b[sortField] || '');
            return aVal.localeCompare(bVal) * sortOrder;
          });
        }

        // Apply pagination
        const page = Number(filters.page) || 1;
        const pageSize = Number(filters.pageSize) || 20;
        const totalItems = cells.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (page - 1) * pageSize;
        const paginatedCells = cells.slice(startIndex, startIndex + pageSize);

        return {
          data: paginatedCells,
          pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
          },
        };
      }),
      getCellById: jest.fn().mockImplementation(async (id: string) => {
        const cell = testData.cells.get(id);
        if (!cell) {
          throw new Error(`Cell with ID '${id}' not found`);
        }
        return cell;
      }),
      updateCell: jest
        .fn()
        .mockImplementation(async (id: string, data: Record<string, unknown>) => {
          const cell = testData.cells.get(id);
          if (!cell) {
            throw new Error(`Cell with ID '${id}' not found`);
          }
          const updatedCell = {
            ...cell,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          testData.cells.set(id, updatedCell);
          return updatedCell;
        }),
      deleteCell: jest.fn().mockImplementation(async (id: string) => {
        const cell = testData.cells.get(id);
        if (!cell) {
          throw new Error(`Cell with ID '${id}' not found`);
        }
        testData.cells.delete(id);
      }),
      getCellsBySite: jest.fn().mockImplementation(async (siteId: string) => {
        const site = testData.sites.get(siteId);
        if (!site) {
          throw new Error(`Site with ID '${siteId}' not found`);
        }
        return Array.from(testData.cells.values()).filter(
          (cell: Record<string, unknown>) => cell.siteId === siteId
        );
      }),
      getCellStatistics: jest.fn().mockImplementation(async () => ({
        totalCells: testData.cells.size,
        totalEquipment: 0,
        averageEquipmentPerCell: 0,
        cellsWithoutEquipment: 0,
        cellsPerSite: {},
      })),
      getCellSuggestions: jest
        .fn()
        .mockImplementation(async (siteId?: string, query?: string, limit = 10) => {
          let cells = Array.from(testData.cells.values());

          // Filter by site if provided
          if (siteId) {
            cells = cells.filter((cell: Record<string, unknown>) => cell.siteId === siteId);
          }

          // Filter by query if provided
          if (query) {
            const searchTerm = query.toLowerCase();
            cells = cells.filter(
              (cell: Record<string, unknown>) =>
                String(cell.name).toLowerCase().includes(searchTerm) ||
                String(cell.lineNumber).toLowerCase().includes(searchTerm)
            );
          }

          // Return limited suggestions
          return cells.slice(0, limit).map((cell: Record<string, unknown>) => ({
            id: cell.id,
            name: cell.name,
            lineNumber: cell.lineNumber,
          }));
        }),
      validateCellUniqueness: jest
        .fn()
        .mockImplementation(async (siteId: string, lineNumber: string, excludeId?: string) => {
          const existingCells = Array.from(testData.cells.values());
          const duplicate = existingCells.find(
            (cell: Record<string, unknown>) =>
              cell.siteId === siteId &&
              cell.lineNumber === lineNumber.toUpperCase() &&
              cell.id !== excludeId
          );
          return !duplicate;
        }),
      validateHierarchyIntegrity: jest.fn().mockImplementation(async () => ({
        isValid: true,
        errors: [],
        warnings: [],
      })),
    })),
  };
});

/**
 * Mock authentication middleware that decodes test tokens
 */
const mockAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.substring(7);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing access token',
    });
  }

  try {
    // Handle test tokens (base64 encoded mock data)
    if (token.startsWith('Bearer.')) {
      const base64Data = token.split('.')[1];
      const decoded = JSON.parse(Buffer.from(base64Data, 'base64').toString());

      // Convert to expected JWT payload format
      req.user = {
        sub: decoded.userId || decoded.id,
        email: decoded.email,
        roleId: 'test-role',
        permissions: decoded.permissions || [],
        type: TokenType.ACCESS,
      };
    } else {
      // Try to decode as real JWT for other tests
      const decoded = jwt.verify(token, jwtConfig.secret) as MockUser;
      req.user = decoded;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid token',
    });
  }
};

/**
 * Mock audit context middleware
 */
const mockAuditMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  // Mock the audit entity manager that the routes expect
  req.auditEntityManager = {
    // Add minimal mock methods that services might need
    getRepository: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn(),
  } as unknown as EntityManager;

  next();
};

/**
 * Creates a test Express app with real routes and mock authentication
 */
export async function createTestApp(): Promise<Express> {
  // Clear test data store to prevent cross-test contamination
  testData.sites.clear();
  testData.cells.clear();

  const app = express();

  // Basic middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock middleware
  app.use(mockAuditMiddleware);
  app.use('/api/v1', mockAuthMiddleware);

  // Import and use real routes
  const sitesRouter = (await import('../../routes/sites')).default;
  const cellsRouter = (await import('../../routes/cells')).default;

  app.use('/api/v1/sites', sitesRouter);
  app.use('/api/v1/cells', cellsRouter);

  // Error handling middleware
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('Test app error:', error);

    // Handle different error types
    let statusCode = 500;
    const errorMessage = error.message;

    if (error.name === 'ConflictError' || error.message.includes('already exists')) {
      statusCode = 409;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('invalid')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: statusCode === 500 ? 'Internal server error' : 'Request failed',
      message: errorMessage,
    });
  });

  return app;
}
