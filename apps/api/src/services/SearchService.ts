import { getAppDataSource } from '../config/database';
import { createClient } from 'redis';
import { createHash } from 'crypto';
import { logger } from '../config/logger';

// Search interfaces
export interface SearchQuery {
  q: string;
  page?: number;
  pageSize?: number;
  fields?: string[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  includeHighlights?: boolean;
  maxResults?: number;
}

export interface SearchResultItem {
  plc_id: string;
  tag_id: string;
  plc_description: string;
  make: string;
  model: string;
  ip_address: string | null;
  firmware_version: string | null;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  cell_id: string;
  cell_name: string;
  line_number: string;
  site_id: string;
  site_name: string;
  hierarchy_path: string;
  relevance_score: number;
  highlighted_fields?: {
    description?: string;
    make?: string;
    model?: string;
    tag_id?: string;
    site_name?: string;
    cell_name?: string;
    equipment_name?: string;
  };
  tags_text?: string;
}

export interface SearchResponse {
  data: SearchResultItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchMetadata: {
    query: string;
    executionTimeMs: number;
    totalMatches: number;
    suggestedCorrections?: string[];
    searchType: 'fulltext' | 'similarity' | 'hybrid';
  };
}

export interface SearchAnalytics {
  query: string;
  executionTime: number;
  resultCount: number;
  userId?: string;
  timestamp: Date;
  searchType: string;
  ipAddress?: string;
  performanceMetrics?: {
    cacheCheckTime: number;
    databaseQueryTime: number;
    processingTime: number;
    totalTime: number;
  };
}

export class SearchService {
  private redis: ReturnType<typeof createClient> | null = null;
  private redisAvailable = false;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'search:';
  private readonly ANALYTICS_PREFIX = 'search_analytics:';

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: retries => {
            if (retries > 3) {
              logger.warn('Redis max reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      // Set up error handlers
      this.redis.on('error', error => {
        logger.warn('Redis connection error - falling back to no-cache mode', {
          error: error.message,
        });
        this.redisAvailable = false;
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.redisAvailable = true;
      });

      this.redis.on('ready', () => {
        logger.info('Redis ready for operations');
        this.redisAvailable = true;
      });

      this.redis.on('end', () => {
        logger.warn('Redis connection closed');
        this.redisAvailable = false;
      });

      // Test connection
      await this.redis.connect();
      await this.redis.ping();
      this.redisAvailable = true;
      logger.info('Redis initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Redis initialization failed - continuing without cache', {
        error: errorMessage,
      });
      this.redisAvailable = false;
      this.redis = null;
    }
  }

  /**
   * Execute search query with full-text search and fuzzy matching
   */
  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    const performanceMetrics = {
      startTime,
      cacheCheckTime: 0,
      databaseQueryTime: 0,
      processingTime: 0,
      totalTime: 0,
    };

    try {
      // Input validation and sanitization
      const sanitizedQuery = this.sanitizeQuery(searchQuery.q);
      if (!sanitizedQuery || sanitizedQuery.length < 1) {
        throw new Error('Search query must be at least 1 character long');
      }

      // Check cache first (only if Redis is available)
      const cacheCheckStart = Date.now();
      const cacheKey = this.getCacheKey(searchQuery);
      const cachedResult = this.redisAvailable ? await this.getFromCache(cacheKey) : null;
      performanceMetrics.cacheCheckTime = Date.now() - cacheCheckStart;

      if (cachedResult) {
        logger.info('Search cache hit', {
          query: sanitizedQuery,
          cacheCheckTime: performanceMetrics.cacheCheckTime,
        });
        return cachedResult;
      }

      // Determine search strategy
      const searchType = this.determineSearchType(sanitizedQuery);
      let results: SearchResultItem[];

      // Execute database search with timing
      const databaseQueryStart = Date.now();
      switch (searchType) {
        case 'fulltext':
          results = await this.executeFullTextSearch(sanitizedQuery, searchQuery);
          break;
        case 'similarity':
          results = await this.executeSimilaritySearch(sanitizedQuery, searchQuery);
          break;
        case 'hybrid':
          results = await this.executeHybridSearch(sanitizedQuery, searchQuery);
          break;
        default:
          throw new Error(`Unsupported search type: ${searchType}`);
      }
      performanceMetrics.databaseQueryTime = Date.now() - databaseQueryStart;

      // Apply pagination with timing
      const processingStart = Date.now();
      const { page = 1, pageSize = 50, maxResults = 1000 } = searchQuery;
      const offset = (page - 1) * pageSize;
      const total = Math.min(results.length, maxResults);
      const paginatedResults = results.slice(offset, offset + pageSize);
      performanceMetrics.processingTime = Date.now() - processingStart;

      // Calculate total execution time
      performanceMetrics.totalTime = Date.now() - startTime;

      // Prepare response with detailed performance metadata
      const response: SearchResponse = {
        data: paginatedResults,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: offset + pageSize < total,
          hasPrev: page > 1,
        },
        searchMetadata: {
          query: sanitizedQuery,
          executionTimeMs: performanceMetrics.totalTime,
          totalMatches: total,
          searchType,
        },
      };

      // Log performance warning if search exceeds threshold
      if (performanceMetrics.totalTime > 100) {
        logger.warn('Search performance threshold exceeded', {
          query: sanitizedQuery,
          totalTime: performanceMetrics.totalTime,
          cacheCheckTime: performanceMetrics.cacheCheckTime,
          databaseQueryTime: performanceMetrics.databaseQueryTime,
          processingTime: performanceMetrics.processingTime,
          resultCount: total,
          searchType,
        });
      } else {
        logger.info('Search completed within performance threshold', {
          query: sanitizedQuery,
          totalTime: performanceMetrics.totalTime,
          resultCount: total,
          searchType,
        });
      }

      // Cache successful results (only if Redis is available)
      if (this.redisAvailable) {
        await this.cacheResult(cacheKey, response);
      }

      // Track analytics (only if Redis is available)
      if (this.redisAvailable) {
        await this.trackSearchAnalytics({
          query: sanitizedQuery,
          executionTime: response.searchMetadata.executionTimeMs,
          resultCount: total,
          searchType,
          timestamp: new Date(),
          performanceMetrics: {
            cacheCheckTime: performanceMetrics.cacheCheckTime,
            databaseQueryTime: performanceMetrics.databaseQueryTime,
            processingTime: performanceMetrics.processingTime,
            totalTime: performanceMetrics.totalTime,
          },
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Search execution failed', {
        error: errorMessage,
        query: searchQuery.q,
      });
      throw error;
    }
  }

