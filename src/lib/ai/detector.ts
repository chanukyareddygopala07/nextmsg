import type { ConversationContext, CommunicationContext, UrgencyLevel } from "./context";
import { detectLanguageState, isShortAmbiguous } from "./language-detect";
import type { LanguageState } from "./language";

const EMOJI_PATTERN = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

const CASUAL_INDICATORS = /\b(haha|lol|lmao|omg|bruh|tbh|ngl|imo|smh|fwiw|af|lowkey|highkey|vibe|slay|bet|cap|no cap|fr|frfr|istg|pov)\b/i;

const FORMAL_INDICATORS = /\b(dear|sincerely|regards|respectfully|pursuant|therefore|furthermore|consequently|kindly|appreciate|understand|assist)\b/i;

const FLIRTY_INDICATORS = /\b(cute|adorable|beautiful|handsome|gorgeous|attractive|date|kiss|love|heart|crush|attraction|date|meet|dinner|wine|coffee)\b|👀|💋|🔥|❤️|💕/i;

const PROFESSIONAL_INDICATORS = /\b(meeting|deadline|project|report|proposal|client|team|schedule|review|presentation|quarter|budget|stakeholder)\b/i;

const ACADEMIC_INDICATORS = /\b(professor|assignment|exam|lecture|thesis|research|gpa|semester|homework|class|study|syllabus|grade)\b/i;

export function detectLanguage(messages: { sender: string; text: string }[]): string {
  const state = detectLanguageState(messages);
  if (state.codeMixed) return "code-mixed";
  if (state.romanized) return "romanized-indic";
  if (state.primary === "english") return "english";
  if (state.primary === "unknown") return "unknown";
  return state.primary;
}

export function detectScript(
  messages: { sender: string; text: string }[]
): "romanized" | "native" | "english" | "mixed" {
  const state = detectLanguageState(messages);
  const scriptMap: Record<string, "romanized" | "native" | "english" | "mixed"> = {
    latin: "english",
    mixed: "mixed",
    devanagari: "native",
    telugu: "native",
    tamil: "native",
    kannada: "native",
    malayalam: "native",
    bengali: "native",
    gujarati: "native",
    gurmukhi: "native",
    odia: "native",
    arabic: "native",
  };
  return scriptMap[state.script] || "english";
}

export function detectTone(messages: { sender: string; text: string }[]): string {
  const allText = messages.map((m) => m.text).join(" ");

  const emojis = allText.match(EMOJI_PATTERN) || [];
  const casual = CASUAL_INDICATORS.test(allText);
  const formal = FORMAL_INDICATORS.test(allText);

  if (emojis.length > 3 && casual) return "playful";
  if (formal) return "professional";
  if (casual) return "casual";

  const hasQuestions = /\?/.test(allText);
  const hasExclamation = /!/.test(allText);

  if (hasExclamation && !hasQuestions) return "excited";
  if (hasQuestions) return "curious";

  return "neutral";
}

export function detectConversationType(
  messages: { sender: string; text: string }[]
): CommunicationContext {
  const allText = messages.map((m) => m.text).join(" ");

  if (PROFESSIONAL_INDICATORS.test(allText)) return "professional";
  if (ACADEMIC_INDICATORS.test(allText)) return "academic";
  if (FLIRTY_INDICATORS.test(allText)) return "dating";

  const avgLength =
    messages.reduce((sum, m) => sum + m.text.length, 0) / messages.length;
  if (avgLength > 80) return "professional";

  return "general";
}

export function detectUrgency(messages: { sender: string; text: string }[]): UrgencyLevel {
  const allText = messages.map((m) => m.text).join(" ");
  const urgentPatterns = /\b(urgent|asap|immediately|right now|emergency|help|quick|hurry)\b/i;
  const highPatterns = /\b(soon|today|tonight|deadline|late|behind)\b/i;

  if (urgentPatterns.test(allText)) return "urgent";
  if (highPatterns.test(allText)) return "high";
  return "normal";
}

export function detectUserStyle(
  messages: { sender: string; text: string }[]
): string {
  const userMessages = messages.filter((m) => m.sender === "me");
  if (userMessages.length === 0) return "casual";

  const allText = userMessages.map((m) => m.text).join(" ");
  const avgLength =
    userMessages.reduce((sum, m) => sum + m.text.length, 0) / userMessages.length;

  const emojiCount = (allText.match(EMOJI_PATTERN) || []).length;
  const hasCasual = CASUAL_INDICATORS.test(allText);

  if (emojiCount > 5 && hasCasual) return "playful-emoji-heavy";
  if (avgLength < 20 && hasCasual) return "short-casual";
  if (avgLength < 20) return "terse";
  if (avgLength > 60) return "verbose";
  if (hasCasual) return "casual";
  return "balanced";
}

export function buildContext(
  messages: { sender: string; text: string }[],
  goal?: string,
  platform?: string
): ConversationContext {
  const language = detectLanguage(messages);
  const script = detectScript(messages);
  const tone = detectTone(messages);
  const conversationType = detectConversationType(messages);
  const urgency = detectUrgency(messages);
  const userStyle = detectUserStyle(messages);

  return {
    language,
    script,
    conversationType,
    participants: 2,
    goal: goal || "keep_going",
    tone,
    urgency,
    userStyle,
    platform,
    outputLanguage: "auto",
  };
}

// ─── Extended Language Detection ──────────────────────────────────────────────
// Returns full LanguageState for use by the state resolver.

export function buildLanguageState(
  messages: { sender: string; text: string }[],
  explicitLanguage?: string,
  outputPreference?: string
): LanguageState {
  return detectLanguageState(messages, explicitLanguage, outputPreference);
}

export function isShortMessage(text: string): boolean {
  return isShortAmbiguous(text);
}
