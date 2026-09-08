// ─── Workspace State ──────────────────────────────────────────────────────────
//
// Client-side workspace state management.
// Wraps AnalyzeSessionState with workspace-specific state for persistence,
// participants, and workspace metadata.
//
// Architecture:
//   WorkspaceState (this file) contains:
//     - workspace metadata (source data - authoritative)
//     - participants (source data - authoritative)
//     - messages (source data - authoritative)
//     - analyze state (derived/transient from analyze-state.ts)
//     - UI state (transient)
//
//   Source data is persisted. Derived data is recomputed on load.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  ConversationWorkspace,
  WorkspaceParticipant,
  WorkspaceMessage,
  WorkspaceLoadingState,
  WorkspaceErrorState,
  WorkspaceUIState,
} from "./workspace-types";
import type {
  AnalyzeSessionState,
  AnalyzeAction,
  SessionPhase,
  LoadingStates,
  ErrorStates,
} from "./analyze-state";
import { INITIAL_STATE, analyzeReducer } from "./analyze-state";

// ─── Workspace State ─────────────────────────────────────────────────────────

export interface WorkspaceState {
  // ── Workspace metadata (source - persisted) ──
  workspaceId: string | null;
  title: string;
  platform: string | null;
  goal: string | null;
  language: string | null;
  version: number;

  // ── Participants (source - persisted) ──
  participants: WorkspaceParticipant[];

  // ── Messages (source - persisted) ──
  messages: WorkspaceMessage[];

  // ── Analyze state (derived/transient) ──
  analyze: AnalyzeSessionState;

  // ── Loading ──
  loading: WorkspaceLoadingState;

  // ── Errors ──
  errors: WorkspaceErrorState;

  // ── UI State (transient) ──
  ui: WorkspaceUIState;

  // ── Persistence ──
  isDirty: boolean;
  lastSavedAt: string | null;
}

// ─── Workspace Actions ───────────────────────────────────────────────────────

export type WorkspaceAction =
  // ── Workspace lifecycle ──
  | { type: "LOAD_WORKSPACE"; workspace: ConversationWorkspace; participants: WorkspaceParticipant[]; messages: WorkspaceMessage[] }
  | { type: "CREATE_WORKSPACE"; workspace: ConversationWorkspace }
  | { type: "UPDATE_WORKSPACE"; updates: Partial<Pick<ConversationWorkspace, "title" | "platform" | "goal" | "language">>; version: number }
  | { type: "SET_WORKSPACE_LOADING"; field: keyof WorkspaceLoadingState; value: boolean }
  | { type: "SET_WORKSPACE_ERROR"; field: keyof WorkspaceErrorState; value: string | null }

  // ── Participants ──
  | { type: "ADD_PARTICIPANT"; participant: WorkspaceParticipant }
  | { type: "UPDATE_PARTICIPANT"; participantId: string; updates: Partial<WorkspaceParticipant> }
  | { type: "REMOVE_PARTICIPANT"; participantId: string }

  // ── Messages ──
  | { type: "ADD_MESSAGE"; message: WorkspaceMessage }
  | { type: "UPDATE_MESSAGE"; messageId: string; updates: Partial<WorkspaceMessage> }
  | { type: "DELETE_MESSAGE"; messageId: string }
  | { type: "SET_MESSAGES"; messages: WorkspaceMessage[] }

  // ── Draft commit ──
  | { type: "COMMIT_DRAFT"; message: WorkspaceMessage }

  // ── UI ──
  | { type: "SELECT_MESSAGE"; messageId: string | null }
  | { type: "SET_EDITING_MESSAGE"; messageId: string | null }
  | { type: "SET_ADDING_PARTICIPANT"; value: boolean }
  | { type: "SET_RENAMING"; value: boolean }
  | { type: "SET_SHOW_DELETE_CONFIRM"; value: boolean }

  // ── Persistence ──
  | { type: "MARK_DIRTY" }
  | { type: "MARK_SAVED"; savedAt: string }

  // ── Analyze (delegates to analyzeReducer) ──
  | { type: "ANALYZE"; action: AnalyzeAction }

  // ── Reset ──
  | { type: "RESET_WORKSPACE" };

// ─── Initial Workspace State ─────────────────────────────────────────────────

export const INITIAL_WORKSPACE_STATE: WorkspaceState = {
  workspaceId: null,
  title: "",
  platform: null,
  goal: null,
  language: null,
  version: 0,
  participants: [],
  messages: [],
  analyze: INITIAL_STATE,
  loading: {
    workspace: false,
    messages: false,
    saving: false,
  },
  errors: {
    workspace: null,
    messages: null,
    save: null,
    participant: null,
  },
  ui: {
    selectedMessageId: null,
    editingMessageId: null,
    addingParticipant: false,
    renaming: false,
    showDeleteConfirm: false,
  },
  isDirty: false,
  lastSavedAt: null,
};

