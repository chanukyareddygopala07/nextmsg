interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 30,
};

const GENERATION_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

const store = new Map<string, RateLimitEntry>();

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

function getEntry(key: string, config: RateLimitConfig): RateLimitEntry {
  const now = Date.now();
  const existing = store.get(key);

  if (existing && now < existing.resetAt) {
    return existing;
  }

  const entry: RateLimitEntry = {
    count: 0,
    resetAt: now + config.windowMs,
  };
  store.set(key, entry);
  return entry;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const entry = getEntry(identifier, fullConfig);

  entry.count++;

  const allowed = entry.count <= fullConfig.maxRequests;
  const remaining = Math.max(0, fullConfig.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

export function checkGenerationRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, GENERATION_CONFIG);
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(GENERATION_CONFIG.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 60_000);
}
