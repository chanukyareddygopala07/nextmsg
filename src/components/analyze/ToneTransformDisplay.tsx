"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type {
  TargetTone,
  ToneIntensity,
  ToneTransformationResult,
  ToneCandidate,
} from "@/lib/ai/tone-transformer";

// ─── Tone Transform Display ─────────────────────────────────────────────────
//
// Phase 4 Step 4: UI for tone transformation.
// Allows user to select target tone, view candidates, and compare results.
// ──────────────────────────────────────────────────────────────────────────────

interface ToneTransformDisplayProps {
  /** Original draft text */
  originalDraft: string;
  /** Transformation result */
  result?: ToneTransformationResult;
  /** Whether transformation is in progress */
  isLoading?: boolean;
  /** Error message */
  error?: string;
  /** Callback when tone is selected */
  onTransform: (tone: TargetTone, intensity: ToneIntensity) => void;
  /** Callback when a candidate is selected for use */
  onUse: (text: string) => void;
  /** Callback to edit the transformed text */
  onEdit: (text: string) => void;
  /** Callback to regenerate */
  onRegenerate: () => void;
}

const TONE_OPTIONS: Array<{
  tone: TargetTone;
  label: string;
  description: string;
  emoji: string;
}> = [
  { tone: "professional", label: "Professional", description: "Clear, respectful, appropriate formality", emoji: "💼" },
  { tone: "friendly", label: "Friendly", description: "Warm, approachable, conversational", emoji: "😊" },
  { tone: "casual", label: "Casual", description: "Relaxed, conversational, natural", emoji: "😎" },
  { tone: "formal", label: "Formal", description: "Polite, structured, precise", emoji: "📋" },
  { tone: "diplomatic", label: "Diplomatic", description: "Tactful, considerate, reduced friction", emoji: "🤝" },
  { tone: "assertive", label: "Assertive", description: "Clear, direct, confident", emoji: "💪" },
  { tone: "empathetic", label: "Empathetic", description: "Understanding, emotionally aware", emoji: "💛" },
  { tone: "concise", label: "Concise", description: "Short, direct, no filler", emoji: "✂️" },
  { tone: "warm", label: "Warm", description: "Gentle, caring, supportive", emoji: "☀️" },
  { tone: "confident", label: "Confident", description: "Assured, strong, conviction", emoji: "🔥" },
  { tone: "calm", label: "Calm", description: "Composed, measured, peaceful", emoji: "🧘" },
  { tone: "serious", label: "Serious", description: "Direct, straightforward, no humor", emoji: "⚖️" },
  { tone: "playful", label: "Playful", description: "Lighthearted, fun, casual humor", emoji: "🎉" },
  { tone: "humorous", label: "Humorous", description: "Witty, funny, light humor", emoji: "😄" },
  { tone: "flirty", label: "Flirty", description: "Romantic interest, playful charm", emoji: "😏" },
];

const INTENSITY_OPTIONS: Array<{
  intensity: ToneIntensity;
  label: string;
  description: string;
}> = [
  { intensity: "light", label: "Light", description: "Subtle shift" },
  { intensity: "medium", label: "Moderate", description: "Clear change" },
  { intensity: "strong", label: "Strong", description: "Full transformation" },
];

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreBar({ label, score, inverted }: { label: string; score: number; inverted?: boolean }) {
  const percentage = Math.round(score * 100);
  const isGood = inverted ? score <= 0.3 : score >= 0.7;
  const isWarn = inverted ? score > 0.3 && score <= 0.6 : score >= 0.4 && score < 0.7;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/60 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isGood ? "bg-emerald-500" : isWarn ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-white/40 w-10 text-right">{percentage}%</span>
    </div>
  );
}

