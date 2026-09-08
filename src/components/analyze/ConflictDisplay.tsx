"use client";

interface ConflictDisplayProps {
  conflictLevel: number;
  escalationTrend: string;
  trigger: string;
  coreDisagreement: string;
  misunderstandings: Array<{
    description: string;
    resolutionSuggestion: string;
  }>;
  resolutionOpportunities: Array<{
    type: string;
    description: string;
    difficulty: string;
  }>;
}

const ESCALATION_STYLES: Record<string, string> = {
  increasing: "text-red-400",
  stable: "text-yellow-400",
  decreasing: "text-green-400",
  unknown: "text-white/40",
};

const ESCALATION_LABELS: Record<string, string> = {
  increasing: "Increasing",
  stable: "Stable",
  decreasing: "Decreasing",
  unknown: "Unknown",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-green-500/10 text-green-400 border border-green-500/20",
  moderate: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  hard: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default function ConflictDisplay({
  conflictLevel,
  escalationTrend,
  trigger,
  coreDisagreement,
  misunderstandings,
  resolutionOpportunities,
}: ConflictDisplayProps) {
  if (conflictLevel < 0.3) return null;

  const conflictLabel =
    conflictLevel > 0.7 ? "High" : conflictLevel > 0.4 ? "Medium" : "Low";
  const conflictColor =
    conflictLevel > 0.7
      ? "text-red-400"
      : conflictLevel > 0.4
        ? "text-yellow-400"
        : "text-green-400";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-medium text-white/60">Conflict Analysis</h3>

      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-white/40">Level:</span>
          <span className={`font-medium ${conflictColor}`}>{conflictLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40">Escalation:</span>
          <span className={ESCALATION_STYLES[escalationTrend]}>
            {ESCALATION_LABELS[escalationTrend]}
          </span>
        </div>
      </div>

      {trigger && (
        <div>
          <p className="text-xs text-white/30 mb-1">Trigger</p>
          <p className="text-sm text-white/80">{trigger}</p>
        </div>
      )}

      {coreDisagreement && (
        <div>
          <p className="text-xs text-white/30 mb-1">Core Disagreement</p>
          <p className="text-sm text-white/80">{coreDisagreement}</p>
        </div>
      )}

      {misunderstandings.length > 0 && (
        <div>
          <p className="text-xs text-white/30 mb-2">Possible Misunderstandings</p>
          <div className="space-y-2">
            {misunderstandings.map((m, i) => (
              <div
                key={i}
                className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3"
              >
                <p className="text-sm text-white/70">{m.description}</p>
                {m.resolutionSuggestion && (
                  <p className="text-xs text-white/40 mt-1">
                    Suggestion: {m.resolutionSuggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {resolutionOpportunities.length > 0 && (
        <div>
          <p className="text-xs text-white/30 mb-2">Resolution Opportunities</p>
          <div className="flex flex-wrap gap-2">
            {resolutionOpportunities.map((r, i) => (
              <span key={i} className={`px-2.5 py-1.5 text-xs rounded-lg ${DIFFICULTY_STYLES[r.difficulty]}`}>
                {r.description}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
