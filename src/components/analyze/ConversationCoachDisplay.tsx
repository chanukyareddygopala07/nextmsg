"use client";

import Card from "@/components/ui/Card";
import type { ConversationCoachingResult } from "@/lib/ai/coaching-types";

interface ConversationCoachDisplayProps {
  coaching: ConversationCoachingResult;
  onGenerateReply?: () => void;
  isGenerating?: boolean;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    urgent: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    low: "bg-white/10 text-white/60 border-white/20",
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${config[priority as keyof typeof config] || config.low}`}>
      {priority}
    </span>
  );
}

function TimingBadge({ when, urgency }: { when: string; urgency: number }) {
  const labels: Record<string, string> = {
    immediately: "Respond now",
    within_minutes: "Soon",
    within_hours: "Within hours",
    within_day: "Today",
    wait_for_response: "Wait",
    wait_for_right_moment: "Right moment",
    no_response_needed: "No response needed",
  };
  const urgencyPercent = Math.round(urgency * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white font-medium">{labels[when] || when}</span>
      <span className="text-xs text-white/40">({urgencyPercent}% urgency)</span>
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  const icons: Record<string, string> = {
    respond: "💬",
    wait: "⏳",
    clarify: "🔍",
    de_escalate: "🤝",
    apologize: "🙏",
    set_boundary: "🚧",
    ask_question: "❓",
    change_topic: "🔄",
    end_conversation: "👋",
    take_break: "⏸",
    follow_up: "📞",
    reconnect: "🔄",
    comfort: "💙",
    reassure: "✨",
    negotiate: "⚖️",
    persuade: "🎯",
    explain: "📝",
    defend: "🛡️",
    acknowledge: "👂",
    agree: "✅",
    decline: "❌",
    accept: "👍",
    confirm: "✔️",
    inform: "📢",
  };
  return <span className="text-lg">{icons[action] || "💬"}</span>;
}

export default function ConversationCoachDisplay({
  coaching,
  onGenerateReply,
  isGenerating,
}: ConversationCoachDisplayProps) {
  const formatLabel = (label: string) =>
    label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">What To Do Next</h3>
            <p className="text-sm text-white/50">
              Coaching guidance for your next move.
            </p>
          </div>
          <PriorityBadge priority={coaching.priority} />
        </div>
      </Card>

      {/* Context Summary */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
          Current Situation
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-white/40">Relationship</span>
            <p className="text-sm text-white">{coaching.contextSummary.relationship}</p>
          </div>
          <div>
            <span className="text-xs text-white/40">Situation</span>
            <p className="text-sm text-white">{coaching.contextSummary.situation}</p>
          </div>
          <div>
            <span className="text-xs text-white/40">Conflict Level</span>
            <p className="text-sm text-white">{coaching.contextSummary.conflictLevel}</p>
          </div>
          <div>
            <span className="text-xs text-white/40">Their Emotion</span>
            <p className="text-sm text-white">{coaching.contextSummary.otherPersonEmotion}</p>
          </div>
        </div>
      </Card>

      {/* Next Move */}
      <Card>
        <div className="flex items-start gap-3">
          <ActionIcon action={coaching.nextMove.action} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-white">
                {formatLabel(coaching.nextMove.action)}
              </h4>
              <span className="text-xs text-white/40">
                via {formatLabel(coaching.nextMove.strategy)}
              </span>
            </div>
            <p className="text-sm text-white/80">{coaching.nextMove.description}</p>
            {coaching.nextMove.example && (
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-white/40 mb-1">Example</p>
                <p className="text-sm text-white/70 italic">
                  &quot;{coaching.nextMove.example}&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Timing */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          When To Act
        </h4>
        <TimingBadge when={coaching.timing.when} urgency={coaching.timing.urgency} />
        <p className="text-sm text-white/60 mt-2">{coaching.timing.explanation}</p>
      </Card>

      {/* Response Guidance */}
      {coaching.responseNeeded && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            How To Respond
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-white/40">Tone</span>
                <p className="text-sm text-white">{coaching.responseGuidance.tone}</p>
              </div>
              <div>
                <span className="text-xs text-white/40">Length</span>
                <p className="text-sm text-white capitalize">{coaching.responseGuidance.length}</p>
              </div>
            </div>

            {coaching.responseGuidance.structure.length > 0 && (
              <div>
                <span className="text-xs text-white/40 mb-2 block">Structure</span>
                <div className="flex flex-wrap gap-2">
                  {coaching.responseGuidance.structure.map((step, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/70"
                    >
                      {i + 1}. {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {coaching.responseGuidance.keyPoints.length > 0 && (
              <div>
                <span className="text-xs text-white/40 mb-2 block">Key Points</span>
                <div className="space-y-1">
                  {coaching.responseGuidance.keyPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <p className="text-sm text-white/70">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {!coaching.responseNeeded && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Response Status
          </h4>
          <p className="text-sm text-white/60">
            {coaching.responseGuidance.keyPoints[0] || "No response needed right now."}
          </p>
        </Card>
      )}

      {/* What To Avoid */}
      {coaching.avoid.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            What To Avoid
          </h4>
          <div className="space-y-1.5">
            {coaching.avoid.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                <p className="text-sm text-white/70">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reasoning */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Why This Approach
        </h4>
        <p className="text-sm text-white/80">{coaching.reasoning}</p>
      </Card>

      {/* Confidence */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Confidence
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                coaching.confidence >= 0.7
                  ? "bg-green-500"
                  : coaching.confidence >= 0.4
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.round(coaching.confidence * 100)}%` }}
            />
          </div>
          <span className="text-sm text-white/80">{Math.round(coaching.confidence * 100)}%</span>
        </div>
      </Card>

      {/* Follow-Up Suggestions */}
      {coaching.followUpSuggestions.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Follow-Up Suggestions
          </h4>
          <div className="space-y-1.5">
            {coaching.followUpSuggestions.map((suggestion, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">→</span>
                <p className="text-sm text-white/70">{suggestion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Generate Reply Button */}
      {onGenerateReply && coaching.responseNeeded && (
        <div className="flex justify-center">
          <button
            onClick={onGenerateReply}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Reply"}
          </button>
        </div>
      )}
    </div>
  );
}
