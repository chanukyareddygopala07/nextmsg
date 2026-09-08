/**
 * Preservation Evaluator v2.0
 *
 * Feature-based semantic preservation evaluator.
 * Replaces naive Jaccard similarity with structured dimension comparison.
 *
 * Core contract: Improve HOW the user communicates without changing WHAT they mean.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── Text Normalization ──────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter((w) => w.length > 0);
}

// ─── Negation Detection ──────────────────────────────────────────────────────

const ENGLISH_NEGATION_WORDS = new Set([
  "not", "no", "never", "neither", "nor", "hardly", "barely", "scarcely",
  "seldom", "rarely", "none", "nobody", "nothing", "nowhere",
]);

const ENGLISH_NEGATION_CONTRACTIONS = new Set([
  "can't", "cannot", "won't", "wouldn't", "don't", "doesn't", "didn't",
  "shouldn't", "couldn't", "mustn't", "haven't", "hasn't", "hadn't",
  "isn't", "aren't", "wasn't", "weren't", "ain't",
]);

const ROMANIZED_TELUGU_NEGATIONS = new Set([
  "kadu", "kaadu", "ledu", "leedu", "ledu",
  "vaddhu", "vaaddu", "vadu",
  "cheyyalenu", "cheyyaledu", "cheyyam",
  "raanu", "raaledu", "raadu",
  "avvadhu", "avvaadu",
]);

const ROMANIZED_HINDI_NEGATIONS = new Set([
  "nahi", "nahin", "mat", "na",
]);

const ROMANIZED_TAMIL_NEGATIONS = new Set([
  "illai", "illaa", "illa",
  "mudiyadhu", "mudiyathu", "mudiyala",
]);

const ALL_NEGATION_CONTRACTIONS = new Set([
  ...ENGLISH_NEGATION_CONTRACTIONS,
]);

function isNegationToken(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-z']/g, "");
  if (ENGLISH_NEGATION_WORDS.has(w)) return true;
  if (ALL_NEGATION_CONTRACTIONS.has(w)) return true;
  if (ROMANIZED_TELUGU_NEGATIONS.has(w)) return true;
  if (ROMANIZED_HINDI_NEGATIONS.has(w)) return true;
  if (ROMANIZED_TAMIL_NEGATIONS.has(w)) return true;
  // Compound patterns
  if (w === "possible" || w === "possible" ) return false; // handled separately
  return false;
}

function isNegationPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    /\bnot\s+(?:able|available|possible|comfortable|sure|going|doing|doing|wanting)\b/,
    /\bcannot\b/,
    /\bcan't\b/,
    /\bwon't\b/,
    /\bdon't\b/,
    /\bdoesn't\b/,
    /\bdidn't\b/,
    /\bshouldn't\b/,
    /\bcouldn't\b/,
    /\bmustn't\b/,
    /\bhaven't\b/,
    /\bhasn't\b/,
    /\bhadn't\b/,
    /\bisn't\b/,
    /\baren't\b/,
    /\bwasn't\b/,
    /\bweren't\b/,
    /\bain't\b/,
    /\bnever\b/,
    /\bno\b/,
    /\bnot\b/,
    /\bimpossible\b/,
    /\bunable\b/,
    /\bfailed\b/,
    /\brefuse\b/,
    /\bdecline\b/,
    /\breject\b/,
    /\bdeny\b/,
    /\bdenied\b/,
    // Romanized Telugu
    /\bkadu\b/,
    /\bkaadu\b/,
    /\bledu\b/,
    /\bleedu\b/,
    /\bvaddhu\b/,
    /\bvaaddu\b/,
    /\bcheyyalenu\b/,
    /\bcheyyaledu\b/,
    /\braaledu\b/,
    /\braadu\b/,
    /\bavvadhu\b/,
    // Romanized Hindi
    /\bnahi\b/,
    /\bnahin\b/,
    /\bmat\b/,
    // Romanized Tamil
    /\billai\b/,
    /\billaa\b/,
    /\billaa\b/,
    /\bmudiyadhu\b/,
    /\bmudiyathu\b/,
    /\bmudiyala\b/,
    // Compound
    /\bpossible\s+kadu\b/,
    /\bpossible\s+kaadu\b/,
    /\bpossible\s+ledu\b/,
    /\bkastam\b/,
    /\bkashtam\b/,
  ];
  return patterns.some((p) => p.test(lower));
}

function hasNegation(text: string): boolean {
  return isNegationPhrase(text);
}

function negationStatus(text: string): "negated" | "affirmed" | "neutral" {
  const neg = hasNegation(text);
  if (neg) return "negated";
  // Check for affirmation markers
  const lower = text.toLowerCase();
  if (/\b(?:can|could|able|will|shall|must|should|would)\b/.test(lower) && !neg) {
    return "affirmed";
  }
  return "neutral";
}

// ─── Ability / Availability Detection ────────────────────────────────────────

interface AbilitySignal {
  type: "can" | "cannot" | "possible" | "impossible" | "available" | "unavailable";
  negated: boolean;
}

function extractAbilitySignals(text: string): AbilitySignal[] {
  const signals: AbilitySignal[] = [];
  const lower = text.toLowerCase();

  // English ability patterns
  if (/\bcan\b/.test(lower) && !/\bcannot\b/.test(lower) && !/\bcan't\b/.test(lower)) {
    signals.push({ type: "can", negated: false });
  }
  if (/\b(?:cannot|can't)\b/.test(lower)) {
    signals.push({ type: "cannot", negated: true });
  }
  if (/\bwill\b/.test(lower) && !/\bwill\s+not\b/.test(lower) && !/\bwon't\b/.test(lower)) {
    signals.push({ type: "can", negated: false });
  }
  if (/\b(?:will\s+not|won't)\b/.test(lower)) {
    signals.push({ type: "cannot", negated: true });
  }
  if (/\bpossible\b/.test(lower) && !/\bimpossible\b/.test(lower) && !/\bnot\s+possible\b/.test(lower)) {
    signals.push({ type: "possible", negated: false });
  }
  if (/\b(?:impossible|not\s+possible)\b/.test(lower)) {
    signals.push({ type: "impossible", negated: true });
  }
  if (/\bavailable\b/.test(lower) && !/\bunavailable\b/.test(lower) && !/\bnot\s+available\b/.test(lower)) {
    signals.push({ type: "available", negated: false });
  }
  if (/\b(?:unavailable|not\s+available)\b/.test(lower)) {
    signals.push({ type: "unavailable", negated: true });
  }
  if (/\bunable\b/.test(lower)) {
    signals.push({ type: "cannot", negated: true });
  }

  // Romanized Telugu ability
  if (/\bpossible\s+(?:kadu|kaadu|ledu)\b/.test(lower)) {
    signals.push({ type: "impossible", negated: true });
  }
  if (/\bkastam\b/.test(lower) || /\bkashtam\b/.test(lower)) {
    signals.push({ type: "cannot", negated: true });
  }
  if (/\bcheyyalenu\b/.test(lower) || /\bcheyyaledu\b/.test(lower)) {
    signals.push({ type: "cannot", negated: true });
  }
  if (/\braaledu\b/.test(lower) || /\braadu\b/.test(lower)) {
    signals.push({ type: "cannot", negated: true });
  }
  if (/\bavvadhu\b/.test(lower)) {
    signals.push({ type: "cannot", negated: true });
  }

  return signals;
}

function hasAbilityReversal(original: string, candidate: string): boolean {
  const origSignals = extractAbilitySignals(original);
  const candSignals = extractAbilitySignals(candidate);

  const origNeg = origSignals.some((s) => s.negated);
  const candNeg = candSignals.some((s) => s.negated);

  // Reversal: original was negated, candidate is affirmed (or vice versa)
  if (origNeg && !candNeg && candSignals.length > 0) return true;
  if (!origNeg && candNeg && origSignals.length > 0) return true;

  return false;
}

// ─── Stance / Position Detection ─────────────────────────────────────────────

interface StanceSignal {
  type: "agree" | "disagree" | "support" | "oppose" | "neutral";
  negated: boolean;
}

function extractStanceSignals(text: string): StanceSignal[] {
  const signals: StanceSignal[] = [];
  const lower = text.toLowerCase();

  // Check for negated stances first
  if (/\b(?:don't|doesn't|didn't|won't|wouldn't|can't|cannot|couldn't|shouldn't|not|never)\s+(agree|support|approve)\b/.test(lower)) {
    signals.push({ type: "disagree", negated: true });
  }
  if (/\b(?:don't|doesn't|didn't|won't|wouldn't|can't|cannot|couldn't|shouldn't|not|never)\s+(oppose|reject|disapprove)\b/.test(lower)) {
    signals.push({ type: "agree", negated: true });
  }

  // Non-negated stances
  if (/\bagree\b/.test(lower) && !/\bdisagree\b/.test(lower)) {
    signals.push({ type: "agree", negated: false });
  }
  if (/\bdisagree\b/.test(lower)) {
    signals.push({ type: "disagree", negated: false });
  }
  if (/\bsupport\b/.test(lower) && !/\boppose\b/.test(lower)) {
    signals.push({ type: "support", negated: false });
  }
  if (/\boppose\b/.test(lower)) {
    signals.push({ type: "oppose", negated: false });
  }
  if (/\baccept\b/.test(lower) && !/\breject\b/.test(lower)) {
    signals.push({ type: "agree", negated: false });
  }
  if (/\breject\b/.test(lower)) {
    signals.push({ type: "disagree", negated: false });
  }
  if (/\bapprove\b/.test(lower) && !/\bdisapprove\b/.test(lower)) {
    signals.push({ type: "support", negated: false });
  }
  if (/\bdisapprove\b/.test(lower)) {
    signals.push({ type: "oppose", negated: false });
  }

  // "I think" / "I believe" — hedge, treat as neutral/support
  if (/\bi\s+(?:think|believe|feel)\b/.test(lower) && signals.length === 0) {
    signals.push({ type: "neutral", negated: false });
  }

  return signals;
}

function hasStanceReversal(original: string, candidate: string): boolean {
  const origStances = extractStanceSignals(original);
  const candStances = extractStanceSignals(candidate);

  for (const orig of origStances) {
    if (orig.type === "neutral") continue;
    for (const cand of candStances) {
      if (cand.type === "neutral") continue;
      // Check for direct reversal
      if (
        (orig.type === "agree" && cand.type === "disagree") ||
        (orig.type === "disagree" && cand.type === "agree") ||
        (orig.type === "support" && cand.type === "oppose") ||
        (orig.type === "oppose" && cand.type === "support")
      ) {
        return true;
      }
    }
  }
  return false;
}

// ─── Boundary / Refusal Detection ────────────────────────────────────────────

function hasBoundaryReversal(original: string, candidate: string): boolean {
  const lowerOrig = original.toLowerCase();
  const lowerCand = candidate.toLowerCase();

  const refusalPatterns = /\b(?:not\s+comfortable|uncomfortable|will\s+not|refuse|decline|reject|can't|cannot|won't|don't\s+want|not\s+able|not\s+available|not\s+possible|impossible|unable)\b/;
  const acceptancePatterns = /\b(?:okay|fine|acceptable|agree|will\s+do|sure|can\s+do|able\s+to|available|possible|will\s+attend|will\s+be\s+there|count\s+me\s+in)\b/;

  const origRefuses = refusalPatterns.test(lowerOrig);
  const candAccepts = acceptancePatterns.test(lowerCand);

  // If original refused and candidate accepts, that's a boundary reversal
  if (origRefuses && candAccepts) {
    // But check if candidate also has refusal — if so, it might be a paraphrase
    if (!refusalPatterns.test(lowerCand)) {
      return true;
    }
  }

  return false;
}

// ─── Question / Statement Preservation ───────────────────────────────────────

function isQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.endsWith("?")) return true;
  if (/^(?:can|could|will|would|shall|should|do|does|did|is|are|was|were|have|has|had)\s+/i.test(trimmed)) return true;
  if (/\b(?:what|where|when|who|whom|which|why|how)\b/i.test(trimmed)) return true;
  return false;
}

function questionStatementReversal(original: string, candidate: string): boolean {
  const origIsQ = isQuestion(original);
  const candIsQ = isQuestion(candidate);

  // A question becoming a statement or vice versa is a structural change
  // But this alone is not necessarily a semantic failure — it depends on context
  // Only flag it if the original was a clear question and the candidate is a clear statement
  if (origIsQ && !candIsQ) {
    // Original was a question, candidate is a statement — could be a commitment change
    // Only flag if original had ability/negation in question form
    const lower = original.toLowerCase();
    if (/\bcan\b/.test(lower) || /\bcould\b/.test(lower) || /\bwill\b/.test(lower)) {
      return true;
    }
  }
  return false;
}

// ─── Temporal Constraint Detection ───────────────────────────────────────────

function extractTemporalTerms(text: string): string[] {
  const lower = text.toLowerCase();
  const terms: string[] = [];
  const patterns = [
    /\b(today|tomorrow|yesterday|tonight)\b/g,
    /\b(this\s+(?:morning|afternoon|evening|week|month|year))\b/g,
    /\b(next\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/g,
    /\b(last\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/g,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
    /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/g,
    /\b(\d{1,2}\s*(?:am|pm))\b/g,
    /\b(?:by|before|after|until|since)\s+(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
    /\basap\b/g,
    /\bnow\b/g,
    /\blater\b/g,
    // Romanized Telugu
    /\b(ivala|ivvala|eeroju)\b/g,
    /\b(repu|repuva)\b/g,
    /\b(ninnati|ninna)\b/g,
    /\b(ipudu|ippudu)\b/g,
    /\b(tvaraga|twara\s+ga)\b/g,
    /\b(ee\s+semana|ee\s+vaaram|mana\s+semana|mana\s+vaaram)\b/g,
  ];
  for (const p of patterns) {
    const found = lower.match(p);
    if (found) terms.push(...found.map((m) => m.trim()));
  }
  return [...new Set(terms)];
}

function hasTemporalReversal(original: string, candidate: string): boolean {
  const origTerms = extractTemporalTerms(original);
  const candTerms = extractTemporalTerms(candidate);

  // If original had specific temporal terms and candidate removed all of them
  if (origTerms.length > 0 && candTerms.length === 0) {
    return true;
  }

  // If original had "today" and candidate has "tomorrow" (or vice versa)
  const todayTerms = ["today", "ivala", "ivvala", "eeroju"];
  const tomorrowTerms = ["tomorrow", "repu", "repuva"];

  const origHasToday = origTerms.some((t) => todayTerms.includes(t));
  const origHasTomorrow = origTerms.some((t) => tomorrowTerms.includes(t));
  const candHasToday = candTerms.some((t) => todayTerms.includes(t));
  const candHasTomorrow = candTerms.some((t) => tomorrowTerms.includes(t));

  if (origHasToday && candHasTomorrow) return true;
  if (origHasTomorrow && candHasToday) return true;

  return false;
}

// ─── Entity / Number / URL Extraction ────────────────────────────────────────

function extractNumbers(text: string): string[] {
  const patterns = [
    /\b\d{1,3}(,\d{3})*(\.\d+)?\b/g,
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi,
    /\b(?:first|second|third|fourth|fifth)\b/gi,
  ];
  const numbers: string[] = [];
  for (const p of patterns) {
    const found = text.match(p);
    if (found) numbers.push(...found.map((m) => m.toLowerCase()));
  }
  return [...new Set(numbers)];
}

function extractDates(text: string): string[] {
  const patterns = [
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?\b/gi,
    /\b\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4})\b/g,
    /\b\d{1,2}-\d{1,2}-(?:\d{2}|\d{4})\b/g,
    /\b(?:tomorrow|today|yesterday|next\s+\w+|last\s+\w+)\b/gi,
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:next\s+week|this\s+week|last\s+week|next\s+month|this\s+month)\b/gi,
  ];
  const dates: string[] = [];
  for (const p of patterns) {
    const found = text.match(p);
    if (found) dates.push(...found.map((m) => m.toLowerCase()));
  }
  return [...new Set(dates)];
}

function extractUrls(text: string): string[] {
  const pattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
  const found = text.match(pattern);
  return found ? [...new Set(found.map((m) => m.toLowerCase()))] : [];
}

function extractEntities(text: string): string[] {
  // Common English words that are capitalized at sentence start — NOT entities
  const commonWords = new Set([
    "the", "a", "an", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their", "this", "that", "these", "those",
    "can", "could", "will", "would", "should", "may", "might", "shall", "must",
    "do", "does", "did", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "not", "no", "and", "but", "or", "so", "if", "then",
    "how", "what", "when", "where", "why", "who", "which", "whose",
    "great", "good", "best", "well", "new", "old", "first", "last", "next",
    "please", "thank", "thanks", "sorry", "hello", "hi", "hey", "yes", "yeah",
    "sure", "okay", "ok", "fine", "right", "wrong", "now", "here", "there",
    "today", "tomorrow", "yesterday", "never", "always", "often", "sometimes",
    "also", "just", "still", "already", "yet", "even", "only", "very",
    "let", "make", "get", "go", "come", "see", "know", "think", "want",
    "need", "try", "give", "take", "tell", "say", "said", "ask", "put",
    "keep", "help", "start", "show", "find", "feel", "look", "move", "run",
    "work", "use", "call", "try", "ask", "turn", "set", "change", "play",
    "live", "believe", "bring", "happen", "must", "back", "much", "way",
  ]);

  // Match multi-word proper nouns (e.g., "John Smith", "New York")
  const multiWordPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const entities: string[] = [];
  const found = text.match(multiWordPattern);
  if (found) {
    for (const entity of found) {
      // Skip if all words are common English words
      const words = entity.split(/\s+/);
      const allCommon = words.every((w) => commonWords.has(w.toLowerCase()));
      if (!allCommon) {
        entities.push(entity);
      }
    }
  }

  // Match single capitalized words that are NOT at sentence start
  // and are NOT common English words
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    // Get first word of sentence (skip it — it's capitalized by convention)
    const firstWordMatch = trimmed.match(/^([A-Z][a-z]*)\b/);
    const firstWord = firstWordMatch ? firstWordMatch[1].toLowerCase() : "";
    
    // Match remaining capitalized words
    const wordPattern = /\b([A-Z][a-z]+)\b/g;
    let match;
    while ((match = wordPattern.exec(trimmed)) !== null) {
      const word = match[1];
      // Skip first word of sentence, common words, and short words
      if (word.toLowerCase() === firstWord) continue;
      if (commonWords.has(word.toLowerCase())) continue;
      if (word.length <= 2) continue;
      entities.push(word);
    }
  }

  return [...new Set(entities)];
}

function extractCommitmentWords(text: string): string[] {
  const patterns = [
    /\b(?:will|shall|promise|guarantee|commit|agree|confirm)\b/gi,
    /\b(?:i'll|i will|i shall|i promise)\b/gi,
    /\b(?:deadline|due\s+by|complete\s+by|finish\s+by)\b/gi,
  ];
  const commitments: string[] = [];
  for (const p of patterns) {
    const found = text.match(p);
    if (found) commitments.push(...found.map((m) => m.toLowerCase()));
  }
  return [...new Set(commitments)];
}

// ─── Semantic Feature Extraction ─────────────────────────────────────────────

interface SemanticFeatures {
  negationStatus: "negated" | "affirmed" | "neutral";
  abilitySignals: AbilitySignal[];
  stanceSignals: StanceSignal[];
  temporalTerms: string[];
  numbers: string[];
  dates: string[];
  urls: string[];
  entities: string[];
  commitmentWords: string[];
  isQuestion: boolean;
  wordCount: number;
  meaningfulWordCount: number;
}

function extractSemanticFeatures(text: string): SemanticFeatures {
  const words = tokenize(text);
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "this", "that", "these", "those", "and", "but", "or", "nor", "not", "so", "very", "just"]);
  const meaningfulWords = words.filter((w) => w.length > 1 && !stopWords.has(w));

  return {
    negationStatus: negationStatus(text),
    abilitySignals: extractAbilitySignals(text),
    stanceSignals: extractStanceSignals(text),
    temporalTerms: extractTemporalTerms(text),
    numbers: extractNumbers(text),
    dates: extractDates(text),
    urls: extractUrls(text),
    entities: extractEntities(text),
    commitmentWords: extractCommitmentWords(text),
    isQuestion: isQuestion(text),
    wordCount: words.length,
    meaningfulWordCount: meaningfulWords.length,
  };
}

// ─── Dimension Checks ────────────────────────────────────────────────────────

interface DimensionCheck {
  name: string;
  passed: boolean;
  details: string;
  isFatal: boolean;
  score: number; // 0-1
}

function checkNegationPreservation(orig: SemanticFeatures, cand: SemanticFeatures, origText: string, candText: string): DimensionCheck {
  const origNeg = orig.negationStatus;
  const candNeg = cand.negationStatus;

  if (origNeg === "negated" && candNeg === "affirmed") {
    return { name: "negation", passed: false, details: "Negation removed (negated → affirmed)", isFatal: true, score: 0 };
  }
  if (origNeg === "affirmed" && candNeg === "negated") {
    return { name: "negation", passed: false, details: "Negation introduced (affirmed → negated)", isFatal: true, score: 0 };
  }
  if (origNeg === "negated" && candNeg === "negated") {
    return { name: "negation", passed: true, details: "Negation preserved", isFatal: false, score: 1 };
  }
  if (origNeg === "affirmed" && candNeg === "affirmed") {
    return { name: "negation", passed: true, details: "Affirmation preserved", isFatal: false, score: 1 };
  }
  // Both neutral — check word-level negation
  const origHasNegWords = hasNegation(origText);
  const candHasNegWords = hasNegation(candText);
  if (origHasNegWords && !candHasNegWords) {
    return { name: "negation", passed: false, details: "Negation words removed", isFatal: true, score: 0 };
  }
  if (!origHasNegWords && candHasNegWords) {
    return { name: "negation", passed: false, details: "Negation words added", isFatal: true, score: 0 };
  }
  return { name: "negation", passed: true, details: "Negation status preserved", isFatal: false, score: 1 };
}

function checkAbilityPreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  if (hasAbilityReversal(
    orig.abilitySignals.map((s) => s.type).join(" "),
    cand.abilitySignals.map((s) => s.type).join(" ")
  )) {
    return { name: "ability", passed: false, details: "Ability/availability reversed", isFatal: true, score: 0 };
  }

  const origNeg = orig.abilitySignals.some((s) => s.negated);
  const candNeg = cand.abilitySignals.some((s) => s.negated);

  if (origNeg && !candNeg && cand.abilitySignals.length > 0) {
    return { name: "ability", passed: false, details: "Negation removed from ability constraint", isFatal: true, score: 0 };
  }

  return { name: "ability", passed: true, details: "Ability preserved", isFatal: false, score: 1 };
}

function checkStancePreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  if (hasStanceReversal(
    orig.stanceSignals.map((s) => s.type).join(" "),
    cand.stanceSignals.map((s) => s.type).join(" ")
  )) {
    return { name: "stance", passed: false, details: "Agreement/disagreement reversed", isFatal: true, score: 0 };
  }
  return { name: "stance", passed: true, details: "Stance preserved", isFatal: false, score: 1 };
}

function checkBoundaryPreservation(origText: string, candText: string): DimensionCheck {
  if (hasBoundaryReversal(origText, candText)) {
    return { name: "boundary", passed: false, details: "Refusal/acceptance boundary reversed", isFatal: true, score: 0 };
  }
  return { name: "boundary", passed: true, details: "Boundary preserved", isFatal: false, score: 1 };
}

function checkTemporalPreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  if (hasTemporalReversal(
    orig.temporalTerms.join(" "),
    cand.temporalTerms.join(" ")
  )) {
    return { name: "temporal", passed: false, details: `Temporal terms changed: [${orig.temporalTerms.join(", ")}] → [${cand.temporalTerms.join(", ")}]`, isFatal: true, score: 0 };
  }
  // If original had temporal terms and candidate removed them all
  if (orig.temporalTerms.length > 0 && cand.temporalTerms.length === 0) {
    return { name: "temporal", passed: false, details: "All temporal terms removed", isFatal: false, score: 0.3 };
  }
  return { name: "temporal", passed: true, details: "Temporal constraints preserved", isFatal: false, score: 1 };
}

function checkNumberPreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  const missing = orig.numbers.filter((n) => !cand.numbers.includes(n));
  if (missing.length > 0) {
    return { name: "number", passed: false, details: `Missing numbers: ${missing.join(", ")}`, isFatal: false, score: 0.5 };
  }
  // Check for new numbers introduced
  const newNums = cand.numbers.filter((n) => !orig.numbers.includes(n));
  if (newNums.length > 0) {
    return { name: "number", passed: false, details: `New numbers introduced: ${newNums.join(", ")}`, isFatal: false, score: 0.5 };
  }
  return { name: "number", passed: true, details: "Numbers preserved", isFatal: false, score: 1 };
}

function checkDatePreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  const missing = orig.dates.filter((d) => !cand.dates.includes(d));
  if (missing.length > 0) {
    return { name: "date", passed: false, details: `Missing dates: ${missing.join(", ")}`, isFatal: false, score: 0.5 };
  }
  return { name: "date", passed: true, details: "Dates preserved", isFatal: false, score: 1 };
}

function checkUrlPreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  const missing = orig.urls.filter((u) => !cand.urls.includes(u));
  if (missing.length > 0) {
    return { name: "url", passed: false, details: `Missing URLs: ${missing.join(", ")}`, isFatal: false, score: 0 };
  }
  return { name: "url", passed: true, details: "URLs preserved", isFatal: false, score: 1 };
}

function checkEntityPreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  const missing = orig.entities.filter((e) => !cand.entities.some((ce) => ce.toLowerCase() === e.toLowerCase()));
  if (missing.length > 0) {
    return { name: "entity", passed: false, details: `Missing entities: ${missing.join(", ")}`, isFatal: false, score: 0.5 };
  }
  return { name: "entity", passed: true, details: "Entities preserved", isFatal: false, score: 1 };
}

function checkCommitmentPreservation(orig: SemanticFeatures, cand: SemanticFeatures): DimensionCheck {
  const origHasCommit = orig.commitmentWords.length > 0;
  const candHasCommit = cand.commitmentWords.length > 0;

  if (origHasCommit && !candHasCommit) {
    return { name: "commitment", passed: false, details: "Commitment words removed", isFatal: false, score: 0.5 };
  }
  return { name: "commitment", passed: true, details: "Commitments preserved", isFatal: false, score: 1 };
}

function checkQuestionPreservation(origText: string, candText: string): DimensionCheck {
  if (questionStatementReversal(origText, candText)) {
    return { name: "question", passed: false, details: "Question/statement structure changed", isFatal: false, score: 0.5 };
  }
  return { name: "question", passed: true, details: "Question/statement preserved", isFatal: false, score: 1 };
}

function checkSemanticSimilarity(orig: SemanticFeatures, cand: SemanticFeatures, origText: string, candText: string): DimensionCheck {
  // Length ratio check
  const lengthRatio = orig.meaningfulWordCount > 0
    ? cand.meaningfulWordCount / orig.meaningfulWordCount
    : 1;

  if (lengthRatio < 0.15 || lengthRatio > 6.0) {
    return { name: "semantic", passed: false, details: `Length ratio ${lengthRatio.toFixed(2)} outside acceptable range (0.15-6.0)`, isFatal: false, score: 0.2 };
  }

  // Feature overlap score
  let featureScore = 0;
  let featureCount = 0;

  // Negation match
  featureCount++;
  if (orig.negationStatus === cand.negationStatus) featureScore++;

  // Ability match
  featureCount++;
  if (orig.abilitySignals.length === 0 && cand.abilitySignals.length === 0) featureScore++;
  else if (orig.abilitySignals.some((s) => s.negated) === cand.abilitySignals.some((s) => s.negated)) featureScore++;

  // Stance match
  featureCount++;
  if (orig.stanceSignals.length === 0 && cand.stanceSignals.length === 0) featureScore++;
  else if (orig.stanceSignals.some((s) => s.type) === cand.stanceSignals.some((s) => s.type)) featureScore++;

  // Temporal match
  featureCount++;
  if (orig.temporalTerms.length === cand.temporalTerms.length) featureScore++;

  // Number match
  featureCount++;
  if (orig.numbers.length === cand.numbers.length) featureScore++;

  // Entity match
  featureCount++;
  if (orig.entities.length === cand.entities.length) featureScore++;

  const featureSimilarity = featureCount > 0 ? featureScore / featureCount : 1;

  // Word overlap: compute Jaccard on content words (excluding stop words)
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "this", "that", "these", "those", "and", "but", "or", "nor", "not", "so", "very", "just"]);
  const origWords = new Set(normalize(origText).split(" ").filter((w) => w.length > 1 && !stopWords.has(w)));
  const candWords = new Set(normalize(candText).split(" ").filter((w) => w.length > 1 && !stopWords.has(w)));

  const intersection = new Set([...origWords].filter((w) => candWords.has(w)));
  const union = new Set([...origWords, ...candWords]);
  const jaccard = union.size > 0 ? intersection.size / union.size : 0;

  // Combined score: weighted blend of feature similarity and word overlap
  // Feature similarity matters for semantic meaning, word overlap matters for content
  const combinedScore = featureSimilarity * 0.6 + jaccard * 0.4;

  // If features strongly match but words are completely different, it's a paraphrase
  // Only flag as failure if feature similarity is also low
  if (origWords.size > 2 && candWords.size > 2 && jaccard < 0.1 && featureSimilarity < 0.6) {
    return { name: "semantic", passed: false, details: `Low similarity overall (features: ${featureSimilarity.toFixed(3)}, overlap: ${jaccard.toFixed(3)})`, isFatal: false, score: combinedScore };
  }

  if (combinedScore < 0.35) {
    return { name: "semantic", passed: false, details: `Combined similarity ${combinedScore.toFixed(3)} is low (features: ${featureSimilarity.toFixed(3)}, overlap: ${jaccard.toFixed(3)})`, isFatal: false, score: combinedScore };
  }

  return { name: "semantic", passed: true, details: `Similarity OK (features: ${featureSimilarity.toFixed(3)}, overlap: ${jaccard.toFixed(3)}, combined: ${combinedScore.toFixed(3)})`, isFatal: false, score: combinedScore };
}

function checkFabrication(origText: string, candText: string): DimensionCheck {
  const origNums = extractNumbers(origText);
  const candNums = extractNumbers(candText);
  const newNums = candNums.filter((n) => !origNums.includes(n));

  const origDates = extractDates(origText);
  const candDates = extractDates(candText);
  const newDates = candDates.filter((d) => !origDates.includes(d));

  const fabricated: string[] = [];
  if (newNums.length > 0) fabricated.push(`new numbers: ${newNums.join(", ")}`);
  if (newDates.length > 0) fabricated.push(`new dates: ${newDates.join(", ")}`);

  if (fabricated.length > 0) {
    return { name: "fabrication", passed: false, details: `Potential fabrication: ${fabricated.join("; ")}`, isFatal: true, score: 0 };
  }
  return { name: "fabrication", passed: true, details: "No fabrication detected", isFatal: false, score: 1 };
}

// ─── Main Evaluator ──────────────────────────────────────────────────────────

export function evaluatePreservation(
  benchCase: BenchmarkCase,
  candidate: string,
  _context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];

  const original = benchCase.conversation.length > 0
    ? benchCase.conversation[benchCase.conversation.length - 1].content
    : "";

  if (!original || !candidate) {
    return {
      caseId: benchCase.id,
      category: benchCase.category,
      difficulty: benchCase.difficulty,
      metrics: [],
      overall: "WARN",
      score: 0.5,
      executionTimeMs: Date.now() - startTime,
      evaluatorVersion: "2.0.0",
    };
  }

  const origFeatures = extractSemanticFeatures(original);
  const candFeatures = extractSemanticFeatures(candidate);

  // Run all dimension checks
  const checks: DimensionCheck[] = [
    checkNegationPreservation(origFeatures, candFeatures, original, candidate),
    checkAbilityPreservation(origFeatures, candFeatures),
    checkStancePreservation(origFeatures, candFeatures),
    checkBoundaryPreservation(original, candidate),
    checkTemporalPreservation(origFeatures, candFeatures),
    checkNumberPreservation(origFeatures, candFeatures),
    checkDatePreservation(origFeatures, candFeatures),
    checkUrlPreservation(origFeatures, candFeatures),
    checkEntityPreservation(origFeatures, candFeatures),
    checkCommitmentPreservation(origFeatures, candFeatures),
    checkQuestionPreservation(original, candidate),
    checkSemanticSimilarity(origFeatures, candFeatures, original, candidate),
    checkFabrication(original, candidate),
  ];

  // Convert to metrics
  for (const check of checks) {
    metrics.push({
      name: `preservation_${check.name}`,
      value: check.score,
      pass: check.passed ? "PASS" : "FAIL",
      details: check.details,
      isFatal: check.isFatal,
    });
  }

  // Add expected constraint checks from benchmark
  if (benchCase.expected.preservedFacts) {
    for (const fact of benchCase.expected.preservedFacts) {
      const factPresent = normalize(candidate).includes(normalize(fact));
      metrics.push({
        name: `preservation_fact_${fact.slice(0, 30)}`,
        value: factPresent ? 1 : 0,
        pass: factPresent ? "PASS" : "FAIL",
        details: factPresent ? `Fact "${fact}" preserved` : `Fact "${fact}" missing`,
        isFatal: true,
      });
    }
  }

  if (benchCase.expected.preservedConstraints) {
    for (const constraint of benchCase.expected.preservedConstraints) {
      const constraintPresent = normalize(candidate).includes(normalize(constraint));
      metrics.push({
        name: `preservation_constraint_${constraint.slice(0, 30)}`,
        value: constraintPresent ? 1 : 0,
        pass: constraintPresent ? "PASS" : "FAIL",
        details: constraintPresent ? `Constraint "${constraint}" preserved` : `Constraint "${constraint}" missing`,
        isFatal: true,
      });
    }
  }

  if (benchCase.expected.preservedEntities) {
    for (const entity of benchCase.expected.preservedEntities) {
      const entityPresent = candidate.includes(entity) || normalize(candidate).includes(normalize(entity));
      metrics.push({
        name: `preservation_entity_${entity}`,
        value: entityPresent ? 1 : 0,
        pass: entityPresent ? "PASS" : "FAIL",
        details: entityPresent ? `Entity "${entity}" preserved` : `Entity "${entity}" missing`,
        isFatal: false,
      });
    }
  }

  if (benchCase.expected.unacceptablePatterns) {
    for (const pattern of benchCase.expected.unacceptablePatterns) {
      const regex = new RegExp(pattern, "i");
      const found = regex.test(candidate);
      metrics.push({
        name: `unacceptable_pattern_${pattern.slice(0, 30)}`,
        value: found ? 0 : 1,
        pass: found ? "FAIL" : "PASS",
        details: found ? `Unacceptable pattern "${pattern}" found` : `Pattern "${pattern}" absent`,
        isFatal: true,
      });
    }
  }

  if (benchCase.expected.requiredPatterns) {
    for (const pattern of benchCase.expected.requiredPatterns) {
      const regex = new RegExp(pattern, "i");
      const found = regex.test(candidate);
      metrics.push({
        name: `required_pattern_${pattern.slice(0, 30)}`,
        value: found ? 1 : 0,
        pass: found ? "PASS" : "FAIL",
        details: found ? `Required pattern "${pattern}" found` : `Required pattern "${pattern}" missing`,
        isFatal: true,
      });
    }
  }

  // Overall pass/fail
  const fatalFailures = metrics.filter((m) => m.isFatal && m.pass === "FAIL");
  const nonFatalFailures = metrics.filter((m) => !m.isFatal && m.pass === "FAIL");

  let overall: PassFail = "PASS";
  if (fatalFailures.length > 0) overall = "FAIL";
  else if (nonFatalFailures.length > 0) overall = "WARN";

  // Compute weighted score: semantic similarity is primary, others are supporting
  const semanticMetric = metrics.find((m) => m.name === "preservation_semantic");
  const negationMetric = metrics.find((m) => m.name === "preservation_negation");
  const abilityMetric = metrics.find((m) => m.name === "preservation_ability");
  const stanceMetric = metrics.find((m) => m.name === "preservation_stance");

  // Weighted: negation/ability/stance are critical dimensions
  const criticalScore = (
    (negationMetric?.value ?? 1) * 0.3 +
    (abilityMetric?.value ?? 1) * 0.25 +
    (stanceMetric?.value ?? 1) * 0.2 +
    (semanticMetric?.value ?? 1) * 0.25
  );

  // Overall score is weighted average of critical score and average of other metrics
  const otherMetrics = metrics.filter((m) =>
    !["preservation_negation", "preservation_ability", "preservation_stance", "preservation_semantic"].includes(m.name)
  );
  const otherAvg = otherMetrics.length > 0
    ? otherMetrics.reduce((sum, m) => sum + m.value, 0) / otherMetrics.length
    : 1;

  const score = criticalScore * 0.7 + otherAvg * 0.3;

  return {
    caseId: benchCase.id,
    category: benchCase.category,
    difficulty: benchCase.difficulty,
    metrics,
    overall,
    score,
    executionTimeMs: Date.now() - startTime,
    evaluatorVersion: "2.0.0",
  };
}
