// ─── Draft Analysis Engine ───────────────────────────────────────────────────
//
// Analyzes a user's draft message against the current conversation.
// Combines deterministic checks with AI-powered semantic analysis.
//
// Architecture:
//   DRAFT + CONVERSATION + STATE → DRAFT ANALYSIS → COACHING → OPTIONAL IMPROVEMENT
// ──────────────────────────────────────────────────────────────────────────────

import type { AIProvider } from "./provider";
import type { ConversationState } from "./conversation-state";
import type { WritingStyleProfile } from "./personality";
import type {
  DraftAnalysis,
  DraftAnalysisInput,
  DraftAnalysisResult,
  DeterministicDraftChecks,
  DraftIntent,
  DraftToneLabel,
  PerceivedImpactLabel,
  DraftStrength,
  DraftIssue,
  ImprovementMode,
  DraftImprovementInput,
  DraftImprovementResult,
} from "./draft-types";
import type { ConversationContext } from "./context";
import { selectStrategies } from "./strategy";
import { buildConversationText } from "./prompt-builder";
import { DraftAnalysisSchema } from "./schemas";
import { createPipelineError, logPipelineError } from "./errors";

// ─── AI Prompt ────────────────────────────────────────────────────────────────

const DRAFT_ANALYSIS_PROMPT = `You are a communication coach analyzing a user's draft message against the current conversation.

Your job is to understand:
1. What the user is trying to communicate (intent)
2. How their draft sounds (tone)
3. How the other person may interpret it (perceived impact)
4. Whether it matches the user's goal
5. Whether it fits the conversation context
6. Whether it could escalate conflict or cause misunderstanding
7. What is strong about the draft
8. What could be improved
9. How to coach the user without being preachy

## Rules

- NEVER claim to know exactly what the other person thinks
- Use "may come across as..." or "could be interpreted as..."
- NEVER diagnose psychological states ("you are being narcissistic")
- NEVER claim certainty about emotions ("they will feel insulted")
- Preserve the user's intent and position — do not force them to be submissive or apologetic
- Acknowledge when the user has a legitimate position
- Be honest about risks without being alarmist
- Keep coaching concise and actionable
- Do not lecture
- Focus on EFFECTIVENESS, not niceness

## Output

Return a JSON object with the following fields:
{
  "intent": one of the intent values,
  "draftStrategy": one of the strategy values,
  "tone": { "primary": tone_label, "secondary": tone_label, "intensity": 0.0-1.0 },
  "perceivedImpact": one of the impact labels,
  "perceivedImpactExplanation": "brief explanation",
  "goalAlignment": 0.0-1.0,
  "clarity": 0.0-1.0,
  "misunderstandingRisk": 0.0-1.0,
  "escalationRisk": 0.0-1.0,
  "pressureRisk": 0.0-1.0,
  "styleConsistency": 0.0-1.0,
  "languageConsistency": 0.0-1.0,
  "factualIntegrity": 0.0-1.0,
  "strengths": [{ "category": "...", "explanation": "..." }],
  "issues": [{ "category": "...", "severity": "low|medium|high", "explanation": "...", "suggestion": "..." }],
  "recommendedApproach": "brief recommended strategy",
  "coaching": "concise coaching advice",
  "analysisConfidence": 0.0-1.0
}

Return ONLY valid JSON.`;

// ─── Deterministic Patterns ───────────────────────────────────────────────────

const CLICHE_PATTERNS = [
  /\bthat sounds amazing\b/i,
  /\bthat's really interesting\b/i,
  /\bi'd love to hear more\b/i,
  /\bthat sounds fascinating\b/i,
  /\bwhat inspired you to\b/i,
  /\bi completely understand\b/i,
  /\bthat makes total sense\b/i,
  /\bI appreciate you\b/i,
  /\bthank you for sharing\b/i,
  /\bI hear you\b/i,
  /\bthat's a great point\b/i,
  /\bI see where you're coming from\b/i,
];

const AGGRESSIVE_PATTERNS = [
  /\byou always\b/i,
  /\byou never\b/i,
  /\byou're being\b/i,
  /\bstop being\b/i,
  /\bwhy are you\b/i,
  /\byou need to\b/i,
  /\byou have to\b/i,
  /\bhow could you\b/i,
  /\byou should have\b/i,
  /\byou don't\b/i,
  /\byou can't even\b/i,
  /\byou always do this\b/i,
];

const PRESSURE_PATTERNS = [
  /\banswer me\b/i,
  /\bright now\b/i,
  /\bimmediately\b/i,
  /\bI need an answer\b/i,
  /\byou have to\b/i,
  /\byou must\b/i,
  /\bthis is urgent\b/i,
  /\bdon't ignore me\b/i,
  /\bstop ignoring\b/i,
  /\brespond now\b/i,
  /\bI'm waiting\b/i,
];

