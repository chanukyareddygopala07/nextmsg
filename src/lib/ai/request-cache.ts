// ─── Request-Scoped Intelligence Cache ──────────────────────────────────────
//
// Caches analyzeConversationIntelligence results by message content hash.
// Prevents redundant AI calls when the same conversation is analyzed
// multiple times within a single request (e.g., draft/analyze then draft/impact).
//
// Scope: Per-request only. No cross-request caching.
// Safety: Hash-based keys ensure no cross-user/workspace pollution.
// ──────────────────────────────────────────────────────────────────────────────

import type { ConversationMessage } from "@/types/conversation";
import type { ConversationIntelligence } from "./intelligence";

// Simple hash for cache keys (no crypto needed for request-scoped cache)
function hashMessages(messages: ConversationMessage[]): string {
  const normalized = messages.map((m) => `${m.sender}:${m.text}`).join("|");
  // djb2 hash
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}

// Request-scoped cache (AsyncLocalStorage or simple map with request ID)
// For simplicity, use a WeakRef-based approach: each request gets a cache instance
const requestCaches = new Map<string, Map<string, ConversationIntelligence>>();
let requestCounter = 0;

export function createRequestCache(): string {
  const id = `req_${++requestCounter}_${Date.now()}`;
  requestCaches.set(id, new Map());
  return id;
}

export function destroyRequestCache(requestId: string): void {
  requestCaches.delete(requestId);
}

export function getCachedIntelligence(
  requestId: string,
  messages: ConversationMessage[]
): ConversationIntelligence | null {
  const cache = requestCaches.get(requestId);
  if (!cache) return null;
  const key = hashMessages(messages);
  return cache.get(key) ?? null;
}

export function setCachedIntelligence(
  requestId: string,
  messages: ConversationMessage[],
  intelligence: ConversationIntelligence
): void {
  const cache = requestCaches.get(requestId);
  if (!cache) return;
  const key = hashMessages(messages);
  cache.set(key, intelligence);
}
