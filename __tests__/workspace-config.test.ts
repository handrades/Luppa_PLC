import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

describe('Workspace Configuration', () => {
  const rootDir = process.cwd();

  describe('pnpm-workspace.yaml', () => {
    const workspaceFile = join(rootDir, 'pnpm-workspace.yaml');

    test('should exist', () => {
      expect(existsSync(workspaceFile)).toBe(true);
    });

    test('should have correct packages configuration', () => {
      const content = readFileSync(workspaceFile, 'utf-8');
      const config = yaml.parse(content);

      expect(config.packages).toEqual(['apps/*', 'packages/*']);
    });

    test('should have performance optimizations', () => {
      const content = readFileSync(workspaceFile, 'utf-8');
      const config = yaml.parse(content);

      expect(config['prefer-workspace-packages']).toBe(true);
      expect(config['save-workspace-protocol']).toBe('rolling');
    });

    test('should have registry configuration', () => {
      const content = readFileSync(workspaceFile, 'utf-8');
      const config = yaml.parse(content);

      expect(config.registries?.default).toBe('https://registry.npmjs.org/');
    });
  });

  describe('package.json', () => {
    const packageFile = join(rootDir, 'package.json');

    test('should exist', () => {
      expect(existsSync(packageFile)).toBe(true);
    });

    test('should have correct workspace scripts', () => {
      const content = JSON.parse(readFileSync(packageFile, 'utf-8'));

      expect(content.scripts).toMatchObject({
        dev: 'concurrently "pnpm -C apps/api dev" "pnpm -C apps/web dev"',
        build: 'pnpm -r build',
        test: 'jest --config config/jest.config.js --passWithNoTests',
        lint: 'eslint --config config/.eslintrc.cjs .',
        'type-check': 'tsc --project config/tsconfig.json',
        setup: 'pnpm install && pnpm build:types && pnpm db:setup',
      });
    });

    test('should have correct engine requirements', () => {
      const content = JSON.parse(readFileSync(packageFile, 'utf-8'));

      expect(content.engines).toMatchObject({
        node: '>=20.0.0',
        pnpm: '>=9.0.0',
      });
    });

    test('should be private workspace root', () => {
      const content = JSON.parse(readFileSync(packageFile, 'utf-8'));

      expect(content.private).toBe(true);
      expect(content.workspaces).toEqual(['apps/*', 'packages/*']);
    });
  });

  describe('Directory Structure', () => {
    test('should have apps directories', () => {
      expect(existsSync(join(rootDir, 'apps/web'))).toBe(true);
      expect(existsSync(join(rootDir, 'apps/api'))).toBe(true);
    });

    test('should have packages directories', () => {
      expect(existsSync(join(rootDir, 'packages/shared-types'))).toBe(true);
      expect(existsSync(join(rootDir, 'packages/ui-components'))).toBe(true);
      expect(existsSync(join(rootDir, 'packages/config'))).toBe(true);
    });

    test('should have infrastructure directories', () => {
      expect(existsSync(join(rootDir, 'infrastructure/docker'))).toBe(true);
      expect(existsSync(join(rootDir, 'infrastructure/scripts'))).toBe(true);
    });
  });

  describe('TypeScript Configuration', () => {
    const tsconfigFile = join(rootDir, 'config/tsconfig.json');

    test('should exist', () => {
      expect(existsSync(tsconfigFile)).toBe(true);
    });

    test('should have workspace path mappings', () => {
      const content = JSON.parse(readFileSync(tsconfigFile, 'utf-8'));

      expect(content.compilerOptions.paths).toMatchObject({
        '@shared-types/*': ['packages/shared-types/src/*'],
        '@ui-components/*': ['packages/ui-components/src/*'],
        '@config/*': ['packages/config/src/*'],
      });
    });

    test('should have project references configured for Epic 0', () => {
      const content = JSON.parse(readFileSync(tsconfigFile, 'utf-8'));

      // During Epic 0, references are not yet configured as workspaces don't exist
      // This will be added when Epic 0 is complete and workspace tsconfig.json files exist
      expect(content.references).toBeUndefined();
    });
  });

  describe('Development Configuration', () => {
    test('Node.js version should be specified', () => {
      const nvmrcFile = join(rootDir, '.nvmrc');
      expect(existsSync(nvmrcFile)).toBe(true);

      const content = readFileSync(nvmrcFile, 'utf-8').trim();
      expect(content).toMatch(/^(v20\.\d+\.\d+|20)$/);
    });

    test('should have gitignore file', () => {
      const gitignoreFile = join(rootDir, '.gitignore');
      expect(existsSync(gitignoreFile)).toBe(true);

      const content = readFileSync(gitignoreFile, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).toContain('dist/');
    });

    test('should have code quality configuration', () => {
      expect(existsSync(join(rootDir, 'config/.eslintrc.cjs'))).toBe(true);
      expect(existsSync(join(rootDir, 'config/.prettierrc'))).toBe(true);
      expect(existsSync(join(rootDir, 'config/.editorconfig'))).toBe(true);
    });
  });
});
