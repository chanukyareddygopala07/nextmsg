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

function makeContext(overrides: Partial<DetectedContext> = {}): DetectedContext {
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
import type { DraftAnalysis } from "@/lib/ai/draft-types";
import type { CommunicationImpactPrediction } from "@/lib/ai/impact-types";
import type { ConversationCoachingResult } from "@/lib/ai/coaching-types";
import type { PreSendGateResult } from "@/lib/ai/pre-send-types";

function makeMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    sender: "me",
    text: "Hello",
    ...overrides,
  };
}

function makeDraftAnalysis(overrides: Partial<DraftAnalysis> = {}): DraftAnalysis {
  return {
    overallScore: 0.8,
    goalAlignment: 0.9,
    emotionalIntelligence: 0.7,
    naturalness: 0.85,
    persuasiveness: 0.6,
    vulnerabilities: [],
    opportunities: [],
    suggestedImprovements: [],
    strengths: [],
    goalAlignmentDetails: "Good",
    emotionalIntelligenceDetails: "Decent",
    naturalnessDetails: "Natural",
    persuasivenessDetails: "Moderate",
    ...overrides,
  } as DraftAnalysis;
}

function makeImpactPrediction(overrides: Partial<CommunicationImpactPrediction> = {}): CommunicationImpactPrediction {
  return {
    overallImpact: 0.8,
    goalAdvancement: 0.9,
    emotionalImpact: 0.7,
    relationshipImpact: 0.8,
    riskAssessment: "low",
    keyFactors: [],
    improvementSuggestions: [],
    ...overrides,
  } as CommunicationImpactPrediction;
}

function makeCoachingResult(overrides: Partial<ConversationCoachingResult> = {}): ConversationCoachingResult {
  return {
    recommendations: [],
    patterns: [],
    overallScore: 0.8,
    coachingTips: [],
    ...overrides,
  } as ConversationCoachingResult;
}

function makePreSendGate(overrides: Partial<PreSendGateResult> = {}): PreSendGateResult {
  return {
    decision: "send",
    score: 0.9,
    reasoning: "Looks good",
    risks: [],
    improvements: [],
    preservationChecks: [],
    ...overrides,
  } as PreSendGateResult;
}

