import { XAIProviderError, type XAIErrorCategory } from "./xai";
import { recordSuccess, recordFailure } from "../observability/circuit-breaker";
import { logger } from "../observability/logger";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

const RETRYABLE_ERROR_CATEGORIES: Set<XAIErrorCategory> = new Set([
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNKNOWN_ERROR",
]);

export function isRetryableError(error: unknown): boolean {
  if (error instanceof XAIProviderError) {
    return RETRYABLE_ERROR_CATEGORIES.has(error.category);
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  return false;
}

export function calculateDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterHeader?: string | null
): number {
  if (retryAfterHeader) {
    const retryAfterMs = parseInt(retryAfterHeader, 10) * 1000;
    if (!isNaN(retryAfterMs) && retryAfterMs > 0) {
      return Math.min(retryAfterMs, config.maxDelayMs);
    }
  }

  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const jitter = Math.random() * config.baseDelayMs * 0.3;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  circuitName?: string
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;
  let retryCount = 0;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      if (circuitName) recordSuccess(circuitName);
      return result;
    } catch (error) {
      lastError = error;
      retryCount = attempt;

      if (attempt === fullConfig.maxRetries) {
        if (circuitName) recordFailure(circuitName);
        break;
      }

      if (!isRetryableError(error)) {
        if (circuitName) recordFailure(circuitName);
        throw error;
      }

      const retryAfterHeader = error instanceof XAIProviderError
        ? (error as unknown as Record<string, unknown>).retryAfter as string | null
        : null;

      const delay = calculateDelay(attempt, fullConfig, retryAfterHeader);

      logger.debug({
        event: "retry_attempt",
        attempt: attempt + 1,
        maxRetries: fullConfig.maxRetries,
        delayMs: Math.round(delay),
        errorCategory: error instanceof XAIProviderError ? error.category : "unknown",
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function getRetryConfigForCategory(category: XAIErrorCategory): Partial<RetryConfig> {
  switch (category) {
    case "PROVIDER_RATE_LIMIT":
      return {
        maxRetries: 3,
        baseDelayMs: 2000,
        backoffMultiplier: 3,
      };
    case "PROVIDER_TIMEOUT":
      return {
        maxRetries: 2,
        baseDelayMs: 1500,
        backoffMultiplier: 2,
      };
    default:
      return {};
  }
}

export function getRetryCount(): number {
  return 0;
}