const PERSONAL_ATTACK_PATTERNS = [
  /\byou're an?\b.*\b(idiot|fool|moron|jerk|ass|stupid|dumb|pathetic|useless|worthless)\b/i,
  /\byou're so\b.*\b(stupid|dumb|pathetic|useless|worthless|annoying)\b/i,
  /\bshut up\b/i,
  /\bfuck you\b/i,
  /\bget lost\b/i,
  /\byou make me sick\b/i,
];

const BOUNDARY_LANGUAGE = [
  /\bi'm not comfortable\b/i,
  /\bI don't like\b/i,
  /\bplease stop\b/i,
  /\bthat's not okay\b/i,
  /\bI need you to\b/i,
  /\bmy boundary\b/i,
  /\bI won't\b/i,
  /\bI can't\b/i,
];

const APOLOGY_LANGUAGE = [
  /\bsorry\b/i,
  /\bI apologize\b/i,
  /\bmy fault\b/i,
  /\bmy mistake\b/i,
  /\bI should have\b/i,
  /\bI shouldn't have\b/i,
  /\bI regret\b/i,
];

const PROFESSIONAL_LANGUAGE = [
  /\bplease\b/i,
  /\bthank you\b/i,
  /\bwould you\b/i,
  /\bcould you\b/i,
  /\bI appreciate\b/i,
  /\bbest regards\b/i,
  /\bsincerely\b/i,
  /\bregards\b/i,
  /\bper our conversation\b/i,
  /\bas discussed\b/i,
];

const CASUAL_LANGUAGE = [
  /\bbro\b/i,
  /\b dude\b/i,
  /\byo\b/i,
  /\bhey\b/i,
  /\bsup\b/i,
  /\blol\b/i,
  /\bhaha\b/i,
  /\bomg\b/i,
  /\bimo\b/i,
  /\bgb\b/i,
  /\bngl\b/i,
  /\bfr\b/i,
  /\bsmh\b/i,
  /\bbruh\b/i,
];

const FLIRTY_LANGUAGE = [
  /\bmiss you\b/i,
  /\bthinking of you\b/i,
  /\byou're cute\b/i,
  /\bdate\b/i,
  /\btogether\b/i,
  /\b-alone\b/i,
  /\bjust us\b/i,
  /\bflirty\b/i,
  /\bheart\b/i,
  /\bkiss\b/i,
];

const PLAYFUL_LANGUAGE = [
  /\bhaha\b/i,
  /\blol\b/i,
  /\brofl\b/i,
  /\blmao\b/i,
  /\b😂\b/,
  /\b🤣\b/,
  /\b😄\b/,
  /\b😏\b/,
  /\b😂😂\b/,
];

const EMPATHY_LANGUAGE = [
  /\bI understand\b/i,
  /\bthat must be\b/i,
  /\bI can imagine\b/i,
  /\bthat sounds hard\b/i,
  /\bI feel for you\b/i,
  /\bI'm here for you\b/i,
  /\bthat's tough\b/i,
];

const DEFENSIVE_LANGUAGE = [
  /\bit's not my fault\b/i,
  /\bI didn't\b/i,
  /\bI already\b/i,
  /\bI'm not the one\b/i,
  /\byou're the one who\b/i,
  /\bblame\b/i,
  /\baccusing\b/i,
  /\bdefend\b/i,
];

const SARCASM_INDICATORS = [
  /\boh really\b/i,
  /\bno kidding\b/i,
  /\bwow\b/i,
  /\bsure\b/i,
  /\byeah right\b/i,
  /\btell me about it\b/i,
  /\bwhat a surprise\b/i,
  /\bshocking\b/i,
];

const PASSIVE_AGGRESSIVE_INDICATORS = [
  /\bfine\b/i,
  /\bwhatever\b/i,
  /\bsure\b/i,
  /\bI guess\b/i,
  /\bif you say so\b/i,
  /\bthat's fine\b/i,
  /\bno problem\b/i,
  /\bit's fine\b/i,
  /\bokay then\b/i,
];

// ─── Deterministic Checks ─────────────────────────────────────────────────────

