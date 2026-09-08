// ─── Pre-Send Quality Gate Types ────────────────────────────────────────────
//
// Defines the complete PreSendGateResult interface and related types for
// the final review before a user sends a message.
//
// Gate Pipeline:
//   DRAFT + CONVERSATION HISTORY + STATE + OPTIONAL EXISTING ANALYSIS
//   → 18 DETERMINISTIC CHECKS
//   → SEVERITY-AWARE DECISION LOGIC
//   → READY | REVIEW | HIGH_RISK
//   → OPTIONAL AUTO-IMPROVEMENT (reuses existing improvement pipeline)
//
// Design Principles:
//   - Gate is NOT a niceness filter
//   - Assertiveness, disagreement, flirting, boundaries, persuasion are legitimate
//   - HIGH_RISK ONLY for genuine semantic, factual, deception, safety, coercion,
//     or severe communication-risk failures
//   - Emotional discomfort NEVER triggers HIGH_RISK
// ──────────────────────────────────────────────────────────────────────────────

import type { DraftAnalysis } from "./draft-types";
import type { CommunicationImpactPrediction } from "./impact-types";
import type { ConversationCoachingResult } from "./coaching-types";
import type { ConversationState } from "./conversation-state";

// ─── Check Dimensions ────────────────────────────────────────────────────────

export type CheckDimension =
  | "semantic_preservation"
  | "factual_integrity"
  | "goal_alignment"
  | "context_fit"
  | "tone_fit"
  | "communication_impact"
  | "escalation_risk"
  | "defensiveness_risk"
  | "pressure_risk"
  | "misunderstanding_risk"
  | "boundary_integrity"
  | "position_integrity"
  | "language_consistency"
  | "style_consistency"
  | "safety"
  | "deception_fabrication"
  | "contradiction"
  | "clarity";

// ─── Decision ────────────────────────────────────────────────────────────────

export type GateDecision = "READY" | "REVIEW" | "HIGH_RISK";

// ─── Risk Severity ──────────────────────────────────────────────────────────

export type RiskSeverity = "low" | "medium" | "high" | "critical";

// ─── Critical Dimensions ────────────────────────────────────────────────────
// These dimensions have veto power — failure here overrides aggregate scores.

export const CRITICAL_DIMENSIONS: CheckDimension[] = [
  "safety",
  "factual_integrity",
  "semantic_preservation",
  "deception_fabrication",
];

// ─── Dimension Result ───────────────────────────────────────────────────────

export interface DimensionResult {
  dimension: CheckDimension;
  /** 0.0–1.0, higher is better */
  score: number;
  passed: boolean;
  issues: string[];
  explanation: string;
  isCritical: boolean;
}

// ─── Gate Risk ──────────────────────────────────────────────────────────────

export interface GateRisk {
  dimension: CheckDimension;
  severity: RiskSeverity;
  description: string;
  explanation: string;
  recommendation: string;
}

// ─── Gate Strength ─────────────────────────────────────────────────────────

export interface GateStrength {
  dimension: CheckDimension;
  description: string;
}

// ─── Gate Recommendation ───────────────────────────────────────────────────

export interface GateRecommendation {
  type: "must_fix" | "should_fix" | "consider";
  dimension: CheckDimension;
  description: string;
  suggestion: string;
}

// ─── Pre-Send Gate Result ──────────────────────────────────────────────────

export interface PreSendGateResult {
  decision: GateDecision;
  confidenceScore: number;
  dimensionScores: Record<CheckDimension, DimensionResult>;
  risks: GateRisk[];
  strengths: GateStrength[];
  recommendations: GateRecommendation[];
  summary: string;
  explanation: string;
  canAutoImprove: boolean;
}

// ─── Pre-Send Gate Input ───────────────────────────────────────────────────

export interface PreSendGateInput {
  /** The final draft to evaluate */
  draft: string;
  /** The original draft before any modifications (tone/improve) */
  originalDraft?: string;
  /** Current conversation messages */
  messages: Array<{ sender: "me" | "them" | "unknown"; text: string }>;
  /** User's stated goal */
  goal?: string;
  /** Platform */
  platform?: string;
  /** User facts for preservation */
  userFacts?: string[];
  /** Existing draft analysis (to avoid re-analyzing) */
  draftAnalysis?: DraftAnalysis;
  /** Existing impact prediction (to avoid re-predicting) */
  impactPrediction?: CommunicationImpactPrediction;
  /** Existing coaching result */
  coaching?: ConversationCoachingResult;
}

// ─── Pre-Send Gate Response ────────────────────────────────────────────────

export interface PreSendGateResponse {
  gate: PreSendGateResult;
  state: ConversationState;
}
