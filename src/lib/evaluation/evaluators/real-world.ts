/**
 * Real-World Evaluator
 *
 * Evaluates candidate messages on real-world communication dimensions:
 * - Naturalness (not AI-sounding)
 * - Context fit (appropriate for the situation)
 * - Semantic preservation (meaning preserved)
 * - Tone match (matches expected tone)
 * - Length appropriateness (not too long/short)
 * - Human imperfection (natural contractions, casual style)
 * - De-escalation (for conflict scenarios)
 * - Position preservation (for negotiation/disagreement)
 * - Negation preservation (meaning not flipped)
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── AI-Sounding Patterns (Penalized) ───────────────────────────────────────

const AI_PATTERNS = [
  /\bthat(?:'s| is) (?:amazing|wonderful|fascinating|great|fantastic|brilliant)\b/i,
  /\bi(?:'d| would) (?:love|be happy|be delighted) to\b/i,
  /\bthat sounds (?:amazing|wonderful|fascinating|great|fantastic)\b/i,
  /\bwhat (?:inspired|motivated) you to\b/i,
  /\bi(?:'d| would) be (?:happy|glad|delighted) to (?:help|assist|support)\b/i,
  /\bplease (?:don'?t hesitate|feel free) to\b/i,
  /\bthank you for (?:sharing|telling me|letting me know)\b/i,
  /\bi (?:completely|totally|absolutely) (?:understand|agree)\b/i,
  /\bthat(?:'s| is) a (?:great|wonderful|fantastic|brilliant) (?:point|idea|question|suggestion)\b/i,
  /\bi (?:appreciate|value) your\b/i,
  /\bhow (?:can I|may I|might I)\b/i,
  /\bwhat (?:do you think|are your thoughts)\b/i,
  /\bthat(?:'s| is) (?:really|very|truly) (?:interesting|impressive|admirable)\b/i,
  /\bi (?:hope|wish) this (?:helps|answers|clarifies)\b/i,
  /\blet me (?:know|think about)\b/i,
  /\bfeel free to\b/i,
  /\bdon'?t worry\b/i,
  /\beverything will be (?:okay|fine|alright)\b/i,
  /\bi(?:'m| am) (?:here for you|here to help)\b/i,
  /\bthat(?:'s| is) (?:completely|totally|absolutely) (?:understandable|reasonable|valid)\b/i,
];

// ─── Natural Language Patterns (Preferred) ──────────────────────────────────

const NATURAL_PATTERNS = [
  /\b(?:lol|haha|omg|bruh|dude|tbh|ngl|imo|imho)\b/i,
  /\b(?:yeah|yep|yup|nah|nope|ok|okay|sure|cool|nice|sick|fire|lit)\b/i,
  /\b(?:gonna|wanna|gotta|kinda|sorta|dunno|lemme|gimme|aint)\b/i,
  /\b(?:lol|haha|lmao|rofl|😂|🔥|💀|😭|❤️|👍|🙏)\b/,
  /\.\.\./,
  /\?{2,}/,
  /[!?]{2,}/,
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

function wordCount(text: string): number {
  return tokenize(text).length;
}

function hasNegation(text: string): boolean {
  const negations = [
    /\bnot\b/i, /\bno\b/i, /\bnever\b/i, /\bcan'?t\b/i, /\bwon'?t\b/i,
    /\bdon'?t\b/i, /\bdoesn'?t\b/i, /\bdidn'?t\b/i, /\bshouldn'?t\b/i,
    /\bcouldn'?t\b/i, /\bwouldn'?t\b/i, /\bisn'?t\b/i, /\baren'?t\b/i,
    /\bwasn'?t\b/i, /\bweren'?t\b/i, /\bhaven'?t\b/i, /\bhasn'?t\b/i,
    /\bhadn'?t\b/i, /\bhardly\b/i, /\bbarely\b/i, /\bscarcely\b/i,
  ];
  return negations.some((p) => p.test(text));
}

function hasCasualStyle(text: string): boolean {
  const casual = [
    /\.\.\./,
    /\?{2,}/,
    /\b(?:lol|haha|omg|bruh|tbh|ngl|imo)\b/i,
    /\b(?:yeah|yep|nah|ok|okay|sure|cool|nice)\b/i,
    /\b(?:gonna|wanna|gotta|kinda|sorta)\b/i,
    /[ lowercase]{50,}/,
  ];
  return casual.some((p) => p.test(text));
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

export function evaluateRealWorld(
  _case: BenchmarkCase,
  candidate: string,
  context?: EvaluationContext,
): EvalResult {
  const metrics: MetricResult[] = [];

  // 1. Naturalness (not AI-sounding)
  const aiPenalties = countMatches(candidate, AI_PATTERNS);
  const naturalBoosts = countMatches(candidate, NATURAL_PATTERNS);
  const naturalnessScore = Math.max(0, Math.min(1, 1 - (aiPenalties * 0.15) + (naturalBoosts * 0.1)));
  metrics.push({
    name: "naturalness",
    value: naturalnessScore,
    pass: naturalnessScore >= 0.7 ? "PASS" : "FAIL",
    details: `AI patterns: ${aiPenalties}, Natural patterns: ${naturalBoosts}`,
  });

  // 2. Length appropriateness
  const wc = wordCount(candidate);
  const idealMin = 2;
  const idealMax = 30;
  let lengthScore: number;
  if (wc >= idealMin && wc <= idealMax) {
    lengthScore = 1;
  } else if (wc < idealMin) {
    lengthScore = 0.5;
  } else {
    lengthScore = Math.max(0.3, 1 - (wc - idealMax) * 0.05);
  }
  metrics.push({
    name: "length_appropriateness",
    value: lengthScore,
    pass: lengthScore >= 0.6 ? "PASS" : "FAIL",
    details: `Word count: ${wc}, range: ${idealMin}-${idealMax}`,
  });

  // 3. Casual style (for real-world scenarios)
  const casualScore = hasCasualStyle(candidate) ? 0.9 : 0.6;
  metrics.push({
    name: "casual_style",
    value: casualScore,
    pass: casualScore >= 0.6 ? "PASS" : "FAIL",
    details: `Casual indicators present: ${hasCasualStyle(candidate)}`,
  });

  // 4. Context fit
  const caseContext = _case.context as string;
  const contextPositiveWords: Record<string, string[]> = {
    professional: ["team", "project", "deadline", "meeting", "sure", "review"],
    academic: ["research", "study", "analysis", "thesis", "paper"],
    dating: ["fun", "date", "meet", "love", "miss", "cute"],
    conflict: ["understand", "sorry", "hear", "resolve", "figure"],
    negotiation: ["offer", "deal", "discount", "agree", "compromise"],
    customer: ["help", "resolve", "assist", "apologize", "fix"],
    recovery: ["miss", "sorry", "again", "catch up", "reconnect"],
    social: ["hey", "sure", "cool", "fun", "hang", "plans"],
    work: ["meeting", "project", "deadline", "review", "update"],
  };
  const positiveWords = contextPositiveWords[caseContext] || contextPositiveWords.social || [];
  const lc = candidate.toLowerCase();
  const contextHits = positiveWords.filter((w) => lc.includes(w)).length;
  const contextScore = Math.min(1, 0.5 + contextHits * 0.15);
  metrics.push({
    name: "context_fit",
    value: contextScore,
    pass: contextScore >= 0.6 ? "PASS" : "FAIL",
    details: `Context: ${caseContext}, hits: ${contextHits}`,
  });

  // 5. Semantic preservation
  const draftWords = tokenize(_case.draft || "");
  const candidateWords = tokenize(candidate);
  const draftSet = new Set(draftWords);
  const candidateSet = new Set(candidateWords);
  const intersection = [...draftSet].filter((w) => candidateSet.has(w));
  const union = new Set([...draftSet, ...candidateSet]);
  const semanticScore = union.size > 0 ? intersection.length / union.size : 0.5;
  metrics.push({
    name: "semantic_preservation",
    value: semanticScore,
    pass: semanticScore >= 0.3 ? "PASS" : "FAIL",
    details: `Shared words: ${intersection.length}/${union.size}`,
  });

  // 6. Negation preservation (if expected)
  if (_case.expected.negationPreserved) {
    const draftNeg = hasNegation(_case.draft || "");
    const candNeg = hasNegation(candidate);
    const negScore = draftNeg === candNeg ? 1 : 0;
    metrics.push({
      name: "negation_preservation",
      value: negScore,
      pass: negScore >= 0.8 ? "PASS" : "FAIL",
      details: `Draft negated: ${draftNeg}, Candidate negated: ${candNeg}`,
    });
  }

  // 7. Position preservation (if expected)
  if (_case.expected.positionPreserved) {
    const draftLower = (_case.draft || "").toLowerCase();
    const candLower = candidate.toLowerCase();
    const draftPositive = /\b(?:yes|yeah|agree|sure|ok|okay)\b/i.test(draftLower);
    const candPositive = /\b(?:yes|yeah|agree|sure|ok|okay)\b/i.test(candLower);
    const draftNegative = /\b(?:no|nah|not|never|don'?t)\b/i.test(draftLower);
    const candNegative = /\b(?:no|nah|not|never|don'?t)\b/i.test(candLower);
    const posScore = (draftPositive === candPositive && draftNegative === candNegative) ? 1 : 0.5;
    metrics.push({
      name: "position_preservation",
      value: posScore,
      pass: posScore >= 0.7 ? "PASS" : "FAIL",
      details: `Draft positive: ${draftPositive}, Candidate positive: ${candPositive}`,
    });
  }

  // 8. De-escalation (if expected)
  if (_case.expected.deEscalationExpected) {
    const deEscalationWords = ["understand", "hear", "sorry", "respect", "calm", "figure", "resolve"];
    const hits = deEscalationWords.filter((w) => lc.includes(w)).length;
    const deEscScore = Math.min(1, hits * 0.25);
    metrics.push({
      name: "de_escalation",
      value: deEscScore,
      pass: deEscScore >= 0.5 ? "PASS" : "FAIL",
      details: `De-escalation words: ${hits}`,
    });
  }

  // 9. Tone match
  const expectedTone = _case.expected.tone || _case.targetTone;
  const toneWords: Record<string, string[]> = {
    professional: ["team", "project", "review", "sure", "will"],
    casual: ["sure", "yeah", "ok", "cool", "haha", "lol"],
    warm: ["love", "miss", "great", "happy", "thanks"],
    sincere: ["sorry", "understand", "appreciate", "honest"],
    enthusiastic: ["awesome", "great", "love", "excited", "amazing"],
    calm: ["understand", "hear", "ok", "alright", "sure"],
    assertive: ["need", "want", "require", "must", "please"],
    diplomatic: ["consider", "suggest", "perhaps", "maybe", "think"],
    supportive: ["help", "support", "there", "care", "listen"],
  };
  const expectedWords = (expectedTone && toneWords[expectedTone]) || [];
  const toneHits = expectedWords.filter((w: string) => lc.includes(w)).length;
  const toneScore = expectedWords.length > 0 ? Math.min(1, toneHits / Math.ceil(expectedWords.length * 0.5)) : 0.7;
  metrics.push({
    name: "tone_match",
    value: toneScore,
    pass: toneScore >= 0.5 ? "PASS" : "FAIL",
    details: `Expected tone: ${expectedTone}, hits: ${toneHits}`,
  });

  // Compute overall score
  const weights: Record<string, number> = {
    naturalness: 0.2,
    length_appropriateness: 0.1,
    casual_style: 0.1,
    context_fit: 0.15,
    semantic_preservation: 0.15,
    negation_preservation: 0.1,
    position_preservation: 0.1,
    de_escalation: 0.1,
    tone_match: 0.1,
  };

  let totalWeight = 0;
  let weightedSum = 0;
  for (const m of metrics) {
    const w = weights[m.name] || 0.1;
    totalWeight += w;
    weightedSum += m.value * w;
  }
  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  const overall: PassFail = overallScore >= 0.6 && metrics.every((m) => m.pass === "PASS" || ["negation_preservation", "position_preservation", "de_escalation"].includes(m.name)) ? "PASS" : "FAIL";

  return {
    caseId: _case.id,
    category: _case.category,
    difficulty: _case.difficulty,
    score: overallScore,
    overall,
    metrics,
    executionTimeMs: 0,
    evaluatorVersion: "1.0.0",
  };
}
