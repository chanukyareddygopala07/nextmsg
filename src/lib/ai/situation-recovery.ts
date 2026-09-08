// ─── Situation Recovery & Persuasive Communication ──────────────────────────
//
// Structured recovery framework for difficult communication situations.
// Consumes ConversationState to produce recovery guidance, strategies, and
// ready-to-send response candidates.
//
// Core principle: Strengthen the user's real explanation. Never fabricate facts.
// ──────────────────────────────────────────────────────────────────────────────

import type { ConversationState } from "./conversation-state";
import type {
  SituationType,
  UserIntentType,
  CommunicationStrategy,
} from "./intelligence";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AccountabilityLevel = "full" | "partial" | "minimal" | "none";
export type RecoverySeverity = "low" | "medium" | "high" | "critical";
export type FactSource = "user" | "inferred" | "suggested";

export interface UserFact {
  text: string;
  source: FactSource;
  verified: boolean;
}

export interface RecoveryRequiredElement {
  element: string;
  description: string;
  priority: "required" | "recommended" | "optional";
}

export interface RecoveryRisk {
  type: string;
  severity: number;
  description: string;
  mitigation: string;
}

export interface CandidateGuidance {
  strategy: CommunicationStrategy;
  structure: string[];
  tone: string;
  length: "short" | "medium" | "long";
  avoid: string[];
  example?: string;
}

export interface SituationRecovery {
  situation: SituationType;
  severity: RecoverySeverity;
  userGoal: UserIntentType;
  accountabilityLevel: AccountabilityLevel;
  relevantFacts: UserFact[];
  otherPersonConcern: string;
  recommendedApproach: string;
  recommendedStrategies: CommunicationStrategy[];
  requiredElements: RecoveryRequiredElement[];
  riskyElements: string[];
  nextAction: string;
  candidateGuidance: CandidateGuidance[];
  conflictAdjusted: boolean;
  groupAdjusted: boolean;
  languageAdjusted: boolean;
}

export interface RecoveryInput {
  state: ConversationState;
  userFacts?: UserFact[];
  messages?: { sender: string; text: string }[];
}

// ─── Recovery Engine ─────────────────────────────────────────────────────────

export function generateRecovery(input: RecoveryInput): SituationRecovery {
  const { state, userFacts = [] } = input;

  const situation = state.context.situation;
  const severity = assessSeverity(state);
  const userGoal = state.intent.userIntent;
  const accountabilityLevel = assessAccountability(state);
  const otherPersonConcern = inferOtherPersonConcern(state);
  const relevantFacts = filterVerifiedFacts(userFacts);

  const baseRecovery = buildBaseRecovery(
    situation,
    severity,
    userGoal,
    accountabilityLevel,
    otherPersonConcern,
    relevantFacts,
    state
  );

  applyConflictAdjustments(baseRecovery, state);
  applyGroupAdjustments(baseRecovery, state);
  applyLanguageAdjustments(baseRecovery, state);

  return baseRecovery;
}

// ─── Severity Assessment ─────────────────────────────────────────────────────

function assessSeverity(state: ConversationState): RecoverySeverity {
  const situation = state.context.situation;
  const conflictLevel = state.conflict.level;
  const escalation = state.conflict.escalation;
  const urgency = state.context.urgency;

  if (conflictLevel > 0.8 || escalation > 0.7) return "critical";
  if (conflictLevel > 0.5 || urgency === "urgent") return "high";

  switch (situation) {
    case "heated_argument":
    case "personal_conflict":
      return "high";
    case "missed_interview":
    case "late_arrival":
    case "customer_complaint":
      return "medium";
    case "missed_deadline":
    case "late_submission":
    case "missed_meeting":
      return "medium";
    case "wrong_file":
    case "delayed_response":
    case "missed_call":
      return "low";
    case "misunderstanding":
    case "disagreement":
      return conflictLevel > 0.3 ? "medium" : "low";
    default:
      return "low";
  }
}

// ─── Accountability Assessment ───────────────────────────────────────────────

function assessAccountability(state: ConversationState): AccountabilityLevel {
  const situation = state.context.situation;
  const userIntent = state.intent.userIntent;

  if (userIntent === "apologize" || userIntent === "recover_from_mistake") {
    return "full";
  }

  switch (situation) {
    case "late_submission":
    case "missed_deadline":
    case "late_arrival":
    case "missed_meeting":
    case "missed_interview":
    case "wrong_file":
      return "full";
    case "misunderstanding":
      return state.conflict.misunderstanding ? "partial" : "minimal";
    case "disagreement":
    case "heated_argument":
      return "partial";
    case "customer_complaint":
      return "full";
    case "negotiation":
      return "minimal";
    default:
      return "minimal";
  }
}

