/**
 * Cache Storage Utility with TTL (Time To Live)
 *
 * Provides localStorage wrapper with automatic expiration for cached data.
 * Useful for form inputs, API responses, and temporary state.
 */

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Default TTL values (in milliseconds)
 */
export const CacheTTL = {
  /** 5 minutes - for temporary form state */
  SHORT: 5 * 60 * 1000,
  /** 1 hour - for session data and API responses */
  MEDIUM: 60 * 60 * 1000,
  /** 24 hours - for user preferences and settings */
  LONG: 24 * 60 * 60 * 1000,
  /** 7 days - for rarely changing data */
  WEEK: 7 * 24 * 60 * 60 * 1000,
  /** Never expires */
  FOREVER: Infinity,
} as const;

/**
 * Set item in cache with TTL
 *
 * @param key - Storage key
 * @param value - Value to store (will be JSON serialized)
 * @param ttl - Time to live in milliseconds (default: 1 hour)
 */
export function cacheSet<T>(key: string, value: T, ttl: number = CacheTTL.MEDIUM): void {
  try {
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error(`Failed to cache item "${key}":`, error);
  }
}

/**
 * Get item from cache if not expired
 *
 * @param key - Storage key
 * @returns Cached value or null if expired/not found
 */
export function cacheGet<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const cached: CacheItem<T> = JSON.parse(item);
    const now = Date.now();
    const age = now - cached.timestamp;

    // Check if expired
    if (cached.ttl !== Infinity && age > cached.ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.value;
  } catch (error) {
    console.error(`Failed to retrieve cached item "${key}":`, error);
    return null;
  }
}

/**
 * Get item from cache with fallback value
 *
 * @param key - Storage key
 * @param fallback - Fallback value if not found or expired
 * @returns Cached value or fallback
 */
export function cacheGetOrDefault<T>(key: string, fallback: T): T {
  const value = cacheGet<T>(key);
  return value !== null ? value : fallback;
}

/**
 * Check if cache item exists and is not expired
 *
 * @param key - Storage key
 * @returns true if item exists and is valid
 */
export function cacheHas(key: string): boolean {
  return cacheGet(key) !== null;
}

/**
 * Remove item from cache
 *
 * @param key - Storage key
 */
export function cacheRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove cached item "${key}":`, error);
  }
}

/**
 * Clear all cache items (removes all localStorage items)
 */
export function cacheClear(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Clear expired cache items
 * Run this periodically to clean up stale data
 */
export function cacheCleanExpired(): void {
  try {
    const keys = Object.keys(localStorage);
    let removedCount = 0;

    for (const key of keys) {
      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const cached: CacheItem<any> = JSON.parse(item);

        // Check if it's a cache item with TTL
        if (cached.timestamp && cached.ttl !== undefined) {
          const now = Date.now();
          const age = now - cached.timestamp;

          if (cached.ttl !== Infinity && age > cached.ttl) {
            localStorage.removeItem(key);
            removedCount++;
          }
        }
      } catch {
        // Skip non-cache items or malformed data
        continue;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned ${removedCount} expired cache items`);
    }
  } catch (error) {
    console.error('Failed to clean expired cache:', error);
  }
}

/**
 * Get cache statistics
 *
 * @returns Object with cache stats
 */
export function cacheStats(): {
  totalItems: number;
  cacheItems: number;
  expiredItems: number;
  totalSize: number; // in bytes
} {
  const keys = Object.keys(localStorage);
  let cacheItems = 0;
  let expiredItems = 0;
  let totalSize = 0;

  for (const key of keys) {
    try {
      const item = localStorage.getItem(key);
      if (!item) continue;

      totalSize += item.length + key.length;

      const cached: CacheItem<any> = JSON.parse(item);

      // Check if it's a cache item with TTL
      if (cached.timestamp && cached.ttl !== undefined) {
        cacheItems++;

        const now = Date.now();
        const age = now - cached.timestamp;

        if (cached.ttl !== Infinity && age > cached.ttl) {
          expiredItems++;
        }
      }
    } catch {
      // Skip non-cache items
      continue;
    }
  }

  return {
    totalItems: keys.length,
    cacheItems,
    expiredItems,
    totalSize,
  };
}

/**
 * Initialize cache cleaning on app start
 * Call this once when your app initializes
 */
export function initCacheCleanup(): void {
  // Clean expired items on init
  cacheCleanExpired();

  // Set up periodic cleaning (every 5 minutes)
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  setInterval(cacheCleanExpired, CLEANUP_INTERVAL);
}