describe("analyzeReducer", () => {
  describe("SET_MESSAGES", () => {
    it("sets messages and transitions to conversation_loaded", () => {
      const messages = [makeMessage(), makeMessage({ text: "Hi" })];
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages,
        context: makeContext({ platform: "whatsapp" }),
      });

      expect(result.messages).toHaveLength(2);
      expect(result.detectedContext?.platform).toBe("whatsapp");
      expect(result.phase).toBe("conversation_loaded");
      expect(result.conversationVersion).toBe(1);
    });

    it("preserves other state", () => {
      const messages = [makeMessage()];
      const result = analyzeReducer(
        { ...INITIAL_STATE, goal: "flirt_naturally" },
        { type: "SET_MESSAGES", messages, context: null }
      );
      expect(result.goal).toBe("flirt_naturally");
    });
  });

  describe("SET_OVERRIDES", () => {
    it("sets goal override", () => {
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_OVERRIDES",
        goalOverride: "professional",
      });
      expect(result.goalOverride).toBe("professional");
    });

    it("sets multiple overrides", () => {
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_OVERRIDES",
        goalOverride: "professional",
        styleOverride: "formal",
        toneOverride: "calm",
        languageOverride: "english",
        situationOverride: "late_submission",
        userFacts: ["fact1", "fact2"],
      });
      expect(result.goalOverride).toBe("professional");
      expect(result.styleOverride).toBe("formal");
      expect(result.toneOverride).toBe("calm");
      expect(result.languageOverride).toBe("english");
      expect(result.situationOverride).toBe("late_submission");
      expect(result.userFacts).toEqual(["fact1", "fact2"]);
    });
  });

  describe("SET_GOAL", () => {
    it("sets the goal", () => {
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_GOAL",
        goal: "flirt_naturally",
      });
      expect(result.goal).toBe("flirt_naturally");
    });
  });

  describe("SET_CONVERSATION_STATE", () => {
    it("sets conversation state and transitions", () => {
      const state = {
        relationship: "friend",
        context: { type: "casual" },
        intent: { userIntent: "chat" },
        language: { primary: "english" },
      } as any;
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_CONVERSATION_STATE",
        state,
      });
      expect(result.conversationState).toBe(state);
      expect(result.phase).toBe("state_analyzed");
      expect(result.stateVersion).toBe(1);
    });
  });

  describe("SET_DRAFT", () => {
    it("creates draft tracking on first set", () => {
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_DRAFT",
        draft: "Hello there!",
      });
      expect(result.draft).toEqual({
        originalDraft: "Hello there!",
        currentDraft: "Hello there!",
        draftVersion: 1,
      });
      expect(result.phase).toBe("draft_entered");
    });

    it("updates draft version on subsequent sets", () => {
      const stateWithDraft = analyzeReducer(INITIAL_STATE, {
        type: "SET_DRAFT",
        draft: "Hello!",
      });
      const result = analyzeReducer(stateWithDraft, {
        type: "SET_DRAFT",
        draft: "Hello there!",
      });
      expect(result.draft?.originalDraft).toBe("Hello!");
      expect(result.draft?.currentDraft).toBe("Hello there!");
      expect(result.draft?.draftVersion).toBe(2);
    });

    it("invalidates draft dependencies on change", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Draft 1" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: makeDraftAnalysis() });
      state = analyzeReducer(state, { type: "SET_IMPACT", impact: makeImpactPrediction() });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Draft 2" });

      expect(state.draftAnalysis).toBeNull();
      expect(state.impactPrediction).toBeNull();
      expect(state.improvementCandidates).toEqual([]);
      expect(state.toneTransformCandidates).toEqual([]);
      expect(state.preSendGate).toBeNull();
    });
  });

  describe("SELECT_CANDIDATE", () => {
    it("sets candidate as current draft and invalidates dependencies", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: makeDraftAnalysis() });

      state = analyzeReducer(state, {
        type: "SELECT_CANDIDATE",
        candidate: { text: "Improved version", strategy: "improved" },
      });

      expect(state.draft?.currentDraft).toBe("Improved version");
      expect(state.draft?.originalDraft).toBe("Original");
      expect(state.draft?.draftVersion).toBe(2);
      expect(state.draftAnalysis).toBeNull();
    });
  });

  describe("SET_REPLIES", () => {
    it("sets replies and transitions to ready", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Best reply", strategy: "strategy1" },
        alternatives: [{ text: "Alt 1", strategy: "strategy2" }],
      });

      expect(state.bestMatch?.text).toBe("Best reply");
      expect(state.alternatives).toHaveLength(1);
      expect(state.phase).toBe("ready");
      expect(state.draft?.originalDraft).toBe("Best reply");
      expect(state.draft?.currentDraft).toBe("Best reply");
    });
  });

  describe("SET_DRAFT_ANALYSIS", () => {
    it("sets analysis and transitions", () => {
      const analysis = makeDraftAnalysis();
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_DRAFT_ANALYSIS",
        analysis,
      });
      expect(result.draftAnalysis).toBe(analysis);
      expect(result.phase).toBe("draft_analyzed");
    });
  });

  describe("SET_IMPACT", () => {
    it("sets impact prediction and transitions", () => {
      const impact = makeImpactPrediction();
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_IMPACT",
        impact,
      });
      expect(result.impactPrediction).toBe(impact);
      expect(result.phase).toBe("impact_analyzed");
    });
  });

  describe("SET_COACHING", () => {
    it("sets coaching and transitions conditionally", () => {
      const coaching = makeCoachingResult();

      const withDraftAnalysis = analyzeReducer(
        { ...INITIAL_STATE, draftAnalysis: makeDraftAnalysis() },
        { type: "SET_COACHING", coaching }
      );
      expect(withDraftAnalysis.phase).toBe("coached");

      const withoutDraftAnalysis = analyzeReducer(INITIAL_STATE, {
        type: "SET_COACHING",
        coaching,
      });
      expect(withoutDraftAnalysis.phase).toBe("empty");
    });
  });

  describe("SET_IMPROVEMENT_CANDIDATES", () => {
    it("sets improvement candidates", () => {
      const candidates = [{ text: "Improved 1", strategy: "clarity" }];
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_IMPROVEMENT_CANDIDATES",
        candidates,
      });
      expect(result.improvementCandidates).toEqual(candidates);
    });
  });

  describe("SET_TONE_CANDIDATES", () => {
    it("sets tone transform candidates", () => {
      const candidates = [{ text: "Tone version", strategy: "professional" }];
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_TONE_CANDIDATES",
        candidates,
      });
      expect(result.toneTransformCandidates).toEqual(candidates);
    });
  });

  describe("SET_PRE_SEND_GATE", () => {
    it("sets pre-send gate result", () => {
      const gate = makePreSendGate();
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_PRE_SEND_GATE",
        gate,
      });
      expect(result.preSendGate).toBe(gate);
    });
  });

  describe("SET_INTELLIGENCE", () => {
    it("sets intelligence data from generation", () => {
      const recoveryGuidance = {
        requiredElements: ["acknowledgement", "accountability"],
        recommendedStrategies: ["accountable", "empathetic"],
        conflictAdjusted: true,
        groupAdjusted: false,
      };
      const conflictIntelligence = {
        conflictLevel: 0.6,
        escalationTrend: "increasing",
        trigger: "Missed deadline",
        coreDisagreement: "Timeline expectations",
        misunderstandings: [],
        resolutionOpportunities: [],
      };
      const participants = [
        {
          participantId: "user1",
          label: "You",
          position: { mainPosition: "Apologizing", requestedOutcome: "Forgiveness" },
          intent: "apologize",
          emotion: { primary: "regretful", secondary: "anxious", intensity: 0.7, confidence: "high" },
          tone: { primary: "sincere", secondary: "nervous", intensity: 0.6 },
          stance: "cooperative",
        },
      ];

      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_INTELLIGENCE",
        recoveryGuidance,
        conflictIntelligence,
        participants,
      });

      expect(result.recoveryGuidance).toEqual(recoveryGuidance);
      expect(result.conflictIntelligence).toEqual(conflictIntelligence);
      expect(result.participants).toEqual(participants);
    });
  });

  describe("SET_LOADING", () => {
    it("sets loading state for specific field", () => {
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_LOADING",
        field: "parsing",
        value: true,
      });
      expect(result.loading.parsing).toBe(true);
      expect(result.loading.generating).toBe(false);
    });

    it("can clear loading", () => {
      const state = { ...INITIAL_STATE, loading: { ...INITIAL_STATE.loading, parsing: true } };
      const result = analyzeReducer(state, {
        type: "SET_LOADING",
        field: "parsing",
        value: false,
      });
      expect(result.loading.parsing).toBe(false);
    });
  });

  describe("SET_ERROR", () => {
    it("sets error for specific field", () => {
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_ERROR",
        field: "parse",
        value: "Invalid screenshot",
      });
      expect(result.errors.parse).toBe("Invalid screenshot");
      expect(result.errors.generate).toBeNull();
    });

    it("can clear error", () => {
      const state = { ...INITIAL_STATE, errors: { ...INITIAL_STATE.errors, parse: "Error" } };
      const result = analyzeReducer(state, {
        type: "SET_ERROR",
        field: "parse",
        value: null,
      });
      expect(result.errors.parse).toBeNull();
    });
  });

  describe("SET_PREFERENCES", () => {
    it("sets personalization preferences", () => {
      const prefs = { formality: 0.8, verbosity: 0.3 } as any;
      const result = analyzeReducer(INITIAL_STATE, {
        type: "SET_PREFERENCES",
        preferences: prefs,
      });
      expect(result.preferences).toBe(prefs);
    });
  });

  describe("INVALIDATE_DRAFT_DEPENDENCIES", () => {
    it("clears all draft-dependent data", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Test" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: makeDraftAnalysis() });
      state = analyzeReducer(state, { type: "SET_IMPACT", impact: makeImpactPrediction() });
      state = analyzeReducer(state, { type: "SET_COACHING", coaching: makeCoachingResult() });
      state = analyzeReducer(state, { type: "SET_IMPROVEMENT_CANDIDATES", candidates: [{ text: "x", strategy: "y" }] });
      state = analyzeReducer(state, { type: "SET_TONE_CANDIDATES", candidates: [{ text: "x", strategy: "y" }] });
      state = analyzeReducer(state, { type: "SET_PRE_SEND_GATE", gate: makePreSendGate() });

      const result = analyzeReducer(state, { type: "INVALIDATE_DRAFT_DEPENDENCIES" });

      expect(result.draftAnalysis).toBeNull();
      expect(result.impactPrediction).toBeNull();
      expect(result.coaching).toBeNull();
      expect(result.improvementCandidates).toEqual([]);
      expect(result.toneTransformCandidates).toEqual([]);
      expect(result.preSendGate).toBeNull();
    });
  });

  describe("INVALIDATE_ALL", () => {
    it("clears everything", () => {
      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [makeMessage()],
        context: makeContext({ platform: "whatsapp" }),
      });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Test" });
      state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: makeDraftAnalysis() });

      const result = analyzeReducer(state, { type: "INVALIDATE_ALL" });

      expect(result.messages).toEqual([]);
      expect(result.detectedContext).toBeNull();
      expect(result.draft).toBeNull();
      expect(result.draftAnalysis).toBeNull();
      expect(result.phase).toBe("empty");
    });
  });

  describe("RESET", () => {
    it("resets to initial state", () => {
      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_MESSAGES",
        messages: [makeMessage()],
        context: makeContext({ platform: "whatsapp" }),
      });
      state = analyzeReducer(state, { type: "SET_GOAL", goal: "flirt_naturally" });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Test" });

      const result = analyzeReducer(state, { type: "RESET" });

      expect(result).toEqual(INITIAL_STATE);
    });
  });
});

