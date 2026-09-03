"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function StylePage() {
  const [examples, setExamples] = useState<string[]>([""]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [summary, setSummary] = useState<string[]>([]);

  const addExample = () => {
    if (examples.length < 20) {
      setExamples([...examples, ""]);
    }
  };

  const updateExample = (index: number, value: string) => {
    const updated = [...examples];
    updated[index] = value;
    setExamples(updated);
  };

  const removeExample = (index: number) => {
    if (examples.length > 1) {
      setExamples(examples.filter((_, i) => i !== index));
    }
  };

  const analyzeStyle = async () => {
    const validExamples = examples.filter((e) => e.trim());
    if (validExamples.length < 3) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/style/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examples: validExamples }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setSummary(data.summary);
      }
    } catch {
      console.error("Style analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Your style</h1>
        <p className="text-white/40">
          Share examples of how you text so AI can match your voice.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/60">
          Message examples ({examples.length})
        </h3>
        <div className="space-y-2">
          {examples.map((ex, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={ex}
                onChange={(e) => updateExample(i, e.target.value)}
                placeholder={`Example message ${i + 1}`}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
              />
              {examples.length > 1 && (
                <button
                  onClick={() => removeExample(i)}
                  className="px-3 text-white/30 hover:text-white/60 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={addExample}>
            + Add example
          </Button>
        </div>
      </div>

      <Button
        onClick={analyzeStyle}
        disabled={examples.filter((e) => e.trim()).length < 3 || isAnalyzing}
        className="w-full"
      >
        {isAnalyzing ? "Analyzing..." : "Analyze my style"}
      </Button>

      {profile && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white/60">Your texting profile</h3>
          <Card>
            <div className="flex flex-wrap gap-2 mb-4">
              {summary.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(profile).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-white/40">{key}</span>
                  <span className="text-white/70">{String(value)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
