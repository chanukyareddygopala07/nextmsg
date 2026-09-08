/**
 * Lightweight Metrics
 *
 * In-process counters for production observability.
 * Tracks request counts, error rates, AI call metrics.
 * Resets on server restart (suitable for single-instance deployments).
 */

interface MetricEntry {
  count: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
}

const metrics = new Map<string, MetricEntry>();

function getOrCreate(key: string): MetricEntry {
  let entry = metrics.get(key);
  if (!entry) {
    entry = {
      count: 0,
      successCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      minDurationMs: Infinity,
    };
    metrics.set(key, entry);
  }
  return entry;
}

export function recordMetric(params: {
  operation: string;
  durationMs: number;
  success: boolean;
  category?: string;
}): void {
  const key = params.category ? `${params.category}:${params.operation}` : params.operation;
  const entry = getOrCreate(key);

  entry.count++;
  if (params.success) {
    entry.successCount++;
  } else {
    entry.errorCount++;
  }
  entry.totalDurationMs += params.durationMs;
  entry.maxDurationMs = Math.max(entry.maxDurationMs, params.durationMs);
  entry.minDurationMs = Math.min(entry.minDurationMs, params.durationMs);
}

export function getMetric(key: string): (MetricEntry & { avgDurationMs: number }) | undefined {
  const entry = metrics.get(key);
  if (!entry || entry.count === 0) return undefined;

  return {
    ...entry,
    avgDurationMs: Math.round(entry.totalDurationMs / entry.count),
  };
}

export function getAllMetrics(): Record<string, MetricEntry & { avgDurationMs: number }> {
  const result: Record<string, MetricEntry & { avgDurationMs: number }> = {};
  for (const [key, entry] of metrics) {
    if (entry.count > 0) {
      result[key] = {
        ...entry,
        avgDurationMs: Math.round(entry.totalDurationMs / entry.count),
      };
    }
  }
  return result;
}

export function getSummary(): {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  operations: string[];
} {
  let totalRequests = 0;
  let totalErrors = 0;
  const operations: string[] = [];

  for (const [key, entry] of metrics) {
    totalRequests += entry.count;
    totalErrors += entry.errorCount;
    if (entry.count > 0) {
      operations.push(key);
    }
  }

  return {
    totalRequests,
    totalErrors,
    errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
    operations,
  };
}

export function resetMetrics(): void {
  metrics.clear();
}
