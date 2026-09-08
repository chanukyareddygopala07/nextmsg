"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CommunicationMode, ModeConfig, ModeRecommendation, ModeSelection } from "@/lib/ai/mode-types";
import { MODE_CONFIGS } from "@/lib/ai/mode-config";

// ─── Mode Selector ─────────────────────────────────────────────────────────────
//
// A simple, accessible mode selector for choosing communication context.
// Shows Auto by default with a compact chip/dropdown for other modes.
//
// Features:
// - Auto mode with recommendation display
// - Manual override with clear selection state
// - Mode conflict detection
// - Keyboard accessible
// - Mobile-friendly (compact layout)
// - Screen reader support
// ──────────────────────────────────────────────────────────────────────────────

interface ModeSelectorProps {
  /** Current mode selection */
  selection: ModeSelection;
  /** Callback when mode is changed */
  onModeChange: (mode: CommunicationMode) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Compact mode for mobile/small spaces */
  compact?: boolean;
}

const VISIBLE_MODES = Object.values(MODE_CONFIGS)
  .filter((m) => m.visible)
  .sort((a, b) => a.order - b.order);

export function ModeSelector({ selection, onModeChange, disabled, compact }: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentConfig = MODE_CONFIGS[selection.mode];

  const handleSelect = useCallback(
    (mode: CommunicationMode) => {
      onModeChange(mode);
      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [onModeChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    },
    []
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <label id="mode-selector-label" className="sr-only">
        Communication mode
      </label>

      {/* Current selection button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="mode-selector-label"
        className={`
          inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-gray-50"}
          ${selection.mode === "auto" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700"}
        `}
      >
        <span aria-hidden="true">{currentConfig.icon}</span>
        <span>{currentConfig.label}</span>
        {selection.source === "auto" && selection.recommendation && selection.mode !== "auto" && (
          <span className="text-xs text-blue-500">(recommended)</span>
        )}
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Recommendation badge */}
      {selection.mode === "auto" && selection.recommendation && selection.recommendation.confidence >= 0.5 && (
        <div className="mt-1 text-xs text-gray-500" role="status" aria-live="polite">
          Recommended:{" "}
          <span className="font-medium text-blue-600">
            {MODE_CONFIGS[selection.recommendation.mode]?.label}
          </span>
          {selection.recommendation.confidence >= 0.7 && (
            <span className="ml-1 text-gray-400">
              — {selection.recommendation.reason}
            </span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-labelledby="mode-selector-label"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="p-1">
            {VISIBLE_MODES.map((mode) => {
              const isSelected = selection.mode === mode.id;
              const isRecommended =
                selection.recommendation?.mode === mode.id && selection.recommendation.confidence >= 0.5;

              return (
                <button
                  key={mode.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(mode.id)}
                  className={`
                    flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm
                    transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
                    ${isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700"}
                  `}
                >
                  <span className="mt-0.5 text-base" aria-hidden="true">
                    {mode.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{mode.label}</span>
                      {isRecommended && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">
                          recommended
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-blue-500" aria-label="selected">✓</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 truncate">{mode.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Actions Bar ─────────────────────────────────────────────────────────
//
// Shows mode-specific quick actions (tone/style shortcuts).
// ──────────────────────────────────────────────────────────────────────────────

interface QuickActionsBarProps {
  mode: CommunicationMode;
  onActionSelect: (tone: string) => void;
  activeTone?: string;
}

export function QuickActionsBar({ mode, onActionSelect, activeTone }: QuickActionsBarProps) {
  const config = MODE_CONFIGS[mode];
  if (!config || config.quickActions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${config.label} quick actions`}>
      {config.quickActions.map((action) => (
        <button
          key={action.tone}
          type="button"
          onClick={() => onActionSelect(action.tone)}
          aria-pressed={activeTone === action.tone}
          className={`
            rounded-full border px-2.5 py-1 text-xs font-medium transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
              activeTone === action.tone
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }
          `}
          title={action.description}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

// ─── Mode Conflict Banner ──────────────────────────────────────────────────────
//
// Shows when user's selected mode conflicts with detected context.
// ──────────────────────────────────────────────────────────────────────────────

interface ModeConflictBannerProps {
  selectedMode: CommunicationMode;
  detectedMode: CommunicationMode;
  onKeepSelected: () => void;
  onUseDetected: () => void;
  onDismiss: () => void;
}

export function ModeConflictBanner({
  selectedMode,
  detectedMode,
  onKeepSelected,
  onUseDetected,
  onDismiss,
}: ModeConflictBannerProps) {
  const selectedLabel = MODE_CONFIGS[selectedMode]?.label || selectedMode;
  const detectedLabel = MODE_CONFIGS[detectedMode]?.label || detectedMode;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
    >
      <p className="text-amber-800">
        Your selected mode <strong>{selectedLabel}</strong> doesn&apos;t match the detected conversation context{" "}
        <strong>{detectedLabel}</strong>.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onKeepSelected}
          className="rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
        >
          Keep {selectedLabel}
        </button>
        <button
          type="button"
          onClick={onUseDetected}
          className="rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
          aria-label={`Use detected context: ${detectedLabel}`}
        >
          Use Detected Context
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Mode Help Text ────────────────────────────────────────────────────────────
//
// Shows mode-specific help text in the draft area.
// ──────────────────────────────────────────────────────────────────────────────

interface ModeHelpTextProps {
  mode: CommunicationMode;
}

export function ModeHelpText({ mode }: ModeHelpTextProps) {
  const config = MODE_CONFIGS[mode];
  if (!config || mode === "auto") return null;

  return (
    <p className="text-xs text-gray-400 italic" aria-live="polite">
      {config.helpText}
    </p>
  );
}
