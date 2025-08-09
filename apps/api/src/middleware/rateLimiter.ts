/**
 * Rate Limiting Middleware
 * 
 * Provides brute force protection for authentication endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Extract client IP address from request headers (proxy-aware)
 */
const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'] as string;
  if (realIp) {
    return realIp;
  }
  // Handle both IPv4 and IPv6 addresses properly
  const clientIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  return clientIp.replace(/^::ffff:/, ''); // Remove IPv6 prefix for IPv4-mapped addresses
};

/**
 * Rate limiter for authentication endpoints
 * Limits to 5 attempts per minute per IP address
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts from this IP. Please try again in 1 minute.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Custom key generator using shared IP extraction function
  keyGenerator: getClientIP,
  // Custom handler for when rate limit is exceeded
  handler: (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    console.warn(`Rate limit exceeded for IP: ${ip}`, {
      ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login attempts from this IP. Please try again in 1 minute.',
      retryAfter: 60,
    });
  },
  // Skip rate limiting for successful requests (optional)
  skip: (_req: Request, res: Response) => {
    // Skip rate limiting if the request was successful (2xx status)
    // This only applies after the request has been processed
    return res.statusCode < 400;
  },
});

/**
 * Stricter rate limiter for failed login attempts
 * Applies additional restrictions after multiple failures
 */
export const strictAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: {
    error: 'Account temporarily locked',
    message: 'Too many failed authentication attempts. Account is temporarily locked for 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    console.error(`Strict rate limit exceeded for IP: ${ip}`, {
      ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Account temporarily locked',
      message: 'Too many failed authentication attempts. Account is temporarily locked for 15 minutes.',
      retryAfter: 900, // 15 minutes
    });
  },
  // Only apply to failed requests
  skip: (_req: Request, res: Response) => {
    return res.statusCode < 400;
  },
});

/**
 * General API rate limiter for non-auth endpoints
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
});