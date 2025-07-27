import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Use existing request ID from header or generate new one
  const requestId = (req.get('X-Request-ID') || uuidv4()) as string;
  
  req.id = requestId;
  res.set('X-Request-ID', requestId);
  
  next();
};
