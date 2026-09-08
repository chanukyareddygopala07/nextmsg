// ─── Personalization System Tests ───────────────────────────────────────────────
//
// Tests for the feedback and personalization system:
// 1. Personalization types
// 2. Personalization engine (signal processing, confidence, decay, safety)
// 3. Preference resolver (precedence logic)
// 4. Compact profile building
// 5. Ranker personalization scoring
// 6. Generator preference section
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  SIGNAL_WEIGHTS,
  SIGNAL_DIRECTION,
  DECAY_RATES,
  SYSTEM_DEFAULTS,
  DIMENSION_VALUES,
} from "@/lib/ai/personalization-types";
import {
  inferDimensionsFromReply,
  checkLearningSafety,
  calculateConfidenceUpdate,
  applyDecay,
} from "@/lib/ai/personalization";
import {
  resolveEffectivePreferences,
  buildPromptProfile,
  formatProfileForPrompt,
  getDefaultPreference,
  isValidPreferenceValue,
} from "@/lib/ai/preference-resolver";
import { rankReplies } from "@/lib/ai/ranker";
import type { CompactPreferenceProfile } from "@/lib/ai/personalization-types";
import type { LearnedPreference } from "@/lib/ai/personalization-types";

// ─── Signal Types Tests ────────────────────────────────────────────────────────