export function runDeterministicDraftChecks(draft: string): DeterministicDraftChecks {
  const words = draft.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = draft.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;

  const emojiMatches = draft.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || [];
  const emojiCount = emojiMatches.length;

  const exclamationCount = (draft.match(/!/g) || []).length;
  const questionCount = (draft.match(/\?/g) || []).length;

  return {
    wordCount,
    sentenceCount,
    emojiCount,
    exclamationCount,
    questionCount,
    hasExcessivePunctuation: exclamationCount > 2 || questionCount > 2,
    hasAllCaps: /\b[A-Z]{3,}\b/.test(draft) && !/^[A-Z\s!?.,]+$/.test(draft),
    hasCliché: CLICHE_PATTERNS.some((p) => p.test(draft)),
    clichéMatches: CLICHE_PATTERNS.filter((p) => p.test(draft)).map((p) => p.source),
    isVeryShort: wordCount <= 3,
    isVeryLong: wordCount > 80,
    hasAggressiveLanguage: AGGRESSIVE_PATTERNS.some((p) => p.test(draft)),
    aggressiveMatches: AGGRESSIVE_PATTERNS.filter((p) => p.test(draft)).map((p) => p.source),
    hasPressureLanguage: PRESSURE_PATTERNS.some((p) => p.test(draft)),
    pressureMatches: PRESSURE_PATTERNS.filter((p) => p.test(draft)).map((p) => p.source),
    hasBoundaryLanguage: BOUNDARY_LANGUAGE.some((p) => p.test(draft)),
    hasApologyLanguage: APOLOGY_LANGUAGE.some((p) => p.test(draft)),
    hasProfessionalLanguage: PROFESSIONAL_LANGUAGE.some((p) => p.test(draft)),
    hasCasualLanguage: CASUAL_LANGUAGE.some((p) => p.test(draft)),
    hasFlirtyLanguage: FLIRTY_LANGUAGE.some((p) => p.test(draft)),
    hasPlayfulLanguage: PLAYFUL_LANGUAGE.some((p) => p.test(draft)),
    hasEmpathyLanguage: EMPATHY_LANGUAGE.some((p) => p.test(draft)),
    hasDefensiveLanguage: DEFENSIVE_LANGUAGE.some((p) => p.test(draft)),
    hasSarcasmIndicators: SARCASM_INDICATORS.some((p) => p.test(draft)),
    hasPassiveAggressiveIndicators: PASSIVE_AGGRESSIVE_INDICATORS.some((p) => p.test(draft)),
    hasPersonalAttack: PERSONAL_ATTACK_PATTERNS.some((p) => p.test(draft)),
    personalAttackMatches: PERSONAL_ATTACK_PATTERNS.filter((p) => p.test(draft)).map((p) => p.source),
  };
}

// ─── Score Adjustments from Deterministic Checks ──────────────────────────────

function adjustScoresFromDeterministicChecks(
  scores: {
    escalationRisk: number;
    pressureRisk: number;
    clarity: number;
    styleConsistency: number;
    languageConsistency: number;
    factualIntegrity: number;
    goalAlignment: number;
  },
  checks: DeterministicDraftChecks
): typeof scores {
  const adjusted = { ...scores };

  // Escalation risk
  if (checks.hasPersonalAttack) adjusted.escalationRisk = Math.min(1, adjusted.escalationRisk + 0.3);
  if (checks.hasAggressiveLanguage) adjusted.escalationRisk = Math.min(1, adjusted.escalationRisk + 0.2);
  if (checks.hasDefensiveLanguage) adjusted.escalationRisk = Math.min(1, adjusted.escalationRisk + 0.1);
  if (checks.hasSarcasmIndicators) adjusted.escalationRisk = Math.min(1, adjusted.escalationRisk + 0.15);
  if (checks.hasPassiveAggressiveIndicators) adjusted.escalationRisk = Math.min(1, adjusted.escalationRisk + 0.1);

  // Pressure risk
  if (checks.hasPressureLanguage) adjusted.pressureRisk = Math.min(1, adjusted.pressureRisk + 0.25);

  // Clarity
  if (checks.isVeryShort) adjusted.clarity = Math.max(0, adjusted.clarity - 0.2);
  if (checks.hasExcessivePunctuation) adjusted.clarity = Math.max(0, adjusted.clarity - 0.05);

  // Style
  if (checks.hasCliché) adjusted.styleConsistency = Math.max(0, adjusted.styleConsistency - 0.1);
  if (checks.hasAllCaps) adjusted.styleConsistency = Math.max(0, adjusted.styleConsistency - 0.1);

  return adjusted;
}

// ─── Build Draft Analysis Prompt ──────────────────────────────────────────────

function buildDraftAnalysisPrompt(
  input: DraftAnalysisInput,
  state: ConversationState,
  checks: DeterministicDraftChecks
): string {
  const conversationText = buildConversationText(input.messages);
  const stateSummary = buildStateSummaryForDraft(state);

  let prompt = DRAFT_ANALYSIS_PROMPT;

  prompt += `\n\n## User's Draft\n"${input.draft}"`;

  prompt += `\n\n## Conversation\n${conversationText}`;

  prompt += `\n\n## Conversation State\n${stateSummary}`;

  if (input.goal) {
    prompt += `\n\n## User's Stated Goal\n${input.goal}`;
  }

  if (input.platform) {
    prompt += `\n\n## Platform\n${input.platform}`;
  }

  if (input.userFacts && input.userFacts.length > 0) {
    prompt += `\n\n## Known Facts\n${input.userFacts.map((f) => `- ${f}`).join("\n")}`;
  }

  // Deterministic signals to guide the AI
  prompt += `\n\n## Deterministic Signals`;
  prompt += `\n- Word count: ${checks.wordCount}`;
  prompt += `\n- Emoji count: ${checks.emojiCount}`;
  prompt += `\n- Exclamation marks: ${checks.exclamationCount}`;
  prompt += `\n- Question marks: ${checks.questionCount}`;
  if (checks.hasAggressiveLanguage) prompt += `\n- DETECTED: Aggressive language patterns`;
  if (checks.hasPressureLanguage) prompt += `\n- DETECTED: Pressure language patterns`;
  if (checks.hasPersonalAttack) prompt += `\n- DETECTED: Personal attack patterns`;
  if (checks.hasDefensiveLanguage) prompt += `\n- DETECTED: Defensive language patterns`;
  if (checks.hasBoundaryLanguage) prompt += `\n- DETECTED: Boundary-setting language`;
  if (checks.hasApologyLanguage) prompt += `\n- DETECTED: Apologetic language`;
  if (checks.hasProfessionalLanguage) prompt += `\n- DETECTED: Professional language`;
  if (checks.hasCasualLanguage) prompt += `\n- DETECTED: Casual language`;
  if (checks.hasFlirtyLanguage) prompt += `\n- DETECTED: Flirty language`;
  if (checks.hasPlayfulLanguage) prompt += `\n- DETECTED: Playful language`;
  if (checks.hasEmpathyLanguage) prompt += `\n- DETECTED: Empathy language`;
  if (checks.hasSarcasmIndicators) prompt += `\n- DETECTED: Sarcasm indicators`;
  if (checks.hasPassiveAggressiveIndicators) prompt += `\n- DETECTED: Passive-aggressive indicators`;
  if (checks.hasCliché) prompt += `\n- DETECTED: Cliché phrases (AI-like)`;

  return prompt;
}

