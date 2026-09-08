// ─── Personalization Engine ─────────────────────────────────────────────────────
//
// Core engine for learning and applying communication preferences.
//
// Invariant: Personalization changes preference, NOT truth.
// Safety outranks personalization — rejected candidates do NOT influence learning.
//
// Signal flow:
// 1. User gives feedback (explicit or implicit)
// 2. Safety check: was the candidate valid?
// 3. Extract preference dimensions from the reply
// 4. Update confidence based on signal strength and direction
// 5. Apply decay for old signals
// ──────────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import type {
  PreferenceDimension,
  FeedbackSignal,
  FeedbackEventInput,
  LearnedPreference,
  PreferenceProfile,
  PersonalizationSettings as PersonalizationSettingsType,
  CompactPreferenceProfile,
  LearningResult,
  LearningSafetyContext,
} from "./personalization-types";
import {
  SIGNAL_WEIGHTS,
  SIGNAL_DIRECTION,
  DECAY_RATES,
  SYSTEM_DEFAULTS,
  DIMENSION_VALUES,
} from "./personalization-types";

// ─── Signal Processing ─────────────────────────────────────────────────────────

/**
 * Infer preference dimensions from a reply's text and strategy.
 * Returns a map of dimension -> suggested value based on the reply content.
 */
export function inferDimensionsFromReply(
  text: string,
  strategy: string
): Partial<Record<PreferenceDimension, string>> {
  const dimensions: Partial<Record<PreferenceDimension, string>> = {};
  const wordCount = text.split(/\s+/).length;
  const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const hasEllipses = /\.{3,}/.test(text);
  const hasSlang = /\b(lol|bruh|fam|ngl|tbh|istg|dead|slay|bussin|no_cap|lmao)\b/i.test(text);

  // Length
  if (wordCount <= 5) dimensions.length = "short";
  else if (wordCount <= 15) dimensions.length = "medium";
  else dimensions.length = "long";

  // Emoji
  if (!hasEmojis) dimensions.emoji = "none";
  else if (exclamationCount <= 1 && hasEmojis) dimensions.emoji = "minimal";
  else dimensions.emoji = "moderate";

  // Formality (from strategy)
  if (strategy === "professional" || strategy === "diplomatic") {
    dimensions.formality = "formal";
  } else if (strategy === "playful" || strategy === "funny" || strategy === "flirty") {
    dimensions.formality = "casual";
  } else if (strategy === "natural" || strategy === "friendly") {
    dimensions.formality = "casual";
  }

  // Tone (from strategy)
  if (strategy === "warm" || strategy === "empathetic" || strategy === "supportive") {
    dimensions.tone = "warm";
  } else if (strategy === "clear_direct" || strategy === "assertive") {
    dimensions.tone = "direct";
  } else if (strategy === "playful" || strategy === "flirty") {
    dimensions.tone = "playful";
  } else {
    dimensions.tone = "neutral";
  }

  // Punctuation
  if (exclamationCount === 0 && !hasEllipses) {
    dimensions.punctuation = "minimal";
  } else if (exclamationCount <= 1) {
    dimensions.punctuation = "standard";
  } else {
    dimensions.punctuation = "expressive";
  }

  // Slang
  if (hasSlang) dimensions.slang = "moderate";
  else dimensions.slang = "none";

  // Question style
  if (questionCount > 1) dimensions.question_style = "exploratory";
  else if (questionCount === 1) dimensions.question_style = "direct";
  else dimensions.question_style = "direct";

  // Strategy preference
  if (strategy && strategy in (SYSTEM_DEFAULTS.strategy_preference ? { [SYSTEM_DEFAULTS.strategy_preference]: true } : {})) {
    dimensions.strategy_preference = strategy;
  }

  return dimensions;
}

/**
 * Check if a feedback event should be blocked from learning.
 * Returns null if safe, or a reason if blocked.
 */
export function checkLearningSafety(
  context: LearningSafetyContext
): "quality_rejected" | "preservation_rejected" | "safety_rejected" | "deception_detected" | "coercion_detected" | null {
  if (!context.passedQuality) return "quality_rejected";
  if (!context.passedPreservation) return "preservation_rejected";
  if (!context.passedSafety) return "safety_rejected";
  if (context.deceptionDetected) return "deception_detected";
  if (context.coercionDetected) return "coercion_detected";
  return null;
}

