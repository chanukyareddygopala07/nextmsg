// ─── Communication Impact Prediction Engine ──────────────────────────────────
//
// Predicts what might happen in the conversation if the user sends their draft.
// Combines deterministic risk logic with AI-powered outcome interpretation.
//
// Architecture:
//   DRAFT + CONVERSATION + STATE + DRAFT ANALYSIS
//   → DETERMINISTIC IMPACT SIGNALS
//   → RISK ADJUSTMENTS
//   → AI-ENHANCED PREDICTION
//   → COMMUNICATION IMPACT PREDICTION
//
// Design:
//   - Predicts plausible communication outcomes, NOT certainty
//   - Uses probabilistic / confidence-aware language
//   - Never claims "they will definitely..."
// ──────────────────────────────────────────────────────────────────────────────

import type { AIProvider } from "./provider";
import type { ConversationState } from "./conversation-state";
import type {
  DraftAnalysis,
  DeterministicDraftChecks,
} from "./draft-types";
import type {
  CommunicationImpactPrediction,
  ImpactPredictionInput,
  ImpactPredictionResult,
  DeterministicImpactSignals,
  OutcomeScenario,
  RiskFactor,
  SendReadiness,
  RecommendedAction,
} from "./impact-types";
import { buildConversationText } from "./prompt-builder";
import { CommunicationImpactPredictionSchema } from "./schemas";
import { createPipelineError, logPipelineError } from "./errors";

// ─── AI Prompt ────────────────────────────────────────────────────────────────

const IMPACT_PREDICTION_PROMPT = `You are a communication impact analyst. Based on the provided draft analysis, conversation state, and deterministic signals, predict what might happen if the user sends this message.

Your job is to:
1. Estimate plausible communication outcomes
2. Identify likely scenarios
3. Explain risk factors with context
4. Recommend an appropriate action
5. Assess send readiness

## Critical Rules

- NEVER claim certainty about outcomes
- Use "may increase the chance of...", "could lead to...", "likely to be perceived as..."
- NEVER say "they will definitely..." or "the recipient is definitely..."
- Use calibrated confidence for each prediction
- Consider the FULL context: conversation state, conflict, relationship, participant behavior
- Preserve the user's intent and position
- Do not force users to be submissive or apologetic
- Acknowledge when the user has a legitimate position
- Do not optimize for coercion, deception, or manipulation

## Output

Return a JSON object with the following fields:
{
  "cooperation": 0.0-1.0,
  "responseLikelihood": 0.0-1.0,
  "conversationContinuation": 0.0-1.0,
  "misunderstandingRisk": 0.0-1.0,
  "escalationRisk": 0.0-1.0,
  "defensivenessRisk": 0.0-1.0,
  "pressureRisk": 0.0-1.0,
  "trustImpact": 0.0-1.0,
  "clarityImpact": 0.0-1.0,
  "goalProgression": 0.0-1.0,
  "scenarios": [
    { "likelihood": "most_likely|possible|risk", "description": "...", "confidence": 0.0-1.0 }
  ],
  "riskFactors": [
    { "factor": "...", "severity": "low|medium|high", "explanation": "..." }
  ],
  "sendReadiness": "ready|mostly_ready|needs_review|high_risk",
  "recommendedAction": one of the action values,
  "impactSummary": "brief human-readable summary",
  "whyExplanation": "explanation of why, referencing actual signals",
  "predictionConfidence": 0.0-1.0
}

Return ONLY valid JSON.`;

// ─── Deterministic Signal Extraction ──────────────────────────────────────────

