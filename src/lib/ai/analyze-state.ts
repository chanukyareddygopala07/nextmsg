// ─── Analyze Session State ──────────────────────────────────────────────────────
//
// Centralized state management for the Analyze experience.
//
// Architecture:
//   ONE ConversationState per session
//   ONE versioned draft
//   Progressive analysis with lazy loading
//   Stale request protection via version counters
//   Invalidation rules for downstream dependencies
//
// State Lifecycle:
//   EMPTY → CONVERSATION_LOADED → STATE_ANALYZED → DRAFT_ENTERED
//   → DRAFT_ANALYZED → IMPACT_ANALYZED → COACHED → READY
// ──────────────────────────────────────────────────────────────────────────────

import type { ConversationMessage, GoalType } from "@/types/conversation";
import type { ConversationState } from "./conversation-state";
import type { DraftAnalysis } from "./draft-types";
import type { CommunicationImpactPrediction } from "./impact-types";
import type { ConversationCoachingResult } from "./coaching-types";
import type { PreSendGateResult } from "./pre-send-types";
import type { CompactPreferenceProfile } from "./personalization-types";
import type { CommunicationMode, ModeConflict, ModeRecommendation } from "./mode-types";
import { detectModeConflict } from "./mode-config";

// ─── Session Phase ─────────────────────────────────────────────────────────────

export type SessionPhase =
  | "empty"
  | "conversation_loaded"
  | "state_analyzed"
  | "draft_entered"
  | "draft_analyzed"
  | "impact_analyzed"
  | "coached"
  | "ready";

// ─── Detected Context ──────────────────────────────────────────────────────────

export interface DetectedContext {
  language: string;
  script: string;
  tone: string;
  conversationType: string;
  urgency: string;
  userStyle: string;
  platform?: string;
}

// ─── Reply Candidate ───────────────────────────────────────────────────────────

export interface ReplyCandidate {
  text: string;
  strategy: string;
  id?: string;
}

// ─── Draft Tracking ────────────────────────────────────────────────────────────

export interface DraftTracking {
  originalDraft: string;
  currentDraft: string;
  draftVersion: number;
}

// ─── Loading States ────────────────────────────────────────────────────────────

export interface LoadingStates {
  parsing: boolean;
  generating: boolean;
  coaching: boolean;
  draftAnalysis: boolean;
  impact: boolean;
  improvement: boolean;
  toneTransform: boolean;
  preSend: boolean;
}

// ─── Error States ──────────────────────────────────────────────────────────────

export interface ErrorStates {
  parse: string | null;
  generate: string | null;
  coaching: string | null;
  draftAnalysis: string | null;
  impact: string | null;
  improvement: string | null;
  toneTransform: string | null;
  preSend: string | null;
}

// ─── Analyze Session State ─────────────────────────────────────────────────────

export interface AnalyzeSessionState {
  // ── Phase ──
  phase: SessionPhase;

  // ── Conversation ──
  messages: ConversationMessage[];
  detectedContext: DetectedContext | null;
  conversationVersion: number;

  // ── Universal communication mode ──
  modeSelection: {
    mode: CommunicationMode;
    source: "auto" | "manual" | "workspace" | "instruction";
    recommendation: ModeRecommendation | null;
    /** Ephemeral session instruction — not persisted as a preference */
    overrideInstruction: string | null;
  };
  modeConflict: ModeConflict | null;

  // ── Overrides ──
  goal: GoalType | undefined;
  goalOverride: string;
  styleOverride: string;
  toneOverride: string;
  languageOverride: string;
  situationOverride: string;
  userFacts: string[];

  // ── ConversationState (authoritative, computed once) ──
  conversationState: ConversationState | null;
  stateVersion: number;

  // ── Draft ──
  draft: DraftTracking | null;

  // ── Generated Replies ──
  bestMatch: ReplyCandidate | null;
  alternatives: ReplyCandidate[];

  // ── Analysis Results (lazy) ──
  draftAnalysis: DraftAnalysis | null;
  impactPrediction: CommunicationImpactPrediction | null;
  coaching: ConversationCoachingResult | null;

  // ── Improvement / Tone (lazy) ──
  improvementCandidates: ReplyCandidate[];
  toneTransformCandidates: ReplyCandidate[];