  /**
   * Execute PostgreSQL full-text search using tsvector
   */
  private async executeFullTextSearch(
    query: string,
    options: SearchQuery
  ): Promise<SearchResultItem[]> {
    const queryRunner = getAppDataSource().createQueryRunner();

    try {
      // Set DB-side timeout to prevent long-running queries
      await queryRunner.query("SET statement_timeout = '5000'");

      // Convert query to tsquery format
      const tsQuery = this.buildTsQuery(query);

      const sql = `
        SELECT 
          mes.*,
          ts_rank(mes.combined_search_vector, to_tsquery('english', $1)) as relevance_score,
          ${options.includeHighlights ? this.buildHighlightFields() : 'NULL as highlighted_fields'}
        FROM mv_equipment_search mes
        WHERE mes.combined_search_vector @@ to_tsquery('english', $1)
        ORDER BY ts_rank(mes.combined_search_vector, to_tsquery('english', $1)) DESC,
                 mes.site_name, mes.cell_name, mes.equipment_name, mes.tag_id
        LIMIT $2
      `;

      const maxResults = options.maxResults || 1000;
      const results = await queryRunner.query(sql, [tsQuery, maxResults]);

      return this.processSearchResults(results, options);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute similarity search using pg_trgm
   */
  private async executeSimilaritySearch(
    query: string,
    options: SearchQuery
  ): Promise<SearchResultItem[]> {
    const queryRunner = getAppDataSource().createQueryRunner();

    try {
      // Set DB-side timeout to prevent long-running queries
      await queryRunner.query("SET statement_timeout = '5000'");

      const sql = `
        SELECT 
          mes.*,
          GREATEST(
            similarity(mes.plc_description, $1),
            similarity(mes.make || ' ' || mes.model, $1),
            similarity(mes.tag_id, $1),
            similarity(mes.site_name || ' ' || mes.cell_name || ' ' || mes.equipment_name, $1)
          ) as relevance_score,
          ${options.includeHighlights ? this.buildHighlightFields() : 'NULL as highlighted_fields'}
        FROM mv_equipment_search mes
        WHERE 
          similarity(mes.plc_description, $1) > 0.1 OR
          similarity(mes.make || ' ' || mes.model, $1) > 0.1 OR
          similarity(mes.tag_id, $1) > 0.1 OR
          similarity(mes.site_name || ' ' || mes.cell_name || ' ' || mes.equipment_name, $1) > 0.1
        ORDER BY relevance_score DESC
        LIMIT $2
      `;

      const maxResults = options.maxResults || 1000;
      const results = await queryRunner.query(sql, [query, maxResults]);

      return this.processSearchResults(results, options);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute hybrid search combining full-text and similarity
   */
  private async executeHybridSearch(
    query: string,
    options: SearchQuery
  ): Promise<SearchResultItem[]> {
    const [fullTextResults, similarityResults] = await Promise.all([
      this.executeFullTextSearch(query, { ...options, maxResults: 500 }),
      this.executeSimilaritySearch(query, { ...options, maxResults: 500 }),
    ]);

    // Merge and deduplicate results with combined relevance scoring
    const mergedResults = new Map<string, SearchResultItem>();

    // Add full-text results with higher weight
    fullTextResults.forEach(result => {
      result.relevance_score = result.relevance_score * 0.7; // 70% weight for full-text
      mergedResults.set(result.plc_id, result);
    });

    // Add similarity results with lower weight or boost existing
    similarityResults.forEach(result => {
      const existing = mergedResults.get(result.plc_id);
      if (existing) {
        // Boost existing result
        existing.relevance_score += result.relevance_score * 0.3;
      } else {
        // Add new result with similarity weight
        result.relevance_score = result.relevance_score * 0.3; // 30% weight for similarity
        mergedResults.set(result.plc_id, result);
      }
    });

    // Convert to array and sort by combined relevance
    return Array.from(mergedResults.values())
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, options.maxResults || 1000);
  }

  /**
   * Determine optimal search strategy based on query characteristics
   */
  private determineSearchType(query: string): 'fulltext' | 'similarity' | 'hybrid' {
    // Use full-text search for longer queries with multiple words
    if (query.split(/\s+/).length >= 3) {
      return 'fulltext';
    }

    // Use similarity search for very short queries or potential typos
    if (query.length <= 3) {
      return 'similarity';
    }

    // Use hybrid approach for medium-length queries
    return 'hybrid';
  }

  /**
   * Build PostgreSQL tsquery from user input
   */
  private buildTsQuery(query: string): string {
    // Split query into words and create OR/AND combinations
    const words = query
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (words.length === 1) {
      // Single word - add prefix matching
      return `${words[0]}:*`;
    }

    // Multiple words - create AND combination with prefix matching
    return words.map(word => `${word}:*`).join(' & ');
  }

  /**
   * Build SQL for highlighting matched terms
   */
  private buildHighlightFields(): string {
    return `
      jsonb_build_object(
        'description', ts_headline('english', mes.plc_description, to_tsquery('english', $1)),
        'make', ts_headline('english', mes.make, to_tsquery('english', $1)),
        'model', ts_headline('english', mes.model, to_tsquery('english', $1)),
        'tag_id', ts_headline('english', mes.tag_id, to_tsquery('english', $1)),
        'site_name', ts_headline('english', mes.site_name, to_tsquery('english', $1)),
        'cell_name', ts_headline('english', mes.cell_name, to_tsquery('english', $1)),
        'equipment_name', ts_headline('english', mes.equipment_name, to_tsquery('english', $1))
      ) as highlighted_fields
    `;
  }

  /**
   * Process and normalize search results
   */
  private processSearchResults(
    rawResults: Record<string, unknown>[],
    _options: SearchQuery
  ): SearchResultItem[] {
    return rawResults.map(row => ({
      plc_id: String(row.plc_id || ''),
      tag_id: String(row.tag_id || ''),
      plc_description: String(row.plc_description || ''),
      make: String(row.make || ''),
      model: String(row.model || ''),
      ip_address: row.ip_address ? String(row.ip_address) : null,
      firmware_version: row.firmware_version ? String(row.firmware_version) : null,
      equipment_id: String(row.equipment_id || ''),
      equipment_name: String(row.equipment_name || ''),
      equipment_type: String(row.equipment_type || ''),
      cell_id: String(row.cell_id || ''),
      cell_name: String(row.cell_name || ''),
      line_number: String(row.line_number || '0'),
      site_id: String(row.site_id || ''),
      site_name: String(row.site_name || ''),
      hierarchy_path: String(row.hierarchy_path || ''),
      relevance_score: parseFloat(String(row.relevance_score || '0')),
      highlighted_fields: row.highlighted_fields
        ? this.sanitizeHighlightFields(row.highlighted_fields as Record<string, string>)
        : undefined,
      tags_text: row.tags_text ? String(row.tags_text) : undefined,
    }));
  }

  /**
   * Sanitize highlighted fields to prevent XSS attacks
   */
  private sanitizeHighlightFields(fields: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'string') {
        // Simple HTML sanitization - remove dangerous tags but preserve highlighting
        sanitized[key] = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
          .replace(/<object[^>]*>.*?<\/object>/gi, '')
          .replace(/<img[^>]*>/gi, '') // Remove img tags
          .replace(/<embed[^>]*>/gi, '')
          .replace(/<link[^>]*>/gi, '')
          .replace(/<meta[^>]*>/gi, '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
          .replace(/javascript:/gi, '') // Remove javascript: urls
          .replace(/vbscript:/gi, '') // Remove vbscript: urls
          .replace(/data:/gi, ''); // Remove data: urls
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize user input to prevent SQL injection
   */
  private sanitizeQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters and normalize
    return query
      .replace(/[';\\]/g, '') // Remove semicolons and backslashes
      .replace(/--.*$/gm, '') // Remove SQL comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Generate cache key for search query
   */
  private getCacheKey(query: SearchQuery): string {
    // Normalize and sort parameters to ensure consistent cache keys
    const normalizedKey = {
      q: (query.q || '').trim().toLowerCase(),
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      fields: (query.fields || []).sort(),
      sortBy: query.sortBy || '',
      sortOrder: query.sortOrder || 'DESC',
      includeHighlights: query.includeHighlights || false,
      maxResults: query.maxResults || 1000,
    };

    // Create deterministic hash to prevent collisions
    const keyString = JSON.stringify(normalizedKey, Object.keys(normalizedKey).sort());
    const hash = createHash('sha256').update(keyString).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Get result from Redis cache
   */
  private async getFromCache(key: string): Promise<SearchResponse | null> {
    if (!this.redis || !this.redisAvailable) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Cache retrieval failed - disabling Redis temporarily', {
        error: errorMessage,
        key,
      });
      this.redisAvailable = false;
      return null;
    }
  }

  /**
   * Cache search result in Redis
   */
  private async cacheResult(key: string, result: SearchResponse): Promise<void> {
    if (!this.redis || !this.redisAvailable) {
      return;
    }

    try {
      await this.redis.setEx(key, this.CACHE_TTL, JSON.stringify(result));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Cache storage failed - disabling Redis temporarily', {
        error: errorMessage,
        key,
      });
      this.redisAvailable = false;
    }
  }

  /**
   * Track search analytics for performance monitoring
   */
  private async trackSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    if (!this.redis || !this.redisAvailable) {
      return;
    }

    try {
      const key = `${this.ANALYTICS_PREFIX}${Date.now()}`;
      await this.redis.setEx(key, 86400, JSON.stringify(analytics)); // Store for 24 hours
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Analytics tracking failed - disabling Redis temporarily', {
        error: errorMessage,
      });
      this.redisAvailable = false;
    }
  }

