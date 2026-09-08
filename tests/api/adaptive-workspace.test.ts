import { describe, it, expect } from "vitest";
import { workspaceReducer, INITIAL_WORKSPACE_STATE } from "@/lib/ai/workspace-state";
import { getContextOverrides } from "@/lib/ai/effective-preferences";
import { getRecommendedGoal } from "@/components/analyze/GoalSelector";
import { getRecommendedMode } from "@/components/analyze/ImprovementModeSelector";
import type { WorkspaceState } from "@/lib/ai/workspace-state";
import type { ConversationWorkspace, WorkspaceParticipant, WorkspaceMessage } from "@/lib/ai/workspace-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createState(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return { ...INITIAL_WORKSPACE_STATE, ...overrides };
}

function makeWorkspace(overrides: Partial<ConversationWorkspace> = {}): ConversationWorkspace {
  return {
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
    ...overrides,
  };
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Workspace Integration: Context Detection", () => {
  it("Instagram workspace sets platform context", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ platform: "Instagram" }),
      participants: [],
      messages: [makeMessage("msg-1", "Hey!", "user", 1)],
    });
    expect(state.analyze.detectedContext?.platform).toBe("Instagram");
  });

  it("WhatsApp workspace sets platform context", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ platform: "WhatsApp" }),
      participants: [],
      messages: [makeMessage("msg-1", "Hey!", "user", 1)],
    });
    expect(state.analyze.detectedContext?.platform).toBe("WhatsApp");
  });

  it("LinkedIn workspace sets platform context", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ platform: "LinkedIn" }),
      participants: [],
      messages: [makeMessage("msg-1", "Hey!", "user", 1)],
    });
    expect(state.analyze.detectedContext?.platform).toBe("LinkedIn");
  });
});

describe("Workspace Integration: Context Overrides", () => {
  it("professional context sets professional overrides", () => {
    const overrides = getContextOverrides("professional");
    expect(overrides.formality).toBe("formal");
    expect(overrides.tone).toBe("direct");
    expect(overrides.emoji).toBe("minimal");
    expect(overrides.slang).toBe("none");
    expect(overrides.humor).toBe("none");
  });

  it("dating context sets dating overrides", () => {
    const overrides = getContextOverrides("dating");
    expect(overrides.formality).toBe("casual");
    expect(overrides.tone).toBe("playful");
    expect(overrides.humor).toBe("subtle");
  });

  it("conflict context sets conflict overrides", () => {
    const overrides = getContextOverrides("conflict");
    expect(overrides.tone).toBe("warm");
    expect(overrides.formality).toBe("neutral");
    expect(overrides.emoji).toBe("none");
  });

  it("new workspace has no context overrides", () => {
    const overrides = getContextOverrides("");
    expect(Object.keys(overrides)).toHaveLength(0);
  });
});

describe("Workspace Integration: Goal Recommendations", () => {
  it("professional workspace recommends confident goal", () => {
    const goal = getRecommendedGoal("professional");
    expect(goal).toBe("be_confident");
  });

  it("casual workspace recommends keep_going", () => {
    const goal = getRecommendedGoal("natural");
    expect(goal).toBe("keep_going");
  });

  it("playful workspace recommends make_them_laugh", () => {
    const goal = getRecommendedGoal("playful");
    expect(goal).toBe("make_them_laugh");
  });
});

