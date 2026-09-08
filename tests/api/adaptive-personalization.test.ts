import { describe, it, expect } from "vitest";
import {
  resolveEffectivePreferences,
  buildPromptProfile,
  formatProfileForPrompt,
  getDefaultPreference,
  isValidPreferenceValue,
} from "@/lib/ai/preference-resolver";
import {
  getRecommendedGoal,
} from "@/components/analyze/GoalSelector";
import {
  getRecommendedMode,
} from "@/components/analyze/ImprovementModeSelector";
import {
  getContextOverrides,
  buildSessionOverrides,
  CONFIDENCE_THRESHOLDS,
} from "@/lib/ai/effective-preferences";
import type {
  LearnedPreference,
  PreferenceDimension,
  ResolvedPreferences,
} from "@/lib/ai/personalization-types";
import { SYSTEM_DEFAULTS, DIMENSION_VALUES } from "@/lib/ai/personalization-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePref(
  dimension: PreferenceDimension,
  value: string,
  confidence: number,
  source: "explicit" | "implicit" = "implicit",
  context?: string
): LearnedPreference {
  return {
    dimension,
    value,
    confidence,
    source,
    context,
    signalCount: Math.ceil(confidence * 10),
    lastSignalAt: new Date(),
  };
}

function getResolvedValue(
  resolved: ResolvedPreferences,
  dim: PreferenceDimension
): string {
  return resolved.preferences[dim];
}

function getResolvedConfidence(
  resolved: ResolvedPreferences,
  dim: PreferenceDimension
): number {
  return resolved.confidence[dim];
}

