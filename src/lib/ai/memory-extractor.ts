import type { ConversationMessage } from "@/types/conversation";
import type { ConversationContext } from "./context";
import type {
  MemoryExtractionCandidate,
  MemoryType,
  MemorySource,
} from "./memory-types";
import {
  containsPromptInjection,
  containsSystemInstruction,
  containsSensitiveCredentials,
  sanitizeMemoryContent,
  MAX_MEMORIES_PER_EXTRACTION,
} from "./memory-types";

// ─── Memory Extraction Engine ──────────────────────────────────────────────────
//
// Identifies useful information from conversations and extracts it as memory.
//
// Candidate Identification:
// 1. Explicit facts stated by user
// 2. Unresolved issues mentioned
// 3. Agreed actions or plans
// 4. Preferences stated
// 5. Recurring topics
// 6. Conflict causes
// 7. Resolution outcomes
//
// Deduplication: Checks against existing memory.
// Validation: Checks useful, relevant, safe, trustworthy.
// Expiration: Sets appropriate expiration for short-term memory.
// ──────────────────────────────────────────────────────────────────────────────

export interface MemoryExtractionInput {
  messages: ConversationMessage[];
  context: ConversationContext;
  userId: string;
  relationshipId?: string;
}

export interface MemoryExtractionOutput {
  candidates: MemoryExtractionCandidate[];
  stats: {
    totalExtracted: number;
    byType: Record<MemoryType, number>;
    bySource: Record<MemorySource, number>;
  };
}

// ─── Main Extraction Function ─────────────────────────────────────────────────

export function extractMemoryCandidates(
  input: MemoryExtractionInput
): MemoryExtractionOutput {
  const candidates: MemoryExtractionCandidate[] = [];

  // Extract from each message
  for (const message of input.messages) {
    const messageCandidates = extractFromMessage(
      message,
      input.context,
      input.relationshipId
    );
    candidates.push(...messageCandidates);
  }

  // Extract from conversation patterns (only if there are messages with meaningful content)
  const hasMeaningfulContent = input.messages.some(
    (m) => m.text.trim().length > 0 && /\w/.test(m.text)
  );

  if (hasMeaningfulContent) {
    const patternCandidates = extractFromPatterns(
      input.messages,
      input.relationshipId
    );
    candidates.push(...patternCandidates);

    // Extract from context (only if there are meaningful messages)
    const contextCandidates = extractFromContext(
      input.context,
      input.relationshipId
    );
    candidates.push(...contextCandidates);
  }

  // Sanitize all candidate content
  const sanitizedCandidates = candidates.map((c) => ({
    ...c,
    content: sanitizeMemoryContent(c.content),
  }));

  // Deduplicate and validate
  const validatedCandidates = deduplicateAndValidate(sanitizedCandidates);

  // Enforce extraction rate limit
  const limitedCandidates = validatedCandidates.slice(0, MAX_MEMORIES_PER_EXTRACTION);

  // Build stats
  const stats = buildStats(limitedCandidates);

  return {
    candidates: limitedCandidates,
    stats,
  };
}

// ─── Extract From Message ─────────────────────────────────────────────────────

function extractFromMessage(
  message: ConversationMessage,
  context: ConversationContext,
  relationshipId?: string
): MemoryExtractionCandidate[] {
  const candidates: MemoryExtractionCandidate[] = [];
  const text = message.text.toLowerCase();

  // Check for explicit facts
  if (isExplicitFact(message.text)) {
    candidates.push({
      type: "conversation_topic",
      content: message.text,
      source: "explicit_user",
      confidence: 0.9,
      relationshipId,
    });
  }

  // Check for unresolved issues
  if (isUnresolvedIssue(text)) {
    candidates.push({
      type: "unresolved_issue",
      content: message.text,
      source: "explicit_user",
      confidence: 0.85,
      relationshipId,
      expiresAt: getExpirationDate(30),
    });
  }

  // Check for agreed actions
  if (isAgreedAction(text)) {
    candidates.push({
      type: "agreed_action",
      content: message.text,
      source: "explicit_user",
      confidence: 0.9,
      relationshipId,
      expiresAt: getExpirationDate(14),
    });
  }

  // Check for communication preferences
  if (isCommunicationPreference(text)) {
    candidates.push({
      type: "communication_preference",
      content: message.text,
      source: "explicit_user",
      confidence: 0.85,
      relationshipId,
    });
  }

  // Check for boundaries
  if (isBoundary(text)) {
    candidates.push({
      type: "boundary_established",
      content: message.text,
      source: "explicit_user",
      confidence: 0.95,
      relationshipId,
    });
  }

  return candidates;
}

