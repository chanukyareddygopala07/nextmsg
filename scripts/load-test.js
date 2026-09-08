#!/usr/bin/env node

/**
 * Load Test Script
 *
 * Measures throughput, latency, and error rate for production endpoints.
 * Safe for local and controlled environment testing.
 *
 * Usage:
 *   node scripts/load-test.js [URL] [options]
 *
 * Options:
 *   --duration <seconds>   Test duration (default: 30)
 *   --concurrency <n>      Concurrent requests (default: 5)
 *   --endpoint <path>      Endpoint path (default: /api/health)
 *
 * Environment:
 *   LOAD_TEST_URL - Base URL (default: https://nextmsg-two.vercel.app)
 */

const BASE_URL = process.env.LOAD_TEST_URL || "https://nextmsg-two.vercel.app";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    duration: 30,
    concurrency: 5,
    endpoint: "/api/health",
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--duration" && args[i + 1]) opts.duration = parseInt(args[i + 1], 10);
    if (args[i] === "--concurrency" && args[i + 1]) opts.concurrency = parseInt(args[i + 1], 10);
    if (args[i] === "--endpoint" && args[i + 1]) opts.endpoint = args[i + 1];
  }

  return opts;
}

async function makeRequest(url) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "nextmsg-load-test/1.0" },
    });
    const latencyMs = Date.now() - start;
    const ok = response.status >= 200 && response.status < 400;
    return { ok, latencyMs, status: response.status };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - start, status: 0, error: error.message };
  }
}

async function runLoadTest(opts) {
  const url = `${BASE_URL}${opts.endpoint}`;
  const endTime = Date.now() + opts.duration * 1000;
  const results = [];
  const latencies = [];
  let errors = 0;
  let totalRequests = 0;

  console.log(`\nLoad Test Configuration:`);
  console.log(`  Target:       ${url}`);
  console.log(`  Duration:     ${opts.duration}s`);
  console.log(`  Concurrency:  ${opts.concurrency}`);
  console.log(`\nRunning...\n`);

  const startTime = Date.now();

  async function worker() {
    while (Date.now() < endTime) {
      const result = await makeRequest(url);
      results.push(result);
      latencies.push(result.latencyMs);
      totalRequests++;
      if (!result.ok) errors++;
    }
  }

  const workers = Array.from({ length: opts.concurrency }, () => worker());
  await Promise.all(workers);

  const actualDuration = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const throughput = totalRequests / actualDuration;
  const errorRate = totalRequests > 0 ? (errors / totalRequests * 100).toFixed(2) : "0.00";

  const report = {
    configuration: {
      target: url,
      durationSeconds: opts.duration,
      concurrency: opts.concurrency,
    },
    results: {
      totalRequests,
      errors,
      errorRate: `${errorRate}%`,
      throughput: `${throughput.toFixed(1)} req/s`,
    },
    latency: {
      avg: `${avg}ms`,
      p50: `${p50}ms`,
      p95: `${p95}ms`,
      p99: `${p99}ms`,
      min: `${latencies[0] || 0}ms`,
      max: `${latencies[latencies.length - 1] || 0}ms`,
    },
    actualDuration: `${actualDuration.toFixed(1)}s`,
  };

  console.log(`\nResults:`);
  console.log(`  Total Requests:  ${report.results.totalRequests}`);
  console.log(`  Errors:          ${report.results.errors} (${report.results.errorRate})`);
  console.log(`  Throughput:      ${report.results.throughput}`);
  console.log(`  Avg Latency:     ${report.latency.avg}`);
  console.log(`  P50 Latency:     ${report.latency.p50}`);
  console.log(`  P95 Latency:     ${report.latency.p95}`);
  console.log(`  P99 Latency:     ${report.latency.p99}`);
  console.log(`  Min Latency:     ${report.latency.min}`);
  console.log(`  Max Latency:     ${report.latency.max}`);
  console.log(`  Duration:        ${report.actualDuration}`);

  return report;
}

const opts = parseArgs();
runLoadTest(opts).catch(console.error);
