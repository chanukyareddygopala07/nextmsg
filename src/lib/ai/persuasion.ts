// ─── Persuasion Engine ───────────────────────────────────────────────────────
//
// First-class capability for persuasive communication.
// Builds structured persuasive responses from user position, concerns,
// evidence, benefits, tradeoffs, and requests.
//
// Core principle: Persuasion acknowledges concerns, explains reasoning,
// provides evidence, offers options, and creates reasonable requests.
// Never manipulates or pressures.
// ──────────────────────────────────────────────────────────────────────────────

import type { ConversationState } from "./conversation-state";
import type {
  SituationType,
  UserIntentType,
  RelationshipType,
} from "./intelligence";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PersuasionMode = "direct" | "value_based" | "compromise" | "evidence_based";

export interface PersuasiveElement {
  type: "position" | "concern" | "evidence" | "benefit" | "tradeoff" | "request" | "alternative";
  content: string;
  source: "user" | "inferred";
  verified: boolean;
}

export interface PersuasionStrategy {
  mode: PersuasionMode;
  elements: PersuasiveElement[];
  structure: string[];
  tone: string;
  length: "short" | "medium" | "long";
  avoid: string[];
}

export interface PersuasionAssessment {
  situation: SituationType;
  userIntent: UserIntentType;
  relationship: RelationshipType;
  persuasionFeasibility: "high" | "medium" | "low";
  appropriateModes: PersuasionMode[];
  risks: string[];
  ethicalBoundaries: string[];
}

export interface PersuasionEngine {
  assessment: PersuasionAssessment;
  strategies: PersuasionStrategy[];
  recommendedMode: PersuasionMode;
  guidance: string[];
}

// ─── Persuasion Feasibility Assessment ───────────────────────────────────────

function assessPersuasionFeasibility(
  state: ConversationState
): PersuasionAssessment {
  const situation = state.context.situation;
  const userIntent = state.intent.userIntent;
  const relationship = state.relationship;
  const conflictLevel = state.conflict.level;

  const appropriateModes: PersuasionMode[] = [];
  const risks: string[] = [];
  const ethicalBoundaries: string[] = [
    "Never fabricate evidence or facts",
    "Never manipulate or pressure",
    "Never make promises you cannot keep",
    "Respect the other person's autonomy",
    "Present information honestly",
  ];

  let feasibility: "high" | "medium" | "low" = "medium";

  if (
    userIntent === "persuade" ||
    userIntent === "convince" ||
    userIntent === "negotiate"
  ) {
    appropriateModes.push("direct", "value_based");
  }

  if (
    situation === "negotiation" ||
    situation === "request" ||
    userIntent === "ask_for_extension" ||
    userIntent === "ask_for_reschedule"
  ) {
    appropriateModes.push("compromise", "evidence_based");
    feasibility = "high";
  }

  if (
    situation === "disagreement" ||
    situation === "heated_argument" ||
    situation === "personal_conflict"
  ) {
    if (conflictLevel > 0.6) {
      feasibility = "low";
      risks.push("Persuasion may escalate conflict");
      risks.push("May be perceived as dismissive");
    } else {
      appropriateModes.push("evidence_based");
    }
  }

  if (
    relationship === "manager" ||
    relationship === "professor" ||
    relationship === "interviewer" ||
    relationship === "client"
  ) {
    appropriateModes.push("evidence_based");
    ethicalBoundaries.push("Maintain professional boundaries");
  }

  if (relationship === "partner" || relationship === "date" || relationship === "romantic_interest") {
    appropriateModes.push("value_based");
    ethicalBoundaries.push("Respect emotional boundaries");
  }

  if (situation === "rejection") {
    feasibility = "low";
    risks.push("Persuasion after rejection may be unwelcome");
    ethicalBoundaries.push("Respect their decision");
  }

  if (appropriateModes.length === 0) {
    appropriateModes.push("direct");
  }

  return {
    situation,
    userIntent,
    relationship,
    persuasionFeasibility: feasibility,
    appropriateModes: [...new Set(appropriateModes)],
    risks,
    ethicalBoundaries,
  };
}

// ─── Strategy Builder ────────────────────────────────────────────────────────

function buildPersuasionStrategies(
  assessment: PersuasionAssessment,
  state: ConversationState
): PersuasionStrategy[] {
  const strategies: PersuasionStrategy[] = [];

  for (const mode of assessment.appropriateModes) {
    strategies.push({
      mode,
      elements: [],
      structure: getStructureForMode(mode),
      tone: getToneForMode(mode, state),
      length: getLengthForMode(mode, assessment.situation),
      avoid: getAvoidForMode(mode),
    });
  }

  return strategies;
}

