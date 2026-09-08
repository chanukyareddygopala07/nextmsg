"use client";

import { useEffect } from "react";
import {
  useEffectivePreferences,
  CONFIDENCE_THRESHOLDS,
  type EffectivePreferencesHook,
} from "@/lib/ai/effective-preferences";
import type { PreferenceDimension } from "@/lib/ai/personalization-types";
import { DIMENSION_VALUES } from "@/lib/ai/personalization-types";

// ─── Preference Chips ─────────────────────────────────────────────────────────
// Shows recommended values with optional selection.
// Used in: tone selector, improvement mode selector, language selector.
// ──────────────────────────────────────────────────────────────────────────────

interface PreferenceChipsProps {
  /** Which preference dimension to show chips for */
  dimension: PreferenceDimension;
  /** All available options for this dimension */
  options: string[];
  /** Currently selected value */
  selected: string | null;
  /** Called when user selects a value */
  onSelect: (value: string) => void;
  /** Optional context override */
  context?: string;
  /** Show recommendation labels */
  showRecommendations?: boolean;
  /** Show confidence indicators */
  showConfidence?: boolean;
  /** Compact mode (smaller chips) */
  compact?: boolean;
  /** Effective preferences hook (optional — will create own if not provided) */
  prefs?: EffectivePreferencesHook;
}

export function PreferenceChips({
  dimension,
  options,
  selected,
  onSelect,
  context,
  showRecommendations = true,
  showConfidence = false,
  compact = false,
  prefs: externalPrefs,
}: PreferenceChipsProps) {
  const internalPrefs = useEffectivePreferences(context);
  const prefs = externalPrefs || internalPrefs;

  const recommendation = showRecommendations ? prefs.getRecommendation(dimension) : null;
  const confidenceLevel = prefs.getConfidenceLevel(dimension);
  const source = prefs.getSource(dimension);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((value) => {
        const isRecommended = recommendation === value;
        const isSelected = selected === value;
        const conf = prefs.getConfidence(dimension);

        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`
              ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}
              rounded-xl transition-all relative
              ${
                isSelected
                  ? "bg-white text-black font-medium"
                  : isRecommended
                  ? "bg-white/10 border border-white/20 text-white/80 hover:bg-white/15"
                  : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
              }
            `}
            aria-pressed={isSelected}
            aria-label={`${prefs.formatValueLabel(dimension, value)}${isRecommended ? " (recommended)" : ""}`}
          >
            {prefs.formatValueLabel(dimension, value)}
            {isRecommended && showRecommendations && (
              <span className="ml-1 text-[10px] text-white/40">★</span>
            )}
          </button>
        );
      })}
      {showConfidence && confidenceLevel !== "none" && (
        <ConfidenceBadge level={confidenceLevel} source={source} />
      )}
    </div>
  );
}

// ─── Recommendation Badge ─────────────────────────────────────────────────────

interface RecommendationBadgeProps {
  /** Whether this option is recommended */
  isRecommended: boolean;
  /** Optional explanation text */
  explanation?: string;
  /** Compact mode */
  compact?: boolean;
}

export function RecommendationBadge({
  isRecommended,
  explanation,
  compact = false,
}: RecommendationBadgeProps) {
  if (!isRecommended) return null;

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}
        bg-white/10 text-white/50 rounded-full
      `}
      title={explanation || "Recommended based on your preferences"}
    >
      <span className="text-white/40">★</span>
      Recommended
    </span>
  );
}

// ─── Confidence Badge ─────────────────────────────────────────────────────────

interface ConfidenceBadgeProps {
  level: "high" | "medium" | "low" | "none";
  source: "explicit" | "learned" | "default";
  compact?: boolean;
}

function ConfidenceBadge({ level, source, compact = false }: ConfidenceBadgeProps) {
  const levelConfig = {
    high: { label: "Strong", color: "text-green-400/70" },
    medium: { label: "Moderate", color: "text-yellow-400/70" },
    low: { label: "Weak", color: "text-white/30" },
    none: { label: "No data", color: "text-white/20" },
  };

  const config = levelConfig[level];
  const sourceLabel = source === "explicit" ? " (saved)" : source === "learned" ? " (learned)" : "";

  return (
    <span
      className={`
        ${compact ? "text-[10px]" : "text-xs"}
        ${config.color}
        ml-1
      `}
      title={`Confidence: ${level}${sourceLabel}`}
    >
      {config.label}
    </span>
  );
}

// ─── Preference Panel ─────────────────────────────────────────────────────────
// Summary panel showing all effective preferences.
// Used in: settings, workspace header, analyze page.
// ──────────────────────────────────────────────────────────────────────────────

interface PreferencePanelProps {
  /** Dimensions to show */
  dimensions?: PreferenceDimension[];
  /** Context for resolution */
  context?: string;
  /** Show explanations */
  showExplanations?: boolean;
  /** Compact mode */
  compact?: boolean;
}

export function PreferencePanel({
  dimensions,
  context,
  showExplanations = true,
  compact = false,
}: PreferencePanelProps) {
  const prefs = useEffectivePreferences(context);

  const dims = dimensions || ([
    "length",
    "tone",
    "formality",
    "emoji",
    "strategy_preference",
  ] as PreferenceDimension[]);

  if (!prefs.settings.enabled) {
    return (
      <div className={`${compact ? "text-xs" : "text-sm"} text-white/30`}>
        Personalization is paused.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dims.map((dim) => {
        const value = prefs.getRecommendation(dim);
        const level = prefs.getConfidenceLevel(dim);
        const source = prefs.getSource(dim);

        if (level === "none" || !value) return null;

        const explanation =
          source === "explicit"
            ? "You set this preference"
            : source === "learned"
            ? "Based on your previous choices"
            : "Default";

        return (
          <div
            key={dim}
            className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}
          >
            <span className="text-white/40 w-24 shrink-0">
              {prefs.formatDimensionLabel(dim)}
            </span>
            <span className="text-white/70 font-medium">
              {prefs.formatValueLabel(dim, value)}
            </span>
            <ConfidenceBadge level={level} source={source} compact={compact} />
            {showExplanations && (
              <span className="text-white/30 text-xs ml-auto">{explanation}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── First-Run Indicator ──────────────────────────────────────────────────────

interface FirstRunIndicatorProps {
  /** Whether the user has any learned preferences */
  hasPreferences: boolean;
  /** Whether preferences are loading */
  isLoading: boolean;
}

export function FirstRunIndicator({ hasPreferences, isLoading }: FirstRunIndicatorProps) {
  if (isLoading || hasPreferences) return null;

  return (
    <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/30">
      <p>
        NextMsg learns your communication style from your choices.
        The more you use it, the better your recommendations become.
      </p>
    </div>
  );
}
