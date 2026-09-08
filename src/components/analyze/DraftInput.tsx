"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface DraftInputProps {
  onAnalyze: (draft: string) => void;
  isLoading?: boolean;
}

export default function DraftInput({ onAnalyze, isLoading = false }: DraftInputProps) {
  const [draft, setDraft] = useState("");

  const handleSubmit = () => {
    if (draft.trim() && !isLoading) {
      onAnalyze(draft.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          Your Draft
        </label>
        <p className="text-xs text-white/40 mb-3">
          Type what you&apos;re thinking of sending, and we&apos;ll analyze how it may come across.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your draft message here..."
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!draft.trim() || isLoading}
          variant="primary"
          size="md"
        >
          {isLoading ? "Analyzing..." : "Analyze Draft"}
        </Button>

        {draft.length > 0 && (
          <span className="text-xs text-white/30">
            {draft.length} characters
          </span>
        )}
      </div>
    </div>
  );
}
