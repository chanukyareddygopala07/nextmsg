import type { ConversationAnalysis } from "@/types/conversation";
import { scoreAILikeness } from "./humanizer";

interface RankedCandidate {
  text: string;
  strategy: string;
  score: number;
}

export function rankReplies(
  candidates: { text: string; strategy: string }[],
  analysis: ConversationAnalysis,
  goal?: string
): RankedCandidate[] {
  const scored = candidates.map((c) => {
    let score = 0.5;

    score += analyzeLengthScore(c.text, analysis);
    score += analyzeGoalScore(c.text, goal);
    score += analyzeEngagementScore(c.text, analysis);
    score += analyzeStyleScore(c.text);
    score -= scoreAILikeness(c.text);

    return {
      ...c,
      score: Math.max(0, Math.min(1, score)),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function analyzeLengthScore(text: string, analysis: ConversationAnalysis): number {
  const wordCount = text.split(/\s+/).length;

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

function analyzeGoalScore(text: string, goal?: string): number {
  if (!goal) return 0;

  const lowerText = text.toLowerCase();

  switch (goal) {
    case "make_them_laugh":
      return /\b(haha|lol|lmao|😂|🤣|joke|funny)\b/i.test(lowerText) ? 0.15 : -0.05;
    case "flirt_naturally":
      return /\b(eyes|cute|love|admire| attraction| heart)\b/i.test(lowerText) ? 0.1 : -0.05;
    case "ask_them_out":
      return /\b(coffee|drink|dinner|hangout|meet|date|tonight|tomorrow)\b/i.test(lowerText) ? 0.15 : -0.05;
    case "show_interest":
      return /\?$/.test(text.trim()) ? 0.1 : 0;
    case "recover_dry":
      return text.length < 20 ? 0.1 : -0.05;
    case "change_topic":
      return text.length < 30 ? 0.1 : -0.05;
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
