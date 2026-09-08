import { describe, it, expect } from "vitest";
import {
  analyzeReducer,
  INITIAL_STATE,
  getEffectiveDraft,
  getOriginalDraft,
  hasDraftChanged,
  isLoading,
  getFirstError,
  isConversationLoaded,
  isStateAnalyzed,
  hasDraft,
  type AnalyzeSessionState,
  type DetectedContext,
} from "@/lib/ai/analyze-state";
import type { ConversationMessage } from "@/types/conversation";

function msg(text: string, sender: "me" | "them" | "unknown" = "me"): ConversationMessage {
  return { sender, text };
}

function ctx(overrides: Partial<DetectedContext> = {}): DetectedContext {
  return {
    language: "english",
    script: "latin",
    tone: "casual",
    conversationType: "personal",
    urgency: "low",
    userStyle: "relaxed",
    ...overrides,
  };
}

describe("Phase 5 Step 1 — Helper function edge cases", () => {
  describe("getEffectiveDraft edge cases", () => {
    it("returns empty string for INITIAL_STATE", () => {
      expect(getEffectiveDraft(INITIAL_STATE)).toBe("");
    });

    it("returns draft when both draft and bestMatch exist", () => {
      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Best", strategy: "s1" },
        alternatives: [],
      });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Draft" });
      expect(getEffectiveDraft(state)).toBe("Draft");
    });

    it("returns bestMatch when only bestMatch exists", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Best", strategy: "s1" },
        alternatives: [],
      });
      expect(getEffectiveDraft(state)).toBe("Best");
    });

    it("returns modified draft text", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Modified" });
      expect(getEffectiveDraft(state)).toBe("Modified");
    });
  });

  describe("getOriginalDraft edge cases", () => {
    it("returns empty for INITIAL_STATE", () => {
      expect(getOriginalDraft(INITIAL_STATE)).toBe("");
    });

    it("preserves first draft text", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "First" });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Second" });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Third" });
      expect(getOriginalDraft(state)).toBe("First");
    });

    it("returns bestMatch text as originalDraft when SET_REPLIES without SET_DRAFT", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Best", strategy: "s1" },
        alternatives: [],
      });
      expect(getOriginalDraft(state)).toBe("Best");
    });
  });

  describe("hasDraftChanged edge cases", () => {
    it("returns false for INITIAL_STATE", () => {
      expect(hasDraftChanged(INITIAL_STATE)).toBe(false);
    });

    it("returns false when only bestMatch set", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Best", strategy: "s1" },
        alternatives: [],
      });
      expect(hasDraftChanged(state)).toBe(false);
    });

    it("returns true after candidate selection", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, {
        type: "SELECT_CANDIDATE",
        candidate: { text: "Improved", strategy: "improved" },
      });
      expect(hasDraftChanged(state)).toBe(true);
    });
  });

  describe("isLoading edge cases", () => {
    it("returns false for INITIAL_STATE", () => {
      expect(isLoading(INITIAL_STATE)).toBe(false);
    });

    it("detects single loading field", () => {
      const state = { ...INITIAL_STATE, loading: { ...INITIAL_STATE.loading, coaching: true } };
      expect(isLoading(state)).toBe(true);
    });

    it("detects multiple loading fields", () => {
      const state = {
        ...INITIAL_STATE,
        loading: { ...INITIAL_STATE.loading, parsing: true, generating: true, coaching: true },
      };
      expect(isLoading(state)).toBe(true);
    });

    it("returns false when all loading cleared", () => {
      let state = { ...INITIAL_STATE, loading: { ...INITIAL_STATE.loading, parsing: true } };
      state = { ...state, loading: { ...state.loading, parsing: false } };
      expect(isLoading(state)).toBe(false);
    });
  });

  describe("getFirstError edge cases", () => {
    it("returns null for INITIAL_STATE", () => {
      expect(getFirstError(INITIAL_STATE)).toBeNull();
    });

    it("returns first error when multiple exist", () => {
      const state = {
        ...INITIAL_STATE,
        errors: { ...INITIAL_STATE.errors, generate: "Second", parse: "First" },
      };
      expect(getFirstError(state)).toBe("First");
    });

    it("skips null errors", () => {
      const state = {
        ...INITIAL_STATE,
        errors: { ...INITIAL_STATE.errors, parse: null, generate: "Error" },
      };
      expect(getFirstError(state)).toBe("Error");
    });
  });

  describe("isConversationLoaded edge cases", () => {
    it("returns false for INITIAL_STATE", () => {
      expect(isConversationLoaded(INITIAL_STATE)).toBe(false);
    });

    it("returns true with single message", () => {
      const state = { ...INITIAL_STATE, messages: [msg("Hi")] };
      expect(isConversationLoaded(state)).toBe(true);
    });
  });

  describe("isStateAnalyzed edge cases", () => {
    it("returns false for INITIAL_STATE", () => {
      expect(isStateAnalyzed(INITIAL_STATE)).toBe(false);
    });

    it("returns true when conversation state set", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_CONVERSATION_STATE",
        state: {} as any,
      });
      expect(isStateAnalyzed(state)).toBe(true);
    });
  });

  describe("hasDraft edge cases", () => {
    it("returns false for INITIAL_STATE", () => {
      expect(hasDraft(INITIAL_STATE)).toBe(false);
    });

    it("returns true with draft only", () => {
      const state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Hello" });
      expect(hasDraft(state)).toBe(true);
    });

    it("returns true with bestMatch only", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Hi", strategy: "s1" },
        alternatives: [],
      });
      expect(hasDraft(state)).toBe(true);
    });

    it("returns true with both", () => {
      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Hi", strategy: "s1" },
        alternatives: [],
      });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hello" });
      expect(hasDraft(state)).toBe(true);
    });
  });
});

