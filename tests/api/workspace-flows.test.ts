import { describe, it, expect } from "vitest";
import {
  workspaceReducer,
  INITIAL_WORKSPACE_STATE,
  type WorkspaceState,
} from "@/lib/ai/workspace-state";
import type { WorkspaceMessage, WorkspaceParticipant } from "@/lib/ai/workspace-types";

function createState(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return { ...INITIAL_WORKSPACE_STATE, ...overrides };
}

const mockParticipant: WorkspaceParticipant = {
  id: "p-1",
  workspaceId: "ws-1",
  displayName: "Alice",
  role: "friend",
  language: "english",
  isUser: false,
  metadata: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockUserParticipant: WorkspaceParticipant = {
  ...mockParticipant,
  id: "p-user",
  displayName: "You",
  role: "user",
  isUser: true,
};

function makeMessage(id: string, text: string, sender = "user", seq = 1): WorkspaceMessage {
  return {
    id,
    workspaceId: "ws-1",
    participantId: sender === "user" ? "p-user" : "p-1",
    sender,
    text,
    source: "manual",
    sequence: seq,
    metadata: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("Workspace Flow: Full conversation lifecycle", () => {
  it("creates workspace, adds participants, adds messages, commits draft", () => {
    let state = INITIAL_WORKSPACE_STATE;

    // Create workspace
    state = workspaceReducer(state, {
      type: "CREATE_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "New Conversation",
        platform: "Instagram",
        goal: null,
        language: null,
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });

    expect(state.workspaceId).toBe("ws-1");
    expect(state.messages).toHaveLength(0);

    // Add user participant
    state = workspaceReducer(state, {
      type: "ADD_PARTICIPANT",
      participant: mockUserParticipant,
    });

    // Add other participant
    state = workspaceReducer(state, {
      type: "ADD_PARTICIPANT",
      participant: mockParticipant,
    });

    expect(state.participants).toHaveLength(2);

    // Add messages
    state = workspaceReducer(state, {
      type: "ADD_MESSAGE",
      message: makeMessage("msg-1", "Hey!", "user", 1),
    });

    state = workspaceReducer(state, {
      type: "ADD_MESSAGE",
      message: makeMessage("msg-2", "What's up?", "other", 2),
    });

    state = workspaceReducer(state, {
      type: "ADD_MESSAGE",
      message: makeMessage("msg-3", "Not much, you?", "user", 3),
    });

    expect(state.messages).toHaveLength(3);
    expect(state.analyze.messages).toHaveLength(3);

    // Commit a draft
    state = workspaceReducer(state, {
      type: "COMMIT_DRAFT",
      message: makeMessage("msg-4", "Wanna hang out?", "user", 4),
    });

    expect(state.messages).toHaveLength(4);
    expect(state.analyze.draft).toBeNull();
  });
});

describe("Workspace Flow: Participant management", () => {
  it("adds and removes participants, preserving messages", () => {
    let state = createState({
      workspaceId: "ws-1",
      participants: [mockUserParticipant],
      messages: [makeMessage("msg-1", "Hi", "user", 1)],
    });

    // Add participant
    state = workspaceReducer(state, {
      type: "ADD_PARTICIPANT",
      participant: mockParticipant,
    });

    expect(state.participants).toHaveLength(2);

    // Add message from participant
    state = workspaceReducer(state, {
      type: "ADD_MESSAGE",
      message: makeMessage("msg-2", "Hello!", "other", 2),
    });

    // Remove participant
    state = workspaceReducer(state, {
      type: "REMOVE_PARTICIPANT",
      participantId: "p-1",
    });

    expect(state.participants).toHaveLength(1);
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].participantId).toBeNull();
  });

  it("cannot remove user participant", () => {
    let state = createState({
      participants: [mockUserParticipant, mockParticipant],
    });

    state = workspaceReducer(state, {
      type: "REMOVE_PARTICIPANT",
      participantId: "p-user",
    });

    expect(state.participants).toHaveLength(2);
  });

  it("updates participant display name", () => {
    let state = createState({
      participants: [mockUserParticipant, mockParticipant],
    });

    state = workspaceReducer(state, {
      type: "UPDATE_PARTICIPANT",
      participantId: "p-1",
      updates: { displayName: "Alicia" },
    });

    expect(state.participants.find((p) => p.id === "p-1")?.displayName).toBe("Alicia");
  });
});

describe("Workspace Flow: Message editing and deletion", () => {
  it("edits a message and invalidates derived state", () => {
    let state = createState({
      messages: [makeMessage("msg-1", "Original", "user", 1)],
      analyze: {
        ...INITIAL_WORKSPACE_STATE.analyze,
        conversationState: { relationship: "friend" } as any,
        draft: { text: "test" } as any,
      },
    });

    state = workspaceReducer(state, {
      type: "UPDATE_MESSAGE",
      messageId: "msg-1",
      updates: { text: "Edited" },
    });

    expect(state.messages[0].text).toBe("Edited");
    expect(state.analyze.conversationState).toBeNull();
    expect(state.analyze.draft).toBeNull();
  });

  it("deletes a message and resequences remaining", () => {
    let state = createState({
      messages: [
        makeMessage("msg-1", "First", "user", 1),
        makeMessage("msg-2", "Second", "other", 2),
        makeMessage("msg-3", "Third", "user", 3),
      ],
    });

    state = workspaceReducer(state, {
      type: "DELETE_MESSAGE",
      messageId: "msg-2",
    });

    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].sequence).toBe(1);
    expect(state.messages[1].sequence).toBe(2);
    expect(state.messages[1].text).toBe("Third");
  });

  it("replaces all messages with SET_MESSAGES", () => {
    let state = createState({
      messages: [makeMessage("msg-1", "Old", "user", 1)],
    });

    state = workspaceReducer(state, {
      type: "SET_MESSAGES",
      messages: [
        makeMessage("msg-10", "New 1", "user", 1),
        makeMessage("msg-11", "New 2", "other", 2),
      ],
    });

    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].text).toBe("New 1");
  });
});

