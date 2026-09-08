/**
 * API Response Utilities
 *
 * Consistent error responses across all API routes.
 * Never exposes internal details, stack traces, or credentials.
 */

import { NextResponse } from "next/server";

export interface APIError {
  code: string;
  message: string;
  requestId?: string;
}

export interface APISuccessResponse<T = unknown> {
  data: T;
  requestId?: string;
}

export function apiError(
  code: string,
  message: string,
  status: number,
  requestId?: string
): NextResponse {
  const body: APIError = { code, message };
  if (requestId) body.requestId = requestId;

  return NextResponse.json({ error: body }, { status });
}

export function apiBadRequest(message: string, requestId?: string): NextResponse {
  return apiError("BAD_REQUEST", message, 400, requestId);
}

export function apiUnauthorized(requestId?: string): NextResponse {
  return apiError("UNAUTHORIZED", "Authentication required", 401, requestId);
}

export function apiForbidden(message: string = "Access denied", requestId?: string): NextResponse {
  return apiError("FORBIDDEN", message, 403, requestId);
}

export function apiNotFound(resource: string, requestId?: string): NextResponse {
  return apiError("NOT_FOUND", `${resource} not found`, 404, requestId);
}

export function apiRateLimited(requestId?: string): NextResponse {
  return apiError("RATE_LIMITED", "Rate limit exceeded. Please try again later.", 429, requestId);
}

export function apiInternalError(requestId?: string): NextResponse {
  return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500, requestId);
}

export function apiPayloadTooLarge(requestId?: string): NextResponse {
  return apiError("PAYLOAD_TOO_LARGE", "Request payload is too large", 413, requestId);
}

export function apiSuccess<T>(data: T, requestId?: string): NextResponse {
  const body: APISuccessResponse<T> = { data };
  if (requestId) body.requestId = requestId;
  return NextResponse.json(body);
}

// ─── Payload Limits ──────────────────────────────────────────────────────────

export const PAYLOAD_LIMITS = {
  draft: 2000,
  messages: 200,
  conversation: 500,
  message: 5000,
  workspaceTitle: 200,
  participantName: 100,
  feedback: 2000,
  memoryContent: 2000,
  preferenceValue: 500,
} as const;

export function checkPayloadSize(
  data: unknown,
  limit: number,
  fieldName: string
): string | null {
  if (typeof data === "string" && data.length > limit) {
    return `${fieldName} exceeds maximum length of ${limit}`;
  }
  if (Array.isArray(data) && data.length > limit) {
    return `${fieldName} exceeds maximum count of ${limit}`;
  }
  return null;
}

// ─── Input Sanitization ──────────────────────────────────────────────────────

export function sanitizeString(input: string, maxLength: number = 10000): string {
  return input.slice(0, maxLength).trim();
}

export function isPromptInjection(text: string): boolean {
  const patterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+a/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
    /###\s*system/i,
    /override\s+instructions/i,
    /disregard\s+(all\s+)?prior/i,
  ];
  return patterns.some((p) => p.test(text));
}
