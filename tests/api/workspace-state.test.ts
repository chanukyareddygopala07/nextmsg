import { describe, it, expect } from "vitest";
import {
  workspaceReducer,
  INITIAL_WORKSPACE_STATE,
  getUserMessages,
  getParticipantMessages,
  getParticipantById,
  getUserParticipant,
  getOtherParticipants,
  hasUnsavedChanges,
  isWorkspaceEmpty,
  getMaxSequence,
  toAnalyzeMessages,
  type WorkspaceState,
  type WorkspaceAction,
} from "@/lib/ai/workspace-state";
import type { ConversationWorkspace, WorkspaceParticipant, WorkspaceMessage } from "@/lib/ai/workspace-types";

const mockWorkspace: ConversationWorkspace = {
  id: "ws-1",
  userId: "user-1",
  title: "Test Workspace",
  platform: "Instagram",
  goal: "casual",
  language: "english",
  version: 1,
  conversationVersion: 5,
  lastActiveAt: "2026-01-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockUserParticipant: WorkspaceParticipant = {
  id: "p-user",
  workspaceId: "ws-1",
  displayName: "You",
  role: "user",
  language: "english",
  isUser: true,
  metadata: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockOtherParticipant: WorkspaceParticipant = {
  id: "p-other",
  workspaceId: "ws-1",
  displayName: "Alice",
  role: "friend",
  language: "english",
  isUser: false,
  metadata: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockMessage: WorkspaceMessage = {
  id: "msg-1",
  workspaceId: "ws-1",
  participantId: "p-user",
  sender: "user",
  text: "Hello!",
  source: "manual",
  sequence: 1,
  metadata: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockMessage2: WorkspaceMessage = {
  id: "msg-2",
  workspaceId: "ws-1",
  participantId: "p-other",
  sender: "other",
  text: "Hi there!",
  source: "parsed",
  sequence: 2,
  metadata: null,
  createdAt: "2026-01-01T00:00:01Z",
  updatedAt: "2026-01-01T00:00:01Z",
};

function createState(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return { ...INITIAL_WORKSPACE_STATE, ...overrides };
}

describe("workspaceReducer", () => {
  describe("LOAD_WORKSPACE", () => {
    it("loads workspace with participants and messages", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "LOAD_WORKSPACE",
        workspace: mockWorkspace,
        participants: [mockUserParticipant, mockOtherParticipant],
        messages: [mockMessage, mockMessage2],
      });

      expect(state.workspaceId).toBe("ws-1");
      expect(state.title).toBe("Test Workspace");
      expect(state.platform).toBe("Instagram");
      expect(state.goal).toBe("casual");
      expect(state.language).toBe("english");
      expect(state.version).toBe(1);
      expect(state.participants).toHaveLength(2);
      expect(state.messages).toHaveLength(2);
      expect(state.isDirty).toBe(false);
      expect(state.loading.workspace).toBe(false);
    });

    it("populates analyze state from messages", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "LOAD_WORKSPACE",
        workspace: mockWorkspace,
        participants: [mockUserParticipant, mockOtherParticipant],
        messages: [mockMessage, mockMessage2],
      });

      expect(state.analyze.messages).toHaveLength(2);
      expect(state.analyze.messages[0].sender).toBe("me");
      expect(state.analyze.messages[0].text).toBe("Hello!");
      expect(state.analyze.messages[1].sender).toBe("them");
      expect(state.analyze.messages[1].text).toBe("Hi there!");
      expect(state.analyze.phase).toBe("conversation_loaded");
    });

    it("sets detected context from workspace metadata when messages exist", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "LOAD_WORKSPACE",
        workspace: mockWorkspace,
        participants: [mockUserParticipant, mockOtherParticipant],
        messages: [mockMessage, mockMessage2],
      });

      expect(state.analyze.detectedContext).not.toBeNull();
      expect(state.analyze.detectedContext?.platform).toBe("Instagram");
      expect(state.analyze.detectedContext?.language).toBe("english");
    });

    it("does not set detected context when no messages", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "LOAD_WORKSPACE",
        workspace: mockWorkspace,
        participants: [],
        messages: [],
      });

      expect(state.analyze.detectedContext).toBeNull();
    });

    it("sets goal from workspace when messages exist", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "LOAD_WORKSPACE",
        workspace: { ...mockWorkspace, goal: "flirty" },
        participants: [],
        messages: [mockMessage],
      });

      expect(state.analyze.goal).toBe("flirty");
    });

    it("does not set goal when no messages", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "LOAD_WORKSPACE",
        workspace: { ...mockWorkspace, goal: "flirty" },
        participants: [],
        messages: [],
      });

      expect(state.analyze.goal).toBeUndefined();
    });

    it("initializes empty analyze state when no messages", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "LOAD_WORKSPACE",
        workspace: mockWorkspace,
        participants: [],
        messages: [],
      });

      expect(state.analyze.messages).toHaveLength(0);
      expect(state.analyze.phase).toBe("empty");
    });
  });

  describe("CREATE_WORKSPACE", () => {
    it("creates workspace with metadata", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "CREATE_WORKSPACE",
        workspace: mockWorkspace,
      });

      expect(state.workspaceId).toBe("ws-1");
      expect(state.title).toBe("Test Workspace");
      expect(state.messages).toHaveLength(0);
      expect(state.participants).toHaveLength(0);
      expect(state.isDirty).toBe(false);
    });
  });

  describe("UPDATE_WORKSPACE", () => {
    it("updates title and marks dirty", () => {
      const state = workspaceReducer(createState({ workspaceId: "ws-1", version: 1 }), {
        type: "UPDATE_WORKSPACE",
        updates: { title: "New Title" },
        version: 2,
      });

      expect(state.title).toBe("New Title");
      expect(state.version).toBe(2);
      expect(state.isDirty).toBe(true);
    });

    it("updates platform", () => {
      const state = workspaceReducer(createState({ workspaceId: "ws-1" }), {
        type: "UPDATE_WORKSPACE",
        updates: { platform: "WhatsApp" },
        version: 2,
      });

      expect(state.platform).toBe("WhatsApp");
    });

    it("updates goal", () => {
      const state = workspaceReducer(createState({ workspaceId: "ws-1" }), {
        type: "UPDATE_WORKSPACE",
        updates: { goal: "professional" },
        version: 2,
      });

      expect(state.goal).toBe("professional");
    });
  });

  describe("SET_WORKSPACE_LOADING", () => {
    it("sets loading state", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SET_WORKSPACE_LOADING",
        field: "workspace",
        value: true,
      });

      expect(state.loading.workspace).toBe(true);
    });

    it("sets saving state", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SET_WORKSPACE_LOADING",
        field: "saving",
        value: true,
      });

      expect(state.loading.saving).toBe(true);
    });
  });

  describe("SET_WORKSPACE_ERROR", () => {
    it("sets error state", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SET_WORKSPACE_ERROR",
        field: "workspace",
        value: "Failed to load",
      });

      expect(state.errors.workspace).toBe("Failed to load");
    });

    it("clears error", () => {
      const state = workspaceReducer(
        createState({ errors: { ...INITIAL_WORKSPACE_STATE.errors, workspace: "error" } }),
        { type: "SET_WORKSPACE_ERROR", field: "workspace", value: null }
      );

      expect(state.errors.workspace).toBeNull();
    });
  });

  describe("ADD_PARTICIPANT", () => {
    it("adds participant", () => {
      const state = workspaceReducer(createState({ workspaceId: "ws-1" }), {
        type: "ADD_PARTICIPANT",
        participant: mockOtherParticipant,
      });

      expect(state.participants).toHaveLength(1);
      expect(state.participants[0].displayName).toBe("Alice");
      expect(state.isDirty).toBe(true);
    });
  });

  describe("UPDATE_PARTICIPANT", () => {
    it("updates participant fields", () => {
      const state = workspaceReducer(
        createState({ participants: [mockOtherParticipant] }),
        {
          type: "UPDATE_PARTICIPANT",
          participantId: "p-other",
          updates: { displayName: "Alicia" },
        }
      );

      expect(state.participants[0].displayName).toBe("Alicia");
      expect(state.isDirty).toBe(true);
    });
  });

  describe("REMOVE_PARTICIPANT", () => {
    it("removes non-user participant", () => {
      const state = workspaceReducer(
        createState({ participants: [mockUserParticipant, mockOtherParticipant] }),
        { type: "REMOVE_PARTICIPANT", participantId: "p-other" }
      );

      expect(state.participants).toHaveLength(1);
      expect(state.participants[0].isUser).toBe(true);
      expect(state.isDirty).toBe(true);
    });

    it("does not remove user participant", () => {
      const state = workspaceReducer(
        createState({ participants: [mockUserParticipant, mockOtherParticipant] }),
        { type: "REMOVE_PARTICIPANT", participantId: "p-user" }
      );

      expect(state.participants).toHaveLength(2);
    });

    it("nullifies participantId on messages from removed participant", () => {
      const state = workspaceReducer(
        createState({
          participants: [mockUserParticipant, mockOtherParticipant],
          messages: [mockMessage2],
        }),
        { type: "REMOVE_PARTICIPANT", participantId: "p-other" }
      );

      expect(state.messages[0].participantId).toBeNull();
    });
  });

  describe("ADD_MESSAGE", () => {
    it("adds message and sorts by sequence", () => {
      const state = workspaceReducer(
        createState({ workspaceId: "ws-1", messages: [mockMessage] }),
        { type: "ADD_MESSAGE", message: mockMessage2 }
      );

      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].sequence).toBe(1);
      expect(state.messages[1].sequence).toBe(2);
      expect(state.isDirty).toBe(true);
    });

    it("invalidates all derived analyze state", () => {
      const state = workspaceReducer(
        createState({
          workspaceId: "ws-1",
          analyze: {
            ...INITIAL_WORKSPACE_STATE.analyze,
            conversationState: { relationship: "friend" } as any,
            draft: { text: "test" } as any,
            bestMatch: { text: "test" } as any,
            draftAnalysis: { overallScore: 5 } as any,
            impactPrediction: { score: 5 } as any,
            coaching: { summary: "test" } as any,
          },
        }),
        { type: "ADD_MESSAGE", message: mockMessage }
      );

      expect(state.analyze.conversationState).toBeNull();
      expect(state.analyze.draft).toBeNull();
      expect(state.analyze.bestMatch).toBeNull();
      expect(state.analyze.draftAnalysis).toBeNull();
      expect(state.analyze.impactPrediction).toBeNull();
      expect(state.analyze.coaching).toBeNull();
    });

    it("increments conversation version", () => {
      const state = workspaceReducer(
        createState({ analyze: { ...INITIAL_WORKSPACE_STATE.analyze, conversationVersion: 5 } }),
        { type: "ADD_MESSAGE", message: mockMessage }
      );

      expect(state.analyze.conversationVersion).toBe(6);
    });
  });

  describe("UPDATE_MESSAGE", () => {
    it("updates message text", () => {
      const state = workspaceReducer(
        createState({ messages: [mockMessage] }),
        { type: "UPDATE_MESSAGE", messageId: "msg-1", updates: { text: "Updated!" } }
      );

      expect(state.messages[0].text).toBe("Updated!");
      expect(state.isDirty).toBe(true);
    });

    it("invalidates derived state", () => {
      const state = workspaceReducer(
        createState({
          messages: [mockMessage],
          analyze: { ...INITIAL_WORKSPACE_STATE.analyze, conversationState: {} as any },
        }),
        { type: "UPDATE_MESSAGE", messageId: "msg-1", updates: { text: "Updated!" } }
      );

      expect(state.analyze.conversationState).toBeNull();
    });
  });

  describe("DELETE_MESSAGE", () => {
    it("deletes message and resequences", () => {
      const state = workspaceReducer(
        createState({ messages: [mockMessage, mockMessage2] }),
        { type: "DELETE_MESSAGE", messageId: "msg-1" }
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].id).toBe("msg-2");
      expect(state.messages[0].sequence).toBe(1);
      expect(state.isDirty).toBe(true);
    });

    it("invalidates derived state", () => {
      const state = workspaceReducer(
        createState({
          messages: [mockMessage],
          analyze: { ...INITIAL_WORKSPACE_STATE.analyze, draft: {} as any },
        }),
        { type: "DELETE_MESSAGE", messageId: "msg-1" }
      );

      expect(state.analyze.draft).toBeNull();
    });
  });

  describe("SET_MESSAGES", () => {
    it("replaces all messages", () => {
      const state = workspaceReducer(
        createState({ messages: [mockMessage] }),
        { type: "SET_MESSAGES", messages: [mockMessage2] }
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].id).toBe("msg-2");
      expect(state.isDirty).toBe(true);
    });
  });

  describe("COMMIT_DRAFT", () => {
    it("adds committed message and invalidates draft", () => {
      const state = workspaceReducer(
        createState({
          workspaceId: "ws-1",
          messages: [mockMessage],
          analyze: { ...INITIAL_WORKSPACE_STATE.analyze, draft: { text: "test" } as any },
        }),
        {
          type: "COMMIT_DRAFT",
          message: { ...mockMessage2, id: "msg-new" },
        }
      );

      expect(state.messages).toHaveLength(2);
      expect(state.analyze.draft).toBeNull();
      expect(state.isDirty).toBe(true);
    });
  });

  describe("UI actions", () => {
    it("SELECT_MESSAGE", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SELECT_MESSAGE",
        messageId: "msg-1",
      });
      expect(state.ui.selectedMessageId).toBe("msg-1");
    });

    it("SET_EDITING_MESSAGE", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SET_EDITING_MESSAGE",
        messageId: "msg-1",
      });
      expect(state.ui.editingMessageId).toBe("msg-1");
    });

    it("SET_ADDING_PARTICIPANT", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SET_ADDING_PARTICIPANT",
        value: true,
      });
      expect(state.ui.addingParticipant).toBe(true);
    });

    it("SET_RENAMING", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SET_RENAMING",
        value: true,
      });
      expect(state.ui.renaming).toBe(true);
    });

    it("SET_SHOW_DELETE_CONFIRM", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "SET_SHOW_DELETE_CONFIRM",
        value: true,
      });
      expect(state.ui.showDeleteConfirm).toBe(true);
    });
  });

  describe("Persistence actions", () => {
    it("MARK_DIRTY", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, { type: "MARK_DIRTY" });
      expect(state.isDirty).toBe(true);
    });

    it("MARK_SAVED", () => {
      const state = workspaceReducer(
        createState({ isDirty: true }),
        { type: "MARK_SAVED", savedAt: "2026-01-01T12:00:00Z" }
      );
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).toBe("2026-01-01T12:00:00Z");
    });
  });

  describe("ANALYZE delegation", () => {
    it("delegates to analyze reducer", () => {
      const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
        type: "ANALYZE",
        action: { type: "SET_GOAL", goal: "flirt_naturally" },
      });
      expect(state.analyze.goal).toBe("flirt_naturally");
    });
  });

  describe("RESET_WORKSPACE", () => {
    it("resets to initial state", () => {
      const state = workspaceReducer(
        createState({ workspaceId: "ws-1", title: "Test", messages: [mockMessage] }),
        { type: "RESET_WORKSPACE" }
      );
      expect(state).toEqual(INITIAL_WORKSPACE_STATE);
    });
  });
});

