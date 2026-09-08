// ─── Communication Impact Prediction Types ───────────────────────────────────
//
// Defines the CommunicationImpactPrediction interface and related types for
// predicting what might happen in the conversation if the user sends their draft.
//
// Architecture:
//   DRAFT + CONVERSATION + STATE + DRAFT ANALYSIS
//   → COMMUNICATION IMPACT PREDICTION
//   → OUTCOME SCENARIOS
//   → RECOMMENDATIONS
//   → SEND READINESS
//
// Design:
//   - Predicts plausible communication outcomes, NOT certainty
//   - Uses probabilistic / confidence-aware language
//   - Never claims "they will definitely..."
//   - Uses "may increase the chance of...", "could lead to...", "likely to be perceived as..."
// ──────────────────────────────────────────────────────────────────────────────

import type { DraftAnalysis } from "./draft-types";
import type { ConversationState } from "./conversation-state";
import type {
  ParticipantIntelligence,
  ConflictStructure,
  GroupConversationAnalysis,
} from "./participant-intelligence";

// ─── Send Readiness ───────────────────────────────────────────────────────────

export type SendReadiness = "ready" | "mostly_ready" | "needs_review" | "high_risk";

// ─── Recommended Action ───────────────────────────────────────────────────────

export type RecommendedAction =
  | "send_as_is"
  | "soften_opening"
  | "clarify_request"
  | "add_specific_next_step"
  | "reduce_blame"
  | "acknowledge_concern"
  | "add_context"
  | "set_clear_boundary"
  | "wait_and_rephrase"
  | "improve_message";

// ─── Outcome Scenario ─────────────────────────────────────────────────────────

export type OutcomeScenarioLikelihood = "most_likely" | "possible" | "risk";

export interface OutcomeScenario {
  likelihood: OutcomeScenarioLikelihood;
  description: string;
  confidence: number; // 0.0 – 1.0
}

// ─── Risk Factor ──────────────────────────────────────────────────────────────

export type RiskFactorSeverity = "low" | "medium" | "high";

export interface RiskFactor {
  factor: string;
  severity: RiskFactorSeverity;
  explanation: string;
}

// ─── Communication Impact Prediction ──────────────────────────────────────────

export interface CommunicationImpactPrediction {
  // ── Outcome Scores (0.0 – 1.0) ──
  /** How likely the message encourages cooperation */
  cooperation: number;

  /** Estimate whether the draft encourages a reply */
  responseLikelihood: number;

  /** Whether the message naturally keeps the conversation going */
  conversationContinuation: number;

  /** Reuse DraftAnalysis misunderstandingRisk */
  misunderstandingRisk: number;

  /** Context-aware escalation risk (considering conflict state, participant behavior) */
  escalationRisk: number;

  /** Whether the recipient may become defensive */
  defensivenessRisk: number;

  /** Whether the recipient may feel pushed */
  pressureRisk: number;

  /** Whether the draft supports credibility, transparency, accountability */
  trustImpact: number;

  /** Whether the recipient will understand what happened, what is needed, what happens next */
  clarityImpact: number;

  /** Whether the message moves toward the user's goal */
  goalProgression: number;

  // ── Outcome Scenarios ──
  scenarios: OutcomeScenario[];

  // ── Risk Factors ──
  riskFactors: RiskFactor[];

  // ── Send Readiness ──
  sendReadiness: SendReadiness;

  // ── Recommended Action ──
  recommendedAction: RecommendedAction;

  // ── Human-readable summary ──
  impactSummary: string;

  // ── Explanation of why ──
  whyExplanation: string;

  // ── Confidence of the prediction ──
  predictionConfidence: number;
}

// ─── Impact Prediction Input ──────────────────────────────────────────────────

export interface ImpactPredictionInput {
  /** The user's draft message */
  draft: string;

  /** Current conversation messages */
  messages: Array<{ sender: "me" | "them" | "unknown"; text: string }>;

  /** The existing DraftAnalysis (if already computed) */
  draftAnalysis?: DraftAnalysis;

  /** The existing ConversationState (if already computed) */
  state?: ConversationState;

  /** The user's stated goal */
  goal?: string;

  /** User facts for factual integrity check */
  userFacts?: string[];
}

// ─── Impact Prediction Result ─────────────────────────────────────────────────

export interface ImpactPredictionResult {
  prediction: CommunicationImpactPrediction;
}

// ─── Deterministic Impact Signals ─────────────────────────────────────────────

export interface DeterministicImpactSignals {
  // From draft analysis
  draftEscalationRisk: number;
  draftDefensivenessRisk: number;
  draftPressureRisk: number;
  draftMisunderstandingRisk: number;
  draftClarity: number;
  draftGoalAlignment: number;

  // From conversation state
  conversationConflictLevel: number;
  conversationEscalation: number;
  conversationDefensiveness: number;
  conversationCooperation: number;
  conversationRapport: number;
  conversationPressure: number;

  // From conflict intelligence
  hasRisingEscalation: boolean;
  hasFallingEscalation: boolean;
  hasPersonalAttacks: boolean;
  hasBlamePattern: boolean;
  hasMisunderstanding: boolean;

  // From participant intelligence
  otherParticipantDefensive: boolean;
  otherParticipantHostile: boolean;
  otherParticipantCooperative: boolean;
  otherParticipantFrustrated: boolean;

  // From group analysis
  isGroup: boolean;
  groupDefensivenessLevel: number;

  // Draft characteristics
  hasClearRequest: boolean;
  hasSpecificNextStep: boolean;
  hasAmbiguousDeadline: boolean;
  hasUnnecessaryAccusation: boolean;
  hasClearAccountability: boolean;
  hasFactualContent: boolean;
  hasSolutionOrientation: boolean;
  hasAcknowledgement: boolean;
}
