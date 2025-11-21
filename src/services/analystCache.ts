// analystCache.ts - Intelligent caching for Analyst responses

import { eventBus } from './eventBus';

export interface CachedResponse {
  key: string;
  response: string;
  context: any;
  timestamp: Date;
  hits: number;
  persona: string;
  expiresAt: Date;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsageKB: number;
}

class AnalystCache {
  private cache: Map<string, CachedResponse> = new Map();
  private hits = 0;
  private misses = 0;
  private maxSize = 100;
  private defaultTTL = 300000; // 5 minutes

  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  /**
   * Generate cache key from message and context
   */
  private generateKey(message: string, persona: string, contextHash: string): string {
    const normalized = message.toLowerCase().trim();
    return `${persona}:${normalized.substring(0, 100)}:${contextHash}`;
  }

  /**
   * Generate context hash for similarity detection
   */
  generateContextHash(context: any): string {
    const relevant = {
      portfolioValue: Math.floor((context.portfolioData?.totalEquity || 0) / 1000) * 1000,
      positionCount: context.portfolioData?.positions?.length || 0,
      riskLevel: context.riskMetrics?.portfolioVolatility || 0,
      isDemoMode: context.isDemoMode || false
    };
    
    return JSON.stringify(relevant);
  }

  /**
   * Get cached response if available and valid
   */
  get(message: string, persona: string, context: any): string | null {
    const contextHash = this.generateContextHash(context);
    const key = this.generateKey(message, persona, contextHash);
    
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt.getTime()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Check if context is still similar enough
    const currentHash = this.generateContextHash(context);
    if (currentHash !== this.generateContextHash(cached.context)) {
      this.misses++;
      return null;
    }

    this.hits++;
    cached.hits++;
    cached.timestamp = new Date(); // Update last access time
    
    console.log(`💾 Cache HIT for: "${message.substring(0, 50)}..." (${cached.hits} hits)`);
    
    eventBus.emit('analyst.cache_hit', { key, hits: cached.hits });
    
    return cached.response;
  }

  /**
   * Store response in cache
   */
  set(
    message: string,
    persona: string,
    response: string,
    context: any,
    ttl?: number
  ): void {
    const contextHash = this.generateContextHash(context);
    const key = this.generateKey(message, persona, contextHash);
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL));

    this.cache.set(key, {
      key,
      response,
      context,
      timestamp: new Date(),
      hits: 0,
      persona,
      expiresAt
    });

    console.log(`💾 Cached response for: "${message.substring(0, 50)}..."`);
    this.persistToStorage();
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest() {
    let oldest: CachedResponse | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`💾 Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Invalidate cache entries matching criteria
   */
  invalidate(filter?: {
    persona?: string;
    olderThan?: Date;
    contextMatch?: any;
  }) {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      let shouldInvalidate = false;

      if (filter?.persona && entry.persona !== filter.persona) {
        continue;
      }

      if (filter?.olderThan && entry.timestamp < filter.olderThan) {
        shouldInvalidate = true;
      }

      if (filter?.contextMatch) {
        const cachedHash = this.generateContextHash(entry.context);
        const filterHash = this.generateContextHash(filter.contextMatch);
        if (cachedHash === filterHash) {
          shouldInvalidate = true;
        }
      }

      if (shouldInvalidate || !filter) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      console.log(`💾 Invalidated ${invalidated} cache entries`);
      this.persistToStorage();
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    
    // Estimate memory usage
    let memoryBytes = 0;
    for (const entry of this.cache.values()) {
      memoryBytes += JSON.stringify(entry).length * 2; // Rough estimate
    }

    return {
      totalEntries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 10) / 10,
      memoryUsageKB: Math.round(memoryBytes / 1024)
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.persistToStorage();
    console.log('💾 Cache cleared');
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval() {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt.getTime()) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`💾 Cleaned up ${cleaned} expired cache entries`);
      this.persistToStorage();
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistToStorage() {
    try {
      const data = Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        response: entry.response,
        context: entry.context,
        timestamp: entry.timestamp.toISOString(),
        hits: entry.hits,
        persona: entry.persona,
        expiresAt: entry.expiresAt.toISOString()
      }));

      localStorage.setItem('analyst_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist analyst cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('analyst_cache');
      
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        data.forEach((item: any) => {
          const expiresAt = new Date(item.expiresAt);
          
          // Only load if not expired
          if (now < expiresAt.getTime()) {
            this.cache.set(item.key, {
              ...item,
              timestamp: new Date(item.timestamp),
              expiresAt
            });
          }
        });

        console.log(`💾 Loaded ${this.cache.size} cached analyst responses`);
      }
    } catch (error) {
      console.error('Failed to load analyst cache:', error);
    }
  }
}

// Export singleton instance
export const analystCache = new AnalystCache();
