// Docker Compose Configuration Tests
// Tests to validate Docker Compose files and configurations

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

describe('Docker Compose Configuration Tests', () => {
  let prodCompose, swarmCompose;

  beforeAll(() => {
    // Load Docker Compose files
    const prodComposePath = path.join(__dirname, '../../docker-compose.prod.yml');
    const swarmComposePath = path.join(__dirname, '../swarm/docker-compose.swarm.yml');

    try {
      const prodContent = fs.readFileSync(prodComposePath, 'utf8');
      prodCompose = yaml.load(prodContent);
    } catch (error) {
      throw new Error(`Failed to load production compose file: ${error.message}`);
    }

    try {
      const swarmContent = fs.readFileSync(swarmComposePath, 'utf8');
      swarmCompose = yaml.load(swarmContent);
    } catch (error) {
      throw new Error(`Failed to load swarm compose file: ${error.message}`);
    }
  });

  describe('Production Docker Compose', () => {
    test('should have all required services', () => {
      const requiredServices = [
        'postgres',
        'pgbouncer',
        'redis',
        'api',
        'web',
        'nginx',
        'prometheus',
        'grafana',
      ];

      requiredServices.forEach(service => {
        expect(prodCompose.services).toHaveProperty(service);
      });
    });

    test('should have proper network configuration', () => {
      expect(prodCompose.networks).toBeDefined();
      expect(prodCompose.networks).toHaveProperty('luppa-prod');
      expect(prodCompose.networks).toHaveProperty('luppa-monitoring');

      // Check overlay network driver for production
      expect(prodCompose.networks['luppa-prod'].driver).toBe('overlay');
      expect(prodCompose.networks['luppa-monitoring'].driver).toBe('overlay');
    });

    test('should have proper volume configuration', () => {
      const requiredVolumes = [
        'postgres-data',
        'redis-data',
        'grafana-data',
        'prometheus-data',
        'ssl-certs',
      ];

      requiredVolumes.forEach(volume => {
        expect(prodCompose.volumes).toHaveProperty(volume);
      });
    });

    test('should have Docker secrets configured', () => {
      const requiredSecrets = [
        'postgres-password',
        'redis-password',
        'jwt-secret',
        'ssl-cert',
        'ssl-key',
      ];

      requiredSecrets.forEach(secret => {
        expect(prodCompose.secrets).toHaveProperty(secret);
        expect(prodCompose.secrets[secret].external).toBe(true);
      });
    });

    test('should have health checks for all services', () => {
      const servicesRequiringHealthChecks = [
        'postgres',
        'pgbouncer',
        'redis',
        'api',
        'web',
        'nginx',
        'prometheus',
        'grafana',
      ];

      servicesRequiringHealthChecks.forEach(serviceName => {
        const service = prodCompose.services[serviceName];
        expect(service.healthcheck).toBeDefined();
        expect(service.healthcheck.test).toBeDefined();
        expect(service.healthcheck.interval).toBeDefined();
        expect(service.healthcheck.timeout).toBeDefined();
        expect(service.healthcheck.retries).toBeDefined();
      });
    });

    test('should have proper resource limits', () => {
      const services = Object.keys(prodCompose.services);

      services.forEach(serviceName => {
        const service = prodCompose.services[serviceName];
        expect(service.deploy).toBeDefined();
        expect(service.deploy.resources).toBeDefined();
        expect(service.deploy.resources.limits).toBeDefined();
        expect(service.deploy.resources.reservations).toBeDefined();
      });
    });

    test('API service should have correct configuration', () => {
      const apiService = prodCompose.services.api;

      expect(apiService.networks).toContain('luppa-prod');
      expect(apiService.networks).toContain('luppa-monitoring');
      expect(apiService.environment.NODE_ENV).toBe('production');
      expect(apiService.environment.POSTGRES_HOST).toBe('pgbouncer');
      expect(apiService.secrets).toContain('jwt-secret');
    });

    test('Nginx service should have SSL configuration', () => {
      const nginxService = prodCompose.services.nginx;

      expect(nginxService.ports).toBeDefined();
      expect(nginxService.secrets).toBeDefined();

      // Check if secrets are configured as objects with source property
      const secretSources = nginxService.secrets.map(secret =>
        typeof secret === 'object' ? secret.source : secret
      );
      expect(secretSources).toContain('ssl-cert');
      expect(secretSources).toContain('ssl-key');
    });
  });

  describe('Docker Swarm Configuration', () => {
    test('should have proper deployment configuration', () => {
      const services = Object.keys(swarmCompose.services);

      services.forEach(serviceName => {
        const service = swarmCompose.services[serviceName];
        expect(service.deploy).toBeDefined();

        // Check for deployment-specific configurations
        if (service.deploy.placement) {
          expect(service.deploy.placement).toBeDefined();
        }

        if (service.deploy.replicas) {
          expect(typeof service.deploy.replicas).toBe('number');
          expect(service.deploy.replicas).toBeGreaterThan(0);
        }
      });
    });

    test('should have proper update configurations', () => {
      const criticalServices = ['api', 'web', 'postgres'];

      criticalServices.forEach(serviceName => {
        const service = swarmCompose.services[serviceName];
        expect(service.deploy.update_config).toBeDefined();
        expect(service.deploy.update_config.parallelism).toBeDefined();
        expect(service.deploy.update_config.delay).toBeDefined();
        expect(service.deploy.update_config.failure_action).toBe('rollback');
      });
    });

    test('should have encrypted overlay networks', () => {
      expect(swarmCompose.networks['luppa-prod'].encrypted).toBe(true);
      expect(swarmCompose.networks['luppa-monitoring'].encrypted).toBe(true);
    });

    test('should have proper volume binds for persistent data', () => {
      const volumeServices = ['postgres', 'redis', 'grafana', 'prometheus'];

      volumeServices.forEach(serviceName => {
        const service = swarmCompose.services[serviceName];
        expect(service.volumes).toBeDefined();
        expect(Array.isArray(service.volumes)).toBe(true);
        expect(service.volumes.length).toBeGreaterThan(0);
      });
    });

    test('should have placement constraints for stateful services', () => {
      const statefulServices = ['postgres', 'redis', 'prometheus', 'grafana'];

      statefulServices.forEach(serviceName => {
        const service = swarmCompose.services[serviceName];
        expect(service.deploy.placement).toBeDefined();
        expect(service.deploy.placement.constraints).toBeDefined();
      });
    });
  });

  describe('Configuration Consistency', () => {
    test('service names should be consistent between files', () => {
      const prodServices = Object.keys(prodCompose.services);
      const swarmServices = Object.keys(swarmCompose.services);

      expect(prodServices.sort()).toEqual(swarmServices.sort());
    });

    test('network names should be consistent', () => {
      const prodNetworks = Object.keys(prodCompose.networks);
      const swarmNetworks = Object.keys(swarmCompose.networks);

      expect(prodNetworks.sort()).toEqual(swarmNetworks.sort());
    });

    test('volume names should be consistent', () => {
      const prodVolumes = Object.keys(prodCompose.volumes);
      const swarmVolumes = Object.keys(swarmCompose.volumes);

      expect(prodVolumes.sort()).toEqual(swarmVolumes.sort());
    });
  });
});

