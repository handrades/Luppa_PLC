export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/../__tests__', '<rootDir>/../apps', '<rootDir>/../infrastructure'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
    '!**/apps/web/**/*.test.*',
    '!**/apps/web/**/*.spec.*',
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
};
