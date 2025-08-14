module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // General ESLint rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'off', // Disable base rule to avoid conflicts
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Import rules
    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true,
      },
    ],
  },
  ignorePatterns: [
    '**/dist/**',
    '**/build/**', 
    '**/node_modules/**',
    '**/coverage/**',
    '**/storybook-static/**',
    '**/*.config.js',
    '**/*.setup.js',
    'apps/api/jest.setup.js',
    'apps/api/test-server.js'
  ],
  overrides: [
    {
      files: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.test.js',
        '**/*.spec.js',
      ],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      env: {
        browser: true,
      },
      rules: {},
    },
    {
      files: ['**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-undef': 'off',
        'no-console': 'off',
      },
      env: {
        node: true,
        jest: true,
      },
    },
  ],
};
