/**
 * Docker Compose Configuration Tests
 * Tests the docker-compose.dev.yml configuration for correctness
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface DockerComposeService {
  image?: string;
  build?: {
    context: string;
    dockerfile: string;
  };
  environment?: Record<string, string>;
  ports?: string[];
  volumes?: string[];
  depends_on?: Record<string, { condition: string }> | string[];
  healthcheck?: {
    test: string[];
    interval: string;
    timeout: string;
    retries: number;
    start_period?: string;
  };
  networks?: string[];
  deploy?: {
    resources: {
      limits: {
        memory: string;
        cpus: string;
      };
      reservations: {
        memory: string;
        cpus: string;
      };
    };
  };
  command?: string;
  restart?: string;
  container_name?: string;
}

interface DockerComposeConfig {
  version: string;
  services: Record<string, DockerComposeService>;
  networks: Record<string, { driver: string; name?: string }>;
  volumes: Record<string, { name?: string }>;
}

describe('Docker Compose Configuration', () => {
  let dockerCompose: DockerComposeConfig;
  const dockerComposePath = path.resolve(__dirname, '../../docker-compose.dev.yml');

  beforeAll(() => {
    // Load and parse docker-compose.dev.yml
    expect(fs.existsSync(dockerComposePath)).toBe(true);
    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
    dockerCompose = yaml.load(dockerComposeContent);
  });

  describe('Basic Structure', () => {
    test('should not have obsolete version field', () => {
      expect(dockerCompose.version).toBeUndefined();
    });

    test('should define required services', () => {
      const requiredServices = ['postgres', 'redis', 'api', 'web', 'nginx'];
      const definedServices = Object.keys(dockerCompose.services);

      requiredServices.forEach(service => {
        expect(definedServices).toContain(service);
      });
    });

    test('should define custom network', () => {
      expect(dockerCompose.networks).toBeDefined();
      expect(dockerCompose.networks['luppa-dev']).toBeDefined();
      expect(dockerCompose.networks['luppa-dev'].driver).toBe('bridge');
    });

    test('should define persistent volumes', () => {
      expect(dockerCompose.volumes).toBeDefined();
      expect(dockerCompose.volumes['postgres-data']).toBeDefined();
      expect(dockerCompose.volumes['redis-data']).toBeDefined();
    });
  });

  describe('PostgreSQL Service', () => {
    let postgresService: DockerComposeService;

    beforeAll(() => {
      postgresService = dockerCompose.services.postgres;
    });

    test('should use correct PostgreSQL image', () => {
      expect(postgresService.image).toBe('postgres:17');
    });

    test('should have proper environment variables', () => {
      expect(postgresService.environment).toBeDefined();
      expect(postgresService.environment.POSTGRES_DB).toBeDefined();
      expect(postgresService.environment.POSTGRES_USER).toBeDefined();
      expect(postgresService.environment.POSTGRES_PASSWORD).toBeDefined();
    });

    test('should have health check configured', () => {
      expect(postgresService.healthcheck).toBeDefined();
      expect(postgresService.healthcheck.test).toBeDefined();
      expect(postgresService.healthcheck.interval).toBe('30s');
    });

    test('should have persistent volume mounted', () => {
      expect(postgresService.volumes).toContain('postgres-data:/var/lib/postgresql/data');
    });

    test('should have initialization scripts mounted', () => {
      const initScriptMount = postgresService.volumes.find(vol =>
        vol.includes(':/docker-entrypoint-initdb.d')
      );
      expect(initScriptMount).toBeDefined();
    });

    test('should have resource limits', () => {
      expect(postgresService.deploy.resources.limits).toBeDefined();
      expect(postgresService.deploy.resources.limits.memory).toBe('512M');
    });
  });

  describe('Redis Service', () => {
    let redisService: DockerComposeService;

    beforeAll(() => {
      redisService = dockerCompose.services.redis;
    });

    test('should use correct Redis image', () => {
      expect(redisService.image).toBe('redis:8-alpine');
    });

    test('should have AOF persistence enabled', () => {
      expect(redisService.command).toContain('--appendonly yes');
      expect(redisService.command).toContain('--appendfsync everysec');
    });

    test('should have memory limit configuration', () => {
      expect(redisService.command).toContain('--maxmemory');
      expect(redisService.command).toContain('--maxmemory-policy');
    });

    test('should have persistent volume mounted', () => {
      expect(redisService.volumes).toContain('redis-data:/data');
    });

    test('should have health check configured', () => {
      expect(redisService.healthcheck).toBeDefined();
      expect(redisService.healthcheck.test[0]).toBe('CMD');
      expect(redisService.healthcheck.test[1]).toBe('redis-cli');
    });
  });

  describe('API Service', () => {
    let apiService: DockerComposeService;

    beforeAll(() => {
      apiService = dockerCompose.services.api;
    });

    test('should have build configuration', () => {
      expect(apiService.build).toBeDefined();
      expect(apiService.build.context).toBe('.');
      expect(apiService.build.dockerfile).toBe('apps/api/Dockerfile.dev');
    });

    test('should depend on database services', () => {
      expect(apiService.depends_on).toBeDefined();
      expect(apiService.depends_on.postgres.condition).toBe('service_healthy');
      expect(apiService.depends_on.redis.condition).toBe('service_healthy');
    });

    test('should have proper environment variables', () => {
      expect(apiService.environment.NODE_ENV).toBe('development');
      expect(apiService.environment.POSTGRES_HOST).toBe('postgres');
      expect(apiService.environment.REDIS_HOST).toBe('redis');
    });

    test('should have volume mounts for development', () => {
      // Check for selective source code mounting
      expect(apiService.volumes).toContain('./apps/api/src:/workspace/apps/api/src');
      // Check for named volumes for dependencies
      const hasNodeModulesVolume = apiService.volumes.some(vol =>
        vol.includes('api-node-modules:/workspace/node_modules')
      );
      expect(hasNodeModulesVolume).toBe(true);
    });

    test('should have health check configured', () => {
      expect(apiService.healthcheck).toBeDefined();
      expect(apiService.healthcheck.test).toContain('curl');
    });
  });

  describe('Web Service', () => {
    let webService: DockerComposeService;

    beforeAll(() => {
      webService = dockerCompose.services.web;
    });

    test('should have build configuration', () => {
      expect(webService.build).toBeDefined();
      expect(webService.build.context).toBe('.');
      expect(webService.build.dockerfile).toBe('apps/web/Dockerfile.dev');
    });

    test('should depend on API service', () => {
      expect(webService.depends_on).toContain('api');
    });

    test('should have development environment variables', () => {
      expect(webService.environment.NODE_ENV).toBe('development');
      expect(webService.environment.VITE_API_BASE_URL).toBeDefined();
    });

    test('should have volume mounts for development', () => {
      // Check for selective source code mounting
      expect(webService.volumes).toContain('./apps/web/src:/workspace/apps/web/src');
      // Check for named volumes for dependencies
      const hasNodeModulesVolume = webService.volumes.some(vol =>
        vol.includes('web-node-modules:/workspace/node_modules')
      );
      expect(hasNodeModulesVolume).toBe(true);
    });
  });

  describe('Nginx Service', () => {
    let nginxService: DockerComposeService;

    beforeAll(() => {
      nginxService = dockerCompose.services.nginx;
    });

    test('should use correct Nginx image', () => {
      expect(nginxService.image).toBe('nginx:1.27-alpine');
    });

    test('should depend on API and Web services', () => {
      expect(nginxService.depends_on).toContain('api');
      expect(nginxService.depends_on).toContain('web');
    });

    test('should have configuration files mounted', () => {
      const configMount = nginxService.volumes.find(vol =>
        vol.includes('nginx.conf:/etc/nginx/nginx.conf')
      );
      expect(configMount).toBeDefined();
    });

    test('should have health check configured', () => {
      expect(nginxService.healthcheck).toBeDefined();
      expect(nginxService.healthcheck.test).toContain('wget');
    });
  });

  describe('Network Configuration', () => {
    test('all services should be on the same network', () => {
      const services = Object.values(dockerCompose.services);

      services.forEach(service => {
        expect(service.networks).toContain('luppa-dev');
      });
    });
  });

  describe('Resource Limits', () => {
    test('all services should have resource limits defined', () => {
      const services = Object.values(dockerCompose.services);

      services.forEach(service => {
        expect(service.deploy?.resources?.limits).toBeDefined();
        expect(service.deploy.resources.limits.memory).toBeDefined();
        expect(service.deploy.resources.limits.cpus).toBeDefined();
      });
    });
  });
});

describe('Supporting Files', () => {
  test('PostgreSQL initialization script should exist', () => {
    const initScriptPath = path.resolve(__dirname, '../docker/postgres/init.sql');
    expect(fs.existsSync(initScriptPath)).toBe(true);
  });

  test('Nginx configuration should exist', () => {
    const nginxConfigPath = path.resolve(__dirname, '../docker/nginx.conf');
    expect(fs.existsSync(nginxConfigPath)).toBe(true);
  });

  test('API Dockerfile.dev should exist', () => {
    const apiDockerfilePath = path.resolve(__dirname, '../../apps/api/Dockerfile.dev');
    expect(fs.existsSync(apiDockerfilePath)).toBe(true);
  });

  test('Web Dockerfile.dev should exist', () => {
    const webDockerfilePath = path.resolve(__dirname, '../../apps/web/Dockerfile.dev');
    expect(fs.existsSync(webDockerfilePath)).toBe(true);
  });

  test('.env.example should exist', () => {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  test('psakefile.ps1 should exist with Docker tasks', () => {
    const psakefilePath = path.resolve(__dirname, '../../psakefile.ps1');
    expect(fs.existsSync(psakefilePath)).toBe(true);

    // Check that the psakefile contains Docker management tasks
    const psakefileContent = fs.readFileSync(psakefilePath, 'utf8');
    expect(psakefileContent).toContain('Task DockerUp');
    expect(psakefileContent).toContain('Task DockerDown');
    expect(psakefileContent).toContain('Task DockerHealth');
  });
});

describe('Environment Configuration', () => {
  let envExample: string;

  beforeAll(() => {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    envExample = fs.readFileSync(envExamplePath, 'utf8');
  });

  test('should contain database configuration variables', () => {
    expect(envExample).toContain('POSTGRES_HOST');
    expect(envExample).toContain('POSTGRES_PORT');
    expect(envExample).toContain('POSTGRES_DB');
    expect(envExample).toContain('POSTGRES_USER');
    expect(envExample).toContain('POSTGRES_PASSWORD');
  });

  test('should contain Redis configuration variables', () => {
    expect(envExample).toContain('REDIS_HOST');
    expect(envExample).toContain('REDIS_PORT');
    expect(envExample).toContain('REDIS_PASSWORD');
  });

  test('should contain API configuration variables', () => {
    expect(envExample).toContain('API_PORT');
    expect(envExample).toContain('JWT_SECRET');
    expect(envExample).toContain('CORS_ORIGIN');
  });

  test('should contain web configuration variables', () => {
    expect(envExample).toContain('WEB_PORT');
    expect(envExample).toContain('VITE_API_BASE_URL');
  });
});
