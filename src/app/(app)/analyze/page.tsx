"use client";

import { useState, useCallback } from "react";
import ScreenshotUpload from "@/components/analyze/ScreenshotUpload";
import TextPasteArea from "@/components/analyze/TextPasteArea";
import GoalSelector from "@/components/analyze/GoalSelector";
import ConversationPreview from "@/components/analyze/ConversationPreview";
import ReplyDisplay from "@/components/analyze/ReplyDisplay";
import Button from "@/components/ui/Button";
import type { ConversationMessage, GoalType } from "@/types/conversation";

type Step = "input" | "goal" | "analyzing" | "results";

interface ReplyCandidate {
  text: string;
  strategy: string;
}

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;

async function resizeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to create canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(outputType, JPEG_QUALITY);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: outputType });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export default function AnalyzePage() {
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<"screenshot" | "text">("screenshot");
  const [preview, setPreview] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [goal, setGoal] = useState<GoalType | undefined>();
  const [bestMatch, setBestMatch] = useState<ReplyCandidate | null>(null);
  const [alternatives, setAlternatives] = useState<ReplyCandidate[]>([]);
  const [analysis, setAnalysis] = useState<{ stage: string; engagement: number; health: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScreenshotUpload = useCallback((file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleRemoveScreenshot = useCallback(() => {
    setSelectedFile(null);
    setPreview(undefined);
  }, []);

  const handleScreenshotAnalyze = async () => {
    if (!selectedFile) return;
    setStep("analyzing");
    setError(null);

    try {
      const { base64, mimeType } = await resizeImage(selectedFile);

      const res = await fetch("/api/analyze/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
        }),
      });

      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
        if (data.error) {
          setError(data.error);
        }
        setStep("goal");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze screenshot");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      throw new Error("No conversation found in this screenshot. Try a clearer image or crop the chat area.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze screenshot");
      setStep("input");
    }
  };

  const handleTextParse = async (text: string) => {
    setStep("analyzing");
    setError(null);

    try {
      const res = await fetch("/api/analyze/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse conversation");

      setMessages(data.messages);
      setStep("goal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse conversation");
      setStep("input");
    }
  };

  const handleGenerate = async (selectedGoal: GoalType) => {
    setGoal(selectedGoal);
    setStep("analyzing");
    setError(null);

    try {
      const res = await fetch("/api/replies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          goal: selectedGoal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate replies");

      setBestMatch(data.bestMatch);
      setAlternatives(data.alternatives);
      setAnalysis(data.analysis);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate replies");
      setStep("goal");
    }
  };

  const handleRegenerate = () => {
    if (goal) handleGenerate(goal);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analyze</h1>
        <p className="text-white/40">
          {step === "input" && "Upload a screenshot or paste a conversation."}
          {step === "goal" && "What do you want to achieve?"}
          {step === "analyzing" && "Analyzing conversation..."}
          {step === "results" && "Here are your replies."}
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 space-y-2">
          <p>{error}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-white/30">Try:</span>
            <span className="text-xs text-white/40">Clearer screenshot</span>
            <span className="text-xs text-white/20">|</span>
            <span className="text-xs text-white/40">Crop to chat area</span>
            <span className="text-xs text-white/20">|</span>
            <button
              onClick={() => setInputMode("text")}
              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              Paste text instead
            </button>
          </div>
        </div>
      )}

      {step === "input" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode("screenshot")}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                inputMode === "screenshot"
                  ? "bg-white text-black font-medium"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              📸 Screenshot
            </button>
            <button
              onClick={() => setInputMode("text")}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                inputMode === "text"
                  ? "bg-white text-black font-medium"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              📝 Paste text
            </button>
          </div>

          {inputMode === "screenshot" ? (
            <div className="space-y-4">
              <ScreenshotUpload
                onUpload={handleScreenshotUpload}
                preview={preview}
                onRemove={handleRemoveScreenshot}
              />
              {selectedFile && (
                <Button onClick={handleScreenshotAnalyze} className="w-full">
                  Analyze screenshot
                </Button>
              )}
            </div>
          ) : (
            <TextPasteArea onParse={handleTextParse} />
          )}
        </div>
      )}

      {step === "goal" && (
        <div className="space-y-6">
          <ConversationPreview messages={messages} />
          <GoalSelector selected={goal} onSelect={handleGenerate} />
        </div>
      )}

      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-white/40 text-sm">Analyzing conversation...</p>
          {messages.length > 0 && (
            <ConversationPreview messages={messages} />
          )}
        </div>
      )}

      {step === "results" && bestMatch && (
        <div className="space-y-6">
          {analysis && (
            <div className="flex gap-4 text-sm text-white/40">
              <span>Stage: {analysis.stage.replace(/_/g, " ")}</span>
              <span>Health: {Math.round(analysis.health * 100)}%</span>
            </div>
          )}
          <ReplyDisplay
            bestMatch={bestMatch}
            alternatives={alternatives}
            onRegenerate={handleRegenerate}
          />
          <div className="flex gap-2 pt-4 border-t border-white/5">
            <Button variant="secondary" onClick={() => setStep("input")}>
              New analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
