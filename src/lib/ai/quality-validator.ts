// ─── Response Quality Validation & Quality Gate ─────────────────────────────
//
// Validates humanized responses before ranking using deterministic-first checks.
// 9 validation dimensions: semantic, factual, strategy, style, naturalness, context, language, safety, preservation.
// ──────────────────────────────────────────────────────────────────────────────

import type { ConversationState } from "./conversation-state";
import type { CommunicationStrategy } from "./intelligence";
import { scoreAILikeness } from "./humanizer";
import {
  createPreservationContract,
  validatePreservation,
  type PreservationContract,
  type ValidationResult as PreservationValidationResult,
} from "./preservation";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ValidationDimension =
  | "semantic"
  | "factual"
  | "strategy"
  | "style"
  | "naturalness"
  | "context"
  | "language"
  | "safety"
  | "preservation";

export interface DimensionScore {
  score: number; // 0.0–1.0, higher is better
  passed: boolean;
  issues: string[];
}

export interface CandidateValidationResult {
  candidate: { text: string; strategy: string };
  dimensions: Record<ValidationDimension, DimensionScore>;
  overallScore: number;
  passed: boolean;
  criticalIssues: string[];
}

export interface QualityValidationOutput {
  results: CandidateValidationResult[];
  passedCandidates: { text: string; strategy: string }[];
  failedCandidates: { text: string; strategy: string }[];
  allFailed: boolean;
  validationSummary: {
    totalCandidates: number;
    passedCount: number;
    failedCount: number;
    averageScore: number;
    dimensionAverages: Record<ValidationDimension, number>;
  };
}

export interface QualityGateConfig {
  /** Minimum overall score for a candidate to pass (0.0–1.0) */
  minimumOverallScore: number;
  /** Minimum score per dimension (0.0–1.0) */
  minimumDimensionScores: Record<ValidationDimension, number>;
  /** Dimensions that are critical — failure here fails the entire candidate regardless of overall score */
  criticalDimensions: ValidationDimension[];
  /** Whether to include failed candidates as fallback when all fail */
  fallbackToFailed: boolean;
}

export const DEFAULT_QUALITY_GATE_CONFIG: QualityGateConfig = {
  minimumOverallScore: 0.4,
  minimumDimensionScores: {
    semantic: 0.3,
    factual: 0.5,
    strategy: 0.4,
    style: 0.3,
    naturalness: 0.3,
    context: 0.3,
    language: 0.3,
    safety: 0.7,
    preservation: 0.6,
  },
  criticalDimensions: ["safety", "factual", "preservation"],
  fallbackToFailed: true,
};

// ─── Validation Pipeline ────────────────────────────────────────────────────

export function validateCandidates(
  candidates: { text: string; strategy: string }[],
  state: ConversationState,
  originalTexts?: string[],
  config: QualityGateConfig = DEFAULT_QUALITY_GATE_CONFIG,
  preservationContracts?: PreservationContract[]
): QualityValidationOutput {
  const results = candidates.map((candidate, index) =>
    validateCandidate(candidate, state, originalTexts?.[index], config, preservationContracts?.[index])
  );

  const passedCandidates: { text: string; strategy: string }[] = [];
  const failedCandidates: { text: string; strategy: string }[] = [];

  for (const result of results) {
    if (result.passed) {
      passedCandidates.push(result.candidate);
    } else {
      failedCandidates.push(result.candidate);
    }
  }

  const allFailed = passedCandidates.length === 0;
  const finalPassed = allFailed && config.fallbackToFailed ? failedCandidates : passedCandidates;

  const dimensionAverages = computeDimensionAverages(results);

  return {
    results,
    passedCandidates: finalPassed,
    failedCandidates,
    allFailed,
    validationSummary: {
      totalCandidates: candidates.length,
      passedCount: passedCandidates.length,
      failedCount: failedCandidates.length,
      averageScore: computeAverageScore(results),
      dimensionAverages,
    },
  };
}

