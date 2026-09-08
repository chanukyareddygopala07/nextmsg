"use client";

interface Participant {
  participantId: string;
  label: string;
  position: {
    mainPosition: string;
    requestedOutcome: string;
  };
  intent: string;
  emotion: {
    primary: string;
    secondary: string;
    intensity: number;
    confidence: string;
  };
  tone: {
    primary: string;
    secondary: string;
    intensity: number;
  };
  stance: string;
}

interface ParticipantDisplayProps {
  participants: Participant[];
  userId: string;
}

const STANCE_STYLES: Record<string, string> = {
  cooperative: "bg-green-500/10 text-green-400 border border-green-500/20",
  defensive: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  neutral: "bg-white/5 text-white/60 border border-white/10",
  hostile: "bg-red-500/10 text-red-400 border border-red-500/20",
  mediating: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  passive: "bg-white/5 text-white/40 border border-white/10",
  unknown: "bg-white/5 text-white/30 border border-white/10",
};

const INTENT_LABELS: Record<string, string> = {
  ask: "Asking",
  explain: "Explaining",
  defend: "Defending",
  accuse: "Accusing",
  clarify: "Clarifying",
  apologize: "Apologizing",
  negotiate: "Negotiating",
  persuade: "Persuading",
  request_action: "Requesting action",
  request_information: "Requesting info",
  express_frustration: "Expressing frustration",
  reassure: "Reassuring",
  de_escalate: "De-escalating",
  resolve_conflict: "Resolving conflict",
  set_boundary: "Setting boundary",
  end_conversation: "Ending conversation",
  seek_accountability: "Seeking accountability",
  express_disagreement: "Disagreeing",
  unknown: "Unknown",
};

export default function ParticipantDisplay({
  participants,
  userId,
}: ParticipantDisplayProps) {
  if (participants.length <= 1) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/60">Participants</h3>
        <span className="text-xs text-white/30">{participants.length} people</span>
      </div>

      <div className="space-y-3">
        {participants.map((p) => (
          <div
            key={p.participantId}
            className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
              p.participantId === userId ? "ring-1 ring-white/20" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  {p.label}
                </span>
                {p.participantId === userId && (
                  <span className="text-xs text-white/30">(you)</span>
                )}
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-lg ${STANCE_STYLES[p.stance] || STANCE_STYLES.unknown}`}
              >
                {p.stance}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-white/40 text-xs w-16 shrink-0">Position</span>
                <span className="text-white/80">{p.position.mainPosition}</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-white/40 text-xs w-16 shrink-0">Intent</span>
                <span className="text-white/80">
                  {INTENT_LABELS[p.intent] || p.intent}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-white/40 text-xs w-16 shrink-0">Emotion</span>
                <span className="text-white/80">
                  {p.emotion.primary}
                  {p.emotion.secondary !== "unknown" && ` / ${p.emotion.secondary}`}
                  {p.emotion.confidence !== "high" && (
                    <span className="text-white/30 text-xs ml-1">
                      ({p.emotion.confidence})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-white/40 text-xs w-16 shrink-0">Tone</span>
                <span className="text-white/80">{p.tone.primary}</span>
              </div>

              {p.position.requestedOutcome && (
                <div className="flex items-start gap-2">
                  <span className="text-white/40 text-xs w-16 shrink-0">Wants</span>
                  <span className="text-white/70 text-xs">
                    {p.position.requestedOutcome}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
