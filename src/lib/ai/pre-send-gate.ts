// ─── Pre-Send Quality Gate Engine ───────────────────────────────────────────
//
// Phase 4 Step 6: Final quality gate before a user sends a message.
//
// 18 deterministic checks → severity-aware decision → READY | REVIEW | HIGH_RISK
//
// Design:
//   - NOT a niceness filter — assertiveness, disagreement, flirting, boundaries,
//     persuasion, and criticism are all legitimate communication
//   - HIGH_RISK ONLY for genuine semantic, factual, deception, safety, coercion,
//     or severe communication-risk failures
//   - Emotional discomfort NEVER triggers HIGH_RISK
//   - Critical dimensions (safety, factual, semantic, deception) have veto power
//   - Severity-aware: a single dimension below 0.7 does NOT automatically mean REVIEW
// ──────────────────────────────────────────────────────────────────────────────

import type { ConversationState } from "./conversation-state";
import type { DraftAnalysis } from "./draft-types";
import type { CommunicationImpactPrediction } from "./impact-types";
import type { ConversationCoachingResult } from "./coaching-types";
import {
  createPreservationContract,
  validatePreservation,
  extractFactualClaims,
  type PreservationContract,
  type LanguageState,
} from "./preservation";
import { scoreAILikeness } from "./humanizer";
import {
  type CheckDimension,
  type GateDecision,
  type RiskSeverity,
  type DimensionResult,
  type GateRisk,
  type GateStrength,
  type GateRecommendation,
  type PreSendGateResult,
  type PreSendGateInput,
  CRITICAL_DIMENSIONS,
} from "./pre-send-types";

// ─── Main Gate Function ─────────────────────────────────────────────────────

export async function evaluatePreSendGate(
  input: PreSendGateInput,
  state: ConversationState
): Promise<PreSendGateResult> {
  const { draft, originalDraft, messages, goal, draftAnalysis, impactPrediction } = input;

  const langState: LanguageState = {
    primary: state.language.primary,
    script: state.language.script,
    romanized: state.language.romanized,
    codeMixed: state.language.codeMixed,
  };

  // Create preservation contract from original or final draft
  const compareText = originalDraft || draft;
  const contract = createPreservationContract(compareText, langState);

  // Run all 18 dimension checks
  const dimensionScores: Record<CheckDimension, DimensionResult> = {
    semantic_preservation: checkSemanticPreservation(draft, contract, langState),
    factual_integrity: checkFactualIntegrity(draft, contract, messages),
    goal_alignment: checkGoalAlignment(draft, goal, state),
    context_fit: checkContextFit(draft, state),
    tone_fit: checkToneFit(draft, draftAnalysis, state),
    communication_impact: checkCommunicationImpact(draft, impactPrediction, state),
    escalation_risk: checkEscalationRisk(draft, state),
    defensiveness_risk: checkDefensivenessRisk(draft, state),
    pressure_risk: checkPressureRisk(draft, state),
    misunderstanding_risk: checkMisunderstandingRisk(draft, messages),
    boundary_integrity: checkBoundaryIntegrity(draft, contract, state),
    position_integrity: checkPositionIntegrity(draft, contract, state),
    language_consistency: checkLanguageConsistency(draft, state, compareText),
    style_consistency: checkStyleConsistency(draft, state, compareText),
    safety: checkSafety(draft),
    deception_fabrication: checkDeceptionFabrication(draft, messages, state),
    contradiction: checkContradiction(draft, messages, state),
    clarity: checkClarity(draft, state),
  };

  // Identify risks
  const risks = identifyRisks(dimensionScores);

  // Identify strengths
  const strengths = identifyStrengths(dimensionScores);

  // Classify decision (severity-aware, NOT score-threshold)
  const decision = classifyDecision(dimensionScores, risks);

  // Generate recommendations
  const recommendations = generateRecommendations(risks, dimensionScores);

  // Calculate confidence score (weighted by critical dimensions)
  const confidenceScore = calculateConfidence(dimensionScores, risks);

  // Build summary and explanation
  const summary = buildSummary(decision, risks, strengths);
  const explanation = buildExplanation(decision, dimensionScores, risks);

  // Auto-improve is available when there are fixable issues
  const canAutoImprove = decision !== "READY" && risks.some(
    (r) => r.severity !== "critical" && r.dimension !== "safety"
  );

  return {
    decision,
    confidenceScore,
    dimensionScores,
    risks,
    strengths,
    recommendations,
    summary,
    explanation,
    canAutoImprove,
  };
}

// ─── Check: Semantic Preservation ───────────────────────────────────────────

function checkSemanticPreservation(
  draft: string,
  contract: PreservationContract,
  _langState: LanguageState
): DimensionResult {
  const result = validatePreservation(contract, draft);

  return {
    dimension: "semantic_preservation",
    score: result.score,
    passed: result.passed,
    issues: result.issues,
    explanation: result.passed
      ? "The message preserves your original meaning."
      : `The message may change what you originally meant: ${result.issues.join("; ")}`,
    isCritical: true,
  };
}

// ─── Check: Factual Integrity ───────────────────────────────────────────────

