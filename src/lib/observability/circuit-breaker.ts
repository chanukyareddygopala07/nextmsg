/**
 * Circuit Breaker
 *
 * Lightweight process-local circuit breaker for AI provider protection.
 * Prevents repeated failing requests when the provider is down.
 *
 * States:
 *   CLOSED  — normal operation, requests pass through
 *   OPEN    — provider failures exceeded threshold, requests blocked
 *   HALF_OPEN — cooldown elapsed, allow a single probe request
 *
 * Limitations:
 *   Process-local only. Not shared across serverless instances.
 *   Suitable for single-instance or small-scale deployments.
 */

export type CircuitState = "closed" | "open" | "half_open";

interface CircuitEntry {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number;
  lastStateChangeAt: number;
}

const circuits = new Map<string, CircuitEntry>();

const DEFAULT_CONFIG = {
  failureThreshold: 5,
  successThreshold: 2,
  cooldownMs: 60_000,
};

interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  cooldownMs?: number;
}

function getOrCreate(name: string): CircuitEntry {
  let entry = circuits.get(name);
  if (!entry) {
    entry = {
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureAt: 0,
      lastStateChangeAt: Date.now(),
    };
    circuits.set(name, entry);
  }
  return entry;
}

export function getCircuitState(name: string): CircuitState {
  const entry = getOrCreate(name);

  if (entry.state === "open") {
    const elapsed = Date.now() - entry.lastStateChangeAt;
    const cooldown = DEFAULT_CONFIG.cooldownMs;
    if (elapsed >= cooldown) {
      entry.state = "half_open";
      entry.lastStateChangeAt = Date.now();
    }
  }

  return entry.state;
}

export function canRequest(name: string): boolean {
  const state = getCircuitState(name);
  return state !== "open";
}

export function recordSuccess(name: string, config?: CircuitBreakerConfig): void {
  const entry = getOrCreate(name);
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (entry.state === "half_open") {
    entry.successCount++;
    if (entry.successCount >= cfg.successThreshold) {
      entry.state = "closed";
      entry.failureCount = 0;
      entry.successCount = 0;
      entry.lastStateChangeAt = Date.now();
    }
  } else if (entry.state === "closed") {
    entry.failureCount = 0;
  }
}

export function recordFailure(name: string, config?: CircuitBreakerConfig): void {
  const entry = getOrCreate(name);
  const cfg = { ...DEFAULT_CONFIG, ...config };

  entry.failureCount++;
  entry.successCount = 0;
  entry.lastFailureAt = Date.now();

  if (entry.state === "half_open") {
    entry.state = "open";
    entry.lastStateChangeAt = Date.now();
  } else if (entry.failureCount >= cfg.failureThreshold) {
    entry.state = "open";
    entry.lastStateChangeAt = Date.now();
  }
}

export function resetCircuit(name: string): void {
  circuits.delete(name);
}

export function getAllCircuits(): Record<string, { state: CircuitState; failureCount: number; successCount: number }> {
  const result: Record<string, { state: CircuitState; failureCount: number; successCount: number }> = {};
  for (const [name, entry] of circuits) {
    result[name] = {
      state: getCircuitState(name),
      failureCount: entry.failureCount,
      successCount: entry.successCount,
    };
  }
  return result;
}
