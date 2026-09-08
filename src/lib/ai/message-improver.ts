// ─── Message Improvement Engine ─────────────────────────────────────────────
//
// Phase 4 Step 3: Context-Aware Communication Rewriting
//
// Core principle: Improve HOW the user communicates without changing WHAT they mean.
//
// Architecture:
//   Draft + Mode + ConversationState
//   → Preservation Contract
//   → Generator (reused)
//   → Humanizer (reused)
//   → Quality Validator (reused)
//   → Ranker (reused)
//   → 3–5 improved candidates
// ──────────────────────────────────────────────────────────────────────────────

import type { AIProvider } from "./provider";
import type { ConversationContext } from "./context";
import type { ConversationState } from "./conversation-state";
import type { DraftAnalysis, DraftAnalysisInput, ImprovementMode } from "./draft-types";
import type { StrategyRecommendation } from "./strategy";
import type { SituationRecovery, UserFact } from "./situation-recovery";
import type { PersuasionEngine } from "./persuasion";
import type { MemoryRecord, ConflictCoachingOutput, ResolutionRecord } from "./memory-types";
import {
  createPreservationContract,
  validatePreservation,
  type PreservationContract,
  type LanguageState,
} from "./preservation";
import { generateReplies } from "./generator";
import { humanizeReplies } from "./humanizer";
import { validateCandidates, type QualityGateConfig } from "./quality-validator";
import { rankReplies } from "./ranker";
import { buildConversationText } from "./prompt-builder";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MessageImprovementInput {
  /** The original draft to improve */
  draft: string;
  /** How to improve the message */
  mode: ImprovementMode;
  /** Current conversation messages */
  messages: Array<{ sender: "me" | "them" | "unknown"; text: string }>;
  /** Existing draft analysis (to avoid re-analyzing) */
  analysis?: DraftAnalysis;
  /** User's stated goal */
  goal?: string;
  /** Platform */
  platform?: string;
  /** User facts for preservation */
  userFacts?: string[];
}

export interface MessageImprovementResult {
  /** The original draft unchanged */
  originalDraft: string;
  /** The selected improvement mode */
  mode: ImprovementMode;
  /** Recommended mode based on context */
  recommendedMode: ImprovementMode;
  /** Improved candidates */
  candidates: ImprovedCandidate[];
  /** Preservation status */
  preservation: PreservationStatus;
  /** Index of the recommended candidate */
  recommendedCandidate: number;
  /** Language state used */
  languageState: {
    primary: string;
    script: string;
    romanized: boolean;
    codeMixed: boolean;
  };
  /** Delta from original */
  delta: ImprovementDelta;
}

export interface ImprovedCandidate {
  /** The improved text */
  text: string;
  /** The strategy used */
  strategy: string;
  /** Confidence score */
  confidence: number;
  /** Rationale for this improvement */
  rationale: string;
}

export interface PreservationStatus {
  /** Overall preservation passed */
  passed: boolean;
  /** Intent preserved */
  intent: boolean;
  /** Goal preserved */
  goal: boolean;
  /** Facts preserved */
  facts: boolean;
  /** Position preserved */
  position: boolean;
  /** Boundaries preserved */
  boundaries: boolean;
  /** Language preserved */
  language: boolean;
  /** Style preserved */
  style: boolean;
  /** Issues if any */
  issues: string[];
}

export interface ImprovementDelta {
  /** Clarity improvement */
  clarity: "improved" | "same" | "reduced";
  /** Professionalism change */
  professionalism: "improved" | "same" | "reduced";
  /** Naturalness change */
  naturalness: "improved" | "same" | "reduced";
  /** Length change */
  lengthChange: number;
}

// ─── Smart Mode Recommendation ──────────────────────────────────────────────