export function ToneTransformDisplay({
  originalDraft,
  result,
  isLoading,
  error,
  onTransform,
  onUse,
  onEdit,
  onRegenerate,
}: ToneTransformDisplayProps) {
  const [selectedTone, setSelectedTone] = useState<TargetTone | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<ToneIntensity>("medium");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleTransform = () => {
    if (selectedTone) {
      onTransform(selectedTone, selectedIntensity);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Tone Transformation</h2>
        <p className="text-white/60 text-sm">
          Change HOW your message sounds without changing WHAT you mean.
        </p>
      </Card>

      {/* Original Draft */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-3">
          Original
        </h3>
        <p className="text-white text-lg leading-relaxed">&ldquo;{originalDraft}&rdquo;</p>
      </Card>

      {/* Tone Selection */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-4">
          Choose Tone
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.tone}
              onClick={() => setSelectedTone(option.tone)}
              disabled={isLoading}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                selectedTone === option.tone
                  ? "border-blue-500 bg-blue-500/20 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className="text-lg">{option.emoji}</span>
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Selected tone description */}
        {selectedTone && (
          <div className="mt-3 text-sm text-white/50">
            {TONE_OPTIONS.find((o) => o.tone === selectedTone)?.description}
          </div>
        )}
      </Card>

      {/* Intensity Selection */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-4">
          Intensity
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/40">Softer</span>
          <div className="flex-1 flex gap-2">
            {INTENSITY_OPTIONS.map((option) => (
              <button
                key={option.intensity}
                onClick={() => setSelectedIntensity(option.intensity)}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                  selectedIntensity === option.intensity
                    ? "border-blue-500 bg-blue-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-white/40">Stronger</span>
        </div>
      </Card>

      {/* Transform Button */}
      <Button
        onClick={handleTransform}
        disabled={!selectedTone || isLoading}
        className="w-full"
      >
        {isLoading ? "Transforming..." : "Transform Tone"}
      </Button>

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-500/30 bg-red-500/10">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Candidates */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-4">
              Transformed Versions
            </h3>
            <div className="space-y-4">
              {result.candidates.map((candidate, index) => (
                <CandidateCard
                  key={index}
                  candidate={candidate}
                  index={index}
                  isRecommended={index === result.recommendedCandidate}
                  isCopied={copiedIndex === index}
                  onCopy={() => handleCopy(candidate.text, index)}
                  onUse={() => onUse(candidate.text)}
                  onEdit={() => onEdit(candidate.text)}
                />
              ))}
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-3">
              What Changed
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-white/40">Formality</span>
                <p className="text-sm text-white capitalize">{result.summary.formalityShift}</p>
              </div>
              <div>
                <span className="text-xs text-white/40">Assertiveness</span>
                <p className="text-sm text-white capitalize">{result.summary.assertivenessShift}</p>
              </div>
              <div>
                <span className="text-xs text-white/40">Warmth</span>
                <p className="text-sm text-white capitalize">{result.summary.warmthShift}</p>
              </div>
            </div>
            {result.summary.changes.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-white/40">Changes: </span>
                <span className="text-sm text-white/60">{result.summary.changes.join(", ")}</span>
              </div>
            )}
            {result.summary.preserved.length > 0 && (
              <div className="mt-1">
                <span className="text-xs text-white/40">Preserved: </span>
                <span className="text-sm text-white/60">{result.summary.preserved.join(", ")}</span>
              </div>
            )}
          </Card>

          {/* Preservation Status */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-3">
              Meaning Preservation
            </h3>
            <div className="space-y-2">
              <ScoreBar label="Intent" score={result.preservation.intent ? 1.0 : 0.0} />
              <ScoreBar label="Position" score={result.preservation.position ? 1.0 : 0.0} />
              <ScoreBar label="Boundaries" score={result.preservation.boundaries ? 1.0 : 0.0} />
              <ScoreBar label="Facts" score={result.preservation.facts ? 1.0 : 0.0} />
              <ScoreBar label="Negation" score={result.preservation.negation ? 1.0 : 0.0} />
              <ScoreBar label="Temporal" score={result.preservation.temporalConstraints ? 1.0 : 0.0} />
              <ScoreBar label="Language" score={result.preservation.language ? 1.0 : 0.0} />
            </div>
            {!result.preservation.passed && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-400 text-sm">
                  Some meaning may not be fully preserved. Review candidates carefully.
                </p>
              </div>
            )}
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={onRegenerate} disabled={isLoading} variant="secondary" className="flex-1">
              Regenerate
            </Button>
          </div>
        </>
      )}

      {/* Loading */}
      {isLoading && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Transforming tone...</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Candidate Card ─────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  index,
  isRecommended,
  isCopied,
  onCopy,
  onUse,
  onEdit,
}: {
  candidate: ToneCandidate;
  index: number;
  isRecommended: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onUse: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        isRecommended
          ? "border-blue-500/50 bg-blue-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-white/40 uppercase">
          {candidate.intensity}
        </span>
        {isRecommended && (
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
            Recommended
          </span>
        )}
        <span className="text-xs text-white/40 ml-auto">
          Tone fit: {Math.round(candidate.toneFit * 100)}%
        </span>
      </div>

      <p className="text-white text-lg leading-relaxed mb-3">&ldquo;{candidate.text}&rdquo;</p>

      <p className="text-xs text-white/40 mb-3">{candidate.rationale}</p>

      <div className="flex gap-2">
        <Button onClick={onCopy} variant="secondary" className="text-xs py-1 px-3">
          {isCopied ? "Copied!" : "Copy"}
        </Button>
        <Button onClick={onUse} variant="secondary" className="text-xs py-1 px-3">
          Use
        </Button>
        <Button onClick={onEdit} variant="secondary" className="text-xs py-1 px-3">
          Edit
        </Button>
      </div>
    </div>
  );
}