// ─── Extract From Patterns ────────────────────────────────────────────────────

function extractFromPatterns(
  messages: ConversationMessage[],
  relationshipId?: string
): MemoryExtractionCandidate[] {
  const candidates: MemoryExtractionCandidate[] = [];

  // Find recurring topics
  const topicCounts = countTopics(messages);
  const recurringTopics = Object.entries(topicCounts).filter(
    ([, count]) => count >= 2
  );

  for (const [topic, count] of recurringTopics) {
    candidates.push({
      type: "recurring_pattern",
      content: `Recurring topic: ${topic} (${count} mentions)`,
      source: "conversation_observed",
      confidence: Math.min(0.95, 0.7 + count * 0.1),
      relationshipId,
    });
  }

  // Find recent context
  const recentMessages = messages.slice(-5);
  const recentTopics = extractTopics(recentMessages);

  if (recentTopics.length > 0) {
    candidates.push({
      type: "recent_context",
      content: `Recent topics: ${recentTopics.join(", ")}`,
      source: "conversation_observed",
      confidence: 0.85,
      relationshipId,
      expiresAt: getExpirationDate(7),
    });
  }

  return candidates;
}

// ─── Extract From Context ─────────────────────────────────────────────────────

function extractFromContext(
  context: ConversationContext,
  relationshipId?: string
): MemoryExtractionCandidate[] {
  const candidates: MemoryExtractionCandidate[] = [];

  // Extract relationship type
  if (context.conversationType) {
    candidates.push({
      type: "relationship_preference",
      content: `Conversation type: ${context.conversationType}`,
      source: "conversation_observed",
      confidence: 0.85,
      relationshipId,
    });
  }

  // Extract goal
  if (context.urgency && context.urgency !== "normal") {
    candidates.push({
      type: "recent_context",
      content: `Urgency level: ${context.urgency}`,
      source: "conversation_observed",
      confidence: 0.85,
      relationshipId,
      expiresAt: getExpirationDate(1),
    });
  }

  return candidates;
}

// ─── Deduplicate and Validate ─────────────────────────────────────────────────

function deduplicateAndValidate(
  candidates: MemoryExtractionCandidate[]
): MemoryExtractionCandidate[] {
  const seen = new Map<string, MemoryExtractionCandidate>();

  for (const candidate of candidates) {
    // Create a key for deduplication
    const key = `${candidate.type}:${candidate.content.substring(0, 100)}`;

    // Check if we've seen this before
    const existing = seen.get(key);
    if (existing) {
      // Keep the one with higher confidence
      if (candidate.confidence > existing.confidence) {
        seen.set(key, candidate);
      }
    } else {
      // Validate the candidate
      if (isValidCandidate(candidate)) {
        seen.set(key, candidate);
      }
    }
  }

  return Array.from(seen.values());
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

function isValidCandidate(candidate: MemoryExtractionCandidate): boolean {
  // Check if useful
  if (!isUseful(candidate.content)) return false;

  // Check if relevant
  if (!isRelevant(candidate.content)) return false;

  // Check if safe
  if (!isSafe(candidate.content)) return false;

  // Check if trustworthy
  if (!isTrustworthy(candidate.source, candidate.confidence)) return false;

  return true;
}

function isUseful(content: string): boolean {
  // Content must be meaningful
  if (content.length < 10) return false;
  if (content.length > 500) return false;

  // Must contain actual information
  const words = content.split(/\s+/);
  if (words.length < 3) return false;

  return true;
}

function isRelevant(content: string): boolean {
  // Content should be conversation-related
  const irrelevantPatterns = [
    /^(hi|hello|hey|bye|ok|okay|yes|no|thanks)$/i,
    /^(lol|haha|omg|wow)$/i,
    /^[^\w\s]+$/, // Only punctuation/emojis
  ];

  return !irrelevantPatterns.some((pattern) => pattern.test(content.trim()));
}

function isSafe(content: string): boolean {
  // Check for sensitive credentials (passwords, API keys, tokens, etc.)
  if (containsSensitiveCredentials(content)) return false;

  // Check for prompt injection attempts
  if (containsPromptInjection(content)) return false;

  // Check for system instruction attempts embedded in messages
  if (containsSystemInstruction(content)) return false;

  // Check for additional sensitive content
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /credit.?card/i,
    /social.?security/i,
    /ssn/i,
    /bank.?account/i,
    /pin.?number/i,
    /api[_\s]?key/i,
    /access[_\s]?token/i,
    /private[_\s]?key/i,
  ];

  return !sensitivePatterns.some((pattern) => pattern.test(content));
}

