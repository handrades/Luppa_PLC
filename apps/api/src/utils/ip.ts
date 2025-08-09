/**
 * IP Address Utilities
 *
 * Provides consistent, proxy- and IPv6-aware IP parsing across modules
 */

import { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

/**
 * Extract client IP address from request headers (proxy-aware) and ensure IPv6 compatibility
 */
export const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    // Use ipKeyGenerator for consistent IPv6 handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ipKeyGenerator({ ip } as any);
  }
  const realIp = req.headers['x-real-ip'] as string;
  if (realIp) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ipKeyGenerator({ ip: realIp } as any);
  }
  // Use the built-in ipKeyGenerator for proper IPv6 handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ipKeyGenerator(req as any);
};
