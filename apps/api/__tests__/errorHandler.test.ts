// Mock the database module to avoid TypeORM decorator issues in tests
jest.mock('../src/config/database', () => ({
  isDatabaseHealthy: jest.fn().mockResolvedValue(true),
  AppDataSource: {
    isInitialized: false,
  },
}));

import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  errorHandler,
} from '../src/middleware/errorHandler';
import { requestIdMiddleware } from '../src/middleware/requestId';
import type { Express } from 'express';

describe('Error Handling', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('Custom Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test message', 400, 'TEST_ERROR', { detail: 'test' });

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.isOperational).toBe(true);
    });

    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Validation failed', { field: 'email' });

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create NotFoundError with correct defaults', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create UnauthorizedError with correct defaults', () => {
      const error = new UnauthorizedError('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent-route').expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Route GET /nonexistent-route not found');
      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });

    it('should return 404 for non-existent POST routes', async () => {
      const response = await request(app).post('/nonexistent-post').expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Route POST /nonexistent-post not found');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', async () => {
      const response = await request(app).get('/nonexistent').expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('timestamp');

      // Verify timestamp is in ISO format
      expect(response.body.error.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should include request ID in error response', async () => {
      const customRequestId = 'test-error-request-id';

      const response = await request(app)
        .get('/nonexistent')
        .set('X-Request-ID', customRequestId)
        .expect(404);

      expect(response.body.error.requestId).toBe(customRequestId);
    });
  });

  describe('Error Handler Middleware', () => {
    let testApp: Express;

    beforeEach(() => {
      testApp = express();
      testApp.use(requestIdMiddleware);

      // Test route that throws different types of errors
      testApp.get('/test-app-error', (req, res, next) => {
        next(new AppError('Custom app error', 422, 'CUSTOM_ERROR', { field: 'test' }));
      });

      testApp.get('/test-validation-error', (req, res, next) => {
        next(new ValidationError('Validation failed', { field: 'email' }));
      });

      testApp.get('/test-generic-error', (req, res, next) => {
        next(new Error('Generic error'));
      });

      testApp.get('/test-cast-error', (req, res, next) => {
        const error = new Error('Cast error');
        error.name = 'CastError';
        next(error);
      });

      testApp.use(errorHandler);
    });

    it('should handle AppError correctly', async () => {
      const response = await request(testApp).get('/test-app-error').expect(422);

      expect(response.body.error.message).toBe('Custom app error');
      expect(response.body.error.code).toBe('CUSTOM_ERROR');
      expect(response.body.error.details).toEqual({ field: 'test' });
    });

    it('should handle ValidationError correctly', async () => {
      const response = await request(testApp).get('/test-validation-error').expect(400);

      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual({ field: 'email' });
    });

    it('should handle generic errors correctly', async () => {
      const response = await request(testApp).get('/test-generic-error').expect(500);

      expect(response.body.error.message).toBe('Internal server error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.details).toBeUndefined();
    });

    it('should handle CastError correctly', async () => {
      const response = await request(testApp).get('/test-cast-error').expect(400);

      expect(response.body.error.message).toBe('Invalid ID format');
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });
});
