/**
 * Retry utilities with exponential backoff and jitter
 * Prevents thundering herd and improves resilience
 */

import { logService } from '@/services/logging';

export interface RetryOptions {
  attempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Retry a function with exponential backoff and jitter
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    baseDelay = 300,
    maxDelay = 8000,
    onRetry,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // Don't retry if this was the last attempt
      if (attempt === attempts - 1) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 150; // 0-150ms random jitter
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      logService.log('info', `Retry attempt ${attempt + 1}/${attempts}`, {
        delay,
        error: lastError.message,
      });

      // Call retry callback if provided
      onRetry?.(attempt + 1, lastError);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All attempts failed
  logService.log('error', 'All retry attempts failed', {
    attempts,
    finalError: lastError!.message,
  });
  
  throw lastError!;
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private onStateChange?: (state: 'closed' | 'open' | 'half-open') => void
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'half-open';
        this.onStateChange?.('half-open');
        logService.log('info', 'Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      
      // Success - reset if we were in half-open state
      if (this.state === 'half-open') {
        this.failureCount = 0;
        this.state = 'closed';
        this.onStateChange?.('closed');
        logService.log('info', 'Circuit breaker closed - service recovered');
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        this.onStateChange?.('open');
        logService.log('warn', 'Circuit breaker opened', {
          failureCount: this.failureCount,
          threshold: this.threshold,
        });
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.failureCount = 0;
    this.state = 'closed';
    this.onStateChange?.('closed');
    logService.log('info', 'Circuit breaker manually reset');
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry specific error types
 */
export function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'AbortError',
  ];

  const errorMessage = error.message.toLowerCase();
  const retryableMessages = [
    'network error',
    'timeout',
    'connection refused',
    'fetch failed',
    'socket hang up',
    'rate limit',
    '429',
    '503',
    '504',
  ];

  return (
    retryableErrors.some(code => errorMessage.includes(code.toLowerCase())) ||
    retryableMessages.some(msg => errorMessage.includes(msg))
  );
}

/**
 * Create an AbortController with timeout
 */
export function createAbortController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Fetch with retry and timeout
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & { retryOptions?: RetryOptions } = {}
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options;
  
  return retry(
    async () => {
      const controller = createAbortController(30000); // 30s timeout
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    },
    {
      attempts: 3,
      shouldRetry: isRetryableError,
      ...retryOptions,
    }
  );
}
