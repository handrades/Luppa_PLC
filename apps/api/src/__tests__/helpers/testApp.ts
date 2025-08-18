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
      searchSites: jest.fn().mockImplementation(async () => ({
        data: Array.from(testData.sites.values()),
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: testData.sites.size,
          totalPages: 1,
        },
      })),
      getSiteById: jest.fn().mockImplementation(async (id: string) => {
        const site = testData.sites.get(id);
        if (!site) {
          throw new Error(`Site with ID '${id}' not found`);
        }
        return site;
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
            throw new Error(`Line number '${data.lineNumber}' already exists in this site`);
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
      searchCells: jest.fn().mockImplementation(async () => ({
        data: Array.from(testData.cells.values()),
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: testData.cells.size,
          totalPages: 1,
        },
      })),
      getCellById: jest.fn().mockImplementation(async (id: string) => {
        const cell = testData.cells.get(id);
        if (!cell) {
          throw new Error(`Cell with ID '${id}' not found`);
        }
        return cell;
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
      getCellSuggestions: jest.fn().mockImplementation(async () => []),
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
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  });

  return app;
}
