// ─── Tone Transformation Engine ─────────────────────────────────────────────
//
// Phase 4 Step 4: Change HOW a message sounds without changing WHAT the user means.
//
// Architecture:
//   Draft + TargetTone + Intensity
//   → Meaning Lock (Preservation Contract)
//   → Tone-Specific Instructions
//   → Generator (reused)
//   → Humanizer (reused)
//   → Preservation Validation (reused)
//   → Quality Validator (reused with toneFit dimension)
//   → Ranker (reused with toneFit modifier)
//   → 3 differentiated candidates (light / medium / strong)
//
// Invariant: TONE MAY CHANGE. MEANING MUST NOT.
// ──────────────────────────────────────────────────────────────────────────────

import type { AIProvider } from "./provider";
import type { ConversationState } from "./conversation-state";
import type { DraftAnalysis } from "./draft-types";
import type { CommunicationImpactPrediction } from "./impact-types";
import type { StrategyRecommendation } from "./strategy";
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

export type TargetTone =
  | "professional"
  | "friendly"
  | "casual"
  | "formal"
  | "diplomatic"
  | "assertive"
  | "empathetic"
  | "concise"
  | "warm"
  | "confident"
  | "calm"
  | "serious"
  | "playful"
  | "humorous"
  | "flirty";

export type ToneIntensity = "light" | "medium" | "strong";

export interface ToneTransformationInput {
  /** The original draft to transform */
  draft: string;
  /** Target tone */
  targetTone: TargetTone;
  /** Intensity of tone transformation (default: medium) */
  intensity?: ToneIntensity;
  /** Current conversation messages */
  messages: Array<{ sender: "me" | "them" | "unknown"; text: string }>;
  /** User's stated goal */
  goal?: string;
  /** Platform */
  platform?: string;
  /** User facts for preservation */
  userFacts?: string[];
  /** Pre-computed draft analysis */
  draftAnalysis?: DraftAnalysis;
  /** Pre-computed impact prediction */
  impactPrediction?: CommunicationImpactPrediction;
}

export interface ToneTransformationResult {
  /** The original draft unchanged */
  originalDraft: string;
  /** The target tone requested */
  targetTone: TargetTone;
  /** The intensity requested */
  intensity: ToneIntensity;
  /** Transformed candidates with different intensities */
  candidates: ToneCandidate[];
  /** Preservation status across all candidates */
  preservation: TonePreservationStatus;
  /** Index of the recommended candidate (0 = light, 1 = medium, 2 = strong) */
  recommendedCandidate: number;
  /** Language state used */
  languageState: {
    primary: string;
    script: string;
    romanized: boolean;
    codeMixed: boolean;
  };
  /** Tone transformation summary */
  summary: ToneTransformationSummary;
}

export interface ToneCandidate {
  /** The transformed text */
  text: string;
  /** Tone applied */
  tone: TargetTone;
  /** Intensity of this candidate */
  intensity: ToneIntensity;
  /** Tone fit score (0.0–1.0) */
  toneFit: number;
  /** Rationale for this transformation */
  rationale: string;
  /** Whether meaning is preserved */
  meaningPreserved: boolean;
}

export interface TonePreservationStatus {
  /** Overall preservation passed */
  passed: boolean;
  /** Intent preserved */
  intent: boolean;
  /** Goal preserved */
  goal: boolean;
  /** Position preserved */
  position: boolean;
  /** Boundaries preserved */
  boundaries: boolean;
  /** Facts preserved */
  facts: boolean;
  /** Negation preserved */
  negation: boolean;
  /** Temporal constraints preserved */
  temporalConstraints: boolean;
  /** Language preserved */
  language: boolean;
  /** Issues if any */
  issues: string[];
}

export interface ToneTransformationSummary {
  /** What changed */
  changes: string[];
  /** What stayed the same */
  preserved: string[];
  /** Formality shift */
  formalityShift: "increased" | "same" | "decreased";
  /** Assertiveness shift */
  assertivenessShift: "increased" | "same" | "decreased";
  /** Warmth shift */
  warmthShift: "increased" | "same" | "decreased";
}

// ─── Tone → Mode Mapping ────────────────────────────────────────────────────
//
// Maps each target tone to an ImprovementMode and provides tone-specific
// prompt instructions. Reuses existing MODE_INSTRUCTIONS from message-improver.
// ──────────────────────────────────────────────────────────────────────────────

