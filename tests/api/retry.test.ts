import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  isRetryableError,
  calculateDelay,
  getRetryConfigForCategory,
} from "@/lib/ai/retry";
import { XAIProviderError } from "@/lib/ai/xai";

describe("isRetryableError", () => {
  it("returns true for rate limit errors", () => {
    const error = new XAIProviderError("PROVIDER_RATE_LIMIT", "rate limited");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for timeout errors", () => {
    const error = new XAIProviderError("PROVIDER_TIMEOUT", "timeout");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for unknown errors", () => {
    const error = new XAIProviderError("PROVIDER_UNKNOWN_ERROR", "unknown");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for auth errors", () => {
    const error = new XAIProviderError("PROVIDER_AUTH_ERROR", "unauthorized");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for bad request errors", () => {
    const error = new XAIProviderError("PROVIDER_BAD_REQUEST", "bad request");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for model not found errors", () => {
    const error = new XAIProviderError("MODEL_NOT_FOUND", "not found");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns true for AbortError", () => {
    const error = new DOMException("aborted", "AbortError");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for TypeError", () => {
    const error = new TypeError("fetch failed");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for generic Error", () => {
    const error = new Error("generic error");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isRetryableError("string")).toBe(false);
    expect(isRetryableError(42)).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe("calculateDelay", () => {
  const baseConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
    backoffMultiplier: 2,
  };

  it("calculates exponential backoff", () => {
    const delay0 = calculateDelay(0, baseConfig);
    const delay1 = calculateDelay(1, baseConfig);
    const delay2 = calculateDelay(2, baseConfig);

    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay0).toBeLessThan(1400);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay1).toBeLessThan(2400);
    expect(delay2).toBeGreaterThanOrEqual(4000);
    expect(delay2).toBeLessThan(4400);
  });

  it("caps delay at maxDelayMs", () => {
    const delay = calculateDelay(10, baseConfig);
    expect(delay).toBeLessThanOrEqual(30_000);
  });

  it("uses retry-after header when provided", () => {
    const delay = calculateDelay(0, baseConfig, "5");
    expect(delay).toBe(5000);
  });

  it("ignores invalid retry-after header", () => {
    const delay = calculateDelay(0, baseConfig, "invalid");
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThan(1400);
  });

  it("ignores negative retry-after header", () => {
    const delay = calculateDelay(0, baseConfig, "-5");
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThan(1400);
  });
});

describe("getRetryConfigForCategory", () => {
  it("returns rate limit config for rate limit errors", () => {
    const config = getRetryConfigForCategory("PROVIDER_RATE_LIMIT");
    expect(config.maxRetries).toBe(3);
    expect(config.baseDelayMs).toBe(2000);
    expect(config.backoffMultiplier).toBe(3);
  });

  it("returns timeout config for timeout errors", () => {
    const config = getRetryConfigForCategory("PROVIDER_TIMEOUT");
    expect(config.maxRetries).toBe(2);
    expect(config.baseDelayMs).toBe(1500);
    expect(config.backoffMultiplier).toBe(2);
  });

  it("returns empty config for other errors", () => {
    const config = getRetryConfigForCategory("PROVIDER_AUTH_ERROR");
    expect(config).toEqual({});
  });
});

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new XAIProviderError("PROVIDER_RATE_LIMIT", "rate limited"))
      .mockResolvedValueOnce("success");

    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max retries exceeded", async () => {
    const error = new XAIProviderError("PROVIDER_RATE_LIMIT", "rate limited");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { maxRetries: 1, baseDelayMs: 10 })
    ).rejects.toThrow("rate limited");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable error", async () => {
    const error = new XAIProviderError("PROVIDER_AUTH_ERROR", "unauthorized");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow("unauthorized");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on TypeError", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce("success");

    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