describe("Phase 5 Step 1 — State persistence through operations", () => {
  it("persists detectedContext through draft edits", async () => {
    let state = analyzeReducer(INITIAL_STATE, {
      type: "SET_MESSAGES",
      messages: [msg("Hi")],
      context: ctx({ platform: "telegram", language: "hindi" }),
    });

    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hello" });
    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Modified" });

    expect(state.detectedContext?.platform).toBe("telegram");
    expect(state.detectedContext?.language).toBe("hindi");
  });

    it("persists preferences through all operations", async () => {
      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_PREFERENCES",
        preferences: { dimensions: { formality: { value: "high", confidence: 0.9 } } } as any,
      });

      state = analyzeReducer(state, {
        type: "SET_MESSAGES",
        messages: [msg("Hi")],
        context: null,
      });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hello" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: {} as any });

      expect(state.preferences).not.toBeNull();
    });

  it("persists requestVersion through all operations", async () => {
    let state = analyzeReducer(INITIAL_STATE, {
      type: "SET_MESSAGES",
      messages: [msg("Hi")],
      context: null,
    });

    const version = state.requestVersion;
    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hello" });
    state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: {} as any });
    state = analyzeReducer(state, {
      type: "SET_REPLIES",
      bestMatch: { text: "Hi", strategy: "s1" },
      alternatives: [],
    });

    expect(state.requestVersion).toBe(version);
  });

  it("persists userFacts through goal changes", async () => {
    let state = analyzeReducer(INITIAL_STATE, {
      type: "SET_OVERRIDES",
      userFacts: ["fact1", "fact2"],
    });

    state = analyzeReducer(state, { type: "SET_GOAL", goal: "flirt_naturally" });
    state = analyzeReducer(state, { type: "SET_GOAL", goal: "be_confident" });

    expect(state.userFacts).toEqual(["fact1", "fact2"]);
  });

  it("persists all override fields through draft changes", async () => {
    let state = analyzeReducer(INITIAL_STATE, {
      type: "SET_OVERRIDES",
      goalOverride: "be_confident",
      styleOverride: "formal",
      toneOverride: "calm",
      languageOverride: "telugu",
      situationOverride: "late_submission",
      userFacts: ["fact1"],
    });

    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hello" });

    expect(state.goalOverride).toBe("be_confident");
    expect(state.styleOverride).toBe("formal");
    expect(state.toneOverride).toBe("calm");
    expect(state.languageOverride).toBe("telugu");
    expect(state.situationOverride).toBe("late_submission");
    expect(state.userFacts).toEqual(["fact1"]);
  });
});
