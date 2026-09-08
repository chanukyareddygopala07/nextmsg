import type {
  CommunicationStrategy,
  EmotionType,
  RelationshipType,
  SituationType,
  ToneType,
  UserIntentType,
  OtherIntentType,
  ConversationDynamics,
  ConflictInfo,
  CommunicationRisk,
} from "./intelligence";
import type { UrgencyLevel } from "./context";
import type { ScriptType, OutputLanguageMode, LanguageRatio, ParticipantLanguage } from "./language";
import type { WritingStyleProfile, StyleGuidance } from "./personality";
import type {
  ParticipantIntelligence,
  ConflictStructure,
  GroupConversationAnalysis,
} from "./participant-intelligence";
import type { CommunicationMode, ModeRecommendation } from "./mode-types";

// ─── Source of Truth Precedence ───────────────────────────────────────────────
//
// 1. EXPLICIT USER INPUT       — highest priority (UI-supplied goal, style, platform)
// 2. AI-UNDERSTOOD INTELLIGENCE — rich semantic understanding from Grok
// 3. DETERMINISTIC DETECTOR    — lightweight heuristic signals
// 4. DEFAULT VALUES             — lowest priority fallbacks
//
// Rules:
// - If the UI supplies goal="ask_for_extension", intelligence does NOT override it.
// - If intelligence has high confidence (>=0.7) and detector is weak, prefer intelligence.
// - If intelligence confidence is low and detector has a strong signal, prefer detector.
// - When information conflicts and both are low confidence, use "unknown".
// ──────────────────────────────────────────────────────────────────────────────

export interface ConversationState {
  // ── Communication mode (separate from context, strategy, tone, and goal) ──
  mode?: {
    selected: CommunicationMode;
    source: "auto" | "manual" | "workspace" | "instruction";
    recommendation: ModeRecommendation | null;
  };
  // ── Participants ──
  participants: {
    count: number;
    roles: string[];
    userId: string;
    others: string[];
    isGroup: boolean;
  };

  // ── Relationship ──
  relationship: RelationshipType;

  // ── Language ──
  language: {
    primary: string;
    secondary: string[];
    script: ScriptType;
    codeMixed: boolean;
    romanized: boolean;
    codeMixRatio: LanguageRatio[];
    outputPreference: OutputLanguageMode;
    confidence: number;
    scriptConfidence: number;
    detectionSource: "explicit_user" | "ai" | "heuristic" | "fallback";
    participantLanguages: ParticipantLanguage[];
  };

  // ── Context ──
  context: {
    type: string;
    platform: string | undefined;
    situation: SituationType;
    urgency: UrgencyLevel;
  };

  // ── Intent ──
  intent: {
    userGoal: string;
    userIntent: UserIntentType;
    otherIntent: OtherIntentType;
  };

  // ── Emotion / Tone ──
  emotion: {
    primary: EmotionType;
    secondary: EmotionType;
    intensity: number;
  };
  tone: {
    primary: ToneType;
    secondary: ToneType;
    intensity: number;
  };

  // ── Dynamics ──
  dynamics: ConversationDynamics;

  // ── Conflict ──
  conflict: ConflictInfo;

  // ── Risks ──
  risks: CommunicationRisk[];

  // ── Advanced Conflict Intelligence ──
  conflictIntelligence: {
    /** Per-participant intelligence for group/conflict conversations */
    participants: ParticipantIntelligence[];
    /** Deep conflict structure analysis */
    conflictStructure: ConflictStructure | null;
    /** Group conversation analysis (null if not a group) */
    groupAnalysis: GroupConversationAnalysis | null;
  };

  // ── Strategy ──
  strategy: {
    primary: CommunicationStrategy;
    ranked: Array<{
      strategy: CommunicationStrategy;
      priority: number;
      confidence: number;
      reason: string;
    }>;
    confidence: number;
  };

  // ── User Style ──
  style: {
    preferred: string;
    writingCharacteristics: string;
    lengthPreference: string;
    /** Full extracted writing style profile */
    profile: WritingStyleProfile | null;
    /** Generated guidance for the reply generator */
    guidance: StyleGuidance | null;
    /** Source of style information */
    source: "extracted" | "user" | "default";
  };

  // ── Precedence metadata ──
  sources: {
    goalSource: "user" | "intelligence" | "detector" | "default";
    contextSource: "user" | "intelligence" | "detector" | "default";
    toneSource: "user" | "intelligence" | "detector" | "default";
    situationSource: "intelligence" | "detector" | "default";
    languageSource: "explicit_user" | "ai" | "heuristic" | "fallback";
  };
}
