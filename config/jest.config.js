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
  roots: [
    '<rootDir>/../__tests__',
    '<rootDir>/../apps',
    '<rootDir>/../packages',
    '<rootDir>/../infrastructure',
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
    '!**/apps/web/**/*.test.*',
    '!**/apps/web/**/*.spec.*',
  ],
  collectCoverageFrom: [
    '../apps/**/*.ts',
    '../packages/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^@shared-types/(.*)$': '<rootDir>/../packages/shared-types/src/$1',
    '^@ui-components/(.*)$': '<rootDir>/../packages/ui-components/src/$1',
    '^@config/(.*)$': '<rootDir>/../packages/config/src/$1',
  },
};