// ─── Other Person Concern Inference ──────────────────────────────────────────

function inferOtherPersonConcern(state: ConversationState): string {
  const situation = state.context.situation;
  const conflict = state.conflict;

  if (conflict.coreDisagreement) {
    return conflict.coreDisagreement;
  }

  switch (situation) {
    case "late_submission":
    case "missed_deadline":
      return "Deadline was not met. Impact on their work/timeline.";
    case "late_arrival":
    case "missed_interview":
      return "Their time was not respected. Professionalism concern.";
    case "missed_meeting":
      return "Meeting was missed. Their time wasted.";
    case "wrong_file":
      return "Incorrect information was shared. Reliability concern.";
    case "delayed_response":
    case "missed_call":
      return "Communication was not timely. Responsiveness concern.";
    case "customer_complaint":
      return "Service or product did not meet expectations.";
    case "misunderstanding":
      return "Communication gap. Different interpretations.";
    case "disagreement":
    case "heated_argument":
      return "Fundamental disagreement on approach or facts.";
    case "negotiation":
      return "Their interests and constraints.";
    case "rejection":
      return "Their decision needs to be respected.";
    case "romantic_interest":
      return "Their comfort level and interest.";
    default:
      return "Effective communication and resolution.";
  }
}

// ─── Fact Handling ───────────────────────────────────────────────────────────

function filterVerifiedFacts(facts: UserFact[]): UserFact[] {
  return facts.filter((f) => f.source === "user" || f.verified);
}

export function classifyFact(
  factText: string,
  userStatedFacts: string[]
): FactSource {
  const normalized = factText.toLowerCase().trim();

  for (const userFact of userStatedFacts) {
    if (normalized.includes(userFact.toLowerCase().trim())) {
      return "user";
    }
  }

  return "inferred";
}

export function buildSafeResponse(
  situation: SituationType,
  userFacts: UserFact[]
): string {
  const hasExplanation = userFacts.some(
    (f) => f.source === "user" && f.text.length > 5
  );

  if (hasExplanation) {
    return "";
  }

  switch (situation) {
    case "late_submission":
    case "missed_deadline":
      return "I take responsibility for the delay and can have this completed soon.";
    case "late_arrival":
    case "missed_interview":
      return "I understand the inconvenience and am available now.";
    case "missed_meeting":
      return "I apologize for missing the meeting. I'm available to reschedule.";
    case "wrong_file":
      return "I'll send the correct version right away.";
    default:
      return "";
  }
}

// ─── Base Recovery Builder ───────────────────────────────────────────────────

function buildBaseRecovery(
  situation: SituationType,
  severity: RecoverySeverity,
  userGoal: UserIntentType,
  accountabilityLevel: AccountabilityLevel,
  otherPersonConcern: string,
  relevantFacts: UserFact[],
  state: ConversationState
): SituationRecovery {
  const requiredElements = determineRequiredElements(situation, accountabilityLevel);
  const riskyElements = determineRiskyElements(situation, state);
  const recommendedStrategies = determineRecoveryStrategies(
    situation,
    userGoal,
    state
  );
  const candidateGuidance = buildCandidateGuidance(
    situation,
    recommendedStrategies,
    state
  );

  return {
    situation,
    severity,
    userGoal,
    accountabilityLevel,
    relevantFacts,
    otherPersonConcern,
    recommendedApproach: buildRecommendedApproach(
      situation,
      accountabilityLevel,
      state
    ),
    recommendedStrategies,
    requiredElements,
    riskyElements,
    nextAction: determineNextAction(situation, userGoal),
    candidateGuidance,
    conflictAdjusted: false,
    groupAdjusted: false,
    languageAdjusted: false,
  };
}

// ─── Required Elements ───────────────────────────────────────────────────────