describe("Workspace Flow: Dirty tracking and save", () => {
  it("marks dirty on mutations", () => {
    let state = createState({ workspaceId: "ws-1" });

    state = workspaceReducer(state, {
      type: "UPDATE_WORKSPACE",
      updates: { title: "New" },
      version: 2,
    });
    expect(state.isDirty).toBe(true);

    state = workspaceReducer(state, { type: "MARK_SAVED", savedAt: "2026-01-01T12:00:00Z" });
    expect(state.isDirty).toBe(false);

    state = workspaceReducer(state, {
      type: "ADD_MESSAGE",
      message: makeMessage("msg-1", "Hi", "user", 1),
    });
    expect(state.isDirty).toBe(true);
  });

  it("tracks last saved time", () => {
    let state = createState();
    const savedAt = "2026-06-15T10:30:00Z";

    state = workspaceReducer(state, { type: "MARK_SAVED", savedAt });
    expect(state.lastSavedAt).toBe(savedAt);
  });
});

describe("Workspace Flow: Analyze integration", () => {
  it("loads workspace and triggers analyze state", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "Test",
        platform: "WhatsApp",
        goal: "casual",
        language: "hindi",
        version: 1,
        conversationVersion: 3,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [mockUserParticipant, mockParticipant],
      messages: [
        makeMessage("msg-1", "Hey!", "user", 1),
        makeMessage("msg-2", "What's up?", "other", 2),
      ],
    });

    expect(state.analyze.phase).toBe("conversation_loaded");
    expect(state.analyze.messages).toHaveLength(2);
    expect(state.analyze.detectedContext?.platform).toBe("WhatsApp");
    expect(state.analyze.detectedContext?.language).toBe("hindi");
    expect(state.analyze.goal).toBe("casual");
  });

  it("delegates analyze actions correctly", () => {
    let state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "Test",
        platform: null,
        goal: null,
        language: null,
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [],
      messages: [makeMessage("msg-1", "Hello", "user", 1)],
    });

    state = workspaceReducer(state, {
      type: "ANALYZE",
      action: { type: "SET_GOAL", goal: "flirt_naturally" },
    });

    expect(state.analyze.goal).toBe("flirt_naturally");

    state = workspaceReducer(state, {
      type: "ANALYZE",
      action: { type: "SET_DRAFT", draft: "Hey, wanna grab coffee?" },
    });

    expect(state.analyze.draft?.currentDraft).toBe("Hey, wanna grab coffee?");
  });

  it("invalidates all derived state when messages change", () => {
    let state = createState({
      messages: [makeMessage("msg-1", "Hi", "user", 1)],
      analyze: {
        ...INITIAL_WORKSPACE_STATE.analyze,
        conversationState: {} as any,
        draft: {} as any,
        bestMatch: {} as any,
        alternatives: [{ text: "alt" } as any],
        draftAnalysis: {} as any,
        impactPrediction: {} as any,
        coaching: {} as any,
        improvementCandidates: [{ text: "imp" } as any],
        toneTransformCandidates: [{ text: "tone" } as any],
        preSendGate: {} as any,
      },
    });

    state = workspaceReducer(state, {
      type: "ADD_MESSAGE",
      message: makeMessage("msg-2", "New", "other", 2),
    });

    expect(state.analyze.conversationState).toBeNull();
    expect(state.analyze.draft).toBeNull();
    expect(state.analyze.bestMatch).toBeNull();
    expect(state.analyze.alternatives).toHaveLength(0);
    expect(state.analyze.draftAnalysis).toBeNull();
    expect(state.analyze.impactPrediction).toBeNull();
    expect(state.analyze.coaching).toBeNull();
    expect(state.analyze.improvementCandidates).toHaveLength(0);
    expect(state.analyze.toneTransformCandidates).toHaveLength(0);
    expect(state.analyze.preSendGate).toBeNull();
  });
});

