import type { ConversationAnalysis } from "@/types/conversation";
import type { ConversationState } from "./conversation-state";
import type { StrategyRecommendation } from "./strategy";
import type { WritingStyleProfile } from "./personality";
import type { SituationRecovery } from "./situation-recovery";
import type { CommunicationStrategy } from "./intelligence";
import type { CompactPreferenceProfile } from "./personalization-types";
import { scoreAILikeness } from "./humanizer";

interface RankedCandidate {
  text: string;
  strategy: string;
  score: number;
}

export function rankReplies(
  candidates: { text: string; strategy: string }[],
  analysis: ConversationAnalysis,
  goal?: string,
  state?: ConversationState,
  strategies?: StrategyRecommendation[],
  recovery?: SituationRecovery,
  preferences?: CompactPreferenceProfile
): RankedCandidate[] {
  const activeStrategies = strategies || [];
  const strategySet = new Set(activeStrategies.map((s) => s.strategy));

  const scored = candidates.map((c) => {
    let score = 0.5;

    score += analyzeLengthScore(c.text, analysis, state);
    score += analyzeGoalScore(c.text, goal, state);
    score += analyzeEngagementScore(c.text, analysis);
    score += analyzeStyleScore(c.text);
    score -= scoreAILikeness(c.text);

    if (state) {
      score += analyzeStrategyScore(c, state, strategySet);
      score += analyzeContextScore(c, state);
      score -= analyzeConflictPenalty(c, state);
      score += analyzeStyleAlignmentScore(c, state);
      score += analyzeStyleProfileScore(c, state);
      score += analyzeConflictIntelligenceScore(c, state);
    }

    if (recovery) {
      score += analyzeRecoveryScore(c, recovery);
      score += analyzeFactualIntegrityScore(c, recovery);
    }

    // Personalization scoring
    if (preferences) {
      score += analyzePreferenceScore(c, preferences);
    }

    return {
      ...c,
      score: Math.max(0, Math.min(1, score)),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function analyzeStrategyScore(
  candidate: { text: string; strategy: string },
  state: ConversationState,
  strategySet: Set<string>
): number {
  if (strategySet.has(candidate.strategy)) {
    const rec = state.strategy.ranked.find((r) => r.strategy === candidate.strategy);
    if (rec) {
      return 0.1 + rec.confidence * 0.15;
    }
    return 0.15;
  }

  return 0;
}

function analyzeContextScore(
  candidate: { text: string; strategy: string },
  state: ConversationState
): number {
  const wordCount = candidate.text.split(/\s+/).length;
  const conflictLevel = state.conflict.level;

  if (conflictLevel > 0.7 && wordCount > 15) return -0.1;
  if (state.dynamics.defensiveness > 0.6 && candidate.strategy === "apologetic") return 0.05;
  if (conflictLevel === 0 && candidate.strategy === "de_escalate") return -0.05;

  return 0;
}

function analyzeConflictPenalty(
  candidate: { text: string; strategy: string },
  state: ConversationState
): number {
  let penalty = 0;

  if (state.conflict.level > 0.5) {
    if (candidate.strategy === "playful" || candidate.strategy === "flirty") {
      penalty += 0.15;
    }
    if (candidate.strategy === "funny" && state.conflict.escalation > 0.3) {
      penalty += 0.1;
    }
  }

  if (state.emotion.primary === "angry" && candidate.strategy === "playful") {
    penalty += 0.1;
  }

  if (state.context.type === "professional" && candidate.strategy === "flirty") {
    penalty += 0.25;
  }

  if (state.context.type === "professional" && candidate.strategy === "playful") {
    penalty += 0.1;
  }

  if (state.context.type === "interview" && (candidate.strategy === "playful" || candidate.strategy === "flirty")) {
    penalty += 0.3;
  }

  return penalty;
}

function analyzeStyleAlignmentScore(
  candidate: { text: string; strategy: string },
  state: ConversationState
): number {
  const preferred = state.style.preferred;
  if (!preferred || preferred === "casual") return 0;

  if (preferred === "professional" && candidate.strategy === "professional") return 0.08;
  if (preferred === "concise" && candidate.strategy === "concise") return 0.08;
  if (preferred === "clear_direct" && candidate.strategy === "clear_direct") return 0.08;
  if (preferred === "diplomatic" && candidate.strategy === "diplomatic") return 0.08;
  if (preferred === "empathetic" && candidate.strategy === "empathetic") return 0.08;
  if (preferred === "flirty" && candidate.strategy === "flirty") return 0.08;
  if (preferred === "playful" && candidate.strategy === "playful") return 0.08;

  return 0;
}

function analyzeLengthScore(
  text: string,
  analysis: ConversationAnalysis,
  state?: ConversationState
): number {
  const wordCount = text.split(/\s+/).length;

  if (state?.context.type === "professional" || state?.context.type === "interview") {
    if (wordCount <= 10) return 0.1;
    if (wordCount <= 20) return 0.05;
    return -0.05;
  }

  if (analysis.stage === "dry_conversation" || analysis.stage === "awkward_conversation") {
    return wordCount <= 8 ? 0.1 : -0.1;
  }
  if (analysis.engagement < 0.3) {
    return wordCount <= 6 ? 0.1 : -0.15;
  }
  if (wordCount <= 5) return 0.15;
  if (wordCount <= 10) return 0.1;
  if (wordCount <= 15) return 0;
  return -0.1;
}

function analyzeGoalScore(
  text: string,
  goal?: string,
  state?: ConversationState
): number {
  const effectiveGoal = goal || state?.intent.userGoal;
  if (!effectiveGoal || effectiveGoal === "keep_going") return 0;

  const lowerText = text.toLowerCase();

  switch (effectiveGoal) {
    case "make_them_laugh":
      return /\b(haha|lol|lmao|😂|🤣|joke|funny)\b/i.test(lowerText) ? 0.15 : -0.05;
    case "flirt_naturally":
      return /\b(eyes|cute|love|admire|attraction|heart)\b/i.test(lowerText) ? 0.1 : -0.05;
    case "ask_them_out":
      return /\b(coffee|drink|dinner|hangout|meet|date|tonight|tomorrow)\b/i.test(lowerText) ? 0.15 : -0.05;
    case "show_interest":
      return /\?$/.test(text.trim()) ? 0.1 : 0;
    case "recover_dry":
      return text.length < 20 ? 0.1 : -0.05;
    case "change_topic":
      return text.length < 30 ? 0.1 : -0.05;
    case "ask_for_extension":
      return /\b(sorry|apologize|deadline|extension|time|delay)\b/i.test(lowerText) ? 0.1 : -0.05;
    case "reconnect":
      return /\b(haven't|long time|miss|hey|hi|hello)\b/i.test(lowerText) ? 0.1 : 0;
    default:
      return 0;
  }
}

function analyzeEngagementScore(text: string, analysis: ConversationAnalysis): number {
  let score = 0;

  if (analysis.conversationHealth > 0.7) {
    if (text.includes("?")) score += 0.05;
  }

  if (analysis.conversationHealth < 0.3) {
    if (text.length < 15) score += 0.1;
  }

  if (analysis.humor > 0.6) {
    const hasHumor = /\b(haha|lol|lmao|😂|🤣)\b/i.test(text);
    score += hasHumor ? 0.05 : 0;
  }

  return score;
}

function analyzeStyleScore(text: string): number {
  let score = 0;

  if (text === text.toUpperCase() && text.length > 3) score -= 0.1;

  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 2) score -= 0.1;

  if (/\.{3,}/.test(text)) score -= 0.05;

  if (text.includes("?")) score += 0.02;

  return score;
}

// ─── Style Profile Scoring ────────────────────────────────────────────────────
//
// Scores how well a candidate matches the user's extracted writing style.
// Uses the WritingStyleProfile from the personality engine.
// ──────────────────────────────────────────────────────────────────────────────

function analyzeStyleProfileScore(
  candidate: { text: string; strategy: string },
  state: ConversationState
): number {
  const profile = state.style?.profile;
  if (!profile || profile.confidence < 0.4) return 0;

  let score = 0;

  // ── Length matching ──
  const wordCount = candidate.text.split(/\s+/).length;
  score += scoreLengthMatch(wordCount, profile);

  // ── Emoji matching ──
  score += scoreEmojiMatch(candidate.text, profile);

  // ── Punctuation matching ──
  score += scorePunctuationMatch(candidate.text, profile);

  // ── Slang matching ──
  score += scoreSlangMatch(candidate.text, profile);

  // ── Tone matching ──
  score += scoreToneMatch(candidate, state, profile);

  return score;
}

function scoreLengthMatch(wordCount: number, profile: WritingStyleProfile): number {
  const target = profile.sentence.averageWords;
  const diff = Math.abs(wordCount - target);
  const maxDiff = Math.max(target, 10);

  // Closer to target = higher score
  const closeness = 1 - Math.min(1, diff / maxDiff);
  return (closeness - 0.5) * 0.15; // Range: -0.075 to +0.075
}

function scoreEmojiMatch(text: string, profile: WritingStyleProfile): number {
  const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);

  if (profile.emoji.usesEmojis && hasEmojis) return 0.05;
  if (!profile.emoji.usesEmojis && !hasEmojis) return 0.03;
  if (profile.emoji.usesEmojis && !hasEmojis) return -0.02;
  return -0.03; // Has emojis but user doesn't use them
}

function scorePunctuationMatch(text: string, profile: WritingStyleProfile): number {
  let score = 0;

  // Exclamation marks
  const hasExclamation = text.includes("!");
  if (profile.punctuation.style === "expressive" && hasExclamation) score += 0.03;
  if (profile.punctuation.style === "minimal" && hasExclamation) score -= 0.03;

  // Question marks
  const hasQuestion = text.includes("?");
  if (profile.punctuation.questionRate > 0.3 && hasQuestion) score += 0.02;

  // Ellipses
  const hasEllipses = /\.{3,}/.test(text);
  if (profile.punctuation.usesEllipses && hasEllipses) score += 0.02;
  if (!profile.punctuation.usesEllipses && hasEllipses) score -= 0.02;

  // Multi-punctuation
  const hasMultiPunct = /[!?]{2,}/.test(text);
  if (profile.punctuation.multiPunctuationRate > 0.2 && hasMultiPunct) score += 0.02;
  if (profile.punctuation.multiPunctuationRate < 0.05 && hasMultiPunct) score -= 0.02;

  return score;
}

function scoreSlangMatch(text: string, profile: WritingStyleProfile): number {
  if (!profile.slang.usesSlang) {
    // User doesn't use slang - penalize if candidate does
    const hasSlang = /\b(lol|bruh|fam|ngl|tbh|istg|dead|slay|bussin|no_cap)\b/i.test(text);
    return hasSlang ? -0.05 : 0;
  }

  // User uses slang - check if candidate matches
  const textLower = text.toLowerCase();
  const hasMatchingSlang = profile.slang.commonSlang.some((s) => textLower.includes(s));
  const hasMatchingAbbrev = profile.slang.commonAbbreviations.some((a) => textLower.includes(a));

  if (hasMatchingSlang || hasMatchingAbbrev) return 0.05;
  if (profile.slang.frequency > 0.3) return -0.02; // Heavy slang user, no slang in response
  return 0;
}

function scoreToneMatch(
  candidate: { text: string; strategy: string },
  state: ConversationState,
  profile: WritingStyleProfile
): number {
  const formality = profile.tonePreference.formality;
  let score = 0;

  // Formality alignment
  if (formality === "very_formal" || formality === "formal") {
    if (candidate.strategy === "professional" || candidate.strategy === "diplomatic") {
      score += 0.05;
    }
    if (candidate.strategy === "playful" || candidate.strategy === "funny") {
      score -= 0.05;
    }
  } else if (formality === "very_casual" || formality === "casual") {
    if (candidate.strategy === "natural" || candidate.strategy === "playful") {
      score += 0.05;
    }
    if (candidate.strategy === "professional" || candidate.strategy === "formal") {
      score -= 0.05;
    }
  }

  // Warmth alignment
  if (profile.tonePreference.warmth > 0.7) {
    if (candidate.strategy === "friendly" || candidate.strategy === "warm") {
      score += 0.03;
    }
    if (candidate.strategy === "clear_direct" || candidate.strategy === "assertive") {
      score -= 0.03;
    }
  }

  // Directness alignment
  if (profile.tonePreference.directness > 0.7) {
    if (candidate.strategy === "clear_direct" || candidate.strategy === "assertive") {
      score += 0.03;
    }
    if (candidate.strategy === "diplomatic" || candidate.strategy === "empathetic") {
      score -= 0.02;
    }
  }

  return score;
}

// ─── Conflict Intelligence Scoring ────────────────────────────────────────────
//
// Scores candidates based on conflict intelligence (participants, structure, etc.)
// ──────────────────────────────────────────────────────────────────────────────

function analyzeConflictIntelligenceScore(
  candidate: { text: string; strategy: string },
  state: ConversationState
): number {
  let score = 0;

  const { conflictIntelligence } = state;

  // No conflict intelligence available
  if (!conflictIntelligence || conflictIntelligence.participants.length === 0) {
    return 0;
  }

  const { conflictStructure, groupAnalysis } = conflictIntelligence;

  // Escalation trend scoring
  if (conflictStructure) {
    // If escalation is increasing, penalize strategies that might escalate further
    if (conflictStructure.escalationTrend === "increasing") {
      if (candidate.strategy === "assertive" || candidate.strategy === "clear_direct") {
        score -= 0.05;
      }
      if (candidate.strategy === "de_escalate" || candidate.strategy === "empathetic") {
        score += 0.08;
      }
    }

    // If there are misunderstandings, reward clarifying strategies
    if (conflictStructure.misunderstandings.length > 0) {
      if (candidate.strategy === "clarifying" || candidate.strategy === "diplomatic") {
        score += 0.1;
      }
    }

    // If there are resolution opportunities, reward solution-oriented strategies
    if (conflictStructure.resolutionOpportunities.length > 0) {
      if (candidate.strategy === "solution_oriented" || candidate.strategy === "negotiation") {
        score += 0.08;
      }
    }

    // Penalize if personal attacks are present and candidate is aggressive
    if (conflictStructure.personalAttacks) {
      if (candidate.strategy === "assertive" || candidate.strategy === "clear_direct") {
        score -= 0.1;
      }
      if (candidate.strategy === "de_escalate" || candidate.strategy === "boundary_setting") {
        score += 0.1;
      }
    }

    // Blame pattern scoring
    if (conflictStructure.blamePattern === "direct_blame" || conflictStructure.blamePattern === "shared_responsibility") {
      if (candidate.strategy === "accountable" || candidate.strategy === "solution_oriented") {
        score += 0.08;
      }
    }
  }

  // Group conversation scoring
  if (groupAnalysis?.isGroup) {
    // In group conversations, neutral_summary and solution_oriented are good
    if (candidate.strategy === "neutral_summary" || candidate.strategy === "solution_oriented") {
      score += 0.05;
    }

    // If there are conflict participants, de-escalation is valuable
    if (groupAnalysis.groupDynamics.conflictParticipants.length > 0) {
      if (candidate.strategy === "de_escalate" || candidate.strategy === "mediator") {
        score += 0.08;
      }
    }
  }

  return score;
}

// ─── Recovery Scoring ────────────────────────────────────────────────────────
//
// Scores candidates based on situation recovery requirements.
// ──────────────────────────────────────────────────────────────────────────────

function analyzeRecoveryScore(
  candidate: { text: string; strategy: string },
  recovery: SituationRecovery
): number {
  let score = 0;

  // Check if candidate uses a recommended recovery strategy
  if (recovery.recommendedStrategies.includes(candidate.strategy as CommunicationStrategy)) {
    score += 0.1;
  }

  // Check if candidate includes required elements
  const textLower = candidate.text.toLowerCase();
  for (const element of recovery.requiredElements) {
    if (element.priority === "required") {
      if (element.element === "acknowledgement" && /\b(sorry|apologize|understand|acknowledge)\b/i.test(textLower)) {
        score += 0.05;
      }
      if (element.element === "accountability" && /\b(responsibility|my fault|on me|accountable)\b/i.test(textLower)) {
        score += 0.05;
      }
      if (element.element === "new_timeline" && /\b(tomorrow|by (monday|tuesday|wednesday|thursday|friday)|\d+ (pm|am)|evening|morning)\b/i.test(textLower)) {
        score += 0.05;
      }
      if (element.element === "solution" && /\b(solve|fix|resolution|will|can|going to)\b/i.test(textLower)) {
        score += 0.05;
      }
    }
  }

  // Penalize risky elements
  for (const risk of recovery.riskyElements) {
    if (risk.includes("Fabricating excuses") && /\b(illness|emergency|family problem|technical failure|accident)\b/i.test(textLower)) {
      score -= 0.15;
    }
    if (risk.includes("Making promises") && /\b(guarantee|promise|swear|definitely will)\b/i.test(textLower)) {
      score -= 0.1;
    }
  }

  return score;
}

// ─── Factual Integrity Scoring ───────────────────────────────────────────────
//
// Ensures candidates preserve user-provided facts and don't fabricate information.
// ──────────────────────────────────────────────────────────────────────────────

function analyzeFactualIntegrityScore(
  candidate: { text: string; strategy: string },
  recovery: SituationRecovery
): number {
  let score = 0;

  // Check if candidate preserves user-provided facts
  for (const fact of recovery.relevantFacts) {
    if (fact.source === "user" && fact.verified) {
      const factWords = fact.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const candidateLower = candidate.text.toLowerCase();
      const preservedCount = factWords.filter((w) => candidateLower.includes(w)).length;
      const preservationRate = factWords.length > 0 ? preservedCount / factWords.length : 0;

      if (preservationRate > 0.5) {
        score += 0.05;
      }
    }
  }

  // Penalize fabricated information
  const fabricationPatterns = [
    /\b(illness|sick|doctor|hospital|emergency)\b/i,
    /\b(accident|car broke down|flat tire|traffic)\b/i,
    /\b(family problem|family emergency|death in the family)\b/i,
    /\b(technical issue|computer crashed|internet down|power outage)\b/i,
  ];

  const textLower = candidate.text.toLowerCase();
  for (const pattern of fabricationPatterns) {
    if (pattern.test(textLower)) {
      // Check if this was user-provided
      const userFactTexts = recovery.relevantFacts
        .filter((f) => f.source === "user")
        .map((f) => f.text.toLowerCase());

      const isUserProvided = userFactTexts.some((uf) => pattern.test(uf));
      if (!isUserProvided) {
        score -= 0.15;
      }
    }
  }

  return score;
}

// ─── Personalization Scoring ───────────────────────────────────────────────────
//
// Scores candidates based on user's learned communication preferences.
// Only applies when preferences have meaningful confidence.
// ──────────────────────────────────────────────────────────────────────────────

function analyzePreferenceScore(
  candidate: { text: string; strategy: string },
  preferences: CompactPreferenceProfile
): number {
  let score = 0;

  for (const [dim, data] of Object.entries(preferences.dimensions)) {
    if (!data || data.confidence < 0.3) continue;

    switch (dim) {
      case "length":
        score += scoreLengthPreference(candidate.text, data.value, data.confidence);
        break;
      case "emoji":
        score += scoreEmojiPreference(candidate.text, data.value, data.confidence);
        break;
      case "formality":
        score += scoreFormalityPreference(candidate.strategy, data.value, data.confidence);
        break;
      case "tone":
        score += scoreTonePreference(candidate.strategy, data.value, data.confidence);
        break;
      case "punctuation":
        score += scorePunctuationPreference(candidate.text, data.value, data.confidence);
        break;
      case "slang":
        score += scoreSlangPreference(candidate.text, data.value, data.confidence);
        break;
      case "strategy_preference":
        if (candidate.strategy === data.value) {
          score += 0.05 * data.confidence;
        }
        break;
    }
  }

  return score;
}

function scoreLengthPreference(text: string, preferred: string, confidence: number): number {
  const wordCount = text.split(/\s+/).length;
  let match = false;

  switch (preferred) {
    case "short":
      match = wordCount <= 8;
      break;
    case "medium":
      match = wordCount > 5 && wordCount <= 20;
      break;
    case "long":
      match = wordCount > 15;
      break;
  }

  return match ? 0.03 * confidence : -0.01 * confidence;
}

function scoreEmojiPreference(text: string, preferred: string, confidence: number): number {
  const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);

  switch (preferred) {
    case "none":
      return !hasEmojis ? 0.02 * confidence : -0.02 * confidence;
    case "minimal":
    case "moderate":
    case "heavy":
      return hasEmojis ? 0.02 * confidence : -0.01 * confidence;
    default:
      return 0;
  }
}

function scoreFormalityPreference(strategy: string, preferred: string, confidence: number): number {
  const formalStrategies = ["professional", "diplomatic", "formal"];
  const casualStrategies = ["natural", "playful", "funny", "flirty", "friendly"];

  const isFormal = formalStrategies.includes(strategy);
  const isCasual = casualStrategies.includes(strategy);

  if (preferred === "formal" || preferred === "very_formal") {
    return isFormal ? 0.04 * confidence : isCasual ? -0.02 * confidence : 0;
  }
  if (preferred === "casual" || preferred === "very_casual") {
    return isCasual ? 0.04 * confidence : isFormal ? -0.02 * confidence : 0;
  }

  return 0;
}

function scoreTonePreference(strategy: string, preferred: string, confidence: number): number {
  const warmStrategies = ["warm", "empathetic", "supportive", "friendly"];
  const directStrategies = ["clear_direct", "assertive", "concise"];
  const playfulStrategies = ["playful", "funny", "flirty", "charming"];

  const isWarm = warmStrategies.includes(strategy);
  const isDirect = directStrategies.includes(strategy);
  const isPlayful = playfulStrategies.includes(strategy);

  if (preferred === "warm") return isWarm ? 0.03 * confidence : 0;
  if (preferred === "direct") return isDirect ? 0.03 * confidence : 0;
  if (preferred === "playful") return isPlayful ? 0.03 * confidence : 0;

  return 0;
}

function scorePunctuationPreference(text: string, preferred: string, confidence: number): number {
  const exclamationCount = (text.match(/!/g) || []).length;
  const hasEllipses = /\.{3,}/.test(text);

  switch (preferred) {
    case "minimal":
      return exclamationCount === 0 && !hasEllipses ? 0.02 * confidence : -0.01 * confidence;
    case "standard":
      return exclamationCount <= 1 ? 0.01 * confidence : 0;
    case "expressive":
      return exclamationCount > 0 ? 0.02 * confidence : -0.01 * confidence;
    default:
      return 0;
  }
}

function scoreSlangPreference(text: string, preferred: string, confidence: number): number {
  const hasSlang = /\b(lol|bruh|fam|ngl|tbh|istg|dead|slay|bussin|no_cap|lmao)\b/i.test(text);

  switch (preferred) {
    case "none":
      return !hasSlang ? 0.02 * confidence : -0.02 * confidence;
    case "minimal":
    case "moderate":
    case "heavy":
      return hasSlang ? 0.02 * confidence : -0.01 * confidence;
    default:
      return 0;
  }
}