  // ── Pre-Send Gate ──
  preSendGate: PreSendGateResult | null;

  // ── Intelligence (from generation) ──
  recoveryGuidance: {
    requiredElements: string[];
    recommendedStrategies: string[];
    conflictAdjusted: boolean;
    groupAdjusted: boolean;
  } | null;
  conflictIntelligence: {
    conflictLevel: number;
    escalationTrend: string;
    trigger: string;
    coreDisagreement: string;
    misunderstandings: Array<{
      description: string;
      resolutionSuggestion: string;
    }>;
    resolutionOpportunities: Array<{
      type: string;
      description: string;
      difficulty: string;
    }>;
  } | null;
  participants: Array<{
    participantId: string;
    label: string;
    position: { mainPosition: string; requestedOutcome: string };
    intent: string;
    emotion: { primary: string; secondary: string; intensity: number; confidence: string };
    tone: { primary: string; secondary: string; intensity: number };
    stance: string;
  }> | null;

  // ── Loading & Error ──
  loading: LoadingStates;
  errors: ErrorStates;

  // ── Personalization ──
  preferences: CompactPreferenceProfile | null;

  // ── Request Versioning ──
  requestVersion: number;
}

// ─── Actions ───────────────────────────────────────────────────────────────────

export type AnalyzeAction =
  // Conversation
  | { type: "SET_MESSAGES"; messages: ConversationMessage[]; context: DetectedContext | null }
  | { type: "SET_OVERRIDES"; goalOverride?: string; styleOverride?: string; toneOverride?: string; languageOverride?: string; situationOverride?: string; userFacts?: string[] }
  | { type: "SET_GOAL"; goal: GoalType }
  | { type: "SET_MODE"; mode: CommunicationMode; source?: "auto" | "manual" | "workspace" | "instruction" }
  | { type: "DISMISS_MODE_CONFLICT" }

  // State
  | { type: "SET_CONVERSATION_STATE"; state: ConversationState }

  // Draft
  | { type: "SET_DRAFT"; draft: string }
  | { type: "SELECT_CANDIDATE"; candidate: ReplyCandidate }

  // Generated replies
  | { type: "SET_REPLIES"; bestMatch: ReplyCandidate; alternatives: ReplyCandidate[] }

  // Analysis results
  | { type: "SET_DRAFT_ANALYSIS"; analysis: DraftAnalysis }
  | { type: "SET_IMPACT"; impact: CommunicationImpactPrediction }
  | { type: "SET_COACHING"; coaching: ConversationCoachingResult }

  // Improvement / Tone
  | { type: "SET_IMPROVEMENT_CANDIDATES"; candidates: ReplyCandidate[] }
  | { type: "SET_TONE_CANDIDATES"; candidates: ReplyCandidate[] }

  // Pre-send
  | { type: "SET_PRE_SEND_GATE"; gate: PreSendGateResult }

  // Intelligence from generation
  | { type: "SET_INTELLIGENCE"; recoveryGuidance: AnalyzeSessionState["recoveryGuidance"]; conflictIntelligence: AnalyzeSessionState["conflictIntelligence"]; participants: AnalyzeSessionState["participants"] }

  // Loading & Error
  | { type: "SET_LOADING"; field: keyof LoadingStates; value: boolean }
  | { type: "SET_ERROR"; field: keyof ErrorStates; value: string | null }

  // Preferences
  | { type: "SET_PREFERENCES"; preferences: CompactPreferenceProfile }

  // Invalidation
  | { type: "INVALIDATE_DRAFT_DEPENDENCIES" }
  | { type: "INVALIDATE_ALL" }

  // Reset
  | { type: "RESET" };

// ─── Initial State ─────────────────────────────────────────────────────────────