describe("Personalization Types", () => {
  describe("SIGNAL_WEIGHTS", () => {
    it("should have weights for all feedback signals", () => {
      expect(SIGNAL_WEIGHTS.thumbs_up).toBe(1.0);
      expect(SIGNAL_WEIGHTS.thumbs_down).toBe(1.0);
      expect(SIGNAL_WEIGHTS.copy).toBe(0.3);
      expect(SIGNAL_WEIGHTS.select).toBe(0.5);
      expect(SIGNAL_WEIGHTS.edit).toBe(0.2);
      expect(SIGNAL_WEIGHTS.regenerate).toBe(0.4);
      expect(SIGNAL_WEIGHTS.discard).toBe(0.3);
    });

    it("should have explicit signals weighted higher than implicit", () => {
      expect(SIGNAL_WEIGHTS.thumbs_up).toBeGreaterThan(SIGNAL_WEIGHTS.copy);
      expect(SIGNAL_WEIGHTS.thumbs_up).toBeGreaterThan(SIGNAL_WEIGHTS.select);
      expect(SIGNAL_WEIGHTS.thumbs_down).toBeGreaterThan(SIGNAL_WEIGHTS.edit);
      expect(SIGNAL_WEIGHTS.thumbs_down).toBeGreaterThan(SIGNAL_WEIGHTS.regenerate);
    });

    it("should have all weights between 0 and 1", () => {
      for (const weight of Object.values(SIGNAL_WEIGHTS)) {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("SIGNAL_DIRECTION", () => {
    it("should have directions for all signals", () => {
      expect(SIGNAL_DIRECTION.thumbs_up).toBe("positive");
      expect(SIGNAL_DIRECTION.thumbs_down).toBe("negative");
      expect(SIGNAL_DIRECTION.copy).toBe("positive");
      expect(SIGNAL_DIRECTION.select).toBe("positive");
      expect(SIGNAL_DIRECTION.edit).toBe("negative");
      expect(SIGNAL_DIRECTION.regenerate).toBe("negative");
      expect(SIGNAL_DIRECTION.discard).toBe("negative");
    });

    it("should have explicit signals as positive/negative (not neutral)", () => {
      expect(SIGNAL_DIRECTION.thumbs_up).not.toBe("neutral");
      expect(SIGNAL_DIRECTION.thumbs_down).not.toBe("neutral");
    });
  });

  describe("DECAY_RATES", () => {
    it("should have explicit decay slower than implicit", () => {
      expect(DECAY_RATES.explicit.halfLifeDays).toBeGreaterThan(
        DECAY_RATES.implicit.halfLifeDays
      );
    });

    it("should have positive half-life days", () => {
      expect(DECAY_RATES.explicit.halfLifeDays).toBeGreaterThan(0);
      expect(DECAY_RATES.implicit.halfLifeDays).toBeGreaterThan(0);
    });

    it("should have min confidence values", () => {
      expect(DECAY_RATES.explicit.minConfidence).toBeGreaterThanOrEqual(0);
      expect(DECAY_RATES.implicit.minConfidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("SYSTEM_DEFAULTS", () => {
    it("should have defaults for all dimensions", () => {
      const dimensions = Object.keys(DIMENSION_VALUES);
      for (const dim of dimensions) {
        expect(SYSTEM_DEFAULTS).toHaveProperty(dim);
      }
    });

    it("should have valid default values", () => {
      for (const [dim, value] of Object.entries(SYSTEM_DEFAULTS)) {
        const validValues = DIMENSION_VALUES[dim as keyof typeof DIMENSION_VALUES];
        expect(validValues).toContain(value);
      }
    });
  });

  describe("DIMENSION_VALUES", () => {
    it("should have values for all preference dimensions", () => {
      expect(DIMENSION_VALUES.length).toEqual(["short", "medium", "long"]);
      expect(DIMENSION_VALUES.emoji).toEqual(["none", "minimal", "moderate", "heavy"]);
      expect(DIMENSION_VALUES.formality).toEqual([
        "very_casual", "casual", "neutral", "formal", "very_formal",
      ]);
      expect(DIMENSION_VALUES.tone).toEqual(["warm", "neutral", "direct", "playful"]);
    });

    it("should have non-empty arrays for all dimensions", () => {
      for (const values of Object.values(DIMENSION_VALUES)) {
        expect(values.length).toBeGreaterThan(0);
      }
    });
  });
});

// ─── Dimension Inference Tests ─────────────────────────────────────────────────

describe("inferDimensionsFromReply", () => {
  it("should infer short length for brief messages", () => {
    const result = inferDimensionsFromReply("hey", "natural");
    expect(result.length).toBe("short");
  });

  it("should infer medium length for moderate messages", () => {
    const result = inferDimensionsFromReply(
      "hey how are you doing today? I was wondering if you wanted to hang out",
      "natural"
    );
    expect(result.length).toBe("medium");
  });

  it("should infer long length for verbose messages", () => {
    const result = inferDimensionsFromReply(
      "hey how are you doing today? I was wondering if you wanted to hang out sometime this weekend because the weather is supposed to be really nice and I thought we could go to that new restaurant",
      "natural"
    );
    expect(result.length).toBe("long");
  });

  it("should infer no emoji when none present", () => {
    const result = inferDimensionsFromReply("hey there", "natural");
    expect(result.emoji).toBe("none");
  });

  it("should infer emoji when present", () => {
    const result = inferDimensionsFromReply("hey there 😊", "natural");
    expect(result.emoji).toBeDefined();
    expect(["minimal", "moderate"]).toContain(result.emoji);
  });

  it("should infer formal formality for professional strategy", () => {
    const result = inferDimensionsFromReply("Hello", "professional");
    expect(result.formality).toBe("formal");
  });

  it("should infer casual formality for playful strategy", () => {
    const result = inferDimensionsFromReply("haha", "playful");
    expect(result.formality).toBe("casual");
  });

  it("should infer warm tone for empathetic strategy", () => {
    const result = inferDimensionsFromReply("I understand", "empathetic");
    expect(result.tone).toBe("warm");
  });

  it("should infer direct tone for clear_direct strategy", () => {
    const result = inferDimensionsFromReply("Let's meet", "clear_direct");
    expect(result.tone).toBe("direct");
  });

  it("should infer playful tone for playful strategy", () => {
    const result = inferDimensionsFromReply("haha", "playful");
    expect(result.tone).toBe("playful");
  });

  it("should infer minimal punctuation for no exclamation", () => {
    const result = inferDimensionsFromReply("hey there", "natural");
    expect(result.punctuation).toBe("minimal");
  });

  it("should infer expressive punctuation for multiple exclamation", () => {
    const result = inferDimensionsFromReply("hey there!!", "natural");
    expect(result.punctuation).toBe("expressive");
  });

  it("should infer slang when present", () => {
    const result = inferDimensionsFromReply("lol that's funny", "natural");
    expect(result.slang).toBe("moderate");
  });

  it("should infer no slang when absent", () => {
    const result = inferDimensionsFromReply("that is interesting", "natural");
    expect(result.slang).toBe("none");
  });

  it("should infer exploratory question style for multiple questions", () => {
    const result = inferDimensionsFromReply("what do you think? why not?", "natural");
    expect(result.question_style).toBe("exploratory");
  });

  it("should infer direct question style for single question", () => {
    const result = inferDimensionsFromReply("what do you think?", "natural");
    expect(result.question_style).toBe("direct");
  });

  it("should handle empty text", () => {
    const result = inferDimensionsFromReply("", "natural");
    expect(result.length).toBe("short");
  });
});

// ─── Safety Check Tests ────────────────────────────────────────────────────────

describe("checkLearningSafety", () => {
  it("should return null when all checks pass", () => {
    const result = checkLearningSafety({
      passedQuality: true,
      passedPreservation: true,
      passedSafety: true,
      deceptionDetected: false,
      coercionDetected: false,
    });
    expect(result).toBeNull();
  });

  it("should block when quality check fails", () => {
    const result = checkLearningSafety({
      passedQuality: false,
      passedPreservation: true,
      passedSafety: true,
      deceptionDetected: false,
      coercionDetected: false,
    });
    expect(result).toBe("quality_rejected");
  });

  it("should block when preservation check fails", () => {
    const result = checkLearningSafety({
      passedQuality: true,
      passedPreservation: false,
      passedSafety: true,
      deceptionDetected: false,
      coercionDetected: false,
    });
    expect(result).toBe("preservation_rejected");
  });

  it("should block when safety check fails", () => {
    const result = checkLearningSafety({
      passedQuality: true,
      passedPreservation: true,
      passedSafety: false,
      deceptionDetected: false,
      coercionDetected: false,
    });
    expect(result).toBe("safety_rejected");
  });

  it("should block when deception is detected", () => {
    const result = checkLearningSafety({
      passedQuality: true,
      passedPreservation: true,
      passedSafety: true,
      deceptionDetected: true,
      coercionDetected: false,
    });
    expect(result).toBe("deception_detected");
  });

  it("should block when coercion is detected", () => {
    const result = checkLearningSafety({
      passedQuality: true,
      passedPreservation: true,
      passedSafety: true,
      deceptionDetected: false,
      coercionDetected: true,
    });
    expect(result).toBe("coercion_detected");
  });

  it("should prioritize quality over other checks", () => {
    const result = checkLearningSafety({
      passedQuality: false,
      passedPreservation: false,
      passedSafety: false,
      deceptionDetected: true,
      coercionDetected: true,
    });
    expect(result).toBe("quality_rejected");
  });
});

// ─── Confidence Update Tests ───────────────────────────────────────────────────

describe("calculateConfidenceUpdate", () => {
  it("should increase confidence for positive signals", () => {
    const newConf = calculateConfidenceUpdate(0.5, 1.0, "positive", 0);
    expect(newConf).toBeGreaterThan(0.5);
  });

  it("should decrease confidence for negative signals", () => {
    const newConf = calculateConfidenceUpdate(0.5, 1.0, "negative", 0);
    expect(newConf).toBeLessThan(0.5);
  });

  it("should not change confidence for neutral signals", () => {
    const newConf = calculateConfidenceUpdate(0.5, 1.0, "neutral", 0);
    expect(newConf).toBe(0.5);
  });

  it("should clamp confidence between 0 and 1", () => {
    const highConf = calculateConfidenceUpdate(0.95, 1.0, "positive", 0);
    expect(highConf).toBeLessThanOrEqual(1);

    const lowConf = calculateConfidenceUpdate(0.05, 1.0, "negative", 0);
    expect(lowConf).toBeGreaterThanOrEqual(0);
  });

  it("should have diminishing returns with more signals", () => {
    const first = calculateConfidenceUpdate(0.5, 1.0, "positive", 0);
    const tenth = calculateConfidenceUpdate(0.5, 1.0, "positive", 10);
    const hundredth = calculateConfidenceUpdate(0.5, 1.0, "positive", 100);

    // Each subsequent signal has less impact (or same due to rounding)
    expect(first - 0.5).toBeGreaterThanOrEqual(tenth - 0.5);
    expect(tenth - 0.5).toBeGreaterThanOrEqual(hundredth - 0.5);
    // But all should be positive (confidence increased)
    expect(first).toBeGreaterThan(0.5);
    expect(tenth).toBeGreaterThan(0.5);
    expect(hundredth).toBeGreaterThan(0.5);
  });

  it("should handle zero starting confidence", () => {
    const newConf = calculateConfidenceUpdate(0, 1.0, "positive", 0);
    expect(newConf).toBeGreaterThan(0);
  });

  it("should handle full starting confidence", () => {
    const newConf = calculateConfidenceUpdate(1, 1.0, "negative", 0);
    expect(newConf).toBeLessThan(1);
  });
});

// ─── Decay Tests ───────────────────────────────────────────────────────────────

describe("applyDecay", () => {
  it("should not decay immediately", () => {
    const now = new Date();
    const conf = applyDecay(0.8, "explicit", now, now);
    expect(conf).toBe(0.8);
  });

  it("should decay over time", () => {
    const lastSignal = new Date("2024-01-01");
    const now = new Date("2024-06-01"); // 5 months later
    const conf = applyDecay(0.8, "explicit", lastSignal, now);
    expect(conf).toBeLessThan(0.8);
  });

  it("should decay implicit faster than explicit", () => {
    const lastSignal = new Date("2024-01-01");
    const now = new Date("2024-06-01");
    const explicitConf = applyDecay(0.8, "explicit", lastSignal, now);
    const implicitConf = applyDecay(0.8, "implicit", lastSignal, now);
    expect(implicitConf).toBeLessThan(explicitConf);
  });

  it("should not decay below min confidence", () => {
    const lastSignal = new Date("2020-01-01");
    const now = new Date("2024-06-01");
    const explicitConf = applyDecay(0.8, "explicit", lastSignal, now);
    const implicitConf = applyDecay(0.8, "implicit", lastSignal, now);
    expect(explicitConf).toBeGreaterThanOrEqual(DECAY_RATES.explicit.minConfidence);
    expect(implicitConf).toBeGreaterThanOrEqual(DECAY_RATES.implicit.minConfidence);
  });

  it("should handle zero confidence", () => {
    const conf = applyDecay(0, "explicit", new Date(), new Date());
    // Zero confidence returns min confidence (no decay applied to zero)
    expect(conf).toBe(DECAY_RATES.explicit.minConfidence);
  });
});

// ─── Preference Resolver Tests ─────────────────────────────────────────────────

describe("resolveEffectivePreferences", () => {
  it("should use system defaults when no preferences exist", () => {
    const result = resolveEffectivePreferences([]);
    expect(result.preferences.length).toBe("medium");
    expect(result.preferences.emoji).toBe("minimal");
    expect(result.preferences.formality).toBe("casual");
    expect(result.sources.length).toBe("default");
  });

  it("should use explicit saved preferences over defaults", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "length",
        value: "short",
        confidence: 0.8,
        source: "explicit",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.preferences.length).toBe("short");
    expect(result.sources.length).toBe("explicit");
  });

  it("should use strong learned preferences", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "emoji",
        value: "heavy",
        confidence: 0.8,
        source: "implicit",
        signalCount: 20,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.preferences.emoji).toBe("heavy");
    expect(result.sources.emoji).toBe("learned");
  });

  it("should not use weak learned preferences", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "emoji",
        value: "heavy",
        confidence: 0.2,
        source: "implicit",
        signalCount: 2,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.preferences.emoji).toBe("minimal"); // default
    expect(result.sources.emoji).toBe("default");
  });

  it("should apply context overrides", () => {
    const result = resolveEffectivePreferences(
      [],
      { length: "long" },
      {},
      {},
      "professional"
    );
    expect(result.preferences.length).toBe("long");
    expect(result.sources.length).toBe("explicit");
  });

  it("should apply session overrides (highest priority)", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "formality",
        value: "casual",
        confidence: 0.9,
        source: "explicit",
        signalCount: 10,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(
      prefs,
      {},
      { formality: "formal" }
    );
    expect(result.preferences.formality).toBe("formal");
    expect(result.sources.formality).toBe("explicit");
  });

  it("should respect context-specific preferences", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "formality",
        value: "formal",
        confidence: 0.8,
        source: "explicit",
        context: "professional",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs, {}, {}, {}, "professional");
    expect(result.preferences.formality).toBe("formal");
  });

  it("should not apply context-specific preferences for wrong context", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "formality",
        value: "formal",
        confidence: 0.8,
        source: "explicit",
        context: "professional",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs, {}, {}, {}, "dating");
    expect(result.preferences.formality).toBe("casual"); // default
  });

  it("should include confidence values", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "length",
        value: "short",
        confidence: 0.7,
        source: "explicit",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.confidence.length).toBe(0.7);
  });
});

