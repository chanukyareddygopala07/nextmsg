"use client";

import Card from "@/components/ui/Card";

interface ImprovedReplyDisplayProps {
  originalDraft: string;
  candidates: Array<{ text: string; strategy: string }>;
  onUseOriginal?: () => void;
  onCopy?: (text: string) => void;
}

export default function ImprovedReplyDisplay({
  originalDraft,
  candidates,
  onUseOriginal,
  onCopy,
}: ImprovedReplyDisplayProps) {
  const formatLabel = (label: string) =>
    label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-4">
      <Card>
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
          Your Original
        </h4>
        <p className="text-sm text-white/60">{originalDraft}</p>
        {onUseOriginal && (
          <button
            onClick={onUseOriginal}
            className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            Keep original →
          </button>
        )}
      </Card>

      {candidates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider">
            Improved Versions
          </h4>
          {candidates.map((candidate, i) => (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-white">{candidate.text}</p>
                  <p className="text-xs text-white/40 mt-1">{formatLabel(candidate.strategy)}</p>
                </div>
                {onCopy && (
                  <button
                    onClick={() => onCopy(candidate.text)}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors shrink-0"
                  >
                    Copy
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
