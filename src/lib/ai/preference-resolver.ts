// ─── Preference Resolver ────────────────────────────────────────────────────────
//
// Resolves effective preferences by applying the precedence order:
// 1. Current user instruction (in-session override)
// 2. Current context (conversation-specific)
// 3. Safety/factual/semantic constraints
// 4. Explicit saved preferences
// 5. Strong learned preferences (confidence > 0.7)
// 6. Weak learned preferences (confidence 0.3-0.7)
// 7. System defaults
//
// Personalization changes preference, NOT truth.
// Safety outranks personalization.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  PreferenceDimension,
  ResolvedPreferences,
  LearnedPreference,
  CompactPreferenceProfile,
} from "./personalization-types";
import { SYSTEM_DEFAULTS, DIMENSION_VALUES } from "./personalization-types";

/** Threshold for "strong" learned preferences */
const STRONG_CONFIDENCE_THRESHOLD = 0.7;

/** Threshold for "weak" learned preferences */
const WEAK_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Resolve effective preferences by applying precedence rules.
 *
 * @param learnedPreferences - User's learned preferences from the database
 * @param contextOverrides - Current context overrides (from conversation context)
 * @param sessionOverrides - In-session user instructions
 * @param safetyConstraints - Safety constraints that must not be violated
 * @param context - Current conversation context type
 */
export function resolveEffectivePreferences(
  learnedPreferences: LearnedPreference[],
  contextOverrides: Partial<Record<PreferenceDimension, string>> = {},
  sessionOverrides: Partial<Record<PreferenceDimension, string>> = {},
  safetyConstraints: Partial<Record<PreferenceDimension, string>> = {},
  context?: string
): ResolvedPreferences {
  const resolved = {} as Record<PreferenceDimension, string>;
  const confidence = {} as Record<PreferenceDimension, number>;
  const sources = {} as Record<PreferenceDimension, "explicit" | "learned" | "default">;

  // Get all preference dimensions
  const dimensions = Object.keys(SYSTEM_DEFAULTS) as PreferenceDimension[];

  for (const dim of dimensions) {
    let value: string | undefined;
    let conf = 0;
    let source: "explicit" | "learned" | "default" = "default";

    // Layer 1: Session overrides (highest priority)
    if (sessionOverrides[dim]) {
      value = sessionOverrides[dim];
      conf = 1.0;
      source = "explicit";
    }

    // Layer 2: Context overrides
    if (!value && contextOverrides[dim]) {
      value = contextOverrides[dim];
      conf = 0.9;
      source = "explicit";
    }

    // Layer 3: Safety constraints (prevent bad values or set floor)
    if (safetyConstraints[dim]) {
      const safeValue = safetyConstraints[dim];
      if (value && !isValueSafe(dim, value, safeValue)) {
        // Current value violates safety — override
        value = safeValue;
        conf = 1.0;
        source = "explicit";
      } else if (!value) {
        // No value yet — safety constraint becomes the floor
        value = safeValue;
        conf = 0.9;
        source = "explicit";
      }
    }

    // Layer 4-6: Learned preferences
    if (!value) {
      const matchingPrefs = learnedPreferences.filter(
        (p) => p.dimension === dim && (!context || !p.context || p.context === context)
      );

      // Sort by confidence descending
      matchingPrefs.sort((a, b) => b.confidence - a.confidence);

      // Layer 4: Explicit saved preferences
      const explicitPref = matchingPrefs.find(
        (p) => p.source === "explicit" && p.confidence >= WEAK_CONFIDENCE_THRESHOLD
      );
      if (explicitPref) {
        value = explicitPref.value;
        conf = explicitPref.confidence;
        source = "explicit";
      }

      // Layer 5: Strong learned preferences
      if (!value) {
        const strongPref = matchingPrefs.find(
          (p) => p.confidence >= STRONG_CONFIDENCE_THRESHOLD
        );
        if (strongPref) {
          value = strongPref.value;
          conf = strongPref.confidence;
          source = "learned";
        }
      }

      // Layer 6: Weak learned preferences
      if (!value) {
        const weakPref = matchingPrefs.find(
          (p) => p.confidence >= WEAK_CONFIDENCE_THRESHOLD
        );
        if (weakPref) {
          value = weakPref.value;
          conf = weakPref.confidence;
          source = "learned";
        }
      }
    }

    // Layer 7: System defaults
    if (!value) {
      value = SYSTEM_DEFAULTS[dim];
      conf = 0;
      source = "default";
    }

    resolved[dim] = value;
    confidence[dim] = conf;
    sources[dim] = source;
  }

  return {
    preferences: resolved,
    confidence,
    sources,
    context,
  };
}

/**
 * Build a compact profile for AI prompts from resolved preferences.
 */
export function buildPromptProfile(
  resolved: ResolvedPreferences,
  minConfidence: number = 0.3
): CompactPreferenceProfile {
  const dimensions: CompactPreferenceProfile["dimensions"] = {};

  for (const [dim, value] of Object.entries(resolved.preferences)) {
    const d = dim as PreferenceDimension;
    const conf = resolved.confidence[d];

    // Only include dimensions with meaningful confidence
    if (conf >= minConfidence) {
      dimensions[d] = { value, confidence: conf };
    }
  }

  return {
    dimensions,
    context: resolved.context,
  };
}

/**
 * Format compact profile as a human-readable string for prompts.
 */
export function formatProfileForPrompt(profile: CompactPreferenceProfile): string {
  const lines: string[] = [];

  if (Object.keys(profile.dimensions).length === 0) {
    return "";
  }

  if (profile.context) {
    lines.push(`Context: ${profile.context}`);
  }

  for (const [dim, data] of Object.entries(profile.dimensions)) {
    if (!data) continue;
    const label = dim.replace(/_/g, " ");
    lines.push(`- ${label}: ${data.value} (confidence: ${Math.round(data.confidence * 100)}%)`);
  }

  return lines.join("\n");
}

/**
 * Get default preferences for a dimension (system defaults).
 */
export function getDefaultPreference(dimension: PreferenceDimension): string {
  return SYSTEM_DEFAULTS[dimension];
}

/**
 * Validate that a preference value is valid for its dimension.
 */
export function isValidPreferenceValue(
  dimension: PreferenceDimension,
  value: string
): boolean {
  const validValues = DIMENSION_VALUES[dimension];
  if (!validValues) return false;
  return (validValues as readonly string[]).includes(value);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Check if a value is safe (won't violate safety constraints).
 */
function isValueSafe(
  dimension: PreferenceDimension,
  value: string,
  safeValue: string
): boolean {
  // If there's a safety constraint, the value must match it
  // This is a simplified check — in production, this would be more nuanced
  return value === safeValue;
}
