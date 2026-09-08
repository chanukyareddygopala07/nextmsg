// ─── Conversation Workspace Types ──────────────────────────────────────────────
//
// Types for the Conversation Workspace system.
// A workspace is a persistent conversation context that allows users to:
// - Maintain ongoing conversations
// - Track participants
// - Iterate through drafts with intelligence
// - Resume conversations across sessions
//
// Architecture:
//   Workspace (source data) → ConversationState (derived) → Intelligence
//   Source data is authoritative. Derived data is recomputed.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Workspace Message ────────────────────────────────────────────────────────

/** Role of a message sender */
export type MessageRole = "user" | "participant" | "system";

/** Source of a message in the workspace */
export type MessageSource = "user" | "parsed" | "manual" | "imported";

/** A message within a conversation workspace */
export interface WorkspaceMessage {
  id: string;
  workspaceId: string;
  participantId: string | null;
  sender: string;
  text: string;
  source: MessageSource;
  sequence: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a workspace message */
export interface CreateMessageInput {
  participantId?: string;
  sender: string;
  text: string;
  source?: MessageSource;
  metadata?: Record<string, unknown>;
}

/** Input for updating a workspace message */
export interface UpdateMessageInput {
  text?: string;
  sender?: string;
  participantId?: string;
  metadata?: Record<string, unknown>;
}

// ─── Workspace Participant ────────────────────────────────────────────────────

/** A participant in a conversation workspace */
export interface WorkspaceParticipant {
  id: string;
  workspaceId: string;
  displayName: string;
  role: string;
  language: string | null;
  isUser: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a workspace participant */
export interface CreateParticipantInput {
  displayName: string;
  role?: string;
  language?: string;
  isUser?: boolean;
  metadata?: Record<string, unknown>;
}

/** Input for updating a workspace participant */
export interface UpdateParticipantInput {
  displayName?: string;
  role?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

// ─── Conversation Workspace ───────────────────────────────────────────────────

/** A conversation workspace */
export interface ConversationWorkspace {
  id: string;
  userId: string;
  title: string;
  platform: string | null;
  goal: string | null;
  language: string | null;
  version: number;
  conversationVersion: number;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Full workspace with related data */
export interface WorkspaceWithRelations extends ConversationWorkspace {
  participants: WorkspaceParticipant[];
  messages: WorkspaceMessage[];
}

/** Input for creating a workspace */
export interface CreateWorkspaceInput {
  title?: string;
  platform?: string;
  goal?: string;
  language?: string;
}

/** Input for updating a workspace */
export interface UpdateWorkspaceInput {
  title?: string;
  platform?: string;
  goal?: string;
  language?: string;
}

// ─── Workspace List ───────────────────────────────────────────────────────────

/** Workspace preview for list view (no full message history) */
export interface WorkspacePreview {
  id: string;
  title: string;
  platform: string | null;
  goal: string | null;
  messageCount: number;
  participantCount: number;
  lastActiveAt: string;
  updatedAt: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

/** Standard API response wrapper */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/** Workspace list response */
export interface WorkspaceListResponse {
  workspaces: WorkspacePreview[];
}

/** Single workspace response */
export interface WorkspaceResponse {
  workspace: WorkspaceWithRelations;
}

/** Message response */
export interface MessageResponse {
  message: WorkspaceMessage;
}

/** Participant response */
export interface ParticipantResponse {
  participant: WorkspaceParticipant;
}

// ─── Workspace Validation Limits ──────────────────────────────────────────────

export const WORKSPACE_LIMITS = {
  MAX_TITLE_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_MESSAGES_PER_WORKSPACE: 500,
  MAX_PARTICIPANTS: 20,
  MAX_METADATA_SIZE: 4096,
} as const;

// ─── Workspace State (client-side) ────────────────────────────────────────────

/** Client-side workspace loading state */
export interface WorkspaceLoadingState {
  workspace: boolean;
  messages: boolean;
  saving: boolean;
}

/** Client-side workspace error state */
export interface WorkspaceErrorState {
  workspace: string | null;
  messages: string | null;
  save: string | null;
  participant: string | null;
}

/** Client-side workspace UI state */
export interface WorkspaceUIState {
  selectedMessageId: string | null;
  editingMessageId: string | null;
  addingParticipant: boolean;
  renaming: boolean;
  showDeleteConfirm: boolean;
}
