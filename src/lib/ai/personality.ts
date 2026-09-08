// ─── Personality & Style Types ────────────────────────────────────────────────
//
// Captures how a user naturally writes, so generated responses sound like them.
// Extracted deterministically from the user's messages in the conversation.
// ──────────────────────────────────────────────────────────────────────────────

export type FormalityLevel = "very_casual" | "casual" | "neutral" | "formal" | "very_formal";
export type EmojiPlacement = "none" | "end" | "inline" | "mixed";
export type PunctuationStyle = "minimal" | "standard" | "expressive";
export type CapitalizationStyle = "all_lower" | "standard" | "all_upper" | "sentence_case";

export interface EmojiProfile {
  /** Whether the user uses emojis at all */
  usesEmojis: boolean;
  /** Proportion of messages that contain emojis (0.0–1.0) */
  frequency: number;
  /** Where emojis typically appear */
  placement: EmojiPlacement;
  /** Common emojis used (top 5) */
  commonEmojis: string[];
  /** Emoji style categories */
  categories: string[];
}

export interface PunctuationProfile {
  /** Punctuation style classification */
  style: PunctuationStyle;
  /** Frequency of exclamation marks (0.0–1.0) */
  exclamationRate: number;
  /** Frequency of question marks (0.0–1.0) */
  questionRate: number;
  /** Whether user uses ellipses frequently */
  usesEllipses: boolean;
  /** Whether user ends messages with periods */
  endsWithPeriod: boolean;
  /** Frequency of multiple punctuation (!!!, ???) */
  multiPunctuationRate: number;
}

export interface SentenceProfile {
  /** Average words per message */
  averageWords: number;
  /** Average characters per message */
  averageChars: number;
  /** Proportion of complete sentences (0.0–1.0) */
  completenessRate: number;
  /** Whether messages tend to be fragments */
  prefersFragments: boolean;
  /** Typical message length category */
  lengthCategory: "very_short" | "short" | "medium" | "long";
}

export interface SlangProfile {
  /** Whether user uses informal language */
  usesSlang: boolean;
  /** Slang frequency (0.0–1.0) */
  frequency: number;
  /** Common slang words/phrases */
  commonSlang: string[];
  /** Common abbreviations */
  commonAbbreviations: string[];
  /** Code-switching tendency (0.0–1.0) */
  codeSwitchTendency: number;
}

export interface HumorProfile {
  /** Whether humor is detected */
  usesHumor: boolean;
  /** Humor indicators found */
  indicators: string[];
  /** Humor style */
  style: "none" | "witty" | "playful" | "sarcastic" | "self_deprecating" | "absurdist";
}

export interface TonePreference {
  /** Dominant tone in user messages */
  dominant: string;
  /** Secondary tone */
  secondary: string;
  /** Formality level */
  formality: FormalityLevel;
  /** Warmth level (0.0–1.0) */
  warmth: number;
  /** Directness level (0.0–1.0) */
  directness: number;
}

export interface WritingStyleProfile {
  // ── Emoji ──
  emoji: EmojiProfile;

  // ── Punctuation ──
  punctuation: PunctuationProfile;

  // ── Sentence structure ──
  sentence: SentenceProfile;

  // ── Slang / informal ──
  slang: SlangProfile;

  // ── Humor ──
  humor: HumorProfile;

  // ── Tone preference ──
  tonePreference: TonePreference;

  // ── Metadata ──
  confidence: number;
  messageCount: number;
  languageStyle: string;
}

export interface StyleGuidance {
  /** One-line style instruction for the generator */
  instruction: string;
  /** Example phrases that match this style */
  examples: string[];
  /** Things to avoid for this style */
  avoid: string[];
  /** Style confidence */
  confidence: number;
}