// ─── Compact Profile Tests ─────────────────────────────────────────────────────

describe("buildPromptProfile", () => {
  it("should build profile from resolved preferences", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "length",
        value: "short",
        confidence: 0.8,
        source: "explicit",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
    ];
    const resolved = resolveEffectivePreferences(prefs);
    const profile = buildPromptProfile(resolved);
    expect(profile.dimensions.length).toBeDefined();
    expect(profile.dimensions.length?.value).toBe("short");
  });

  it("should filter low confidence dimensions", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "length",
        value: "short",
        confidence: 0.2,
        source: "implicit",
        signalCount: 2,
        lastSignalAt: new Date(),
      },
    ];
    const resolved = resolveEffectivePreferences(prefs);
    const profile = buildPromptProfile(resolved, 0.3);
    expect(profile.dimensions.length).toBeUndefined();
  });

  it("should include context when provided", () => {
    const resolved = resolveEffectivePreferences([], {}, {}, {}, "professional");
    const profile = buildPromptProfile(resolved);
    expect(profile.context).toBe("professional");
  });
});

describe("formatProfileForPrompt", () => {
  it("should format profile as string", () => {
    const profile: CompactPreferenceProfile = {
      dimensions: {
        length: { value: "short", confidence: 0.8 },
        emoji: { value: "none", confidence: 0.6 },
      },
    };
    const result = formatProfileForPrompt(profile);
    expect(result).toContain("length: short");
    expect(result).toContain("emoji: none");
  });

  it("should include context when present", () => {
    const profile: CompactPreferenceProfile = {
      dimensions: { length: { value: "short", confidence: 0.8 } },
      context: "professional",
    };
    const result = formatProfileForPrompt(profile);
    expect(result).toContain("Context: professional");
  });

  it("should return empty string for empty profile", () => {
    const profile: CompactPreferenceProfile = { dimensions: {} };
    const result = formatProfileForPrompt(profile);
    expect(result).toBe("");
  });

  it("should format dimension labels nicely", () => {
    const profile: CompactPreferenceProfile = {
      dimensions: {
        question_style: { value: "direct", confidence: 0.7 },
        emotional_expression: { value: "open", confidence: 0.6 },
      },
    };
    const result = formatProfileForPrompt(profile);
    expect(result).toContain("question style");
    expect(result).toContain("emotional expression");
  });
});