function getResolvedSource(
  resolved: ResolvedPreferences,
  dim: PreferenceDimension
): "explicit" | "learned" | "default" {
  return resolved.sources[dim];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EFFECTIVE PREFERENCES — DEFAULT
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Default", () => {
  it("returns system defaults when no preferences exist", () => {
    const resolved = resolveEffectivePreferences([]);
    expect(getResolvedValue(resolved, "length")).toBe("medium");
    expect(getResolvedValue(resolved, "emoji")).toBe("minimal");
    expect(getResolvedValue(resolved, "formality")).toBe("casual");
    expect(getResolvedValue(resolved, "tone")).toBe("neutral");
    expect(getResolvedValue(resolved, "punctuation")).toBe("standard");
    expect(getResolvedValue(resolved, "slang")).toBe("none");
    expect(getResolvedValue(resolved, "question_style")).toBe("direct");
    expect(getResolvedValue(resolved, "humor")).toBe("subtle");
    expect(getResolvedValue(resolved, "emotional_expression")).toBe("moderate");
    expect(getResolvedValue(resolved, "improvement_mode")).toBe("clearer");
    expect(getResolvedValue(resolved, "default_tone")).toBe("neutral");
    expect(getResolvedValue(resolved, "strategy_preference")).toBe("natural");
  });

  it("all dimensions have default confidence of 0", () => {
    const resolved = resolveEffectivePreferences([]);
    const dimensions = Object.keys(SYSTEM_DEFAULTS) as PreferenceDimension[];
    for (const dim of dimensions) {
      expect(getResolvedConfidence(resolved, dim)).toBe(0);
    }
  });

  it("all dimensions have default source", () => {
    const resolved = resolveEffectivePreferences([]);
    const dimensions = Object.keys(SYSTEM_DEFAULTS) as PreferenceDimension[];
    for (const dim of dimensions) {
      expect(getResolvedSource(resolved, dim)).toBe("default");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EFFECTIVE PREFERENCES — EXPLICIT
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Explicit", () => {
  it("explicit saved preference beats system default", () => {
    const prefs = [makePref("length", "short", 0.5, "explicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "length")).toBe("short");
    expect(getResolvedSource(resolved, "length")).toBe("explicit");
  });

  it("explicit preference with low confidence is ignored", () => {
    const prefs = [makePref("length", "short", 0.2, "explicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "length")).toBe("medium");
    expect(getResolvedSource(resolved, "length")).toBe("default");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EFFECTIVE PREFERENCES — LEARNED
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Learned", () => {
  it("strong learned preference (confidence >= 0.7) influences defaults", () => {
    const prefs = [makePref("tone", "direct", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
    expect(getResolvedSource(resolved, "tone")).toBe("learned");
  });

  it("weak learned preference (confidence 0.3-0.7) influences defaults", () => {
    const prefs = [makePref("emoji", "none", 0.4, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
    expect(getResolvedSource(resolved, "emoji")).toBe("learned");
  });

  it("very weak learned preference (confidence < 0.3) is ignored", () => {
    const prefs = [makePref("emoji", "heavy", 0.2, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("minimal");
    expect(getResolvedSource(resolved, "emoji")).toBe("default");
  });

  it("strong learned beats weak learned", () => {
    const prefs = [
      makePref("formality", "formal", 0.8, "implicit"),
      makePref("formality", "casual", 0.4, "implicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EFFECTIVE PREFERENCES — PRECEDENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Precedence", () => {
  it("current instruction wins over learned preference", () => {
    const prefs = [makePref("tone", "direct", 0.9, "implicit")];
    const sessionOverrides = { tone: "warm" };
    const resolved = resolveEffectivePreferences(prefs, {}, sessionOverrides);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
    expect(getResolvedConfidence(resolved, "tone")).toBe(1.0);
    expect(getResolvedSource(resolved, "tone")).toBe("explicit");
  });

  it("context wins over weak learned preference", () => {
    const prefs = [makePref("formality", "casual", 0.4, "implicit")];
    const contextOverrides = { formality: "formal" };
    const resolved = resolveEffectivePreferences(prefs, contextOverrides);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
    expect(getResolvedConfidence(resolved, "formality")).toBe(0.9);
  });

  it("explicit saved beats learned", () => {
    const prefs = [
      makePref("length", "long", 0.8, "explicit"),
      makePref("length", "short", 0.9, "implicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "length")).toBe("long");
    expect(getResolvedSource(resolved, "length")).toBe("explicit");
  });

  it("strong learned beats weak", () => {
    const prefs = [
      makePref("emoji", "none", 0.8, "implicit"),
      makePref("emoji", "heavy", 0.4, "implicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
  });

  it("defaults fallback when no preferences exist", () => {
    const resolved = resolveEffectivePreferences([]);
    expect(getResolvedValue(resolved, "length")).toBe(SYSTEM_DEFAULTS.length);
    expect(getResolvedValue(resolved, "tone")).toBe(SYSTEM_DEFAULTS.tone);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TONE PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Tone", () => {
  it("recommended tone from learned preference", () => {
    const prefs = [makePref("tone", "warm", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("explicit tone override", () => {
    const prefs = [makePref("tone", "warm", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs, {}, { tone: "playful" });
    expect(getResolvedValue(resolved, "tone")).toBe("playful");
  });

  it("professional context sets formal tone", () => {
    const contextOverrides = getContextOverrides("professional");
    const resolved = resolveEffectivePreferences([], contextOverrides);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
  });

  it("dating context sets playful tone", () => {
    const contextOverrides = getContextOverrides("dating");
    const resolved = resolveEffectivePreferences([], contextOverrides);
    expect(getResolvedValue(resolved, "tone")).toBe("playful");
  });

  it("conflict context sets warm/diplomatic tone", () => {
    const contextOverrides = getContextOverrides("conflict");
    const resolved = resolveEffectivePreferences([], contextOverrides);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("assertive preference preserved", () => {
    const prefs = [makePref("tone", "direct", 0.9, "explicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
  });

  it("diplomatic preference preserved", () => {
    const prefs = [makePref("tone", "warm", 0.9, "explicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. LENGTH PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Length", () => {
  it("concise preference", () => {
    const prefs = [makePref("length", "short", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "length")).toBe("short");
  });

  it("detailed preference", () => {
    const prefs = [makePref("length", "long", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "length")).toBe("long");
  });

  it("medium default", () => {
    const resolved = resolveEffectivePreferences([]);
    expect(getResolvedValue(resolved, "length")).toBe("medium");
  });

  it("context override for length", () => {
    const contextOverrides = getContextOverrides("academic");
    const resolved = resolveEffectivePreferences([], contextOverrides);
    expect(getResolvedValue(resolved, "length")).toBe("long");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LANGUAGE PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Language", () => {
  it("English preference", () => {
    const prefs = [makePref("slang", "none", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "slang")).toBe("none");
  });

  it("Telugu-English romanized preference preserved", () => {
    const prefs = [makePref("slang", "moderate", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "slang")).toBe("moderate");
  });

  it("Hindi-English style preserved", () => {
    const prefs = [makePref("slang", "heavy", 0.6, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "slang")).toBe("heavy");
  });

  it("session language override", () => {
    const prefs = [makePref("slang", "moderate", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs, {}, { slang: "none" });
    expect(getResolvedValue(resolved, "slang")).toBe("none");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. EMOJI PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Emoji", () => {
  it("no emoji preference", () => {
    const prefs = [makePref("emoji", "none", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
  });

  it("occasional emoji preference", () => {
    const prefs = [makePref("emoji", "minimal", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("minimal");
  });

  it("frequent emoji preference", () => {
    const prefs = [makePref("emoji", "heavy", 0.6, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("heavy");
  });

  it("context override for emoji", () => {
    const contextOverrides = getContextOverrides("professional");
    const resolved = resolveEffectivePreferences([], contextOverrides);
    expect(getResolvedValue(resolved, "emoji")).toBe("minimal");
  });

  it("conflict context suppresses emoji", () => {
    const contextOverrides = getContextOverrides("conflict");
    const resolved = resolveEffectivePreferences([], contextOverrides);
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. FORMALITY PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Formality", () => {
  it("formal preference", () => {
    const prefs = [makePref("formality", "formal", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
  });

  it("casual preference", () => {
    const prefs = [makePref("formality", "casual", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "formality")).toBe("casual");
  });

  it("very casual preference", () => {
    const prefs = [makePref("formality", "very_casual", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "formality")).toBe("very_casual");
  });

  it("very formal preference", () => {
    const prefs = [makePref("formality", "very_formal", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "formality")).toBe("very_formal");
  });

  it("context-specific formality", () => {
    const contextOverrides = getContextOverrides("academic");
    const resolved = resolveEffectivePreferences([], contextOverrides);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. DIRECTNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Directness", () => {
  it("direct tone preference", () => {
    const prefs = [makePref("tone", "direct", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
  });

  it("indirect question style", () => {
    const prefs = [makePref("question_style", "indirect", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "question_style")).toBe("indirect");
  });

  it("exploratory question style", () => {
    const prefs = [makePref("question_style", "exploratory", 0.6, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "question_style")).toBe("exploratory");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. STYLE PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Style", () => {
  it("humor preference", () => {
    const prefs = [makePref("humor", "moderate", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "humor")).toBe("moderate");
  });

  it("emotional expression preference", () => {
    const prefs = [makePref("emotional_expression", "open", 0.6, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emotional_expression")).toBe("open");
  });

  it("punctuation preference", () => {
    const prefs = [makePref("punctuation", "expressive", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "punctuation")).toBe("expressive");
  });

  it("slang preference", () => {
    const prefs = [makePref("slang", "moderate", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "slang")).toBe("moderate");
  });

  it("warmth from tone", () => {
    const prefs = [makePref("tone", "warm", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("humor from tone", () => {
    const prefs = [makePref("tone", "playful", 0.7, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("playful");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. CONTEXT-SPECIFIC PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Context-Specific", () => {
  it("professional context", () => {
    const overrides = getContextOverrides("professional");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
    expect(getResolvedValue(resolved, "emoji")).toBe("minimal");
  });

  it("dating context", () => {
    const overrides = getContextOverrides("dating");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("casual");
    expect(getResolvedValue(resolved, "tone")).toBe("playful");
  });

  it("conflict context", () => {
    const overrides = getContextOverrides("conflict");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
  });

  it("academic context", () => {
    const overrides = getContextOverrides("academic");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
    expect(getResolvedValue(resolved, "length")).toBe("long");
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
  });

  it("interview context", () => {
    const overrides = getContextOverrides("interview");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
    expect(getResolvedValue(resolved, "slang")).toBe("none");
  });

  it("friendship context", () => {
    const overrides = getContextOverrides("friendship");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("casual");
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("family context", () => {
    const overrides = getContextOverrides("family");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("casual");
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("negotiation context", () => {
    const overrides = getContextOverrides("negotiation");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
    expect(getResolvedValue(resolved, "formality")).toBe("neutral");
  });

  it("customer context", () => {
    const overrides = getContextOverrides("customer");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
  });

  it("group context", () => {
    const overrides = getContextOverrides("group");
    const resolved = resolveEffectivePreferences([], overrides);
    expect(getResolvedValue(resolved, "formality")).toBe("casual");
    expect(getResolvedValue(resolved, "tone")).toBe("neutral");
  });

  it("unknown context returns empty overrides", () => {
    const overrides = getContextOverrides("unknown");
    expect(Object.keys(overrides)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. IMPROVEMENT MODE RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Improvement Mode", () => {
  it("shorter preference recommends more_concise", () => {
    const mode = getRecommendedMode("shorter", null, null);
    expect(mode).toBe("more_concise");
  });

  it("clearer preference recommends keep_meaning_improve_clarity", () => {
    const mode = getRecommendedMode("clearer", null, null);
    expect(mode).toBe("keep_meaning_improve_clarity");
  });

  it("warmer preference recommends more_empathetic", () => {
    const mode = getRecommendedMode("warmer", null, null);
    expect(mode).toBe("more_empathetic");
  });

  it("more_formal preference recommends more_professional", () => {
    const mode = getRecommendedMode("more_formal", null, null);
    expect(mode).toBe("more_professional");
  });

  it("more_casual preference recommends more_natural", () => {
    const mode = getRecommendedMode("more_casual", null, null);
    expect(mode).toBe("more_natural");
  });

  it("warm tone fallback", () => {
    const mode = getRecommendedMode(null, "warm", null);
    expect(mode).toBe("more_empathetic");
  });

  it("direct tone fallback", () => {
    const mode = getRecommendedMode(null, "direct", null);
    expect(mode).toBe("more_assertive");
  });

  it("playful tone fallback", () => {
    const mode = getRecommendedMode(null, "playful", null);
    expect(mode).toBe("more_playful");
  });

  it("formal tone fallback", () => {
    const mode = getRecommendedMode(null, "formal", null);
    expect(mode).toBe("more_professional");
  });

  it("short length fallback", () => {
    const mode = getRecommendedMode(null, null, "short");
    expect(mode).toBe("more_concise");
  });

  it("long length fallback", () => {
    const mode = getRecommendedMode(null, null, "long");
    expect(mode).toBe("keep_meaning_improve_clarity");
  });

  it("no preference returns null", () => {
    const mode = getRecommendedMode(null, null, null);
    expect(mode).toBeNull();
  });

  it("improvement_mode takes priority over tone", () => {
    const mode = getRecommendedMode("shorter", "warm", null);
    expect(mode).toBe("more_concise");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. GOAL RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Goal Recommendations", () => {
  it("natural strategy recommends keep_going", () => {
    const goal = getRecommendedGoal("natural");
    expect(goal).toBe("keep_going");
  });

  it("professional strategy recommends be_confident", () => {
    const goal = getRecommendedGoal("professional");
    expect(goal).toBe("be_confident");
  });

  it("concise strategy recommends reply_casually", () => {
    const goal = getRecommendedGoal("concise");
    expect(goal).toBe("reply_casually");
  });

  it("empathetic strategy recommends show_interest", () => {
    const goal = getRecommendedGoal("empathetic");
    expect(goal).toBe("show_interest");
  });

  it("playful strategy recommends make_them_laugh", () => {
    const goal = getRecommendedGoal("playful");
    expect(goal).toBe("make_them_laugh");
  });

  it("flirty strategy recommends flirt_naturally", () => {
    const goal = getRecommendedGoal("flirty");
    expect(goal).toBe("flirt_naturally");
  });

  it("unknown strategy returns null", () => {
    const goal = getRecommendedGoal("unknown");
    expect(goal).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. COLD START
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Cold Start", () => {
  it("no preferences returns all defaults", () => {
    const resolved = resolveEffectivePreferences([]);
    const dimensions = Object.keys(SYSTEM_DEFAULTS) as PreferenceDimension[];
    for (const dim of dimensions) {
      expect(getResolvedValue(resolved, dim)).toBe(SYSTEM_DEFAULTS[dim]);
      expect(getResolvedConfidence(resolved, dim)).toBe(0);
      expect(getResolvedSource(resolved, dim)).toBe("default");
    }
  });

  it("single weak preference has limited influence", () => {
    const prefs = [makePref("tone", "warm", 0.35, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
    expect(getResolvedConfidence(resolved, "tone")).toBe(0.35);
  });

  it("sparse profile with few dimensions", () => {
    const prefs = [makePref("length", "short", 0.6, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    // Only length should be influenced
    expect(getResolvedValue(resolved, "length")).toBe("short");
    expect(getResolvedValue(resolved, "tone")).toBe("neutral");
    expect(getResolvedValue(resolved, "emoji")).toBe("minimal");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. STRONG vs WEAK SIGNALS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Strong vs Weak Signals", () => {
  it("explicit preference is strong signal", () => {
    const prefs = [makePref("formality", "formal", 0.9, "explicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
    expect(getResolvedSource(resolved, "formality")).toBe("explicit");
  });

  it("repeated selection builds strong learned preference", () => {
    const prefs = [makePref("tone", "direct", 0.85, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
    expect(getResolvedConfidence(resolved, "tone")).toBeGreaterThanOrEqual(0.7);
  });

  it("single selection is weak signal", () => {
    const prefs = [makePref("emoji", "heavy", 0.35, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("heavy");
    expect(getResolvedConfidence(resolved, "emoji")).toBeLessThan(0.7);
  });

  it("one copy is weak signal", () => {
    const prefs = [makePref("length", "short", 0.3, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedConfidence(resolved, "length")).toBeLessThan(0.5);
  });

  it("regeneration is weak negative signal", () => {
    const prefs = [makePref("tone", "playful", 0.3, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedConfidence(resolved, "tone")).toBeLessThan(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. NEGATIVE FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Negative Feedback", () => {
  it("too formal feedback reduces formality confidence", () => {
    const prefs = [makePref("formality", "formal", 0.3, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedConfidence(resolved, "formality")).toBeLessThan(0.5);
  });

  it("too long feedback reduces length confidence", () => {
    const prefs = [makePref("length", "long", 0.3, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedConfidence(resolved, "length")).toBeLessThan(0.5);
  });

  it("too aggressive feedback reduces direct tone confidence", () => {
    const prefs = [makePref("tone", "direct", 0.3, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedConfidence(resolved, "tone")).toBeLessThan(0.5);
  });

  it("wrong language feedback reduces slang confidence", () => {
    const prefs = [makePref("slang", "heavy", 0.3, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedConfidence(resolved, "slang")).toBeLessThan(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. CONFLICTING SIGNALS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Conflicting Signals", () => {
  it("global vs context — context wins", () => {
    const prefs = [makePref("formality", "casual", 0.8, "implicit")];
    const contextOverrides = getContextOverrides("professional");
    const resolved = resolveEffectivePreferences(prefs, contextOverrides);
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
  });

  it("explicit vs learned — explicit wins", () => {
    const prefs = [
      makePref("tone", "direct", 0.9, "explicit"),
      makePref("tone", "warm", 0.8, "implicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
  });

  it("current instruction vs saved — instruction wins", () => {
    const prefs = [makePref("tone", "direct", 0.9, "explicit")];
    const resolved = resolveEffectivePreferences(prefs, {}, { tone: "warm" });
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("strong vs weak — strong wins", () => {
    const prefs = [
      makePref("emoji", "none", 0.8, "implicit"),
      makePref("emoji", "heavy", 0.4, "implicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. USER OVERRIDES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: User Overrides", () => {
  it("override temporarily changes preference", () => {
    const prefs = [makePref("tone", "direct", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs, {}, { tone: "warm" });
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
    // Original preference unchanged
    expect(prefs[0].value).toBe("direct");
  });

  it("override does not permanently modify saved preference", () => {
    const prefs = [makePref("length", "short", 0.9, "explicit")];
    const resolved = resolveEffectivePreferences(prefs, {}, { length: "long" });
    expect(getResolvedValue(resolved, "length")).toBe("long");
    // Saved preference unchanged
    expect(prefs[0].value).toBe("short");
  });

  it("session override has confidence 1.0", () => {
    const resolved = resolveEffectivePreferences([], {}, { tone: "playful" });
    expect(getResolvedConfidence(resolved, "tone")).toBe(1.0);
    expect(getResolvedSource(resolved, "tone")).toBe("explicit");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 20. BUILD SESSION OVERRIDES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Build Session Overrides", () => {
  it("builds overrides from UI selections", () => {
    const overrides = buildSessionOverrides({
      selectedTone: "warm",
      selectedLength: "short",
      selectedFormality: "formal",
      selectedEmoji: "none",
    });
    expect(overrides.tone).toBe("warm");
    expect(overrides.length).toBe("short");
    expect(overrides.formality).toBe("formal");
    expect(overrides.emoji).toBe("none");
  });

  it("ignores undefined selections", () => {
    const overrides = buildSessionOverrides({});
    expect(Object.keys(overrides)).toHaveLength(0);
  });

  it("maps improvement mode", () => {
    const overrides = buildSessionOverrides({
      selectedImprovementMode: "clearer",
    });
    expect(overrides.improvement_mode).toBe("clearer");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 21. PROMPT PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Prompt Profile", () => {
  it("builds compact profile from resolved preferences", () => {
    const prefs = [
      makePref("length", "short", 0.8, "implicit"),
      makePref("tone", "direct", 0.7, "implicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);
    const compact = buildPromptProfile(resolved);

    expect(compact.dimensions.length?.value).toBe("short");
    expect(compact.dimensions.tone?.value).toBe("direct");
  });

  it("filters low confidence dimensions", () => {
    const prefs = [makePref("emoji", "heavy", 0.2, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    const compact = buildPromptProfile(resolved, 0.3);

    expect(compact.dimensions.emoji).toBeUndefined();
  });

  it("formats profile for prompt", () => {
    const prefs = [makePref("length", "short", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    const compact = buildPromptProfile(resolved);
    const formatted = formatProfileForPrompt(compact);

    expect(formatted).toContain("length");
    expect(formatted).toContain("short");
  });

  it("empty profile returns empty string", () => {
    const resolved = resolveEffectivePreferences([]);
    const compact = buildPromptProfile(resolved, 0.5);
    const formatted = formatProfileForPrompt(compact);

    expect(formatted).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 22. CONFIDENCE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Confidence Thresholds", () => {
  it("high confidence >= 0.7", () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.7);
  });

  it("medium confidence >= 0.3", () => {
    expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.3);
  });

  it("low confidence >= 0.1", () => {
    expect(CONFIDENCE_THRESHOLDS.LOW).toBe(0.1);
  });

  it("confidence at exact threshold is included", () => {
    const prefs = [makePref("tone", "warm", 0.3, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("confidence just below threshold is excluded", () => {
    const prefs = [makePref("tone", "warm", 0.29, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("neutral");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 23. VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Validation", () => {
  it("valid preference values are accepted", () => {
    expect(isValidPreferenceValue("length", "short")).toBe(true);
    expect(isValidPreferenceValue("tone", "warm")).toBe(true);
    expect(isValidPreferenceValue("emoji", "none")).toBe(true);
  });

  it("invalid preference values are rejected", () => {
    expect(isValidPreferenceValue("length", "tiny")).toBe(false);
    expect(isValidPreferenceValue("tone", "angry")).toBe(false);
    expect(isValidPreferenceValue("emoji", "lots")).toBe(false);
  });

  it("default preferences are valid", () => {
    const dimensions = Object.keys(SYSTEM_DEFAULTS) as PreferenceDimension[];
    for (const dim of dimensions) {
      expect(isValidPreferenceValue(dim, SYSTEM_DEFAULTS[dim])).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 24. DEFAULT PREFERENCE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Default Helper", () => {
  it("returns correct default for each dimension", () => {
    expect(getDefaultPreference("length")).toBe("medium");
    expect(getDefaultPreference("emoji")).toBe("minimal");
    expect(getDefaultPreference("formality")).toBe("casual");
    expect(getDefaultPreference("tone")).toBe("neutral");
    expect(getDefaultPreference("punctuation")).toBe("standard");
    expect(getDefaultPreference("slang")).toBe("none");
    expect(getDefaultPreference("question_style")).toBe("direct");
    expect(getDefaultPreference("humor")).toBe("subtle");
    expect(getDefaultPreference("emotional_expression")).toBe("moderate");
    expect(getDefaultPreference("improvement_mode")).toBe("clearer");
    expect(getDefaultPreference("default_tone")).toBe("neutral");
    expect(getDefaultPreference("strategy_preference")).toBe("natural");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 25. MULTI-DIMENSION INTERACTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Multi-Dimension", () => {
  it("multiple dimensions resolved independently", () => {
    const prefs = [
      makePref("length", "short", 0.8, "implicit"),
      makePref("tone", "direct", 0.7, "implicit"),
      makePref("emoji", "none", 0.6, "implicit"),
      makePref("formality", "formal", 0.9, "explicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);

    expect(getResolvedValue(resolved, "length")).toBe("short");
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
    expect(getResolvedValue(resolved, "emoji")).toBe("none");
    expect(getResolvedValue(resolved, "formality")).toBe("formal");
  });

  it("partial preferences with defaults for rest", () => {
    const prefs = [makePref("tone", "warm", 0.8, "implicit")];
    const resolved = resolveEffectivePreferences(prefs);

    expect(getResolvedValue(resolved, "tone")).toBe("warm");
    expect(getResolvedValue(resolved, "length")).toBe("medium");
    expect(getResolvedValue(resolved, "emoji")).toBe("minimal");
    expect(getResolvedValue(resolved, "formality")).toBe("casual");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 26. CONTEXT-SPECIFIC POSITIVE SIGNALS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Context-Specific Signals", () => {
  it("professional assertive preference", () => {
    const prefs = [makePref("tone", "direct", 0.8, "implicit", "professional")];
    const resolved = resolveEffectivePreferences(prefs, {}, {}, {}, "professional");
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
  });

  it("dating playful preference", () => {
    const prefs = [makePref("tone", "playful", 0.8, "implicit", "dating")];
    const resolved = resolveEffectivePreferences(prefs, {}, {}, {}, "dating");
    expect(getResolvedValue(resolved, "tone")).toBe("playful");
  });

  it("conflict diplomatic preference", () => {
    const prefs = [makePref("tone", "warm", 0.8, "implicit", "conflict")];
    const resolved = resolveEffectivePreferences(prefs, {}, {}, {}, "conflict");
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });

  it("academic concise preference", () => {
    const prefs = [makePref("length", "short", 0.7, "implicit", "academic")];
    const resolved = resolveEffectivePreferences(prefs, {}, {}, {}, "academic");
    expect(getResolvedValue(resolved, "length")).toBe("short");
  });

  it("context-specific does not leak to other contexts", () => {
    const prefs = [makePref("tone", "direct", 0.8, "implicit", "professional")];
    const resolved = resolveEffectivePreferences(prefs, {}, {}, {}, "dating");
    // Should use default since professional preference doesn't apply to dating
    expect(getResolvedValue(resolved, "tone")).toBe("neutral");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 27. EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Effective Preferences: Edge Cases", () => {
  it("handles duplicate dimensions by taking highest confidence", () => {
    const prefs = [
      makePref("tone", "warm", 0.6, "implicit"),
      makePref("tone", "direct", 0.8, "implicit"),
    ];
    const resolved = resolveEffectivePreferences(prefs);
    expect(getResolvedValue(resolved, "tone")).toBe("direct");
  });

  it("handles empty context string", () => {
    const resolved = resolveEffectivePreferences([], {}, {}, {}, "");
    expect(getResolvedValue(resolved, "tone")).toBe("neutral");
  });

  it("handles undefined context", () => {
    const resolved = resolveEffectivePreferences([], {}, {}, {}, undefined);
    expect(getResolvedValue(resolved, "tone")).toBe("neutral");
  });

  it("safety constraints override everything", () => {
    const prefs = [makePref("tone", "direct", 0.9, "explicit")];
    const safetyConstraints = { tone: "warm" };
    const resolved = resolveEffectivePreferences(prefs, {}, {}, safetyConstraints);
    expect(getResolvedValue(resolved, "tone")).toBe("warm");
  });
});
