// ─── Memory Types ───────────────────────────────────────────────────────────────
//
// Defines the memory system for NextMsg.
//
// Memory Categories:
// A. Conversation Memory - Short-term information about a conversation
// B. Relationship Context - High-level communication context
// C. Resolution Memory - Useful outcomes from previous difficult conversations
//
// Privacy Principles:
// - User-controlled
// - Minimal
// - Relevant
// - Explainable
// - Deletable
// - Scoped
// - Secure
// ──────────────────────────────────────────────────────────────────────────────

export type MemoryType =
  | "conversation_topic"
  | "unresolved_issue"
  | "agreed_action"
  | "recent_context"
  | "communication_preference"
  | "recurring_pattern"
  | "previous_agreement"
  | "active_issue"
  | "resolution"
  | "conflict_cause"
  | "conflict_resolution"
  | "communication_agreement"
  | "unresolved_followup"
  | "boundary_established"
  | "relationship_preference";

export type MemorySource =
  | "explicit_user"
  | "user_confirmed"
  | "conversation_observed"
  | "ai_inference";

export interface MemoryRecord {
  id: string;
  userId: string;
  relationshipId?: string;
  type: MemoryType;
  content: string;
  source: MemorySource;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isUserConfirmed: boolean;
  isActive: boolean;
}