interface ToneMapping {
  mode: "keep_meaning_improve_clarity" | "more_professional" | "more_diplomatic" | "more_assertive" | "more_empathetic" | "more_concise" | "more_natural" | "more_playful" | "more_flirty";
  instruction: string;
  formalityShift: "increased" | "same" | "decreased";
  assertivenessShift: "increased" | "same" | "decreased";
  warmthShift: "increased" | "same" | "decreased";
}

const TONE_MAPPINGS: Record<TargetTone, ToneMapping> = {
  professional: {
    mode: "more_professional",
    instruction:
      "Transform to a professional tone. Use clear, respectful, direct wording with appropriate formality. " +
      "Remove excessive slang, reduce unnecessary emojis, and improve sentence structure. " +
      "Do NOT create corporate jargon, invent facts, add unsupported commitments, or remove legitimate disagreement.",
    formalityShift: "increased",
    assertivenessShift: "same",
    warmthShift: "decreased",
  },
  friendly: {
    mode: "more_natural",
    instruction:
      "Transform to a friendly, warm tone. Add natural warmth and softer phrasing while preserving meaning. " +
      "Use conversational flow and approachable language. " +
      "Do NOT add facts, promises, or emotional claims not supported by the original message or context.",
    formalityShift: "decreased",
    assertivenessShift: "decreased",
    warmthShift: "increased",
  },
  casual: {
    mode: "more_natural",
    instruction:
      "Transform to a casual, conversational tone. Reduce unnecessary formality and use relaxed phrasing. " +
      "Use contractions and natural speech patterns. " +
      "Do NOT introduce slang that doesn't fit the user's existing style or context.",
    formalityShift: "decreased",
    assertivenessShift: "same",
    warmthShift: "same",
  },
  formal: {
    mode: "more_professional",
    instruction:
      "Transform to a formal tone. Improve sentence structure, increase politeness, and use precise language. " +
      "Maintain clarity and professionalism throughout. " +
      "Do NOT invent titles, reasons, or change commitments.",
    formalityShift: "increased",
    assertivenessShift: "same",
    warmthShift: "decreased",
  },
  diplomatic: {
    mode: "more_diplomatic",
    instruction:
      "Transform to a diplomatic tone. Reduce unnecessary friction and confrontation while preserving position. " +
      "Replace personal attacks with neutral framing. Consider alternative perspectives. " +
      "Do NOT force false apologies, change the user's underlying position, or invent feelings.",
    formalityShift: "increased",
    assertivenessShift: "decreased",
    warmthShift: "increased",
  },
  assertive: {
    mode: "more_assertive",
    instruction:
      "Transform to an assertive tone. Be clear, direct, and confident. State needs and boundaries clearly. " +
      "Remove weak hedging and unclear phrasing. " +
      "Do NOT become aggressive, insulting, or coercive. Assertive is NOT aggressive.",
    formalityShift: "same",
    assertivenessShift: "increased",
    warmthShift: "decreased",
  },
  empathetic: {
    mode: "more_empathetic",
    instruction:
      "Transform to an empathetic tone. Show emotional awareness and understanding. " +
      "Acknowledge the other person's perspective where supported by context. " +
      "Do NOT fabricate feelings, insert unsupported emotional claims like 'I completely understand how you feel', " +
      "or invent empathy not present in the original message.",
    formalityShift: "same",
    assertivenessShift: "decreased",
    warmthShift: "increased",
  },
  concise: {
    mode: "more_concise",
    instruction:
      "Transform to a concise tone. Remove filler words, unnecessary hedging, and verbose phrasing. " +
      "Preserve ALL critical information: intent, facts, dates, times, numbers, boundaries, commitments. " +
      "Concise must NEVER remove critical meaning.",
    formalityShift: "same",
    assertivenessShift: "same",
    warmthShift: "same",
  },
  warm: {
    mode: "more_natural",
    instruction:
      "Transform to a warm tone. Add gentle phrasing, natural warmth, and approachable language. " +
      "Use softer sentence openings and conversational warmth. " +
      "Do NOT add facts, promises, or invent emotional claims not supported by context.",
    formalityShift: "decreased",
    assertivenessShift: "decreased",
    warmthShift: "increased",
  },
  confident: {
    mode: "more_assertive",
    instruction:
      "Transform to a confident tone. Use strong, assured language that shows conviction. " +
      "Remove uncertainty hedging like 'maybe', 'I think', 'possibly' where the original message is clear. " +
      "Do NOT become overbearing, dismissive, or add unsupported claims of certainty.",
    formalityShift: "same",
    assertivenessShift: "increased",
    warmthShift: "same",
  },
  calm: {
    mode: "more_diplomatic",
    instruction:
      "Transform to a calm, composed tone. Use measured language and reduce emotional intensity. " +
      "Maintain clarity while conveying a sense of composure. " +
      "Do NOT dismiss legitimate concerns or change the user's position.",
    formalityShift: "same",
    assertivenessShift: "decreased",
    warmthShift: "same",
  },
  serious: {
    mode: "more_professional",
    instruction:
      "Transform to a serious tone. Remove humor, playfulness, and casual elements. " +
      "Use direct, straightforward language appropriate for serious matters. " +
      "Do NOT add unnecessary gravity or invent serious context not present in the original.",
    formalityShift: "increased",
    assertivenessShift: "same",
    warmthShift: "decreased",
  },
  playful: {
    mode: "more_playful",
    instruction:
      "Transform to a playful, lighthearted tone. Add light humor and casual phrasing. " +
      "Use emojis naturally when context supports it. " +
      "Do NOT make serious professional communication playful, trivialize conflict, " +
      "or add humor in grief-sensitive or high-stakes situations.",
    formalityShift: "decreased",
    assertivenessShift: "decreased",
    warmthShift: "increased",
  },
  humorous: {
    mode: "more_playful",
    instruction:
      "Transform to a humorous tone with light, natural wit. Add appropriate humor that fits the context. " +
      "Do NOT introduce jokes in serious conflict, professional complaints, grief-sensitive conversations, " +
      "or high-stakes situations unless explicitly requested.",
    formalityShift: "decreased",
    assertivenessShift: "decreased",
    warmthShift: "increased",
  },
  flirty: {
    mode: "more_flirty",
    instruction:
      "Transform to a flirtatious tone. Add natural romantic interest and playful charm. " +
      "Use light teasing and conversational warmth. " +
      "Do NOT invent attraction, relationship status, sexual intent, or romantic claims " +
      "not supported by the original message or conversation context.",
    formalityShift: "decreased",
    assertivenessShift: "same",
    warmthShift: "increased",
  },
};

