"use client";

import Card from "@/components/ui/Card";
import type { CommunicationImpactPrediction } from "@/lib/ai/impact-types";

interface ImpactDisplayProps {
  prediction: CommunicationImpactPrediction;
  onImprove?: () => void;
}

function ScoreBar({ label, score, color, inverted }: { label: string; score: number; color: string; inverted?: boolean }) {
  const percentage = Math.round(score * 100);
  const displayColor = inverted
    ? (score <= 0.3 ? "bg-green-500" : score <= 0.6 ? "bg-yellow-500" : "bg-red-500")
    : color;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${displayColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ReadinessBadge({ readiness }: { readiness: string }) {
  const config = {
    ready: { label: "Safe to send", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    mostly_ready: { label: "Mostly safe", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    needs_review: { label: "Review before sending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    high_risk: { label: "High risk", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[readiness as keyof typeof config] || config.ready;
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

function ScenarioCard({ scenario }: { scenario: { likelihood: string; description: string; confidence: number } }) {
  const icons = {
    most_likely: "●",
    possible: "◐",
    risk: "○",
  };
  const colors = {
    most_likely: "text-green-400",
    possible: "text-yellow-400",
    risk: "text-red-400",
  };
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 ${colors[scenario.likelihood as keyof typeof colors] || "text-white/40"}`}>
        {icons[scenario.likelihood as keyof typeof icons] || "○"}
      </span>
      <div>
        <p className="text-sm text-white/80">{scenario.description}</p>
        <p className="text-xs text-white/40 capitalize">{scenario.likelihood.replace("_", " ")}</p>
      </div>
    </div>
  );
}

function RiskFactorCard({ factor }: { factor: { factor: string; severity: string; explanation: string } }) {
  const colors = {
    low: "text-yellow-400",
    medium: "text-orange-400",
    high: "text-red-400",
  };
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 ${colors[factor.severity as keyof typeof colors] || "text-white/40"}`}>⚠</span>
      <div>
        <p className="text-sm text-white/80">{factor.factor}</p>
        <p className="text-xs text-white/40">{factor.explanation}</p>
      </div>
    </div>
  );
}

function ActionLabel({ action }: { action: string }) {
  const labels: Record<string, string> = {
    send_as_is: "Send as is",
    soften_opening: "Soften the opening",
    clarify_request: "Clarify your request",
    add_specific_next_step: "Add a specific next step",
    reduce_blame: "Reduce blame framing",
    acknowledge_concern: "Acknowledge their concern",
    add_context: "Add more context",
    set_clear_boundary: "Set a clear boundary",
    wait_and_rephrase: "Wait and rephrase",
    improve_message: "Improve the message",
  };
  return <span className="text-sm text-white font-medium">{labels[action] || action}</span>;
}

export default function ImpactDisplay({ prediction, onImprove }: ImpactDisplayProps) {
  const formatLabel = (label: string) =>
    label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Communication Impact</h3>
            <p className="text-sm text-white/50">
              How this message may affect the conversation.
            </p>
          </div>
          <ReadinessBadge readiness={prediction.sendReadiness} />
        </div>
      </Card>

      {/* Impact Summary */}
      <Card>
        <p className="text-sm text-white/80">{prediction.impactSummary}</p>
      </Card>

      {/* Outcome Scores */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">Outcome Estimates</h4>
        <div className="space-y-3">
          <ScoreBar
            label="Goal Progression"
            score={prediction.goalProgression}
            color={prediction.goalProgression >= 0.7 ? "bg-green-500" : prediction.goalProgression >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Cooperation"
            score={prediction.cooperation}
            color={prediction.cooperation >= 0.7 ? "bg-green-500" : prediction.cooperation >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Clarity"
            score={prediction.clarityImpact}
            color={prediction.clarityImpact >= 0.7 ? "bg-green-500" : prediction.clarityImpact >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Conversation Continuation"
            score={prediction.conversationContinuation}
            color={prediction.conversationContinuation >= 0.7 ? "bg-green-500" : prediction.conversationContinuation >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Response Likelihood"
            score={prediction.responseLikelihood}
            color={prediction.responseLikelihood >= 0.7 ? "bg-green-500" : prediction.responseLikelihood >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Trust"
            score={prediction.trustImpact}
            color={prediction.trustImpact >= 0.7 ? "bg-green-500" : prediction.trustImpact >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
        </div>
      </Card>

      {/* Risk Scores */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">Risks</h4>
        <div className="space-y-3">
          <ScoreBar
            label="Escalation Risk"
            score={prediction.escalationRisk}
            color=""
            inverted
          />
          <ScoreBar
            label="Defensiveness Risk"
            score={prediction.defensivenessRisk}
            color=""
            inverted
          />
          <ScoreBar
            label="Pressure Risk"
            score={prediction.pressureRisk}
            color=""
            inverted
          />
          <ScoreBar
            label="Misunderstanding Risk"
            score={prediction.misunderstandingRisk}
            color=""
            inverted
          />
        </div>
      </Card>

      {/* What May Happen Next */}
      {prediction.scenarios.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            What May Happen Next
          </h4>
          <div className="space-y-3">
            {prediction.scenarios.map((scenario, i) => (
              <ScenarioCard key={i} scenario={scenario} />
            ))}
          </div>
        </Card>
      )}

      {/* Why */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Why
        </h4>
        <p className="text-sm text-white/80">{prediction.whyExplanation}</p>
      </Card>

      {/* Risk Factors */}
      {prediction.riskFactors.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Risk Factors
          </h4>
          <div className="space-y-3">
            {prediction.riskFactors.map((factor, i) => (
              <RiskFactorCard key={i} factor={factor} />
            ))}
          </div>
        </Card>
      )}

      {/* Recommendation */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Recommendation
        </h4>
        <ActionLabel action={prediction.recommendedAction} />
      </Card>

      {/* Improve Button */}
      {onImprove && prediction.sendReadiness !== "ready" && (
        <div className="flex justify-center">
          <button
            onClick={onImprove}
            className="px-6 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-200"
          >
            Improve Message
          </button>
        </div>
      )}
    </div>
  );
}