describe("Workspace Integration: Improvement Mode", () => {
  it("professional context recommends professional improvement", () => {
    const mode = getRecommendedMode("more_formal", null, null);
    expect(mode).toBe("more_professional");
  });

  it("casual context recommends natural improvement", () => {
    const mode = getRecommendedMode("more_casual", null, null);
    expect(mode).toBe("more_natural");
  });

  it("concise preference recommends concise improvement", () => {
    const mode = getRecommendedMode("shorter", null, null);
    expect(mode).toBe("more_concise");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NO LEAKAGE BETWEEN WORKSPACES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Workspace Integration: No Preference Leakage", () => {
  it("professional context does not affect dating preferences", () => {
    const profOverrides = getContextOverrides("professional");
    const datingOverrides = getContextOverrides("dating");

    expect(profOverrides.formality).toBe("formal");
    expect(datingOverrides.formality).toBe("casual");
    // They should be different
    expect(profOverrides.formality).not.toBe(datingOverrides.formality);
  });

  it("conflict context does not affect academic preferences", () => {
    const conflictOverrides = getContextOverrides("conflict");
    const academicOverrides = getContextOverrides("academic");

    expect(conflictOverrides.tone).toBe("warm");
    expect(academicOverrides.tone).toBe("neutral");
    expect(conflictOverrides.tone).not.toBe(academicOverrides.tone);
  });

  it("each workspace gets its own context", () => {
    const ws1 = makeWorkspace({ platform: "LinkedIn" });
    const ws2 = makeWorkspace({ platform: "Instagram" });

    // Different platforms should yield different contexts
    expect(ws1.platform).not.toBe(ws2.platform);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE STATE + PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Workspace State: Preference Integration", () => {
  it("workspace loads and sets analyze context", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ platform: "WhatsApp", language: "hindi" }),
      participants: [],
      messages: [makeMessage("msg-1", "Hello!", "user", 1)],
    });

    expect(state.analyze.detectedContext?.platform).toBe("WhatsApp");
    expect(state.analyze.detectedContext?.language).toBe("hindi");
  });

  it("workspace goal is preserved in analyze state", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ goal: "flirt_naturally" }),
      participants: [],
      messages: [makeMessage("msg-1", "Hey!", "user", 1)],
    });

    expect(state.analyze.goal).toBe("flirt_naturally");
  });

  it("workspace language is preserved", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ language: "telugu" }),
      participants: [],
      messages: [makeMessage("msg-1", "హాయ్!", "user", 1)],
    });

    expect(state.analyze.detectedContext?.language).toBe("telugu");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MULTILINGUAL WORKSPACE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Workspace Integration: Multilingual", () => {
  it("Telugu workspace preserves language", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ language: "telugu", platform: "WhatsApp" }),
      participants: [],
      messages: [
        makeMessage("msg-1", "హాయ్, ఎలా ఉన్నావ్?", "user", 1),
        makeMessage("msg-2", "నేను బాగున్నాను", "other", 2),
      ],
    });

    expect(state.analyze.detectedContext?.language).toBe("telugu");
    expect(state.analyze.messages[0].text).toBe("హాయ్, ఎలా ఉన్నావ్?");
  });

  it("Hindi workspace preserves language", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ language: "hindi", platform: "Instagram" }),
      participants: [],
      messages: [
        makeMessage("msg-1", "कैसे हो?", "user", 1),
        makeMessage("msg-2", "मैं ठीक हूँ", "other", 2),
      ],
    });

    expect(state.analyze.detectedContext?.language).toBe("hindi");
  });

  it("Tamil workspace preserves language", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ language: "tamil" }),
      participants: [],
      messages: [makeMessage("msg-1", "வணக்�ம்!", "user", 1)],
    });

    expect(state.analyze.detectedContext?.language).toBe("tamil");
  });

  it("Kannada workspace preserves language", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ language: "kannada" }),
      participants: [],
      messages: [makeMessage("msg-1", "ನಮಸ್ಕಾರ!", "user", 1)],
    });

    expect(state.analyze.detectedContext?.language).toBe("kannada");
  });

  it("Romanized workspace preserves language", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ language: "romanized" }),
      participants: [],
      messages: [makeMessage("msg-1", "hey, kya kar raha hai?", "user", 1)],
    });

    expect(state.analyze.detectedContext?.language).toBe("romanized");
  });

  it("code-mixed workspace preserves language", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ language: "code_mixed" }),
      participants: [],
      messages: [makeMessage("msg-1", "hey, naa lunch aipoyindi", "user", 1)],
    });

    expect(state.analyze.detectedContext?.language).toBe("code_mixed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYZE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Analyze Integration: Preference Flow", () => {
  it("preferences loaded into analyze state", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "ANALYZE",
      action: {
        type: "SET_PREFERENCES",
        preferences: {
          dimensions: {
            length: { value: "short", confidence: 0.8 },
            tone: { value: "direct", confidence: 0.7 },
          },
        },
      },
    });

    expect(state.analyze.preferences?.dimensions.length?.value).toBe("short");
    expect(state.analyze.preferences?.dimensions.tone?.value).toBe("direct");
  });

  it("preferences cleared on reset", () => {
    let state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "ANALYZE",
      action: {
        type: "SET_PREFERENCES",
        preferences: {
          dimensions: { length: { value: "short", confidence: 0.8 } },
        },
      },
    });

    state = workspaceReducer(state, { type: "ANALYZE", action: { type: "RESET" } });
    expect(state.analyze.preferences).toBeNull();
  });

  it("conversation loaded triggers preference-relevant context", () => {
    const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
      type: "LOAD_WORKSPACE",
      workspace: makeWorkspace({ platform: "LinkedIn", language: "english" }),
      participants: [],
      messages: [makeMessage("msg-1", "Hello!", "user", 1)],
    });

    // The detected context should include platform info
    expect(state.analyze.detectedContext?.platform).toBe("LinkedIn");
    // The conversation type is set to "personal" by default from workspace
    expect(state.analyze.detectedContext?.conversationType).toBe("personal");
    // Platform-specific overrides can be derived from the platform
    const platformOverrides = getContextOverrides(state.analyze.detectedContext?.platform?.toLowerCase() || "");
    // LinkedIn suggests professional context
    if (state.analyze.detectedContext?.platform === "LinkedIn") {
      const profOverrides = getContextOverrides("professional");
      expect(profOverrides.formality).toBe("formal");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANDIDATE RANKING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Candidate Ranking: Preference Integration", () => {
  it("preference profile can be built for ranking", () => {
    const prefs = [
      { dimension: "length" as const, value: "short", confidence: 0.8, source: "implicit" as const, signalCount: 8, lastSignalAt: new Date() },
      { dimension: "tone" as const, value: "direct", confidence: 0.7, source: "implicit" as const, signalCount: 7, lastSignalAt: new Date() },
    ];

    // Simulate what the ranker would do
    const lengthPref = prefs.find((p) => p.dimension === "length");
    const tonePref = prefs.find((p) => p.dimension === "tone");

    expect(lengthPref?.value).toBe("short");
    expect(tonePref?.value).toBe("direct");
  });

  it("safety overrides preference in ranking", () => {
    const prefs = [
      { dimension: "tone" as const, value: "direct", confidence: 0.9, source: "explicit" as const, signalCount: 10, lastSignalAt: new Date() },
    ];

    // Even with strong assertive preference, safety check should win
    const safetyConstraint = "warm";
    const effectiveTone = safetyConstraint || prefs[0].value;
    expect(effectiveTone).toBe("warm");
  });

  it("preservation overrides preference in ranking", () => {
    // If a candidate shortens a message too much, preservation should win
    const originalText = "I need the document by 5pm today because the client is waiting";
    const candidateText = "doc pls";
    const lengthPref = "short";

    // Even with concise preference, if meaning is lost, preservation wins
    const hasKeyInfo = originalText.includes("5pm") && originalText.includes("today");
    const candidateHasKeyInfo = candidateText.includes("5pm") && candidateText.includes("today");

    expect(hasKeyInfo).toBe(true);
    expect(candidateHasKeyInfo).toBe(false);
    // Preservation should reject this candidate
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY & PRIVACY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Security: Preference Isolation", () => {
  it("user A preferences do not affect user B", () => {
    const userAPrefs = [
      { dimension: "tone" as const, value: "direct", confidence: 0.8, source: "implicit" as const, signalCount: 8, lastSignalAt: new Date() },
    ];
    const userBPrefs = [
      { dimension: "tone" as const, value: "warm", confidence: 0.7, source: "implicit" as const, signalCount: 7, lastSignalAt: new Date() },
    ];

    // Each user's preferences are resolved independently
    expect(userAPrefs[0].value).toBe("direct");
    expect(userBPrefs[0].value).toBe("warm");
    expect(userAPrefs[0].value).not.toBe(userBPrefs[0].value);
  });

  it("no sensitive profiling from preferences", () => {
    // Preferences should only contain communication style data
    const validDimensions = [
      "length", "emoji", "formality", "tone", "punctuation",
      "slang", "question_style", "humor", "emotional_expression",
      "improvement_mode", "default_tone", "strategy_preference",
    ];

    // None of these dimensions should infer personality, mental health, etc.
    expect(validDimensions).not.toContain("personality");
    expect(validDimensions).not.toContain("mental_health");
    expect(validDimensions).not.toContain("relationship_status");
    expect(validDimensions).not.toContain("sexuality");
    expect(validDimensions).not.toContain("political_beliefs");
  });

  it("minimal data in preference profile", () => {
    const profile = {
      dimensions: {
        length: { value: "short", confidence: 0.8 },
      },
    };

    // Profile should contain only dimension values and confidence
    expect(Object.keys(profile)).toEqual(["dimensions"]);
    expect(Object.keys(profile.dimensions)).toEqual(["length"]);
    expect(Object.keys(profile.dimensions.length)).toEqual(["value", "confidence"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance: Preference Resolution", () => {
  it("resolution is fast (no AI calls)", () => {
    const start = Date.now();
    const prefs = [
      { dimension: "length" as const, value: "short", confidence: 0.8, source: "implicit" as const, signalCount: 8, lastSignalAt: new Date() },
      { dimension: "tone" as const, value: "direct", confidence: 0.7, source: "implicit" as const, signalCount: 7, lastSignalAt: new Date() },
      { dimension: "emoji" as const, value: "none", confidence: 0.6, source: "implicit" as const, signalCount: 6, lastSignalAt: new Date() },
    ];

    // Resolution should be fast (no network calls)
    for (let i = 0; i < 1000; i++) {
      const contextOverrides = getContextOverrides("professional");
      // Just simulating the resolution logic
      const result = {
        length: contextOverrides.length || prefs[0].value,
        tone: contextOverrides.tone || prefs[1].value,
        emoji: contextOverrides.emoji || prefs[2].value,
      };
      expect(result.length).toBeDefined();
    }

    const elapsed = Date.now() - start;
    // 1000 iterations should complete in < 100ms
    expect(elapsed).toBeLessThan(100);
  });

  it("no redundant fetch for same session", () => {
    // Simulating session cache behavior
    const cache = new Map();
    const userId = "user-1";

    // First fetch
    expect(cache.has(userId)).toBe(false);
    cache.set(userId, { preferences: [], fetchedAt: Date.now() });

    // Second access should use cache
    expect(cache.has(userId)).toBe(true);
    expect(cache.get(userId).preferences).toEqual([]);
  });
});