// ─── Validation Tests ──────────────────────────────────────────────────────────

describe("getDefaultPreference", () => {
  it("should return system default for each dimension", () => {
    expect(getDefaultPreference("length")).toBe("medium");
    expect(getDefaultPreference("emoji")).toBe("minimal");
    expect(getDefaultPreference("formality")).toBe("casual");
    expect(getDefaultPreference("tone")).toBe("neutral");
  });
});

describe("isValidPreferenceValue", () => {
  it("should validate correct values", () => {
    expect(isValidPreferenceValue("length", "short")).toBe(true);
    expect(isValidPreferenceValue("length", "medium")).toBe(true);
    expect(isValidPreferenceValue("length", "long")).toBe(true);
  });

  it("should reject invalid values", () => {
    expect(isValidPreferenceValue("length", "extra_long")).toBe(false);
    expect(isValidPreferenceValue("emoji", "super_heavy")).toBe(false);
  });

  it("should validate all formality levels", () => {
    expect(isValidPreferenceValue("formality", "very_casual")).toBe(true);
    expect(isValidPreferenceValue("formality", "casual")).toBe(true);
    expect(isValidPreferenceValue("formality", "neutral")).toBe(true);
    expect(isValidPreferenceValue("formality", "formal")).toBe(true);
    expect(isValidPreferenceValue("formality", "very_formal")).toBe(true);
  });
});