function buildStateSummaryForDraft(state: ConversationState): string {
  const parts: string[] = [];

  parts.push(`Relationship: ${state.relationship}`);
  parts.push(`Context: ${state.context.type}`);
  parts.push(`Situation: ${state.context.situation}`);
  parts.push(`User Intent: ${state.intent.userIntent}`);
  parts.push(`Other Intent: ${state.intent.otherIntent}`);
  parts.push(`Emotion: ${state.emotion.primary} (intensity: ${state.emotion.intensity})`);
  parts.push(`Tone: ${state.tone.primary} (intensity: ${state.tone.intensity})`);
  parts.push(`Conflict Level: ${state.conflict.level}`);
  parts.push(`Conflict Escalation: ${state.conflict.escalation}`);
  parts.push(`Participants: ${state.participants.count}${state.participants.isGroup ? " (group)" : ""}`);

  if (state.strategy.ranked.length > 0) {
    const strategies = state.strategy.ranked
      .slice(0, 3)
      .map((s) => s.strategy)
      .join(", ");
    parts.push(`Recommended strategies: ${strategies}`);
  }

  if (state.style.profile) {
    const p = state.style.profile;
    parts.push(`User style: ${p.sentence.lengthCategory} messages, ${p.tonePreference.formality} formality`);
    parts.push(`Emoji usage: ${p.emoji.usesEmojis ? `${Math.round(p.emoji.frequency * 100)}%` : "none"}`);
  }

  if (state.language.codeMixed) {
    parts.push(`Language: code-mixed (${state.language.primary} + ${state.language.secondary.join(", ")})`);
  } else {
    parts.push(`Language: ${state.language.primary} (${state.language.script})`);
  }

  return parts.join("\n");
}

// ─── Factual Integrity Check ──────────────────────────────────────────────────

function checkFactualIntegrity(
  draft: string,
  messages: Array<{ sender: "me" | "them" | "unknown"; text: string }>,
  userFacts?: string[]
): number {
  let score = 1.0;

  // Check if draft introduces claims not supported by conversation
  const draftLower = draft.toLowerCase();

  // Simple heuristic: if draft mentions specific facts not in conversation or user facts
  // This is a basic check — the AI does the deeper semantic check
  const conversationText = messages.map((m) => m.text.toLowerCase()).join(" ");
  const factsText = (userFacts || []).join(" ").toLowerCase();
  const combinedKnown = conversationText + " " + factsText;

  // Check for specific factual claims that seem unsupported
  const factualPatterns = [
    /\b(I |my |we |our )\b.{0,30}\b(was|were|is|are|did|have|had|will|would|could|should)\b.{0,30}\b(because|since|due to|after|before|when)\b/i,
  ];

  for (const pattern of factualPatterns) {
    if (pattern.test(draft)) {
      // This is a factual claim — check if any key words appear in known content
      const claimWords = draftLower.split(/\s+/).filter((w) => w.length > 4);
      const knownWords = new Set(combinedKnown.split(/\s+/));
      const unsupportedWords = claimWords.filter((w) => !knownWords.has(w));
      if (unsupportedWords.length > claimWords.length * 0.5) {
        score = Math.max(0.3, score - 0.2);
      }
    }
  }

  return score;
}

// ─── Style Consistency Check ──────────────────────────────────────────────────

