import { describe, it, expect } from "vitest";
import {
  checkRateLimit,
  checkGenerationRateLimit,
  getRateLimitHeaders,
  getClientIdentifier,
} from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within limit", () => {
    const result = checkRateLimit("test-user-1", {
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests exceeding limit", () => {
    const identifier = "test-user-2";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(identifier, { windowMs: 60_000, maxRequests: 5 });
    }
    const result = checkRateLimit(identifier, { windowMs: 60_000, maxRequests: 5 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks remaining requests correctly", () => {
    const identifier = "test-user-3";
    const config = { windowMs: 60_000, maxRequests: 3 };

    checkRateLimit(identifier, config);
    const result2 = checkRateLimit(identifier, config);
    expect(result2.remaining).toBe(1);

    checkRateLimit(identifier, config);
    const result4 = checkRateLimit(identifier, config);
    expect(result4.remaining).toBe(0);
  });
});

describe("checkGenerationRateLimit", () => {
  it("allows requests within limit", () => {
    const result = checkGenerationRateLimit("test-gen-user-1");
    expect(result.allowed).toBe(true);
  });
});

describe("getRateLimitHeaders", () => {
  it("returns correct headers", () => {
    const result = {
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 60_000,
    };
    const headers = getRateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("5");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });
});

describe("getClientIdentifier", () => {
  it("extracts IP from x-forwarded-for", () => {
    const request = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIdentifier(request)).toBe("192.168.1.1");
  });

  it("extracts IP from x-real-ip", () => {
    const request = new Request("http://localhost:3000", {
      headers: { "x-real-ip": "192.168.1.2" },
    });
    expect(getClientIdentifier(request)).toBe("192.168.1.2");
  });

  it("returns unknown when no headers present", () => {
    const request = new Request("http://localhost:3000");
    expect(getClientIdentifier(request)).toBe("unknown");
  });
});
