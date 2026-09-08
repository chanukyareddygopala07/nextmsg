import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
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

// ── Mock dependencies ──
vi.mock("@/lib/db", () => ({
  prisma: {
    communicationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    feedbackEvent: {
      create: vi.fn(),
      count: vi.fn(),
    },
    personalizationSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    userFact: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/ai/personalization", () => ({
  processFeedbackSignal: vi.fn(),
  buildPreferenceProfile: vi.fn(),
  getPreferencesForSession: vi.fn(),
  resetLearnedPreferences: vi.fn(),
}));

describe("Phase 5 Step 1 — Integration contracts", () => {
  describe("Analyze state transitions", () => {
    it("supports full conversation flow without errors", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = INITIAL_STATE;

      // 1. Parse conversation
      state = analyzeReducer(state, {
        type: "SET_MESSAGES",
        messages: [
          msg("Hey, sorry I'm late", "me"),
          msg("No worries, what happened?", "them"),
        ],
        context: ctx({ platform: "whatsapp", conversationType: "personal", language: "english" }),
      });
      expect(state.phase).toBe("conversation_loaded");
      expect(state.messages).toHaveLength(2);

      // 2. Set goal
      state = analyzeReducer(state, { type: "SET_GOAL", goal: "flirt_naturally" });
      expect(state.goal).toBe("flirt_naturally");

      // 3. Generate replies (simulate)
      state = analyzeReducer(state, {
        type: "SET_REPLIES",
        bestMatch: { text: "Sorry about that! Got stuck in a meeting", strategy: "accountable" },
        alternatives: [
          { text: "My bad, something came up", strategy: "casual" },
        ],
      });
      expect(state.phase).toBe("ready");
      expect(state.bestMatch?.text).toContain("Sorry");

      // 4. User selects draft
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hey, really sorry! Running late from a meeting" });
      expect(state.phase).toBe("draft_entered");

      // 5. Draft analysis arrives
      state = analyzeReducer(state, {
        type: "SET_DRAFT_ANALYSIS",
        analysis: { overallScore: 0.85, goalAlignment: 0.9, naturalness: 0.8 } as any,
      });
      expect(state.phase).toBe("draft_analyzed");

      // 6. Impact prediction arrives
      state = analyzeReducer(state, {
        type: "SET_IMPACT",
        impact: { overallImpact: 0.8, goalAdvancement: 0.9 } as any,
      });
      expect(state.phase).toBe("impact_analyzed");

      // 7. Intelligence arrives
      state = analyzeReducer(state, {
        type: "SET_INTELLIGENCE",
        recoveryGuidance: {
          requiredElements: ["acknowledgement", "accountability"],
          recommendedStrategies: ["accountable"],
          conflictAdjusted: false,
          groupAdjusted: false,
        },
        conflictIntelligence: null,
        participants: null,
      });
      expect(state.recoveryGuidance?.requiredElements).toContain("acknowledgement");

      // 8. Pre-send check
      state = analyzeReducer(state, {
        type: "SET_PRE_SEND_GATE",
        gate: { decision: "send", score: 0.9, reasoning: "Good" } as any,
      });
      expect(state.preSendGate?.decision).toBe("send");
    });

    it("handles draft editing flow with proper invalidation", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Original reply", strategy: "s1" },
        alternatives: [],
      });

      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "My edit 1" });
      expect(state.draft?.originalDraft).toBe("Original reply");
      expect(state.draft?.currentDraft).toBe("My edit 1");
      expect(state.draft?.draftVersion).toBe(2);

      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: {} as any });
      state = analyzeReducer(state, { type: "SET_IMPACT", impact: {} as any });

      // Editing draft invalidates downstream
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "My edit 2" });
      expect(state.draftAnalysis).toBeNull();
      expect(state.impactPrediction).toBeNull();
      expect(state.draft?.currentDraft).toBe("My edit 2");
      expect(state.draft?.originalDraft).toBe("Original reply"); // Preserved
    });

    it("handles improvement flow", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Hello" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: {} as any });

      state = analyzeReducer(state, {
        type: "SET_IMPROVEMENT_CANDIDATES",
        candidates: [
          { text: "Improved 1", strategy: "clarity" },
          { text: "Improved 2", strategy: "professional" },
        ],
      });
      expect(state.improvementCandidates).toHaveLength(2);

      // Selecting a candidate sets it as current draft
      state = analyzeReducer(state, {
        type: "SELECT_CANDIDATE",
        candidate: { text: "Improved 1", strategy: "clarity" },
      });
      expect(state.draft?.currentDraft).toBe("Improved 1");
      expect(state.improvementCandidates).toEqual([]);
    });

    it("handles tone transformation flow", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });

      state = analyzeReducer(state, {
        type: "SET_TONE_CANDIDATES",
        candidates: [{ text: "Professional version", strategy: "professional" }],
      });
      expect(state.toneTransformCandidates).toHaveLength(1);

      state = analyzeReducer(state, {
        type: "SELECT_CANDIDATE",
        candidate: { text: "Professional version", strategy: "tone_transformed" },
      });
      expect(state.draft?.currentDraft).toBe("Professional version");
      expect(state.toneTransformCandidates).toEqual([]);
    });

    it("handles preference updates without breaking state", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [msg("Hi")],
        context: null,
      });

      state = analyzeReducer(state, {
        type: "SET_PREFERENCES",
        preferences: { dimensions: { formality: { value: "high", confidence: 0.8 } } } as any,
      });

      expect(state.preferences).not.toBeNull();
      expect(state.messages).toHaveLength(1);
      expect(state.phase).toBe("conversation_loaded");
    });
  });

  describe("Stale request protection", () => {
    it("requestVersion is preserved across state changes", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [msg("Hi")],
        context: null,
      });

      const initialVersion = state.requestVersion;
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Test" });
      expect(state.requestVersion).toBe(initialVersion);
    });
  });

  describe("Recovery and conflict intelligence", () => {
    it("stores and retrieves intelligence data", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      const recoveryGuidance = {
        requiredElements: ["acknowledgement", "accountability", "solution"],
        recommendedStrategies: ["accountable", "empathetic"],
        conflictAdjusted: true,
        groupAdjusted: false,
      };

      const conflictIntelligence = {
        conflictLevel: 0.7,
        escalationTrend: "increasing" as const,
        trigger: "Missed deadline",
        coreDisagreement: "Timeline expectations",
        misunderstandings: [
          { description: "Thought deadline was flexible", resolutionSuggestion: "Clarify expectations" },
        ],
        resolutionOpportunities: [
          { type: "compromise", description: "Set new deadline", difficulty: "moderate" as const },
        ],
      };

      const participants = [
        {
          participantId: "user1",
          label: "You",
          position: { mainPosition: "Apologizing", requestedOutcome: "Forgiveness" },
          intent: "apologize",
          emotion: { primary: "regretful", secondary: "anxious", intensity: 0.7, confidence: "high" },
          tone: { primary: "sincere", secondary: "nervous", intensity: 0.6 },
          stance: "cooperative" as const,
        },
        {
          participantId: "user2",
          label: "Manager",
          position: { mainPosition: "Expecting accountability", requestedOutcome: "Explanation" },
          intent: "seek_accountability",
          emotion: { primary: "frustrated", secondary: "disappointed", intensity: 0.6, confidence: "medium" },
          tone: { primary: "serious", secondary: "measured", intensity: 0.5 },
          stance: "neutral" as const,
        },
      ];

      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_INTELLIGENCE",
        recoveryGuidance,
        conflictIntelligence,
        participants,
      });

      expect(state.recoveryGuidance).toEqual(recoveryGuidance);
      expect(state.conflictIntelligence).toEqual(conflictIntelligence);
      expect(state.participants).toHaveLength(2);
      expect(state.participants![0].stance).toBe("cooperative");
    });
  });

  describe("Multilingual support in state", () => {
    it("preserves language context through state transitions", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [msg("నమస్కారం")],
        context: ctx({ platform: "whatsapp", language: "telugu" }),
      });

      state = analyzeReducer(state, { type: "SET_OVERRIDES", languageOverride: "telugu" });
      expect(state.languageOverride).toBe("telugu");
      expect(state.detectedContext?.language).toBe("telugu");
    });

    it("handles code-mixed language context", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [msg("Hey, how are you doing?")],
        context: ctx({ platform: "instagram", language: "english" }),
      });

      expect(state.detectedContext?.language).toBe("english");
    });
  });

  describe("Error handling", () => {
    it("multiple errors can coexist", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_ERROR", field: "parse", value: "Parse error" });
      state = analyzeReducer(state, { type: "SET_ERROR", field: "generate", value: "Generate error" });

      expect(state.errors.parse).toBe("Parse error");
      expect(state.errors.generate).toBe("Generate error");
    });

    it("clearing one error doesn't affect others", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_ERROR", field: "parse", value: "Parse error" });
      state = analyzeReducer(state, { type: "SET_ERROR", field: "generate", value: "Generate error" });
      state = analyzeReducer(state, { type: "SET_ERROR", field: "parse", value: null });

      expect(state.errors.parse).toBeNull();
      expect(state.errors.generate).toBe("Generate error");
    });

    it("RESET clears all errors", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_ERROR", field: "parse", value: "Error" });
      state = analyzeReducer(state, { type: "SET_ERROR", field: "generate", value: "Error" });
      state = analyzeReducer(state, { type: "RESET" });

      expect(state.errors.parse).toBeNull();
      expect(state.errors.generate).toBeNull();
    });
  });

  describe("Conversation versioning", () => {
    it("increments conversation version on each message set", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [msg("Hi")],
        context: null,
      });
      expect(state.conversationVersion).toBe(1);

      state = analyzeReducer(state, {
        type: "SET_MESSAGES",
        messages: [
          msg("Hi", "me"),
          msg("Hello", "them"),
        ],
        context: null,
      });
      expect(state.conversationVersion).toBe(2);
    });
  });

  describe("Goal override behavior", () => {
    it("override takes precedence over auto-detected goal", async () => {
      const { analyzeReducer, INITIAL_STATE } = await import("@/lib/ai/analyze-state");

      let state = analyzeReducer(INITIAL_STATE, { type: "SET_GOAL", goal: "flirt_naturally" });
      state = analyzeReducer(state, { type: "SET_OVERRIDES", goalOverride: "be_confident" });

      expect(state.goal).toBe("flirt_naturally");
      expect(state.goalOverride).toBe("be_confident");
    });
  });
});