export interface RelationshipProfile {
  id: string;
  userId: string;
  relationshipType: string;
  communicationPreferences: string[];
  recurringIssues: string[];
  resolvedIssues: string[];
  activeIssues: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolutionRecord {
  id: string;
  userId: string;
  relationshipId?: string;
  conflictCause: string;
  resolution: string;
  communicationPreference?: string;
  unresolvedFollowup?: string;
  boundaryEstablished?: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// ─── Memory Configuration ──────────────────────────────────────────────────────

export interface MemoryConfig {
  enabled: boolean;
  maxMemoriesPerUser: number;
  defaultExpirationDays: number;
  minConfidenceForRetrieval: number;
  maxRetrievalCount: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: true,
  maxMemoriesPerUser: 100,
  defaultExpirationDays: 90,
  minConfidenceForRetrieval: 0.5,
  maxRetrievalCount: 5,
};

// ─── Memory Precedence ────────────────────────────────────────────────────────
//
// 1. Current explicit user instruction
// 2. Current conversation evidence
// 3. Current user-provided facts
// 4. Confirmed historical memory
// 5. Observed historical memory
// 6. AI-inferred historical context
// 7. Defaults
//
// Historical memory must NEVER silently override the current conversation.
// ──────────────────────────────────────────────────────────────────────────────

export const MEMORY_PRECEDENCE: Record<MemorySource, number> = {
  explicit_user: 1,
  user_confirmed: 4,
  conversation_observed: 5,
  ai_inference: 6,
};

// ─── Memory Relevance ─────────────────────────────────────────────────────────

export interface MemoryRelevanceQuery {
  userId: string;
  relationshipId?: string;
  topic?: string;
  situation?: string;
  goal?: string;
  limit?: number;
}

// ─── Conflict Coaching ────────────────────────────────────────────────────────

export type CoachingMode =
  | "understand"
  | "calm_down"
  | "defend"
  | "explain"
  | "reach_agreement"
  | "set_boundary"
  | "apologize"
  | "repair_relationship"
  | "end_respectfully";

export interface ConflictCoachingInput {
  currentConflict: {
    level: number;
    escalation: number;
    trigger: string;
    coreDisagreement: string;
    personalAttacks: boolean;
    misunderstanding: boolean;
  };
  userGoal: CoachingMode;
  relevantMemory: ResolutionRecord[];
  relationshipContext?: RelationshipProfile;
}

export interface ConflictCoachingOutput {
  assessment: string;
  recurringIssue?: string;
  recommendedApproach: string;
  nextSteps: string[];
  thingsToAvoid: string[];
  relevantPastContext?: string;
}

// ─── Memory Extraction ────────────────────────────────────────────────────────

export interface MemoryExtractionCandidate {
  type: MemoryType;
  content: string;
  source: MemorySource;
  confidence: number;
  relationshipId?: string;
  expiresAt?: Date;
}

// ─── Memory Data Classification ──────────────────────────────────────────────
//
// Every memory type is classified for safety:
// - SAFE: Communication-focused, non-sensitive
// - POTENTIALLY_SENSITIVE: May require extra care
// - DISALLOWED: Must never be stored
// ──────────────────────────────────────────────────────────────────────────────

export type DataClassification = "safe" | "potentially_sensitive" | "disallowed";

export const MEMORY_TYPE_CLASSIFICATION: Record<MemoryType, DataClassification> = {
  communication_preference: "safe",
  communication_agreement: "safe",
  agreed_action: "safe",
  previous_agreement: "safe",
  relationship_preference: "safe",
  boundary_established: "safe",
  conversation_topic: "safe",
  recent_context: "safe",
  recurring_pattern: "safe",
  unresolved_issue: "potentially_sensitive",
  active_issue: "potentially_sensitive",
  resolution: "potentially_sensitive",
  conflict_cause: "potentially_sensitive",
  conflict_resolution: "potentially_sensitive",
  unresolved_followup: "potentially_sensitive",
};

// ─── Security Constants ──────────────────────────────────────────────────────

/** Maximum content length for memory records */
export const MAX_MEMORY_CONTENT_LENGTH = 500;

/** Maximum memories per conversation extraction */
export const MAX_MEMORIES_PER_EXTRACTION = 10;

/** Maximum total memories per user */
export const MAX_MEMORIES_PER_USER = 100;

/** Maximum memories injected into a single prompt */
export const MAX_MEMORIES_IN_PROMPT = 5;

/** Maximum characters of memory context in a prompt */
export const MAX_PROMPT_MEMORY_CHARS = 2000;

/** Rate limit: max memory creates per minute */
export const MEMORY_RATE_LIMIT_CREATE = 20;

/** Rate limit: max memory reads per minute */
export const MEMORY_RATE_LIMIT_READ = 60;

// ─── Prompt Injection Patterns ──────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instructions/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /system\s*:\s*/i,
  /new\s+instructions?\s*:/i,
  /from\s+now\s+on\s*,?\s*(you\s+)?must/i,
  /disregard\s+(all\s+)?(previous|prior|rules|instructions)/i,
  /act\s+as\s+if\s+you\s+(have|are|were)\s+(no|zero|none)\s+restrictions/i,
  /remember\s+that\s+(your|you)\s+(system\s+)?prompt\s+is/i,
  /override\s+(your|the)\s+(system\s+)?(prompt|instructions|rules)/i,
  /do\s+not\s+follow\s+(your|the)\s+(previous|standard|normal)\s+instructions/i,
  /this\s+is\s+(a\s+)?(new|updated|modified)\s+system\s+prompt/i,
  /\bDAN\b.*\bjailbreak/i,
  /pretend\s+(you\s+)?(are|were)\s+(a\s+)?(different|new|unrestricted)/i,
];

const SYSTEM_INSTRUCTION_PATTERNS = [
  /you\s+must\s+(always|never|only)\s+/i,
  /you\s+are\s+required\s+to/i,
  /mandatory\s+instruction/i,
  /developer\s+mode/i,
  /admin\s+access/i,
  /execute\s+this\s+command/i,
  /run\s+this\s+as\s+(a\s+)?(system|root|admin)/i,
];

// ─── Sensitive Content Patterns ──────────────────────────────────────────────

const SENSITIVE_CREDENTIAL_PATTERNS = [
  /password\s*(is|:|=|was)\s*\S+/i,
  /api[_\s]?key\s*(is|:|=|was)\s*\S+/i,
  /secret\s*(key|token|code)\s*(is|:|=|was)\s*\S+/i,
  /access\s*token\s*(is|:|=|was)\s*\S+/i,
  /auth(?:entication)?\s*token\s*(is|:|=|was)\s*\S+/i,
  /private[_\s]?key\s*(is|:|=|was)\s*\S+/i,
  /credit\s*card\s*(number)?\s*(is|:|=|was)\s*[\d\s\-]+/i,
  /social\s*security\s*(number)?\s*(is|:|=|was)\s*[\d\-]+/i,
  /\bSSN\s*(is|:|=|was)\s*[\d\-]+/i,
  /bank\s*account\s*(number)?\s*(is|:|=|was)\s*[\d]+/i,
  /pin\s*(number)?\s*(is|:|=|was)\s*[\d]+/i,
  /routing\s*number\s*(is|:|=|was)\s*[\d]+/i,
  /date\s*of\s*birth\s*(is|:|=|was)\s*[\d\/\-]+/i,
  /DOB\s*(is|:|=|was)\s*[\d\/\-]+/i,
];

// ─── Injection Detection ─────────────────────────────────────────────────────

export function containsPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function containsSystemInstruction(text: string): boolean {
  return SYSTEM_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(text));
}

