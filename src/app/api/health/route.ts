import { NextResponse } from "next/server";
import { validateEnvironment } from "@/lib/observability/env";
import { getSummary } from "@/lib/observability/metrics";
import { getAllCircuits } from "@/lib/observability/circuit-breaker";
import { db } from "@/lib/db";

const APP_VERSION = process.env.npm_package_version || "0.1.0";

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

export async function GET() {
  const env = validateEnvironment();
  const metrics = getSummary();
  const circuits = getAllCircuits();

  const unhealthyCircuits = Object.entries(circuits)
    .filter(([, c]) => c.state === "open")
    .map(([name]) => name);

  const db = await checkDatabase();

  const status = env.valid && unhealthyCircuits.length === 0 && db.ok ? "ok" : "degraded";

  return NextResponse.json({
    status,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: db.ok ? "connected" : "disconnected",
      latencyMs: db.latencyMs,
      error: db.error,
    },
    metrics: {
      totalRequests: metrics.totalRequests,
      errorRate: metrics.errorRate,
      operations: metrics.operations.length,
    },
    circuitBreakers: unhealthyCircuits.length > 0 ? { unhealthy: unhealthyCircuits } : undefined,
    warnings: env.warnings.length > 0 ? env.warnings : undefined,
    errors: env.errors.length > 0 ? env.errors : undefined,
  }, {
    status: status === "ok" ? 200 : 503,
  });
}
