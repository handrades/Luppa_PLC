import swaggerJsdoc from 'swagger-jsdoc';
import { config as appConfig } from './env';

/**
 * OpenAPI specification configuration for the Industrial Inventory API
 *
 * This configuration defines the base structure for API documentation
 * using OpenAPI 3.0 specification with JSDoc annotations.
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Industrial Inventory Multi-App Framework API',
      version: '1.0.0',
      description: `
        RESTful API for the Industrial Inventory Multi-App Framework.
        
        This API provides endpoints for managing industrial equipment inventory,
        user authentication, and system monitoring. Designed for air-gapped
        industrial environments with comprehensive audit logging and ISO compliance.
        
        ## Key Features
        - PLC inventory management
        - User authentication and authorization
        - Role-based access control (RBAC)
        - Comprehensive audit logging
        - Health monitoring and diagnostics
        
        ## Authentication
        This API uses JWT (JSON Web Tokens) for authentication. Include the token
        in the Authorization header: \`Bearer <token>\`
        
        ## Error Handling
        All endpoints return consistent error responses with appropriate HTTP status codes:
        - 400: Bad Request (validation errors)
        - 401: Unauthorized (authentication required)
        - 403: Forbidden (insufficient permissions)
        - 404: Not Found (resource doesn't exist)
        - 500: Internal Server Error (server errors)
        
        ## Rate Limiting
        API requests are rate-limited to ensure system stability in industrial environments.
      `,
      contact: {
        name: 'Industrial Inventory Framework',
        url: 'https://github.com/handrades/Luppa_PLC',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${appConfig.port}`,
        description: 'Development server',
      },
      {
        url: `https://localhost:${appConfig.port}`,
        description: 'Development server (HTTPS)',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development server via Nginx proxy',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
      },
      schemas: {
        // Common response schemas
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              description: 'Overall system health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO timestamp of the health check',
            },
            version: {
              type: 'string',
              description: 'API version',
              example: '1.0.0',
            },
            environment: {
              type: 'string',
              description: 'Runtime environment',
              example: 'development',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
              example: 3600,
            },
            database: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                  description: 'Database connection status',
                },
              },
              required: ['status'],
            },
          },
          required: ['status', 'timestamp', 'version', 'environment', 'uptime', 'database'],
        },

        // Error response schemas
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
            requestId: {
              type: 'string',
              description: 'Request ID for tracking',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
          },
          required: ['error'],
        },

        ValidationErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed',
            },
            code: {
              type: 'string',
              description: 'Error code',
              example: 'VALIDATION_ERROR',
            },
            details: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field that failed validation',
                },
                message: {
                  type: 'string',
                  description: 'Validation error message',
                },
              },
            },
            requestId: {
              type: 'string',
              description: 'Request ID for tracking',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
          },
          required: ['error', 'code'],
        },

        // User and authentication schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            username: {
              type: 'string',
              description: 'Username',
              example: 'john.doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@company.com',
            },
            role: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                name: {
                  type: 'string',
                  example: 'admin',
                },
                permissions: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
          required: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
        },

        // PLC inventory schemas (future)
        PlcItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique PLC identifier',
            },
            description: {
              type: 'string',
              description: 'PLC description',
              example: 'Main production line PLC',
            },
            make: {
              type: 'string',
              description: 'PLC manufacturer',
              example: 'Siemens',
            },
            model: {
              type: 'string',
              description: 'PLC model',
              example: 'S7-1500',
            },
            ipAddress: {
              type: 'string',
              format: 'ipv4',
              description: 'PLC IP address',
              example: '192.168.1.100',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'PLC tags for categorization',
              example: ['production', 'critical', 'line-1'],
            },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'unknown'],
              description: 'PLC operational status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp',
            },
          },
          required: [
            'id',
            'description',
            'make',
            'model',
            'tags',
            'status',
            'createdAt',
            'updatedAt',
          ],
        },

        // Pagination schemas
        PaginationMeta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of items',
              example: 150,
            },
            page: {
              type: 'number',
              description: 'Current page number (1-based)',
              example: 1,
            },
            pageSize: {
              type: 'number',
              description: 'Number of items per page',
              example: 20,
            },
            totalPages: {
              type: 'number',
              description: 'Total number of pages',
              example: 8,
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there are more pages',
              example: true,
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there are previous pages',
              example: false,
            },
          },
          required: ['total', 'page', 'pageSize', 'totalPages', 'hasNext', 'hasPrev'],
        },
      },

      parameters: {
        // Common query parameters
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number (1-based)',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        PageSizeParam: {
          name: 'pageSize',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          description: 'Search term for filtering results',
          required: false,
          schema: {
            type: 'string',
            maxLength: 255,
          },
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field and direction (e.g., "name:asc", "createdAt:desc")',
          required: false,
          schema: {
            type: 'string',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*:(asc|desc)$',
          },
        },
      },

      responses: {
        // Common responses
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                error: 'Authentication required',
                code: 'UNAUTHORIZED',
                requestId: 'req_123456789',
                timestamp: '2025-01-24T10:30:00.000Z',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                requestId: 'req_123456789',
                timestamp: '2025-01-24T10:30:00.000Z',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                error: 'Resource not found',
                code: 'NOT_FOUND',
                requestId: 'req_123456789',
                timestamp: '2025-01-24T10:30:00.000Z',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationErrorResponse',
              },
              example: {
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {
                  field: 'email',
                  message: 'Invalid email format',
                },
                requestId: 'req_123456789',
                timestamp: '2025-01-24T10:30:00.000Z',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                requestId: 'req_123456789',
                timestamp: '2025-01-24T10:30:00.000Z',
              },
            },
          },
        },
      },
    },

    // Default security for all endpoints (can be overridden per endpoint)
    security: [
      {
        bearerAuth: [],
      },
    ],

    tags: [
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'PLC Inventory',
        description: 'PLC inventory management operations',
      },
      {
        name: 'Audit',
        description: 'Audit log and compliance operations',
      },
    ],
  },
  apis: [
    './src/routes/*.ts', // Path to the API files with JSDoc comments
    './src/routes/**/*.ts', // Include subdirectories
  ],
};

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI configuration options
 */
export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none', // Don't expand operations by default
    filter: true, // Enable API filter
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: Record<string, unknown>) => {
      // Add request ID header for tracking
      const headers = req.headers as Record<string, string>;
      headers['X-Request-ID'] = `swagger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return req;
    },
  },
  customCss: `
    .topbar { display: none; }
    .swagger-ui .info .title { color: #1976d2; }
    .swagger-ui .info .description p { color: #555; }
    .swagger-ui .scheme-container { background: #f5f5f5; padding: 10px; border-radius: 4px; }
  `,
  customSiteTitle: 'Industrial Inventory API Documentation',
  customfavIcon: '/favicon.ico',
};
