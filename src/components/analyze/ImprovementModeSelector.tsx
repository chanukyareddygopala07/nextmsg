"use client";

import type { ImprovementMode } from "@/lib/ai/draft-types";

interface ImprovementModeSelectorProps {
  onSelect: (mode: ImprovementMode) => void;
  isLoading?: boolean;
  /** Recommended mode from effective preferences */
  recommendedMode?: ImprovementMode | null;
  /** Whether recommendations are enabled */
  showRecommendations?: boolean;
}

const MODES: Array<{
  mode: ImprovementMode;
  label: string;
  description: string;
  mapsFrom: string[];
}> = [
  { mode: "keep_meaning_improve_clarity", label: "Improve Clarity", description: "Keep your meaning, make it clearer", mapsFrom: ["clearer"] },
  { mode: "more_professional", label: "More Professional", description: "Make it sound more professional", mapsFrom: ["formal", "professional"] },
  { mode: "more_diplomatic", label: "More Diplomatic", description: "Soften the approach while keeping your point", mapsFrom: ["warm", "empathetic"] },
  { mode: "more_assertive", label: "More Assertive", description: "Make your position stronger", mapsFrom: ["direct"] },
  { mode: "more_empathetic", label: "More Empathetic", description: "Add more understanding", mapsFrom: ["warm", "empathetic"] },
  { mode: "more_concise", label: "More Concise", description: "Say the same thing in fewer words", mapsFrom: ["short", "concise"] },
  { mode: "more_persuasive", label: "More Persuasive", description: "Make a stronger case", mapsFrom: ["professional", "direct"] },
  { mode: "more_natural", label: "More Natural", description: "Sound more like a real person", mapsFrom: ["natural", "casual"] },
  { mode: "more_playful", label: "More Playful", description: "Add some humor or lightness", mapsFrom: ["playful"] },
  { mode: "more_flirty", label: "More Flirty", description: "Add romantic interest", mapsFrom: ["flirty"] },
];

/** Map effective preference dimensions to an improvement mode recommendation */
export function getRecommendedMode(
  improvementModePref: string | null,
  tonePref: string | null,
  lengthPref: string | null
): ImprovementMode | null {
  // Priority: explicit improvement_mode preference > tone > length
  if (improvementModePref) {
    const modeMap: Record<string, ImprovementMode> = {
      shorter: "more_concise",
      clearer: "keep_meaning_improve_clarity",
      warmer: "more_empathetic",
      more_formal: "more_professional",
      more_casual: "more_natural",
    };
    return modeMap[improvementModePref] || null;
  }

  if (tonePref) {
    const toneModeMap: Record<string, ImprovementMode> = {
      warm: "more_empathetic",
      direct: "more_assertive",
      playful: "more_playful",
      formal: "more_professional",
    };
    return toneModeMap[tonePref] || null;
  }

  if (lengthPref === "short") return "more_concise";
  if (lengthPref === "long") return "keep_meaning_improve_clarity";

  return null;
}

export default function ImprovementModeSelector({
  onSelect,
  isLoading,
  recommendedMode: propRecommended,
  showRecommendations = true,
}: ImprovementModeSelectorProps) {
  const recommended = propRecommended || null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-white/70 mb-2">How would you like to improve it?</h4>
        <p className="text-xs text-white/40 mb-3">
          Choose a direction. Your meaning and facts will be preserved.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const isRecommended = showRecommendations && recommended === m.mode;
          return (
            <button
              key={m.mode}
              onClick={() => onSelect(m.mode)}
              disabled={isLoading}
              className={`text-left px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${
                isRecommended
                  ? "bg-white/10 border border-white/20 text-white/80 hover:bg-white/15"
                  : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{m.label}</span>
                {isRecommended && (
                  <span className="text-[10px] text-white/40">★ Recommended</span>
                )}
              </div>
              <span className="block text-xs text-white/40">{m.description}</span>
            </button>
          );
        })}
      </div>
      {showRecommendations && recommended && (
        <p className="text-xs text-white/30">
          Recommended based on your communication preferences.
        </p>
      )}
    </div>
  );
}