// ─── Sensitive Content Detection ─────────────────────────────────────────────

export function containsSensitiveCredentials(text: string): boolean {
  return SENSITIVE_CREDENTIAL_PATTERNS.some((pattern) => pattern.test(text));
}

// ─── Content Sanitization ────────────────────────────────────────────────────

/**
 * Sanitize memory content for safe storage and prompt injection.
 * Strips control characters, normalizes whitespace, truncates to max length.
 */
export function sanitizeMemoryContent(content: string): string {
  let sanitized = content;

  // Strip null bytes and control characters (except newlines/tabs)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Truncate to max length
  if (sanitized.length > MAX_MEMORY_CONTENT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MEMORY_CONTENT_LENGTH);
  }

  return sanitized;
}

/**
 * Validate that a memory type is allowed.
 */
export function isValidMemoryType(type: string): type is MemoryType {
  const validTypes: string[] = [
    "conversation_topic", "unresolved_issue", "agreed_action",
    "recent_context", "communication_preference", "recurring_pattern",
    "previous_agreement", "active_issue", "resolution", "conflict_cause",
    "conflict_resolution", "communication_agreement", "unresolved_followup",
    "boundary_established", "relationship_preference",
  ];
  return validTypes.includes(type);
}

/**
 * Validate that a memory source is allowed.
 */
export function isValidMemorySource(source: string): source is MemorySource {
  const validSources: string[] = [
    "explicit_user", "user_confirmed", "conversation_observed", "ai_inference",
  ];
  return validSources.includes(source);
}

/**
 * Validate confidence is in valid range.
 */
export function isValidConfidence(confidence: unknown): confidence is number {
  return typeof confidence === "number" && confidence >= 0 && confidence <= 1;
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export function logMemoryOperation(
  operation: string,
  memoryId: string,
  context?: string
): void {
  if (process.env.NEXTMSG_DEBUG_AI !== "true") return;

  const prefix = context ? `[Memory:${context}]` : "[Memory]";
  console.log(`${prefix} ${operation}: ${memoryId}`);
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

export interface AuditEntry {
  timestamp: string;
  userId: string;
  action: string;
  memoryId?: string;
  type?: string;
  source?: string;
  confidence?: number;
}

const auditLog: AuditEntry[] = [];

export function logAudit(entry: Omit<AuditEntry, "timestamp">): void {
  auditLog.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 1000 entries in memory
  if (auditLog.length > 1000) {
    auditLog.splice(0, auditLog.length - 1000);
  }

  if (process.env.NEXTMSG_DEBUG_AI === "true") {
    // Log safe metadata only: never log content
    console.log("[Memory Audit]", {
      action: entry.action,
      memoryId: entry.memoryId,
      type: entry.type,
      source: entry.source,
    });
  }
}

export function getAuditLog(): readonly AuditEntry[] {
  return auditLog;
}
