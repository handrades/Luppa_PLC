import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../utils/env';

// API Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

// Create base API client
const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_URL,
  timeout: env.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from sessionStorage for enhanced security
    const token = sessionStorage.getItem(env.AUTH_TOKEN_KEY);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    if (config.headers) {
      config.headers['X-Request-ID'] = crypto.randomUUID();
    }

    return config;
  },
  error => {
    if (env.ENABLE_CONSOLE_LOGS) {
      // eslint-disable-next-line no-console
      console.error('Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  error => {
    if (env.ENABLE_CONSOLE_LOGS) {
      // eslint-disable-next-line no-console
      console.error('API Error:', error);
    }

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          sessionStorage.removeItem(env.AUTH_TOKEN_KEY);
          window.location.href = '/login';
          break;

        case 403:
          // Forbidden - insufficient permissions
          if (env.ENABLE_CONSOLE_LOGS) {
            // eslint-disable-next-line no-console
            console.error('Insufficient permissions');
          }
          break;

        case 404:
          // Not found
          if (env.ENABLE_CONSOLE_LOGS) {
            // eslint-disable-next-line no-console
            console.error('Resource not found');
          }
          break;

        case 422:
          // Validation error
          if (env.ENABLE_CONSOLE_LOGS) {
            // eslint-disable-next-line no-console
            console.error('Validation error:', data);
          }
          break;

        case 500:
          // Server error
          if (env.ENABLE_CONSOLE_LOGS) {
            // eslint-disable-next-line no-console
            console.error('Internal server error');
          }
          break;

        default:
          if (env.ENABLE_CONSOLE_LOGS) {
            // eslint-disable-next-line no-console
            console.error('Unexpected error:', status, data);
          }
      }
    } else if (error.request) {
      // Network error
      if (env.ENABLE_CONSOLE_LOGS) {
        // eslint-disable-next-line no-console
        console.error('Network error - server not reachable');
      }
    } else {
      // Request setup error
      if (env.ENABLE_CONSOLE_LOGS) {
        // eslint-disable-next-line no-console
        console.error('Request setup error:', error.message);
      }
    }

    return Promise.reject(error);
  }
);

// API client wrapper with common methods
export const api = {
  // Health check
  health: () => apiClient.get('/health'),

  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials),
    logout: () => apiClient.post('/auth/logout'),
    refresh: () => apiClient.post('/auth/refresh'),
  },

  // Generic CRUD operations
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),
};

export default apiClient;