/**
 * Calculate confidence update based on signal weight and direction.
 */
export function calculateConfidenceUpdate(
  currentConfidence: number,
  signalWeight: number,
  direction: "positive" | "negative" | "neutral",
  signalCount: number
): number {
  // Learning rate decreases as we get more signals (diminishing returns)
  const learningRate = Math.min(0.3, 1 / (1 + signalCount * 0.1));

  // Apply signal weight
  const effectiveWeight = signalWeight * learningRate;

  let newConfidence: number;
  if (direction === "positive") {
    // Positive signals increase confidence
    newConfidence = currentConfidence + (1 - currentConfidence) * effectiveWeight;
  } else if (direction === "negative") {
    // Negative signals decrease confidence
    newConfidence = currentConfidence - currentConfidence * effectiveWeight;
  } else {
    // Neutral signals don't change confidence
    newConfidence = currentConfidence;
  }

  return Math.max(0, Math.min(1, newConfidence));
}

/**
 * Apply time-based decay to a preference's confidence.
 */
export function applyDecay(
  confidence: number,
  source: "explicit" | "implicit",
  lastSignalAt: Date,
  now: Date = new Date()
): number {
  const config = source === "explicit" ? DECAY_RATES.explicit : DECAY_RATES.implicit;
  const halfLifeMs = config.halfLifeDays * 24 * 60 * 60 * 1000;

  const elapsed = now.getTime() - lastSignalAt.getTime();
  const decayFactor = Math.pow(0.5, elapsed / halfLifeMs);

  return Math.max(config.minConfidence, confidence * decayFactor);
}

// ─── Database Operations ───────────────────────────────────────────────────────

/**
 * Record a feedback event and update preferences.
 */
