// ─── Draft Analysis Types ────────────────────────────────────────────────────
//
// Defines the complete DraftAnalysis interface and related types for
// analyzing a user's draft message before they send it.
//
// Architecture:
//   CURRENT CONVERSATION + USER DRAFT
//   → CONVERSATION STATE
//   → DRAFT ANALYSIS
//   → COMMUNICATION IMPACT
//   → COACHING
//   → OPTIONAL "IMPROVE MESSAGE"
//   → QUALITY VALIDATION
//   → FINAL RESPONSE
// ──────────────────────────────────────────────────────────────────────────────

import type {
  CommunicationStrategy,
  UserIntentType,
} from "./intelligence";

// ─── Draft Intent ─────────────────────────────────────────────────────────────

export type DraftIntent =
  | "explain"
  | "apologize"
  | "persuade"
  | "defend"
  | "clarify"
  | "request"
  | "decline"
  | "flirt"
  | "continue_conversation"
  | "de_escalate"
  | "set_boundary"
  | "negotiate"
  | "ask_for_help"
  | "comfort"
  | "reassure"
  | "show_interest"
  | "make_them_laugh"
  | "reject"
  | "accept"
  | "confirm"
  | "inform"
  | "unknown";

// ─── Draft Tone ───────────────────────────────────────────────────────────────

export type DraftToneLabel =
  | "calm"
  | "friendly"
  | "professional"
  | "warm"
  | "direct"
  | "defensive"
  | "angry"
  | "sarcastic"
  | "passive_aggressive"
  | "playful"
  | "flirty"
  | "empathetic"
  | "formal"
  | "casual"
  | "urgent"
  | "anxious"
  | "confident"
  | "uncertain"
  | "neutral"
  | "unknown";

export interface DraftTone {
  primary: DraftToneLabel;
  secondary: DraftToneLabel;
  intensity: number; // 0.0 – 1.0
}

// ─── Perceived Impact ─────────────────────────────────────────────────────────

export type PerceivedImpactLabel =
  | "cooperative"
  | "defensive"
  | "confrontational"
  | "supportive"
  | "dismissive"
  | "confident"
  | "uncertain"
  | "apologetic"
  | "pressuring"
  | "professional"
  | "playful"
  | "warm"
  | "cold"
  | "neutral"
  | "unknown";

// ─── Draft Issue ──────────────────────────────────────────────────────────────

export type DraftIssueCategory =
  | "tone"
  | "clarity"
  | "escalation"
  | "pressure"
  | "style"
  | "language"
  | "factual"
  | "goal_alignment"
  | "context_fit"
  | "misunderstanding";

export type DraftIssueSeverity = "low" | "medium" | "high";

export interface DraftIssue {
  category: DraftIssueCategory;
  severity: DraftIssueSeverity;
  explanation: string;
  suggestion?: string;
}

// ─── Draft Strength ───────────────────────────────────────────────────────────

export type DraftStrengthCategory =
  | "clarity"
  | "accountability"
  | "conciseness"
  | "natural_style"
  | "appropriate_tone"
  | "good_context_fit"
  | "clear_boundary"
  | "persuasive_reasoning"
  | "empathy"
  | "humor"
  | "directness"
  | "style_consistency"
  | "language_consistency";

export interface DraftStrength {
  category: DraftStrengthCategory;
  explanation: string;
}

// ─── Draft Analysis ───────────────────────────────────────────────────────────

export interface DraftAnalysis {
  // ── What the draft is trying to do ──
  intent: DraftIntent;

  // ── What strategy the draft uses ──
  draftStrategy: CommunicationStrategy;

  // ── How the draft sounds ──
  tone: DraftTone;

  // ── How it may come across ──
  perceivedImpact: PerceivedImpactLabel;
  perceivedImpactExplanation: string;

  // ── Scores (0.0 – 1.0) ──
  goalAlignment: number;
  clarity: number;
  misunderstandingRisk: number;
  escalationRisk: number;
  pressureRisk: number;
  styleConsistency: number;
  languageConsistency: number;
  factualIntegrity: number;

  // ── What works ──
  strengths: DraftStrength[];

  // ── What could go wrong ──
  issues: DraftIssue[];

  // ── Recommended approach ──
  recommendedApproach: string;

  // ── Concise coaching ──
  coaching: string;

  // ── Confidence of the analysis ──
  analysisConfidence: number;
}

// ─── Draft Analysis Input ─────────────────────────────────────────────────────

export interface DraftAnalysisInput {
  /** The user's draft message */
  draft: string;

  /** Current conversation messages */
  messages: Array<{ sender: "me" | "them" | "unknown"; text: string }>;

  /** The user's stated goal (optional override) */
  goal?: string;

  /** Platform (optional) */
  platform?: string;

  /** User facts for factual integrity check */
  userFacts?: string[];
}

// ─── Draft Analysis Result ────────────────────────────────────────────────────

export interface DraftAnalysisResult {
  analysis: DraftAnalysis;
}

// ─── Improvement Mode ─────────────────────────────────────────────────────────

export type ImprovementMode =
  | "keep_meaning_improve_clarity"
  | "more_professional"
  | "more_diplomatic"
  | "more_assertive"
  | "more_empathetic"
  | "more_concise"
  | "more_persuasive"
  | "more_natural"
  | "more_playful"
  | "more_flirty";

// ─── Draft Improvement Input ──────────────────────────────────────────────────

export interface DraftImprovementInput extends DraftAnalysisInput {
  /** How to improve the message */
  mode: ImprovementMode;

  /** The existing analysis (so we don't re-analyze) */
  analysis: DraftAnalysis;
}

// ─── Draft Improvement Result ─────────────────────────────────────────────────

export interface DraftImprovementResult {
  /** The original draft unchanged */
  originalDraft: string;

  /** Improved candidates */
  candidates: Array<{ text: string; strategy: string }>;
}

// ─── Deterministic Check Results ──────────────────────────────────────────────

export interface DeterministicDraftChecks {
  wordCount: number;
  sentenceCount: number;
  emojiCount: number;
  exclamationCount: number;
  questionCount: number;
  hasExcessivePunctuation: boolean;
  hasAllCaps: boolean;
  hasCliché: boolean;
  clichéMatches: string[];
  isVeryShort: boolean;
  isVeryLong: boolean;
  hasAggressiveLanguage: boolean;
  aggressiveMatches: string[];
  hasPressureLanguage: boolean;
  pressureMatches: string[];
  hasBoundaryLanguage: boolean;
  hasApologyLanguage: boolean;
  hasProfessionalLanguage: boolean;
  hasCasualLanguage: boolean;
  hasFlirtyLanguage: boolean;
  hasPlayfulLanguage: boolean;
  hasEmpathyLanguage: boolean;
  hasDefensiveLanguage: boolean;
  hasSarcasmIndicators: boolean;
  hasPassiveAggressiveIndicators: boolean;
  hasPersonalAttack: boolean;
  personalAttackMatches: string[];
}
