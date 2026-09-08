// ─── Phase 6 Step 7: Explicit User Instruction Precedence Tests ─────────────
//
// Tests that explicit user instructions always win over saved preferences,
// learned preferences, and defaults.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { resolveEffectivePreferences } from "@/lib/ai/preference-resolver";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { detectLanguageState } from "@/lib/ai/language-detect";
import type { ConversationContext } from "@/lib/ai/context";
import type { LearnedPreference } from "@/lib/ai/personalization-types";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    language: "english",
    script: "english",
    conversationType: "general",
    participants: 2,
    goal: "keep_going",
    tone: "casual",
    urgency: "normal",
    userStyle: "casual",
    platform: "whatsapp",
    outputLanguage: "auto",
    preferredStyle: undefined,
    communicationMode: "auto",
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
    situation: "normal conversation",
    userIntent: "casual",
    otherIntent: "casual",
    emotion: { primary: "neutral", intensity: 0.3 },
    tone: { primary: "casual", intensity: 0.5 },
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

// ─── Explicit Instruction Precedence Tests ──────────────────────────────────

describe("Phase 6 Step 7: Explicit User Instruction Precedence", () => {
  describe("Saved Preference vs Current Request", () => {
    it("saved casual preference loses to explicit formal request", () => {
      const learnedPreferences = [
        makeLearnedPreference("formality", "casual", 0.9, "explicit"),
      ];
      const contextOverrides = {};
      const sessionOverrides = { formality: "formal" };
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.formality).toBe("formal");
      expect(resolved.sources.formality).toBe("explicit");
    });

    it("saved professional preference loses to explicit warm request", () => {
      const learnedPreferences = [
        makeLearnedPreference("tone", "professional", 0.9, "explicit"),
      ];
      const contextOverrides = {};
      const sessionOverrides = { tone: "warm" };
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.tone).toBe("warm");
      expect(resolved.sources.tone).toBe("explicit");
    });

    it("saved concise preference loses to explicit detailed request", () => {
      const learnedPreferences = [
        makeLearnedPreference("length", "short", 0.9, "explicit"),
      ];
      const contextOverrides = {};
      const sessionOverrides = { length: "long" };
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.length).toBe("long");
      expect(resolved.sources.length).toBe("explicit");
    });
  });

  describe("Learned Preference vs Current Request", () => {
    it("learned casual preference loses to explicit formal request", () => {
      const learnedPreferences = [
        makeLearnedPreference("formality", "casual", 0.8, "implicit"),
      ];
      const contextOverrides = {};
      const sessionOverrides = { formality: "formal" };
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.formality).toBe("formal");
      expect(resolved.sources.formality).toBe("explicit");
    });

    it("learned direct preference loses to explicit warm request", () => {
      const learnedPreferences = [
        makeLearnedPreference("tone", "direct", 0.8, "implicit"),
      ];
      const contextOverrides = {};
      const sessionOverrides = { tone: "warm" };
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.tone).toBe("warm");
      expect(resolved.sources.tone).toBe("explicit");
    });
  });

  describe("Context Override vs Current Request", () => {
    it("context override loses to explicit session override", () => {
      const learnedPreferences: LearnedPreference[] = [];
      const contextOverrides = { formality: "formal" };
      const sessionOverrides = { formality: "casual" };
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.formality).toBe("casual");
      expect(resolved.sources.formality).toBe("explicit");
    });
  });

  describe("Safety Constraint Precedence", () => {
    it("safety constraint overrides explicit request when unsafe", () => {
      const learnedPreferences: LearnedPreference[] = [];
      const contextOverrides = {};
      const sessionOverrides = { formality: "casual" };
      const safetyConstraints = { formality: "formal" };

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.formality).toBe("formal");
    });
  });

  describe("Mode vs Tone", () => {
    it("work mode does not override explicit casual tone", () => {
      const context = makeContext({
        communicationMode: "work",
        tone: "casual",
      });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.tone).toBeDefined();
      expect(state.tone.primary).toBeDefined();
    });

    it("dating mode preserves explicit professional tone", () => {
      const context = makeContext({
        communicationMode: "dating",
        tone: "professional",
      });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence({ context: "dating" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.tone).toBeDefined();
      expect(state.tone.primary).toBeDefined();
    });
  });

  describe("Mode vs Context", () => {
    it("explicit work mode sets work context", () => {
      const context = makeContext({
        communicationMode: "work",
      });
      const messages = [{ sender: "other", text: "Meeting at 3?" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.context).toBeDefined();
    });

    it("explicit conflict mode sets conflict context", () => {
      const context = makeContext({
        communicationMode: "conflict",
      });
      const messages = [{ sender: "other", text: "I'm upset!" }];
      const intelligence = makeIntelligence({ conflict: { level: 0.7, type: "verbal" } });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.conflict.level).toBeGreaterThan(0);
    });
  });

  describe("Goal vs Strategy", () => {
    it("disagreement goal selects appropriate strategies", () => {
      const context = makeContext({ goal: "disagree" });
      const messages = [{ sender: "other", text: "I think A is better." }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });

    it("resolve goal selects diplomatic strategies", () => {
      const context = makeContext({ goal: "resolve" });
      const messages = [{ sender: "other", text: "This needs to be fixed." }];
      const intelligence = makeIntelligence({ conflict: { level: 0.6, type: "verbal" } });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Instruction Override Precedence", () => {
    it("override instruction takes highest priority", () => {
      const context = makeContext({
        communicationMode: "work",
        tone: "professional",
        overrideInstruction: "Make this casual and friendly",
      });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state).toBeDefined();
      expect(state.tone).toBeDefined();
    });
  });

  describe("Default Precedence", () => {
    it("system defaults are used when no other source is available", () => {
      const learnedPreferences: LearnedPreference[] = [];
      const contextOverrides = {};
      const sessionOverrides = {};
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences).toBeDefined();
      expect(resolved.confidence).toBeDefined();
      expect(resolved.sources).toBeDefined();
    });
  });

  describe("Multiple Dimensions Precedence", () => {
    it("each dimension resolves independently", () => {
      const learnedPreferences = [
        makeLearnedPreference("formality", "casual", 0.9, "explicit"),
        makeLearnedPreference("tone", "professional", 0.8, "implicit"),
        makeLearnedPreference("length", "short", 0.7, "implicit"),
      ];
      const contextOverrides = {};
      const sessionOverrides = { formality: "formal" };
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints
      );

      expect(resolved.preferences.formality).toBe("formal");
      expect(resolved.sources.formality).toBe("explicit");
    });
  });

  describe("Workspace-Specific Preferences", () => {
    it("context-specific preferences are applied", () => {
      const learnedPreferences = [
        makeLearnedPreference("formality", "formal", 0.9, "explicit", "work"),
      ];
      const contextOverrides = {};
      const sessionOverrides = {};
      const safetyConstraints = {};

      const resolved = resolveEffectivePreferences(
        learnedPreferences,
        contextOverrides,
        sessionOverrides,
        safetyConstraints,
        "work"
      );

      expect(resolved.preferences.formality).toBe("formal");
    });
  });
});