export const INITIAL_STATE: AnalyzeSessionState = {
  phase: "empty",
  messages: [],
  detectedContext: null,
  conversationVersion: 0,
  modeSelection: {
    mode: "auto",
    source: "auto",
    recommendation: null,
    overrideInstruction: null,
  },
  modeConflict: null,
  goal: undefined,
  goalOverride: "",
  styleOverride: "",
  toneOverride: "",
  languageOverride: "",
  situationOverride: "",
  userFacts: [],
  conversationState: null,
  stateVersion: 0,
  draft: null,
  bestMatch: null,
  alternatives: [],
  draftAnalysis: null,
  impactPrediction: null,
  coaching: null,
  improvementCandidates: [],
  toneTransformCandidates: [],
  preSendGate: null,
  recoveryGuidance: null,
  conflictIntelligence: null,
  participants: null,
  loading: {
    parsing: false,
    generating: false,
    coaching: false,
    draftAnalysis: false,
    impact: false,
    improvement: false,
    toneTransform: false,
    preSend: false,
  },
  errors: {
    parse: null,
    generate: null,
    coaching: null,
    draftAnalysis: null,
    impact: null,
    improvement: null,
    toneTransform: null,
    preSend: null,
  },
  preferences: null,
  requestVersion: 0,
};

// ─── Reducer ───────────────────────────────────────────────────────────────────

export function analyzeReducer(
  state: AnalyzeSessionState,
  action: AnalyzeAction
): AnalyzeSessionState {
  switch (action.type) {
    case "SET_MESSAGES":
      return {
        ...state,
        messages: action.messages,
        detectedContext: action.context,
        conversationVersion: state.conversationVersion + 1,
        phase: "conversation_loaded",
        // Invalidate all downstream when conversation changes
        conversationState: null,
        draft: null,
        bestMatch: null,
        alternatives: [],
        draftAnalysis: null,
        impactPrediction: null,
        coaching: null,
        improvementCandidates: [],
        toneTransformCandidates: [],
        preSendGate: null,
        errors: { ...INITIAL_STATE.errors },
      };

    case "SET_OVERRIDES":
      return {
        ...state,
        ...(action.goalOverride !== undefined && { goalOverride: action.goalOverride }),
        ...(action.styleOverride !== undefined && { styleOverride: action.styleOverride }),
        ...(action.toneOverride !== undefined && { toneOverride: action.toneOverride }),
        ...(action.languageOverride !== undefined && { languageOverride: action.languageOverride }),
        ...(action.situationOverride !== undefined && { situationOverride: action.situationOverride }),
        ...(action.userFacts !== undefined && { userFacts: action.userFacts }),
      };

    case "SET_GOAL":
      return {
        ...state,
        goal: action.goal,
        phase: state.conversationState ? "state_analyzed" : "conversation_loaded",
      };

    case "SET_MODE": {
      const modeSelection = {
        mode: action.mode,
        source: action.source || (action.mode === "auto" ? "auto" : "manual"),
        recommendation: state.modeSelection.recommendation,
        overrideInstruction: state.modeSelection.overrideInstruction,
      } as AnalyzeSessionState["modeSelection"];

      return {
        ...state,
        modeSelection,
        modeConflict: null,
        // Keep conversation and draft, but invalidate all context-dependent work.
        conversationState: null,
        stateVersion: state.stateVersion + 1,
        goal: undefined,
        bestMatch: null,
        alternatives: [],
        draftAnalysis: null,
        impactPrediction: null,
        coaching: null,
        improvementCandidates: [],
        toneTransformCandidates: [],
        preSendGate: null,
        recoveryGuidance: null,
        conflictIntelligence: null,
        participants: null,
        phase: state.messages.length > 0 ? "conversation_loaded" : "empty",
        requestVersion: state.requestVersion + 1,
      };
    }

    case "DISMISS_MODE_CONFLICT":
      return {
        ...state,
        modeConflict: null,
      };

    case "SET_CONVERSATION_STATE":
      {
        const recommendation = action.state.mode?.recommendation || state.modeSelection.recommendation;
        const modeSelection = {
          ...state.modeSelection,
          recommendation,
        };
        const modeConflict =
          modeSelection.mode !== "auto" && recommendation
            ? detectModeConflict(
                modeSelection.mode,
                recommendation.mode,
                recommendation.confidence
              )
            : null;
        return {
          ...state,
          conversationState: action.state,
          modeSelection,
          modeConflict,
          stateVersion: state.stateVersion + 1,
          phase: "state_analyzed",
        };
      }

    case "SET_DRAFT":
      return {
        ...state,
        draft: {
          originalDraft: state.draft?.originalDraft || action.draft,
          currentDraft: action.draft,
          draftVersion: (state.draft?.draftVersion || 0) + 1,
        },
        phase: "draft_entered",
        // Invalidate draft-dependent results
        draftAnalysis: null,
        impactPrediction: null,
        coaching: null,
        improvementCandidates: [],
        toneTransformCandidates: [],
        preSendGate: null,
        errors: {
          ...state.errors,
          draftAnalysis: null,
          impact: null,
          coaching: null,
          improvement: null,
          toneTransform: null,
          preSend: null,
        },
      };

    case "SELECT_CANDIDATE":
      return {
        ...state,
        bestMatch: action.candidate,
        draft: {
          originalDraft: state.draft?.originalDraft || state.bestMatch?.text || "",
          currentDraft: action.candidate.text,
          draftVersion: (state.draft?.draftVersion || 0) + 1,
        },
        // Invalidate draft-dependent results
        draftAnalysis: null,
        impactPrediction: null,
        improvementCandidates: [],
        toneTransformCandidates: [],
        preSendGate: null,
        errors: {
          ...state.errors,
          draftAnalysis: null,
          impact: null,
          preSend: null,
        },
      };

    case "SET_REPLIES":
      return {
        ...state,
        bestMatch: action.bestMatch,
        alternatives: action.alternatives,
        draft: {
          originalDraft: state.draft?.originalDraft || action.bestMatch.text,
          currentDraft: action.bestMatch.text,
          draftVersion: (state.draft?.draftVersion || 0) + 1,
        },
        phase: "ready",
      };

    case "SET_DRAFT_ANALYSIS":
      return {
        ...state,
        draftAnalysis: action.analysis,
        phase: "draft_analyzed",
      };

    case "SET_IMPACT":
      return {
        ...state,
        impactPrediction: action.impact,
        phase: "impact_analyzed",
      };

    case "SET_COACHING":
      return {
        ...state,
        coaching: action.coaching,
        phase: state.draftAnalysis ? "coached" : state.phase,
      };

    case "SET_IMPROVEMENT_CANDIDATES":
      return {
        ...state,
        improvementCandidates: action.candidates,
      };

    case "SET_TONE_CANDIDATES":
      return {
        ...state,
        toneTransformCandidates: action.candidates,
      };

    case "SET_PRE_SEND_GATE":
      return {
        ...state,
        preSendGate: action.gate,
      };

    case "SET_INTELLIGENCE":
      return {
        ...state,
        recoveryGuidance: action.recoveryGuidance,
        conflictIntelligence: action.conflictIntelligence,
        participants: action.participants,
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.field]: action.value },
      };

    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.value },
      };

    case "SET_PREFERENCES":
      return {
        ...state,
        preferences: action.preferences,
      };

    case "INVALIDATE_DRAFT_DEPENDENCIES":
      return {
        ...state,
        draftAnalysis: null,
        impactPrediction: null,
        coaching: null,
        improvementCandidates: [],
        toneTransformCandidates: [],
        preSendGate: null,
      };

    case "INVALIDATE_ALL":
      return { ...INITIAL_STATE };

    case "RESET":
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ─── Derived State Helpers ─────────────────────────────────────────────────────