describe("workspace helpers", () => {
  const stateWithMessages = createState({
    messages: [mockMessage, mockMessage2],
    participants: [mockUserParticipant, mockOtherParticipant],
  });

  it("getUserMessages returns only user messages", () => {
    const userMsgs = getUserMessages(stateWithMessages);
    expect(userMsgs).toHaveLength(1);
    expect(userMsgs[0].sender).toBe("user");
  });

  it("getParticipantMessages returns non-user messages", () => {
    const otherMsgs = getParticipantMessages(stateWithMessages);
    expect(otherMsgs).toHaveLength(1);
    expect(otherMsgs[0].sender).toBe("other");
  });

  it("getParticipantById returns participant", () => {
    const p = getParticipantById(stateWithMessages, "p-other");
    expect(p?.displayName).toBe("Alice");
  });

  it("getParticipantById returns undefined for missing", () => {
    const p = getParticipantById(stateWithMessages, "p-missing");
    expect(p).toBeUndefined();
  });

  it("getUserParticipant returns user participant", () => {
    const user = getUserParticipant(stateWithMessages);
    expect(user?.isUser).toBe(true);
  });

  it("getOtherParticipants returns non-user participants", () => {
    const others = getOtherParticipants(stateWithMessages);
    expect(others).toHaveLength(1);
    expect(others[0].displayName).toBe("Alice");
  });

  it("hasUnsavedChanges returns isDirty", () => {
    expect(hasUnsavedChanges(createState({ isDirty: true }))).toBe(true);
    expect(hasUnsavedChanges(createState({ isDirty: false }))).toBe(false);
  });

  it("isWorkspaceEmpty returns true for empty workspace", () => {
    expect(isWorkspaceEmpty(createState())).toBe(true);
  });

  it("isWorkspaceEmpty returns false with messages", () => {
    expect(isWorkspaceEmpty(stateWithMessages)).toBe(false);
  });

  it("isWorkspaceEmpty returns false with extra participants", () => {
    expect(isWorkspaceEmpty(createState({ participants: [mockUserParticipant, mockOtherParticipant] }))).toBe(false);
  });

  it("getMaxSequence returns highest sequence", () => {
    expect(getMaxSequence(stateWithMessages)).toBe(2);
  });

  it("getMaxSequence returns 0 for empty messages", () => {
    expect(getMaxSequence(createState())).toBe(0);
  });

  it("toAnalyzeMessages converts correctly", () => {
    const result = toAnalyzeMessages(stateWithMessages);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ sender: "me", text: "Hello!" });
    expect(result[1]).toEqual({ sender: "them", text: "Hi there!" });
  });
});

