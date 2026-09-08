"use client";

import type { GoalType } from "@/types/conversation";
import { RecommendationBadge } from "@/components/analyze/PreferenceChips";

interface GoalSelectorProps {
  selected?: GoalType;
  onSelect: (goal: GoalType) => void;
  /** Recommended goal from effective preferences */
  recommendedGoal?: GoalType | null;
  /** Whether recommendations are enabled */
  showRecommendations?: boolean;
}

const goals: { value: GoalType; label: string; icon: string; tags: string[] }[] = [
  { value: "keep_going", label: "Keep going", icon: "💬", tags: ["casual", "natural"] },
  { value: "start_conversation", label: "Start conversation", icon: "👋", tags: ["friendly", "warm"] },
  { value: "make_them_laugh", label: "Make them laugh", icon: "😂", tags: ["playful", "humorous"] },
  { value: "flirt_naturally", label: "Flirt naturally", icon: "😏", tags: ["playful", "warm"] },
  { value: "be_confident", label: "Be confident", icon: "💪", tags: ["assertive", "direct"] },
  { value: "show_interest", label: "Show interest", icon: "👀", tags: ["warm", "empathetic"] },
  { value: "ask_them_out", label: "Ask them out", icon: "☕", tags: ["direct", "confident"] },
  { value: "recover_dry", label: "Recover a dry chat", icon: "🔄", tags: ["natural", "casual"] },
  { value: "change_topic", label: "Change topic", icon: "🔀", tags: ["casual", "natural"] },
  { value: "reply_to_story", label: "Reply to story", icon: "📱", tags: ["casual", "playful"] },
  { value: "reconnect", label: "Reconnect", icon: "🫂", tags: ["warm", "empathetic"] },
  { value: "reply_casually", label: "Reply casually", icon: "😎", tags: ["casual", "natural"] },
  { value: "end_conversation", label: "End politely", icon: "👋", tags: ["formal", "direct"] },
];

/** Map strategy preferences to likely goal recommendations */
function getRecommendedGoal(strategyPreference: string): GoalType | null {
  const strategyGoalMap: Record<string, GoalType> = {
    natural: "keep_going",
    professional: "be_confident",
    concise: "reply_casually",
    empathetic: "show_interest",
    playful: "make_them_laugh",
    flirty: "flirt_naturally",
  };
  return strategyGoalMap[strategyPreference] || null;
}

export default function GoalSelector({
  selected,
  onSelect,
  recommendedGoal: propRecommended,
  showRecommendations = true,
}: GoalSelectorProps) {
  const recommended = propRecommended || null;

  return (
    <div>
      <h3 className="text-sm font-medium text-white/60 mb-3">What&apos;s your goal?</h3>
      <div className="flex flex-wrap gap-2">
        {goals.map((goal) => {
          const isRecommended = showRecommendations && recommended === goal.value;
          return (
            <button
              key={goal.value}
              onClick={() => onSelect(goal.value)}
              className={`px-3 py-2 rounded-xl text-sm transition-all relative ${
                selected === goal.value
                  ? "bg-white text-black font-medium"
                  : isRecommended
                  ? "bg-white/10 border border-white/20 text-white/80 hover:bg-white/15"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10"
              }`}
            >
              <span className="mr-1.5">{goal.icon}</span>
              {goal.label}
              {isRecommended && (
                <span className="ml-1.5 text-[10px] text-white/40">★</span>
              )}
            </button>
          );
        })}
      </div>
      {showRecommendations && recommended && (
        <p className="text-xs text-white/30 mt-2">
          Recommended based on your communication style.
        </p>
      )}
    </div>
  );
}

export { getRecommendedGoal };