function validateCandidate(
  candidate: { text: string; strategy: string },
  state: ConversationState,
  originalText?: string,
  config: QualityGateConfig = DEFAULT_QUALITY_GATE_CONFIG,
  preservationContract?: PreservationContract
): CandidateValidationResult {
  const dimensions: Record<ValidationDimension, DimensionScore> = {
    semantic: validateSemantic(candidate, originalText),
    factual: validateFactual(candidate, originalText),
    strategy: validateStrategy(candidate, state),
    style: validateStyle(candidate, state),
    naturalness: validateNaturalness(candidate, state),
    context: validateContext(candidate, state),
    language: validateLanguage(candidate, state),
    safety: validateSafety(candidate),
    preservation: validatePreservationDimension(candidate, originalText, preservationContract),
  };

  const criticalIssues: string[] = [];
  for (const dim of config.criticalDimensions) {
    if (!dimensions[dim].passed) {
      criticalIssues.push(...dimensions[dim].issues);
    }
  }

  const overallScore = computeOverallScore(dimensions);
  const passed =
    criticalIssues.length === 0 && overallScore >= config.minimumOverallScore;

  return {
    candidate,
    dimensions,
    overallScore,
    passed,
    criticalIssues,
  };
}

// ─── Dimension: Semantic ─────────────────────────────────────────────────────
//
// Checks that the humanized text preserves core meaning from the original.
// Uses keyword overlap and basic structural checks.
// ──────────────────────────────────────────────────────────────────────────────

function validateSemantic(
  candidate: { text: string; strategy: string },
  originalText?: string
): DimensionScore {
  const issues: string[] = [];
  let score = 1.0;

  if (!originalText) {
    // No original to compare — assume reasonable
    return { score: 0.8, passed: true, issues: [] };
  }

  const originalWords = extractContentWords(originalText);
  const candidateWords = extractContentWords(candidate.text);

  if (originalWords.length === 0 && candidateWords.length === 0) {
    return { score: 0.8, passed: true, issues: [] };
  }

  // Check keyword overlap
  const overlap = computeKeywordOverlap(originalWords, candidateWords);
  if (overlap < 0.1 && originalWords.length > 2) {
    score -= 0.4;
    issues.push("Low semantic overlap with original message");
  } else if (overlap < 0.2 && originalWords.length > 3) {
    score -= 0.2;
    issues.push("Moderate semantic drift from original");
  }

  // Check for negation reversal
  if (hasNegationReversal(originalText, candidate.text)) {
    score -= 0.3;
    issues.push("Possible negation reversal detected");
  }

  // Check length ratio
  const lengthRatio = candidate.text.length / originalText.length;
  if (lengthRatio > 3) {
    score -= 0.2;
    issues.push("Response significantly longer than original");
  } else if (lengthRatio < 0.2 && originalText.length > 10) {
    score -= 0.15;
    issues.push("Response significantly shorter than original");
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.3, issues };
}

// ─── Dimension: Factual ──────────────────────────────────────────────────────
//
// Checks that specific facts (names, numbers, dates, places) are preserved.
// ──────────────────────────────────────────────────────────────────────────────

const FACTUAL_PATTERNS = [
  /\b\d{1,2}:\d{2}\b/, // Times like 3:30, 9:00
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/, // Dates like 12/25, 1/1/2024
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
  /\$\d+/, // Money
  /\b\d+\s*(pm|am|PM|AM)\b/, // Time with am/pm
  /\b\d+\s*(percent|%)\b/, // Percentages
];

function validateFactual(
  candidate: { text: string; strategy: string },
  originalText?: string
): DimensionScore {
  const issues: string[] = [];
  let score = 1.0;

  if (!originalText) {
    return { score: 0.8, passed: true, issues: [] };
  }

  // Extract factual entities from original
  const originalFacts = extractFactualEntities(originalText);
  const candidateFacts = extractFactualEntities(candidate.text);

  // Check if specific facts are preserved
  for (const fact of originalFacts) {
    if (!candidateFacts.some((cf) => cf.toLowerCase() === fact.toLowerCase())) {
      score -= 0.15;
      issues.push(`Fact not preserved: "${fact}"`);
    }
  }

  // Check for fabricated facts
  for (const fact of candidateFacts) {
    if (!originalFacts.some((of) => of.toLowerCase() === fact.toLowerCase())) {
      score -= 0.1;
      issues.push(`Potentially fabricated fact: "${fact}"`);
    }
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.5, issues };
}