export function extractDeterministicImpactSignals(
  draftAnalysis: DraftAnalysis,
  state: ConversationState,
  checks: DeterministicDraftChecks,
  draft: string
): DeterministicImpactSignals {
  const draftLower = draft.toLowerCase();

  // Draft analysis signals
  const draftEscalationRisk = draftAnalysis.escalationRisk;
  const draftDefensivenessRisk = draftAnalysis.tone.primary === "defensive" ? 0.7 :
    draftAnalysis.tone.primary === "angry" ? 0.8 : 0.2;
  const draftPressureRisk = draftAnalysis.pressureRisk;
  const draftMisunderstandingRisk = draftAnalysis.misunderstandingRisk;
  const draftClarity = draftAnalysis.clarity;
  const draftGoalAlignment = draftAnalysis.goalAlignment;

  // Conversation state signals
  const conversationConflictLevel = state.conflict.level;
  const conversationEscalation = state.conflict.escalation;
  const conversationDefensiveness = state.dynamics.defensiveness;
  const conversationCooperation = state.dynamics.cooperation;
  const conversationRapport = state.dynamics.rapport;
  const conversationPressure = state.dynamics.pressure;

  // Conflict intelligence signals
  const conflictStructure = state.conflictIntelligence.conflictStructure;
  const hasRisingEscalation = conflictStructure?.escalationTrend === "increasing";
  const hasFallingEscalation = conflictStructure?.escalationTrend === "decreasing";
  const hasPersonalAttacks = conflictStructure?.personalAttacks ?? state.conflict.personalAttacks;
  const hasBlamePattern = conflictStructure?.blamePattern !== "none" && conflictStructure?.blamePattern !== "shared_responsibility";
  const hasMisunderstanding = (conflictStructure?.misunderstandings?.length ?? 0) > 0 || state.conflict.misunderstanding;

  // Participant intelligence signals
  const otherParticipants = state.conflictIntelligence.participants.filter(
    (p) => p.participantId !== state.participants.userId
  );
  const otherParticipantDefensive = otherParticipants.some((p) => p.stance === "defensive");
  const otherParticipantHostile = otherParticipants.some((p) => p.stance === "hostile");
  const otherParticipantCooperative = otherParticipants.some((p) => p.stance === "cooperative");
  const otherParticipantFrustrated = otherParticipants.some(
    (p) => p.emotion.primary === "frustrated" || p.emotion.primary === "angry"
  );

  // Group analysis signals
  const groupAnalysis = state.conflictIntelligence.groupAnalysis;
  const isGroup = state.participants.isGroup;
  const groupDefensivenessLevel = groupAnalysis
    ? groupAnalysis.participants.filter((p) => p.stance === "defensive").length / Math.max(groupAnalysis.participants.length, 1)
    : 0;

  // Draft characteristic signals
  const hasClearRequest = checks.hasProfessionalLanguage && draft.includes("?");
  const hasSpecificNextStep = /\b(tomorrow|by \w+|next week|in \d+|before \w+|at \d+)\b/i.test(draft);
  const hasAmbiguousDeadline = /\b(later|sometime|soon|eventually|whenever)\b/i.test(draftLower);
  const hasUnnecessaryAccusation = checks.hasAggressiveLanguage && !checks.hasBoundaryLanguage;
  const hasClearAccountability = /\b(I will|I'll|I can|I have|I did|I already)\b/i.test(draft);
  const hasFactualContent = checks.wordCount > 10 && !checks.hasCliché;
  const hasSolutionOrientation = /\b(solve|fix|solution|plan|next step|approach|way forward)\b/i.test(draftLower);
  const hasAcknowledgement = /\b(I understand|I see|you're right|that makes sense|I hear you)\b/i.test(draft);

  return {
    draftEscalationRisk,
    draftDefensivenessRisk,
    draftPressureRisk,
    draftMisunderstandingRisk,
    draftClarity,
    draftGoalAlignment,
    conversationConflictLevel,
    conversationEscalation,
    conversationDefensiveness,
    conversationCooperation,
    conversationRapport,
    conversationPressure,
    hasRisingEscalation,
    hasFallingEscalation,
    hasPersonalAttacks,
    hasBlamePattern,
    hasMisunderstanding,
    otherParticipantDefensive,
    otherParticipantHostile,
    otherParticipantCooperative,
    otherParticipantFrustrated,
    isGroup,
    groupDefensivenessLevel,
    hasClearRequest,
    hasSpecificNextStep,
    hasAmbiguousDeadline,
    hasUnnecessaryAccusation,
    hasClearAccountability,
    hasFactualContent,
    hasSolutionOrientation,
    hasAcknowledgement,
  };
}

// ─── Deterministic Impact Calculations ────────────────────────────────────────

function calculateDeterministicImpact(
  signals: DeterministicImpactSignals,
  state: ConversationState
): {
  cooperation: number;
  responseLikelihood: number;
  conversationContinuation: number;
  misunderstandingRisk: number;
  escalationRisk: number;
  defensivenessRisk: number;
  pressureRisk: number;
  trustImpact: number;
  clarityImpact: number;
  goalProgression: number;
} {
  // Base values from draft analysis
  let cooperation = 0.5 + (signals.draftClarity - 0.5) * 0.3 + (signals.draftGoalAlignment - 0.5) * 0.2;
  let responseLikelihood = 0.6;
  let conversationContinuation = 0.6;
  let misunderstandingRisk = signals.draftMisunderstandingRisk;
  let escalationRisk = signals.draftEscalationRisk;
  let defensivenessRisk = signals.draftDefensivenessRisk;
  let pressureRisk = signals.draftPressureRisk;
  let trustImpact = 0.6;
  let clarityImpact = signals.draftClarity;
  let goalProgression = signals.draftGoalAlignment;

  // ── Conflict adjustments ──
  if (signals.conversationConflictLevel > 0.6) {
    // High conflict context amplifies risks
    escalationRisk = Math.min(1, escalationRisk + 0.15);
    defensivenessRisk = Math.min(1, defensivenessRisk + 0.1);
    cooperation = Math.max(0, cooperation - 0.1);
  }

  if (signals.hasRisingEscalation) {
    escalationRisk = Math.min(1, escalationRisk + 0.2);
    defensivenessRisk = Math.min(1, defensivenessRisk + 0.15);
    cooperation = Math.max(0, cooperation - 0.15);
  }

  if (signals.hasFallingEscalation) {
    escalationRisk = Math.max(0, escalationRisk - 0.1);
    cooperation = Math.min(1, cooperation + 0.1);
  }

  if (signals.hasPersonalAttacks) {
    escalationRisk = Math.min(1, escalationRisk + 0.25);
    defensivenessRisk = Math.min(1, defensivenessRisk + 0.2);
    cooperation = Math.max(0, cooperation - 0.2);
    trustImpact = Math.max(0, trustImpact - 0.2);
  }

  if (signals.hasBlamePattern) {
    defensivenessRisk = Math.min(1, defensivenessRisk + 0.15);
    escalationRisk = Math.min(1, escalationRisk + 0.1);
  }

  if (signals.hasMisunderstanding) {
    misunderstandingRisk = Math.min(1, misunderstandingRisk + 0.15);
  }

  // ── Participant adjustments ──
  if (signals.otherParticipantDefensive) {
    defensivenessRisk = Math.min(1, defensivenessRisk + 0.15);
    if (signals.draftDefensivenessRisk > 0.5) {
      escalationRisk = Math.min(1, escalationRisk + 0.1);
    }
  }

  if (signals.otherParticipantHostile) {
    escalationRisk = Math.min(1, escalationRisk + 0.15);
    cooperation = Math.max(0, cooperation - 0.15);
  }

  if (signals.otherParticipantCooperative) {
    cooperation = Math.min(1, cooperation + 0.1);
    escalationRisk = Math.max(0, escalationRisk - 0.05);
  }

  if (signals.otherParticipantFrustrated) {
    if (signals.draftPressureRisk > 0.4) {
      pressureRisk = Math.min(1, pressureRisk + 0.15);
      escalationRisk = Math.min(1, escalationRisk + 0.1);
    }
  }

  // ── Group adjustments ──
  if (signals.isGroup) {
    if (signals.hasUnnecessaryAccusation) {
      defensivenessRisk = Math.min(1, defensivenessRisk + 0.15);
      escalationRisk = Math.min(1, escalationRisk + 0.1);
    }
    if (signals.groupDefensivenessLevel > 0.3) {
      defensivenessRisk = Math.min(1, defensivenessRisk + 0.1);
    }
  }

  // ── Positive adjustments ──
  if (signals.hasClearRequest) {
    cooperation = Math.min(1, cooperation + 0.1);
    clarityImpact = Math.min(1, clarityImpact + 0.1);
    goalProgression = Math.min(1, goalProgression + 0.1);
  }

  if (signals.hasSpecificNextStep) {
    goalProgression = Math.min(1, goalProgression + 0.15);
    clarityImpact = Math.min(1, clarityImpact + 0.1);
    responseLikelihood = Math.min(1, responseLikelihood + 0.1);
  }

  if (signals.hasClearAccountability) {
    trustImpact = Math.min(1, trustImpact + 0.15);
    cooperation = Math.min(1, cooperation + 0.05);
  }

  if (signals.hasFactualContent) {
    trustImpact = Math.min(1, trustImpact + 0.1);
    clarityImpact = Math.min(1, clarityImpact + 0.05);
  }

  if (signals.hasSolutionOrientation) {
    cooperation = Math.min(1, cooperation + 0.15);
    escalationRisk = Math.max(0, escalationRisk - 0.1);
  }

  if (signals.hasAcknowledgement) {
    cooperation = Math.min(1, cooperation + 0.1);
    defensivenessRisk = Math.max(0, defensivenessRisk - 0.1);
  }

  // ── Negative adjustments ──
  if (signals.hasUnnecessaryAccusation) {
    defensivenessRisk = Math.min(1, defensivenessRisk + 0.2);
    escalationRisk = Math.min(1, escalationRisk + 0.15);
    cooperation = Math.max(0, cooperation - 0.15);
  }

  if (signals.hasAmbiguousDeadline) {
    misunderstandingRisk = Math.min(1, misunderstandingRisk + 0.15);
    clarityImpact = Math.max(0, clarityImpact - 0.1);
  }

  // ── Response likelihood adjustments ──
  if (signals.draftPressureRisk > 0.6) {
    responseLikelihood = Math.max(0.2, responseLikelihood - 0.2);
  }
  if (state.conflict.level > 0.7) {
    responseLikelihood = Math.max(0.3, responseLikelihood - 0.1);
  }
  if (signals.hasClearRequest) {
    responseLikelihood = Math.min(1, responseLikelihood + 0.1);
  }

  // ── Conversation continuation adjustments ──
  conversationContinuation = (cooperation + responseLikelihood + clarityImpact) / 3;
  if (signals.draftPressureRisk > 0.5) {
    conversationContinuation = Math.max(0.2, conversationContinuation - 0.15);
  }
  if (escalationRisk > 0.6) {
    conversationContinuation = Math.max(0.2, conversationContinuation - 0.1);
  }

  // Clamp all values
  return {
    cooperation: clamp(cooperation),
    responseLikelihood: clamp(responseLikelihood),
    conversationContinuation: clamp(conversationContinuation),
    misunderstandingRisk: clamp(misunderstandingRisk),
    escalationRisk: clamp(escalationRisk),
    defensivenessRisk: clamp(defensivenessRisk),
    pressureRisk: clamp(pressureRisk),
    trustImpact: clamp(trustImpact),
    clarityImpact: clamp(clarityImpact),
    goalProgression: clamp(goalProgression),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ─── Scenario Generation ──────────────────────────────────────────────────────

function generateScenarios(
  impact: ReturnType<typeof calculateDeterministicImpact>,
  signals: DeterministicImpactSignals,
  state: ConversationState
): OutcomeScenario[] {
  const scenarios: OutcomeScenario[] = [];

  // Most likely scenario
  if (impact.cooperation > 0.6 && impact.escalationRisk < 0.4) {
    scenarios.push({
      likelihood: "most_likely",
      description: "The recipient understands the message and responds constructively.",
      confidence: impact.cooperation,
    });
  } else if (impact.escalationRisk > 0.6) {
    scenarios.push({
      likelihood: "most_likely",
      description: "The recipient may respond defensively due to the tense context.",
      confidence: impact.escalationRisk,
    });
  } else {
    scenarios.push({
      likelihood: "most_likely",
      description: "The recipient reads the message and responds in a neutral or constructive way.",
      confidence: 0.6,
    });
  }

  // Possible concern scenario
  if (signals.hasBlamePattern || signals.draftDefensivenessRisk > 0.5) {
    scenarios.push({
      likelihood: "possible",
      description: "They may focus on the blame-oriented wording rather than the actual issue.",
      confidence: 0.5,
    });
  } else if (signals.hasAmbiguousDeadline) {
    scenarios.push({
      likelihood: "possible",
      description: "They may ask for clarification about the timeline or specifics.",
      confidence: 0.55,
    });
  } else if (signals.draftPressureRisk > 0.4) {
    scenarios.push({
      likelihood: "possible",
      description: "They may feel pressured and respond with resistance rather than cooperation.",
      confidence: 0.45,
    });
  }

  // Risk scenario
  if (signals.conversationConflictLevel > 0.5 || signals.hasRisingEscalation) {
    scenarios.push({
      likelihood: "risk",
      description: "If tensions are already high, the opening wording may trigger further defensiveness.",
      confidence: 0.4,
    });
  } else if (signals.hasPersonalAttacks) {
    scenarios.push({
      likelihood: "risk",
      description: "The personal nature of the wording may cause the recipient to disengage or escalate.",
      confidence: 0.5,
    });
  } else if (signals.isGroup && signals.hasUnnecessaryAccusation) {
    scenarios.push({
      likelihood: "risk",
      description: "In a group setting, the accusation may cause collective defensiveness.",
      confidence: 0.45,
    });
  }

  return scenarios.slice(0, 3);
}

// ─── Risk Factor Generation ───────────────────────────────────────────────────

function generateRiskFactors(
  signals: DeterministicImpactSignals,
  state: ConversationState
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (signals.conversationConflictLevel > 0.5) {
    factors.push({
      factor: "Current conversation is tense",
      severity: signals.conversationConflictLevel > 0.7 ? "high" : "medium",
      explanation: "The conversation already has elevated conflict, which may amplify negative interpretations.",
    });
  }

  if (signals.hasPersonalAttacks) {
    factors.push({
      factor: "Personal attack detected",
      severity: "high",
      explanation: "The draft contains personal attacks which significantly increase escalation risk.",
    });
  }

  if (signals.hasBlamePattern) {
    factors.push({
      factor: "Blame-oriented framing",
      severity: "medium",
      explanation: "The wording focuses on blame, which may shift the discussion away from resolution.",
    });
  }

  if (signals.hasRisingEscalation) {
    factors.push({
      factor: "Escalation trend is rising",
      severity: "high",
      explanation: "The conversation is escalating. Further provocative language may intensify the conflict.",
    });
  }

  if (signals.hasUnnecessaryAccusation) {
    factors.push({
      factor: "Unnecessary accusation",
      severity: "medium",
      explanation: "The draft contains accusatory language that may not be needed to make the point.",
    });
  }

  if (signals.hasAmbiguousDeadline) {
    factors.push({
      factor: "Ambiguous timeline",
      severity: "low",
      explanation: "The draft uses vague timing which may require clarification.",
    });
  }

  if (signals.otherParticipantDefensive) {
    factors.push({
      factor: "Other participant is defensive",
      severity: "medium",
      explanation: "The other person is already in a defensive stance, making them more likely to perceive criticism.",
    });
  }

  if (signals.otherParticipantFrustrated) {
    factors.push({
      factor: "Other participant is frustrated",
      severity: "medium",
      explanation: "Frustration may cause them to interpret neutral messages more negatively.",
    });
  }

  if (signals.isGroup && signals.groupDefensivenessLevel > 0.3) {
    factors.push({
      factor: "Group defensiveness",
      severity: "medium",
      explanation: "Multiple participants in the group may become defensive.",
    });
  }

  if (signals.draftPressureRisk > 0.5) {
    factors.push({
      factor: "Pressure language",
      severity: signals.draftPressureRisk > 0.7 ? "high" : "medium",
      explanation: "The draft contains pressure language that may cause resistance.",
    });
  }

  return factors.slice(0, 5);
}

// ─── Send Readiness Calculation ───────────────────────────────────────────────

function calculateSendReadiness(
  impact: ReturnType<typeof calculateDeterministicImpact>,
  signals: DeterministicImpactSignals
): SendReadiness {
  const riskScore = (impact.escalationRisk + impact.defensivenessRisk + impact.pressureRisk) / 3;
  const positiveScore = (impact.cooperation + impact.clarityImpact + impact.trustImpact) / 3;

  if (signals.hasPersonalAttacks || riskScore > 0.7) {
    return "high_risk";
  }
  if (riskScore > 0.5 || positiveScore < 0.4) {
    return "needs_review";
  }
  if (positiveScore > 0.6 && riskScore < 0.35) {
    return "ready";
  }
  return "mostly_ready";
}

// ─── Recommended Action Calculation ───────────────────────────────────────────

function calculateRecommendedAction(
  impact: ReturnType<typeof calculateDeterministicImpact>,
  signals: DeterministicImpactSignals,
  state: ConversationState
): RecommendedAction {
  if (signals.hasPersonalAttacks) return "reduce_blame";
  if (signals.hasUnnecessaryAccusation) return "soften_opening";
  if (impact.escalationRisk > 0.6) return "wait_and_rephrase";
  if (signals.hasAmbiguousDeadline && impact.clarityImpact < 0.5) return "clarify_request";
  if (signals.draftPressureRisk > 0.6) return "soften_opening";
  if (impact.goalProgression < 0.4 && signals.hasClearRequest) return "add_specific_next_step";
  if (signals.conversationConflictLevel > 0.5 && !signals.hasAcknowledgement) return "acknowledge_concern";
  if (impact.clarityImpact < 0.4) return "clarify_request";
  if (impact.cooperation > 0.7 && impact.escalationRisk < 0.3) return "send_as_is";
  return "send_as_is";
}

// ─── Impact Summary Generation ────────────────────────────────────────────────

function generateImpactSummary(
  impact: ReturnType<typeof calculateDeterministicImpact>,
  sendReadiness: SendReadiness
): string {
  const readinessLabels: Record<SendReadiness, string> = {
    ready: "Safe to send",
    mostly_ready: "Mostly safe to send",
    needs_review: "Review before sending",
    high_risk: "High communication risk",
  };

  const parts: string[] = [];
  parts.push(readinessLabels[sendReadiness] + ".");

  if (impact.cooperation > 0.7) {
    parts.push("This message is likely to encourage cooperation.");
  } else if (impact.cooperation < 0.4) {
    parts.push("This message may reduce the other person's willingness to cooperate.");
  }

  if (impact.escalationRisk > 0.6) {
    parts.push("There is a significant risk of escalation.");
  } else if (impact.escalationRisk < 0.3) {
    parts.push("Escalation risk is low.");
  }

  return parts.join(" ");
}

// ─── Why Explanation Generation ───────────────────────────────────────────────

function generateWhyExplanation(
  signals: DeterministicImpactSignals,
  impact: ReturnType<typeof calculateDeterministicImpact>
): string {
  const parts: string[] = [];

  // Strengths
  const strengths: string[] = [];
  if (signals.hasClearRequest) strengths.push("clear request");
  if (signals.hasSpecificNextStep) strengths.push("specific next step");
  if (signals.hasClearAccountability) strengths.push("clear accountability");
  if (signals.hasFactualContent) strengths.push("factual content");
  if (signals.hasSolutionOrientation) strengths.push("solution-oriented");
  if (signals.hasAcknowledgement) strengths.push("acknowledges the other person's position");

  if (strengths.length > 0) {
    parts.push("Strengths: " + strengths.join(", ") + ".");
  }

  // Concerns
  const concerns: string[] = [];
  if (signals.conversationConflictLevel > 0.5) concerns.push("current conversation is tense");
  if (signals.hasUnnecessaryAccusation) concerns.push("accusatory opening");
  if (signals.hasBlamePattern) concerns.push("blame-oriented framing");
  if (signals.hasPersonalAttacks) concerns.push("personal attacks");
  if (signals.hasAmbiguousDeadline) concerns.push("ambiguous timeline");
  if (signals.draftPressureRisk > 0.5) concerns.push("pressure language");
  if (signals.hasRisingEscalation) concerns.push("escalation is rising");

  if (concerns.length > 0) {
    parts.push("Concerns: " + concerns.join(", ") + ".");
  }

  return parts.join(" ") || "The message appears reasonable for the context.";
}

// ─── Main Prediction Function (Deterministic) ─────────────────────────────────

export function predictImpact(
  input: ImpactPredictionInput,
  state: ConversationState,
  draftAnalysis: DraftAnalysis,
  checks: DeterministicDraftChecks
): { prediction: CommunicationImpactPrediction; signals: DeterministicImpactSignals } {
  const signals = extractDeterministicImpactSignals(draftAnalysis, state, checks, input.draft);
  const impact = calculateDeterministicImpact(signals, state);
  const scenarios = generateScenarios(impact, signals, state);
  const riskFactors = generateRiskFactors(signals, state);
  const sendReadiness = calculateSendReadiness(impact, signals);
  const recommendedAction = calculateRecommendedAction(impact, signals, state);
  const impactSummary = generateImpactSummary(impact, sendReadiness);
  const whyExplanation = generateWhyExplanation(signals, impact);

  const prediction: CommunicationImpactPrediction = {
    ...impact,
    scenarios,
    riskFactors,
    sendReadiness,
    recommendedAction,
    impactSummary,
    whyExplanation,
    predictionConfidence: 0.75,
  };

  return { prediction, signals };
}

// ─── AI-Enhanced Prediction ───────────────────────────────────────────────────

export async function predictImpactWithAI(
  provider: AIProvider,
  input: ImpactPredictionInput,
  state: ConversationState,
  draftAnalysis: DraftAnalysis,
  checks: DeterministicDraftChecks
): Promise<ImpactPredictionResult> {
  // Run deterministic prediction first
  const { prediction: deterministicPrediction, signals } = predictImpact(
    input, state, draftAnalysis, checks
  );

  // Build prompt for AI interpretation
  const conversationText = buildConversationText(input.messages);
  const prompt = buildAIPrompt(input, state, draftAnalysis, signals, conversationText);

  try {
    const response = await provider.chat(
      [
        { role: "system", content: IMPACT_PREDICTION_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, maxTokens: 2000 }
    );

    const parsed = JSON.parse(response);
    const validated = CommunicationImpactPredictionSchema.safeParse(parsed);

    if (!validated.success) {
      return { prediction: deterministicPrediction };
    }

    const aiPrediction = validated.data;

    // Merge AI prediction with deterministic signals
    // AI provides semantic interpretation, deterministic provides signal-based scores
    const mergedPrediction: CommunicationImpactPrediction = {
      cooperation: blendScores(deterministicPrediction.cooperation, aiPrediction.cooperation),
      responseLikelihood: blendScores(deterministicPrediction.responseLikelihood, aiPrediction.responseLikelihood),
      conversationContinuation: blendScores(deterministicPrediction.conversationContinuation, aiPrediction.conversationContinuation),
      misunderstandingRisk: blendScores(deterministicPrediction.misunderstandingRisk, aiPrediction.misunderstandingRisk),
      escalationRisk: blendScores(deterministicPrediction.escalationRisk, aiPrediction.escalationRisk),
      defensivenessRisk: blendScores(deterministicPrediction.defensivenessRisk, aiPrediction.defensivenessRisk),
      pressureRisk: blendScores(deterministicPrediction.pressureRisk, aiPrediction.pressureRisk),
      trustImpact: blendScores(deterministicPrediction.trustImpact, aiPrediction.trustImpact),
      clarityImpact: blendScores(deterministicPrediction.clarityImpact, aiPrediction.clarityImpact),
      goalProgression: blendScores(deterministicPrediction.goalProgression, aiPrediction.goalProgression),
      scenarios: aiPrediction.scenarios.length > 0 ? aiPrediction.scenarios : deterministicPrediction.scenarios,
      riskFactors: aiPrediction.riskFactors.length > 0 ? aiPrediction.riskFactors : deterministicPrediction.riskFactors,
      sendReadiness: aiPrediction.sendReadiness || deterministicPrediction.sendReadiness,
      recommendedAction: aiPrediction.recommendedAction || deterministicPrediction.recommendedAction,
      impactSummary: aiPrediction.impactSummary || deterministicPrediction.impactSummary,
      whyExplanation: aiPrediction.whyExplanation || deterministicPrediction.whyExplanation,
      predictionConfidence: Math.max(deterministicPrediction.predictionConfidence, aiPrediction.predictionConfidence),
    };

    return { prediction: mergedPrediction };
  } catch (error) {
    const pipelineError = createPipelineError("impact_prediction", error);
    logPipelineError(pipelineError);
    return { prediction: deterministicPrediction };
  }
}

// ─── AI Prompt Builder ────────────────────────────────────────────────────────

function buildAIPrompt(
  input: ImpactPredictionInput,
  state: ConversationState,
  draftAnalysis: DraftAnalysis,
  signals: DeterministicImpactSignals,
  conversationText: string
): string {
  let prompt = "";

  prompt += `## User's Draft\n"${input.draft}"\n\n`;
  prompt += `## Conversation\n${conversationText}\n\n`;

  // State summary
  prompt += `## Conversation State\n`;
  prompt += `- Relationship: ${state.relationship}\n`;
  prompt += `- Context: ${state.context.type}\n`;
  prompt += `- Situation: ${state.context.situation}\n`;
  prompt += `- Conflict Level: ${state.conflict.level}\n`;
  prompt += `- Conflict Escalation: ${state.conflict.escalation}\n`;
  prompt += `- Participants: ${state.participants.count}${state.participants.isGroup ? " (group)" : ""}\n`;

  if (state.strategy.ranked.length > 0) {
    prompt += `- Recommended strategies: ${state.strategy.ranked.slice(0, 3).map((s) => s.strategy).join(", ")}\n`;
  }

  // Draft analysis summary
  prompt += `\n## Draft Analysis\n`;
  prompt += `- Intent: ${draftAnalysis.intent}\n`;
  prompt += `- Tone: ${draftAnalysis.tone.primary}\n`;
  prompt += `- Perceived Impact: ${draftAnalysis.perceivedImpact}\n`;
  prompt += `- Goal Alignment: ${Math.round(draftAnalysis.goalAlignment * 100)}%\n`;
  prompt += `- Clarity: ${Math.round(draftAnalysis.clarity * 100)}%\n`;
  prompt += `- Escalation Risk: ${Math.round(draftAnalysis.escalationRisk * 100)}%\n`;

  // Deterministic signals
  prompt += `\n## Deterministic Signals\n`;
  prompt += `- Conversation conflict level: ${Math.round(signals.conversationConflictLevel * 100)}%\n`;
  prompt += `- Conversation defensiveness: ${Math.round(signals.conversationDefensiveness * 100)}%\n`;
  prompt += `- Other participant defensive: ${signals.otherParticipantDefensive}\n`;
  prompt += `- Other participant hostile: ${signals.otherParticipantHostile}\n`;
  prompt += `- Rising escalation: ${signals.hasRisingEscalation}\n`;
  prompt += `- Personal attacks: ${signals.hasPersonalAttacks}\n`;
  prompt += `- Blame pattern: ${signals.hasBlamePattern}\n`;
  prompt += `- Clear request: ${signals.hasClearRequest}\n`;
  prompt += `- Specific next step: ${signals.hasSpecificNextStep}\n`;
  prompt += `- Solution orientation: ${signals.hasSolutionOrientation}\n`;
  prompt += `- Acknowledgement: ${signals.hasAcknowledgement}\n`;

  if (input.goal) {
    prompt += `\n## User's Goal\n${input.goal}\n`;
  }

  return prompt;
}

// ─── Score Blending ───────────────────────────────────────────────────────────

function blendScores(deterministic: number, ai: number): number {
  return deterministic * 0.5 + ai * 0.5;
}