export function recommendMode(
  draft: string,
  analysis?: DraftAnalysis,
  state?: ConversationState
): ImprovementMode {
  // If no analysis or state, use default
  if (!analysis && !state) {
    return "keep_meaning_improve_clarity";
  }

  const draftLower = draft.toLowerCase();

  // High escalation risk → Diplomatic
  if (analysis && analysis.escalationRisk > 0.7) {
    return "more_diplomatic";
  }

  // Low clarity → Improve Clarity
  if (analysis && analysis.clarity < 0.4) {
    return "keep_meaning_improve_clarity";
  }

  // Professional context + casual draft → More Professional
  if (state?.context.type === "professional" || state?.context.type === "interview") {
    if (analysis?.tone.primary === "casual" || analysis?.tone.primary === "playful") {
      return "more_professional";
    }
  }

  // Dating context + overly formal draft → More Natural/Playful
  if (state?.context.type === "dating") {
    if (analysis?.tone.primary === "formal" || analysis?.tone.primary === "professional") {
      return "more_natural";
    }
    // Already casual dating → More Playful
    if (analysis?.tone.primary === "casual" && analysis?.clarity > 0.7) {
      return "more_playful";
    }
  }

  // Goal = persuasion → More Persuasive
  if (state?.intent.userIntent === "persuade" || state?.intent.userIntent === "convince") {
    return "more_persuasive";
  }

  // Conflict context → More Diplomatic
  if (state && state.conflict.level > 0.5) {
    return "more_diplomatic";
  }

  // Boundary setting → More Assertive
  if (analysis?.intent === "set_boundary" || state?.intent.userIntent === "set_boundary") {
    return "more_assertive";
  }

  // Apology → More Empathetic
  if (analysis?.intent === "apologize" || state?.intent.userIntent === "apologize") {
    return "more_empathetic";
  }

  // Already strong draft → Keep Meaning, Improve Clarity
  if (analysis && analysis.clarity > 0.8 && analysis.escalationRisk < 0.3) {
    return "keep_meaning_improve_clarity";
  }

  // Default
  return "keep_meaning_improve_clarity";
}

// ─── Mode Instructions ──────────────────────────────────────────────────────

const MODE_INSTRUCTIONS: Record<ImprovementMode, string> = {
  keep_meaning_improve_clarity:
    "Keep the exact same meaning but make it clearer. Preserve all facts, dates, times, numbers, and intent.",
  more_professional:
    "Make it more professional while preserving meaning. Use appropriate formality. Do not invent facts or excuses.",
  more_diplomatic:
    "Make it more diplomatic and tactful. Reduce confrontation while preserving position and intent.",
  more_assertive:
    "Make it more assertive and direct. State needs clearly without aggression. Preserve boundaries.",
  more_empathetic:
    "Make it more empathetic and understanding. Show emotional awareness while preserving facts.",
  more_concise:
    "Make it shorter and more concise. Preserve all critical information while reducing word count.",
  more_persuasive:
    "Make it more persuasive. Strengthen reasoning without fabricating evidence. Preserve position.",
  more_natural:
    "Make it sound more natural and conversational. Match the user's casual style when appropriate.",
  more_playful:
    "Make it more playful and lighthearted. Add humor only when context supports it. Preserve meaning.",
  more_flirty:
    "Make it more flirtatious. Add romantic interest naturally. Only when dating context supports it.",
};

// ─── Main Improvement Function ──────────────────────────────────────────────

