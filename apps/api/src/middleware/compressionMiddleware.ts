import compression from 'compression';
import { Handler, Request, Response } from 'express';
import { logger } from '../config/logger';

/**
 * Response compression middleware for optimizing JSON and text responses
 *
 * This middleware compresses responses to reduce bandwidth usage and improve
 * response times for large JSON payloads. It's configured with appropriate
 * thresholds and filters to balance compression benefits with CPU overhead.
 *
 * Configuration:
 * - Compression threshold: 1024 bytes (1KB)
 * - Compression level: 6 (balanced speed vs ratio)
 * - Filters: JSON, text, and JavaScript content types
 * - Excludes: Already compressed content (images, videos)
 */

/**
 * Custom filter function to determine which responses should be compressed
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns true if response should be compressed, false otherwise
 */
const shouldCompress = (req: Request, res: Response): boolean => {
  // Don't compress if explicitly disabled
  if (req.headers['x-no-compression']) {
    return false;
  }

  // Get the content type
  const contentType = res.getHeader('content-type') as string;

  if (!contentType) {
    return false;
  }

  // Compress JSON, text, and JavaScript content
  const compressibleTypes = [
    'application/json',
    'application/javascript',
    'text/plain',
    'text/html',
    'text/css',
    'text/xml',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml',
  ];

  const isCompressible = compressibleTypes.some(type => contentType.toLowerCase().includes(type));

  // Log compression decisions for monitoring (debug level only)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Compression decision', {
      requestId: req.id,
      url: req.originalUrl,
      contentType,
      willCompress: isCompressible,
    });
  }

  return isCompressible;
};

/**
 * Compression middleware configuration options
 */
const compressionOptions: compression.CompressionOptions = {
  // Only compress responses above 1KB
  threshold: 1024,

  // Compression level (1=fastest, 9=best compression, 6=balanced)
  level: 6,

  // Memory usage level (1-9, higher = more memory but better compression)
  memLevel: 8,

  // Custom filter function
  filter: shouldCompress,

  // Chunk size for compression
  chunkSize: 16 * 1024, // 16KB chunks

  // Window size for compression (affects memory usage and compression ratio)
  windowBits: 15,

  // Strategy for compression algorithm (use default zlib strategy)
  // strategy: compression.constants.Z_DEFAULT_STRATEGY, // Not available in all versions
};

/**
 * Compression middleware instance with optimized configuration
 */
export const compressionMiddleware: Handler = compression(compressionOptions);

/**
 * Log compression middleware configuration on startup
 */
logger.info('Compression middleware configured', {
  threshold: compressionOptions.threshold,
  level: compressionOptions.level,
  chunkSize: compressionOptions.chunkSize,
});
