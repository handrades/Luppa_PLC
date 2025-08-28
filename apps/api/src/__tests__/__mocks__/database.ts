/**
 * Common database mock for all test files
 */

export const mockQueryRunner = {
  query: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  manager: {
    connection: {
      driver: {
        escape: jest.fn().mockImplementation((value: unknown) => {
          if (value === null || value === undefined) return "'null'";
          if (typeof value === 'string') {
            const escaped = value.replace(/'/g, "''");
            return `'${escaped}'`;
          }
          return `'${String(value)}'`;
        }),
      },
    },
  },
};

export const mockRepository = {
  createQueryBuilder: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
};

export const mockDataSource = {
  getRepository: jest.fn().mockReturnValue(mockRepository),
  query: jest.fn(),
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  manager: {},
  isInitialized: true,
};

export const AppDataSource = mockDataSource;

export const getAppDataSource = jest.fn(() => mockDataSource);

export const initializeDatabase = jest.fn().mockResolvedValue(undefined);
export const closeDatabase = jest.fn().mockResolvedValue(undefined);
export const isDatabaseHealthy = jest.fn().mockResolvedValue(true);
export const getConnectionPoolStats = jest.fn().mockResolvedValue({
  isConnected: true,
  totalConnections: 1,
  idleConnections: 1,
  runningConnections: 0,
  poolConfig: {
    min: 2,
    max: 10,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
  },
});
export const getDatabaseHealth = jest.fn().mockResolvedValue({
  isHealthy: true,
  responseTime: 10,
  poolStats: {
    isConnected: true,
    totalConnections: 1,
    idleConnections: 1,
    runningConnections: 0,
    poolConfig: {
      min: 2,
      max: 10,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
    },
  },
});