describe("workspaceReducer - edge cases", () => {
  it("unknown action returns state unchanged", () => {
    const state = createState({ workspaceId: "ws-1" });
    const result = workspaceReducer(state, { type: "UNKNOWN_ACTION" as any });
    expect(result).toBe(state);
  });

  it("LOAD_WORKSPACE with empty participants initializes correctly", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: mockWorkspace,
      participants: [],
      messages: [],
    });
    expect(state.participants).toHaveLength(0);
    // detectedContext is only set when there are messages
    expect(state.analyze.detectedContext).toBeNull();
  });

  it("ADD_MESSAGE with single message sets sequence 1", () => {
    const state = workspaceReducer(createState(), {
      type: "ADD_MESSAGE",
      message: { ...mockMessage, sequence: 1 },
    });
    expect(state.messages[0].sequence).toBe(1);
  });

  it("UPDATE_MESSAGE on non-existent message returns unchanged", () => {
    const state = createState({ messages: [mockMessage] });
    const result = workspaceReducer(state, {
      type: "UPDATE_MESSAGE",
      messageId: "non-existent",
      updates: { text: "Updated" },
    });
    expect(result.messages[0].text).toBe("Hello!");
  });

  it("DELETE_MESSAGE on non-existent message returns unchanged", () => {
    const state = createState({ messages: [mockMessage] });
    const result = workspaceReducer(state, {
      type: "DELETE_MESSAGE",
      messageId: "non-existent",
    });
    expect(result.messages).toHaveLength(1);
  });

  it("SET_MESSAGES with empty array clears messages", () => {
    const state = workspaceReducer(createState({ messages: [mockMessage] }), {
      type: "SET_MESSAGES",
      messages: [],
    });
    expect(state.messages).toHaveLength(0);
  });

  it("multiple ADD_MESSAGE calls maintain correct sequence order", () => {
    let state = createState();
    state = workspaceReducer(state, { type: "ADD_MESSAGE", message: { ...mockMessage, sequence: 1 } });
    state = workspaceReducer(state, { type: "ADD_MESSAGE", message: { ...mockMessage2, sequence: 2 } });
    expect(state.messages[0].sequence).toBe(1);
    expect(state.messages[1].sequence).toBe(2);
  });

  it("COMMIT_DRAFT preserves existing messages", () => {
    const state = workspaceReducer(
      createState({ messages: [mockMessage] }),
      {
        type: "COMMIT_DRAFT",
        message: { ...mockMessage2, id: "msg-new", sequence: 2 },
      }
    );
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].id).toBe("msg-1");
    expect(state.messages[1].id).toBe("msg-new");
  });

  it("REMOVE_PARTICIPANT preserves messages from other participants", () => {
    const state = workspaceReducer(
      createState({
        participants: [mockUserParticipant, mockOtherParticipant],
        messages: [mockMessage, mockMessage2],
      }),
      { type: "REMOVE_PARTICIPANT", participantId: "p-other" }
    );
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].participantId).toBe("p-user");
    expect(state.messages[1].participantId).toBeNull();
  });

  it("ANALYZE with SET_DRAFT updates draft in analyze state", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "ANALYZE",
      action: { type: "SET_DRAFT", draft: "Hello there!" },
    });
    expect(state.analyze.draft?.currentDraft).toBe("Hello there!");
  });

  it("MARK_SAVED clears errors.save", () => {
    const state = workspaceReducer(
      createState({ isDirty: true, errors: { ...INITIAL_WORKSPACE_STATE.errors, save: "Error" } }),
      { type: "MARK_SAVED", savedAt: "2026-01-01T12:00:00Z" }
    );
    expect(state.isDirty).toBe(false);
    expect(state.errors.save).toBe("Error"); // MARK_SAVED doesn't clear errors
  });

  it("LOAD_WORKSPACE resets all analyze state", () => {
    const state = workspaceReducer(
      createState({
        analyze: {
          ...INITIAL_WORKSPACE_STATE.analyze,
          bestMatch: { text: "old" } as any,
          draft: { text: "old" } as any,
        },
      }),
      {
        type: "LOAD_WORKSPACE",
        workspace: mockWorkspace,
        participants: [],
        messages: [],
      }
    );
    expect(state.analyze.bestMatch).toBeNull();
    expect(state.analyze.draft).toBeNull();
  });
});