// ─── Intensity Modifiers ────────────────────────────────────────────────────

const INTENSITY_MODIFIERS: Record<ToneIntensity, string> = {
  light:
    "Apply the tone lightly. Make subtle adjustments. The result should feel like a gentle shift, " +
    "barely noticeable but improving the overall feel.",
  medium:
    "Apply the tone moderately. Make clear but natural adjustments. " +
    "The tone change should be noticeable but not dramatic.",
  strong:
    "Apply the tone firmly. Make significant adjustments to fully embody the target tone. " +
    "The result should clearly sound like the target tone while preserving all meaning.",
};

// ─── Tone Compatibility Rules ───────────────────────────────────────────────

interface ToneCompatibilityWarning {
  severity: "info" | "warning" | "caution";
  message: string;
}

const TONE_CONTEXT_WARNINGS: Record<string, Partial<Record<TargetTone, ToneCompatibilityWarning>>> = {
  conflict: {
    playful: { severity: "warning", message: "Humor in conflict may escalate tensions" },
    humorous: { severity: "warning", message: "Humor in conflict may escalate tensions" },
    flirty: { severity: "caution", message: "Flirting during conflict is unusual" },
    assertive: { severity: "info", message: "Assertive tone may escalate in conflict" },
  },
  professional: {
    flirty: { severity: "warning", message: "Flirting in professional context is inappropriate" },
    playful: { severity: "caution", message: "Playful tone may be inappropriate for professional context" },
    humorous: { severity: "caution", message: "Humor may be inappropriate for professional context" },
  },
  interview: {
    flirty: { severity: "warning", message: "Flirting in interview context is inappropriate" },
    playful: { severity: "warning", message: "Playful tone is inappropriate for interviews" },
    casual: { severity: "caution", message: "Casual tone may be inappropriate for interviews" },
  },
  dating: {
    professional: { severity: "info", message: "Professional tone in dating context is unusual" },
    formal: { severity: "info", message: "Formal tone in dating context is unusual" },
  },
};

