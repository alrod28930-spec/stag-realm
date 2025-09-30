/**
 * Idempotency utilities
 * Prevents duplicate order submissions and race conditions
 */

import { logService } from '@/services/logging';

/**
 * Simple in-memory idempotency cache
 * In production, this should use Redis or similar
 */
class IdempotencyCache {
  private cache = new Map<string, { timestamp: number; value: any }>();
  private readonly defaultTTL = 60000; // 60 seconds

  set(key: string, value: any, ttlMs: number = this.defaultTTL): void {
    this.cache.set(key, {
      timestamp: Date.now(),
      value,
    });

    // Auto-expire after TTL
    setTimeout(() => {
      this.cache.delete(key);
    }, ttlMs);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const idempotencyCache = new IdempotencyCache();

/**
 * Generate idempotency key for order submission
 */
export function generateOrderIdempotencyKey(
  userId: string,
  workspaceId: string,
  symbol: string,
  side: 'buy' | 'sell',
  qty: number,
  timeWindowSeconds: number = 60
): string {
  // Round timestamp to time window (prevents duplicate orders within window)
  const windowedTimestamp = Math.floor(Date.now() / (timeWindowSeconds * 1000));
  
  const payload = `${userId}:${workspaceId}:${symbol}:${side}:${qty}:${windowedTimestamp}`;
  return simpleHash(payload);
}

/**
 * Check if order is duplicate
 */
export function isDuplicateOrder(idempotencyKey: string): boolean {
  const exists = idempotencyCache.has(idempotencyKey);
  
  if (exists) {
    logService.log('warn', 'Duplicate order detected', { idempotencyKey });
  }
  
  return exists;
}

/**
 * Mark order as submitted
 */
export function markOrderSubmitted(
  idempotencyKey: string,
  orderData: any,
  ttlMs: number = 60000
): void {
  idempotencyCache.set(idempotencyKey, orderData, ttlMs);
  logService.log('info', 'Order marked as submitted', { 
    idempotencyKey,
    ttl: ttlMs,
  });
}

/**
 * Get cached order result
 */
export function getCachedOrderResult(idempotencyKey: string): any | null {
  return idempotencyCache.get(idempotencyKey);
}

/**
 * Wrap async function with idempotency check
 */
export async function withIdempotency<T>(
  idempotencyKey: string,
  fn: () => Promise<T>,
  ttlMs: number = 60000
): Promise<T> {
  // Check if already exists
  const cached = idempotencyCache.get(idempotencyKey);
  if (cached !== null) {
    logService.log('info', 'Returning cached result', { idempotencyKey });
    return cached;
  }

  // Execute function
  const result = await fn();
  
  // Cache result
  idempotencyCache.set(idempotencyKey, result, ttlMs);
  
  return result;
}

/**
 * Simple hash function (not cryptographic)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clear all idempotency cache (useful for testing)
 */
export function clearIdempotencyCache(): void {
  idempotencyCache.clear();
  logService.log('info', 'Idempotency cache cleared');
}

/**
 * Get idempotency cache stats
 */
export function getIdempotencyCacheStats() {
  return {
    size: idempotencyCache.size(),
  };
}