function checkStyleConsistency(
  draft: string,
  profile: WritingStyleProfile | null,
  checks: DeterministicDraftChecks
): number {
  if (!profile) return 0.7; // default when no profile

  let score = 1.0;

  // Length check
  const draftWords = checks.wordCount;
  const avgWords = profile.sentence.averageWords;
  if (avgWords > 0) {
    const lengthRatio = draftWords / avgWords;
    if (lengthRatio > 3 || lengthRatio < 0.2) {
      score = Math.max(0.3, score - 0.3);
    } else if (lengthRatio > 2 || lengthRatio < 0.4) {
      score = Math.max(0.4, score - 0.15);
    }
  }

  // Emoji check
  if (profile.emoji.usesEmojis && checks.emojiCount === 0) {
    score = Math.max(0.4, score - 0.1);
  } else if (!profile.emoji.usesEmojis && checks.emojiCount > 2) {
    score = Math.max(0.4, score - 0.1);
  }

  // Formality check
  const formality = profile.tonePreference.formality;
  if (formality === "formal" || formality === "very_formal") {
    if (checks.hasCasualLanguage) score = Math.max(0.3, score - 0.2);
  } else if (formality === "very_casual" || formality === "casual") {
    if (checks.hasProfessionalLanguage) score = Math.max(0.3, score - 0.15);
  }

  return score;
}

// ─── Language Consistency Check ───────────────────────────────────────────────

function checkLanguageConsistency(
  draft: string,
  state: ConversationState,
  checks: DeterministicDraftChecks
): number {
  let score = 1.0;

  // Check if draft uses expected language/script
  if (state.language.codeMixed) {
    // For code-mixed conversations, check if draft has mixed language signals
    const hasLatin = /[a-zA-Z]/.test(draft);
    const hasNonLatin = /[^\x00-\x7F]/.test(draft);
    if (!hasLatin && !hasNonLatin) {
      score = Math.max(0.5, score - 0.1);
    }
  }

  if (state.language.romanized) {
    // For Romanized conversations, check if draft looks like Romanized text
    // Basic heuristic: should have Latin characters and might have common Romanized patterns
    const hasLatin = /[a-zA-Z]/.test(draft);
    if (!hasLatin) {
      score = Math.max(0.4, score - 0.2);
    }
  }

  return score;
}

// ─── Main Analysis Function ───────────────────────────────────────────────────

