// ─── Universal Communication Modes ─────────────────────────────────────────────
//
// The mode system provides a user-facing classification of communication contexts.
// It maps to existing intelligence types without duplicating detection engines.
//
// Architecture:
//   Mode = user-facing communication context (UI + defaults + recommendations)
//   Mode maps to ConversationState.context.type, RelationshipType, SituationType
//   Mode does NOT replace ConversationState — it augments it with UI/recommendations
//
// Precedence:
//   1. Explicit user mode selection (current workspace)
//   2. Explicit user instruction (e.g., "make this flirty")
//   3. Auto-detected context from ConversationIntelligence
//   4. Workspace saved mode
//   5. Effective preferences
//   6. Default (auto/general)
//
// Mode vs Context vs Strategy vs Tone:
//   Mode:      Work (user-facing classification)
//   Context:   Manager (relationship-specific)
//   Strategy:  Assertive (communication approach)
//   Tone:      Professional (emotional quality)
// ──────────────────────────────────────────────────────────────────────────────

export type CommunicationMode =
  | "auto"
  | "work"
  | "academic"
  | "career"
  | "social"
  | "dating"
  | "conflict"
  | "negotiation"
  | "customer"
  | "family"
  | "group"
  | "recovery"
  | "general";

export interface ModeConfig {
  id: CommunicationMode;
  label: string;
  description: string;
  icon: string;
  /** Tones recommended for this mode */
  recommendedTones: string[];
  /** Quick goal actions for this mode */
  quickGoals: Array<{ label: string; goal: string; description: string }>;
  /** Quick style/tone actions for this mode */
  quickActions: Array<{ label: string; tone: string; description: string }>;
  /** Default preferences for this mode */
  defaults: {
    tone: string;
    style: string;
    length: string;
    formality: string;
  };
  /** Help text shown in draft area */
  helpText: string;
  /** Whether this mode is available in the selector */
  visible: boolean;
  /** Display order in selector */
  order: number;
}

export interface ModeRecommendation {
  mode: CommunicationMode;
  confidence: number;
  reason: string;
}

export interface ModeSelection {
  /** The currently selected mode */
  mode: CommunicationMode;
  /** Whether this was auto-detected or manually selected */
  source: "auto" | "manual" | "workspace" | "instruction";
  /** Recommendation from auto-detection */
  recommendation: ModeRecommendation | null;
  /** User's explicit override instruction (e.g., "make this flirty") */
  overrideInstruction: string | null;
}

export interface ModeConflict {
  selectedMode: CommunicationMode;
  detectedMode: CommunicationMode;
  confidence: number;
  reason: string;
}