describe("Workspace Flow: UI state management", () => {
  it("manages message selection", () => {
    let state = createState();

    state = workspaceReducer(state, { type: "SELECT_MESSAGE", messageId: "msg-1" });
    expect(state.ui.selectedMessageId).toBe("msg-1");

    state = workspaceReducer(state, { type: "SELECT_MESSAGE", messageId: null });
    expect(state.ui.selectedMessageId).toBeNull();
  });

  it("manages message editing", () => {
    let state = createState();

    state = workspaceReducer(state, { type: "SET_EDITING_MESSAGE", messageId: "msg-1" });
    expect(state.ui.editingMessageId).toBe("msg-1");

    state = workspaceReducer(state, { type: "SET_EDITING_MESSAGE", messageId: null });
    expect(state.ui.editingMessageId).toBeNull();
  });

  it("manages participant adding UI", () => {
    let state = createState();

    state = workspaceReducer(state, { type: "SET_ADDING_PARTICIPANT", value: true });
    expect(state.ui.addingParticipant).toBe(true);

    state = workspaceReducer(state, { type: "SET_ADDING_PARTICIPANT", value: false });
    expect(state.ui.addingParticipant).toBe(false);
  });

  it("manages rename UI", () => {
    let state = createState();

    state = workspaceReducer(state, { type: "SET_RENAMING", value: true });
    expect(state.ui.renaming).toBe(true);
  });

  it("manages delete confirm UI", () => {
    let state = createState();

    state = workspaceReducer(state, { type: "SET_SHOW_DELETE_CONFIRM", value: true });
    expect(state.ui.showDeleteConfirm).toBe(true);
  });
});

describe("Workspace Flow: Reset", () => {
  it("resets entire workspace state", () => {
    let state = createState({
      workspaceId: "ws-1",
      title: "Test",
      messages: [makeMessage("msg-1", "Hi", "user", 1)],
      participants: [mockUserParticipant],
      isDirty: true,
    });

    state = workspaceReducer(state, { type: "RESET_WORKSPACE" });

    expect(state).toEqual(INITIAL_WORKSPACE_STATE);
  });
});

describe("Workspace Flow: Multilingual support", () => {
  it("handles Telugu conversation", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "Telugu Chat",
        platform: "WhatsApp",
        goal: "casual",
        language: "telugu",
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [],
      messages: [
        makeMessage("msg-1", "హాయ్, ఎలా ఉన్నావ్?", "user", 1),
        makeMessage("msg-2", "నేను బాగున్నాను, నువ్వు?", "other", 2),
      ],
    });

    // detectedContext is set when messages exist and platform/language are set
    expect(state.analyze.detectedContext?.language).toBe("telugu");
    expect(state.analyze.messages[0].text).toBe("హాయ్, ఎలా ఉన్నావ్?");
  });

  it("handles Hindi conversation", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "Hindi Chat",
        platform: "Instagram",
        goal: "romantic",
        language: "hindi",
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [],
      messages: [
        makeMessage("msg-1", "कैसे हो?", "user", 1),
        makeMessage("msg-2", "मैं ठीक हूँ, तुम कैसे हो?", "other", 2),
      ],
    });

    expect(state.analyze.detectedContext?.language).toBe("hindi");
    expect(state.analyze.messages[1].text).toBe("मैं ठीक हूँ, तुम कैसे हो?");
  });

  it("handles code-mixed conversation", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "Code-mixed Chat",
        platform: "WhatsApp",
        goal: "casual",
        language: "romanized",
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [],
      messages: [
        makeMessage("msg-1", "hey, kya kar raha hai?", "user", 1),
        makeMessage("msg-2", "kuch nahi, tu bata", "other", 2),
      ],
    });

    expect(state.analyze.detectedContext?.language).toBe("romanized");
  });
});

describe("Workspace Flow: Platform-specific", () => {
  it("handles Instagram workspace", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "Instagram DM",
        platform: "Instagram",
        goal: "flirty",
        language: "english",
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [],
      messages: [makeMessage("msg-1", "Hey!", "user", 1)],
    });

    expect(state.analyze.detectedContext?.platform).toBe("Instagram");
  });

  it("handles WhatsApp workspace", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "WhatsApp Group",
        platform: "WhatsApp",
        goal: "casual",
        language: "english",
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [],
      messages: [makeMessage("msg-1", "Hey!", "user", 1)],
    });

    expect(state.analyze.detectedContext?.platform).toBe("WhatsApp");
  });

  it("handles LinkedIn workspace", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: {
        id: "ws-1",
        userId: "user-1",
        title: "LinkedIn Message",
        platform: "LinkedIn",
        goal: "professional",
        language: "english",
        version: 1,
        conversationVersion: 0,
        lastActiveAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      participants: [],
      messages: [makeMessage("msg-1", "Hey!", "user", 1)],
    });

    expect(state.analyze.detectedContext?.platform).toBe("LinkedIn");
    expect(state.analyze.goal).toBe("professional");
  });
});
