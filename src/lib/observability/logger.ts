/**
 * Structured Logger
 *
 * Production-safe structured logging. Never logs raw conversation content,
 * API keys, prompts, or model responses by default.
 *
 * Usage:
 *   import { logger } from "@/lib/observability/logger";
 *   logger.info({ event: "ai_request_completed", operation: "draft_analysis", durationMs: 1200 });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  event?: string;
  requestId?: string;
  operation?: string;
  durationMs?: number;
  success?: boolean;
  errorCode?: string;
  retryCount?: number;
  message?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.NEXTMSG_LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
  return (env as LogLevel) || "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function emit(entry: Omit<LogEntry, "level" | "timestamp"> & { level: LogLevel }): void {
  if (!shouldLog(entry.level)) return;

  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  const formatted = formatEntry(fullEntry);

  switch (entry.level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug(entry: Omit<LogEntry, "level" | "timestamp">): void {
    emit({ ...entry, level: "debug" });
  },

  info(entry: Omit<LogEntry, "level" | "timestamp">): void {
    emit({ ...entry, level: "info" });
  },

  warn(entry: Omit<LogEntry, "level" | "timestamp">): void {
    emit({ ...entry, level: "warn" });
  },

  error(entry: Omit<LogEntry, "level" | "timestamp">): void {
    emit({ ...entry, level: "error" });
  },
};

// ─── Specialized Loggers ────────────────────────────────────────────────────

export function logAIRequest(params: {
  requestId?: string;
  operation: string;
  model?: string;
  durationMs: number;
  success: boolean;
  retryCount?: number;
  errorCode?: string;
  tokenUsage?: { input: number; output: number };
}): void {
  logger.info({
    event: "ai_request_completed",
    operation: params.operation,
    requestId: params.requestId,
    model: params.model,
    durationMs: params.durationMs,
    success: params.success,
    retryCount: params.retryCount,
    errorCode: params.errorCode,
    tokenUsage: params.tokenUsage,
  });
}

export function logAIError(params: {
  requestId?: string;
  operation: string;
  errorCode: string;
  durationMs?: number;
  retryCount?: number;
  message?: string;
}): void {
  logger.error({
    event: "ai_request_error",
    operation: params.operation,
    requestId: params.requestId,
    errorCode: params.errorCode,
    durationMs: params.durationMs,
    retryCount: params.retryCount,
    message: params.message,
  });
}

export function logAPIRequest(params: {
  requestId: string;
  method: string;
  path: string;
  durationMs: number;
  statusCode: number;
  userId?: string;
}): void {
  logger.info({
    event: "api_request_completed",
    ...params,
  });
}

export function logAPIError(params: {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  errorCode: string;
  message?: string;
}): void {
  logger.error({
    event: "api_request_error",
    ...params,
  });
}

export function logDatabaseQuery(params: {
  requestId?: string;
  operation: string;
  durationMs: number;
  success: boolean;
  errorCode?: string;
}): void {
  logger.debug({
    event: "database_query",
    ...params,
  });
}

export function logSecurityEvent(params: {
  requestId?: string;
  event: string;
  path?: string;
  message: string;
}): void {
  logger.warn({
    event: params.event,
    requestId: params.requestId,
    path: params.path,
    message: params.message,
  });
}

/**
 * Mode observability events.
 * NEVER include raw conversation messages or private content.
 */
export type ModeObservabilityEvent =
  | "mode_detected"
  | "mode_selected"
  | "mode_overridden"
  | "mode_recommendation_shown";

export function logModeEvent(params: {
  event: ModeObservabilityEvent;
  mode?: string;
  previousMode?: string;
  detectedMode?: string;
  selectedMode?: string;
  confidence?: number;
  source?: string;
  reason?: string;
  requestId?: string;
}): void {
  const { event, ...safeMeta } = params;
  logger.info({
    event,
    ...safeMeta,
  });
}