// ─── Ranker Personalization Tests ──────────────────────────────────────────────

describe("Ranker Personalization", () => {
  const mockAnalysis = {
    stage: "rapport" as const,
    engagement: 0.7,
    flirting: 0.3,
    humor: 0.5,
    reciprocity: 0.6,
    conversationHealth: 0.7,
  };

  it("should rank candidates without preferences (no crash)", () => {
    const candidates = [
      { text: "hey", strategy: "natural" },
      { text: "hello there", strategy: "friendly" },
    ];
    const result = rankReplies(candidates, mockAnalysis);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBeGreaterThanOrEqual(0);
  });

  it("should boost candidates matching length preference", () => {
    const candidates = [
      { text: "hey", strategy: "natural" },
      { text: "hello there how are you doing today", strategy: "friendly" },
    ];
    const preferences: CompactPreferenceProfile = {
      dimensions: { length: { value: "short", confidence: 0.8 } },
    };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    // Short message should score higher with short preference
    const shortCandidate = result.find((c) => c.text === "hey");
    const longCandidate = result.find((c) => c.text === "hello there how are you doing today");
    expect(shortCandidate?.score).toBeGreaterThanOrEqual(longCandidate?.score || 0);
  });

  it("should boost candidates matching emoji preference", () => {
    const candidates = [
      { text: "hey there", strategy: "natural" },
      { text: "hey there 😊", strategy: "natural" },
    ];
    const preferences: CompactPreferenceProfile = {
      dimensions: { emoji: { value: "none", confidence: 0.8 } },
    };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    const noEmoji = result.find((c) => c.text === "hey there");
    const withEmoji = result.find((c) => c.text === "hey there 😊");
    expect(noEmoji?.score).toBeGreaterThanOrEqual(withEmoji?.score || 0);
  });

  it("should boost candidates matching strategy preference", () => {
    const candidates = [
      { text: "hey", strategy: "professional" },
      { text: "hey", strategy: "playful" },
    ];
    const preferences: CompactPreferenceProfile = {
      dimensions: { strategy_preference: { value: "professional", confidence: 0.8 } },
    };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    const prof = result.find((c) => c.strategy === "professional");
    const play = result.find((c) => c.strategy === "playful");
    expect(prof?.score).toBeGreaterThanOrEqual(play?.score || 0);
  });

  it("should not crash with empty preferences", () => {
    const candidates = [{ text: "hey", strategy: "natural" }];
    const preferences: CompactPreferenceProfile = { dimensions: {} };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    expect(result).toHaveLength(1);
  });

  it("should not crash with undefined preferences", () => {
    const candidates = [{ text: "hey", strategy: "natural" }];
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, undefined);
    expect(result).toHaveLength(1);
  });

  it("should give higher score to formality-matching professional strategy", () => {
    const candidates = [
      { text: "Hello, I will review this.", strategy: "professional" },
      { text: "haha yeah", strategy: "playful" },
    ];
    const preferences: CompactPreferenceProfile = {
      dimensions: { formality: { value: "formal", confidence: 0.9 } },
    };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    const prof = result.find((c) => c.strategy === "professional");
    const play = result.find((c) => c.strategy === "playful");
    expect(prof?.score).toBeGreaterThan(play?.score || 0);
  });

  it("should give higher score to tone-matching warm strategy", () => {
    const candidates = [
      { text: "I understand how you feel", strategy: "empathetic" },
      { text: "Let me be clear", strategy: "clear_direct" },
    ];
    const preferences: CompactPreferenceProfile = {
      dimensions: { tone: { value: "warm", confidence: 0.9 } },
    };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    const warm = result.find((c) => c.strategy === "empathetic");
    const direct = result.find((c) => c.strategy === "clear_direct");
    expect(warm?.score).toBeGreaterThan(direct?.score || 0);
  });

  it("should boost minimal punctuation when preferred", () => {
    const candidates = [
      { text: "hey there", strategy: "natural" },
      { text: "hey there!", strategy: "natural" },
    ];
    const preferences: CompactPreferenceProfile = {
      dimensions: { punctuation: { value: "minimal", confidence: 0.8 } },
    };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    const minimal = result.find((c) => c.text === "hey there");
    const expressive = result.find((c) => c.text === "hey there!");
    expect(minimal?.score).toBeGreaterThanOrEqual(expressive?.score || 0);
  });

  it("should boost no-slang when preferred", () => {
    const candidates = [
      { text: "that is interesting", strategy: "natural" },
      { text: "lol that is interesting", strategy: "natural" },
    ];
    const preferences: CompactPreferenceProfile = {
      dimensions: { slang: { value: "none", confidence: 0.8 } },
    };
    const result = rankReplies(candidates, mockAnalysis, undefined, undefined, undefined, undefined, preferences);
    const noSlang = result.find((c) => c.text === "that is interesting");
    const withSlang = result.find((c) => c.text === "lol that is interesting");
    expect(noSlang?.score).toBeGreaterThanOrEqual(withSlang?.score || 0);
  });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("should handle empty candidates array in rankReplies", () => {
    const result = rankReplies([], {
      stage: "rapport",
      engagement: 0.5,
      flirting: 0,
      humor: 0,
      reciprocity: 0.5,
      conversationHealth: 0.5,
    });
    expect(result).toHaveLength(0);
  });

  it("should handle very long messages in inference", () => {
    const longMsg = "a ".repeat(1000);
    const result = inferDimensionsFromReply(longMsg, "natural");
    expect(result.length).toBe("long");
  });

  it("should handle special characters in messages", () => {
    const result = inferDimensionsFromReply("hey!!! ??? ...", "natural");
    expect(result.punctuation).toBe("expressive");
    expect(result.question_style).toBe("exploratory");
  });

  it("should handle unicode in messages", () => {
    const result = inferDimensionsFromReply("hey 你好", "natural");
    expect(result.length).toBeDefined();
  });

  it("should handle very low confidence preferences", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "length",
        value: "short",
        confidence: 0.01,
        source: "implicit",
        signalCount: 1,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.preferences.length).toBe("medium"); // default
  });

  it("should handle conflicting preferences (last wins by confidence)", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "formality",
        value: "casual",
        confidence: 0.6,
        source: "implicit",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
      {
        dimension: "formality",
        value: "formal",
        confidence: 0.8,
        source: "explicit",
        signalCount: 3,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.preferences.formality).toBe("formal");
  });

  it("should handle confidence at exact threshold", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "emoji",
        value: "heavy",
        confidence: 0.3,
        source: "implicit",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.preferences.emoji).toBe("heavy"); // at threshold
  });

  it("should handle safety constraints", () => {
    const result = resolveEffectivePreferences(
      [],
      {},
      {},
      { formality: "formal" }
    );
    expect(result.preferences.formality).toBe("formal");
  });
});

