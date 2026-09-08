"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { PreSendGateResult, GateDecision, CheckDimension, GateRisk } from "@/lib/ai/pre-send-types";

interface PreSendGateDisplayProps {
  gate: PreSendGateResult;
  onImprove?: () => void;
  onSendAnyway?: () => void;
  isImproving?: boolean;
}

// ─── Decision Badge ─────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: GateDecision }) {
  const config = {
    READY: { label: "Ready to send", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    REVIEW: { label: "Review before sending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    HIGH_RISK: { label: "Not ready to send", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[decision];
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

// ─── Risk Severity Badge ────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-white/10 text-white/60 border-white/20",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[severity as keyof typeof colors] || colors.low}`}>
      {severity}
    </span>
  );
}

// ─── Score Bar ──────────────────────────────────────────────────────────────

function ScoreBar({ label, score, inverted }: { label: string; score: number; inverted?: boolean }) {
  const percentage = Math.round(score * 100);
  const color = inverted
    ? score <= 0.3
      ? "bg-green-500"
      : score <= 0.6
      ? "bg-yellow-500"
      : "bg-red-500"
    : score >= 0.7
    ? "bg-green-500"
    : score >= 0.4
    ? "bg-yellow-500"
    : "bg-red-500";

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

// ─── Dimension Label Helper ─────────────────────────────────────────────────

function dimensionLabel(dim: CheckDimension): string {
  const labels: Record<CheckDimension, string> = {
    semantic_preservation: "Semantic Preservation",
    factual_integrity: "Factual Integrity",
    goal_alignment: "Goal Alignment",
    context_fit: "Context Fit",
    tone_fit: "Tone Fit",
    communication_impact: "Communication Impact",
    escalation_risk: "Escalation Risk",
    defensiveness_risk: "Defensiveness Risk",
    pressure_risk: "Pressure Risk",
    misunderstanding_risk: "Misunderstanding Risk",
    boundary_integrity: "Boundary Integrity",
    position_integrity: "Position Integrity",
    language_consistency: "Language Consistency",
    style_consistency: "Style Consistency",
    safety: "Safety",
    deception_fabrication: "Deception / Fabrication",
    contradiction: "Contradiction",
    clarity: "Clarity",
  };
  return labels[dim] || dim;
}

// ─── Risk Card ──────────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: GateRisk }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-orange-400">⚠</span>
        <span className="text-sm text-white/80">{risk.description}</span>
        <SeverityBadge severity={risk.severity} />
      </div>
      <p className="text-xs text-white/40 ml-5">{risk.explanation}</p>
      <p className="text-xs text-blue-400/70 ml-5">→ {risk.recommendation}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PreSendGateDisplay({
  gate,
  onImprove,
  onSendAnyway,
  isImproving,
}: PreSendGateDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Separate risk dimensions into categories
  const riskDimensions: CheckDimension[] = [
    "escalation_risk",
    "defensiveness_risk",
    "pressure_risk",
    "misunderstanding_risk",
  ];

  const qualityDimensions: CheckDimension[] = [
    "semantic_preservation",
    "factual_integrity",
    "goal_alignment",
    "context_fit",
    "tone_fit",
    "communication_impact",
  ];

  const integrityDimensions: CheckDimension[] = [
    "boundary_integrity",
    "position_integrity",
    "language_consistency",
    "style_consistency",
    "safety",
    "deception_fabrication",
    "contradiction",
    "clarity",
  ];

  // ── READY: Inline lightweight display ──
  if (gate.decision === "READY") {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-lg">✓</span>
            <div>
              <p className="text-sm text-white font-medium">Ready to send</p>
              <p className="text-xs text-white/40">{gate.summary}</p>
            </div>
          </div>
          <DecisionBadge decision={gate.decision} />
        </div>

        {/* Collapsible details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {showDetails ? "Hide details" : "View details"}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            {/* Strengths */}
            {gate.strengths.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Strengths
                </h4>
                <div className="space-y-1">
                  {gate.strengths.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <p className="text-xs text-white/70">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key dimension scores */}
            <div>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                Key Scores
              </h4>
              <div className="space-y-2">
                {qualityDimensions.slice(0, 3).map((dim) => (
                  <ScoreBar
                    key={dim}
                    label={dimensionLabel(dim)}
                    score={gate.dimensionScores[dim]?.score ?? 0}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  // ── REVIEW / HIGH_RISK: Full display ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Pre-Send Check</h3>
            <p className="text-sm text-white/50">{gate.summary}</p>
          </div>
          <DecisionBadge decision={gate.decision} />
        </div>
      </Card>

      {/* Explanation */}
      <Card>
        <p className="text-sm text-white/80">{gate.explanation}</p>
      </Card>

      {/* Risks */}
      {gate.risks.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Issues Found ({gate.risks.length})
          </h4>
          <div className="space-y-4">
            {gate.risks.map((risk, i) => (
              <RiskCard key={i} risk={risk} />
            ))}
          </div>
        </Card>
      )}

      {/* Strengths */}
      {gate.strengths.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            What&apos;s Working
          </h4>
          <div className="space-y-1.5">
            {gate.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <p className="text-sm text-white/70">{s.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dimension Scores - Quality */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
          Quality Scores
        </h4>
        <div className="space-y-3">
          {qualityDimensions.map((dim) => (
            <ScoreBar
              key={dim}
              label={dimensionLabel(dim)}
              score={gate.dimensionScores[dim]?.score ?? 0}
            />
          ))}
        </div>
      </Card>

      {/* Dimension Scores - Risk */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
          Risk Scores
        </h4>
        <div className="space-y-3">
          {riskDimensions.map((dim) => (
            <ScoreBar
              key={dim}
              label={dimensionLabel(dim)}
              score={gate.dimensionScores[dim]?.score ?? 0}
              inverted
            />
          ))}
        </div>
      </Card>

      {/* Dimension Scores - Integrity */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
          Integrity Checks
        </h4>
        <div className="space-y-3">
          {integrityDimensions.map((dim) => (
            <ScoreBar
              key={dim}
              label={dimensionLabel(dim)}
              score={gate.dimensionScores[dim]?.score ?? 0}
            />
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      {gate.recommendations.length > 0 && (
        <Card>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Recommendations
          </h4>
          <div className="space-y-2">
            {gate.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 ${
                    rec.type === "must_fix"
                      ? "text-red-400"
                      : rec.type === "should_fix"
                      ? "text-orange-400"
                      : "text-blue-400"
                  }`}
                >
                  {rec.type === "must_fix" ? "✕" : rec.type === "should_fix" ? "⚠" : "ℹ"}
                </span>
                <div>
                  <p className="text-sm text-white/80">{rec.description}</p>
                  <p className="text-xs text-white/40">{rec.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Confidence */}
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Gate Confidence
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                gate.confidenceScore >= 0.7
                  ? "bg-green-500"
                  : gate.confidenceScore >= 0.4
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.round(gate.confidenceScore * 100)}%` }}
            />
          </div>
          <span className="text-sm text-white/80">
            {Math.round(gate.confidenceScore * 100)}%
          </span>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-white/5">
        {gate.canAutoImprove && onImprove && (
          <Button onClick={onImprove} disabled={isImproving} className="flex-1">
            {isImproving ? "Improving..." : "Improve Message"}
          </Button>
        )}
        {gate.decision === "REVIEW" && onSendAnyway && (
          <Button variant="secondary" onClick={onSendAnyway} className="flex-1">
            Send Anyway
          </Button>
        )}
        {gate.decision === "HIGH_RISK" && (
          <div className="flex-1 text-center">
            <p className="text-xs text-red-400/70">
              This message has critical issues and should not be sent without changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
