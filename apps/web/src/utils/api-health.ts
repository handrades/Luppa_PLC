import { api } from '../services/api.client';
import { env } from './env';

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime?: number;
}

export const apiHealthCheck = {
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await api.health();
      return response.data;
    } catch (error) {
      if (env.ENABLE_CONSOLE_LOGS) {
        // eslint-disable-next-line no-console
        console.error('Health check failed:', error);
      }
      throw error;
    }
  },

  async waitForApi(timeout = 30000, interval = 1000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await this.checkHealth();
        return true;
      } catch {
        if (env.ENABLE_CONSOLE_LOGS) {
          // eslint-disable-next-line no-console
          console.log('Waiting for API to be available...');
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return false;
  },

  async testConnection(): Promise<{ success: boolean; response?: HealthResponse; error?: string }> {
    try {
      const response = await this.checkHealth();
      return { success: true, response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
