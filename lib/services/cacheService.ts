/**
 * CACHING SERVICE
 * Performance optimization through intelligent caching
 * Follows .cursorrules: Type safety, proper error handling
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Max cache size (number of entries)
  namespace?: string; // Cache namespace for organization
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

// ==========================================
// IN-MEMORY CACHE STORE
// ==========================================

class CacheStore<T = any> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private hits = 0;
  private misses = 0;
  private maxSize: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    
    // Increment hit counter
    entry.hits++;
    this.hits++;
    
    return entry.value;
  }

  set(key: string, value: T, ttl: number): void {
    // Evict oldest if at max size
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }
    
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttl,
      createdAt: now,
      hits: 0,
    };
    
    this.store.set(key, entry);
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;
    
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;
    
    const entries = Array.from(this.store.values());
    for (const entry of entries) {
      const createdAt = new Date(entry.createdAt);
      
      if (!oldestEntry || createdAt < oldestEntry) {
        oldestEntry = createdAt;
      }
      
      if (!newestEntry || createdAt > newestEntry) {
        newestEntry = createdAt;
      }
    }
    
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      oldestEntry,
      newestEntry,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 Cache cleanup: removed ${removed} expired entries`);
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
      console.log(`🗑️ Cache eviction: removed oldest entry (${oldestKey})`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global cache instances by namespace
const cacheStores = new Map<string, CacheStore>();

function getCacheStore(namespace: string = 'default'): CacheStore {
  if (!cacheStores.has(namespace)) {
    cacheStores.set(namespace, new CacheStore());
  }
  return cacheStores.get(namespace)!;
}

// ==========================================
// CACHING FUNCTIONS
// ==========================================

/**
 * Get a value from cache
 * 
 * @param key - Cache key
 * @param options - Cache options
 * @returns Cached value or null
 */
export function get<T>(key: string, options: CacheOptions = {}): T | null {
  const store = getCacheStore(options.namespace);
  return store.get(key);
}

/**
 * Set a value in cache
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Cache options (TTL, namespace)
 */
export function set<T>(key: string, value: T, options: CacheOptions = {}): void {
  const ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
  const store = getCacheStore(options.namespace);
  store.set(key, value, ttl);
}

/**
 * Check if a key exists in cache
 */
export function has(key: string, options: CacheOptions = {}): boolean {
  const store = getCacheStore(options.namespace);
  return store.has(key);
}

/**
 * Delete a value from cache
 */
export function del(key: string, options: CacheOptions = {}): boolean {
  const store = getCacheStore(options.namespace);
  return store.delete(key);
}

/**
 * Clear all cache entries in a namespace
 */
export function clear(namespace?: string): void {
  if (namespace) {
    const store = cacheStores.get(namespace);
    if (store) {
      store.clear();
      console.log(`🧹 Cleared cache namespace: ${namespace}`);
    }
  } else {
    // Clear all namespaces
    const stores = Array.from(cacheStores.values());
    for (const store of stores) {
      store.clear();
    }
    console.log('🧹 Cleared all cache namespaces');
  }
}

// ==========================================
// MEMOIZATION
// ==========================================

/**
 * Memoize an async function with caching
 * 
 * @param fn - Function to memoize
 * @param keyGenerator - Function to generate cache key from arguments
 * @param options - Cache options
 * 
 * @example
 * ```typescript
 * const cachedFetch = memoize(
 *   fetchHomeowner,
 *   (id) => `homeowner:${id}`,
 *   { ttl: 60000 } // Cache for 1 minute
 * );
 * ```
 */
export function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  options: CacheOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    
    // Check cache first
    const cached = get(key, options);
    if (cached !== null) {
      console.log(`💾 Cache HIT: ${key}`);
      return cached;
    }
    
    console.log(`🔄 Cache MISS: ${key}`);
    
    // Execute function and cache result
    try {
      const result = await fn(...args);
      set(key, result, options);
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }) as T;
}

/**
 * Cache wrapper for async operations
 * Similar to memoize but with explicit cache control
 * 
 * @example
 * ```typescript
 * const homeowner = await cached(
 *   `homeowner:${id}`,
 *   () => db.select().from(homeowners).where(eq(homeowners.id, id)),
 *   { ttl: 60000 }
 * );
 * ```
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Check cache first
  const cachedValue = get<T>(key, options);
  if (cachedValue !== null) {
    console.log(`💾 Cache HIT: ${key}`);
    return cachedValue;
  }
  
  console.log(`🔄 Cache MISS: ${key}`);
  
  // Execute function and cache result
  const result = await fn();
  set(key, result, options);
  return result;
}

// ==========================================
// PRESET CONFIGURATIONS
// ==========================================

/**
 * Common cache TTL presets
 */