describe("Helper functions", () => {
  describe("getEffectiveDraft", () => {
    it("returns empty string when no draft", () => {
      expect(getEffectiveDraft(INITIAL_STATE)).toBe("");
    });

    it("returns draft currentDraft", () => {
      const state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Hello" });
      expect(getEffectiveDraft(state)).toBe("Hello");
    });

    it("returns bestMatch text when no draft", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Best", strategy: "s1" },
        alternatives: [],
      });
      expect(getEffectiveDraft(state)).toBe("Best");
    });

    it("prefers draft over bestMatch", () => {
      let state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Best", strategy: "s1" },
        alternatives: [],
      });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Draft text" });
      expect(getEffectiveDraft(state)).toBe("Draft text");
    });
  });

  describe("getOriginalDraft", () => {
    it("returns empty string when no draft", () => {
      expect(getOriginalDraft(INITIAL_STATE)).toBe("");
    });

    it("returns original draft text", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Modified" });
      expect(getOriginalDraft(state)).toBe("Original");
    });
  });

  describe("hasDraftChanged", () => {
    it("returns false when no draft", () => {
      expect(hasDraftChanged(INITIAL_STATE)).toBe(false);
    });

    it("returns false when draft unchanged", () => {
      const state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Same" });
      expect(hasDraftChanged(state)).toBe(false);
    });

    it("returns true when draft modified", () => {
      let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
      state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Modified" });
      expect(hasDraftChanged(state)).toBe(true);
    });
  });

  describe("isLoading", () => {
    it("returns false when nothing loading", () => {
      expect(isLoading(INITIAL_STATE)).toBe(false);
    });

    it("returns true when any loading active", () => {
      const state = { ...INITIAL_STATE, loading: { ...INITIAL_STATE.loading, parsing: true } };
      expect(isLoading(state)).toBe(true);
    });
  });

  describe("getFirstError", () => {
    it("returns null when no errors", () => {
      expect(getFirstError(INITIAL_STATE)).toBeNull();
    });

    it("returns first non-null error", () => {
      const state = {
        ...INITIAL_STATE,
        errors: { ...INITIAL_STATE.errors, parse: "Error 1", generate: "Error 2" },
      };
      expect(getFirstError(state)).toBe("Error 1");
    });
  });

  describe("isConversationLoaded", () => {
    it("returns false when no messages", () => {
      expect(isConversationLoaded(INITIAL_STATE)).toBe(false);
    });

    it("returns true when messages present", () => {
      const state = { ...INITIAL_STATE, messages: [makeMessage()] };
      expect(isConversationLoaded(state)).toBe(true);
    });
  });

  describe("isStateAnalyzed", () => {
    it("returns false when no conversation state", () => {
      expect(isStateAnalyzed(INITIAL_STATE)).toBe(false);
    });

    it("returns true when conversation state present", () => {
      const state = { ...INITIAL_STATE, conversationState: {} as any };
      expect(isStateAnalyzed(state)).toBe(true);
    });
  });

  describe("hasDraft", () => {
    it("returns false when no draft or bestMatch", () => {
      expect(hasDraft(INITIAL_STATE)).toBe(false);
    });

    it("returns true when draft present", () => {
      const state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Hello" });
      expect(hasDraft(state)).toBe(true);
    });

    it("returns true when bestMatch present", () => {
      const state = analyzeReducer(INITIAL_STATE, {
        type: "SET_REPLIES",
        bestMatch: { text: "Hi", strategy: "s1" },
        alternatives: [],
      });
      expect(hasDraft(state)).toBe(true);
    });
  });
});

