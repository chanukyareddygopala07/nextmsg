// ─── Personalization Types ──────────────────────────────────────────────────────
//
// Defines the feedback and personalization system for NextMsg.
//
// Core principle: Learn communication preferences from actual user signals.
// Do NOT infer sensitive traits, create psychological profiles, or make
// unsupported assumptions.
//
// Two types of signals:
// 1. Explicit feedback — user tells what they liked/disliked (STRONG)
// 2. Implicit feedback — actions: selected, copied, edited, regenerated (WEAK)
//
// Safety outranks personalization — rejected candidates do NOT influence learning.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Preference Dimensions ─────────────────────────────────────────────────────

/** All preference dimensions that can be learned */
export type PreferenceDimension =
  | "length"           // short, medium, long
  | "emoji"            // none, minimal, moderate, heavy
  | "formality"        // very_casual, casual, neutral, formal, very_formal
  | "tone"             // warm, neutral, direct, playful
  | "punctuation"      // minimal, standard, expressive
  | "slang"            // none, minimal, moderate, heavy
  | "question_style"   // direct, indirect, exploratory
  | "humor"            // none, subtle, moderate, heavy
  | "emotional_expression"  // restrained, moderate, open
  | "improvement_mode"      // shorter, clearer, warmer, more_formal, more_casual
  | "default_tone"          // A default tone preference for transformations
  | "strategy_preference";  // Preferred communication strategies

/** Possible values for each dimension */
export const DIMENSION_VALUES: Record<PreferenceDimension, readonly string[]> = {
  length: ["short", "medium", "long"],
  emoji: ["none", "minimal", "moderate", "heavy"],
  formality: ["very_casual", "casual", "neutral", "formal", "very_formal"],
  tone: ["warm", "neutral", "direct", "playful"],
  punctuation: ["minimal", "standard", "expressive"],
  slang: ["none", "minimal", "moderate", "heavy"],
  question_style: ["direct", "indirect", "exploratory"],
  humor: ["none", "subtle", "moderate", "heavy"],
  emotional_expression: ["restrained", "moderate", "open"],
  improvement_mode: ["shorter", "clearer", "warmer", "more_formal", "more_casual"],
  default_tone: ["warm", "neutral", "direct", "playful", "formal", "casual"],
  strategy_preference: ["natural", "professional", "concise", "empathetic", "playful", "flirty"],
} as const;

// ─── Feedback Signals ──────────────────────────────────────────────────────────

/** Types of feedback signals */
export type FeedbackSignal =
  | "thumbs_up"      // User liked a reply
  | "thumbs_down"    // User disliked a reply
  | "copy"           // User copied a reply to clipboard
  | "select"         // User selected a reply
  | "edit"           // User edited a reply before sending
  | "regenerate"     // User asked for different options (implicit negative)
  | "discard";       // User discarded a reply

/** Signal weight — explicit signals are stronger than implicit */
export const SIGNAL_WEIGHTS: Record<FeedbackSignal, number> = {
  thumbs_up: 1.0,       // Explicit positive — strongest
  thumbs_down: 1.0,     // Explicit negative — strongest
  copy: 0.3,            // Implicit positive
  select: 0.5,          // Implicit positive (selected but not yet sent)
  edit: 0.2,            // Implicit negative (needed modification)
  regenerate: 0.4,      // Implicit negative (wanted different options)
  discard: 0.3,         // Implicit negative
};

/** Direction of signal for preference learning */
export const SIGNAL_DIRECTION: Record<FeedbackSignal, "positive" | "negative" | "neutral"> = {
  thumbs_up: "positive",
  thumbs_down: "negative",
  copy: "positive",
  select: "positive",
  edit: "negative",
  regenerate: "negative",
  discard: "negative",
};

// ─── Preference Profile ────────────────────────────────────────────────────────

/** A single learned preference */
export interface LearnedPreference {
  dimension: PreferenceDimension;
  value: string;
  confidence: number;      // 0.0-1.0
  source: "explicit" | "implicit";
  context?: string;        // Optional context scope
  signalCount: number;
  lastSignalAt: Date;
}

/** Complete user preference profile */
export interface PreferenceProfile {
  userId: string;
  preferences: LearnedPreference[];
  settings: PersonalizationSettings;
  lastUpdated: Date;
}

