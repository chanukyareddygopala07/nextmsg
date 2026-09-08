"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

// ─── Memory Settings Component ─────────────────────────────────────────────────
//
// Controls memory ON/OFF and shows memory status.
// ──────────────────────────────────────────────────────────────────────────────

interface MemorySettingsProps {
  userId: string;
  onSettingsChange?: (enabled: boolean) => void;
}

export default function MemorySettings({
  userId,
  onSettingsChange,
}: MemorySettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/memory");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setEnabled(data.settings.enabled);
        }
      } catch (error) {
        console.error("Failed to fetch memory settings:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleToggle = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (response.ok) {
        setEnabled(!enabled);
        onSettingsChange?.(!enabled);
      }
    } catch (error) {
      console.error("Failed to update memory settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        Loading...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Conversation Memory</h3>
          <p className="text-sm text-gray-500">
            {enabled
              ? "Remember context from past conversations"
              : "Memory is disabled"}
          </p>
        </div>
      </div>

      <Button
        onClick={handleToggle}
        disabled={saving}
        variant={enabled ? "primary" : "secondary"}
        size="sm"
      >
        {saving ? "Saving..." : enabled ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}
