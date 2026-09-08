#!/usr/bin/env node

/**
 * Uptime Monitor Script
 *
 * Checks health endpoint and reports status.
 * Can be run manually or scheduled via cron/external service.
 *
 * Usage:
 *   node scripts/uptime-monitor.js [URL]
 *
 * Environment:
 *   HEALTH_URL - Health endpoint URL (default: https://nextmsg-two.vercel.app/api/health)
 *   SLACK_WEBHOOK_URL - Optional Slack webhook for alerts
 */

const HEALTH_URL = process.env.HEALTH_URL || process.argv[2] || "https://nextmsg-two.vercel.app/api/health";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TIMEOUT_MS = 15_000;

async function checkHealth() {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(HEALTH_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "nextmsg-uptime-monitor/1.0" },
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - start;
    const data = await response.json();

    const result = {
      timestamp: new Date().toISOString(),
      url: HEALTH_URL,
      httpStatus: response.status,
      appStatus: data.status,
      databaseStatus: data.database?.status,
      databaseLatencyMs: data.database?.latencyMs,
      latencyMs,
      ok: response.status === 200 && data.status === "ok",
    };

    console.log(JSON.stringify(result, null, 2));

    if (!result.ok && SLACK_WEBHOOK_URL) {
      await sendAlert(result);
    }

    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    const result = {
      timestamp: new Date().toISOString(),
      url: HEALTH_URL,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latencyMs: Date.now() - start,
    };

    console.error(JSON.stringify(result, null, 2));

    if (SLACK_WEBHOOK_URL) {
      await sendAlert(result);
    }

    process.exit(1);
  }
}

async function sendAlert(result) {
  if (!SLACK_WEBHOOK_URL) return;

  const message = {
    text: `*NextMsg Health Alert*\nStatus: ${result.ok ? "OK" : "DEGRADED"}\nApp: ${result.appStatus || "unknown"}\nDB: ${result.databaseStatus || "unknown"}\nLatency: ${result.latencyMs}ms\nTime: ${result.timestamp}`,
  };

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch {
    console.error("Failed to send Slack alert");
  }
}

checkHealth();