function determineRequiredElements(
  situation: SituationType,
  accountabilityLevel: AccountabilityLevel
): RecoveryRequiredElement[] {
  const elements: RecoveryRequiredElement[] = [];

  switch (situation) {
    case "late_submission":
    case "missed_deadline":
      elements.push(
        { element: "acknowledgement", description: "Acknowledge the missed deadline", priority: "required" },
        { element: "accountability", description: "Take responsibility for the delay", priority: "required" },
        { element: "explanation", description: "Brief factual explanation if available", priority: "recommended" },
        { element: "new_timeline", description: "Provide new completion time", priority: "required" },
        { element: "request", description: "Request understanding or extension", priority: "required" }
      );
      break;

    case "late_arrival":
    case "missed_interview":
      elements.push(
        { element: "apology", description: "Apologize for the delay", priority: "required" },
        { element: "concise_explanation", description: "Brief explanation if available", priority: "recommended" },
        { element: "eta_or_reschedule", description: "Provide ETA or request reschedule", priority: "required" },
        { element: "respect", description: "Acknowledge their time", priority: "required" }
      );
      break;

    case "missed_meeting":
      elements.push(
        { element: "acknowledgement", description: "Acknowledge missing the meeting", priority: "required" },
        { element: "accountability", description: "Take responsibility", priority: "required" },
        { element: "reschedule", description: "Propose rescheduling", priority: "required" }
      );
      break;

    case "wrong_file":
      elements.push(
        { element: "acknowledge", description: "Acknowledge the mistake", priority: "required" },
        { element: "correct", description: "Send correct file/information", priority: "required" },
        { element: "apologize", description: "Brief apology", priority: "required" }
      );
      break;

    case "customer_complaint":
      elements.push(
        { element: "acknowledgement", description: "Acknowledge the complaint", priority: "required" },
        { element: "empathy", description: "Show understanding of their concern", priority: "required" },
        { element: "solution", description: "Provide concrete solution", priority: "required" },
        { element: "timeline", description: "Give timeline for resolution", priority: "required" }
      );
      break;

    case "negotiation":
      elements.push(
        { element: "objective", description: "State your objective clearly", priority: "required" },
        { element: "rationale", description: "Explain your reasoning", priority: "required" },
        { element: "value", description: "Show mutual benefit", priority: "recommended" },
        { element: "alternative", description: "Offer alternatives", priority: "recommended" },
        { element: "compromise", description: "Show willingness to compromise", priority: "recommended" }
      );
      break;

    case "disagreement":
    case "heated_argument":
    case "personal_conflict":
      elements.push(
        { element: "acknowledgement", description: "Acknowledge their perspective", priority: "required" },
        { element: "clarification", description: "Clarify your position", priority: "required" },
        { element: "boundaries", description: "Set appropriate boundaries if needed", priority: "recommended" },
        { element: "resolution", description: "Propose path forward", priority: "recommended" }
      );
      break;

    case "misunderstanding":
      elements.push(
        { element: "clarification", description: "Clarify the misunderstanding", priority: "required" },
        { element: "acknowledgement", description: "Acknowledge the communication gap", priority: "recommended" }
      );
      break;

    default:
      if (accountabilityLevel === "full") {
        elements.push(
          { element: "acknowledgement", description: "Acknowledge the situation", priority: "required" },
          { element: "accountability", description: "Take responsibility", priority: "required" },
          { element: "next_step", description: "Propose next action", priority: "required" }
        );
      } else {
        elements.push(
          { element: "response", description: "Respond appropriately", priority: "required" },
          { element: "next_step", description: "Propose next action", priority: "recommended" }
        );
      }
  }

  return elements;
}

// ─── Risky Elements ──────────────────────────────────────────────────────────

function determineRiskyElements(
  situation: SituationType,
  state: ConversationState
): string[] {
  const risks: string[] = [];

  risks.push("Fabricating excuses or false facts");
  risks.push("Over-explaining without substance");
  risks.push("Blaming others without justification");

  if (
    situation === "late_submission" ||
    situation === "missed_deadline" ||
    situation === "late_arrival"
  ) {
    risks.push("Inventing emergencies or personal problems");
    risks.push("Making promises you cannot guarantee");
  }

  if (situation === "customer_complaint") {
    risks.push("Being defensive");
    risks.push("Minimizing the customer's concern");
    risks.push("Making commitments you cannot fulfill");
  }

  if (situation === "negotiation") {
    risks.push("Being ultimatum-driven");
    risks.push("Revealing your position too early");
    risks.push("Manipulating or pressuring");
  }

  if (
    situation === "disagreement" ||
    situation === "heated_argument" ||
    situation === "personal_conflict"
  ) {
    risks.push("Escalating the conflict");
    risks.push("Personal attacks");
    risks.push("Dismissive language");
    risks.push("Ignoring their perspective entirely");
  }

  if (state.conflict.personalAttacks) {
    risks.push("Responding with personal attacks");
    risks.push("Matching aggressive tone");
  }

  return risks;
}