function extractFactualEntities(text: string): string[] {
  const entities: string[] = [];

  for (const pattern of FACTUAL_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      entities.push(match[0]);
    }
  }

  // Extract proper nouns (simple heuristic: capitalized words not at sentence start)
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:]/g, "");
    if (word.length > 1 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
      // Check if previous word ended with sentence-ending punctuation
      const prevWord = words[i - 1];
      if (!/[.!?]$/.test(prevWord)) {
        entities.push(word);
      }
    }
  }

  return entities;
}

// ─── Dimension: Strategy ─────────────────────────────────────────────────────
//
// Checks that the strategy label is preserved and appropriate for context.
// ──────────────────────────────────────────────────────────────────────────────

function validateStrategy(
  candidate: { text: string; strategy: string },
  state: ConversationState
): DimensionScore {
  const issues: string[] = [];
  let score = 1.0;

  const strategySet = new Set(state.strategy.ranked.map((s) => s.strategy));

  // Check if strategy is one of the recommended strategies
  if (strategySet.size > 0 && !strategySet.has(candidate.strategy as CommunicationStrategy)) {
    score -= 0.2;
    issues.push(`Strategy "${candidate.strategy}" not in recommended strategies`);
  }

  // Check strategy-context compatibility
  const conflictLevel = state.conflict.level;
  const contextType = state.context.type;

  if (conflictLevel > 0.7) {
    if (candidate.strategy === "playful" || candidate.strategy === "flirty") {
      score -= 0.3;
      issues.push("Inappropriate strategy for high-conflict context");
    }
  }

  if (contextType === "professional" || contextType === "interview") {
    if (candidate.strategy === "flirty" || candidate.strategy === "romantic") {
      score -= 0.4;
      issues.push("Inappropriate strategy for professional context");
    }
  }

  if (contextType === "dating") {
    if (candidate.strategy === "professional" || candidate.strategy === "formal") {
      score -= 0.2;
      issues.push("Overly formal strategy for dating context");
    }
  }

  // Check if strategy matches emotion
  if (state.emotion.primary === "angry" && candidate.strategy === "playful") {
    score -= 0.2;
    issues.push("Playful strategy may not match angry emotion");
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.4, issues };
}

// ─── Dimension: Style ────────────────────────────────────────────────────────
//
// Checks that the writing style matches the user's profile.
// ──────────────────────────────────────────────────────────────────────────────

function validateStyle(
  candidate: { text: string; strategy: string },
  state: ConversationState
): DimensionScore {
  const issues: string[] = [];
  let score = 0.7; // Default neutral score

  const profile = state.style?.profile;
  if (!profile || profile.confidence < 0.4) {
    return { score: 0.7, passed: true, issues: [] };
  }

  // Length matching
  const wordCount = candidate.text.split(/\s+/).length;
  const targetWords = profile.sentence.averageWords;
  const lengthDiff = Math.abs(wordCount - targetWords);
  const maxDiff = Math.max(targetWords, 10);
  const lengthCloseness = 1 - Math.min(1, lengthDiff / maxDiff);
  score += (lengthCloseness - 0.5) * 0.2;

  // Emoji matching
  const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(candidate.text);
  if (profile.emoji.usesEmojis && !hasEmojis) {
    score -= 0.1;
    issues.push("Missing emojis expected from user style");
  } else if (!profile.emoji.usesEmojis && hasEmojis) {
    score -= 0.1;
    issues.push("Unexpected emojis in response");
  }

  // Punctuation matching
  const hasExclamation = candidate.text.includes("!");
  if (profile.punctuation.style === "minimal" && hasExclamation) {
    score -= 0.05;
    issues.push("Unexpected exclamation mark for minimal style");
  }

  // Formality matching
  const formality = profile.tonePreference.formality;
  if (formality === "very_formal" || formality === "formal") {
    if (candidate.strategy === "playful" || candidate.strategy === "funny") {
      score -= 0.1;
      issues.push("Casual strategy may not match formal style");
    }
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.3, issues };
}

// ─── Dimension: Naturalness ──────────────────────────────────────────────────
//
// Checks for AI-like patterns, excessive formality, and unnatural phrases.
// ──────────────────────────────────────────────────────────────────────────────

