"use client";

import Card from "@/components/ui/Card";
import type { DraftAnalysis } from "@/lib/ai/draft-types";

interface DraftAnalysisDisplayProps {
  analysis: DraftAnalysis;
  onImprove?: () => void;
  isImproving?: boolean;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const percentage = Math.round(score * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    low: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    medium: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[severity as keyof typeof colors] || colors.low}`}>
      {severity}
    </span>
  );
}

export default function DraftAnalysisDisplay({ analysis, onImprove, isImproving }: DraftAnalysisDisplayProps) {
  const formatLabel = (label: string) =>
    label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-2">Communication Check</h3>
        <p className="text-sm text-white/50">
          Here&apos;s how your draft may come across.
        </p>
      </Card>

      {/* Tone & Intent */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Intent</h4>
            <p className="text-sm text-white">{formatLabel(analysis.intent)}</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Tone</h4>
            <p className="text-sm text-white">{formatLabel(analysis.tone.primary)}</p>
            {analysis.tone.secondary !== "neutral" && (
              <p className="text-xs text-white/40">with {formatLabel(analysis.tone.secondary)} undertone</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Strategy</h4>
            <p className="text-sm text-white">{formatLabel(analysis.draftStrategy)}</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Impact</h4>
            <p className="text-sm text-white">{formatLabel(analysis.perceivedImpact)}</p>
          </div>
        </div>
      </Card>

      {/* Perceived Impact */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          How It May Come Across
        </h4>
        <p className="text-sm text-white/80 italic">
          &quot;{analysis.perceivedImpactExplanation}&quot;
        </p>
      </Card>

      {/* Scores */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">Scores</h4>
        <div className="space-y-3">
          <ScoreBar
            label="Goal Alignment"
            score={analysis.goalAlignment}
            color={analysis.goalAlignment >= 0.7 ? "bg-green-500" : analysis.goalAlignment >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Clarity"
            score={analysis.clarity}
            color={analysis.clarity >= 0.7 ? "bg-green-500" : analysis.clarity >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Style Match"
            score={analysis.styleConsistency}
            color={analysis.styleConsistency >= 0.7 ? "bg-green-500" : analysis.styleConsistency >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Language Match"
            score={analysis.languageConsistency}
            color={analysis.languageConsistency >= 0.7 ? "bg-green-500" : analysis.languageConsistency >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Escalation Risk"
            score={analysis.escalationRisk}
            color={analysis.escalationRisk <= 0.3 ? "bg-green-500" : analysis.escalationRisk <= 0.6 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Misunderstanding Risk"
            score={analysis.misunderstandingRisk}
            color={analysis.misunderstandingRisk <= 0.3 ? "bg-green-500" : analysis.misunderstandingRisk <= 0.6 ? "bg-yellow-500" : "bg-red-500"}
          />
        </div>
      </Card>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            What Works
          </h4>
          <div className="space-y-2">
            {analysis.strengths.map((strength, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <p className="text-sm text-white/80">{strength.explanation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Issues */}
      {analysis.issues.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Watch Out For
          </h4>
          <div className="space-y-3">
            {analysis.issues.map((issue, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">⚠</span>
                  <span className="text-sm text-white/80">{issue.explanation}</span>
                  <SeverityBadge severity={issue.severity} />
                </div>
                {issue.suggestion && (
                  <p className="text-xs text-white/40 ml-5">{issue.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Coaching */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Coaching
        </h4>
        <p className="text-sm text-white/80">{analysis.coaching}</p>
      </Card>

      {/* Recommended Approach */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Recommended Approach
        </h4>
        <p className="text-sm text-white font-medium">{analysis.recommendedApproach}</p>
      </Card>

      {/* Improve Button */}
      {onImprove && (
        <div className="flex justify-center">
          <button
            onClick={onImprove}
            disabled={isImproving}
            className="px-6 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
          >
            {isImproving ? "Improving..." : "Improve My Message"}
          </button>
        </div>
      )}
    </div>
  );
}
