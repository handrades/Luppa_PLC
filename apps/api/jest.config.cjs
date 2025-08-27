module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.(test|spec).ts', '**/*.(test|spec).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Temporarily skip cells tests due to test isolation issues
    // TODO: Implement proper database cleanup to re-enable these tests
    '.*cells\\.test\\.ts$',
  ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 16,
      functions: 24,
      lines: 21,
      statements: 21,
    },
  },
  verbose: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: [],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