const UNNATURAL_PATTERNS = [
  { pattern: /that sounds (amazing|wonderful|fantastic|great|interesting|fascinating)/i, penalty: 0.15 },
  { pattern: /i(?:'d| would) (love|like) to (hear|know|learn)/i, penalty: 0.15 },
  { pattern: /what (inspired|motivated|made) you/i, penalty: 0.15 },
  { pattern: /i(?:'m| am) (happy|glad|delighted) to hear/i, penalty: 0.1 },
  { pattern: /tell me more about/i, penalty: 0.1 },
  { pattern: /that(?:'s| is) a (great|wonderful|beautiful|nice)/i, penalty: 0.1 },
  { pattern: /i (appreciate|admire|respect)/i, penalty: 0.1 },
  { pattern: /thank you for sharing/i, penalty: 0.15 },
  { pattern: /i understand how you feel/i, penalty: 0.15 },
  { pattern: /that must be (really |very )?(hard|difficult|challenging)/i, penalty: 0.1 },
  { pattern: /i (completely|totally|absolutely) (agree|understand)/i, penalty: 0.05 },
  { pattern: /please (let me know|don't hesitate|feel free)/i, penalty: 0.1 },
  { pattern: /i hope (this|that) (helps|finds you well)/i, penalty: 0.15 },
];

function validateNaturalness(
  candidate: { text: string; strategy: string },
  state: ConversationState
): DimensionScore {
  const issues: string[] = [];
  let score = 1.0;

  // Check AI-like patterns
  let aiPenalty = 0;
  for (const { pattern, penalty } of UNNATURAL_PATTERNS) {
    if (pattern.test(candidate.text)) {
      aiPenalty += penalty;
      issues.push(`AI-like pattern detected: ${pattern.source.slice(0, 30)}...`);
    }
  }
  score -= aiPenalty;

  // Additional AI likeness from humanizer scoring
  const aiScore = scoreAILikeness(candidate.text);
  score -= aiScore * 0.5;

  // Length check for casual contexts
  const wordCount = candidate.text.split(/\s+/).length;
  if (state.context.type !== "professional" && state.context.type !== "interview") {
    if (wordCount > 30) {
      score -= 0.15;
      issues.push("Message too long for casual context");
    }
  }

  // Excessive punctuation
  const exclamationCount = (candidate.text.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    score -= 0.1;
    issues.push("Excessive exclamation marks");
  }

  // All caps check
  if (candidate.text === candidate.text.toUpperCase() && candidate.text.length > 3) {
    score -= 0.15;
    issues.push("All caps text");
  }

  // Ellipsis abuse
  if (/\.{3,}/.test(candidate.text)) {
    score -= 0.05;
    issues.push("Excessive ellipses");
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.3, issues };
}

// ─── Dimension: Context ──────────────────────────────────────────────────────
//
// Checks that the response fits the conversation context.
// ──────────────────────────────────────────────────────────────────────────────

function validateContext(
  candidate: { text: string; strategy: string },
  state: ConversationState
): DimensionScore {
  const issues: string[] = [];
  let score = 0.8; // Default neutral

  const contextType = state.context.type;
  const conflictLevel = state.conflict.level;
  const wordCount = candidate.text.split(/\s+/).length;

  // Conflict context checks
  if (conflictLevel > 0.7) {
    if (wordCount > 20) {
      score -= 0.15;
      issues.push("Long message may escalate conflict");
    }
    if (candidate.strategy === "playful" || candidate.strategy === "funny") {
      score -= 0.2;
      issues.push("Humor may not be appropriate in conflict");
    }
  }

  // Professional context checks
  if (contextType === "professional" || contextType === "interview") {
    if (wordCount < 5) {
      score -= 0.1;
      issues.push("Response too short for professional context");
    }
    if (candidate.text.includes("?")) {
      // Questions are fine in professional context
    }
  }

  // Dating context checks
  if (contextType === "dating") {
    if (candidate.strategy === "professional" || candidate.strategy === "formal") {
      score -= 0.15;
      issues.push("Overly formal for dating context");
    }
  }

  // Urgency checks
  if (state.context.urgency === "high" || state.context.urgency === "urgent") {
    if (wordCount > 15) {
      score -= 0.1;
      issues.push("Long response for urgent context");
    }
  }

  // Group chat checks
  if (state.participants.isGroup && wordCount > 25) {
    score -= 0.1;
    issues.push("Long message for group chat");
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.3, issues };
}

// ─── Dimension: Language ─────────────────────────────────────────────────────
//
// Checks that the language/script matches expected output preference.
// ──────────────────────────────────────────────────────────────────────────────

function validateLanguage(
  candidate: { text: string; strategy: string },
  state: ConversationState
): DimensionScore {
  const issues: string[] = [];
  let score = 0.9; // Default good

  const lang = state.language;

  // Check script consistency
  if (lang.script === "devanagari" && lang.outputPreference === "native_script") {
    // Should contain Devanagari characters
    const hasDevanagari = /[\u0900-\u097F]/.test(candidate.text);
    if (!hasDevanagari && candidate.text.length > 3) {
      score -= 0.2;
      issues.push("Expected Devanagari script but found none");
    }
  }

  if (lang.script === "telugu" && lang.outputPreference === "native_script") {
    const hasTelugu = /[\u0C00-\u0C7F]/.test(candidate.text);
    if (!hasTelugu && candidate.text.length > 3) {
      score -= 0.2;
      issues.push("Expected Telugu script but found none");
    }
  }

  // Check Romanized consistency
  if (lang.romanized && lang.outputPreference === "romanized") {
    // Should be Latin script with possible diacritics
    const hasNonLatin = /[^\x00-\x7F]/.test(candidate.text);
    if (hasNonLatin) {
      score -= 0.15;
      issues.push("Expected Romanized output but found non-Latin characters");
    }
  }

  // Check code-mixing consistency
  if (lang.codeMixed && lang.outputPreference === "code_mixed") {
    // Should have a mix of scripts
    const hasLatin = /[a-zA-Z]/.test(candidate.text);
    const hasNonLatin = /[^\x00-\x7F]/.test(candidate.text);
    if (!hasLatin && !hasNonLatin && candidate.text.length > 3) {
      score -= 0.1;
      issues.push("Expected code-mixed output but found neither Latin nor non-Latin");
    }
  }

  // Check for language consistency with primary language
  if (lang.primary === "english" && lang.outputPreference === "auto") {
    // Standard English check - should be mostly Latin characters
    const nonLatinRatio = (candidate.text.match(/[^\x00-\x7F]/g) || []).length / candidate.text.length;
    if (nonLatinRatio > 0.3) {
      score -= 0.1;
      issues.push("Unexpected non-Latin characters for English output");
    }
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.3, issues };
}

// ─── Dimension: Safety ───────────────────────────────────────────────────────
//
// Checks for harmful content, offensive language, and privacy leaks.
// ──────────────────────────────────────────────────────────────────────────────

const OFFENSIVE_PATTERNS = [
  /\b(fuck|shit|damn|ass|bitch|bastard|crap|dick)\b/i,
  /\b(nigger|nigga|retard|retarded|faggot|fag|dyke)\b/i,
  /\b(rape|molest|abuse)\b/i,
];

const HARMFUL_PATTERNS = [
  /\b(kill|murder|assassinate|execute)\b/i,
  /\b(bomb|explosive|terrorist|terror)\b/i,
  /\b(suicide|self.?harm|cut.?yourself)\b/i,
];

const PRIVATE_INFO_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
  /\b\d{16}\b/, // Credit card numbers
];

function validateSafety(candidate: { text: string; strategy: string }): DimensionScore {
  const issues: string[] = [];
  let score = 1.0;

  // Check offensive language
  for (const pattern of OFFENSIVE_PATTERNS) {
    if (pattern.test(candidate.text)) {
      score -= 0.4;
      issues.push("Offensive language detected");
      break;
    }
  }

  // Check harmful content
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(candidate.text)) {
      score -= 0.5;
      issues.push("Harmful content detected");
      break;
    }
  }

  // Check private information leaks
  for (const pattern of PRIVATE_INFO_PATTERNS) {
    if (pattern.test(candidate.text)) {
      score -= 0.3;
      issues.push("Private information detected in response");
      break;
    }
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.7, issues };
}

// ─── Dimension: Preservation ────────────────────────────────────────────────
//
// Checks that the candidate preserves semantic meaning using the preservation engine.
// Critical for ensuring improved messages don't change user intent.
// ──────────────────────────────────────────────────────────────────────────────

function validatePreservationDimension(
  candidate: { text: string; strategy: string },
  originalText?: string,
  preservationContract?: PreservationContract
): DimensionScore {
  const issues: string[] = [];

  // If no original text or contract, assume reasonable
  if (!originalText || !preservationContract) {
    return { score: 0.8, passed: true, issues: [] };
  }

  // Use the preservation engine to validate
  const result = validatePreservation(preservationContract, candidate.text);

  // Convert validation issues to dimension issues
  for (const issue of result.issues) {
    issues.push(issue);
  }

  // Score based on preservation result
  let score = result.score;

  // Penalize critical failures more heavily
  if (!result.details.negationPreserved) {
    score -= 0.3;
  }
  if (!result.details.positionPreserved) {
    score -= 0.3;
  }
  if (!result.details.boundaryPreserved) {
    score -= 0.2;
  }
  if (!result.details.temporalPreserved) {
    score -= 0.15;
  }
  if (!result.details.abilityPreserved) {
    score -= 0.2;
  }
  if (!result.details.factsPreserved) {
    score -= 0.2;
  }

  const finalScore = Math.max(0, Math.min(1, score));
  return { score: finalScore, passed: finalScore >= 0.3, issues };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function extractContentWords(text: string): string[] {
  // Remove punctuation, convert to lowercase, filter out very short words
  return text
    .replace(/[.,!?;:'"()\[\]{}]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeKeywordOverlap(words1: string[], words2: string[]): number {
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let overlap = 0;

  for (const word of set1) {
    if (set2.has(word)) overlap++;
  }

  return overlap / Math.max(set1.size, set2.size);
}

function hasNegationReversal(original: string, candidate: string): boolean {
  const negations = ["not", "no", "never", "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot"];

  const originalLower = original.toLowerCase();
  const candidateLower = candidate.toLowerCase();

  const originalHasNegation = negations.some((n) => originalLower.includes(n));
  const candidateHasNegation = negations.some((n) => candidateLower.includes(n));

  // Check for reversal: original has negation, candidate doesn't (or vice versa)
  // But only for short messages where negation is significant
  if (original.split(/\s+/).length < 15) {
    if (originalHasNegation && !candidateHasNegation) {
      return true;
    }
    if (!originalHasNegation && candidateHasNegation) {
      return true;
    }
  }

  return false;
}

function computeOverallScore(dimensions: Record<ValidationDimension, DimensionScore>): number {
  const weights: Record<ValidationDimension, number> = {
    semantic: 0.1,
    factual: 0.1,
    strategy: 0.1,
    style: 0.08,
    naturalness: 0.1,
    context: 0.08,
    language: 0.08,
    safety: 0.1,
    preservation: 0.26,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [dim, weight] of Object.entries(weights) as [ValidationDimension, number][]) {
    totalScore += dimensions[dim].score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function computeAverageScore(results: CandidateValidationResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.overallScore, 0);
  return total / results.length;
}

function computeDimensionAverages(
  results: CandidateValidationResult[]
): Record<ValidationDimension, number> {
  const dimensions: ValidationDimension[] = [
    "semantic", "factual", "strategy", "style",
    "naturalness", "context", "language", "safety", "preservation",
  ];

  const averages: Record<ValidationDimension, number> = {
    semantic: 0,
    factual: 0,
    strategy: 0,
    style: 0,
    naturalness: 0,
    context: 0,
    language: 0,
    safety: 0,
    preservation: 0,
  };

  for (const dim of dimensions) {
    const total = results.reduce((sum, r) => sum + r.dimensions[dim].score, 0);
    averages[dim] = results.length > 0 ? total / results.length : 0;
  }

  return averages;
}

// ─── Logging ─────────────────────────────────────────────────────────────────

export function logQualityValidation(output: QualityValidationOutput): void {
  if (process.env.NEXTMSG_DEBUG_AI !== "true") return;

  console.log("[NEXTMSG AI DEBUG] Quality validation:", {
    totalCandidates: output.validationSummary.totalCandidates,
    passedCount: output.validationSummary.passedCount,
    failedCount: output.validationSummary.failedCount,
    averageScore: Math.round(output.validationSummary.averageScore * 100) / 100,
    allFailed: output.allFailed,
    dimensionAverages: Object.fromEntries(
      Object.entries(output.validationSummary.dimensionAverages).map(([k, v]) => [
        k,
        Math.round(v * 100) / 100,
      ])
    ),
  });
}