export async function improveMessage(
  provider: AIProvider,
  input: MessageImprovementInput,
  state: ConversationState,
  strategies?: StrategyRecommendation[],
  recovery?: SituationRecovery,
  persuasion?: PersuasionEngine,
  userFacts?: UserFact[],
  relevantMemory?: MemoryRecord[],
  conflictCoaching?: ConflictCoachingOutput,
  relevantResolutions?: ResolutionRecord[]
): Promise<MessageImprovementResult> {
  const { draft, mode, messages, analysis } = input;

  // 1. Create preservation contract
  const languageState: LanguageState = {
    primary: state.language.primary,
    script: state.language.script,
    romanized: state.language.romanized,
    codeMixed: state.language.codeMixed,
  };
  const preservationContract = createPreservationContract(draft, languageState);

  // 2. Recommend mode (optional, user can override)
  const recommendedMode = recommendMode(draft, analysis, state);

  // 3. Build improvement-specific prompt with mode instructions
  const modeInstruction = MODE_INSTRUCTIONS[mode];

  // 4. Generate candidates using existing generator
  const conversationText = buildConversationText(messages);
  const lastSender = messages[messages.length - 1]?.sender || "unknown";

  // Build the improvement prompt
  const improvementPrompt = buildImprovementPrompt(
    draft,
    mode,
    modeInstruction,
    preservationContract,
    conversationText,
    state
  );

  // Map script type to ConversationContext script
  const scriptMap: Record<string, "romanized" | "native" | "english" | "mixed"> = {
    latin: "romanized",
    devanagari: "native",
    telugu: "native",
    mixed: "mixed",
    english: "english",
    unknown: "english",
  };

  // Generate candidates
  const generationResult = await generateReplies(
    provider,
    messages,
    {
      language: state.language.primary,
      script: scriptMap[state.language.script] || "english",
      conversationType: state.context.type as "general" | "professional" | "dating" | "conflict" | "academic" | "interview" | "friendship" | "family" | "customer" | "negotiation" | "social",
      participants: state.participants.count,
      goal: state.intent.userGoal,
      tone: state.tone.primary,
      urgency: state.context.urgency as "low" | "normal" | "high" | "urgent",
      userStyle: state.style.preferred,
      platform: state.context.platform,
    },
    state,
    strategies,
    recovery,
    persuasion,
    userFacts,
    relevantMemory,
    conflictCoaching,
    relevantResolutions
  );

  if (generationResult.error || generationResult.candidates.length === 0) {
    // Fallback: return original draft with minimal improvement
    return {
      originalDraft: draft,
      mode,
      recommendedMode,
      candidates: [
        {
          text: draft,
          strategy: "natural",
          confidence: 0.5,
          rationale: "Original draft (generation failed)",
        },
      ],
      preservation: {
        passed: true,
        intent: true,
        goal: true,
        facts: true,
        position: true,
        boundaries: true,
        language: true,
        style: true,
        issues: [],
      },
      recommendedCandidate: 0,
      languageState: {
        primary: state.language.primary,
        script: state.language.script,
        romanized: state.language.romanized,
        codeMixed: state.language.codeMixed,
      },
      delta: {
        clarity: "same",
        professionalism: "same",
        naturalness: "same",
        lengthChange: 0,
      },
    };
  }

  // 5. Humanize candidates
  const humanizationResult = await humanizeReplies(
    provider,
    generationResult.candidates,
    {
      language: state.language.primary,
      script: scriptMap[state.language.script] || "english",
      conversationType: state.context.type as "general" | "professional" | "dating" | "conflict" | "academic" | "interview" | "friendship" | "family" | "customer" | "negotiation" | "social",
      participants: state.participants.count,
      goal: state.intent.userGoal,
      tone: state.tone.primary,
      urgency: state.context.urgency as "low" | "normal" | "high" | "urgent",
      userStyle: state.style.preferred,
      platform: state.context.platform,
    },
    state
  );

  const candidatesToValidate = humanizationResult.humanized;

  // 6. Validate with preservation checks
  const originalTexts = candidatesToValidate.map(() => draft);
  const preservationContracts = candidatesToValidate.map(() => preservationContract);

  const validationResult = validateCandidates(
    candidatesToValidate,
    state,
    originalTexts,
    undefined,
    preservationContracts
  );

  // 7. Rank candidates
  const analysisObj = {
    stage: "rapport" as const,
    engagement: 0.5,
    flirting: 0.3,
    humor: 0.3,
    reciprocity: 0.5,
    conversationHealth: 0.5,
  };

  const rankedCandidates = rankReplies(
    validationResult.passedCandidates,
    analysisObj,
    input.goal,
    state,
    strategies,
    recovery
  );

  // 8. Build results
  const improvedCandidates: ImprovedCandidate[] = rankedCandidates.map((rc, idx) => {
    const preservationResult = validatePreservation(preservationContract, rc.text);
    return {
      text: rc.text,
      strategy: rc.strategy,
      confidence: rc.score,
      rationale: generateRationale(rc.text, draft, mode, preservationResult.details),
    };
  });

  // 9. Check overall preservation
  const overallPreservation = checkOverallPreservation(draft, improvedCandidates, preservationContract);

  // 10. Calculate delta
  const delta = calculateDelta(draft, improvedCandidates[0]?.text || draft, analysis);

  return {
    originalDraft: draft,
    mode,
    recommendedMode,
    candidates: improvedCandidates.slice(0, 5), // Max 5 candidates
    preservation: overallPreservation,
    recommendedCandidate: 0,
    languageState: {
      primary: state.language.primary,
      script: state.language.script,
      romanized: state.language.romanized,
      codeMixed: state.language.codeMixed,
    },
    delta,
  };
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function buildImprovementPrompt(
  draft: string,
  mode: ImprovementMode,
  modeInstruction: string,
  preservationContract: PreservationContract,
  conversationText: string,
  state: ConversationState
): string {
  const parts: string[] = [];

  parts.push("## Improvement Task");
  parts.push(`Original draft: "${draft}"`);
  parts.push(`Improvement mode: ${mode}`);
  parts.push(`Mode instruction: ${modeInstruction}`);

  // Add preservation constraints
  parts.push("\n## Critical Preservation Constraints");
  parts.push("The improved message MUST preserve:");

  if (preservationContract.semanticConstraints.negations.length > 0) {
    const negations = preservationContract.semanticConstraints.negations.map((n) => n.word).join(", ");
    parts.push(`- Negation: ${negations}`);
  }

  if (preservationContract.semanticConstraints.temporalConstraints.length > 0) {
    const temporal = preservationContract.semanticConstraints.temporalConstraints.map((t) => t.value).join(", ");
    parts.push(`- Temporal: ${temporal}`);
  }

  if (preservationContract.semanticConstraints.abilityConstraints.length > 0) {
    const ability = preservationContract.semanticConstraints.abilityConstraints.map((a) => a.word).join(", ");
    parts.push(`- Ability/availability: ${ability}`);
  }

  if (preservationContract.semanticConstraints.position) {
    parts.push(`- Position: ${preservationContract.semanticConstraints.position.type}`);
  }

  if (preservationContract.semanticConstraints.boundaries.length > 0) {
    parts.push("- Boundaries must be preserved");
  }

  if (preservationContract.semanticConstraints.factualClaims.length > 0) {
    const facts = preservationContract.semanticConstraints.factualClaims.map((f) => f.value).join(", ");
    parts.push(`- Facts: ${facts}`);
  }

  parts.push("\n## What MUST NOT Change");
  parts.push("- User intent");
  parts.push("- User's position or stance");
  parts.push("- Boundaries");
  parts.push("- Commitments");
  parts.push("- Factual claims");
  parts.push("- Named entities");
  parts.push("- Language/script preference");

  parts.push("\n## What CAN Change");
  parts.push("- Wording and sentence structure");
  parts.push("- Tone and formality");
  parts.push("- Naturalness and conversational flow");
  parts.push("- Conciseness");
  parts.push("- Professionalism");
  parts.push("- Diplomacy");
  parts.push("- Empathy");
  parts.push("- Assertiveness");
  parts.push("- Playfulness (when appropriate)");

  return parts.join("\n");
}

function generateRationale(
  improved: string,
  original: string,
  mode: ImprovementMode,
  preservationDetails: {
    negationPreserved: boolean;
    temporalPreserved: boolean;
    abilityPreserved: boolean;
    positionPreserved: boolean;
    boundaryPreserved: boolean;
    commitmentPreserved: boolean;
    factsPreserved: boolean;
    entitiesPreserved: boolean;
  }
): string {
  const parts: string[] = [];

  // Mode-specific rationale
  const modeRationales: Record<ImprovementMode, string> = {
    keep_meaning_improve_clarity: "Clearer while preserving meaning",
    more_professional: "More professional tone",
    more_diplomatic: "More diplomatic and tactful",
    more_assertive: "More direct and assertive",
    more_empathetic: "More empathetic and understanding",
    more_concise: "More concise while preserving key information",
    more_persuasive: "More persuasive reasoning",
    more_natural: "More natural and conversational",
    more_playful: "More playful and lighthearted",
    more_flirty: "More flirtatious",
  };

  parts.push(modeRationales[mode]);

  // Preservation status
  const preserved = [];
  if (preservationDetails.negationPreserved) preserved.push("negation");
  if (preservationDetails.temporalPreserved) preserved.push("temporal");
  if (preservationDetails.factsPreserved) preserved.push("facts");
  if (preservationDetails.positionPreserved) preserved.push("position");

  if (preserved.length > 0) {
    parts.push(`Preserved: ${preserved.join(", ")}`);
  }

  return parts.join(". ");
}

function checkOverallPreservation(
  draft: string,
  candidates: ImprovedCandidate[],
  preservationContract: PreservationContract
): PreservationStatus {
  const issues: string[] = [];
  let intent = true;
  const goal = true;
  let facts = true;
  let position = true;
  let boundaries = true;
  const language = true;
  const style = true;

  // Check each candidate for preservation
  for (const candidate of candidates) {
    const result = validatePreservation(preservationContract, candidate.text);

    if (!result.passed) {
      issues.push(...result.issues);
    }

    if (!result.details.negationPreserved || !result.details.abilityPreserved) {
      intent = false;
    }

    if (!result.details.factsPreserved) {
      facts = false;
    }

    if (!result.details.positionPreserved) {
      position = false;
    }

    if (!result.details.boundaryPreserved) {
      boundaries = false;
    }
  }

  return {
    passed: issues.length === 0,
    intent,
    goal,
    facts,
    position,
    boundaries,
    language,
    style,
    issues: [...new Set(issues)], // Deduplicate
  };
}

function calculateDelta(
  original: string,
  improved: string,
  analysis?: DraftAnalysis
): ImprovementDelta {
  const originalLength = original.length;
  const improvedLength = improved.length;
  const lengthChange = improvedLength - originalLength;

  // Simple heuristics for delta
  let clarity: "improved" | "same" | "reduced" = "same";
  let professionalism: "improved" | "same" | "reduced" = "same";
  let naturalness: "improved" | "same" | "reduced" = "same";

  // Check clarity improvement
  const originalSentences = original.split(/[.!?]+/).length;
  const improvedSentences = improved.split(/[.!?]+/).length;
  if (improvedSentences > originalSentences && improvedLength > originalLength * 0.8) {
    clarity = "improved";
  } else if (improvedLength < originalLength * 0.5) {
    clarity = "reduced";
  }

  // Check professionalism
  const professionalWords = /\b(appreciate|understand|regarding|pursuant|hereby|furthermore|moreover)\b/i;
  const casualWords = /\b(haha|lol|omg|bruh|nah|yep|nope)\b/i;

  if (professionalWords.test(improved) && !professionalWords.test(original)) {
    professionalism = "improved";
  } else if (casualWords.test(improved) && !casualWords.test(original)) {
    professionalism = "reduced";
  }

  // Check naturalness
  const aiPatterns = /\b(that sounds|i'd love to|i appreciate|please let me know|at your earliest convenience)\b/i;
  if (aiPatterns.test(original) && !aiPatterns.test(improved)) {
    naturalness = "improved";
  } else if (!aiPatterns.test(original) && aiPatterns.test(improved)) {
    naturalness = "reduced";
  }

  return {
    clarity,
    professionalism,
    naturalness,
    lengthChange,
  };
}