export function analyzeDraft(
  input: DraftAnalysisInput,
  state: ConversationState
): { analysis: DraftAnalysis; checks: DeterministicDraftChecks } {
  const checks = runDeterministicDraftChecks(input.draft);

  // Start with default scores
  let scores = {
    escalationRisk: 0.2,
    pressureRisk: 0.1,
    clarity: 0.7,
    styleConsistency: 0.7,
    languageConsistency: 0.8,
    factualIntegrity: 1.0,
    goalAlignment: 0.7,
  };

  // Adjust from deterministic checks
  scores = adjustScoresFromDeterministicChecks(scores, checks);

  // Check factual integrity
  scores.factualIntegrity = checkFactualIntegrity(
    input.draft,
    input.messages,
    input.userFacts
  );

  // Check style consistency
  scores.styleConsistency = checkStyleConsistency(
    input.draft,
    state.style.profile,
    checks
  );

  // Check language consistency
  scores.languageConsistency = checkLanguageConsistency(
    input.draft,
    state,
    checks
  );

  // Determine tone from deterministic signals
  let primaryTone: DraftToneLabel = "neutral";
  let secondaryTone: DraftToneLabel = "neutral";
  let toneIntensity = 0.5;

  if (checks.hasAggressiveLanguage || checks.hasPersonalAttack) {
    primaryTone = "angry";
    toneIntensity = 0.8;
  } else if (checks.hasDefensiveLanguage) {
    primaryTone = "defensive";
    toneIntensity = 0.6;
  } else if (checks.hasSarcasmIndicators) {
    primaryTone = "sarcastic";
    toneIntensity = 0.6;
  } else if (checks.hasPassiveAggressiveIndicators) {
    primaryTone = "passive_aggressive";
    toneIntensity = 0.5;
  } else if (checks.hasProfessionalLanguage) {
    primaryTone = "professional";
    toneIntensity = 0.6;
  } else if (checks.hasCasualLanguage) {
    primaryTone = "casual";
    toneIntensity = 0.5;
  } else if (checks.hasFlirtyLanguage) {
    primaryTone = "flirty";
    toneIntensity = 0.6;
  } else if (checks.hasPlayfulLanguage) {
    primaryTone = "playful";
    toneIntensity = 0.5;
  } else if (checks.hasEmpathyLanguage) {
    primaryTone = "empathetic";
    toneIntensity = 0.6;
  } else if (checks.hasBoundaryLanguage) {
    primaryTone = "direct";
    toneIntensity = 0.6;
  } else if (checks.hasApologyLanguage) {
    primaryTone = "warm";
    secondaryTone = "uncertain";
    toneIntensity = 0.5;
  }

  // Determine perceived impact
  let perceivedImpact: PerceivedImpactLabel = "neutral";
  let perceivedImpactExplanation = "The message appears neutral in tone.";

  if (checks.hasPersonalAttack || checks.hasAggressiveLanguage) {
    perceivedImpact = "confrontational";
    perceivedImpactExplanation = "This may come across as confrontational or accusatory.";
  } else if (checks.hasDefensiveLanguage) {
    perceivedImpact = "defensive";
    perceivedImpactExplanation = "This may sound defensive, which could escalate the conversation.";
  } else if (checks.hasPressureLanguage) {
    perceivedImpact = "pressuring";
    perceivedImpactExplanation = "This may feel pressuring to the other person.";
  } else if (checks.hasEmpathyLanguage) {
    perceivedImpact = "supportive";
    perceivedImpactExplanation = "This comes across as understanding and supportive.";
  } else if (checks.hasProfessionalLanguage) {
    perceivedImpact = "professional";
    perceivedImpactExplanation = "This sounds professional and appropriate for the context.";
  } else if (checks.hasFlirtyLanguage) {
    perceivedImpact = "playful";
    perceivedImpactExplanation = "This may come across as flirtatious or playful.";
  } else if (checks.hasBoundaryLanguage) {
    perceivedImpact = "confident";
    perceivedImpactExplanation = "This sets a clear boundary, which may be perceived as confident.";
  } else if (checks.hasApologyLanguage) {
    perceivedImpact = "apologetic";
    perceivedImpactExplanation = "This comes across as apologetic and accountable.";
  } else if (checks.hasCasualLanguage) {
    perceivedImpact = "warm";
    perceivedImpactExplanation = "This sounds casual and approachable.";
  } else if (checks.hasSarcasmIndicators) {
    perceivedImpact = "defensive";
    perceivedImpactExplanation = "Sarcasm may be perceived as dismissive or hostile.";
  } else if (checks.hasPassiveAggressiveIndicators) {
    perceivedImpact = "cold";
    perceivedImpactExplanation = "This may come across as passive-aggressive or dismissive.";
  }

  // Determine intent
  let intent: DraftIntent = "unknown";
  if (checks.hasApologyLanguage) intent = "apologize";
  else if (checks.hasBoundaryLanguage) intent = "set_boundary";
  else if (checks.hasFlirtyLanguage) intent = "flirt";
  else if (checks.hasPlayfulLanguage) intent = "make_them_laugh";
  else if (checks.hasEmpathyLanguage) intent = "comfort";
  else if (checks.hasProfessionalLanguage && input.draft.includes("?")) intent = "request";
  else if (checks.hasDefensiveLanguage) intent = "defend";
  else if (checks.hasAggressiveLanguage) intent = "de_escalate";
  else if (input.draft.includes("?")) intent = "clarify";
  else if (input.draft.length > 50) intent = "explain";
  else intent = "continue_conversation";

  // Determine recommended approach
  let recommendedApproach = "natural + clear";
  if (state.conflict.level > 0.5) {
    recommendedApproach = "assertive + factual";
  } else if (state.context.type === "professional" || state.context.type === "academic") {
    recommendedApproach = "professional + clear";
  } else if (state.context.type === "dating") {
    recommendedApproach = "warm + playful";
  } else if (state.context.type === "conflict") {
    recommendedApproach = "calm + direct";
  }

  // Build strengths
  const strengths: DraftStrength[] = [];
  if (checks.wordCount >= 5 && checks.wordCount <= 30) {
    strengths.push({ category: "conciseness", explanation: "Message is a good length for the context." });
  }
  if (checks.hasProfessionalLanguage && (state.context.type === "professional" || state.context.type === "academic")) {
    strengths.push({ category: "appropriate_tone", explanation: "Tone matches the professional context." });
  }
  if (checks.hasCasualLanguage && (state.context.type === "dating" || state.context.type === "friendship")) {
    strengths.push({ category: "natural_style", explanation: "Casual tone fits this context well." });
  }
  if (checks.hasBoundaryLanguage) {
    strengths.push({ category: "clear_boundary", explanation: "Clear boundary setting." });
  }
  if (checks.hasEmpathyLanguage) {
    strengths.push({ category: "empathy", explanation: "Shows understanding of the other person's position." });
  }
  if (checks.hasProfessionalLanguage && checks.wordCount < 40) {
    strengths.push({ category: "clarity", explanation: "Professional and concise." });
  }
  if (!checks.hasCliché && !checks.hasAggressiveLanguage && checks.wordCount > 5) {
    strengths.push({ category: "natural_style", explanation: "Doesn't rely on clichés or aggressive language." });
  }
  if (checks.hasFlirtyLanguage && (state.context.type === "dating")) {
    strengths.push({ category: "appropriate_tone", explanation: "Flirty tone is appropriate for this context." });
  }

  // Build issues
  const issues: DraftIssue[] = [];
  if (checks.hasPersonalAttack) {
    issues.push({
      category: "escalation",
      severity: "high",
      explanation: "Contains personal attacks which will escalate conflict.",
      suggestion: "Focus on the specific behavior or issue, not the person.",
    });
  }
  if (checks.hasAggressiveLanguage) {
    issues.push({
      category: "escalation",
      severity: "medium",
      explanation: "Uses aggressive framing (you always/never) which tends to escalate.",
      suggestion: "Use 'I' statements instead of 'you' accusations.",
    });
  }
  if (checks.hasPressureLanguage) {
    issues.push({
      category: "pressure",
      severity: "medium",
      explanation: "Contains pressure language that may make the other person defensive.",
      suggestion: "Give the other person space to respond naturally.",
    });
  }
  if (checks.hasDefensiveLanguage) {
    issues.push({
      category: "tone",
      severity: "medium",
      explanation: "Defensive tone may escalate rather than resolve.",
      suggestion: "Lead with facts and your position, not defenses.",
    });
  }
  if (checks.hasCliché) {
    issues.push({
      category: "style",
      severity: "low",
      explanation: "Contains cliché phrases that may sound insincere.",
      suggestion: "Be more specific and personal in your wording.",
    });
  }
  if (checks.hasSarcasmIndicators) {
    issues.push({
      category: "tone",
      severity: "medium",
      explanation: "Sarcasm may be perceived as dismissive.",
      suggestion: "Express your point directly without sarcasm.",
    });
  }
  if (checks.hasPassiveAggressiveIndicators) {
    issues.push({
      category: "tone",
      severity: "medium",
      explanation: "Passive-aggressive tone may create distance.",
      suggestion: "Say what you mean directly.",
    });
  }
  if (checks.isVeryShort) {
    issues.push({
      category: "clarity",
      severity: "low",
      explanation: "Very short messages may seem dismissive or unclear.",
      suggestion: "Add a bit more context if the situation requires it.",
    });
  }
  if (checks.isVeryLong) {
    issues.push({
      category: "clarity",
      severity: "low",
      explanation: "Very long messages may lose the reader's attention.",
      suggestion: "Consider breaking into shorter messages.",
    });
  }
  if (scores.factualIntegrity < 0.7) {
    issues.push({
      category: "factual",
      severity: "medium",
      explanation: "Draft may introduce claims not supported by the conversation.",
      suggestion: "Stick to facts you've already established.",
    });
  }

  // Build coaching
  let coaching = "";
  if (checks.hasPersonalAttack) {
    coaching = "Your main point may be valid, but personal attacks will make the other person defensive. Focus on the specific issue, not the person.";
  } else if (checks.hasAggressiveLanguage) {
    coaching = "The framing 'you always/never' tends to escalate. Try stating what happened and what you need instead.";
  } else if (checks.hasDefensiveLanguage) {
    coaching = "Defending your position is fine, but leading with defense can sound like you're avoiding responsibility. Lead with what you did, then clarify.";
  } else if (checks.hasPressureLanguage) {
    coaching = "Pressure language may backfire. Give the other person space and a clear, low-pressure way to respond.";
  } else if (checks.hasBoundaryLanguage) {
    coaching = "Setting a boundary is important. Make sure the wording is clear and direct without being confrontational.";
  } else if (checks.hasApologyLanguage) {
    coaching = "A genuine apology works best when it's specific and includes what you'll do differently. Avoid over-apologizing.";
  } else if (checks.hasCliché) {
    coaching = "This sounds a bit generic. Try being more specific about what you actually think or feel.";
  } else if (scores.clarity < 0.5) {
    coaching = "The message could be clearer. Try stating your main point in the first sentence.";
  } else if (scores.escalationRisk > 0.5) {
    coaching = "This has some escalation risk. Consider whether your goal is to resolve or to win — and adjust accordingly.";
  } else {
    coaching = "This looks reasonable for the context. Make sure it sounds like you and matches what you're actually trying to say.";
  }

  // Determine strategy match
  let draftStrategy: DraftAnalysis["draftStrategy"] = "natural";
  if (checks.hasProfessionalLanguage) draftStrategy = "professional";
  else if (checks.hasCasualLanguage) draftStrategy = "friendly";
  else if (checks.hasFlirtyLanguage) draftStrategy = "flirty";
  else if (checks.hasPlayfulLanguage) draftStrategy = "playful";
  else if (checks.hasBoundaryLanguage) draftStrategy = "boundary_setting";
  else if (checks.hasApologyLanguage) draftStrategy = "apologetic";
  else if (checks.hasDefensiveLanguage) draftStrategy = "assertive";
  else if (checks.hasEmpathyLanguage) draftStrategy = "empathetic";

  const analysis: DraftAnalysis = {
    intent,
    draftStrategy,
    tone: { primary: primaryTone, secondary: secondaryTone, intensity: toneIntensity },
    perceivedImpact,
    perceivedImpactExplanation,
    goalAlignment: scores.goalAlignment,
    clarity: scores.clarity,
    misunderstandingRisk: Math.min(1, 1 - scores.clarity),
    escalationRisk: scores.escalationRisk,
    pressureRisk: scores.pressureRisk,
    styleConsistency: scores.styleConsistency,
    languageConsistency: scores.languageConsistency,
    factualIntegrity: scores.factualIntegrity,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 5),
    recommendedApproach,
    coaching,
    analysisConfidence: 0.75,
  };

  return { analysis, checks };
}

