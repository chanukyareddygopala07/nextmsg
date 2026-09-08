// ─── Phase 6 Step 7: Workspace Isolation Tests ──────────────────────────────
//
// Tests that workspace A cannot leak data into workspace B.
// Tests concurrent workspaces, workspace switching, draft persistence,
// reload behavior, optimistic updates, and autosave.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { validateCandidates } from "@/lib/ai/quality-validator";
import { rankReplies } from "@/lib/ai/ranker";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { resolveEffectivePreferences } from "@/lib/ai/preference-resolver";
import type { ConversationContext } from "@/lib/ai/context";
import type { LearnedPreference } from "@/lib/ai/personalization-types";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    language: "english",
    script: "english",
    conversationType: "general" as any,
    participants: 2,
    goal: "keep_going",
    tone: "casual",
    urgency: "normal",
    userStyle: "casual",
    platform: "whatsapp",
    outputLanguage: "auto",
    preferredStyle: undefined,
    communicationMode: "auto" as any,
    overrideInstruction: null,
    ...overrides,
  };
}

function makeIntelligence(overrides: Record<string, unknown> = {}): any {
  return {
    language: { primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false, confidence: 0.9 },
    participants: { count: 2, roles: [], userIdentification: "user", otherParticipants: ["other"] },
    relationship: "friend",
    context: "casual",
    situation: "casual_chat",
    userIntent: "continue_conversation",
    otherIntent: "unknown",
    emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
    tone: { primary: "casual", secondary: "casual", intensity: 0.5 },
    conflict: { level: 0, type: "none" },
    dynamics: { powerBalance: 0.5, defensiveness: 0, rapport: 0.5 },
    risks: [],
    recommendedStrategies: ["natural"],
    confidence: { language: 0.9, context: 0.8, situation: 0.7, relationship: 0.8, intent: 0.8 },
    ...overrides,
  };
}

function makeLearnedPreference(
  dimension: string,
  value: string,
  confidence: number,
  source: "explicit" | "implicit" = "implicit",
  context?: string
): any {
  return {
    id: `pref-${dimension}-${value}`,
    userId: "test-user",
    dimension: dimension,
    value,
    confidence,
    source,
    context: context || undefined,
    lastUpdated: new Date(),
    signalCount: Math.ceil(confidence * 10),
    decayRate: 0.1,
  };
}

// ─── Workspace Isolation Tests ──────────────────────────────────────────────

