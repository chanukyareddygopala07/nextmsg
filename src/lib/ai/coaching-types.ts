// ─── Conversation Coaching Types ─────────────────────────────────────────────
//
// Defines the complete ConversationCoachingResult interface and related types
// for helping users understand what to do next in a conversation.
//
// Coaching Pipeline:
//   CONVERSATION STATE + CONFLICT INTELLIGENCE + SITUATION RECOVERY
//   → COACHING ENGINE (deterministic rules)
//   → CONVERSATION COACHING RESULT
//   → UI DISPLAY
//
// Core Principle:
//   UNDERSTAND → ADVISE → EXPLAIN → OPTIONALLY RESPOND
//   Never fabricate excuses, facts, deadlines, or recommendations.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  CommunicationStrategy,
  SituationType,
  UserIntentType,
} from "./intelligence";

// ─── Next Move ───────────────────────────────────────────────────────────────

export type NextMoveAction =
  | "respond"
  | "wait"
  | "clarify"
  | "de_escalate"
  | "apologize"
  | "set_boundary"
  | "ask_question"
  | "change_topic"
  | "end_conversation"
  | "take_break"
  | "follow_up"
  | "reconnect"
  | "comfort"
  | "reassure"
  | "negotiate"
  | "persuade"
  | "explain"
  | "defend"
  | "acknowledge"
  | "agree"
  | "decline"
  | "accept"
  | "confirm"
  | "inform";

export interface NextMove {
  action: NextMoveAction;
  description: string;
  strategy: CommunicationStrategy;
  example?: string;
}

// ─── Timing ──────────────────────────────────────────────────────────────────

export type TimingWhen =
  | "immediately"
  | "within_minutes"
  | "within_hours"
  | "within_day"
  | "wait_for_response"
  | "wait_for_right_moment"
  | "no_response_needed";

export interface TimingGuidance {
  when: TimingWhen;
  urgency: number; // 0.0 – 1.0
  explanation: string;
}

// ─── Response Guidance ───────────────────────────────────────────────────────

export interface ResponseGuidance {
  tone: string;
  length: "short" | "medium" | "long";
  structure: string[];
  keyPoints: string[];
  example?: string;
}

// ─── Coaching Priority ───────────────────────────────────────────────────────

export type CoachingPriority = "urgent" | "high" | "medium" | "low";

// ─── Context Summary ─────────────────────────────────────────────────────────

export interface ContextSummary {
  relationship: string;
  situation: string;
  conflictLevel: string;
  otherPersonEmotion: string;
  conversationHealth: string;
}

// ─── Coaching Input ──────────────────────────────────────────────────────────

export interface CoachingInput {
  /** Whether a draft message is being evaluated (optional) */
  draft?: string;

  /** User facts for context */
  userFacts?: string[];
}

// ─── Conversation Coaching Result ────────────────────────────────────────────

export interface ConversationCoachingResult {
  /** The recommended next move */
  nextMove: NextMove;

  /** When to act */
  timing: TimingGuidance;

  /** How to respond (if responding) */
  responseGuidance: ResponseGuidance;

  /** What to avoid */
  avoid: string[];

  /** Confidence in the coaching (0.0 – 1.0) */
  confidence: number;

  /** Human-readable reasoning */
  reasoning: string;

  /** Priority of this coaching */
  priority: CoachingPriority;

  /** Summary of the current context */
  contextSummary: ContextSummary;

  /** Suggested follow-up actions */
  followUpSuggestions: string[];

  /** Whether a response is needed at all */
  responseNeeded: boolean;
}

// ─── Deterministic Signals ───────────────────────────────────────────────────

export interface CoachingSignals {
  /** How urgent is the situation (0-1) */
  urgencyScore: number;

  /** How much conflict is present (0-1) */
  conflictScore: number;

  /** How much the other person is engaged (0-1) */
  engagementScore: number;

  /** How much time has passed (inferred from messages) */
  recencyScore: number;

  /** Whether the other person asked a direct question */
  hasDirectQuestion: boolean;

  /** Whether there's an unresolved issue */
  hasUnresolvedIssue: boolean;

  /** Whether the user owes a response */
  owesResponse: boolean;

  /** Whether a deadline or commitment exists */
  hasDeadline: boolean;
}
