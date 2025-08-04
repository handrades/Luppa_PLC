// Simple validation script for workspace setup
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();
let passed = 0;
let failed = 0;

function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe: expected => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toContain: expected => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toMatch: pattern => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected "${actual}" to match ${pattern}`);
      }
    },
  };
}

console.log('🧪 Running Workspace Configuration Tests\n');

// Test file existence
test('pnpm-workspace.yaml exists', () => {
  expect(existsSync(join(rootDir, 'pnpm-workspace.yaml'))).toBe(true);
});

test('package.json exists', () => {
  expect(existsSync(join(rootDir, 'package.json'))).toBe(true);
});

test('tsconfig.json exists', () => {
  expect(existsSync(join(rootDir, 'config/tsconfig.json'))).toBe(true);
});

test('.nvmrc exists', () => {
  expect(existsSync(join(rootDir, '.nvmrc'))).toBe(true);
});

test('README.md exists', () => {
  expect(existsSync(join(rootDir, 'README.md'))).toBe(true);
});

// Test directory structure
test('apps/web directory exists', () => {
  expect(existsSync(join(rootDir, 'apps/web'))).toBe(true);
});

test('apps/api directory exists', () => {
  expect(existsSync(join(rootDir, 'apps/api'))).toBe(true);
});

test('packages/shared-types directory exists', () => {
  expect(existsSync(join(rootDir, 'packages/shared-types'))).toBe(true);
});

test('packages/ui-components directory exists', () => {
  expect(existsSync(join(rootDir, 'packages/ui-components'))).toBe(true);
});

test('packages/config directory exists', () => {
  expect(existsSync(join(rootDir, 'packages/config'))).toBe(true);
});

test('infrastructure/docker directory exists', () => {
  expect(existsSync(join(rootDir, 'infrastructure/docker'))).toBe(true);
});

test('infrastructure/scripts directory exists', () => {
  expect(existsSync(join(rootDir, 'infrastructure/scripts'))).toBe(true);
});

// Test file content
test('pnpm-workspace.yaml has correct packages', () => {
  const content = readFileSync(join(rootDir, 'pnpm-workspace.yaml'), 'utf-8');
  expect(content).toContain('packages:');
  expect(content).toContain('- "apps/*"');
  expect(content).toContain('- "packages/*"');
});

test('package.json has correct workspace scripts', () => {
  const content = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  expect(content.scripts.dev).toContain('concurrently');
  expect(content.scripts.build).toBe('pnpm -r build');
  expect(content.scripts.test).toBe('jest --config config/jest.config.js --passWithNoTests');
  expect(content.scripts.lint).toBe('eslint --config config/.eslintrc.cjs .');
});

test('package.json has correct engine requirements', () => {
  const content = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  expect(content.engines.node).toBe('>=20.0.0');
  expect(content.engines.pnpm).toBe('>=9.0.0');
});

test('tsconfig.json has workspace path mappings', () => {
  const content = JSON.parse(readFileSync(join(rootDir, 'config/tsconfig.json'), 'utf-8'));
  expect(content.compilerOptions.paths['@shared-types/*'][0]).toBe('packages/shared-types/src/*');
  expect(content.compilerOptions.paths['@ui-components/*'][0]).toBe('packages/ui-components/src/*');
  expect(content.compilerOptions.paths['@config/*'][0]).toBe('packages/config/src/*');
});

test('.nvmrc specifies Node.js v20.x', () => {
  const content = readFileSync(join(rootDir, '.nvmrc'), 'utf-8').trim();
  expect(content).toMatch(/^(v20\.\d+\.\d+|20)$/);
});

test('Code quality files exist', () => {
  expect(existsSync(join(rootDir, 'config/.eslintrc.cjs'))).toBe(true);
  expect(existsSync(join(rootDir, 'config/.prettierrc'))).toBe(true);
  expect(existsSync(join(rootDir, 'config/.editorconfig'))).toBe(true);
});

test('.gitignore has essential entries', () => {
  const content = readFileSync(join(rootDir, '.gitignore'), 'utf-8');
  expect(content).toContain('node_modules/');
  expect(content).toContain('.env');
  expect(content).toContain('dist/');
});

console.log(`\n🏁 Tests completed: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