/** Get the effective draft (current or best match) */
export function getEffectiveDraft(state: AnalyzeSessionState): string {
  return state.draft?.currentDraft || state.bestMatch?.text || "";
}

/** Get the original draft */
export function getOriginalDraft(state: AnalyzeSessionState): string {
  return state.draft?.originalDraft || "";
}

/** Check if draft has changed from original */
export function hasDraftChanged(state: AnalyzeSessionState): boolean {
  if (!state.draft) return false;
  return state.draft.currentDraft !== state.draft.originalDraft;
}

/** Check if any loading is active */
export function isLoading(state: AnalyzeSessionState): boolean {
  return Object.values(state.loading).some(Boolean);
}

/** Get the first non-null error */
export function getFirstError(state: AnalyzeSessionState): string | null {
  for (const err of Object.values(state.errors)) {
    if (err) return err;
  }
  return null;
}

/** Check if conversation is loaded */
export function isConversationLoaded(state: AnalyzeSessionState): boolean {
  return state.messages.length > 0;
}

/** Check if state is analyzed */
export function isStateAnalyzed(state: AnalyzeSessionState): boolean {
  return state.conversationState !== null;
}

/** Check if draft is available */
export function hasDraft(state: AnalyzeSessionState): boolean {
  return state.draft !== null || state.bestMatch !== null;
}