export async function recordFeedback(
  userId: string,
  input: FeedbackEventInput,
  safetyContext?: LearningSafetyContext
): Promise<LearningResult> {
  // 1. Record the event
  const event = await db.feedbackEvent.create({
    data: {
      userId,
      replyId: input.replyId || null,
      signal: input.signal,
      context: input.context || null,
      strategy: input.strategy || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });

  // 2. Check if we should learn from this
  const settings = await getPersonalizationSettings(userId);
  if (!settings.enabled || !settings.learningEnabled) {
    return { updated: false, modifiedDimensions: [], confidenceChanges: {} };
  }

  // 3. Safety check
  if (safetyContext) {
    const blockReason = checkLearningSafety(safetyContext);
    if (blockReason) {
      return { updated: false, modifiedDimensions: [], confidenceChanges: {} };
    }
  }

  // 4. Get signal weight and direction
  const weight = SIGNAL_WEIGHTS[input.signal];
  const direction = SIGNAL_DIRECTION[input.signal];

  // 5. Load existing preferences
  const existingPrefs = await db.communicationPreference.findMany({
    where: { userId },
  });

  const prefMap = new Map<string, LearnedPreference>();
  for (const pref of existingPrefs) {
    const key = pref.context ? `${pref.dimension}:${pref.context}` : pref.dimension;
    prefMap.set(key, {
      dimension: pref.dimension as PreferenceDimension,
      value: pref.value,
      confidence: pref.confidence,
      source: pref.source as "explicit" | "implicit",
      context: pref.context || undefined,
      signalCount: pref.signalCount,
      lastSignalAt: pref.lastSignalAt,
    });
  }

  // 6. Infer dimensions from reply (if strategy provided)
  const inferredDimensions = input.strategy
    ? inferDimensionsFromReply("", input.strategy)
    : {};

  // 7. For thumbs_up, infer from the reply. For thumbs_down, invert.
  const dimensionsToUpdate: Partial<Record<PreferenceDimension, string>> = {};

  if (input.signal === "thumbs_up" && input.strategy) {
    // Positive: the reply's characteristics are what user likes
    Object.assign(dimensionsToUpdate, inferredDimensions);
  } else if (input.signal === "thumbs_down" && input.strategy) {
    // Negative: invert the reply's characteristics
    for (const [dim, value] of Object.entries(inferredDimensions)) {
      const d = dim as PreferenceDimension;
      const inverted = invertDimensionValue(d, value);
      if (inverted) dimensionsToUpdate[d] = inverted;
    }
  }
  // For other signals (copy, select, edit, regenerate, discard),
  // we use the strategy as a proxy but don't change the value,
  // only update confidence

  // 8. Update or create preferences (batched via transaction)
  const modifiedDimensions: PreferenceDimension[] = [];
  const confidenceChanges: Partial<Record<PreferenceDimension, number>> = {};

  // Build all upsert operations
  const upsertOperations: Array<{
    dimension: PreferenceDimension;
    value: string;
    confidence: number;
  }> = [];

  for (const [dim, value] of Object.entries(dimensionsToUpdate)) {
    const d = dim as PreferenceDimension;
    const key = input.context ? `${d}:${input.context}` : d;

    const existing = prefMap.get(key);
    const currentConfidence = existing?.confidence || 0;
    const currentCount = existing?.signalCount || 0;

    const newConfidence = calculateConfidenceUpdate(
      currentConfidence,
      weight,
      direction,
      currentCount
    );

    // Only update if confidence changed meaningfully
    if (Math.abs(newConfidence - currentConfidence) > 0.01) {
      upsertOperations.push({ dimension: d, value, confidence: newConfidence });
    }
  }

  // Execute all upserts in a single transaction
  if (upsertOperations.length > 0) {
    const now = new Date();
    await db.$transaction(
      upsertOperations.map((op) =>
        db.communicationPreference.upsert({
          where: {
            userId_dimension_context: {
              userId,
              dimension: op.dimension,
              context: input.context || "",
            },
          },
          create: {
            userId,
            dimension: op.dimension,
            value: op.value,
            confidence: op.confidence,
            source: input.signal === "thumbs_up" || input.signal === "thumbs_down"
              ? "explicit"
              : "implicit",
            context: input.context || null,
            signalCount: (prefMap.get(input.context ? `${op.dimension}:${input.context}` : op.dimension)?.signalCount || 0) + 1,
            lastSignalAt: now,
          },
          update: {
            value: op.value,
            confidence: op.confidence,
            signalCount: (prefMap.get(input.context ? `${op.dimension}:${input.context}` : op.dimension)?.signalCount || 0) + 1,
            lastSignalAt: now,
          },
        })
      )
    );

    for (const op of upsertOperations) {
      modifiedDimensions.push(op.dimension);
      confidenceChanges[op.dimension] = op.confidence;
    }
  }

  return {
    updated: modifiedDimensions.length > 0,
    modifiedDimensions,
    confidenceChanges,
  };
}

/**
 * Get or create personalization settings for a user.
 */
export async function getPersonalizationSettings(
  userId: string
): Promise<PersonalizationSettingsType> {
  const settings = await db.personalizationSettings.findUnique({
    where: { userId },
  });

  if (settings) {
    return {
      enabled: settings.enabled,
      learningEnabled: settings.learningEnabled,
    };
  }

  // Create default settings
  const created = await db.personalizationSettings.create({
    data: { userId },
  });

  return {
    enabled: created.enabled,
    learningEnabled: created.learningEnabled,
  };
}

/**
 * Get user's preference profile.
 */
export async function getPreferenceProfile(
  userId: string
): Promise<PreferenceProfile> {
  const [preferences, settings] = await Promise.all([
    db.communicationPreference.findMany({
      where: { userId },
      orderBy: { confidence: "desc" },
    }),
    getPersonalizationSettings(userId),
  ]);

  const learnedPrefs: LearnedPreference[] = preferences.map((p) => ({
    dimension: p.dimension as PreferenceDimension,
    value: p.value,
    confidence: p.confidence,
    source: p.source as "explicit" | "implicit",
    context: p.context || undefined,
    signalCount: p.signalCount,
    lastSignalAt: p.lastSignalAt,
  }));

  return {
    userId,
    preferences: learnedPrefs,
    settings,
    lastUpdated: new Date(),
  };
}

/**
 * Build a compact preference profile for inclusion in AI prompts.
 * Only includes dimensions with confidence above threshold.
 */
export function buildCompactProfile(
  profile: PreferenceProfile,
  context?: string,
  confidenceThreshold: number = 0.3
): CompactPreferenceProfile {
  const compact: CompactPreferenceProfile = {
    dimensions: {},
    context,
  };

  for (const pref of profile.preferences) {
    // Filter by context if specified
    if (context && pref.context && pref.context !== context) continue;
    if (pref.confidence < confidenceThreshold) continue;

    // Only keep the highest-confidence value per dimension
    const existing = compact.dimensions[pref.dimension];
    if (!existing || pref.confidence > existing.confidence) {
      compact.dimensions[pref.dimension] = {
        value: pref.value,
        confidence: pref.confidence,
      };
    }
  }

  return compact;
}

/**
 * Update personalization settings.
 */
export async function updatePersonalizationSettings(
  userId: string,
  settings: Partial<PersonalizationSettingsType>
): Promise<PersonalizationSettingsType> {
  const updated = await db.personalizationSettings.upsert({
    where: { userId },
    create: {
      userId,
      enabled: settings.enabled ?? true,
      learningEnabled: settings.learningEnabled ?? true,
    },
    update: {
      ...(settings.enabled !== undefined && { enabled: settings.enabled }),
      ...(settings.learningEnabled !== undefined && { learningEnabled: settings.learningEnabled }),
    },
  });

  return {
    enabled: updated.enabled,
    learningEnabled: updated.learningEnabled,
  };
}

/**
 * Reset all learned preferences for a user (keeps explicit settings).
 */
export async function resetLearnedPreferences(userId: string): Promise<void> {
  await db.communicationPreference.deleteMany({
    where: {
      userId,
      source: "implicit",
    },
  });
}

/**
 * Delete all personalization data for a user.
 */
export async function deleteAllPersonalizationData(userId: string): Promise<void> {
  await db.$transaction([
    db.communicationPreference.deleteMany({ where: { userId } }),
    db.feedbackEvent.deleteMany({ where: { userId } }),
    db.personalizationSettings.deleteMany({ where: { userId } }),
  ]);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Invert a dimension value (for learning from negative feedback).
 */
function invertDimensionValue(
  dimension: PreferenceDimension,
  value: string
): string | null {
  const values = DIMENSION_VALUES[dimension];
  if (!values) return null;

  const idx = values.indexOf(value);
  if (idx === -1) return null;

  // Invert by picking the opposite end of the spectrum
  const oppositeIdx = values.length - 1 - idx;
  return values[oppositeIdx];
}

/**
 * Apply decay to all preferences for a user.
 * Should be called periodically (e.g., on profile fetch).
 */
export async function applyDecayToProfile(
  profile: PreferenceProfile
): Promise<PreferenceProfile> {
  const now = new Date();
  const updatedPrefs: LearnedPreference[] = [];

  // Collect all updates that need to happen
  const updatesToApply: Array<{
    dimension: PreferenceDimension;
    context: string | null;
    newConfidence: number;
  }> = [];

  for (const pref of profile.preferences) {
    const newConfidence = applyDecay(
      pref.confidence,
      pref.source,
      pref.lastSignalAt,
      now
    );

    updatedPrefs.push({
      ...pref,
      confidence: newConfidence,
    });

    // Track if confidence changed significantly
    if (Math.abs(newConfidence - pref.confidence) > 0.01) {
      updatesToApply.push({
        dimension: pref.dimension,
        context: pref.context ?? null,
        newConfidence,
      });
    }
  }

  // Batch all updates in a single transaction
  if (updatesToApply.length > 0) {
    await db.$transaction(
      updatesToApply.map((update) =>
        db.communicationPreference.updateMany({
          where: {
            userId: profile.userId,
            dimension: update.dimension,
            context: update.context || "",
          },
          data: { confidence: update.newConfidence },
        })
      )
    );
  }

  return {
    ...profile,
    preferences: updatedPrefs,
    lastUpdated: now,
  };
}