describe("Phase transitions", () => {
  it("follows correct phase lifecycle", () => {
    let state = INITIAL_STATE;
    expect(state.phase).toBe("empty");

    state = analyzeReducer(state, {
      type: "SET_MESSAGES",
      messages: [makeMessage()],
      context: null,
    });
    expect(state.phase).toBe("conversation_loaded");

    state = analyzeReducer(state, {
      type: "SET_CONVERSATION_STATE",
      state: {} as any,
    });
    expect(state.phase).toBe("state_analyzed");

    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Hello" });
    expect(state.phase).toBe("draft_entered");

    state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: makeDraftAnalysis() });
    expect(state.phase).toBe("draft_analyzed");

    state = analyzeReducer(state, { type: "SET_IMPACT", impact: makeImpactPrediction() });
    expect(state.phase).toBe("impact_analyzed");

    state = analyzeReducer(state, { type: "SET_COACHING", coaching: makeCoachingResult() });
    expect(state.phase).toBe("coached");

    state = analyzeReducer(state, {
      type: "SET_REPLIES",
      bestMatch: { text: "Hi", strategy: "s1" },
      alternatives: [],
    });
    expect(state.phase).toBe("ready");
  });

  it("allows skipping phases when data arrives out of order", () => {
    let state = INITIAL_STATE;

    state = analyzeReducer(state, {
      type: "SET_MESSAGES",
      messages: [makeMessage()],
      context: null,
    });
    expect(state.phase).toBe("conversation_loaded");

    state = analyzeReducer(state, {
      type: "SET_REPLIES",
      bestMatch: { text: "Hi", strategy: "s1" },
      alternatives: [],
    });
    expect(state.phase).toBe("ready");
  });
});

