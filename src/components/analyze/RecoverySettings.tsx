"use client";

import { useState } from "react";
import FactEditor, { type UserFact } from "./FactEditor";

interface RecoverySettingsProps {
  facts: UserFact[];
  onFactsChange: (facts: UserFact[]) => void;
  situationOverride?: string;
  onSituationChange?: (situation: string) => void;
  goalOverride?: string;
  onGoalChange?: (goal: string) => void;
  styleOverride?: string;
  onStyleChange?: (style: string) => void;
  toneOverride?: string;
  onToneChange?: (tone: string) => void;
  languageOverride?: string;
  onLanguageChange?: (language: string) => void;
}

const SITUATIONS = [
  { value: "", label: "Auto-detect" },
  { value: "late_submission", label: "Late Submission" },
  { value: "missed_deadline", label: "Missed Deadline" },
  { value: "missed_interview", label: "Missed Interview" },
  { value: "late_arrival", label: "Late Arrival" },
  { value: "missed_meeting", label: "Missed Meeting" },
  { value: "delayed_response", label: "Delayed Response" },
  { value: "misunderstanding", label: "Misunderstanding" },
  { value: "heated_argument", label: "Heated Argument" },
  { value: "customer_complaint", label: "Customer Complaint" },
  { value: "romantic_interest", label: "Romantic Interest" },
  { value: "casual_chat", label: "Casual Chat" },
  { value: "professional_feedback", label: "Professional Feedback" },
  { value: "request", label: "Request" },
  { value: "reconnecting", label: "Reconnecting" },
];

const GOALS = [
  { value: "", label: "Auto-detect" },
  { value: "reply", label: "Reply" },
  { value: "explain", label: "Explain" },
  { value: "apologize", label: "Apologize" },
  { value: "convince", label: "Convince" },
  { value: "negotiate", label: "Negotiate" },
  { value: "deescalate", label: "De-escalate" },
  { value: "clarify", label: "Clarify" },
  { value: "support", label: "Support" },
  { value: "decline", label: "Decline" },
  { value: "reconnect", label: "Reconnect" },
];

const STYLES = [
  { value: "", label: "Use detected style" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
  { value: "assertive", label: "Assertive" },
  { value: "conciliatory", label: "Conciliatory" },
];

const TONES = [
  { value: "", label: "Auto-detect" },
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm" },
  { value: "neutral", label: "Neutral" },
  { value: "serious", label: "Serious" },
  { value: "lighthearted", label: "Lighthearted" },
  { value: "empathetic", label: "Empathetic" },
  { value: "confident", label: "Confident" },
];

const LANGUAGES = [
  { value: "", label: "Auto-detect" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "bengali", label: "Bengali" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "marathi", label: "Marathi" },
  { value: "gujarati", label: "Gujarati" },
  { value: "kannada", label: "Kannada" },
  { value: "malayalam", label: "Malayalam" },
  { value: "punjabi", label: "Punjabi" },
  { value: "odia", label: "Odia" },
  { value: "urdu", label: "Urdu" },
  { value: "assamese", label: "Assamese" },
];

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/40">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function RecoverySettings({
  facts,
  onFactsChange,
  situationOverride,
  onSituationChange,
  goalOverride,
  onGoalChange,
  styleOverride,
  onStyleChange,
  toneOverride,
  onToneChange,
  languageOverride,
  onLanguageChange,
}: RecoverySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-2xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-white/60 hover:text-white/80 transition-colors"
      >
        <span>Customize settings</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-5 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <SelectField
              label="Situation (override)"
              value={situationOverride || ""}
              options={SITUATIONS}
              onChange={onSituationChange}
            />
            <SelectField
              label="Goal (override)"
              value={goalOverride || ""}
              options={GOALS}
              onChange={onGoalChange}
            />
            <SelectField
              label="Style"
              value={styleOverride || ""}
              options={STYLES}
              onChange={onStyleChange}
            />
            <SelectField
              label="Tone"
              value={toneOverride || ""}
              options={TONES}
              onChange={onToneChange}
            />
            <SelectField
              label="Language"
              value={languageOverride || ""}
              options={LANGUAGES}
              onChange={onLanguageChange}
            />
          </div>

          <FactEditor facts={facts} onChange={onFactsChange} />
        </div>
      )}
    </div>
  );
}
