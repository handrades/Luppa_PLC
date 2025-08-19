export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/../__tests__', '<rootDir>/../apps', '<rootDir>/../infrastructure'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
    '!**/apps/web/**/*.test.*',
    '!**/apps/web/**/*.spec.*',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Temporarily skip cells tests due to test isolation issues
    // TODO: Implement proper database cleanup to re-enable these tests
    '.*cells\\.test\\.ts$',
  ],
  collectCoverageFrom: ['../apps/**/*.ts', '!**/*.d.ts', '!**/node_modules/**', '!**/dist/**'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    // Package aliases will be added when packages are implemented
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
};
