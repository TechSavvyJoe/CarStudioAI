/**
 * Rate limit retry utility with exponential backoff
 */

import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number) => void;
}

/**
 * Wraps an async function with rate limit retry logic
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a rate limit error
      const isRateLimit =
        (error as { status?: number })?.status === 429 ||
        /rate limit|quota/i.test(lastError.message);

      // If not rate limit or last attempt, throw immediately
      if (!isRateLimit || attempt === maxRetries - 1) {
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      logger.warn(`[RateLimit] Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);

      if (onRetry) {
        onRetry(attempt + 1, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