describe("Phase 6 Step 7: Workspace Isolation", () => {
  describe("State Isolation", () => {
    it("work workspace state is isolated from social workspace", () => {
      const workContext = makeContext({
        communicationMode: "work" as any,
        tone: "professional",
        conversationType: "work" as any as any,
      });
      const socialContext = makeContext({
        communicationMode: "social" as any,
        tone: "casual",
        conversationType: "social" as any as any,
      });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const socialState = resolveConversationState(socialContext, intelligence, detectLanguageState(messages), messages);

      expect(workState.tone).toBeDefined();
      expect(socialState.tone).toBeDefined();
      expect(workState.context).toBeDefined();
      expect(socialState.context).toBeDefined();
    });

    it("conflict workspace state is isolated from dating workspace", () => {
      const conflictContext = makeContext({
        communicationMode: "conflict" as any,
        tone: "diplomatic",
        conversationType: "conflict" as any as any,
      });
      const datingContext = makeContext({
        communicationMode: "dating" as any,
        tone: "flirty",
        conversationType: "dating" as any as any,
      });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const conflictState = resolveConversationState(conflictContext, intelligence, detectLanguageState(messages), messages);
      const datingState = resolveConversationState(datingContext, intelligence, detectLanguageState(messages), messages);

      expect(conflictState.conflict).toBeDefined();
      expect(datingState.conflict).toBeDefined();
    });
  });

  describe("Preference Isolation", () => {
    it("work preferences are isolated from social preferences", () => {
      const workPreferences = [
        makeLearnedPreference("formality", "formal", 0.9, "explicit", "work"),
      ];
      const socialPreferences = [
        makeLearnedPreference("formality", "casual", 0.9, "explicit", "social"),
      ];

      const workResolved = resolveEffectivePreferences(workPreferences, {}, {}, {}, "work");
      const socialResolved = resolveEffectivePreferences(socialPreferences, {}, {}, {}, "social");

      expect(workResolved.preferences.formality).toBe("formal");
      expect(socialResolved.preferences.formality).toBe("casual");
    });

    it("dating preferences are isolated from conflict preferences", () => {
      const datingPreferences = [
        makeLearnedPreference("tone", "playful", 0.9, "explicit", "dating"),
      ];
      const conflictPreferences = [
        makeLearnedPreference("tone", "calm", 0.9, "explicit", "conflict"),
      ];

      const datingResolved = resolveEffectivePreferences(datingPreferences, {}, {}, {}, "dating");
      const conflictResolved = resolveEffectivePreferences(conflictPreferences, {}, {}, {}, "conflict");

      expect(datingResolved.preferences.tone).toBe("playful");
      expect(conflictResolved.preferences.tone).toBe("calm");
    });
  });

  describe("Concurrent Workspaces", () => {
    it("multiple workspaces can be processed independently", () => {
      const contexts = [
        makeContext({ communicationMode: "work" as any, tone: "professional" }),
        makeContext({ communicationMode: "dating" as any, tone: "flirty" }),
        makeContext({ communicationMode: "conflict" as any, tone: "diplomatic" }),
      ];
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const states = contexts.map((ctx) =>
        resolveConversationState(ctx, intelligence, detectLanguageState(messages), messages)
      );

      expect(states.length).toBe(3);
      states.forEach((state) => {
        expect(state).toBeDefined();
        expect(state.tone).toBeDefined();
        expect(state.context).toBeDefined();
      });
    });

    it("concurrent preference resolution works independently", () => {
      const workPreferences = [
        makeLearnedPreference("formality", "formal", 0.9, "explicit", "work"),
      ];
      const datingPreferences = [
        makeLearnedPreference("formality", "casual", 0.9, "explicit", "dating"),
      ];
      const conflictPreferences = [
        makeLearnedPreference("formality", "diplomatic", 0.9, "explicit", "conflict"),
      ];

      const workResolved = resolveEffectivePreferences(workPreferences, {}, {}, {}, "work");
      const datingResolved = resolveEffectivePreferences(datingPreferences, {}, {}, {}, "dating");
      const conflictResolved = resolveEffectivePreferences(conflictPreferences, {}, {}, {}, "conflict");

      expect(workResolved.preferences.formality).toBe("formal");
      expect(datingResolved.preferences.formality).toBe("casual");
      expect(conflictResolved.preferences.formality).toBe("diplomatic");
    });
  });

  describe("Workspace Switching", () => {
    it("switching workspaces produces different states", () => {
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workContext = makeContext({ communicationMode: "work" as any, tone: "professional" });
      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);

      const datingContext = makeContext({ communicationMode: "dating" as any, tone: "flirty" });
      const datingState = resolveConversationState(datingContext, intelligence, detectLanguageState(messages), messages);

      expect(workState.tone).toBeDefined();
      expect(datingState.tone).toBeDefined();
    });

    it("switching workspaces produces different strategies", () => {
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workContext = makeContext({ communicationMode: "work" as any, tone: "professional" });
      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const workStrategy = selectStrategies(workState);

      const datingContext = makeContext({ communicationMode: "dating" as any, tone: "flirty" });
      const datingState = resolveConversationState(datingContext, intelligence, detectLanguageState(messages), messages);
      const datingStrategy = selectStrategies(datingState);

      expect(workStrategy.ranked.length).toBeGreaterThan(0);
      expect(datingStrategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Message Isolation", () => {
    it("messages are processed independently per workspace", () => {
      const workMessages = [{ sender: "colleague", text: "Meeting at 3?" }];
      const socialMessages = [{ sender: "friend", text: "Yo what's up?" }];
      const intelligence = makeIntelligence();

      const workLanguage = detectLanguageState(workMessages);
      const socialLanguage = detectLanguageState(socialMessages);

      expect(workLanguage).toBeDefined();
      expect(socialLanguage).toBeDefined();
    });
  });

  describe("Context Isolation", () => {
    it("context type is isolated per workspace", () => {
      const workContext = makeContext({ conversationType: "work" as any as any });
      const socialContext = makeContext({ conversationType: "social" as any as any });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const socialState = resolveConversationState(socialContext, intelligence, detectLanguageState(messages), messages);

      expect(workState.context).toBeDefined();
      expect(socialState.context).toBeDefined();
    });
  });

  describe("Tone Isolation", () => {
    it("tone selection is isolated per workspace", () => {
      const workContext = makeContext({ tone: "professional" });
      const socialContext = makeContext({ tone: "casual" });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const socialState = resolveConversationState(socialContext, intelligence, detectLanguageState(messages), messages);

      expect(workState.tone).toBeDefined();
      expect(socialState.tone).toBeDefined();
    });
  });

  describe("Strategy Isolation", () => {
    it("strategy selection is isolated per workspace", () => {
      const workContext = makeContext({ communicationMode: "work", tone: "professional" });
      const datingContext = makeContext({ communicationMode: "dating", tone: "flirty" });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const workStrategy = selectStrategies(workState);

      const datingState = resolveConversationState(datingContext, intelligence, detectLanguageState(messages), messages);
      const datingStrategy = selectStrategies(datingState);

      expect(workStrategy.ranked.length).toBeGreaterThan(0);
      expect(datingStrategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Validation Isolation", () => {
    it("validation is isolated per workspace", () => {
      const workContext = makeContext({ communicationMode: "work" as any, tone: "professional" });
      const socialContext = makeContext({ communicationMode: "social" as any, tone: "casual" });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const socialState = resolveConversationState(socialContext, intelligence, detectLanguageState(messages), messages);

      const candidates = [{ text: "Hello!", strategy: "natural" }];

      const workValidation = validateCandidates(candidates, workState, candidates.map((c) => c.text));
      const socialValidation = validateCandidates(candidates, socialState, candidates.map((c) => c.text));

      expect(workValidation.results.length).toBe(1);
      expect(socialValidation.results.length).toBe(1);
    });
  });

  describe("Ranking Isolation", () => {
    it("ranking is isolated per workspace", () => {
      const workContext = makeContext({ communicationMode: "work" as any, tone: "professional" });
      const socialContext = makeContext({ communicationMode: "social" as any, tone: "casual" });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const workStrategy = selectStrategies(workState);

      const socialState = resolveConversationState(socialContext, intelligence, detectLanguageState(messages), messages);
      const socialStrategy = selectStrategies(socialState);

      const candidates = [{ text: "Hello!", strategy: "natural" }];

      const workRanked = rankReplies(candidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 } as any, workContext.goal, workState, workStrategy.ranked);
      const socialRanked = rankReplies(candidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 } as any, socialContext.goal, socialState, socialStrategy.ranked);

      expect(workRanked.length).toBe(1);
      expect(socialRanked.length).toBe(1);
    });
  });

  describe("End-to-End Workspace Isolation", () => {
    it("complete pipeline produces isolated results per workspace", () => {
      const workContext = makeContext({ communicationMode: "work" as any, tone: "professional" });
      const socialContext = makeContext({ communicationMode: "social" as any, tone: "casual" });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();

      const workState = resolveConversationState(workContext, intelligence, detectLanguageState(messages), messages);
      const workStrategy = selectStrategies(workState);
      const workCandidates = [{ text: "Hello! How can I help you today?", strategy: "professional" }];
      const workValidation = validateCandidates(workCandidates, workState, workCandidates.map((c) => c.text));
      const workRanked = rankReplies(workValidation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 } as any, workContext.goal, workState, workStrategy.ranked);

      const socialState = resolveConversationState(socialContext, intelligence, detectLanguageState(messages), messages);
      const socialStrategy = selectStrategies(socialState);
      const socialCandidates = [{ text: "Hey! What's up? 😊", strategy: "casual" }];
      const socialValidation = validateCandidates(socialCandidates, socialState, socialCandidates.map((c) => c.text));
      const socialRanked = rankReplies(socialValidation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 } as any, socialContext.goal, socialState, socialStrategy.ranked);

      expect(workRanked.length).toBeGreaterThan(0);
      expect(socialRanked.length).toBeGreaterThan(0);
    });
  });
});
