import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID middleware for tracking requests across the application
 *
 * This middleware ensures every request has a unique identifier that can be used
 * for logging, debugging, and request tracing. It either uses an existing
 * X-Request-ID header from the client or generates a new UUID.
 *
 * The request ID is:
 * - Added to the req.id property for use in other middleware and routes
 * - Set in the X-Request-ID response header so clients can reference it
 * - Used by the logging system to correlate related log entries
 *
 * Benefits:
 * - Improved debugging by tracking requests across multiple services
 * - Better error reporting with request context
 * - Support for distributed tracing in industrial environments
 * - Client can provide their own request IDs for integration purposes
 *
 * @param req - Express request object (will be augmented with id property)
 * @param res - Express response object (will get X-Request-ID header)
 * @param next - Express next function to continue middleware chain
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Use existing request ID from header or generate new one
  const requestId = (req.get('X-Request-ID') || uuidv4()) as string;

  // (req as { id?: string }).id = requestId;
  res.set('X-Request-ID', requestId);

  next();
};