// ─── Recovery Strategies ─────────────────────────────────────────────────────

function determineRecoveryStrategies(
  situation: SituationType,
  userGoal: UserIntentType,
  state: ConversationState
): CommunicationStrategy[] {
  const strategies: CommunicationStrategy[] = [];

  switch (situation) {
    case "late_submission":
    case "missed_deadline":
      strategies.push("accountable", "solution_oriented", "diplomatic");
      if (userGoal === "ask_for_extension") {
        strategies.push("persuasive");
      }
      break;

    case "late_arrival":
    case "missed_interview":
      strategies.push("professional", "accountable", "concise");
      if (userGoal === "ask_for_reschedule") {
        strategies.push("reschedule_request");
      }
      break;

    case "missed_meeting":
      strategies.push("accountable", "professional", "solution_oriented");
      break;

    case "wrong_file":
      strategies.push("accountable", "solution_oriented", "concise");
      break;

    case "delayed_response":
    case "missed_call":
      strategies.push("natural", "accountable");
      break;

    case "customer_complaint":
      strategies.push("empathetic", "solution_oriented", "professional");
      break;

    case "negotiation":
      strategies.push("persuasive", "clear_direct", "professional", "compromise");
      break;

    case "disagreement":
    case "heated_argument":
    case "personal_conflict":
      if (state.conflict.level > 0.6) {
        strategies.push("de_escalate", "clarifying", "empathetic");
      } else {
        strategies.push("assertive", "clarifying", "diplomatic");
      }
      if (state.conflict.resolutionOpportunity) {
        strategies.push("solution_oriented");
      }
      break;

    case "misunderstanding":
      strategies.push("clarifying", "empathetic", "natural");
      break;

    case "romantic_interest":
      strategies.push("natural", "friendly", "playful");
      break;

    case "rejection":
      strategies.push("natural", "empathetic");
      break;

    default:
      strategies.push("natural");
      if (state.conflict.level > 0.3) {
        strategies.push("diplomatic");
      }
  }

  return [...new Set(strategies)];
}

// ─── Recommended Approach ────────────────────────────────────────────────────

function buildRecommendedApproach(
  situation: SituationType,
  accountabilityLevel: AccountabilityLevel,
  state: ConversationState
): string {
  switch (situation) {
    case "late_submission":
    case "missed_deadline":
      return "ACKNOWLEDGE + ACCOUNTABILITY + EXPLANATION (if available) + NEW TIMELINE + REQUEST";
    case "late_arrival":
    case "missed_interview":
      return "APOLOGY + CONCISE EXPLANATION (if available) + ETA/RESCHEDULE + RESPECT";
    case "missed_meeting":
      return "ACKNOWLEDGEMENT + ACCOUNTABILITY + RESCHEDULE PROPOSAL";
    case "wrong_file":
      return "ACKNOWLEDGE + CORRECT + APOLOGIZE BRIEFLY";
    case "customer_complaint":
      return "ACKNOWLEDGE + EMPATHY + SOLUTION + TIMELINE";
    case "negotiation":
      return "OBJECTIVE + RATIONALE + VALUE + ALTERNATIVE + COMPROMISE";
    case "disagreement":
    case "heated_argument":
    case "personal_conflict":
      if (state.conflict.level > 0.6) {
        return "ACKNOWLEDGE THEIR PERSPECTIVE + CLARIFY YOUR POSITION + BOUNDARIES + PATH FORWARD";
      }
      return "ACKNOWLEDGE + CLARIFY + FIND COMMON GROUND + PROPOSE SOLUTION";
    case "misunderstanding":
      return "CLARIFY + ACKNOWLEDGE COMMUNICATION GAP + CONFIRM UNDERSTANDING";
    default:
      if (accountabilityLevel === "full") {
        return "ACKNOWLEDGE + ACCOUNTABILITY + NEXT STEP";
      }
      return "RESPOND APPROPRIATELY + NEXT STEP";
  }
}

// ─── Next Action ─────────────────────────────────────────────────────────────