function checkFactualIntegrity(
  draft: string,
  contract: PreservationContract,
  messages: Array<{ sender: string; text: string }>
): DimensionResult {
  const issues: string[] = [];

  // Extract facts from draft
  const draftFacts = extractFactualClaims(draft);
  const originalFacts = contract.semanticConstraints.factualClaims;

  // Check if original facts are preserved
  for (const fact of originalFacts) {
    const preserved = draftFacts.some(
      (df) => df.type === fact.type && df.value.toLowerCase() === fact.value.toLowerCase()
    );
    if (!preserved) {
      issues.push(`Original fact "${fact.value}" was removed or changed`);
    }
  }

  // Check for new fabricated facts that weren't in the original
  for (const df of draftFacts) {
    const isNew = !originalFacts.some(
      (of) => of.type === df.type && of.value.toLowerCase() === df.value.toLowerCase()
    );
    if (isNew) {
      issues.push(`New factual claim "${df.value}" added without context`);
    }
  }

  // Check for specific fabrication patterns (unverifiable claims)
  // Use conversation messages for context, not just the original draft
  const conversationText = messages.map((m) => m.text).join(" ").toLowerCase();

  const fabricationPatterns = [
    { pattern: /my (laptop|computer|phone|car|bike|wifi|internet) (broke|crashed|died|stopped|isn't working|wasn't working)/i, desc: "device malfunction claim" },
    { pattern: /\bi (was|got|felt) (sick|ill|unwell|terrible)\b/i, desc: "illness/injury claim" },
    { pattern: /my (mom|dad|grandmother|grandfather|uncle|aunt|brother|sister|family member) (passed|died|got sick|is in the hospital)/i, desc: "family emergency claim" },
    { pattern: /there was (a )?(flood|earthquake|storm|accident|emergency)/i, desc: "emergency event claim" },
  ];

  for (const { pattern, desc } of fabricationPatterns) {
    if (pattern.test(draft)) {
      // Check if the conversation has any supporting context for this claim
      const hasDeviceContext = /\b(laptop|computer|phone|car|bike|wifi|internet)\b/.test(conversationText);
      const hasIllnessContext = /\b(sick|ill|hospital|doctor|medicine)\b/.test(conversationText);
      const hasEmergencyContext = /\b(flood|earthquake|storm|accident|emergency)\b/.test(conversationText);
      const hasFamilyContext = /\b(mom|dad|grandmother|grandfather|uncle|aunt|brother|sister|family)\b/.test(conversationText);

      const contextMap: Record<string, boolean> = {
        "device malfunction claim": hasDeviceContext,
        "illness/injury claim": hasIllnessContext,
        "family emergency claim": hasFamilyContext,
        "emergency event claim": hasEmergencyContext,
      };

      if (!contextMap[desc]) {
        issues.push(`This claim isn't supported by the conversation: ${desc}`);
      }
    }
  }

  const score = issues.length === 0 ? 1.0 : Math.max(0.1, 1 - (issues.length * 0.2));

  return {
    dimension: "factual_integrity",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Factual claims are consistent."
      : `Factual concerns: ${issues.join("; ")}`,
    isCritical: true,
  };
}

// ─── Check: Goal Alignment ──────────────────────────────────────────────────

