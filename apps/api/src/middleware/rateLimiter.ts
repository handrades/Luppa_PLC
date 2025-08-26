/**
 * Rate Limiting Middleware
 *
 * Provides brute force protection for authentication endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getClientIP } from '../utils/ip';
import { logger } from '../config/logger';

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
  // Use default keyGenerator (req.ip) which is IPv6-aware
  // Custom handler for when rate limit is exceeded
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    logger.warn(`Rate limit exceeded for IP: ${ip}`, {
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
  // Skip successful requests to only rate limit failed authentication attempts
  skipSuccessfulRequests: true,
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
    message:
      'Too many failed authentication attempts. Account is temporarily locked for 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator (req.ip) which is IPv6-aware
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    logger.error(`Strict rate limit exceeded for IP: ${ip}`, {
      ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      error: 'Account temporarily locked',
      message:
        'Too many failed authentication attempts. Account is temporarily locked for 15 minutes.',
      retryAfter: 900, // 15 minutes
    });
  },
  // Skip successful requests to only rate limit failed authentication attempts
  skipSuccessfulRequests: true,
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
  // Use default keyGenerator (req.ip) which is IPv6-aware
});

/**
 * Rate limiter for write operations (POST, PUT, DELETE)
 * Limits to 5 write operations per minute per IP address
 * Disabled in test environment to allow rapid test execution
 */
export const writeOpsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // Higher limit in test environment
  message: {
    error: 'Too many write operations',
    message: 'Too many write operations from this IP. Please try again in 1 minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator (req.ip) which is IPv6-aware
  // Custom handler for when rate limit is exceeded
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    logger.warn(`Write operations rate limit exceeded for IP: ${ip}`, {
      ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      error: 'Too many write operations',
      message: 'Too many write operations from this IP. Please try again in 1 minute.',
      retryAfter: 60,
    });
  },
  // Do not skip successful requests for write operations
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for bulk import operations
 * More restrictive to prevent system overload
 */
export const bulkImportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // Limit each user to 5 import requests per windowMs
  message: {
    error: 'Too many import attempts',
    message: 'Too many import attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user?.sub || getClientIP(req);
  },
  skip: (req: Request) => {
    // Skip rate limiting for validation-only requests
    const options = req.body?.options;
    return options?.validateOnly === true;
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Bulk import rate limit exceeded`, {
      userId: req.user?.sub,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      error: 'Too many import attempts. Please wait before trying again.',
      retryAfter: 15 * 60, // 15 minutes in seconds
    });
  },
});

/**
 * Rate limiter for export operations
 * Slightly less restrictive than imports
 */
export const bulkExportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 10, // Limit each user to 10 export requests per windowMs
  message: {
    error: 'Too many export attempts',
    message: 'Too many export attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.sub || getClientIP(req);
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Bulk export rate limit exceeded`, {
      userId: req.user?.sub,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      error: 'Too many export attempts. Please wait before trying again.',
      retryAfter: 10 * 60, // 10 minutes in seconds
    });
  },
});

/**
 * Rate limiter for rollback operations
 * Very restrictive as rollbacks should be rare and careful operations
 */
export const rollbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' ? 1000 : 3, // Limit each user to 3 rollback requests per hour
  message: {
    error: 'Too many rollback attempts',
    message:
      'Too many rollback attempts. Please contact administrator if you need to perform more rollbacks.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.sub || getClientIP(req);
  },
  handler: (req: Request, res: Response) => {
    logger.error(`Rollback rate limit exceeded`, {
      userId: req.user?.sub,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      error:
        'Too many rollback attempts. Please contact administrator if you need to perform more rollbacks.',
      retryAfter: 60 * 60, // 1 hour in seconds
    });
  },
});