function isTrustworthy(source: MemorySource, confidence: number): boolean {
  // Explicit user statements are most trustworthy
  if (source === "explicit_user") return confidence >= 0.7;

  // User confirmed is also trustworthy
  if (source === "user_confirmed") return confidence >= 0.7;

  // Conversation observed requires higher confidence
  if (source === "conversation_observed") return confidence >= 0.8;

  // AI inference requires highest confidence
  if (source === "ai_inference") return confidence >= 0.9;

  return false;
}

// ─── Pattern Detection Helpers ────────────────────────────────────────────────

function isExplicitFact(text: string): boolean {
  const patterns = [
    /i (am|was|have|had|like|love|hate|prefer|want|need|do|don't|can't)/i,
    /my (name|job|work|school|family|friend|partner|favorite|hobby)/i,
    /we (are|were|have|had|did|do)/i,
    /the (project|deadline|meeting|event|date|time)/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function isUnresolvedIssue(text: string): boolean {
  const patterns = [
    /still (need|have|want|waiting|hoping|thinking)/i,
    /haven't (decided|finished|started|resolved)/i,
    /need to (talk|discuss|figure out|decide|resolve)/i,
    /we (need|should|must) (to )?(talk|discuss|figure|decide|resolve)/i,
    /unclear|unsure|confused|uncertain/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function isAgreedAction(text: string): boolean {
  const patterns = [
    /i'?ll (do|make|call|send|finish|complete|fix)/i,
    /we'?ll (do|make|call|send|finish|complete|fix)/i,
    /let'?s (do|make|call|send|finish|complete|fix|meet)/i,
    /i (promise|commit|agree) to/i,
    /i'?m (going to|planning to|will)/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function isCommunicationPreference(text: string): boolean {
  const patterns = [
    /i (prefer|like|want|need) (to |you )?(text|call|talk|message)/i,
    /i'?m (better|more comfortable) (at|with)/i,
    /don'?t (text|call|message|contact)/i,
    /please (text|call|message|contact)/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function isBoundary(text: string): boolean {
  const patterns = [
    /i'?m not (comfortable|okay|fine) with/i,
    /please (don'?t|stop|no)/i,
    /i (need|want) (you to )?(stop|not|never)/i,
    /that'?s (not okay|not acceptable|crossing a line)/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

// ─── Topic Extraction ─────────────────────────────────────────────────────────

function countTopics(messages: ConversationMessage[]): Record<string, number> {
  const topicCounts: Record<string, number> = {};

  for (const message of messages) {
    const topics = extractTopics([message]);
    for (const topic of topics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  return topicCounts;
}

function extractTopics(messages: ConversationMessage[]): string[] {
  const topics: string[] = [];
  const topicKeywords: Record<string, string[]> = {
    work: ["work", "job", "project", "deadline", "meeting", "boss", "colleague"],
    relationship: ["relationship", "partner", "boyfriend", "girlfriend", "date", "love"],
    family: ["family", "mom", "dad", "brother", "sister", "parent", "child"],
    friend: ["friend", "buddy", "pal", "mate", "hangout", "party"],
    health: ["health", "doctor", "sick", "exercise", "gym", "diet"],
    money: ["money", "budget", "savings", "expensive", "cheap", "cost"],
    travel: ["travel", "trip", "vacation", "flight", "hotel", "visit"],
    food: ["food", "restaurant", "cook", "dinner", "lunch", "breakfast"],
  };

  for (const message of messages) {
    const text = message.text.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        if (!topics.includes(topic)) {
          topics.push(topic);
        }
      }
    }
  }

  return topics;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExpirationDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// ─── Stats Builder ────────────────────────────────────────────────────────────

function buildStats(candidates: MemoryExtractionCandidate[]): {
  totalExtracted: number;
  byType: Record<MemoryType, number>;
  bySource: Record<MemorySource, number>;
} {
  const byType = {} as Record<MemoryType, number>;
  const bySource = {} as Record<MemorySource, number>;

  for (const candidate of candidates) {
    byType[candidate.type] = (byType[candidate.type] || 0) + 1;
    bySource[candidate.source] = (bySource[candidate.source] || 0) + 1;
  }

  return {
    totalExtracted: candidates.length,
    byType,
    bySource,
  };
}
