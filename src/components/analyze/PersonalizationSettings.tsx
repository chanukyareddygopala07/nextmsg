"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Preference {
  dimension: string;
  value: string;
  confidence: number;
  source: string;
  context?: string;
  signalCount: number;
}

interface Settings {
  enabled: boolean;
  learningEnabled: boolean;
}

interface PersonalizationData {
  preferences: Preference[];
  settings: Settings;
}

export default function PersonalizationSettings() {
  const [data, setData] = useState<PersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/preferences");
        if (res.ok) {
          const result = await res.json();
          setData({
            preferences: result.preferences || [],
            settings: result.settings || { enabled: true, learningEnabled: true },
          });
        }
      } catch {
        // Fail silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = async (key: keyof Settings) => {
    if (!data) return;

    setSaving(true);
    try {
      const newSettings = { ...data.settings, [key]: !data.settings[key] };
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newSettings[key] }),
      });

      if (res.ok) {
        setData({ ...data, settings: newSettings });
      }
    } catch {
      // Fail silently
    } finally {
      setSaving(false);
    }
  };

  const handleResetLearned = async () => {
    if (!confirm("Reset all learned preferences? This cannot be undone.")) return;

    setSaving(true);
    try {
      const res = await fetch("/api/preferences/learned", { method: "DELETE" });
      if (res.ok) {
        // Reload preferences
        const prefRes = await fetch("/api/preferences");
        if (prefRes.ok) {
          const result = await prefRes.json();
          setData({
            preferences: result.preferences || [],
            settings: result.settings || { enabled: true, learningEnabled: true },
          });
        }
      }
    } catch {
      // Fail silently
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          Loading preferences...
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const formatDimension = (dim: string) =>
    dim.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const formatConfidence = (conf: number) => `${Math.round(conf * 100)}%`;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Personalization</h3>
        <p className="text-sm text-white/50 mb-6">
          NextMsg learns your communication style from your feedback.
          Your data stays private and you can reset it anytime.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Enable personalization</p>
              <p className="text-xs text-white/40">Allow NextMsg to learn your preferences</p>
            </div>
            <button
              onClick={() => handleToggle("enabled")}
              disabled={saving}
              className={`w-10 h-6 rounded-full relative transition-colors ${
                data.settings.enabled ? "bg-green-500/30" : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                  data.settings.enabled
                    ? "left-5 bg-green-400"
                    : "left-1 bg-white/40"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Learn from feedback</p>
              <p className="text-xs text-white/40">Use thumbs up/down to improve suggestions</p>
            </div>
            <button
              onClick={() => handleToggle("learningEnabled")}
              disabled={saving || !data.settings.enabled}
              className={`w-10 h-6 rounded-full relative transition-colors ${
                data.settings.learningEnabled && data.settings.enabled
                  ? "bg-green-500/30"
                  : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                  data.settings.learningEnabled && data.settings.enabled
                    ? "left-5 bg-green-400"
                    : "left-1 bg-white/40"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {data.preferences.length > 0 && (
        <Card>
          <h4 className="text-sm font-medium text-white/60 mb-3">
            Learned Preferences
          </h4>
          <div className="space-y-2">
            {data.preferences.map((pref, i) => (
              <div
                key={`${pref.dimension}-${pref.context || "global"}-${i}`}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-sm text-white/80">
                    {formatDimension(pref.dimension)}
                    {pref.context && (
                      <span className="text-white/30 ml-2">({pref.context})</span>
                    )}
                  </p>
                  <p className="text-xs text-white/40">
                    {pref.source === "explicit" ? "You told us" : "Learned from behavior"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/80 font-medium">{pref.value}</p>
                  <p className="text-xs text-white/40">
                    {formatConfidence(pref.confidence)} confidence
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h4 className="text-sm font-medium text-white/60 mb-3">Data Management</h4>
        <p className="text-xs text-white/40 mb-4">
          Reset learned preferences to start fresh. Your explicit settings will be kept.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={handleResetLearned}
          disabled={saving}
        >
          Reset learned preferences
        </Button>
      </Card>
    </div>
  );
}