function getStructureForMode(
  mode: PersuasionMode
): string[] {
  switch (mode) {
    case "direct":
      return [
        "state your position clearly",
        "explain your reasoning",
        "make a specific request",
        "offer a concrete next step",
      ];
    case "value_based":
      return [
        "acknowledge their concern",
        "explain mutual benefit",
        "present your position",
        "offer options",
        "make a reasonable request",
      ];
    case "compromise":
      return [
        "acknowledge their position",
        "state your objective",
        "present alternative options",
        "show willingness to compromise",
        "propose a middle ground",
      ];
    case "evidence_based":
      return [
        "state your position",
        "provide supporting evidence",
        "address their concern",
        "present facts",
        "make a reasoned request",
      ];
    default:
      return ["respond appropriately"];
  }
}

function getToneForMode(
  mode: PersuasionMode,
  state: ConversationState
): string {
  if (state.context.type === "professional" || state.context.type === "interview") {
    return "professional and respectful";
  }
  if (state.conflict.level > 0.5) {
    return "calm and measured";
  }

  switch (mode) {
    case "direct":
      return "clear and confident";
    case "value_based":
      return "collaborative and mutual";
    case "compromise":
      return "flexible and reasonable";
    case "evidence_based":
      return "factual and reasoned";
    default:
      return "appropriate and respectful";
  }
}

function getLengthForMode(
  mode: PersuasionMode,
  situation: SituationType
): "short" | "medium" | "long" {
  if (mode === "direct") return "short";
  if (mode === "evidence_based") return "medium";
  if (situation === "negotiation") return "medium";
  return "medium";
}

function getAvoidForMode(
  mode: PersuasionMode
): string[] {
  const avoid: string[] = [
    "Fabricating evidence",
    "Making false promises",
    "Manipulation",
    "Pressure tactics",
    "Ultimatums",
  ];

  if (mode === "direct") {
    avoid.push("Aggressive language", "Demanding tone");
  }
  if (mode === "compromise") {
    avoid.push("Giving up everything", "Being submissive");
  }
  if (mode === "evidence_based") {
    avoid.push("Cherry-picking facts", "Misrepresenting data");
  }

  return [...new Set(avoid)];
}

// ─── Guidance Builder ────────────────────────────────────────────────────────

function buildPersuasionGuidance(
  assessment: PersuasionAssessment,
  state: ConversationState
): string[] {
  const guidance: string[] = [];

  guidance.push(
    "Always acknowledge the other person's perspective before presenting your position."
  );

  if (assessment.persuasionFeasibility === "high") {
    guidance.push(
      "Strong opportunity for persuasion. Focus on mutual benefit and concrete options."
    );
  } else if (assessment.persuasionFeasibility === "medium") {
    guidance.push(
      "Moderate opportunity. Be measured and factual. Avoid pressure."
    );
  } else {
    guidance.push(
      "Limited opportunity for persuasion. Focus on clarity and respect."
    );
  }

  if (
    assessment.situation === "negotiation" ||
    assessment.userIntent === "negotiate"
  ) {
    guidance.push(
      "Present clear objectives with rationale. Offer alternatives. Show flexibility."
    );
  }

  if (
    assessment.userIntent === "ask_for_extension" ||
    assessment.userIntent === "ask_for_reschedule"
  ) {
    guidance.push(
      "Be specific about what you need and when. Show you respect their time."
    );
  }

  if (
    assessment.situation === "disagreement" ||
    assessment.situation === "heated_argument"
  ) {
    guidance.push(
      "Focus on understanding, not winning. Seek common ground."
    );
  }

  if (state.conflict.level > 0.5) {
    guidance.push(
      "Conflict is elevated. Prioritize de-escalation over persuasion."
    );
  }

  return guidance;
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

export function buildPersuasionEngine(
  state: ConversationState
): PersuasionEngine {
  const assessment = assessPersuasionFeasibility(state);
  const strategies = buildPersuasionStrategies(assessment, state);
  const guidance = buildPersuasionGuidance(assessment, state);

  return {
    assessment,
    strategies,
    recommendedMode: assessment.appropriateModes[0] || "direct",
    guidance,
  };
}

// ─── Logging ─────────────────────────────────────────────────────────────────

export function logPersuasionEngine(engine: PersuasionEngine): void {
  if (process.env.NEXTMSG_DEBUG_AI !== "true") return;

  console.log("[NEXTMSG AI DEBUG] Persuasion engine:", {
    situation: engine.assessment.situation,
    feasibility: engine.assessment.persuasionFeasibility,
    appropriateModes: engine.assessment.appropriateModes,
    recommendedMode: engine.recommendedMode,
    strategyCount: engine.strategies.length,
    risksCount: engine.assessment.risks.length,
  });
}