// ─── AI-Enhanced Analysis ─────────────────────────────────────────────────────

export async function analyzeDraftWithAI(
  provider: AIProvider,
  input: DraftAnalysisInput,
  state: ConversationState
): Promise<DraftAnalysisResult> {
  // Run deterministic checks first
  const { analysis: deterministicAnalysis, checks } = analyzeDraft(input, state);

  // Build prompt for AI analysis
  const prompt = buildDraftAnalysisPrompt(input, state, checks);

  try {
    // Call AI with structured output
    const response = await provider.chat(
      [
        { role: "system", content: DRAFT_ANALYSIS_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, maxTokens: 2000 }
    );

    // Parse and validate
    const parsed = JSON.parse(response);
    const validated = DraftAnalysisSchema.safeParse(parsed);

    if (!validated.success) {
      // Fall back to deterministic analysis
      return { analysis: deterministicAnalysis };
    }

    const aiAnalysis = validated.data;

    // Merge AI analysis with deterministic checks
    // AI provides semantic understanding, deterministic provides signal-based scores
    const mergedAnalysis: DraftAnalysis = {
      intent: aiAnalysis.intent !== "unknown" ? aiAnalysis.intent : deterministicAnalysis.intent,
      draftStrategy: aiAnalysis.draftStrategy,
      tone: aiAnalysis.tone,
      perceivedImpact: aiAnalysis.perceivedImpact,
      perceivedImpactExplanation: aiAnalysis.perceivedImpactExplanation,
      goalAlignment: blendScores(deterministicAnalysis.goalAlignment, aiAnalysis.goalAlignment),
      clarity: blendScores(deterministicAnalysis.clarity, aiAnalysis.clarity),
      misunderstandingRisk: blendScores(deterministicAnalysis.misunderstandingRisk, aiAnalysis.misunderstandingRisk),
      escalationRisk: blendScores(deterministicAnalysis.escalationRisk, aiAnalysis.escalationRisk),
      pressureRisk: blendScores(deterministicAnalysis.pressureRisk, aiAnalysis.pressureRisk),
      styleConsistency: blendScores(deterministicAnalysis.styleConsistency, aiAnalysis.styleConsistency),
      languageConsistency: blendScores(deterministicAnalysis.languageConsistency, aiAnalysis.languageConsistency),
      factualIntegrity: blendScores(deterministicAnalysis.factualIntegrity, aiAnalysis.factualIntegrity),
      strengths: aiAnalysis.strengths.length > 0 ? aiAnalysis.strengths : deterministicAnalysis.strengths,
      issues: aiAnalysis.issues.length > 0 ? aiAnalysis.issues : deterministicAnalysis.issues,
      recommendedApproach: aiAnalysis.recommendedApproach || deterministicAnalysis.recommendedApproach,
      coaching: aiAnalysis.coaching || deterministicAnalysis.coaching,
      analysisConfidence: Math.max(deterministicAnalysis.analysisConfidence, aiAnalysis.analysisConfidence),
    };

    return { analysis: mergedAnalysis };
  } catch (error) {
    // On any error, fall back to deterministic analysis
    const pipelineError = createPipelineError("draft_analysis", error);
    logPipelineError(pipelineError);
    return { analysis: deterministicAnalysis };
  }
}

// ─── Score Blending ───────────────────────────────────────────────────────────

function blendScores(deterministic: number, ai: number): number {
  // Weight deterministic checks slightly higher for risk scores
  // Weight AI slightly higher for semantic scores
  return deterministic * 0.4 + ai * 0.6;
}

// ─── Coaching Summary ─────────────────────────────────────────────────────────

export function buildCoachingSummary(analysis: DraftAnalysis): string {
  const parts: string[] = [];

  parts.push(`Intent: ${formatLabel(analysis.intent)}`);
  parts.push(`Tone: ${formatLabel(analysis.tone.primary)}`);

  if (analysis.goalAlignment >= 0.7) {
    parts.push(`Goal alignment: Good (${Math.round(analysis.goalAlignment * 100)}%)`);
  } else if (analysis.goalAlignment >= 0.4) {
    parts.push(`Goal alignment: Medium (${Math.round(analysis.goalAlignment * 100)}%)`);
  } else {
    parts.push(`Goal alignment: Low (${Math.round(analysis.goalAlignment * 100)}%)`);
  }

  if (analysis.escalationRisk > 0.6) {
    parts.push(`Escalation risk: High`);
  } else if (analysis.escalationRisk > 0.3) {
    parts.push(`Escalation risk: Medium`);
  } else {
    parts.push(`Escalation risk: Low`);
  }

  if (analysis.strengths.length > 0) {
    parts.push(`Strengths: ${analysis.strengths.map((s) => formatLabel(s.category)).join(", ")}`);
  }

  if (analysis.issues.length > 0) {
    parts.push(`Watch out: ${analysis.issues.map((i) => formatLabel(i.category)).join(", ")}`);
  }

  return parts.join("\n");
}

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
