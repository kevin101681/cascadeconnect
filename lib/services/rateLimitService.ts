/**
 * RATE LIMITING SERVICE
 * Prevent abuse and manage API request rates
 * Follows .cursorrules: Type safety, proper error handling
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Prefix for rate limit keys
  message?: string; // Custom error message
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // Seconds until allowed again
}

export interface RateLimitStore {
  requests: number;
  resetTime: number;
}

// ==========================================
// IN-MEMORY STORE
// ==========================================

class RateLimitMemoryStore {
  private store: Map<string, RateLimitStore> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  get(key: string): RateLimitStore | null {
    const entry = this.store.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }

  set(key: string, value: RateLimitStore): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global store instance
const memoryStore = new RateLimitMemoryStore();

// ==========================================
// RATE LIMITING FUNCTIONS
// ==========================================

/**
 * Check if a request is allowed under rate limits
 * 
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * ```typescript
 * const result = checkRateLimit(userId, {
 *   windowMs: 60000, // 1 minute
 *   maxRequests: 10, // 10 requests per minute
 * });
 * 
 * if (!result.allowed) {
 *   throw new Error(`Rate limit exceeded. Try again in ${result.retryAfter}s`);
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = config.keyPrefix ? `${config.keyPrefix}:${identifier}` : identifier;
  const now = Date.now();
  
  // Get current store entry
  let store = memoryStore.get(key);
  
  // Create new entry if none exists or expired
  if (!store) {
    store = {
      requests: 1,
      resetTime: now + config.windowMs,
    };
    memoryStore.set(key, store);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: new Date(store.resetTime),
    };
  }
  
  // Check if limit exceeded
  if (store.requests >= config.maxRequests) {
    const retryAfter = Math.ceil((store.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(store.resetTime),
      retryAfter,
    };
  }
  
  // Increment request count
  store.requests++;
  memoryStore.set(key, store);
  
  return {
    allowed: true,
    remaining: config.maxRequests - store.requests,
    resetTime: new Date(store.resetTime),
  };
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string, keyPrefix?: string): void {
  const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
  memoryStore.delete(key);
}

/**
 * Clear all rate limits (use with caution)
 */
export function clearAllRateLimits(): void {
  memoryStore.clear();
}

// ==========================================
// RATE LIMIT DECORATORS
// ==========================================

/**
 * Rate limit decorator for async functions
 * 
 * @example
 * ```typescript
 * const rateLimitedUpload = withRateLimit(
 *   uploadFile,
 *   (file) => `upload:${file.name}`,
 *   { windowMs: 60000, maxRequests: 10 }
 * );
 * ```
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getIdentifier: (...args: Parameters<T>) => string,
  config: RateLimitConfig
): T {
  return (async (...args: Parameters<T>) => {
    const identifier = getIdentifier(...args);
    const result = checkRateLimit(identifier, config);
    
    if (!result.allowed) {
      const message = config.message || `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`;
      throw new Error(message);
    }
    
    return fn(...args);
  }) as T;
}

// ==========================================
// PRESET CONFIGURATIONS
// ==========================================

/**
 * Common rate limit presets
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit: 5 requests per minute
   * Use for sensitive operations (password reset, etc.)
   */
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },

  /**
   * Standard rate limit: 30 requests per minute
   * Use for general API endpoints
   */
  STANDARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },

  /**
   * Relaxed rate limit: 100 requests per minute
   * Use for read-only operations
   */
  RELAXED: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  /**
   * File upload limit: 10 uploads per hour
   */
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Upload limit exceeded. Please try again later.',
  },

  /**
   * Email sending limit: 20 emails per hour
   */
  EMAIL_SEND: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Email limit exceeded. Please try again later.',
  },

  /**
   * SMS sending limit: 10 messages per hour
   */
  SMS_SEND: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'SMS limit exceeded. Please try again later.',
  },

  /**
   * API call limit: 1000 requests per hour
   */
  API_CALL: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
  },
} as const;

// ==========================================
// MIDDLEWARE HELPER
// ==========================================

/**
 * Create rate limit middleware for API routes
 * Works with Express/Netlify functions
 * 
 * @example
 * ```typescript
 * export const handler = createRateLimitMiddleware(
 *   { windowMs: 60000, maxRequests: 10 },
 *   async (event) => {
 *     // Your handler logic
 *     return { statusCode: 200, body: 'OK' };
 *   }
 * );
 * ```
 */
export function createRateLimitMiddleware<T extends (...args: any[]) => any>(
  config: RateLimitConfig,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    // Extract identifier from request (event or req)
    const event = args[0];
    let identifier: string;
    
    if (event?.headers) {
      // Netlify function
      identifier = 
        event.headers['x-forwarded-for'] || 
        event.headers['client-ip'] || 
        'unknown';
    } else if (event?.ip) {
      // Express request
      identifier = event.ip;
    } else {
      identifier = 'unknown';
    }
    
    const result = checkRateLimit(identifier, config);
    
    if (!result.allowed) {
      const response = {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(result.resetTime.getTime() / 1000)),
        },
        body: JSON.stringify({
          error: config.message || 'Too many requests',
          retryAfter: result.retryAfter,
        }),
      };
      
      return response as any;
    }
    
    // Add rate limit headers to successful responses
    const addHeaders = (response: any) => {
      if (response && typeof response === 'object') {
        response.headers = {
          ...response.headers,
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.resetTime.getTime() / 1000)),
        };
      }
      return response;
    };
    
    const handlerResult = await handler(...args);
    return addHeaders(handlerResult);
  }) as T;
}

// ==========================================
// IP BLOCKING
// ==========================================

const blockedIPs = new Set<string>();
const blockedPatterns: RegExp[] = [];

/**
 * Block an IP address
 */
export function blockIP(ip: string): void {
  blockedIPs.add(ip);
  console.log(`🚫 Blocked IP: ${ip}`);
}

/**
 * Unblock an IP address
 */
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  console.log(`✅ Unblocked IP: ${ip}`);
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): boolean {
  // Check exact match
  if (blockedIPs.has(ip)) return true;
  
  // Check patterns
  return blockedPatterns.some(pattern => pattern.test(ip));
}

/**
 * Block IPs matching a pattern (e.g., '192.168.*')
 */
export function blockIPPattern(pattern: string): void {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '\\d+') + '$');
  blockedPatterns.push(regex);
  console.log(`🚫 Blocked IP pattern: ${pattern}`);
}

/**
 * Get list of blocked IPs
 */
export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs);
}

// ==========================================
// ANALYTICS
// ==========================================

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  activeKeys: number;
  totalRequests: number;
} {
  let totalRequests = 0;
  let activeKeys = 0;
  
  // Access private store for stats (in real implementation, would expose this properly)
  const store = (memoryStore as any).store as Map<string, RateLimitStore>;
  
  const entries = Array.from(store.values());
  for (const entry of entries) {
    activeKeys++;
    totalRequests += entry.requests;
  }
  
  return {
    activeKeys,
    totalRequests,
  };
}

// ==========================================
// CLEANUP
// ==========================================

/**
 * Cleanup function to call on app shutdown
 */
export function cleanup(): void {
  memoryStore.destroy();
}

// Export store for testing
export const __internal__ = {
  memoryStore,
};