function checkGoalAlignment(
  draft: string,
  goal: string | undefined,
  state: ConversationState
): DimensionResult {
  if (!goal) {
    return {
      dimension: "goal_alignment",
      score: 0.7,
      passed: true,
      issues: [],
      explanation: "No goal specified — skipping goal alignment check.",
      isCritical: false,
    };
  }

  const draftLower = draft.toLowerCase();
  const issues: string[] = [];

  // Map goals to expected keywords/patterns
  const goalPatterns: Record<string, { keywords: string[]; antipatterns: string[] }> = {
    ask_for_extension: {
      keywords: ["extension", "extra time", "more time", "deadline", "postpone"],
      antipatterns: [],
    },
    apologize: {
      keywords: ["sorry", "apologize", "my mistake", "my fault", "regret"],
      antipatterns: ["but you", "you also", "you did"],
    },
    de_escalate: {
      keywords: ["understand", "hear you", "see your point", "work together", "resolve"],
      antipatterns: ["you're wrong", "you always", "you never"],
    },
    set_boundary: {
      keywords: ["can't", "won't", "not comfortable", "need to", "important to me"],
      antipatterns: [],
    },
    persuade: {
      keywords: ["think about", "consider", "benefit", "advantage", "opportunity"],
      antipatterns: [],
    },
    continue_conversation: {
      keywords: [],
      antipatterns: [],
    },
    flirt: {
      keywords: [],
      antipatterns: [],
    },
    reject: {
      keywords: [],
      antipatterns: [],
    },
    comfort: {
      keywords: ["here for you", "take your time", "it's okay", "understand"],
      antipatterns: ["get over it", "move on"],
    },
  };

  const goalConfig = goalPatterns[goal];

  if (goalConfig) {
    // Check for goal-supportive keywords
    const hasKeywords = goalConfig.keywords.some((kw) => draftLower.includes(kw));
    // Check for goal-undermining antipatterns
    const hasAntipatterns = goalConfig.antipatterns.some((ap) => draftLower.includes(ap));

    if (goalConfig.keywords.length > 0 && !hasKeywords) {
      issues.push(`Message may not align with goal "${goal.replace(/_/g, " ")}" — consider including relevant language`);
    }
    if (hasAntipatterns) {
      issues.push(`Message contains patterns that may undermine goal "${goal.replace(/_/g, " ")}"`);
    }
  }

  const score = issues.length === 0 ? 0.85 : Math.max(0.3, 0.85 - issues.length * 0.3);

  return {
    dimension: "goal_alignment",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Message aligns with your stated goal."
      : `Goal alignment concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Context Fit ─────────────────────────────────────────────────────

function checkContextFit(
  draft: string,
  state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();
  const wordCount = draft.split(/\s+/).length;
  const situation = state.context.situation;
  const relationship = state.relationship;

  // Conflict contexts: should not be overly casual or dismissive
  if (["heated_argument", "personal_conflict", "disagreement"].includes(situation)) {
    if (draftLower.includes("lol") || draftLower.includes("haha") || draftLower.includes("😂")) {
      issues.push("Casual humor may seem dismissive in a conflict situation");
    }
    if (wordCount < 5) {
      issues.push("Very brief messages may seem dismissive during conflict");
    }
  }

  // Professional contexts: should maintain formality
  if (["manager", "professor", "interviewer", "client", "coworker"].includes(relationship)) {
    if (draftLower.includes("bruh") || draftLower.includes("dude") || draftLower.includes("yo ")) {
      issues.push("Overly casual language may not fit a professional relationship");
    }
  }

  // Group contexts: should be concise
  if (state.participants.isGroup && wordCount > 80) {
    issues.push("Long messages may not be ideal for group conversations");
  }

  // Urgent contexts: should be direct
  if (state.context.urgency === "urgent" && wordCount > 15) {
    issues.push("Consider being more concise in urgent situations");
  }

  const score = issues.length === 0 ? 0.8 : Math.max(0.3, 0.8 - issues.length * 0.25);

  return {
    dimension: "context_fit",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Message fits the conversation context."
      : `Context fit concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Tone Fit ────────────────────────────────────────────────────────

function checkToneFit(
  draft: string,
  draftAnalysis: DraftAnalysis | undefined,
  state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  // If we have a draft analysis, use it
  if (draftAnalysis) {
    const tone = draftAnalysis.tone.primary;
    const situation = state.context.situation;

    // Angry/defensive tone in conflict = escalation risk, not a tone mismatch
    // But angry tone when goal is de_escalate = misalignment
    if (["angry", "sarcastic", "passive_aggressive"].includes(tone)) {
      if (["late_submission", "missed_deadline", "scheduling_problem"].includes(situation)) {
        issues.push(`Tone "${tone}" may be overly intense for this situation`);
      }
    }

    // Flirty tone in professional context
    if (["flirty", "playful"].includes(tone) && state.relationship === "manager") {
      issues.push("Flirty/playful tone may not be appropriate for this relationship");
    }
  }

  // Tone-specific patterns
  const aggressivePatterns = [
    /\b(you always|you never|you always|every time you)\b/i,
    /\b(stupid|idiot|dumb|shut up)\b/i,
  ];

  for (const pattern of aggressivePatterns) {
    if (pattern.test(draft)) {
      issues.push("Aggressive language detected — may escalate the situation");
      break;
    }
  }

  // Sarcasm detection
  const sarcasmPatterns = [
    /\b(oh great|oh wow|oh sure|oh yeah|oh perfect|oh wonderful|oh amazing)\b/i,
    /\b(another (brilliant|genius|amazing|wonderful|great) (idea|suggestion|plan|move))\b/i,
    /\b(what a (surprise|shock|genius|brilliant))\b/i,
  ];

  for (const pattern of sarcasmPatterns) {
    if (pattern.test(draft)) {
      issues.push("Sarcastic tone detected — may escalate the situation");
      break;
    }
  }

  const score = issues.length === 0 ? 0.8 : Math.max(0.3, 0.8 - issues.length * 0.3);

  return {
    dimension: "tone_fit",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Message tone is appropriate."
      : `Tone concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Communication Impact ────────────────────────────────────────────

function checkCommunicationImpact(
  _draft: string,
  impactPrediction: CommunicationImpactPrediction | undefined,
  _state: ConversationState
): DimensionResult {
  if (!impactPrediction) {
    return {
      dimension: "communication_impact",
      score: 0.7,
      passed: true,
      issues: [],
      explanation: "No impact prediction available — default assessment.",
      isCritical: false,
    };
  }

  const issues: string[] = [];

  // High defensiveness risk
  if (impactPrediction.defensivenessRisk > 0.7) {
    issues.push("This message may cause the other person to become defensive");
  }

  // High escalation risk
  if (impactPrediction.escalationRisk > 0.7) {
    issues.push("This message may escalate tensions");
  }

  // High pressure risk
  if (impactPrediction.pressureRisk > 0.7) {
    issues.push("This message may feel pressuring");
  }

  const score = issues.length === 0 ? 0.8 : Math.max(0.3, 0.8 - issues.length * 0.25);

  return {
    dimension: "communication_impact",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Communication impact looks acceptable."
      : `Impact concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Escalation Risk ─────────────────────────────────────────────────

function checkEscalationRisk(
  draft: string,
  state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  const escalationPatterns = [
    { pattern: /\b(you always|you never|every single time)\b/i, desc: "absolute language" },
    { pattern: /\b(unspeakable|unacceptable|pathetic|disgusting)\b/i, desc: "harsh judgment" },
    { pattern: /\b(if you don't|i swear|i'll make sure)\b/i, desc: "threat/ultimatum" },
    { pattern: /\b(you're (wrong|stupid|idiot|incompetent))\b/i, desc: "personal attack" },
    { pattern: /\b(shut up|get lost|go away|leave me alone)\b/i, desc: "aggressive dismissal" },
  ];

  // In conflict situations, some assertive language is expected
  const inConflict = ["heated_argument", "personal_conflict", "disagreement"].includes(
    state.context.situation
  );

  for (const { pattern, desc } of escalationPatterns) {
    if (pattern.test(draft)) {
      // If in conflict, only flag truly severe patterns
      if (inConflict && ["absolute language", "threat/ultimatum"].includes(desc)) {
        continue;
      }
      issues.push(`Escalation risk: ${desc}`);
    }
  }

  const score = issues.length === 0 ? 0.9 : Math.max(0.2, 0.9 - issues.length * 0.25);

  return {
    dimension: "escalation_risk",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "No significant escalation risk detected."
      : `Escalation concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Defensiveness Risk ──────────────────────────────────────────────

function checkDefensivenessRisk(
  draft: string,
  _state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  const defensivenessPatterns = [
    { pattern: /\b(it's not my fault|not my problem|not my responsibility)\b/i, desc: "blame avoidance" },
    { pattern: /\b(but you|you also|you did the same|what about you)\b/i, desc: "deflection" },
    { pattern: /\b(i had to|i had no choice|i was forced)\b/i, desc: "excuse-making" },
    { pattern: /\b(technically|technically speaking|well actually)\b/i, desc: "justification" },
  ];

  for (const { pattern, desc } of defensivenessPatterns) {
    if (pattern.test(draft)) {
      issues.push(`Defensiveness pattern: ${desc}`);
    }
  }

  const score = issues.length === 0 ? 0.85 : Math.max(0.3, 0.85 - issues.length * 0.2);

  return {
    dimension: "defensiveness_risk",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "No defensive patterns detected."
      : `Defensiveness concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Pressure Risk ───────────────────────────────────────────────────

function checkPressureRisk(
  draft: string,
  _state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  const pressurePatterns = [
    { pattern: /\b(right now|immediately|asap|don't wait)\b/i, desc: "urgency pressure" },
    { pattern: /\b(if you (don't|won't)|unless you|otherwise)\b/i, desc: "conditional pressure" },
    { pattern: /\b(i need you to|you have to|you must|you should)\b/i, desc: "directive pressure" },
    { pattern: /\b(this is your last chance|final warning|one last time)\b/i, desc: "ultimatum" },
    { pattern: /\b(everyone else|other people|all my friends)\b/i, desc: "social pressure" },
  ];

  // Boundary-setting language is NOT pressure
  const isBoundarySetting = /\b(stop|don't|not comfortable|not okay|need you to stop|leave me alone)\b/i.test(draft);

  for (const { pattern, desc } of pressurePatterns) {
    if (pattern.test(draft)) {
      // If this is boundary-setting language, skip the pressure flag
      if (isBoundarySetting && desc === "directive pressure") {
        continue;
      }
      issues.push(`Pressure pattern: ${desc}`);
    }
  }

  const score = issues.length === 0 ? 0.85 : Math.max(0.3, 0.85 - issues.length * 0.2);

  return {
    dimension: "pressure_risk",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "No pressure tactics detected."
      : `Pressure concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Misunderstanding Risk ───────────────────────────────────────────

function checkMisunderstandingRisk(
  draft: string,
  messages: Array<{ sender: string; text: string }>
): DimensionResult {
  const issues: string[] = [];

  // Check for ambiguous pronouns without clear referents
  const pronounPatterns = /\b(it|that|this|they|them|those|these)\b/i;
  if (pronounPatterns.test(draft)) {
    // Check if the draft is very short (pronouns more ambiguous in short messages)
    const wordCount = draft.split(/\s+/).length;
    if (wordCount < 8 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]?.text || "";
      if (pronounPatterns.test(lastMessage) && wordCount < 15) {
        issues.push("Short message with pronouns may cause confusion — consider being more specific");
      }
    }
  }

  // Check for vague references
  const vaguePatterns = [
    /\b(you know what i mean|you know|get it|see what i'm saying)\b/i,
    /\b(stuff|things|that thing|you know)\b/i,
  ];

  for (const pattern of vaguePatterns) {
    if (pattern.test(draft)) {
      issues.push("Vague language may lead to misunderstanding");
      break;
    }
  }

  // Check for unclear requests
  const unclearRequestPatterns = [
    /\b(can you (handle|deal with|take care of|sort (it )?out))\b/i,
    /\b(figure (it )?out|make (it )?work)\b/i,
  ];

  for (const pattern of unclearRequestPatterns) {
    if (pattern.test(draft)) {
      issues.push("Unclear request — consider being more specific about what you need");
      break;
    }
  }

  const score = issues.length === 0 ? 0.85 : Math.max(0.3, 0.85 - issues.length * 0.2);

  return {
    dimension: "misunderstanding_risk",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Message is clear and unlikely to be misunderstood."
      : `Misunderstanding risk: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Boundary Integrity ──────────────────────────────────────────────

function checkBoundaryIntegrity(
  draft: string,
  contract: PreservationContract,
  _state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  // Check if original had boundaries that were removed
  const originalBoundaries = contract.semanticConstraints.boundaries;

  for (const boundary of originalBoundaries) {
    const boundaryWords: Record<string, string[]> = {
      "can't": ["can't", "cannot", "unable"],
      "won't": ["won't", "will not", "refuse"],
      not_available: ["not available", "unavailable", "busy"],
      not_possible: ["not possible", "impossible"],
      refusal: ["no", "not interested", "vaddhu"],
    };

    const keywords = boundaryWords[boundary.type] || [];
    const stillPresent = keywords.some((kw) => draftLower.includes(kw));
    if (!stillPresent) {
      issues.push(`Your boundary ("${boundary.type}") appears to have been weakened or removed`);
    }
  }

  // Check for boundary addition that wasn't in the original
  const draftBoundaries = draftLower.match(/\b(can't|cannot|won't|will not|not available|not comfortable)\b/g);
  if (draftBoundaries && originalBoundaries.length === 0 && draftBoundaries.length > 0) {
    // New boundaries added — this is usually fine, note it
    issues.push("New boundary added — make sure this is intentional");
  }

  const score = issues.length === 0 ? 0.9 : Math.max(0.3, 0.9 - issues.length * 0.3);

  return {
    dimension: "boundary_integrity",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Boundaries are preserved."
      : `Boundary concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Position Integrity ──────────────────────────────────────────────

function checkPositionIntegrity(
  draft: string,
  contract: PreservationContract,
  _state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  // Check if original had a position that was flipped
  const originalPosition = contract.semanticConstraints.position;

  if (originalPosition && originalPosition.type !== "neutral") {
    const positionKeywords: Record<string, string[]> = {
      agree: ["agree", "you're right", "good point", "i'm with you"],
      disagree: ["disagree", "don't agree", "not sure about", "i think differently", "i don't think"],
      support: ["support", "i'm with you", "i'm for", "back you up", "i'm behind"],
      oppose: ["oppose", "against", "not for", "can't support", "i can't support"],
    };

    const opposites: Record<string, string> = {
      agree: "disagree",
      disagree: "agree",
      support: "oppose",
      oppose: "support",
    };

    const keywords = positionKeywords[originalPosition.type] || [];
    const oppositeKeywords = positionKeywords[opposites[originalPosition.type]] || [];

    const stillPresent = keywords.some((kw) => draftLower.includes(kw));
    const oppositePresent = oppositeKeywords.some((kw) => draftLower.includes(kw));

    if (oppositePresent) {
      issues.push(`Your position ("${originalPosition.type}") appears to have been flipped to "${opposites[originalPosition.type]}"`);
    } else if (!stillPresent) {
      // Original position not preserved and no opposite — drift detected
      issues.push(`Your position ("${originalPosition.type}") may have drifted`);
    }
  }

  const score = issues.length === 0 ? 0.9 : Math.max(0.2, 0.9 - issues.length * 0.4);

  return {
    dimension: "position_integrity",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Your position is preserved."
      : `Position concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Language Consistency ────────────────────────────────────────────

function checkLanguageConsistency(
  draft: string,
  state: ConversationState,
  originalText: string
): DimensionResult {
  const issues: string[] = [];

  // Check for script switches
  const hasDevanagari = /[\u0900-\u097F]/.test(draft);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(draft);
  const hasLatin = /[a-zA-Z]/.test(draft);

  const originalHasDevanagari = /[\u0900-\u097F]/.test(originalText);
  const originalHasTelugu = /[\u0C00-\u0C7F]/.test(originalText);

  // Check for Romanized language switches (Hindi, Telugu, Tamil words in Latin script)
  const romanizedHindi = /\b(namaste|namaskar|kaise|hai|aap|tum|mera|tera|uska|yeh|woh|bahut|accha|theek|suno|bolo|jao|aao|khana|pani|ghar|padhai|kaam|dost|zindagi)\b/i;
  const romanizedTelugu = /\b(namaskaram| ela|bagunnav|vastha|chedam|cheppu|chudu|ivvala|repu|ninnati|ipudu|andi|nenu|nuvvu|memu|manam)\b/i;

  const originalIsRomanizedHindi = romanizedHindi.test(originalText);
  const draftIsRomanizedHindi = romanizedHindi.test(draft);
  const originalIsRomanizedTelugu = romanizedTelugu.test(originalText);
  const draftIsRomanizedTelugu = romanizedTelugu.test(draft);

  // If original was in native script, draft switching to Latin may be inconsistent
  if (originalHasDevanagari && hasLatin && !hasDevanagari) {
    issues.push("Script switched from Devanagari to Latin — may seem inconsistent");
  }
  if (originalHasTelugu && hasLatin && !hasTelugu) {
    issues.push("Script switched from Telugu to Latin — may seem inconsistent");
  }

  // If original was in Latin, sudden native script may be inconsistent
  if (!originalHasDevanagari && !originalHasTelugu && hasDevanagari && !hasLatin) {
    issues.push("Script switched to Devanagari — may seem inconsistent");
  }
  if (!originalHasDevanagari && !originalHasTelugu && hasTelugu && !hasLatin) {
    issues.push("Script switched to Telugu — may seem inconsistent");
  }

  // If original was Romanized Hindi but draft is pure English (no Hindi words), note inconsistency
  if (originalIsRomanizedHindi && !draftIsRomanizedHindi && hasLatin) {
    // Only flag if the original had significant Hindi words
    const hindiWordCount = (originalText.match(romanizedHindi) || []).length;
    if (hindiWordCount >= 2) {
      issues.push("Language shifted from Romanized Hindi to pure English — may seem inconsistent");
    }
  }

  // If original was pure English but draft switches to Romanized Hindi, note inconsistency
  if (!originalIsRomanizedHindi && draftIsRomanizedHindi && hasLatin) {
    const hindiWordCount = (draft.match(romanizedHindi) || []).length;
    if (hindiWordCount >= 2) {
      issues.push("Language shifted from English to Romanized Hindi — may seem inconsistent");
    }
  }

  const score = issues.length === 0 ? 0.9 : Math.max(0.4, 0.9 - issues.length * 0.25);

  return {
    dimension: "language_consistency",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Language and script are consistent."
      : `Language consistency concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Style Consistency ───────────────────────────────────────────────

function checkStyleConsistency(
  draft: string,
  state: ConversationState,
  originalText: string
): DimensionResult {
  const issues: string[] = [];
  const draftWords = draft.split(/\s+/).length;
  const originalWords = originalText.split(/\s+/).length;

  // Length consistency
  if (originalWords > 10 && draftWords < 3) {
    issues.push("Message is much shorter than the original — may lose important context");
  }
  if (originalWords < 5 && draftWords > 30) {
    issues.push("Message is much longer than the original — may seem unnatural");
  }

  // Emoji consistency
  const draftEmojis = (draft.match(/[\p{Emoji}]/gu) || []).length;
  const originalEmojis = (originalText.match(/[\p{Emoji}]/gu) || []).length;
  if (originalEmojis === 0 && draftEmojis > 3) {
    issues.push("Significant increase in emojis — may seem unnatural for this conversation");
  }

  // Punctuation consistency
  const draftExclamations = (draft.match(/!/g) || []).length;
  const originalExclamations = (originalText.match(/!/g) || []).length;
  if (originalExclamations <= 1 && draftExclamations > 2) {
    issues.push("Excessive exclamation marks added — may seem unnatural");
  }

  const score = issues.length === 0 ? 0.85 : Math.max(0.3, 0.85 - issues.length * 0.2);

  return {
    dimension: "style_consistency",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Message style is consistent."
      : `Style concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Safety ──────────────────────────────────────────────────────────

function checkSafety(draft: string): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  // Offensive language patterns
  const offensivePatterns = [
    /\b(idiot|moron|stupid|dumb|retard)\b/i,
    /\b(hate you|i hate|despise)\b/i,
    /\b(ugly|fat|disgusting|pathetic|loser)\b/i,
  ];

  for (const pattern of offensivePatterns) {
    if (pattern.test(draft)) {
      issues.push("Offensive language detected");
      break;
    }
  }

  // Harmful content patterns
  const harmfulPatterns = [
    /\b(kill yourself|kys|end your life|go die)\b/i,
    /\b(i'll (kill|hurt|destroy|ruin) you)\b/i,
    /\b(suicide|self[- ]harm)\b/i,
  ];

  for (const pattern of harmfulPatterns) {
    if (pattern.test(draft)) {
      issues.push("Harmful content detected");
      break;
    }
  }

  // Private information leaks
  const privateInfoPatterns = [
    { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, desc: "SSN-like number" },
    { pattern: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/, desc: "credit card number" },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, desc: "email address" },
    { pattern: /\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, desc: "phone number" },
  ];

  for (const { pattern, desc } of privateInfoPatterns) {
    if (pattern.test(draft)) {
      issues.push(`Private information detected: ${desc}`);
    }
  }

  const score = issues.length === 0 ? 1.0 : 0.0;

  return {
    dimension: "safety",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "No safety concerns."
      : `Safety issues: ${issues.join("; ")}`,
    isCritical: true,
  };
}

// ─── Check: Deception / Fabrication ─────────────────────────────────────────

function checkDeceptionFabrication(
  draft: string,
  messages: Array<{ sender: string; text: string }>,
  _state: ConversationState
): DimensionResult {
  const issues: string[] = [];

  // Layer 1: Deterministic pattern checks
  const fabricationPatterns = [
    { pattern: /\bmy (laptop|computer|phone|car|bike|wifi|internet) (broke|crashed|died|stopped|isn't working|wasn't working)\b/i, desc: "device malfunction" },
    { pattern: /\bi (was|got|felt) (sick|ill|unwell|terrible)\b/i, desc: "illness claim" },
    { pattern: /\b(my (mom|dad|grandma|grandpa|grandmother|grandfather|uncle|aunt|brother|sister|family))\b/i, desc: "family reference (verify context)" },
    { pattern: /\b(there was (a )?(flood|earthquake|storm|accident|emergency|power outage))\b/i, desc: "emergency event" },
    { pattern: /\b(i (had to|was dealing with|was handling|was taking care of))\b/i, desc: "unverifiable obligation" },
  ];

  const conversationText = messages.map((m) => m.text).join(" ").toLowerCase();

  for (const { pattern, desc } of fabricationPatterns) {
    if (pattern.test(draft)) {
      // Layer 2: Cross-reference with conversation history
      const isSupported = crossReferenceClaim(draft, messages, pattern);
      if (!isSupported) {
        issues.push(`This claim isn't supported by the conversation: ${desc}`);
      }
    }
  }

  // Layer 2: Check for fabricated deadlines not mentioned in conversation
  const deadlinePattern = /\b(you said|you told me|you promised|you agreed) (by|before|until|to have it done by|the deadline)\b/i;
  if (deadlinePattern.test(draft)) {
    const hasDeadlineContext = /\b(deadline|due|by|before|submit|finish|complete|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i.test(conversationText);
    if (!hasDeadlineContext) {
      issues.push("This claim about a deadline isn't supported by the conversation");
    }
  }

  // Layer 2: Check for fabricated quotes/attribution
  const quotePattern = /\b(you said|you told me|you promised|you claimed)\b/i;
  if (quotePattern.test(draft)) {
    const claimedWords = draft.match(/"([^"]+)"/)?.[1] || draft.match(/'([^']+)'/)?.[1];
    if (claimedWords && !conversationText.includes(claimedWords.toLowerCase())) {
      issues.push("This attribution isn't supported by the conversation");
    }
  }

  const score = issues.length === 0 ? 1.0 : Math.max(0.1, 1 - issues.length * 0.3);

  return {
    dimension: "deception_fabrication",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "No unsupported claims detected."
      : `Deception concerns: ${issues.join("; ")}`,
    isCritical: true,
  };
}

function crossReferenceClaim(
  draft: string,
  messages: Array<{ sender: string; text: string }>,
  _pattern: RegExp
): boolean {
  const conversationText = messages.map((m) => m.text).join(" ").toLowerCase();
  const draftLower = draft.toLowerCase();

  // Extract key nouns from the claim
  const keyTerms = draftLower
    .replace(/\b(my|the|a|an|is|was|were|had|has|have|been|being|do|did|does)\b/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Check if any key terms appear in conversation
  const supportedTerms = keyTerms.filter((term) => conversationText.includes(term));

  // If less than 30% of key terms appear in conversation, claim is unsupported
  return keyTerms.length === 0 || supportedTerms.length / keyTerms.length >= 0.3;
}

// ─── Check: Contradiction ───────────────────────────────────────────────────

function checkContradiction(
  draft: string,
  messages: Array<{ sender: string; text: string }>,
  _state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const draftLower = draft.toLowerCase();

  // Check for direct contradictions with earlier user messages
  const userMessages = messages
    .filter((m) => m.sender === "me")
    .map((m) => m.text.toLowerCase());

  // If no earlier user messages, can't contradict
  if (userMessages.length === 0) {
    return {
      dimension: "contradiction",
      score: 0.9,
      passed: true,
      issues: [],
      explanation: "No earlier user messages to contradict.",
      isCritical: false,
    };
  }

  // Contradiction patterns: positive vs negative statements
  const contradictionPairs = [
    { positive: /\b(i will|shall|'ll|am going to)\b/i, negative: /\b(won't|will not|can't|cannot|don't|do not) (be able to|make it|come|attend|do|finish)\b/i },
    { positive: /\b(agree|i'm for|i support|you're right)\b/i, negative: /\b(disagree|i'm against|you're wrong|not okay)\b/i },
    { positive: /\b(i'm (available|free|open|willing))\b/i, negative: /\b(not available|busy|not free|unavailable|can't)\b/i },
    { positive: /\b(it's (fine|okay|good|great|perfect))\b/i, negative: /\b(not fine|not okay|bad|terrible|awful|unacceptable)\b/i },
  ];

  for (const { positive, negative } of contradictionPairs) {
    const draftHasPositive = positive.test(draft);
    const draftHasNegative = negative.test(draft);

    // Check if earlier messages had the opposite stance
    for (const userMsg of userMessages) {
      const earlierHadPositive = positive.test(userMsg);
      const earlierHadNegative = negative.test(userMsg);

      if (draftHasPositive && earlierHadNegative) {
        issues.push("This contradicts an earlier statement you made");
        break;
      }
      if (draftHasNegative && earlierHadPositive) {
        issues.push("This contradicts an earlier statement you made");
        break;
      }
    }
    if (issues.length > 0) break;
  }

  // Check for time contradictions
  const timeContradictions = [
    { draft: /\b(today|this morning|this afternoon)\b/i, earlier: /\b(tomorrow|next week|next month)\b/i },
    { draft: /\b(i'm (coming|attending|joining|there))\b/i, earlier: /\b(can't (come|attend|join|be there)|not coming|not attending|not joining|not there)\b/i },
  ];

  for (const { draft: draftPat, earlier: earlierPat } of timeContradictions) {
    if (draftPat.test(draft)) {
      for (const userMsg of userMessages) {
        if (earlierPat.test(userMsg)) {
          issues.push("This contradicts something you said earlier about timing");
          break;
        }
      }
    }
    if (issues.length > 0) break;
  }

  const score = issues.length === 0 ? 0.9 : Math.max(0.2, 0.9 - issues.length * 0.35);

  return {
    dimension: "contradiction",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "No contradictions with earlier messages."
      : `Contradiction concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Check: Clarity ─────────────────────────────────────────────────────────

function checkClarity(
  draft: string,
  _state: ConversationState
): DimensionResult {
  const issues: string[] = [];
  const wordCount = draft.split(/\s+/).length;

  // Too brief
  if (wordCount < 3 && draft.length > 0) {
    issues.push("Message is very brief — may not convey your full meaning");
  }

  // Excessive length without clear structure
  if (wordCount > 100) {
    issues.push("Long messages may lose the reader's attention — consider breaking it up");
  }

  // Excessive punctuation
  const exclamationCount = (draft.match(/!/g) || []).length;
  const questionCount = (draft.match(/\?/g) || []).length;
  if (exclamationCount > 5) {
    issues.push("Excessive exclamation marks may seem intense");
  }
  if (questionCount > 3) {
    issues.push("Multiple questions in one message may feel overwhelming");
  }

  // All caps (more than 50% uppercase)
  const uppercaseChars = (draft.match(/[A-Z]/g) || []).length;
  const letterChars = (draft.match(/[A-Za-z]/g) || []).length;
  if (letterChars > 10 && uppercaseChars / letterChars > 0.5) {
    issues.push("Excessive capitalization — may seem like shouting");
  }

  const score = issues.length === 0 ? 0.85 : Math.max(0.3, 0.85 - issues.length * 0.2);

  return {
    dimension: "clarity",
    score,
    passed: issues.length === 0,
    issues,
    explanation: issues.length === 0
      ? "Message is clear and well-structured."
      : `Clarity concerns: ${issues.join("; ")}`,
    isCritical: false,
  };
}

// ─── Decision Logic (Severity-Aware) ────────────────────────────────────────

function classifyDecision(
  dimensionScores: Record<CheckDimension, DimensionResult>,
  risks: GateRisk[]
): GateDecision {
  // HIGH_RISK: Any ONE of these triggers it
  const criticalRisks = risks.filter((r) => r.severity === "critical");
  if (criticalRisks.length > 0) {
    return "HIGH_RISK";
  }

  // HIGH_RISK: Semantic preservation failure (meaning flipped)
  const semanticResult = dimensionScores.semantic_preservation;
  if (semanticResult.score < 0.3 && semanticResult.issues.some((i) => i.includes("flipped") || i.includes("reversed") || i.includes("changed"))) {
    return "HIGH_RISK";
  }

  // HIGH_RISK: 3+ high-severity risks
  const highRisks = risks.filter((r) => r.severity === "high");
  if (highRisks.length >= 3) {
    return "HIGH_RISK";
  }

  // HIGH_RISK: Safety violation
  if (dimensionScores.safety.score < 0.5) {
    return "HIGH_RISK";
  }

  // HIGH_RISK: Fabricated claims confirmed
  if (dimensionScores.deception_fabrication.score < 0.3) {
    return "HIGH_RISK";
  }

  // HIGH_RISK: Coercion/manipulation detected
  const coercionPatterns = [
    /\b(if you don't|i swear|i'll make sure you|you'll regret)\b/i,
    /\b(threat|blackmail|extort)\b/i,
  ];
  const hasCoercion = risks.some(
    (r) =>
      r.dimension === "escalation_risk" ||
      r.dimension === "pressure_risk"
  ) && risks.some((r) => r.severity === "high" && (r.dimension === "escalation_risk" || r.dimension === "pressure_risk"));

  if (hasCoercion) {
    return "HIGH_RISK";
  }

  // REVIEW: 1+ non-critical high-severity risks
  if (highRisks.length >= 1) {
    return "REVIEW";
  }

  // REVIEW: 2+ medium-severity risks
  const mediumRisks = risks.filter((r) => r.severity === "medium");
  if (mediumRisks.length >= 2) {
    return "REVIEW";
  }

  // REVIEW: Meaning drift detected (not reversal, but partial change)
  if (semanticResult.score < 0.6 && semanticResult.score >= 0.3) {
    return "REVIEW";
  }

  // REVIEW: Significant tone/context mismatch
  if (dimensionScores.tone_fit.score < 0.4 || dimensionScores.context_fit.score < 0.4) {
    return "REVIEW";
  }

  // REVIEW: Deception risk detected but not confirmed fabrication
  if (dimensionScores.deception_fabrication.score < 0.6 && dimensionScores.deception_fabrication.score >= 0.3) {
    return "REVIEW";
  }

  // REVIEW: Contradiction detected
  if (dimensionScores.contradiction.score < 0.5) {
    return "REVIEW";
  }

  // READY: No critical failures and no substantial contextual risk
  return "READY";
}

// ─── Risk Identification ────────────────────────────────────────────────────

function identifyRisks(
  dimensionScores: Record<CheckDimension, DimensionResult>
): GateRisk[] {
  const risks: GateRisk[] = [];

  const riskMappings: Array<{
    dimension: CheckDimension;
    threshold: number;
    severity: RiskSeverity;
    description: string;
    recommendation: string;
  }> = [
    {
      dimension: "semantic_preservation",
      threshold: 0.5,
      severity: "critical",
      description: "Meaning may have been altered",
      recommendation: "Review the message to ensure it says what you intended",
    },
    {
      dimension: "factual_integrity",
      threshold: 0.5,
      severity: "critical",
      description: "Factual claims may be inaccurate",
      recommendation: "Verify any claims made in the message",
    },
    {
      dimension: "safety",
      threshold: 0.5,
      severity: "critical",
      description: "Safety concerns detected",
      recommendation: "Remove harmful or offensive content",
    },
    {
      dimension: "deception_fabrication",
      threshold: 0.5,
      severity: "critical",
      description: "Unsupported claims detected",
      recommendation: "Ensure all claims are supported by the conversation",
    },
    {
      dimension: "escalation_risk",
      threshold: 0.5,
      severity: "high",
      description: "Message may escalate tensions",
      recommendation: "Consider a calmer approach",
    },
    {
      dimension: "pressure_risk",
      threshold: 0.5,
      severity: "high",
      description: "Message may feel pressuring",
      recommendation: "Soften the pressure language",
    },
    {
      dimension: "defensiveness_risk",
      threshold: 0.5,
      severity: "medium",
      description: "Message may seem defensive",
      recommendation: "Consider taking more accountability",
    },
    {
      dimension: "tone_fit",
      threshold: 0.5,
      severity: "medium",
      description: "Tone may not match the situation",
      recommendation: "Adjust tone to better fit the context",
    },
    {
      dimension: "context_fit",
      threshold: 0.5,
      severity: "medium",
      description: "Message may not fit the context",
      recommendation: "Consider the relationship and situation",
    },
    {
      dimension: "contradiction",
      threshold: 0.5,
      severity: "medium",
      description: "Message may contradict earlier statements",
      recommendation: "Review for consistency",
    },
    {
      dimension: "misunderstanding_risk",
      threshold: 0.5,
      severity: "low",
      description: "Message may be misunderstood",
      recommendation: "Be more specific or clear",
    },
    {
      dimension: "clarity",
      threshold: 0.5,
      severity: "low",
      description: "Message could be clearer",
      recommendation: "Simplify or restructure",
    },
    {
      dimension: "boundary_integrity",
      threshold: 0.5,
      severity: "medium",
      description: "Boundaries may have been weakened",
      recommendation: "Ensure your boundaries are preserved",
    },
    {
      dimension: "position_integrity",
      threshold: 0.5,
      severity: "medium",
      description: "Your position may have changed",
      recommendation: "Ensure your stance is preserved",
    },
    {
      dimension: "goal_alignment",
      threshold: 0.4,
      severity: "low",
      description: "Message may not align with your goal",
      recommendation: "Review if the message advances your goal",
    },
    {
      dimension: "language_consistency",
      threshold: 0.5,
      severity: "low",
      description: "Language or script may be inconsistent",
      recommendation: "Maintain consistent language",
    },
    {
      dimension: "style_consistency",
      threshold: 0.5,
      severity: "low",
      description: "Style may be inconsistent",
      recommendation: "Match the conversation style",
    },
  ];

  for (const mapping of riskMappings) {
    const result = dimensionScores[mapping.dimension];
    if (result) {
      // Flag if check failed (has issues) — regardless of score threshold
      // This catches cases where score is high but issues exist (e.g., semantic preservation with negation reversal)
      const shouldFlag = !result.passed && result.issues.length > 0;
      const belowThreshold = result.score < mapping.threshold;

      if (shouldFlag || belowThreshold) {
        risks.push({
          dimension: mapping.dimension,
          severity: mapping.severity,
          description: mapping.description,
          explanation: result.explanation,
          recommendation: mapping.recommendation,
        });
      }
    }
  }

  // Sort: critical first, then high, medium, low
  const severityOrder: Record<RiskSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return risks;
}

// ─── Strength Identification ────────────────────────────────────────────────

function identifyStrengths(
  dimensionScores: Record<CheckDimension, DimensionResult>
): GateStrength[] {
  const strengths: GateStrength[] = [];

  const strengthMessages: Partial<Record<CheckDimension, string>> = {
    semantic_preservation: "Meaning is well-preserved",
    factual_integrity: "Factual claims are accurate",
    goal_alignment: "Message aligns with your goal",
    context_fit: "Message fits the conversation context",
    tone_fit: "Tone is appropriate for the situation",
    communication_impact: "Communication impact is positive",
    escalation_risk: "No escalation risk detected",
    defensiveness_risk: "No defensive patterns detected",
    pressure_risk: "No pressure tactics detected",
    misunderstanding_risk: "Message is clear and specific",
    boundary_integrity: "Boundaries are preserved",
    position_integrity: "Your position is maintained",
    language_consistency: "Language and script are consistent",
    style_consistency: "Style matches the conversation",
    safety: "No safety concerns",
    deception_fabrication: "No unsupported claims",
    contradiction: "No contradictions with earlier messages",
    clarity: "Message is clear and well-structured",
  };

  for (const [dimension, result] of Object.entries(dimensionScores)) {
    if (result.passed && result.score >= 0.7) {
      const msg = strengthMessages[dimension as CheckDimension];
      if (msg) {
        strengths.push({
          dimension: dimension as CheckDimension,
          description: msg,
        });
      }
    }
  }

  return strengths;
}

// ─── Recommendation Generation ──────────────────────────────────────────────

function generateRecommendations(
  risks: GateRisk[],
  _dimensionScores: Record<CheckDimension, DimensionResult>
): GateRecommendation[] {
  const recommendations: GateRecommendation[] = [];

  for (const risk of risks) {
    const type: GateRecommendation["type"] =
      risk.severity === "critical"
        ? "must_fix"
        : risk.severity === "high"
        ? "should_fix"
        : "consider";

    recommendations.push({
      type,
      dimension: risk.dimension,
      description: risk.description,
      suggestion: risk.recommendation,
    });
  }

  return recommendations;
}

// ─── Confidence Calculation ─────────────────────────────────────────────────

function calculateConfidence(
  dimensionScores: Record<CheckDimension, DimensionResult>,
  risks: GateRisk[]
): number {
  // Weight critical dimensions more heavily
  const weights: Record<CheckDimension, number> = {
    semantic_preservation: 0.15,
    factual_integrity: 0.15,
    safety: 0.15,
    deception_fabrication: 0.15,
    goal_alignment: 0.05,
    context_fit: 0.05,
    tone_fit: 0.05,
    communication_impact: 0.05,
    escalation_risk: 0.05,
    defensiveness_risk: 0.03,
    pressure_risk: 0.03,
    misunderstanding_risk: 0.03,
    boundary_integrity: 0.03,
    position_integrity: 0.03,
    language_consistency: 0.02,
    style_consistency: 0.02,
    contradiction: 0.02,
    clarity: 0.02,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dim, weight] of Object.entries(weights)) {
    const result = dimensionScores[dim as CheckDimension];
    if (result) {
      weightedSum += result.score * weight;
      totalWeight += weight;
    }
  }

  let confidence = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // Reduce confidence based on number of risks
  const criticalRiskCount = risks.filter((r) => r.severity === "critical").length;
  const highRiskCount = risks.filter((r) => r.severity === "high").length;

  confidence -= criticalRiskCount * 0.15;
  confidence -= highRiskCount * 0.08;

  return Math.max(0.1, Math.min(1.0, confidence));
}

// ─── Summary Building ───────────────────────────────────────────────────────

function buildSummary(
  decision: GateDecision,
  risks: GateRisk[],
  strengths: GateStrength[]
): string {
  const riskCount = risks.length;
  const criticalCount = risks.filter((r) => r.severity === "critical").length;
  const highCount = risks.filter((r) => r.severity === "high").length;

  if (decision === "READY") {
    if (strengths.length > 3) {
      return "This message looks good to send — strong across all checks.";
    }
    return "This message looks ready to send — no significant issues found.";
  }

  if (decision === "REVIEW") {
    if (highCount > 0) {
      return `Review recommended — ${highCount} issue${highCount > 1 ? "s" : ""} worth checking before sending.`;
    }
    return `Review recommended — ${riskCount} issue${riskCount > 1 ? "s" : ""} to consider before sending.`;
  }

  // HIGH_RISK
  if (criticalCount > 0) {
    return `Not ready to send — ${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} need${criticalCount === 1 ? "s" : ""} to be resolved.`;
  }
  return `Not ready to send — multiple significant issues need to be resolved.`;
}

// ─── Explanation Building ───────────────────────────────────────────────────

function buildExplanation(
  decision: GateDecision,
  dimensionScores: Record<CheckDimension, DimensionResult>,
  risks: GateRisk[]
): string {
  if (decision === "READY") {
    const passedCount = Object.values(dimensionScores).filter((d) => d.passed).length;
    return `All ${passedCount} checks passed. This message is safe to send.`;
  }

  if (decision === "REVIEW") {
    const mainIssues = risks
      .filter((r) => r.severity === "high" || r.severity === "medium")
      .slice(0, 3)
      .map((r) => r.description)
      .join("; ");
    return `Issues to review: ${mainIssues}. Consider addressing these before sending.`;
  }

  // HIGH_RISK
  const criticalIssues = risks
    .filter((r) => r.severity === "critical")
    .map((r) => r.description)
    .join("; ");

  if (criticalIssues) {
    return `Critical issues found: ${criticalIssues}. These must be resolved before sending.`;
  }

  const highIssues = risks
    .filter((r) => r.severity === "high")
    .map((r) => r.description)
    .join("; ");
  return `Significant issues found: ${highIssues}. Recommend improving the message before sending.`;
}