// ─── Workspace Reducer ──────────────────────────────────────────────────────

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "LOAD_WORKSPACE": {
      const userParticipant = action.participants.find((p) => p.isUser);
      const otherParticipants = action.participants.filter((p) => !p.isUser);

      const analyzeMessages = action.messages.map((m) => ({
        sender: m.sender === "user" ? ("me" as const) : ("them" as const),
        text: m.text,
      }));

      const detectedContext = action.workspace.platform || action.workspace.language
        ? {
            language: action.workspace.language || "english",
            script: "latin",
            tone: "casual",
            conversationType: "personal",
            urgency: "low",
            userStyle: "relaxed",
            platform: action.workspace.platform || undefined,
          }
        : null;

      return {
        ...state,
        workspaceId: action.workspace.id,
        title: action.workspace.title,
        platform: action.workspace.platform,
        goal: action.workspace.goal,
        language: action.workspace.language,
        version: action.workspace.version,
        participants: action.participants,
        messages: action.messages,
        analyze: analyzeMessages.length > 0
          ? {
              ...INITIAL_STATE,
              messages: analyzeMessages,
              detectedContext,
              conversationVersion: action.workspace.conversationVersion,
              phase: "conversation_loaded" as SessionPhase,
              goal: action.workspace.goal as any || undefined,
            }
          : INITIAL_STATE,
        loading: { workspace: false, messages: false, saving: false },
        errors: { workspace: null, messages: null, save: null, participant: null },
        isDirty: false,
        lastSavedAt: new Date().toISOString(),
      };
    }

    case "CREATE_WORKSPACE":
      return {
        ...state,
        workspaceId: action.workspace.id,
        title: action.workspace.title,
        platform: action.workspace.platform,
        goal: action.workspace.goal,
        language: action.workspace.language,
        version: action.workspace.version,
        participants: [],
        messages: [],
        analyze: INITIAL_STATE,
        isDirty: false,
      };

    case "UPDATE_WORKSPACE":
      return {
        ...state,
        ...action.updates,
        version: action.version,
        isDirty: true,
      };

    case "SET_WORKSPACE_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.field]: action.value },
      };

    case "SET_WORKSPACE_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.value },
      };

    // ── Participants ──

    case "ADD_PARTICIPANT":
      return {
        ...state,
        participants: [...state.participants, action.participant],
        isDirty: true,
      };

    case "UPDATE_PARTICIPANT":
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId ? { ...p, ...action.updates } : p
        ),
        isDirty: true,
      };

    case "REMOVE_PARTICIPANT": {
      const removedParticipant = state.participants.find((p) => p.id === action.participantId);
      if (removedParticipant?.isUser) return state;
      return {
        ...state,
        participants: state.participants.filter((p) => p.id !== action.participantId),
        messages: state.messages.map((m) =>
          m.participantId === action.participantId ? { ...m, participantId: null } : m
        ),
        isDirty: true,
      };
    }

    // ── Messages ──

    case "ADD_MESSAGE": {
      const newMessages = [...state.messages, action.message].sort((a, b) => a.sequence - b.sequence);
      const analyzeMessages = newMessages.map((m) => ({
        sender: m.sender === "user" ? ("me" as const) : ("them" as const),
        text: m.text,
      }));

      return {
        ...state,
        messages: newMessages,
        analyze: {
          ...state.analyze,
          messages: analyzeMessages,
          conversationVersion: state.analyze.conversationVersion + 1,
          phase: "conversation_loaded",
          // Invalidate all downstream
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
        },
        isDirty: true,
      };
    }

    case "UPDATE_MESSAGE": {
      const updatedMessages = state.messages.map((m) =>
        m.id === action.messageId ? { ...m, ...action.updates } : m
      );
      const analyzeMessages = updatedMessages.map((m) => ({
        sender: m.sender === "user" ? ("me" as const) : ("them" as const),
        text: m.text,
      }));

      return {
        ...state,
        messages: updatedMessages,
        analyze: {
          ...state.analyze,
          messages: analyzeMessages,
          conversationVersion: state.analyze.conversationVersion + 1,
          phase: "conversation_loaded",
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
        },
        isDirty: true,
      };
    }

    case "DELETE_MESSAGE": {
      const filteredMessages = state.messages
        .filter((m) => m.id !== action.messageId)
        .map((m, i) => ({ ...m, sequence: i + 1 }));
      const analyzeMessages = filteredMessages.map((m) => ({
        sender: m.sender === "user" ? ("me" as const) : ("them" as const),
        text: m.text,
      }));

      return {
        ...state,
        messages: filteredMessages,
        analyze: {
          ...state.analyze,
          messages: analyzeMessages,
          conversationVersion: state.analyze.conversationVersion + 1,
          phase: "conversation_loaded",
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
        },
        isDirty: true,
      };
    }

    case "SET_MESSAGES": {
      const analyzeMessages = action.messages.map((m) => ({
        sender: m.sender === "user" ? ("me" as const) : ("them" as const),
        text: m.text,
      }));

      return {
        ...state,
        messages: action.messages,
        analyze: {
          ...state.analyze,
          messages: analyzeMessages,
          conversationVersion: state.analyze.conversationVersion + 1,
          phase: "conversation_loaded",
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
        },
        isDirty: true,
      };
    }

    // ── Draft commit ──

    case "COMMIT_DRAFT": {
      const committedMessages = [...state.messages, action.message].sort((a, b) => a.sequence - b.sequence);
      const analyzeMessages = committedMessages.map((m) => ({
        sender: m.sender === "user" ? ("me" as const) : ("them" as const),
        text: m.text,
      }));

      return {
        ...state,
        messages: committedMessages,
        analyze: {
          ...state.analyze,
          messages: analyzeMessages,
          conversationVersion: state.analyze.conversationVersion + 1,
          phase: "conversation_loaded",
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
        },
        isDirty: true,
      };
    }

    // ── UI ──

    case "SELECT_MESSAGE":
      return { ...state, ui: { ...state.ui, selectedMessageId: action.messageId } };

    case "SET_EDITING_MESSAGE":
      return { ...state, ui: { ...state.ui, editingMessageId: action.messageId } };

    case "SET_ADDING_PARTICIPANT":
      return { ...state, ui: { ...state.ui, addingParticipant: action.value } };

    case "SET_RENAMING":
      return { ...state, ui: { ...state.ui, renaming: action.value } };

    case "SET_SHOW_DELETE_CONFIRM":
      return { ...state, ui: { ...state.ui, showDeleteConfirm: action.value } };

    // ── Persistence ──

    case "MARK_DIRTY":
      return { ...state, isDirty: true };

    case "MARK_SAVED":
      return { ...state, isDirty: false, lastSavedAt: action.savedAt };

    // ── Analyze delegation ──

    case "ANALYZE":
      return {
        ...state,
        analyze: analyzeReducer(state.analyze, action.action),
      };

    // ── Reset ──

    case "RESET_WORKSPACE":
      return { ...INITIAL_WORKSPACE_STATE };

    default:
      return state;
  }
}

