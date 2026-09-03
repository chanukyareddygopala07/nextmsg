"use client";

import type { GoalType } from "@/types/conversation";

interface GoalSelectorProps {
  selected?: GoalType;
  onSelect: (goal: GoalType) => void;
}

const goals: { value: GoalType; label: string; icon: string }[] = [
  { value: "keep_going", label: "Keep going", icon: "💬" },
  { value: "start_conversation", label: "Start conversation", icon: "👋" },
  { value: "make_them_laugh", label: "Make them laugh", icon: "😂" },
  { value: "flirt_naturally", label: "Flirt naturally", icon: "😏" },
  { value: "be_confident", label: "Be confident", icon: "💪" },
  { value: "show_interest", label: "Show interest", icon: "👀" },
  { value: "ask_them_out", label: "Ask them out", icon: "☕" },
  { value: "recover_dry", label: "Recover a dry chat", icon: "🔄" },
  { value: "change_topic", label: "Change topic", icon: "🔀" },
  { value: "reply_to_story", label: "Reply to story", icon: "📱" },
  { value: "reconnect", label: "Reconnect", icon: "🫂" },
  { value: "reply_casually", label: "Reply casually", icon: "😎" },
  { value: "end_conversation", label: "End politely", icon: "👋" },
];

export default function GoalSelector({ selected, onSelect }: GoalSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-white/60 mb-3">What&apos;s your goal?</h3>
      <div className="flex flex-wrap gap-2">
        {goals.map((goal) => (
          <button
            key={goal.value}
            onClick={() => onSelect(goal.value)}
            className={`px-3 py-2 rounded-xl text-sm transition-all ${
              selected === goal.value
                ? "bg-white text-black font-medium"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10"
            }`}
          >
            <span className="mr-1.5">{goal.icon}</span>
            {goal.label}
          </button>
        ))}
      </div>
    </div>
  );
}
