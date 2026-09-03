"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface ReplyCandidate {
  text: string;
  strategy: string;
}

interface ReplyDisplayProps {
  bestMatch: ReplyCandidate;
  alternatives: ReplyCandidate[];
  onRegenerate?: () => void;
  onFeedback?: (signal: string) => void;
}

export default function ReplyDisplay({
  bestMatch,
  alternatives,
  onRegenerate,
  onFeedback,
}: ReplyDisplayProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    onFeedback?.("copy");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/60">
            ✨ Best match
          </h3>
          <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full">
            {bestMatch.strategy}
          </span>
        </div>
        <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-5">
          <p className="text-lg text-white font-medium leading-relaxed">
            {bestMatch.text}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              onClick={() => handleCopy(bestMatch.text, "best")}
            >
              {copied === "best" ? "Copied!" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onRegenerate}>
              Regenerate
            </Button>
          </div>
        </div>
      </div>

      {alternatives.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/60 mb-3">More options</h3>
          <div className="space-y-2">
            {alternatives.map((alt, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{alt.text}</p>
                  <span className="text-[10px] text-white/30">{alt.strategy}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(alt.text, `alt-${i}`)}
                >
                  {copied === `alt-${i}` ? "Copied!" : "Copy"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Less AI", signal: "less_ai" },
          { label: "Shorter", signal: "shorter" },
          { label: "Funnier", signal: "funnier" },
          { label: "Flirtier", signal: "flirtier" },
          { label: "More confident", signal: "more_confident" },
        ].map((btn) => (
          <Button
            key={btn.signal}
            variant="secondary"
            size="sm"
            onClick={() => onFeedback?.(btn.signal)}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
