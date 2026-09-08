/**
 * Request Context
 *
 * Provides request-scoped context (requestId, userId) that flows through
 * the request lifecycle without threading through every function call.
 *
 * Uses AsyncLocalStorage for Node.js 19+ / Next.js App Router.
 */

import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  requestId: string;
  userId?: string;
  operation?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getRequestId(): string {
  return getRequestContext()?.requestId || "unknown";
}

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `req_${timestamp}_${random}`;
}