describe("Invalidation rules", () => {
  it("SET_DRAFT invalidates draft-dependent data", () => {
    let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
    state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: makeDraftAnalysis() });
    state = analyzeReducer(state, { type: "SET_IMPACT", impact: makeImpactPrediction() });
    state = analyzeReducer(state, { type: "SET_IMPROVEMENT_CANDIDATES", candidates: [{ text: "x", strategy: "y" }] });
    state = analyzeReducer(state, { type: "SET_TONE_CANDIDATES", candidates: [{ text: "x", strategy: "y" }] });
    state = analyzeReducer(state, { type: "SET_PRE_SEND_GATE", gate: makePreSendGate() });

    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Modified" });

    expect(state.draftAnalysis).toBeNull();
    expect(state.impactPrediction).toBeNull();
    expect(state.improvementCandidates).toEqual([]);
    expect(state.toneTransformCandidates).toEqual([]);
    expect(state.preSendGate).toBeNull();
  });

  it("SELECT_CANDIDATE invalidates draft-dependent data", () => {
    let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
    state = analyzeReducer(state, { type: "SET_DRAFT_ANALYSIS", analysis: makeDraftAnalysis() });
    state = analyzeReducer(state, { type: "SET_IMPACT", impact: makeImpactPrediction() });

    state = analyzeReducer(state, {
      type: "SELECT_CANDIDATE",
      candidate: { text: "Improved", strategy: "improved" },
    });

    expect(state.draftAnalysis).toBeNull();
    expect(state.impactPrediction).toBeNull();
  });

  it("SET_DRAFT does not invalidate unrelated data", () => {
    let state = analyzeReducer(INITIAL_STATE, {
      type: "SET_MESSAGES",
      messages: [makeMessage()],
      context: null,
    });
    state = analyzeReducer(state, { type: "SET_GOAL", goal: "flirt_naturally" });

    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "New draft" });

    expect(state.messages).toHaveLength(1);
      expect(state.goal).toBe("flirt_naturally");
    // Coaching is draft-dependent, so it IS invalidated
    expect(state.coaching).toBeNull();
  });
});