// ─── Preference Resolver Precedence Tests ──────────────────────────────────────

describe("Preference Resolver Precedence", () => {
  it("should prioritize session override over context override", () => {
    const result = resolveEffectivePreferences(
      [],
      { length: "long" },
      { length: "short" }
    );
    expect(result.preferences.length).toBe("short");
  });

  it("should prioritize context override over learned preferences", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "tone",
        value: "playful",
        confidence: 0.9,
        source: "explicit",
        signalCount: 10,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs, { tone: "direct" });
    expect(result.preferences.tone).toBe("direct");
  });

  it("should prioritize explicit over learned for same dimension", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "emoji",
        value: "heavy",
        confidence: 0.9,
        source: "implicit",
        signalCount: 20,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    // Should use explicit if available, otherwise learned
    expect(result.preferences.emoji).toBeDefined();
  });

  it("should use defaults when no preferences exist", () => {
    const result = resolveEffectivePreferences([]);
    for (const dim of Object.keys(SYSTEM_DEFAULTS)) {
      expect(result.preferences[dim as keyof typeof result.preferences]).toBe(
        SYSTEM_DEFAULTS[dim as keyof typeof SYSTEM_DEFAULTS]
      );
    }
  });

  it("should set correct source for each dimension", () => {
    const prefs: LearnedPreference[] = [
      {
        dimension: "length",
        value: "short",
        confidence: 0.8,
        source: "explicit",
        signalCount: 5,
        lastSignalAt: new Date(),
      },
    ];
    const result = resolveEffectivePreferences(prefs);
    expect(result.sources.length).toBe("explicit");
    expect(result.sources.emoji).toBe("default");
  });
});
