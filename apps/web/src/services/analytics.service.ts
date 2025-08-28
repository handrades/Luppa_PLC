import axios from 'axios';
import {
  AnalyticsExportData,
  AnalyticsExportOptions,
  DashboardOverview,
  DistributionData,
  HierarchyNode,
  RecentActivity,
  TopModel,
} from '../types/analytics';
import { env } from '../utils/env';

const API_BASE_URL = env.API_URL || 'http://localhost:3010/api/v1';

class AnalyticsService {
  private baseUrl = `${API_BASE_URL}/analytics`;

  private getAuthHeaders() {
    const tokenKey = env.AUTH_TOKEN_KEY || 'authToken';
    const token = localStorage.getItem(tokenKey);
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    return {};
  }

  async getOverview(): Promise<DashboardOverview> {
    const response = await axios.get(`${this.baseUrl}/overview`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getDistribution(type: 'site' | 'make' | 'equipment_type'): Promise<DistributionData> {
    const response = await axios.get(`${this.baseUrl}/distribution/${type}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getTopModels(limit: number = 10): Promise<TopModel[]> {
    const response = await axios.get(`${this.baseUrl}/top-models`, {
      params: { limit },
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getHierarchy(): Promise<HierarchyNode[]> {
    const response = await axios.get(`${this.baseUrl}/hierarchy`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getRecentActivity(
    limit: number = 20,
    page: number = 1
  ): Promise<{
    data: RecentActivity[];
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    const response = await axios.get(`${this.baseUrl}/recent-activity`, {
      params: { limit, page },
      headers: this.getAuthHeaders(),
    });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  }

  async exportDashboard(options: AnalyticsExportOptions): Promise<AnalyticsExportData> {
    const response = await axios.post(`${this.baseUrl}/export`, options, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async clearCache(): Promise<void> {
    await axios.post(
      `${this.baseUrl}/cache/clear`,
      {},
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  // Helper method to format relative time
  formatRelativeTime(timestamp: Date | string): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString();
  }

  // Helper method to format large numbers
  formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  // Helper method to get entity type icon
  getEntityIcon(entityType: 'plc' | 'equipment' | 'cell' | 'site'): string {
    const icons: Record<string, string> = {
      plc: '🔌',
      equipment: '⚙️',
      cell: '🏭',
      site: '🏢',
    };
    return icons[entityType] || '📦';
  }

  // Helper method to get action color
  getActionColor(action: 'create' | 'update' | 'delete'): string {
    const colors: Record<string, string> = {
      create: '#4caf50',
      update: '#2196f3',
      delete: '#f44336',
    };
    return colors[action] || '#9e9e9e';
  }
}

export default new AnalyticsService();
