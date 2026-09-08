// ─── Effective Preferences Hook ───────────────────────────────────────────────
//
// Client-side hook for resolving effective preferences for the current session.
// Combines learned preferences from the API with context and session overrides.
// Provides the single entry point for all personalization decisions in the UI.
//
// Architecture:
//   Fetches preferences once per session
//   Resolves effective preferences based on context + overrides
//   Provides recommendation helpers for UI components
//   Never triggers AI calls — purely deterministic resolution
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  resolveEffectivePreferences,
  buildPromptProfile,
  formatProfileForPrompt,
} from "@/lib/ai/preference-resolver";
import type {
  PreferenceDimension,
  LearnedPreference,
  ResolvedPreferences,
  CompactPreferenceProfile,
  PersonalizationSettings,
  DIMENSION_VALUES,
} from "@/lib/ai/personalization-types";
import { SYSTEM_DEFAULTS } from "@/lib/ai/personalization-types";

// ─── Confidence Thresholds ────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.3,
  LOW: 0.1,
} as const;

// ─── Session Cache ────────────────────────────────────────────────────────────

interface PreferenceCache {
  preferences: LearnedPreference[];
  settings: PersonalizationSettings;
  resolved: ResolvedPreferences | null;
  compact: CompactPreferenceProfile | null;
  fetchedAt: number;
}

let sessionCache: PreferenceCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Hook Return Type ────────────────────────────────────────────────────────

export interface EffectivePreferencesHook {
  // ── State ──
  preferences: LearnedPreference[];
  settings: PersonalizationSettings;
  resolved: ResolvedPreferences | null;
  compact: CompactPreferenceProfile | null;
  formattedProfile: string;
  isLoading: boolean;
  error: string | null;

  // ── Actions ──
  fetchPreferences: () => Promise<void>;
  resolveForContext: (
    context?: string,
    sessionOverrides?: Partial<Record<PreferenceDimension, string>>
  ) => ResolvedPreferences;
  getRecommendation: (dimension: PreferenceDimension) => string | null;
  getConfidence: (dimension: PreferenceDimension) => number;
  getSource: (dimension: PreferenceDimension) => "explicit" | "learned" | "default";
  isRecommended: (dimension: PreferenceDimension, value: string) => boolean;
  getConfidenceLevel: (dimension: PreferenceDimension) => "high" | "medium" | "low" | "none";
  shouldShowRecommendation: (dimension: PreferenceDimension) => boolean;
  formatDimensionLabel: (dimension: PreferenceDimension) => string;
  formatValueLabel: (dimension: PreferenceDimension, value: string) => string;
}

// ─── Hook Implementation ─────────────────────────────────────────────────────