export const CacheTTL = {
  /** 30 seconds - for very dynamic data */
  VERY_SHORT: 30 * 1000,
  
  /** 5 minutes - default TTL */
  SHORT: 5 * 60 * 1000,
  
  /** 15 minutes - for moderately stable data */
  MEDIUM: 15 * 60 * 1000,
  
  /** 1 hour - for stable data */
  LONG: 60 * 60 * 1000,
  
  /** 24 hours - for rarely changing data */
  VERY_LONG: 24 * 60 * 60 * 1000,
} as const;

/**
 * Namespace presets
 */
export const CacheNamespace = {
  HOMEOWNERS: 'homeowners',
  CLAIMS: 'claims',
  CONTRACTORS: 'contractors',
  MESSAGES: 'messages',
  CALLS: 'calls',
  API_RESPONSES: 'api',
  USER_DATA: 'users',
} as const;

// ==========================================
// CACHE INVALIDATION
// ==========================================

/**
 * Invalidate cache by pattern
 * Useful for invalidating related cache entries
 * 
 * @example
 * ```typescript
 * // Invalidate all homeowner caches
 * invalidatePattern('homeowner:', { namespace: 'homeowners' });
 * ```
 */
export function invalidatePattern(pattern: string, options: CacheOptions = {}): number {
  const store = getCacheStore(options.namespace);
  const storeMap = (store as any).store as Map<string, CacheEntry<any>>;
  
  let deleted = 0;
  const keys = Array.from(storeMap.keys());
  for (const key of keys) {
    if (key.includes(pattern)) {
      store.delete(key);
      deleted++;
    }
  }
  
  if (deleted > 0) {
    console.log(`🗑️ Invalidated ${deleted} cache entries matching: ${pattern}`);
  }
  
  return deleted;
}

/**
 * Invalidate multiple keys
 */
export function invalidateKeys(keys: string[], options: CacheOptions = {}): number {
  let deleted = 0;
  for (const key of keys) {
    if (del(key, options)) {
      deleted++;
    }
  }
  
  if (deleted > 0) {
    console.log(`🗑️ Invalidated ${deleted} cache keys`);
  }
  
  return deleted;
}

// ==========================================
// CACHE WARMING
// ==========================================

/**
 * Warm up cache with data
 * Useful for preloading frequently accessed data
 * 
 * @example
 * ```typescript
 * await warmCache('homeowners', async () => {
 *   const homeowners = await fetchAllHomeowners();
 *   return homeowners.map(h => [`homeowner:${h.id}`, h]);
 * });
 * ```
 */
export async function warmCache<T>(
  namespace: string,
  loader: () => Promise<Array<[string, T]>>,
  options: CacheOptions = {}
): Promise<number> {
  console.log(`🔥 Warming cache: ${namespace}`);
  
  try {
    const entries = await loader();
    
    for (const [key, value] of entries) {
      set(key, value, { ...options, namespace });
    }
    
    console.log(`✅ Warmed ${entries.length} cache entries in ${namespace}`);
    return entries.length;
  } catch (error) {
    console.error(`❌ Failed to warm cache ${namespace}:`, error);
    return 0;
  }
}

// ==========================================
// STATISTICS & MONITORING
// ==========================================

/**
 * Get cache statistics for a namespace
 */
export function getStats(namespace?: string): CacheStats {
  const store = getCacheStore(namespace);
  return store.getStats();
}

/**
 * Get stats for all namespaces
 */
export function getAllStats(): Record<string, CacheStats> {
  const stats: Record<string, CacheStats> = {};
  
  const entries = Array.from(cacheStores.entries());
  for (const [namespace, store] of entries) {
    stats[namespace] = store.getStats();
  }
  
  return stats;
}

/**
 * Log cache statistics (for debugging)
 */
export function logStats(namespace?: string): void {
  if (namespace) {
    const stats = getStats(namespace);
    console.log(`📊 Cache Stats [${namespace}]:`, {
      size: stats.size,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
    });
  } else {
    const allStats = getAllStats();
    console.log('📊 Cache Stats (All):');
    for (const [ns, stats] of Object.entries(allStats)) {
      console.log(`  ${ns}: ${stats.size} entries, ${(stats.hitRate * 100).toFixed(2)}% hit rate`);
    }
  }
}

// ==========================================
// CLEANUP
// ==========================================

/**
 * Cleanup function to call on app shutdown
 */
export function cleanup(): void {
  const stores = Array.from(cacheStores.values());
  for (const store of stores) {
    store.destroy();
  }
  cacheStores.clear();
  console.log('🧹 All cache stores destroyed');
}

// Export for testing
export const __internal__ = {
  cacheStores,
  getCacheStore,
};