/** User's personalization settings */
export interface PersonalizationSettings {
  enabled: boolean;         // Master toggle
  learningEnabled: boolean; // Whether to learn from feedback
}

// ─── Resolved Preferences ──────────────────────────────────────────────────────

/** Effective preferences after applying precedence rules */
export interface ResolvedPreferences {
  /** Final preferences after all precedence rules */
  preferences: Record<PreferenceDimension, string>;
  /** Confidence for each dimension */
  confidence: Record<PreferenceDimension, number>;
  /** Source of each preference */
  sources: Record<PreferenceDimension, "explicit" | "learned" | "default">;
  /** Which context was used */
  context?: string;
}

// ─── Compact Profile for Prompts ───────────────────────────────────────────────

/** Compact representation of user preferences for inclusion in AI prompts */
export interface CompactPreferenceProfile {
  /** Only include dimensions with confidence > threshold */
  dimensions: Partial<Record<PreferenceDimension, { value: string; confidence: number }>>;
  /** Context scope if any */
  context?: string;
}

// ─── Feedback Event Input ──────────────────────────────────────────────────────

/** Input for recording a feedback event */
export interface FeedbackEventInput {
  signal: FeedbackSignal;
  replyId?: string;
  strategy?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

// ─── Learning Result ───────────────────────────────────────────────────────────

/** Result of processing a feedback event */
export interface LearningResult {
  /** Whether any preferences were updated */
  updated: boolean;
  /** Dimensions that were modified */
  modifiedDimensions: PreferenceDimension[];
  /** New confidence values */
  confidenceChanges: Partial<Record<PreferenceDimension, number>>;
}

// ─── Safety Types ──────────────────────────────────────────────────────────────

/** Reasons a feedback event should NOT influence learning */
export type SafetyBlockReason =
  | "quality_rejected"      // Candidate failed QualityValidator
  | "preservation_rejected" // Candidate failed SemanticPreservation
  | "safety_rejected"       // Candidate failed SafetyCheck
  | "deception_detected"    // Candidate had deception patterns
  | "coercion_detected"     // Candidate had coercion patterns
  | "low_confidence";       // Confidence too low to learn from

/** Context for safety evaluation during learning */
export interface LearningSafetyContext {
  /** Whether the candidate passed quality validation */
  passedQuality: boolean;
  /** Whether the candidate passed semantic preservation */
  passedPreservation: boolean;
  /** Whether the candidate passed safety checks */
  passedSafety: boolean;
  /** Whether deception was detected */
  deceptionDetected: boolean;
  /** Whether coercion was detected */
  coercionDetected: boolean;
}

// ─── Decay Configuration ───────────────────────────────────────────────────────

/** Decay rates for different signal types */
export const DECAY_RATES = {
  explicit: {
    halfLifeDays: 90,     // Explicit preferences decay slowly
    minConfidence: 0.1,   // Never fully decay
  },
  implicit: {
    halfLifeDays: 30,     // Implicit preferences decay faster
    minConfidence: 0.05,  // Can decay to near zero
  },
} as const;

// ─── Precedence ────────────────────────────────────────────────────────────────

/**
 * Preference precedence order (highest to lowest):
 * 1. Current user instruction (in-session override)
 * 2. Current context (conversation-specific)
 * 3. Safety/factual/semantic constraints
 * 4. Explicit saved preferences
 * 5. Strong learned preferences (confidence > 0.7)
 * 6. Weak learned preferences (confidence 0.3-0.7)
 * 7. System defaults
 */
export const PREFERENCE_PRECEDENCE = {
  CURRENT_INSTRUCTION: 100,
  CURRENT_CONTEXT: 90,
  SAFETY_CONSTRAINT: 80,
  EXPLICIT_SAVED: 70,
  STRONG_LEARNED: 60,
  WEAK_LEARNED: 40,
  SYSTEM_DEFAULT: 20,
} as const;

// ─── System Defaults ───────────────────────────────────────────────────────────

/** System default preferences (used when no user preference is known) */
export const SYSTEM_DEFAULTS: Record<PreferenceDimension, string> = {
  length: "medium",
  emoji: "minimal",
  formality: "casual",
  tone: "neutral",
  punctuation: "standard",
  slang: "none",
  question_style: "direct",
  humor: "subtle",
  emotional_expression: "moderate",
  improvement_mode: "clearer",
  default_tone: "neutral",
  strategy_preference: "natural",
} as const;
