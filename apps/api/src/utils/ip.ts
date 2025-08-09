/**
 * IP Address Utilities
 *
 * Provides consistent, proxy- and IPv6-aware IP parsing across modules
 */

import { Request } from 'express';

/**
 * Safely extract first IP from a header value that might be a string or array
 */
const extractFirstIP = (headerValue: string | string[] | undefined): string | null => {
  if (!headerValue) {
    return null;
  }

  // Handle array case
  if (Array.isArray(headerValue)) {
    if (headerValue.length === 0) {
      return null;
    }
    return headerValue[0].split(',')[0].trim();
  }

  // Handle string case
  return headerValue.split(',')[0].trim();
};

/**
 * Check if Express trust proxy setting is enabled
 */
const isTrustProxyEnabled = (req: Request): boolean => {
  try {
    // Check if app and app.get are available (might not be during testing)
    if (!req.app || typeof req.app.get !== 'function') {
      return false; // Default to not trusting proxy if app is not available
    }

    const trustProxy = req.app.get('trust proxy');

    // Express trust proxy can be boolean, number, string, or function
    if (typeof trustProxy === 'boolean') {
      return trustProxy;
    }
    if (typeof trustProxy === 'number') {
      return trustProxy > 0;
    }
    if (typeof trustProxy === 'string') {
      return trustProxy !== 'false' && trustProxy !== '0';
    }
    if (typeof trustProxy === 'function') {
      return true; // If it's a function, trust proxy is enabled
    }

    return false;
  } catch (error) {
    // If any error occurs, default to not trusting proxy
    return false;
  }
};

/**
 * Extract client IP address from request headers (proxy-aware) and ensure IPv6 compatibility
 * For use with express-rate-limit keyGenerator
 */
export const getClientIP = (req: Request): string => {
  try {
    // Only use forwarded headers if trust proxy is enabled
    if (isTrustProxyEnabled(req)) {
      // Check x-forwarded-for header first
      const forwardedIP = extractFirstIP(req.headers['x-forwarded-for']);
      if (forwardedIP) {
        // Return the IP directly, let express-rate-limit handle IPv6 normalization
        return forwardedIP;
      }

      // Check x-real-ip header as fallback
      const realIP = extractFirstIP(req.headers['x-real-ip']);
      if (realIP) {
        // Return the IP directly, let express-rate-limit handle IPv6 normalization
        return realIP;
      }
    }

    // Fall back to direct connection IP
    return req.socket?.remoteAddress || req.ip || 'unknown';
  } catch (error) {
    // If any error occurs, return a safe default
    return 'unknown';
  }
};