export function useEffectivePreferences(
  contextOverride?: string,
  sessionOverrides?: Partial<Record<PreferenceDimension, string>>
): EffectivePreferencesHook {
  const [preferences, setPreferences] = useState<LearnedPreference[]>([]);
  const [settings, setSettings] = useState<PersonalizationSettings>({
    enabled: true,
    learningEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // ── Fetch preferences from API ──
  const fetchPreferences = useCallback(async () => {
    // Check cache
    if (sessionCache && Date.now() - sessionCache.fetchedAt < CACHE_TTL_MS) {
      setPreferences(sessionCache.preferences);
      setSettings(sessionCache.settings);
      fetchedRef.current = true;
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      const data = await res.json();

      const prefs = data.preferences || [];
      const sets = data.settings || { enabled: true, learningEnabled: true };

      setPreferences(prefs);
      setSettings(sets);

      // Cache
      sessionCache = {
        preferences: prefs,
        settings: sets,
        resolved: null,
        compact: null,
        fetchedAt: Date.now(),
      };

      fetchedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preferences");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Auto-fetch on mount ──
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchPreferences();
    }
  }, [fetchPreferences]);

  // ── Resolve effective preferences for context ──
  const resolveForContext = useCallback(
    (
      context?: string,
      overrides?: Partial<Record<PreferenceDimension, string>>
    ): ResolvedPreferences => {
      const resolved = resolveEffectivePreferences(
        preferences,
        {}, // contextOverrides (from conversation context)
        overrides || sessionOverrides || {},
        {}, // safetyConstraints
        context || contextOverride
      );

      return resolved;
    },
    [preferences, contextOverride, sessionOverrides]
  );

  // ── Memoized resolved preferences ──
  const resolved = useMemo(() => {
    return resolveForContext(contextOverride, sessionOverrides);
  }, [resolveForContext, contextOverride, sessionOverrides]);

  const compact = useMemo(() => {
    return buildPromptProfile(resolved);
  }, [resolved]);

  const formattedProfile = useMemo(() => {
    return formatProfileForPrompt(compact);
  }, [compact]);

  // ── Recommendation helpers ──
  const getRecommendation = useCallback(
    (dimension: PreferenceDimension): string | null => {
      if (!settings.enabled) return null;
      const conf = resolved.confidence[dimension];
      if (conf < CONFIDENCE_THRESHOLDS.MEDIUM) return null;
      return resolved.preferences[dimension];
    },
    [resolved, settings.enabled]
  );

  const getConfidence = useCallback(
    (dimension: PreferenceDimension): number => {
      return resolved.confidence[dimension] || 0;
    },
    [resolved]
  );

  const getSource = useCallback(
    (dimension: PreferenceDimension): "explicit" | "learned" | "default" => {
      return resolved.sources[dimension] || "default";
    },
    [resolved]
  );

  const isRecommended = useCallback(
    (dimension: PreferenceDimension, value: string): boolean => {
      return resolved.preferences[dimension] === value;
    },
    [resolved]
  );

  const getConfidenceLevel = useCallback(
    (dimension: PreferenceDimension): "high" | "medium" | "low" | "none" => {
      const conf = resolved.confidence[dimension];
      if (conf >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
      if (conf >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
      if (conf >= CONFIDENCE_THRESHOLDS.LOW) return "low";
      return "none";
    },
    [resolved]
  );

  const shouldShowRecommendation = useCallback(
    (dimension: PreferenceDimension): boolean => {
      if (!settings.enabled) return false;
      const conf = resolved.confidence[dimension];
      return conf >= CONFIDENCE_THRESHOLDS.MEDIUM;
    },
    [resolved, settings.enabled]
  );

  // ── Formatting helpers ──
  const formatDimensionLabel = useCallback((dimension: PreferenceDimension): string => {
    const labels: Record<PreferenceDimension, string> = {
      length: "Length",
      emoji: "Emoji",
      formality: "Formality",
      tone: "Tone",
      punctuation: "Punctuation",
      slang: "Slang",
      question_style: "Question Style",
      humor: "Humor",
      emotional_expression: "Emotional Expression",
      improvement_mode: "Improvement",
      default_tone: "Default Tone",
      strategy_preference: "Strategy",
    };
    return labels[dimension] || dimension.replace(/_/g, " ");
  }, []);

  const formatValueLabel = useCallback(
    (dimension: PreferenceDimension, value: string): string => {
      const valueLabels: Record<string, string> = {
        short: "Short",
        medium: "Medium",
        long: "Long",
        none: "None",
        minimal: "Minimal",
        moderate: "Moderate",
        heavy: "Heavy",
        very_casual: "Very Casual",
        casual: "Casual",
        neutral: "Neutral",
        formal: "Formal",
        very_formal: "Very Formal",
        warm: "Warm",
        direct: "Direct",
        playful: "Playful",
        standard: "Standard",
        expressive: "Expressive",
        indirect: "Indirect",
        exploratory: "Exploratory",
        subtle: "Subtle",
        restrained: "Restrained",
        open: "Open",
        shorter: "Shorter",
        clearer: "Clearer",
        warmer: "Warmer",
        more_formal: "More Formal",
        more_casual: "More Casual",
        natural: "Natural",
        professional: "Professional",
        concise: "Concise",
        empathetic: "Empathetic",
        flirty: "Flirty",
      };
      return valueLabels[value] || value.replace(/_/g, " ");
    },
    []
  );

  return {
    preferences,
    settings,
    resolved,
    compact,
    formattedProfile,
    isLoading,
    error,
    fetchPreferences,
    resolveForContext,
    getRecommendation,
    getConfidence,
    getSource,
    isRecommended,
    getConfidenceLevel,
    shouldShowRecommendation,
    formatDimensionLabel,
    formatValueLabel,
  };
}

// ─── Context-Specific Defaults ────────────────────────────────────────────────

/** Get context-specific preference overrides */
export function getContextOverrides(
  contextType: string
): Partial<Record<PreferenceDimension, string>> {
  const contextMap: Record<string, Partial<Record<PreferenceDimension, string>>> = {
    professional: {
      formality: "formal",
      tone: "direct",
      emoji: "minimal",
      length: "medium",
      slang: "none",
      humor: "none",
    },
    dating: {
      formality: "casual",
      tone: "playful",
      emoji: "minimal",
      humor: "subtle",
    },
    conflict: {
      tone: "warm",
      formality: "neutral",
      emoji: "none",
      length: "medium",
    },
    academic: {
      formality: "formal",
      tone: "neutral",
      emoji: "none",
      length: "long",
      slang: "none",
    },
    interview: {
      formality: "formal",
      tone: "direct",
      emoji: "none",
      length: "medium",
      slang: "none",
    },
    friendship: {
      formality: "casual",
      tone: "warm",
      humor: "subtle",
    },
    family: {
      formality: "casual",
      tone: "warm",
      emoji: "minimal",
    },
    negotiation: {
      tone: "direct",
      formality: "neutral",
      length: "medium",
    },
    customer: {
      formality: "formal",
      tone: "warm",
      emoji: "none",
    },
    group: {
      formality: "casual",
      tone: "neutral",
      emoji: "minimal",
    },
  };
  return contextMap[contextType] || {};
}

// ─── Session Overrides from UI ────────────────────────────────────────────────

/** Build session overrides from user's current UI selections */
export function buildSessionOverrides(options: {
  selectedTone?: string;
  selectedLength?: string;
  selectedFormality?: string;
  selectedEmoji?: string;
  selectedLanguage?: string;
  selectedImprovementMode?: string;
}): Partial<Record<PreferenceDimension, string>> {
  const overrides: Partial<Record<PreferenceDimension, string>> = {};

  if (options.selectedTone) overrides.tone = options.selectedTone;
  if (options.selectedLength) overrides.length = options.selectedLength;
  if (options.selectedFormality) overrides.formality = options.selectedFormality;
  if (options.selectedEmoji) overrides.emoji = options.selectedEmoji;
  if (options.selectedImprovementMode) overrides.improvement_mode = options.selectedImprovementMode;

  return overrides;
}
