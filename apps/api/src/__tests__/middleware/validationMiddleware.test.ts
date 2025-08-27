import express from 'express';
import Joi from 'joi';
import request from 'supertest';
import {
  JoiValidationError,
  formatValidationErrors,
  validate,
  validateBody,
  validateParams,
  validateQuery,
} from '../../middleware/validationMiddleware';
import { emailSchema, nameSchema, uuidSchema } from '../../schemas/commonSchemas';

describe('Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('validate function', () => {
    it('should pass validation with valid request data', async () => {
      const bodySchema = Joi.object({
        name: nameSchema,
        email: emailSchema,
      });

      app.post('/test', validate({ body: bodySchema }), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).post('/test').send({
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid body data with detailed error messages', async () => {
      const bodySchema = Joi.object({
        name: nameSchema,
        email: emailSchema,
      });

      app.post('/test', validate({ body: bodySchema }), (req, res) => {
        res.json({ success: true });
      });

      app.use(
        (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
          if (err instanceof JoiValidationError) {
            res.status(err.statusCode).json({
              error: {
                message: err.message,
                code: err.code,
                details: err.errors,
              },
            });
          } else {
            next(err);
          }
        }
      );

      const response = await request(app).post('/test').send({
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: not an email
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(2);

      const errors = response.body.error.details;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(errors.some((e: any) => e.field === 'name')).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(errors.some((e: any) => e.field === 'email')).toBe(true);
    });

    it('should validate query parameters correctly', async () => {
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).required(),
        limit: Joi.number().integer().min(1).max(100).required(),
      });

      app.get('/test', validate({ query: querySchema }), (req, res) => {
        res.json({ success: true, query: req.query });
      });

      const response = await request(app).get('/test').query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate URL parameters correctly', async () => {
      const paramsSchema = Joi.object({
        id: uuidSchema,
      });

      app.get('/test/:id', validate({ params: paramsSchema }), (req, res) => {
        res.json({ success: true, id: req.params.id });
      });

      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app).get(`/test/${validUuid}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.id).toBe(validUuid);
    });

    it('should validate multiple request parts simultaneously', async () => {
      const bodySchema = Joi.object({ name: nameSchema });
      const querySchema = Joi.object({ active: Joi.boolean().required() });
      const paramsSchema = Joi.object({ id: uuidSchema });

      app.put(
        '/test/:id',
        validate({
          body: bodySchema,
          query: querySchema,
          params: paramsSchema,
        }),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/test/${validUuid}`)
        .query({ active: true })
        .send({ name: 'Test User' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle nested object validation', async () => {
      const bodySchema = Joi.object({
        user: Joi.object({
          profile: Joi.object({
            firstName: nameSchema,
            lastName: nameSchema,
          }).required(),
        }).required(),
      });

      app.post('/test', validate({ body: bodySchema }), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          user: {
            profile: {
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle array validation', async () => {
      const bodySchema = Joi.object({
        tags: Joi.array().items(Joi.string().min(1)).max(5).required(),
      });

      app.post('/test', validate({ body: bodySchema }), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          tags: ['tag1', 'tag2', 'tag3'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('helper functions', () => {
    describe('validateBody', () => {
      it('should validate only request body', async () => {
        const schema = Joi.object({ name: nameSchema });

        app.post('/test', validateBody(schema), (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app).post('/test').send({ name: 'Test User' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('validateQuery', () => {
      it('should validate only query parameters', async () => {
        const schema = Joi.object({ search: Joi.string().min(1).required() });

        app.get('/test', validateQuery(schema), (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app).get('/test').query({ search: 'test' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('validateParams', () => {
      it('should validate only URL parameters', async () => {
        const schema = Joi.object({ id: uuidSchema });

        app.get('/test/:id', validateParams(schema), (req, res) => {
          res.json({ success: true });
        });

        const validUuid = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app).get(`/test/${validUuid}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('formatValidationErrors', () => {
    it('should format Joi validation errors correctly', () => {
      const schema = Joi.object({
        name: nameSchema,
        email: emailSchema,
      });

      const { error } = schema.validate(
        {
          name: '',
          email: 'invalid-email',
        },
        { abortEarly: false }
      );

      expect(error).toBeDefined();
      const formattedErrors = formatValidationErrors(error!);

      expect(formattedErrors).toHaveLength(2);
      expect(formattedErrors[0]).toHaveProperty('field');
      expect(formattedErrors[0]).toHaveProperty('message');
      expect(formattedErrors[0]).toHaveProperty('value');
    });

    it('should handle nested field errors', () => {
      const schema = Joi.object({
        user: Joi.object({
          profile: Joi.object({
            name: nameSchema,
          }).required(),
        }).required(),
      });

      const { error } = schema.validate(
        {
          user: {
            profile: {
              name: '',
            },
          },
        },
        { abortEarly: false }
      );

      expect(error).toBeDefined();
      const formattedErrors = formatValidationErrors(error!);

      expect(formattedErrors).toHaveLength(1);
      expect(formattedErrors[0].field).toBe('user.profile.name');
    });
  });

  describe('JoiValidationError', () => {
    it('should create proper validation error with details', () => {
      const errors = [
        { field: 'name', message: 'Name is required', value: undefined },
        { field: 'email', message: 'Must be a valid email', value: 'invalid' },
      ];

      const error = new JoiValidationError('Validation failed', errors);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
      expect(error.details).toEqual(errors);
    });
  });

  describe('error handling', () => {
    it('should pass through non-Joi errors', async () => {
      app.post(
        '/test',
        (req, res, next) => {
          next(new Error('Custom error'));
        },
        (req, res) => {
          res.json({ success: true });
        }
      );

      app.use(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
          res.status(500).json({ error: err.message });
        }
      );

      const response = await request(app).post('/test').send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Custom error');
    });
  });
});