// ─── Derived Workspace Helpers ───────────────────────────────────────────────

/** Get messages for the current user */
export function getUserMessages(state: WorkspaceState): WorkspaceMessage[] {
  return state.messages.filter((m) => m.sender === "user");
}

/** Get messages from other participants */
export function getParticipantMessages(state: WorkspaceState): WorkspaceMessage[] {
  return state.messages.filter((m) => m.sender !== "user");
}

/** Get a participant by ID */
export function getParticipantById(state: WorkspaceState, participantId: string): WorkspaceParticipant | undefined {
  return state.participants.find((p) => p.id === participantId);
}

/** Get the current user participant */
export function getUserParticipant(state: WorkspaceState): WorkspaceParticipant | undefined {
  return state.participants.find((p) => p.isUser);
}

/** Get non-user participants */
export function getOtherParticipants(state: WorkspaceState): WorkspaceParticipant[] {
  return state.participants.filter((p) => !p.isUser);
}

/** Check if workspace has unsaved changes */
export function hasUnsavedChanges(state: WorkspaceState): boolean {
  return state.isDirty;
}

/** Check if workspace is empty */
export function isWorkspaceEmpty(state: WorkspaceState): boolean {
  return state.messages.length === 0 && state.participants.length <= 1;
}

/** Get the maximum sequence number in messages */
export function getMaxSequence(state: WorkspaceState): number {
  if (state.messages.length === 0) return 0;
  return Math.max(...state.messages.map((m) => m.sequence));
}

/** Convert workspace messages to analyze-compatible format */
export function toAnalyzeMessages(state: WorkspaceState): Array<{ sender: "me" | "them"; text: string }> {
  return state.messages.map((m) => ({
    sender: m.sender === "user" ? ("me" as const) : ("them" as const),
    text: m.text,
  }));
}