  /**
   * Get search suggestions based on query history
   */
  async getSearchSuggestions(_partialQuery: string, _limit = 10): Promise<string[]> {
    try {
      // Implementation would analyze search history and popular queries
      // For now, return empty array - can be enhanced with ML-based suggestions
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Search suggestions failed', { error: errorMessage });
      return [];
    }
  }

  /**
   * Refresh materialized view for search performance
   */
  async refreshSearchView(): Promise<void> {
    const queryRunner = getAppDataSource().createQueryRunner();

    // Set longer timeout for view refresh operations
    const timeout = setTimeout(() => {
      queryRunner.release();
      throw new Error('Search view refresh timeout exceeded (30 seconds)');
    }, 30000);

    try {
      await queryRunner.query('SELECT refresh_equipment_search_view()');
      clearTimeout(timeout);
      logger.info('Search materialized view refreshed successfully');
    } catch (error) {
      clearTimeout(timeout);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh search materialized view', {
        error: errorMessage,
      });
      throw error;
    } finally {
      clearTimeout(timeout);
      await queryRunner.release();
    }
  }

  /**
   * Get search performance metrics
   */
  async getSearchMetrics(_timeRange = '24h'): Promise<SearchAnalytics[]> {
    if (!this.redis || !this.redisAvailable) {
      return [];
    }

    try {
      const pattern = `${this.ANALYTICS_PREFIX}*`;
      const keys: string[] = [];

      // Use SCAN to safely iterate through keys without blocking Redis
      for await (const key of this.redis.scanIterator({ MATCH: pattern })) {
        keys.push(String(key));
      }

      const metrics: SearchAnalytics[] = [];

      // Process keys in batches to reduce round-trips
      const batchSize = 10;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const batchData = await this.redis.mget(...batch);

        for (let j = 0; j < batch.length; j++) {
          if (!batchData || !Array.isArray(batchData) || j >= batchData.length) continue;
          const data = batchData[j];
          if (!data || typeof data !== 'string') continue;

          try {
            const parsed = JSON.parse(data);
            // Convert timestamp string back to Date object
            if (parsed.timestamp) {
              const timestamp = new Date(parsed.timestamp);
              // Validate the Date object
              if (isNaN(timestamp.getTime())) {
                logger.warn('Invalid timestamp in search analytics', {
                  key: batch[j],
                  timestamp: parsed.timestamp,
                });
                continue;
              }
              parsed.timestamp = timestamp;
            }
            metrics.push(parsed);
          } catch (parseError) {
            logger.warn('Failed to parse search analytics data', {
              key: batch[j],
              error: parseError,
            });
          }
        }
      }

      return metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to retrieve search metrics', { error: errorMessage });
      return [];
    }
  }
}
