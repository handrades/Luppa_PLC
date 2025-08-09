/**
 * Plop.js configuration for code generation templates
 * Luppa PLC Inventory Framework
 */

export default function (plop) {
  // Set base path for templates
  plop.setGenerator('component', {
    description: 'Create a new React component with tests and stories',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (PascalCase):',
        validate: value => {
          if (/.+/.test(value)) {
            return true;
          }
          return 'Component name is required';
        },
        filter: value => {
          // Convert to PascalCase
          return value.charAt(0).toUpperCase() + value.slice(1);
        },
      },
      {
        type: 'list',
        name: 'type',
        message: 'Component type:',
        choices: [
          { name: 'Functional Component (default)', value: 'functional' },
          { name: 'Component with Context', value: 'context' },
          { name: 'Form Component', value: 'form' },
          { name: 'Page Component', value: 'page' },
        ],
        default: 'functional',
      },
      {
        type: 'input',
        name: 'directory',
        message: 'Directory (relative to apps/web/src/components):',
        default: 'common',
      },
      {
        type: 'confirm',
        name: 'withStorybook',
        message: 'Include Storybook story?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'withTests',
        message: 'Include test file?',
        default: true,
      },
    ],
    actions: data => {
      const actions = [];
      const componentPath = `apps/web/src/components/${data.directory}/{{pascalCase name}}`;

      // Main component file
      actions.push({
        type: 'add',
        path: `${componentPath}/{{pascalCase name}}.tsx`,
        templateFile: 'templates/component/component.hbs',
      });

      // Index file for easy imports
      actions.push({
        type: 'add',
        path: `${componentPath}/index.ts`,
        templateFile: 'templates/component/index.hbs',
      });

      // Test file
      if (data.withTests) {
        actions.push({
          type: 'add',
          path: `${componentPath}/{{pascalCase name}}.test.tsx`,
          templateFile: 'templates/component/test.hbs',
        });
      }

      // Storybook story (template not yet created)
      if (data.withStorybook) {
        console.log(
          'Note: Storybook template not yet available. Please create templates/component/stories.hbs'
        );
        // TODO: Uncomment when template is created
        // actions.push({
        //   type: 'add',
        //   path: `${componentPath}/{{pascalCase name}}.stories.tsx`,
        //   templateFile: 'templates/component/stories.hbs'
        // });
      }

      return actions;
    },
  });

  plop.setGenerator('api-endpoint', {
    description: 'Create a new API endpoint with controller, service, and tests',
    prompts: [
      {
        type: 'input',
        name: 'resource',
        message: 'Resource name (singular, e.g., user, plc):',
        validate: value => {
          if (/.+/.test(value)) {
            return true;
          }
          return 'Resource name is required';
        },
        filter: value => value.toLowerCase(),
      },
      {
        type: 'input',
        name: 'version',
        message: 'API version:',
        default: 'v1',
      },
      {
        type: 'checkbox',
        name: 'methods',
        message: 'HTTP methods to implement:',
        choices: [
          { name: 'GET /resources (list)', value: 'list', checked: true },
          { name: 'GET /resources/:id (get)', value: 'get', checked: true },
          { name: 'POST /resources (create)', value: 'create', checked: true },
          { name: 'PUT /resources/:id (update)', value: 'update', checked: true },
          { name: 'DELETE /resources/:id (delete)', value: 'delete', checked: false },
        ],
      },
      {
        type: 'confirm',
        name: 'withValidation',
        message: 'Include request validation?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'withTests',
        message: 'Include test files?',
        default: true,
      },
    ],
    actions: data => {
      const actions = [];
      const basePath = 'apps/api/src';

      // Controller
      actions.push({
        type: 'add',
        path: `${basePath}/controllers/{{camelCase resource}}.controller.ts`,
        templateFile: 'templates/api/controller.hbs',
      });

      // Service
      actions.push({
        type: 'add',
        path: `${basePath}/services/{{camelCase resource}}.service.ts`,
        templateFile: 'templates/api/service.hbs',
      });

      // Routes
      actions.push({
        type: 'add',
        path: `${basePath}/routes/{{data.version}}/{{camelCase resource}}.routes.ts`,
        templateFile: 'templates/api/routes.hbs',
      });

      // Validation schemas (if requested)
      if (data.withValidation) {
        actions.push({
          type: 'add',
          path: `${basePath}/validators/{{camelCase resource}}.validator.ts`,
          templateFile: 'templates/api/validator.hbs',
        });
      }

      // Test files
      if (data.withTests) {
        actions.push({
          type: 'add',
          path: `${basePath}/__tests__/controllers/{{camelCase resource}}.controller.test.ts`,
          templateFile: 'templates/api/controller.test.hbs',
        });

        actions.push({
          type: 'add',
          path: `${basePath}/__tests__/services/{{camelCase resource}}.service.test.ts`,
          templateFile: 'templates/api/service.test.hbs',
        });
      }

      return actions;
    },
  });

  plop.setGenerator('entity', {
    description: 'Create a new TypeORM database entity with migration',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Entity name (PascalCase):',
        validate: value => {
          if (/.+/.test(value)) {
            return true;
          }
          return 'Entity name is required';
        },
        filter: value => {
          return value.charAt(0).toUpperCase() + value.slice(1);
        },
      },
      {
        type: 'input',
        name: 'tableName',
        message: 'Table name (snake_case):',
        default: answers => {
          // Convert PascalCase to snake_case
          return answers.name
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .substring(1);
        },
      },
      {
        type: 'confirm',
        name: 'extendsBase',
        message: 'Extend BaseEntity (includes id, createdAt, updatedAt)?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'withMigration',
        message: 'Generate database migration?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'withSeed',
        message: 'Generate seed file?',
        default: false,
      },
    ],
    actions: data => {
      const actions = [];
      const basePath = 'apps/api/src';

      // Entity file
      actions.push({
        type: 'add',
        path: `${basePath}/entities/{{pascalCase name}}.ts`,
        templateFile: 'templates/entity/entity.hbs',
      });

      // Update entities index file
      actions.push({
        type: 'append',
        path: `${basePath}/entities/index.ts`,
        template: "export { {{pascalCase name}} } from './{{pascalCase name}}';",
      });

      // Generate migration (with timestamp)
      if (data.withMigration) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[-T:.Z]/g, '')
          .substring(0, 14);
        actions.push({
          type: 'add',
          path: `${basePath}/database/migrations/${timestamp}-Create{{pascalCase name}}.ts`,
          templateFile: 'templates/entity/migration.hbs',
          data: { timestamp },
        });
      }

      // Generate seed file
      if (data.withSeed) {
        actions.push({
          type: 'add',
          path: `${basePath}/database/seeds/{{dashCase name}}-seed.ts`,
          templateFile: 'templates/entity/seed.hbs',
        });
      }

      return actions;
    },
  });

  // Add helper for generating script commands
  plop.setHelper('scriptCommand', function (name) {
    return `pnpm plop ${name}`;
  });

  // Add scripts to package.json
  plop.setGenerator('add-scripts', {
    description: 'Add generation scripts to package.json',
    prompts: [],
    actions: [
      {
        type: 'modify',
        path: 'package.json',
        pattern: /"generate:types": "pwsh -File scripts\/generate-types\.ps1"/,
        template:
          '"generate:types": "pwsh -File scripts/generate-types.ps1",\n    "generate:component": "plop component",\n    "generate:api": "plop api-endpoint",\n    "generate:entity": "plop entity",\n    "generate": "plop"',
      },
    ],
  });
}