function determineNextAction(
  situation: SituationType,
  userGoal: UserIntentType
): string {
  if (userGoal === "ask_for_extension") {
    return "Send the extension request with a specific new deadline.";
  }
  if (userGoal === "ask_for_reschedule") {
    return "Send the reschedule request with available times.";
  }
  if (userGoal === "recover_from_mistake") {
    return "Send the accountable response with a concrete next step.";
  }
  if (userGoal === "de_escalate") {
    return "Send the de-escalation response focused on resolution.";
  }
  if (userGoal === "negotiate") {
    return "Send the negotiation proposal with clear terms.";
  }
  if (userGoal === "convince" || userGoal === "persuade") {
    return "Send the persuasive response with evidence and options.";
  }

  switch (situation) {
    case "late_submission":
    case "missed_deadline":
      return "Send the acknowledgement with a specific new deadline.";
    case "late_arrival":
    case "missed_interview":
      return "Send the apology with ETA or reschedule request.";
    case "missed_meeting":
      return "Send the acknowledgement and propose a new time.";
    case "wrong_file":
      return "Send the correct file with a brief apology.";
    case "customer_complaint":
      return "Send the empathetic response with a solution.";
    case "negotiation":
      return "Send the negotiation proposal.";
    case "disagreement":
    case "heated_argument":
    case "personal_conflict":
      return "Send the response focused on understanding and resolution.";
    default:
      return "Send the appropriate response.";
  }
}

// ─── Candidate Guidance Builder ──────────────────────────────────────────────

function buildCandidateGuidance(
  situation: SituationType,
  strategies: CommunicationStrategy[],
  state: ConversationState
): CandidateGuidance[] {
  const guidance: CandidateGuidance[] = [];

  for (const strategy of strategies.slice(0, 4)) {
    guidance.push({
      strategy,
      structure: getStructureForStrategy(situation, strategy),
      tone: getToneForStrategy(strategy, state),
      length: getLengthForSituation(situation, strategy),
      avoid: getAvoidList(situation, strategy),
    });
  }

  return guidance;
}

function getStructureForStrategy(
  situation: SituationType,
  strategy: CommunicationStrategy
): string[] {
  if (
    situation === "late_submission" ||
    situation === "missed_deadline"
  ) {
    return ["acknowledge", "accountability", "explanation (if available)", "new timeline", "request"];
  }
  if (
    situation === "late_arrival" ||
    situation === "missed_interview"
  ) {
    return ["apology", "concise explanation (if available)", "ETA or reschedule", "respect"];
  }
  if (situation === "customer_complaint") {
    return ["acknowledge", "empathy", "solution", "timeline"];
  }
  if (situation === "negotiation") {
    return ["objective", "rationale", "value", "alternative", "compromise"];
  }
  if (
    situation === "disagreement" ||
    situation === "heated_argument" ||
    situation === "personal_conflict"
  ) {
    return ["acknowledge their perspective", "clarify your position", "boundaries", "path forward"];
  }

  switch (strategy) {
    case "accountable":
      return ["acknowledge", "take responsibility", "next step"];
    case "diplomatic":
      return ["acknowledge", "present perspective", "find common ground"];
    case "persuasive":
      return ["state position", "provide rationale", "show benefit", "make request"];
    case "empathetic":
      return ["acknowledge feeling", "show understanding", "offer support"];
    case "de_escalate":
      return ["acknowledge concern", "lower tension", "focus on resolution"];
    case "assertive":
      return ["state position clearly", "provide reasoning", "set boundary"];
    default:
      return ["respond naturally", "continue conversation"];
  }
}

function getToneForStrategy(
  strategy: CommunicationStrategy,
  state: ConversationState
): string {
  if (state.context.type === "professional" || state.context.type === "interview") {
    return "professional and respectful";
  }
  if (state.context.type === "dating") {
    return "warm and genuine";
  }
  if (state.conflict.level > 0.5) {
    return "calm and measured";
  }

  switch (strategy) {
    case "accountable":
      return "sincere and direct";
    case "diplomatic":
      return "balanced and considerate";
    case "persuasive":
      return "confident and reasonable";
    case "empathetic":
      return "understanding and supportive";
    case "de_escalate":
      return "calm and solution-focused";
    case "assertive":
      return "clear and firm but respectful";
    case "professional":
      return "formal and competent";
    case "concise":
      return "brief and to the point";
    default:
      return "natural and appropriate";
  }
}

function getLengthForSituation(
  situation: SituationType,
  strategy: CommunicationStrategy
): "short" | "medium" | "long" {
  if (strategy === "concise") return "short";
  if (strategy === "persuasive") return "medium";
  if (situation === "negotiation") return "medium";
  if (situation === "customer_complaint") return "medium";
  if (situation === "wrong_file") return "short";
  if (situation === "delayed_response" || situation === "missed_call") return "short";
  return "medium";
}