describe('Infrastructure Files Validation', () => {
  test('SSL certificate generation script should exist and be executable', () => {
    const scriptPath = path.join(__dirname, '../ssl/generate-self-signed-cert.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);

    try {
      fs.accessSync(scriptPath, fs.constants.X_OK);
    } catch (error) {
      fail(`Script is not executable: ${error.message}`);
    }
  });

  test('Nginx production configuration should exist', () => {
    const nginxConfigPath = path.join(__dirname, '../nginx/nginx.prod.conf');
    expect(fs.existsSync(nginxConfigPath)).toBe(true);

    const config = fs.readFileSync(nginxConfigPath, 'utf8');
    expect(config).toContain('upstream api_backend');
    expect(config).toContain('ssl_protocols TLSv1.2 TLSv1.3');
    expect(config).toContain('add_header Strict-Transport-Security');
  });

  test('Prometheus configuration should be valid YAML', () => {
    const prometheusConfigPath = path.join(__dirname, '../monitoring/prometheus/prometheus.yml');
    expect(fs.existsSync(prometheusConfigPath)).toBe(true);

    const config = yaml.load(fs.readFileSync(prometheusConfigPath, 'utf8'));
    expect(config.global).toBeDefined();
    expect(config.scrape_configs).toBeDefined();
    expect(Array.isArray(config.scrape_configs)).toBe(true);
  });

  test('Grafana configuration should exist', () => {
    const grafanaConfigPath = path.join(__dirname, '../monitoring/grafana/grafana.ini');
    expect(fs.existsSync(grafanaConfigPath)).toBe(true);

    const config = fs.readFileSync(grafanaConfigPath, 'utf8');
    expect(config).toContain('[security]');
    expect(config).toContain('[users]');
    expect(config).toContain('allow_sign_up = false');
  });

  test('Deployment script should exist', () => {
    const deployScriptPath = path.join(__dirname, '../swarm/deploy.ps1');
    expect(fs.existsSync(deployScriptPath)).toBe(true);

    const script = fs.readFileSync(deployScriptPath, 'utf8');
    expect(script).toContain('param(');
    expect(script).toContain('Initialize-Swarm');
    expect(script).toContain('Deploy-Stack');
  });
});

describe('Environment Configuration Tests', () => {
  test('production environment template should exist', () => {
    const envPath = path.join(__dirname, '../../.env.production.example');
    expect(fs.existsSync(envPath)).toBe(true);

    const env = fs.readFileSync(envPath, 'utf8');
    expect(env).toContain('NODE_ENV=production');
    expect(env).toContain('POSTGRES_HOST=postgres');
    expect(env).toContain('REDIS_HOST=redis');
  });

  test('environment variables should not contain development values', () => {
    const envPath = path.join(__dirname, '../../.env.production.example');
    const env = fs.readFileSync(envPath, 'utf8');

    // Should not contain development-specific values
    expect(env).not.toContain('dev_password');
    expect(env).not.toContain('localhost:3011');
    expect(env).not.toContain('VITE_ENABLE_DEBUG_TOOLS=true');
  });
});
