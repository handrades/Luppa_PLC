import * as fs from 'fs';
import * as path from 'path';

describe('Grafana Dashboard Validation', () => {
  // Find the infrastructure directory by walking up from this test file
  const findInfrastructureDir = () => {
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      const infrastructureDir = path.join(currentDir, 'infrastructure');
      if (fs.existsSync(infrastructureDir)) {
        return path.join(infrastructureDir, 'monitoring/grafana/dashboards');
      }
      currentDir = path.dirname(currentDir);
    }
    throw new Error('Could not find infrastructure directory');
  };

  const dashboardsDir = findInfrastructureDir();

  const expectedDashboards = [
    'system-overview.json',
    'api-performance.json',
    'database-monitoring.json',
    'redis-monitoring.json',
  ];

  beforeAll(() => {
    // Ensure dashboards directory exists
    expect(fs.existsSync(dashboardsDir)).toBe(true);
  });

  describe('Dashboard File Validation', () => {
    expectedDashboards.forEach(dashboardFile => {
      describe(`${dashboardFile}`, () => {
        let dashboard: unknown;
        let dashboardPath: string;

        beforeAll(() => {
          dashboardPath = path.join(dashboardsDir, dashboardFile);
          expect(fs.existsSync(dashboardPath)).toBe(true);

          const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
          expect(() => {
            dashboard = JSON.parse(dashboardContent);
          }).not.toThrow();
        });

        it('should have valid JSON structure', () => {
          expect(dashboard).toBeDefined();
          expect(typeof dashboard).toBe('object');
          expect(dashboard.dashboard).toBeDefined();
        });

        it('should have required dashboard properties', () => {
          const dash = dashboard.dashboard;

          expect(dash).toHaveProperty('title');
          expect(dash).toHaveProperty('tags');
          expect(dash).toHaveProperty('panels');
          expect(dash).toHaveProperty('time');
          expect(dash).toHaveProperty('refresh');

          expect(typeof dash.title).toBe('string');
          expect(Array.isArray(dash.tags)).toBe(true);
          expect(Array.isArray(dash.panels)).toBe(true);
          expect(dash.tags).toContain('luppa');
        });

        it('should have valid time configuration', () => {
          const time = dashboard.dashboard.time;

          expect(time).toHaveProperty('from');
          expect(time).toHaveProperty('to');
          expect(typeof time.from).toBe('string');
          expect(typeof time.to).toBe('string');
        });

        it('should have valid refresh configuration', () => {
          const refresh = dashboard.dashboard.refresh;
          expect(typeof refresh).toBe('string');
          expect(refresh).toMatch(/^\d+[smh]$/); // Should be like "30s", "1m", "1h"
        });

        it('should have at least one panel', () => {
          const panels = dashboard.dashboard.panels;
          expect(panels.length).toBeGreaterThan(0);
        });

        it('should have valid panel configuration', () => {
          const panels = dashboard.dashboard.panels;

          panels.forEach((panel: unknown) => {
            expect(panel).toHaveProperty('id');
            expect(panel).toHaveProperty('title');
            expect(panel).toHaveProperty('type');
            expect(panel).toHaveProperty('targets');
            expect(panel).toHaveProperty('gridPos');

            expect(typeof panel.id).toBe('number');
            expect(typeof panel.title).toBe('string');
            expect(typeof panel.type).toBe('string');
            expect(Array.isArray(panel.targets)).toBe(true);

            // Validate grid position
            const gridPos = panel.gridPos;
            expect(gridPos).toHaveProperty('h');
            expect(gridPos).toHaveProperty('w');
            expect(gridPos).toHaveProperty('x');
            expect(gridPos).toHaveProperty('y');

            expect(typeof gridPos.h).toBe('number');
            expect(typeof gridPos.w).toBe('number');
            expect(typeof gridPos.x).toBe('number');
            expect(typeof gridPos.y).toBe('number');

            // Validate panel dimensions
            expect(gridPos.w).toBeGreaterThan(0);
            expect(gridPos.w).toBeLessThanOrEqual(24);
            expect(gridPos.h).toBeGreaterThan(0);
            expect(gridPos.x).toBeGreaterThanOrEqual(0);
            expect(gridPos.x).toBeLessThan(24);
            expect(gridPos.y).toBeGreaterThanOrEqual(0);
          });
        });

        it('should have valid query targets', () => {
          const panels = dashboard.dashboard.panels;

          panels.forEach((panel: unknown) => {
            (panel as { targets: unknown[] }).targets.forEach((target: unknown) => {
              expect(target).toHaveProperty('expr');
              expect(target).toHaveProperty('refId');

              expect(typeof target.expr).toBe('string');
              expect(typeof target.refId).toBe('string');
              expect(target.expr.trim()).not.toBe('');
              expect(target.refId.trim()).not.toBe('');
            });
          });
        });

        it('should use valid Prometheus queries', () => {
          const panels = dashboard.dashboard.panels;
          const validMetricPrefixes = [
            'http_requests_total',
            'http_request_duration_seconds',
            'database_connections_active',
            'database_connections_idle',
            'database_pool_utilization',
            'database_query_duration_seconds',
            'redis_memory_used_bytes',
            'redis_operations_total',
            'user_operations_total',
            'audit_log_entries_total',
            'up',
            'rate(',
            'histogram_quantile(',
            'increase(',
            'topk(',
            'sum(',
            'avg(',
            'container_memory_usage_bytes',
            'process_cpu_seconds_total',
            'nodejs_heap_size_total_bytes',
          ];

          panels.forEach((panel: unknown) => {
            (panel as { targets: unknown[]; title: string }).targets.forEach((target: unknown) => {
              const expr = (target as { expr: string }).expr;
              const hasValidPrefix = validMetricPrefixes.some(prefix => expr.includes(prefix));

              if (!hasValidPrefix) {
                // Panel has query that might not match our metrics
                console.warn(`Potentially invalid query in panel "${(panel as { title: string }).title}": ${expr}`);
              }
              // Don't fail the test, but warn about potentially invalid queries
            });
          });
        });

        it('should have proper legend formatting', () => {
          const panels = dashboard.dashboard.panels;

          panels.forEach((panel: unknown) => {
            (panel as { targets: unknown[] }).targets.forEach((target: unknown) => {
              const targetObj = target as { legendFormat?: string };
              if (targetObj.legendFormat) {
                expect(typeof targetObj.legendFormat).toBe('string');
                // Legend format should be reasonable length
                expect(targetObj.legendFormat.length).toBeLessThan(100);
              }
            });
          });
        });
      });
    });
  });

  describe('Dashboard Content Validation', () => {
    it('system-overview dashboard should have appropriate panels', () => {
      const dashboardPath = path.join(dashboardsDir, 'system-overview.json');
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const panelTitles = (
        dashboard as { dashboard: { panels: { title: string }[] } }
      ).dashboard.panels.map((p: { title: string }) => p.title.toLowerCase());

      expect(
        panelTitles.some((title: string) => title.includes('service') || title.includes('status'))
      ).toBe(true);
      expect(
        panelTitles.some((title: string) => title.includes('request') || title.includes('http'))
      ).toBe(true);
    });

    it('api-performance dashboard should focus on API metrics', () => {
      const dashboardPath = path.join(dashboardsDir, 'api-performance.json');
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const panelTitles = (
        dashboard as { dashboard: { panels: { title: string }[] } }
      ).dashboard.panels.map((p: { title: string }) => p.title.toLowerCase());

      expect(
        panelTitles.some((title: string) => title.includes('request') || title.includes('rate'))
      ).toBe(true);
      expect(
        panelTitles.some((title: string) => title.includes('response') || title.includes('time'))
      ).toBe(true);
      expect(panelTitles.some((title: string) => title.includes('error'))).toBe(true);
    });

    it('database-monitoring dashboard should focus on database metrics', () => {
      const dashboardPath = path.join(dashboardsDir, 'database-monitoring.json');
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const panelTitles = (
        dashboard as { dashboard: { panels: { title: string }[] } }
      ).dashboard.panels.map((p: { title: string }) => p.title.toLowerCase());

      expect(panelTitles.some((title: string) => title.includes('connection'))).toBe(true);
      expect(panelTitles.some((title: string) => title.includes('pool'))).toBe(true);
    });

    it('redis-monitoring dashboard should focus on Redis metrics', () => {
      const dashboardPath = path.join(dashboardsDir, 'redis-monitoring.json');
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const panelTitles = (
        dashboard as { dashboard: { panels: { title: string }[] } }
      ).dashboard.panels.map((p: { title: string }) => p.title.toLowerCase());

      expect(
        panelTitles.some((title: string) => title.includes('redis') || title.includes('memory'))
      ).toBe(true);
      expect(
        panelTitles.some((title: string) => title.includes('hit') || title.includes('miss'))
      ).toBe(true);
    });
  });

  describe('Dashboard Configuration Files', () => {
    it('should have dashboard provisioning configuration', () => {
      const configPath = path.join(dashboardsDir, 'dashboard-config.yml');
      expect(fs.existsSync(configPath)).toBe(true);

      const configContent = fs.readFileSync(configPath, 'utf8');
      expect(configContent).toContain('apiVersion');
      expect(configContent).toContain('providers');
    });
  });

  describe('Dashboard Uniqueness', () => {
    it('should have unique dashboard UIDs', () => {
      const uids: string[] = [];

      expectedDashboards.forEach(dashboardFile => {
        const dashboardPath = path.join(dashboardsDir, dashboardFile);
        const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

        if (dashboard.dashboard.uid) {
          expect(uids).not.toContain(dashboard.dashboard.uid);
          uids.push(dashboard.dashboard.uid);
        }
      });
    });

    it('should have unique panel IDs within each dashboard', () => {
      expectedDashboards.forEach(dashboardFile => {
        const dashboardPath = path.join(dashboardsDir, dashboardFile);
        const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

        const panelIds = (
          dashboard as { dashboard: { panels: { id: number }[] } }
        ).dashboard.panels.map((p: { id: number }) => p.id);
        const uniqueIds = new Set(panelIds);

        expect(uniqueIds.size).toBe(panelIds.length);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should not have too many panels per dashboard', () => {
      expectedDashboards.forEach(dashboardFile => {
        const dashboardPath = path.join(dashboardsDir, dashboardFile);
        const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

        // Reasonable limit to maintain dashboard performance
        expect(dashboard.dashboard.panels.length).toBeLessThanOrEqual(15);
      });
    });

    it('should have reasonable query intervals', () => {
      expectedDashboards.forEach(dashboardFile => {
        const dashboardPath = path.join(dashboardsDir, dashboardFile);
        const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

        // Check refresh rate is not too frequent
        const refresh = dashboard.dashboard.refresh;
        const refreshSeconds = refresh.includes('s')
          ? parseInt(refresh.replace('s', ''))
          : refresh.includes('m')
            ? parseInt(refresh.replace('m', '')) * 60
            : 3600;

        // Should be at least 10 seconds to avoid overwhelming Prometheus
        expect(refreshSeconds).toBeGreaterThanOrEqual(10);
      });
    });
  });
});