function getAvoidList(
  situation: SituationType,
  strategy: CommunicationStrategy
): string[] {
  const baseAvoid = [
    "Fabricating excuses",
    "Inventing emergencies",
    "Over-explaining",
    "Blaming others",
  ];

  if (
    situation === "late_submission" ||
    situation === "missed_deadline" ||
    situation === "late_arrival"
  ) {
    baseAvoid.push(
      "Inventing personal problems",
      "Making unguaranteeable promises",
      "Excessive apologizing without substance"
    );
  }

  if (situation === "customer_complaint") {
    baseAvoid.push("Being defensive", "Minimizing concerns", "Making false promises");
  }

  if (situation === "negotiation") {
    baseAvoid.push("Ultimatums", "Manipulation", "Pressure tactics");
  }

  if (
    situation === "disagreement" ||
    situation === "heated_argument" ||
    situation === "personal_conflict"
  ) {
    baseAvoid.push("Personal attacks", "Escalation", "Dismissive language");
  }

  if (strategy === "concise") {
    baseAvoid.push("Long explanations", "Unnecessary details");
  }

  return [...new Set(baseAvoid)];
}

// ─── Conflict Adjustments ────────────────────────────────────────────────────

function applyConflictAdjustments(
  recovery: SituationRecovery,
  state: ConversationState
): void {
  const conflict = state.conflict;

  if (conflict.level > 0.5) {
    recovery.conflictAdjusted = true;

    if (!recovery.recommendedStrategies.includes("de_escalate")) {
      recovery.recommendedStrategies.unshift("de_escalate");
    }

    recovery.riskyElements.push("Matching aggressive tone");
    recovery.riskyElements.push("Escalating the conflict");

    if (conflict.personalAttacks) {
      recovery.riskyElements.push("Responding with personal attacks");
    }
  }

  if (conflict.escalation > 0.5) {
    recovery.severity = "high";

    const requiredIdx = recovery.requiredElements.findIndex(
      (e) => e.element === "boundaries"
    );
    if (requiredIdx === -1) {
      recovery.requiredElements.push({
        element: "boundaries",
        description: "Set clear boundaries to prevent escalation",
        priority: "required",
      });
    }
  }
}

// ─── Group Adjustments ───────────────────────────────────────────────────────

function applyGroupAdjustments(
  recovery: SituationRecovery,
  state: ConversationState
): void {
  if (!state.participants.isGroup) return;

  recovery.groupAdjusted = true;

  recovery.riskyElements.push("Assigning blame to specific individuals");
  recovery.riskyElements.push("Speaking for others without permission");

  const groupRequired: RecoveryRequiredElement = {
    element: "shared_responsibility",
    description: "Acknowledge shared responsibility if applicable",
    priority: "recommended",
  };

  const hasShared = recovery.requiredElements.some(
    (e) => e.element === "shared_responsibility"
  );
  if (!hasShared) {
    recovery.requiredElements.push(groupRequired);
  }
}

// ─── Language Adjustments ────────────────────────────────────────────────────

function applyLanguageAdjustments(
  recovery: SituationRecovery,
  state: ConversationState
): void {
  const lang = state.language;

  if (lang.codeMixed || lang.romanized) {
    recovery.languageAdjusted = true;
  }

  if (state.style.profile) {
    const profile = state.style.profile;

    if (state.context.type === "professional" || state.context.type === "interview") {
      if (profile.tonePreference.formality === "very_casual") {
        recovery.riskyElements.push(
          "Using overly casual language in professional context"
        );
      }
    }
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────────

export function logSituationRecovery(recovery: SituationRecovery): void {
  if (process.env.NEXTMSG_DEBUG_AI !== "true") return;

  console.log("[NEXTMSG AI DEBUG] Situation recovery:", {
    situation: recovery.situation,
    severity: recovery.severity,
    userGoal: recovery.userGoal,
    accountabilityLevel: recovery.accountabilityLevel,
    recommendedStrategies: recovery.recommendedStrategies,
    requiredElements: recovery.requiredElements.length,
    riskyElements: recovery.riskyElements.length,
    conflictAdjusted: recovery.conflictAdjusted,
    groupAdjusted: recovery.groupAdjusted,
    languageAdjusted: recovery.languageAdjusted,
    candidateGuidanceCount: recovery.candidateGuidance.length,
  });
}