describe("Stale request protection", () => {
  it("tracks request version", () => {
    expect(INITIAL_STATE.requestVersion).toBe(0);
    const state = analyzeReducer(INITIAL_STATE, {
      type: "SET_MESSAGES",
      messages: [makeMessage()],
      context: null,
    });
    expect(state.requestVersion).toBe(0);
  });
});

describe("Draft versioning", () => {
  it("increments draft version on each change", () => {
    let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "v1" });
    expect(state.draft?.draftVersion).toBe(1);

    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "v2" });
    expect(state.draft?.draftVersion).toBe(2);

    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "v3" });
    expect(state.draft?.draftVersion).toBe(3);
  });

  it("preserves original draft through edits", () => {
    let state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "Original" });
    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Edit 1" });
    state = analyzeReducer(state, { type: "SET_DRAFT", draft: "Edit 2" });

    expect(state.draft?.originalDraft).toBe("Original");
    expect(state.draft?.currentDraft).toBe("Edit 2");
  });
});

describe("Edge cases", () => {
  it("handles SET_DRAFT with empty string", () => {
    const state = analyzeReducer(INITIAL_STATE, { type: "SET_DRAFT", draft: "" });
    expect(state.draft?.originalDraft).toBe("");
    expect(state.draft?.currentDraft).toBe("");
  });

  it("handles SET_REPLIES with empty alternatives", () => {
    const state = analyzeReducer(INITIAL_STATE, {
      type: "SET_REPLIES",
      bestMatch: { text: "Best", strategy: "s1" },
      alternatives: [],
    });
    expect(state.alternatives).toEqual([]);
  });

  it("handles SET_OVERRIDES with partial data", () => {
    const state = analyzeReducer(INITIAL_STATE, {
      type: "SET_OVERRIDES",
      goalOverride: "professional",
    });
    expect(state.goalOverride).toBe("professional");
    expect(state.styleOverride).toBe("");
    expect(state.toneOverride).toBe("");
  });

  it("handles multiple SET_LOADING calls", () => {
    let state = analyzeReducer(INITIAL_STATE, { type: "SET_LOADING", field: "parsing", value: true });
    state = analyzeReducer(state, { type: "SET_LOADING", field: "generating", value: true });
    expect(state.loading.parsing).toBe(true);
    expect(state.loading.generating).toBe(true);

    state = analyzeReducer(state, { type: "SET_LOADING", field: "parsing", value: false });
    expect(state.loading.parsing).toBe(false);
    expect(state.loading.generating).toBe(true);
  });

  it("handles SET_INTELLIGENCE with null values", () => {
    const state = analyzeReducer(INITIAL_STATE, {
      type: "SET_INTELLIGENCE",
      recoveryGuidance: null,
      conflictIntelligence: null,
      participants: null,
    });
    expect(state.recoveryGuidance).toBeNull();
    expect(state.conflictIntelligence).toBeNull();
    expect(state.participants).toBeNull();
  });

  it("resets conversation version on RESET", () => {
    let state = analyzeReducer(INITIAL_STATE, {
      type: "SET_MESSAGES",
      messages: [makeMessage()],
      context: null,
    });
    expect(state.conversationVersion).toBe(1);

    state = analyzeReducer(state, { type: "RESET" });
    expect(state.conversationVersion).toBe(0);
  });
});
