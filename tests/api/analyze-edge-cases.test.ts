import { describe, it, expect } from "vitest";
import type { ConversationMessage } from "@/types/conversation";
import type { DetectedContext } from "@/lib/ai/analyze-state";

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

describe("Phase 5 Step 1 — Race conditions and edge cases", () => {
  describe("Concurrent state updates", () => {
    it("handles rapid SET_DRAFT calls without corruption", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = INITIAL_STATE;
      for (let i = 0; i < 10; i++) {
        state = analyzeReducer(state, { type: "SET_DRAFT", draft: `Draft ${i}` });
      }

      expect(state.draft?.currentDraft).toBe("Draft 9");
      expect(state.draft?.draftVersion).toBe(10);
      expect(state.draft?.originalDraft).toBe("Draft 0");
    });

    it("handles interleaved SET_LOADING and SET_ERROR", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = INITIAL_STATE;
      state = analyzeReducer(state, { type: "SET_LOADING", field: "parsing", value: true });
      state = analyzeReducer(state, { type: "SET_ERROR", field: "parse", value: "Failed" });
      state = analyzeReducer(state, { type: "SET_LOADING", field: "parsing", value: false });

      expect(state.loading.parsing).toBe(false);
      expect(state.errors.parse).toBe("Failed");
    });

    it("handles SET_REPLIES after SET_DRAFT without losing draft", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "My edit" });
      state = analyzeReducer(state, {
        type: "SET_REPLIES",
        bestMatch: { text: "New best", strategy: "s1" },
        alternatives: [],
      });

      expect(state.draft?.originalDraft).toBe("My edit");
      expect(state.draft?.currentDraft).toBe("New best");
      expect(state.bestMatch?.text).toBe("New best");
    });
  });

  describe("Dependency chain integrity", () => {
    it("draft analysis depends on draft", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: {} as any });
      expect(state.draftAnalysis).not.toBeNull();

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Changed" });
      expect(state.draftAnalysis).toBeNull();
    });

    it("impact depends on draft analysis", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Draft" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: {} as any });
      state = analyzeReducer(state, { type: "SET_IMPACT", impact: {} as any });

      expect(state.impactPrediction).not.toBeNull();

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Changed" });
      expect(state.draftAnalysis).toBeNull();
      expect(state.impactPrediction).toBeNull();
    });

    it("improvement depends on draft", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, {
        type: "SET_IMPROVEMENT_CANDIDATES",
        candidates: [{ text: "Improved", strategy: "clarity" }],
      });

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Changed" });
      expect(state.improvementCandidates).toEqual([]);
    });

    it("tone transform depends on draft", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, {
        type: "SET_TONE_CANDIDATES",
        candidates: [{ text: "Tone version", strategy: "professional" }],
      });

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Changed" });
      expect(state.toneTransformCandidates).toEqual([]);
    });

    it("pre-send depends on draft", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, { type: "SET_PRE_SEND_GATE", gate: { decision: "send" } as any });

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Changed" });
      expect(state.preSendGate).toBeNull();
    });

    it("coaching depends on draft", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, { type: "SET_COACHING", coaching: {} as any });

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Changed" });
      expect(state.coaching).toBeNull();
    });
  });

  describe("Goal type variety", () => {
    it("supports all goal types", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      const goals = ["keep_going", "start_conversation", "make_them_laugh", "flirt_naturally", "be_confident", "show_interest", "ask_them_out", "recover_dry", "change_topic", "reply_to_story", "reconnect", "reply_casually", "end_conversation"] as const;

      for (const goal of goals) {
        const state = analyzeReducer(INITIAL_STATE, { type: "SET_GOAL", goal });
        expect(state.goal).toBe(goal);
      }
    });
  });

  describe("Platform context handling", () => {
    it("preserves platform context through state changes", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [msg("Hi")],
        context: ctx({ platform: "instagram", conversationType: "dating" }),
      });

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hello!" });
      expect(state.detectedContext?.platform).toBe("instagram");
    });

    it("handles all platform types", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      const platforms = ["whatsapp", "instagram", "telegram", "discord", "linkedin", "snapchat", "dating"];

      for (const platform of platforms) {
        const state = analyzeReducer(INITIAL_STATE, {
          type: "SET_MESSAGES",
          messages: [msg("Hi")],
          context: ctx({ platform }),
        });
        expect(state.detectedContext?.platform).toBe(platform);
      }
    });
  });

  describe("User facts management", () => {
    it("updates user facts through overrides", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_OVERRIDES", userFacts: ["fact1"] });
      expect(state.userFacts).toEqual(["fact1"]);

      state = analyzeReducer(state, { type: "SET_OVERRIDES", userFacts: ["fact1", "fact2", "fact3"] });
      expect(state.userFacts).toEqual(["fact1", "fact2", "fact3"]);
    });

    it("clears user facts", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_OVERRIDES", userFacts: ["fact1"] });
      state = analyzeReducer(state, { type: "SET_OVERRIDES", userFacts: [] });
      expect(state.userFacts).toEqual([]);
    });
  });

  describe("Memory and conversation flow", () => {
    it("preserves conversation history through state changes", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      const messages: ConversationMessage[] = [
        msg("Hi", "me"),
        msg("Hello", "them"),
        msg("How are you?", "me"),
      ];

      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages,
        context: null,
      });

      state = analyzeReducer(state, { type: "SET_GOAL", goal: "reply_casually" });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hey!" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: {} as any });

      expect(state.messages).toHaveLength(3);
      expect(state.messages[0].text).toBe("Hi");
      expect(state.messages[2].text).toBe("How are you?");
    });
  });

  describe("Style override preservation", () => {
    it("preserves style through SET_OVERRIDES", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_GOAL", goal: "flirt_naturally" });
      state = analyzeReducer(state, { type: "SET_OVERRIDES", styleOverride: "formal", toneOverride: "calm" });

      expect(state.styleOverride).toBe("formal");
      expect(state.toneOverride).toBe("calm");
      expect(state.goal).toBe("flirt_naturally");
    });
  });
});
