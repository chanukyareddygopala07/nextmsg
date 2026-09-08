/**
 * Context Evaluator
 * 
 * Evaluates whether a candidate message fits the expected context:
 * professional, academic, interview, conflict, dating, friendship, family,
 * customer, negotiation, group.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── Context Type Aliases ────────────────────────────────────────────────────
// Map benchmark context types to canonical evaluator context types

const CONTEXT_TYPE_ALIASES: Record<string, string> = {
  work: "professional",
  social: "friendship",
  customer_support: "customer",
  dating: "dating",
  academic: "academic",
  career: "professional",
  general: "casual",
  recovery: "conflict",
  negotiation: "negotiation",
  group: "group",
  conflict: "conflict",
  friendship: "friendship",
  family: "family",
  customer: "customer",
  professional: "professional",
  interview: "interview",
  casual: "casual",
  personal: "personal",
  preservation: "professional",
  adversarial: "professional",
  golden: "professional",
  golden_rule: "friendship",
  advisory: "conflict",
  multi_turn: "professional",
  multilingual: "professional",
};

function resolveContextType(contextType: string): string {
  return CONTEXT_TYPE_ALIASES[contextType] || contextType;
}

// ─── Context Indicators ──────────────────────────────────────────────────────

const CONTEXT_INDICATORS: Record<string, { positive: string[]; negative: string[] }> = {
  professional: {
    positive: [
      "team", "project", "deadline", "meeting", "schedule", "report",
      "proposal", "stakeholder", "deliverable", "timeline", "milestone",
      "action item", "follow up", "update", "review", "feedback",
      "thank you", "appreciate", "regards", "best", "sincerely",
    ],
    negative: [
      "lol", "omg", "haha", "wanna", "gonna", "yolo", "bruh",
      "bro", "dude", "chill", "vibe", "slay", "periodt",
    ],
  },
  academic: {
    positive: [
      "research", "study", "analysis", "thesis", "hypothesis",
      "methodology", "literature", "evidence", "argument", "conclusion",
      "furthermore", "moreover", "therefore", "consequently", "thus",
      "according to", "citation", "reference", "abstract", "introduction",
    ],
    negative: [
      "lol", "omg", "haha", "wanna", "gonna", "cool", "awesome",
      "hey", "whats up", "bruh", "dude", "vibe",
    ],
  },
  interview: {
    positive: [
      "experience", "skill", "qualify", "background", "strength",
      "opportunity", "position", "role", "responsibility", "challenge",
      "learn", "grow", "contribute", "value", "team",
      "thank you", "appreciate", "excited", "looking forward",
    ],
    negative: [
      "lol", "omg", "haha", "wanna", "gonna", "cool", "awesome",
      "bruh", "dude", "chill", "lazy", "bored",
    ],
  },
  conflict: {
    positive: [
      "understand", "concern", "respect", "feel", "perspective",
      "resolve", "solution", "compromise", "work together", "move forward",
      "agree", "disagree", "boundary", "uncomfortable", "need",
    ],
    negative: [
      "incompetent", "useless", "waste", "terrible", "awful",
      "worst", "ridiculous", "absurd", "fired", "sue",
    ],
  },
  dating: {
    positive: [
      "fun", "exciting", "enjoy", "like", "interested",
      "date", "together", "meet", "plan", "weekend",
      "cute", "amazing", "great", "love", "miss",
    ],
    negative: [
      "professional", "deadline", "meeting", "proposal", "stakeholder",
      "report", "schedule", "formal", "regards", "sincerely",
    ],
  },
  friendship: {
    positive: [
      "hey", "what's up", "hang out", "cool", "awesome",
      "fun", "miss", "good", "great", "awesome",
      "catch up", "long time", "remember", "together",
    ],
    negative: [
      "professional", "deadline", "meeting", "proposal", "stakeholder",
      "report", "schedule", "regards", "sincerely", "formal",
    ],
  },
  family: {
    positive: [
      "love", "miss", "care", "home", "visit",
      "dinner", "holiday", "birthday", "weekend", "together",
      "help", "support", "mom", "dad", "brother", "sister",
    ],
    negative: [
      "professional", "deadline", "meeting", "proposal", "stakeholder",
      "report", "regards", "sincerely",
    ],
  },
  customer: {
    positive: [
      "order", "delivery", "refund", "service", "support",
      "assist", "help", "resolve", "apologize", "inconvenience",
      "product", "quality", "guarantee", "return", "replacement",
    ],
    negative: [
      "lol", "omg", "haha", "wanna", "gonna", "cool", "awesome",
      "bruh", "dude", "chill", "vibe", "yolo",
    ],
  },
  negotiation: {
    positive: [
      "offer", "proposal", "terms", "agreement", "compromise",
      "value", "benefit", "concession", "mutual", "fair",
      "consider", "suggest", "propose", "counter", "accept",
    ],
    negative: [
      "incompetent", "useless", "waste", "terrible", "awful",
      "worst", "ridiculous", "sue", "lawsuit", "threat",
    ],
  },
  group: {
    positive: [
      "team", "everyone", "group", "together", "input",
      "opinion", "agree", "discuss", "consensus", "collaborate",
      "contribute", "share", "thoughts", "ideas", "feedback",
    ],
    negative: [
      "incompetent", "useless", "waste", "terrible", "awful",
      "worst", "ridiculous", "fired", "sue", "lawsuit",
    ],
  },
  casual: {
    positive: [
      "hey", "cool", "awesome", "fun", "great",
      "lol", "haha", "yeah", "sure", "nice",
      "what's up", "hang out", "chill", "vibe",
    ],
    negative: [
      "professional", "deadline", "meeting", "proposal", "stakeholder",
      "report", "formal", "regards", "sincerely",
    ],
  },
  personal: {
    positive: [
      "feel", "think", "believe", "want", "need",
      "personal", "private", "important", "matter", "care",
      "love", "miss", "hope", "wish", "trust",
    ],
    negative: [
      "professional", "deadline", "meeting", "proposal", "stakeholder",
      "report", "formal", "regards", "sincerely",
    ],
  },
};

// ─── Context Scoring ─────────────────────────────────────────────────────────

function scoreContextFit(text: string, contextType: string): { score: number; details: string[] } {
  const indicators = CONTEXT_INDICATORS[contextType];
  if (!indicators) return { score: 0.5, details: ["Unknown context type"] };

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 0);
  let positiveHits = 0;
  let negativeHits = 0;
  const details: string[] = [];

  for (const word of indicators.positive) {
    if (lower.includes(word)) {
      positiveHits++;
      details.push(`+${word}`);
    }
  }

  for (const word of indicators.negative) {
    if (lower.includes(word)) {
      negativeHits++;
      details.push(`-${word}`);
    }
  }

  // Structural context signals (beyond just word matching)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = words.length > 0 && sentences.length > 0 ? words.length / sentences.length : words.length;
  const hasEmojis = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
  const contractions = (lower.match(/\b\w+'t\b|\b\w+'re\b|\b\w+'ve\b|\b\w+'ll\b|\b\w+'d\b|\bi'm\b/g) || []).length;
  const hasSlang = /\b(lol|omg|haha|gonna|wanna|gotta|btw|tbh|bruh|dude|chill|vibe|slay|periodt|yolo)\b/.test(lower);
  const hasFormalTransitions = /\b(therefore|furthermore|consequently|moreover|however|nevertheless|additionally|specifically|particularly|accordingly)\b/.test(lower);
  const hasSignoff = /(regards|sincerely|best|cheers|thank you|appreciate|thank you for your time)/i.test(text);

  let structuralBoost = 0;
  const structuralDetails: string[] = [];

  // Context-specific structural signals
  if (contextType === "professional" || contextType === "academic" || contextType === "interview") {
    if (avgSentenceLength > 10) { structuralBoost += 0.08; structuralDetails.push("formal_length"); }
    if (!hasSlang) { structuralBoost += 0.08; structuralDetails.push("no_slang"); }
    if (!hasEmojis) { structuralBoost += 0.05; structuralDetails.push("no_emoji"); }
    if (hasFormalTransitions) { structuralBoost += 0.05; structuralDetails.push("formal_transitions"); }
    if (hasSignoff) { structuralBoost += 0.08; structuralDetails.push("formal_signoff"); }
    if (contractions <= 2) { structuralBoost += 0.05; structuralDetails.push("few_contractions"); }
    // Work vocabulary present
    if (/\b(team|project|deadline|deliverable|meeting|report|review|feedback|schedule|timeline|proposal|capacity|prioritize|deliver)\b/.test(lower)) {
      structuralBoost += 0.1; structuralDetails.push("work_vocab");
    }
  } else if (contextType === "dating" || contextType === "friendship") {
    if (contractions > 0) { structuralBoost += 0.1; structuralDetails.push("has_contraction"); }
    if (hasEmojis) { structuralBoost += 0.08; structuralDetails.push("has_emoji"); }
    if (avgSentenceLength < 12) { structuralBoost += 0.08; structuralDetails.push("casual_length"); }
    if (/\?/.test(text)) { structuralBoost += 0.05; structuralDetails.push("has_question"); }
    if (hasSlang) { structuralBoost += 0.05; structuralDetails.push("has_slang"); }
  } else if (contextType === "conflict") {
    if (/\b(understand|feel|respect|concern|perspective|need|resolve|compromise|work together|move forward|boundary|uncomfortable)\b/.test(lower)) { structuralBoost += 0.15; structuralDetails.push("conflict_vocab"); }
    if (avgSentenceLength >= 6 && avgSentenceLength <= 14) { structuralBoost += 0.08; structuralDetails.push("moderate_length"); }
    if (!/\b(incompetent|useless|waste|terrible|awful|worst|ridiculous|fired|sue)\b/.test(lower)) { structuralBoost += 0.1; structuralDetails.push("no_aggressive"); }
  } else if (contextType === "negotiation") {
    if (/\b(offer|proposal|terms|agreement|compromise|value|benefit|consider|suggest|propose|counter|accept|mutual|fair)\b/.test(lower)) { structuralBoost += 0.15; structuralDetails.push("negotiation_vocab"); }
    if (avgSentenceLength >= 8) { structuralBoost += 0.05; structuralDetails.push("moderate_length"); }
  } else if (contextType === "customer") {
    if (/\b(order|delivery|refund|service|support|assist|help|resolve|apologize|inconvenience|product|quality|guarantee|return|replacement)\b/.test(lower)) { structuralBoost += 0.15; structuralDetails.push("customer_vocab"); }
    if (!hasSlang) { structuralBoost += 0.08; structuralDetails.push("no_slang"); }
    if (!hasEmojis) { structuralBoost += 0.05; structuralDetails.push("no_emoji"); }
  } else if (contextType === "family") {
    if (/\b(love|miss|care|home|visit|dinner|holiday|birthday|weekend|together|help|support|mom|dad|brother|sister)\b/.test(lower)) { structuralBoost += 0.15; structuralDetails.push("family_vocab"); }
    if (contractions > 0) { structuralBoost += 0.05; structuralDetails.push("has_contraction"); }
  } else if (contextType === "group") {
    if (/\b(team|everyone|group|together|input|opinion|agree|discuss|consensus|collaborate|contribute|share|thoughts|ideas|feedback|let's|we|our|us)\b/.test(lower)) { structuralBoost += 0.15; structuralDetails.push("group_vocab"); }
    if (/\b(let's|we should|we can|we need|our|us|together)\b/.test(lower)) { structuralBoost += 0.08; structuralDetails.push("collaborative"); }
  } else if (contextType === "casual") {
    if (/\b(hey|cool|awesome|fun|great|lol|haha|yeah|sure|nice|what's up|hang out|chill|vibe|buddy|pal)\b/.test(lower)) { structuralBoost += 0.15; structuralDetails.push("casual_vocab"); }
    if (contractions > 0) { structuralBoost += 0.08; structuralDetails.push("has_contraction"); }
    if (hasEmojis) { structuralBoost += 0.05; structuralDetails.push("has_emoji"); }
  } else if (contextType === "personal") {
    if (/\b(feel|think|believe|want|need|personal|private|important|matter|care|love|miss|hope|wish|trust)\b/.test(lower)) { structuralBoost += 0.15; structuralDetails.push("personal_vocab"); }
    if (contractions > 0) { structuralBoost += 0.05; structuralDetails.push("has_contraction"); }
  }

  // Improved scoring formula:
  // Higher base for messages without negative signals (most drafts are well-written)
  const maxPositive = indicators.positive.length;
  const positiveRatio = maxPositive > 0 ? positiveHits / maxPositive : 0;
  const negativePenalty = negativeHits * 0.25;

  // Score = base + positive contribution + structural boost - negative penalty
  // Higher base (0.55) since most benchmark drafts are contextually appropriate
  const baseScore = negativeHits > 0 ? 0.45 : 0.55;
  const positiveContribution = positiveRatio * 0.35; // up to 0.35 from word matches
  const rawScore = baseScore + positiveContribution + structuralBoost - negativePenalty;
  const normalizedScore = Math.max(0, Math.min(1, rawScore));

  return { score: normalizedScore, details: [...details, ...structuralDetails] };
}

// ─── Main Context Evaluator ──────────────────────────────────────────────────

export function evaluateContext(
  benchCase: BenchmarkCase,
  candidate: string,
  _context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];
  
  const contextType = resolveContextType(benchCase.context);
  
  // Context fit score
  const fit = scoreContextFit(candidate, contextType);
  metrics.push({
    name: "context_fit",
    value: fit.score,
    pass: fit.score >= 0.6 ? "PASS" : fit.score >= 0.3 ? "WARN" : "FAIL",
    details: `Context "${contextType}" fit: ${fit.score.toFixed(3)} (${fit.details.join(", ")})`,
  });
  
  // Severe mismatch detection
  const severeMismatchWords: Record<string, string[]> = {
    professional: ["lol", "omg", "bruh", "dude", "yolo", "gonna", "wanna", "gotta"],
    academic: ["lol", "omg", "bruh", "dude", "yolo", "gonna", "wanna", "cool", "awesome"],
    interview: ["lol", "omg", "bruh", "dude", "lazy", "bored", "whatever"],
    conflict: ["incompetent", "useless", "waste", "fired", "sue", "lawsuit", "threat"],
    dating: ["professional", "deadline", "meeting", "stakeholder", "report", "proposal"],
    friendship: ["professional", "deadline", "meeting", "stakeholder", "report", "proposal"],
    family: ["professional", "deadline", "meeting", "stakeholder", "report", "regards", "sincerely"],
    customer: ["lol", "omg", "bruh", "dude", "yolo", "gonna", "wanna"],
    negotiation: ["incompetent", "useless", "waste", "sue", "lawsuit", "threat", "never"],
    group: ["incompetent", "useless", "waste", "fired", "sue", "lawsuit"],
    recovery: ["incompetent", "useless", "waste", "terrible", "awful", "never", "always"],
    multilingual: [],
    preservation: [],
    golden: [],
    adversarial: [],
    personalization: [],
    pre_send: [],
    mode: [],
  };
  
  const severeWords = severeMismatchWords[contextType] || [];
  const lower = candidate.toLowerCase();
  const severeHits = severeWords.filter((w) => lower.includes(w));
  
  if (severeHits.length > 0) {
    metrics.push({
      name: "context_severe_mismatch",
      value: 0,
      pass: "FAIL",
      details: `Severe mismatch: ${severeHits.join(", ")} in ${contextType} context`,
      isFatal: false,
    });
  }
  
  // Expected context indicators
  if (benchCase.expected.requiredPatterns) {
    for (const pattern of benchCase.expected.requiredPatterns) {
      const regex = new RegExp(pattern, "i");
      const found = regex.test(candidate);
      metrics.push({
        name: `context_required_${pattern.slice(0, 20)}`,
        value: found ? 1 : 0,
        pass: found ? "PASS" : "FAIL",
        details: found ? `Required context pattern "${pattern}" found` : `Pattern "${pattern}" missing`,
      });
    }
  }
  
  // Overall
  const failures = metrics.filter((m) => m.pass === "FAIL");
  const warnings = metrics.filter((m) => m.pass === "WARN");
  
  let overall: PassFail = "PASS";
  if (failures.length > 0) overall = "FAIL";
  else if (warnings.length > 0) overall = "WARN";
  
  const score = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
    : 1;
  
  return {
    caseId: benchCase.id,
    category: benchCase.category,
    difficulty: benchCase.difficulty,
    metrics,
    overall,
    score,
    executionTimeMs: Date.now() - startTime,
    evaluatorVersion: "1.0.0",
  };
}