export function checkToneCompatibility(
  tone: TargetTone,
  state: ConversationState
): ToneCompatibilityWarning[] {
  const warnings: ToneCompatibilityWarning[] = [];
  const contextType = state.context.type;
  const conflictLevel = state.conflict.level;

  // Context-specific warnings
  const contextWarnings = TONE_CONTEXT_WARNINGS[contextType];
  if (contextWarnings?.[tone]) {
    warnings.push(contextWarnings[tone]);
  }

  // High conflict + certain tones
  if (conflictLevel > 0.7) {
    if (tone === "playful" || tone === "humorous") {
      warnings.push({
        severity: "warning",
        message: "Humor in high-conflict conversations may escalate tensions",
      });
    }
    if (tone === "assertive") {
      warnings.push({
        severity: "info",
        message: "Assertive tone in high conflict may escalate — consider diplomatic instead",
      });
    }
  }

  // Dating + formal/professional
  if (contextType === "dating") {
    if (tone === "professional" || tone === "formal") {
      warnings.push({
        severity: "info",
        message: "Formal tone in dating context may feel unnatural",
      });
    }
  }

  return warnings;
}

// ─── Tone Fit Scoring ───────────────────────────────────────────────────────

const TONE_KEYWORDS: Record<TargetTone, { positive: RegExp[]; negative: RegExp[] }> = {
  professional: {
    positive: [
      /\b(appreciate|regarding|pursuant|furthermore|moreover|respectfully|sincerely|kindly)\b/i,
      /\b(please|thank you|would you|could you|i would like|i wanted to)\b/i,
    ],
    negative: [
      /\b(haha|lol|omg|bruh|nah|yep|nope|gonna|wanna|gotta)\b/i,
      /\b(!!+|\?\?+| 😂| 😊| 😎| 🔥)\b/,
    ],
  },
  friendly: {
    positive: [
      /\b(hope|glad|nice|great|awesome|love|enjoy|happy)\b/i,
      /\b(thanks|thank you|appreciate)\b/i,
    ],
    negative: [
      /\b(unfortunately|regret|cannot|shall|hereby|pursuant)\b/i,
    ],
  },
  casual: {
    positive: [
      /\b(haha|lol|yeah|yep|nah|cool|awesome|gonna|wanna)\b/i,
      /\b(hi|hey|what's up|sup)\b/i,
    ],
    negative: [
      /\b(regarding|pursuant|hereby|furthermore|moreover|respectfully)\b/i,
      /\b(dear sir|dear madam|to whom it may concern)\b/i,
    ],
  },
  formal: {
    positive: [
      /\b(dear|sincerely|respectfully|regarding|pursuant|furthermore|moreover)\b/i,
      /\b(i would like|i wish to|i am writing to|i am reaching out)\b/i,
    ],
    negative: [
      /\b(haha|lol|omg|bruh|nah|yep|nope|gonna|wanna)\b/i,
      /\b(!!+|\?\?+| 😂| 😊| 😎| 🔥)\b/,
    ],
  },
  diplomatic: {
    positive: [
      /\b(appreciate|understand|consider|respectfully|perhaps|might|could we)\b/i,
      /\b(i see|i understand|that's a good point|i hear you)\b/i,
    ],
    negative: [
      /\b(you are wrong|you're wrong|that's wrong|absolutely not|never)\b/i,
      /\b(always|never|every time|you always|you never)\b/i,
    ],
  },
  assertive: {
    positive: [
      /\b(i need|i want|i will|i am|i'm not|i can't|i won't|i don't)\b/i,
      /\b(clearly|directly|specifically|exactly)\b/i,
    ],
    negative: [
      /\b(maybe|perhaps|i think|i guess|i'm not sure|possibly|might)\b/i,
      /\b(sorry|apologies|unfortunately)\b/i,
    ],
  },
  empathetic: {
    positive: [
      /\b(understand|feel|hear you|recognize|acknowledge|appreciate)\b/i,
      /\b(that must be|i can see how|it makes sense that)\b/i,
    ],
    negative: [
      /\b(you should|you need to|you must|just get over)\b/i,
    ],
  },
  concise: {
    positive: [
      /\b(\w+\s){3,15}\b/, // Short sentences (3-15 words)
    ],
    negative: [
      /\b(i just wanted to let you know|unfortunately|at this point in time|due to the fact)\b/i,
      /\b(in order to|for the purpose of|with regard to|in the event that)\b/i,
    ],
  },
  warm: {
    positive: [
      /\b(hope|glad|nice|great|love|happy|appreciate|grateful)\b/i,
      /\b(thanks|thank you|means a lot|i'm here for you)\b/i,
    ],
    negative: [
      /\b(unfortunately|regret|formal greetings|to whom)\b/i,
    ],
  },
  confident: {
    positive: [
      /\b(i am|i'm|will|shall|can|do|have)\b/i,
      /\b(certainly|absolutely|definitely|clearly|without doubt)\b/i,
    ],
    negative: [
      /\b(maybe|perhaps|i think|i guess|i'm not sure|possibly|might|hopefully)\b/i,
      /\b(sorry|apologies|i apologize)\b/i,
    ],
  },
  calm: {
    positive: [
      /\b(take a moment|consider|reflect|perhaps|at your own pace)\b/i,
      /\b(i understand|i see|that's fair|let's work through)\b/i,
    ],
    negative: [
      /\b(right now|immediately|asap|urgent|hurry)\b/i,
      /\b(!!+| uppercase)\b/,
    ],
  },
  serious: {
    positive: [
      /\b(important|significant|critical|essential|necessary)\b/i,
      /\b(please|i need to|i must|i want to address)\b/i,
    ],
    negative: [
      /\b(haha|lol|omg|bruh|nah|yep|nope)\b/i,
      /\b(😂|😊|😎|🔥|💕|❤️)\b/,
    ],
  },
  playful: {
    positive: [
      /\b(haha|lol|funny|hilarious|interesting|cool|awesome)\b/i,
      /\b(😂|😊|😎|🔥|👀|🤣)\b/,
    ],
    negative: [
      /\b(unfortunately|regret|sincerely|respectfully|pursuant)\b/i,
    ],
  },
  humorous: {
    positive: [
      /\b(haha|lol|funny|hilarious|laugh|joke|pun)\b/i,
      /\b(😂|🤣|😆|😄)\b/,
    ],
    negative: [
      /\b(unfortunately|regret|i must inform|formal greetings)\b/i,
    ],
  },
  flirty: {
    positive: [
      /\b(cute|adorable|gorgeous|beautiful|handsome|attractive|charming)\b/i,
      /\b(miss you|thinking of you|can't wait|love|babe|baby)\b/i,
      /\b(😏|👀|💕|❤️|🥰|😍)\b/,
    ],
    negative: [
      /\b(unfortunately|regret|formal|sincerely|respectfully)\b/i,
    ],
  },
};

export function scoreToneFit(
  candidateText: string,
  targetTone: TargetTone
): number {
  const keywords = TONE_KEYWORDS[targetTone];
  if (!keywords) return 0.5;

  let score = 0.5; // Base score

  // Check positive keywords
  for (const pattern of keywords.positive) {
    if (pattern.test(candidateText)) {
      score += 0.1;
    }
  }

  // Check negative keywords
  for (const pattern of keywords.negative) {
    if (pattern.test(candidateText)) {
      score -= 0.1;
    }
  }

  return Math.max(0, Math.min(1, score));
}

// ─── Main Transformation Function ───────────────────────────────────────────

export async function transformTone(
  provider: AIProvider,
  input: ToneTransformationInput,
  state: ConversationState,
  strategies?: StrategyRecommendation[]
): Promise<ToneTransformationResult> {
  const { draft, targetTone, intensity = "medium", messages } = input;

  // 1. Create preservation contract (MEANING LOCK)
  const languageState: LanguageState = {
    primary: state.language.primary,
    script: state.language.script,
    romanized: state.language.romanized,
    codeMixed: state.language.codeMixed,
  };
  const preservationContract = createPreservationContract(draft, languageState);

  // 2. Get tone mapping
  const toneMapping = TONE_MAPPINGS[targetTone];

  // 3. Check tone compatibility
  const _compatibilityWarnings = checkToneCompatibility(targetTone, state);

  // 4. Build the tone transformation prompt with ALL 3 intensities in one call
  const conversationText = buildConversationText(messages);

  const scriptMap: Record<string, "romanized" | "native" | "english" | "mixed"> = {
    latin: "romanized",
    devanagari: "native",
    telugu: "native",
    mixed: "mixed",
    english: "english",
    unknown: "english",
  };

  // Build a single prompt requesting all 3 intensity variants
  const allIntensityPrompt = buildAllIntensitiesPrompt(
    draft,
    targetTone,
    toneMapping.instruction,
    preservationContract,
    conversationText,
    state
  );

  // Single structured output config requesting 3 variants
  const multiIntensityConfig = {
    name: "tone_transformation",
    schema: {
      type: "object",
      properties: {
        light: { type: "string", description: "Light intensity transformation" },
        medium: { type: "string", description: "Medium intensity transformation" },
        strong: { type: "string", description: "Strong intensity transformation" },
      },
      required: ["light", "medium", "strong"],
      additionalProperties: false,
    },
  };

  // Single AI call for all 3 intensities
  let intensityTexts: Record<ToneIntensity, string>;
  try {
    const raw = await provider.chatStructured(
      [
        { role: "system", content: allIntensityPrompt },
        { role: "user", content: `Original draft: "${draft}"\n\nGenerate 3 versions at light, medium, and strong intensity.` },
      ],
      multiIntensityConfig,
      { temperature: 0.8, maxTokens: 1500 }
    );

    const parsed = JSON.parse(raw) as { light: string; medium: string; strong: string };

    intensityTexts = {
      light: parsed.light || draft,
      medium: parsed.medium || draft,
      strong: parsed.strong || draft,
    };
  } catch {
    // Fallback: use original draft for all intensities
    intensityTexts = { light: draft, medium: draft, strong: draft };
  }

  // Humanize all 3 variants in a single call
  const humanizeInput = (["light", "medium", "strong"] as ToneIntensity[]).map((int) => ({
    text: intensityTexts[int],
    strategy: toneMapping.mode,
  }));

  let humanizedResults: Array<{ text: string; strategy: string }>;
  try {
    const humanizeResult = await humanizeReplies(
      provider,
      humanizeInput,
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
    humanizedResults = humanizeResult.humanized;
  } catch {
    humanizedResults = humanizeInput;
  }

  // Map humanized results back to intensities
  const allCandidates: ToneCandidate[] = [];
  const intensities: ToneIntensity[] = ["light", "medium", "strong"];

  for (let i = 0; i < intensities.length; i++) {
    const int = intensities[i];
    const humanizedText = humanizedResults[i]?.text || intensityTexts[int];

    // Validate preservation
    const preservationResult = validatePreservation(preservationContract, humanizedText);

    // Score tone fit
    const toneFit = scoreToneFit(humanizedText, targetTone);

    allCandidates.push({
      text: humanizedText,
      tone: targetTone,
      intensity: int,
      toneFit,
      rationale: generateToneRationale(humanizedText, draft, targetTone, int, preservationResult.details),
      meaningPreserved: preservationResult.passed,
    });
  }

  // 5. Check overall preservation
  const overallPreservation = checkTonePreservation(draft, allCandidates, preservationContract);

  // 6. Determine recommended candidate (prefer medium, fallback to best preserved)
  const recommendedIndex = determineRecommendedCandidate(allCandidates);

  // 7. Build summary
  const summary = buildTransformationSummary(draft, allCandidates[recommendedIndex]?.text || draft, toneMapping);

  return {
    originalDraft: draft,
    targetTone,
    intensity,
    candidates: allCandidates,
    preservation: overallPreservation,
    recommendedCandidate: recommendedIndex,
    languageState: {
      primary: state.language.primary,
      script: state.language.script,
      romanized: state.language.romanized,
      codeMixed: state.language.codeMixed,
    },
    summary,
  };
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function buildAllIntensitiesPrompt(
  draft: string,
  targetTone: TargetTone,
  toneInstruction: string,
  preservationContract: PreservationContract,
  conversationText: string,
  state: ConversationState
): string {
  const parts: string[] = [];

  parts.push("## Tone Transformation Task");
  parts.push(`Transform the following message into 3 versions at different intensities of ${targetTone} tone.`);
  parts.push(`Original draft: "${draft}"`);
  parts.push(`Target tone: ${targetTone}`);
  parts.push(`Tone instruction: ${toneInstruction}`);

  parts.push("\n## Intensity Definitions");
  parts.push("- **light**: Subtle adjustments. Barely noticeable but improving the overall feel.");
  parts.push("- **medium**: Clear but natural adjustments. Noticeable but not dramatic.");
  parts.push("- **strong**: Significant adjustments to fully embody the target tone.");

  // Add preservation constraints
  parts.push("\n## Critical Preservation Constraints (MEANING LOCK)");
  parts.push("ALL versions MUST preserve ALL of the following:");

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

  if (preservationContract.semanticConstraints.commitments.length > 0) {
    const commitments = preservationContract.semanticConstraints.commitments.map((c) => c.word).join(", ");
    parts.push(`- Commitments: ${commitments}`);
  }

  parts.push("\n## What MUST NOT Change");
  parts.push("- User intent");
  parts.push("- User's position or stance");
  parts.push("- Boundaries and limitations");
  parts.push("- Factual claims, dates, times, numbers");
  parts.push("- Negation");
  parts.push("- The subject/topic");

  parts.push("\n## What CAN Change");
  parts.push("- Wording and sentence structure");
  parts.push("- Tone and formality level");
  parts.push("- Naturalness and conversational flow");

  parts.push(`\n## Conversation Context`);
  parts.push(`Context type: ${state.context.type}`);
  parts.push(`Conflict level: ${state.conflict.level}`);
  parts.push(`Tone: ${state.tone.primary}`);
  parts.push(`Relationship: ${state.relationship}`);

  if (conversationText) {
    parts.push(`\n## Conversation\n${conversationText}`);
  }

  parts.push('\nReturn JSON with keys: "light", "medium", "strong" — each containing the transformed message at that intensity.');

  return parts.join("\n");
}

function buildTonePrompt(
  draft: string,
  targetTone: TargetTone,
  intensity: ToneIntensity,
  toneInstruction: string,
  intensityModifier: string,
  preservationContract: PreservationContract,
  conversationText: string,
  state: ConversationState
): string {
  const parts: string[] = [];

  parts.push("## Tone Transformation Task");
  parts.push(`Original draft: "${draft}"`);
  parts.push(`Target tone: ${targetTone}`);
  parts.push(`Intensity: ${intensity}`);
  parts.push(`Tone instruction: ${toneInstruction}`);
  parts.push(`Intensity guidance: ${intensityModifier}`);

  // Add preservation constraints
  parts.push("\n## Critical Preservation Constraints (MEANING LOCK)");
  parts.push("The transformed message MUST preserve ALL of the following:");

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

  if (preservationContract.semanticConstraints.commitments.length > 0) {
    const commitments = preservationContract.semanticConstraints.commitments.map((c) => c.word).join(", ");
    parts.push(`- Commitments: ${commitments}`);
  }

  parts.push("\n## What MUST NOT Change");
  parts.push("- User intent (what the message is trying to do)");
  parts.push("- User's position or stance");
  parts.push("- Boundaries and limitations");
  parts.push("- Commitments and promises");
  parts.push("- Factual claims, dates, times, numbers");
  parts.push("- Named entities (people, places, organizations)");
  parts.push("- Language/script preference (Romanized Telugu stays Romanized Telugu)");
  parts.push("- Negation (can't stays can't, won't stays won't)");
  parts.push("- The subject/topic of the message");

  parts.push("\n## What CAN Change");
  parts.push("- Wording and sentence structure");
  parts.push("- Tone and formality level");
  parts.push("- Naturalness and conversational flow");
  parts.push("- Warmth, assertiveness, or playfulness");
  parts.push("- Conciseness (if appropriate for the tone)");

  parts.push(`\n## Conversation Context`);
  parts.push(`Context type: ${state.context.type}`);
  parts.push(`Conflict level: ${state.conflict.level}`);
  parts.push(`Tone: ${state.tone.primary}`);
  parts.push(`Relationship: ${state.relationship}`);

  if (conversationText) {
    parts.push(`\n## Conversation\n${conversationText}`);
  }

  return parts.join("\n");
}

function generateToneRationale(
  transformed: string,
  original: string,
  targetTone: TargetTone,
  intensity: ToneIntensity,
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

  parts.push(`${targetTone} tone at ${intensity} intensity`);

  // Note what changed
  const lengthDiff = transformed.length - original.length;
  if (Math.abs(lengthDiff) > original.length * 0.3) {
    parts.push(lengthDiff > 0 ? "expanded phrasing" : "condensed phrasing");
  }

  // Preservation status
  const preserved = [];
  if (preservationDetails.negationPreserved) preserved.push("negation");
  if (preservationDetails.temporalPreserved) preserved.push("temporal");
  if (preservationDetails.factsPreserved) preserved.push("facts");
  if (preservationDetails.positionPreserved) preserved.push("position");
  if (preservationDetails.boundaryPreserved) preserved.push("boundaries");

  if (preserved.length > 0) {
    parts.push(`preserved: ${preserved.join(", ")}`);
  }

  return parts.join(". ");
}

function checkTonePreservation(
  draft: string,
  candidates: ToneCandidate[],
  preservationContract: PreservationContract
): TonePreservationStatus {
  const issues: string[] = [];
  let intent = true;
  const goal = true;
  let position = true;
  let boundaries = true;
  let facts = true;
  let negation = true;
  let temporalConstraints = true;
  const language = true;

  for (const candidate of candidates) {
    const result = validatePreservation(preservationContract, candidate.text);

    if (!result.passed) {
      issues.push(...result.issues);
    }

    if (!result.details.negationPreserved || !result.details.abilityPreserved) {
      intent = false;
      negation = false;
    }
    if (!result.details.positionPreserved) {
      position = false;
    }
    if (!result.details.boundaryPreserved) {
      boundaries = false;
    }
    if (!result.details.factsPreserved) {
      facts = false;
    }
    if (!result.details.temporalPreserved) {
      temporalConstraints = false;
    }
  }

  return {
    passed: issues.length === 0,
    intent,
    goal,
    position,
    boundaries,
    facts,
    negation,
    temporalConstraints,
    language,
    issues: [...new Set(issues)],
  };
}

function determineRecommendedCandidate(candidates: ToneCandidate[]): number {
  // Prefer medium intensity if it preserves meaning
  const mediumIndex = candidates.findIndex((c) => c.intensity === "medium" && c.meaningPreserved);
  if (mediumIndex !== -1) return mediumIndex;

  // Fallback to best preserved candidate
  const preservedIndex = candidates.findIndex((c) => c.meaningPreserved);
  if (preservedIndex !== -1) return preservedIndex;

  // Fallback to first candidate
  return 0;
}

function buildTransformationSummary(
  original: string,
  transformed: string,
  mapping: ToneMapping
): ToneTransformationSummary {
  const changes: string[] = [];
  const preserved: string[] = [];

  // Detect changes
  const originalLength = original.split(/\s+/).length;
  const transformedLength = transformed.split(/\s+/).length;

  if (Math.abs(transformedLength - originalLength) > 2) {
    changes.push(transformedLength > originalLength ? "Expanded phrasing" : "Condensed phrasing");
  } else {
    preserved.push("Message length");
  }

  // Check emoji changes
  const originalEmojis = (original.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const transformedEmojis = (transformed.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (originalEmojis !== transformedEmojis) {
    changes.push("Emoji usage");
  } else {
    preserved.push("Emoji usage");
  }

  // Check formality changes
  const formalPatterns = /\b(dear|sincerely|respectfully|regarding|pursuant|furthermore|moreover)\b/i;
  const casualPatterns = /\b(haha|lol|omg|bruh|nah|yep|nope|gonna|wanna)\b/i;
  const originalFormal = formalPatterns.test(original);
  const transformedFormal = formalPatterns.test(transformed);
  const originalCasual = casualPatterns.test(original);
  const transformedCasual = casualPatterns.test(transformed);

  if (transformedFormal && !originalFormal) {
    changes.push("Increased formality");
  } else if (transformedCasual && !originalCasual) {
    changes.push("Decreased formality");
  } else {
    preserved.push("Formality level");
  }

  return {
    changes,
    preserved,
    formalityShift: mapping.formalityShift,
    assertivenessShift: mapping.assertivenessShift,
    warmthShift: mapping.warmthShift,
  };
}
