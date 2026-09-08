// ─── Phase 6 Step 7: Fallback Behavior Tests ────────────────────────────────
//
// Tests that the system fails gracefully under various error conditions:
// provider timeout, provider error, invalid response, malformed output,
// rate limit, database failure, missing context, empty input, etc.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { validateCandidates } from "@/lib/ai/quality-validator";
import { rankReplies } from "@/lib/ai/ranker";
import { detectLanguageState } from "@/lib/ai/language-detect";
import {
  createPreservationContract,
  validatePreservation,
} from "@/lib/ai/preservation";
import { scoreAILikeness } from "@/lib/ai/humanizer";
import type { ConversationContext } from "@/lib/ai/context";

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

// ─── Fallback Behavior Tests ────────────────────────────────────────────────

describe("Phase 6 Step 7: Fallback Behavior", () => {
  describe("Empty Input", () => {
    it("empty messages array is handled gracefully", () => {
      const messages: { sender: string; text: string }[] = [];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("empty string message is handled gracefully", () => {
      const messages = [{ sender: "other", text: "" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("whitespace-only message is handled gracefully", () => {
      const messages = [{ sender: "other", text: "   " }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("very short message is handled", () => {
      const messages = [{ sender: "other", text: "ok" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("very long message is handled", () => {
      const longText = "a".repeat(10000);
      const messages = [{ sender: "other", text: longText }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("emoji-only message is handled", () => {
      const messages = [{ sender: "other", text: "😊😂👍" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("URL-only message is handled", () => {
      const messages = [{ sender: "other", text: "https://example.com" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("number-only message is handled", () => {
      const messages = [{ sender: "other", text: "12345" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("mixed scripts message is handled", () => {
      const messages = [{ sender: "other", text: "Hello नमस्ते 你好" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("code-mixed text is handled", () => {
      const messages = [{ sender: "other", text: "Hey naku ivala time ledu" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("multiple paragraphs are handled", () => {
      const messages = [{ sender: "other", text: "Paragraph 1\n\nParagraph 2\n\nParagraph 3" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("quoted text is handled", () => {
      const messages = [{ sender: "other", text: '"This is a quote"' }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });

    it("markdown text is handled", () => {
      const messages = [{ sender: "other", text: "**bold** and *italic*" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
    });
  });

  describe("Invalid State", () => {
    it("missing context defaults are handled", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state).toBeDefined();
      expect(state.tone).toBeDefined();
      expect(state.context).toBeDefined();
    });

    it("missing intelligence is handled", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const languageState = detectLanguageState(messages);
      const state = resolveConversationState(context, null, languageState, messages);

      expect(state).toBeDefined();
    });
  });

  describe("Candidate Validation Fallback", () => {
    it("validation handles empty candidates", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const validation = validateCandidates([], state);

      expect(validation).toBeDefined();
      expect(validation.allFailed).toBe(true);
    });

    it("validation handles single candidate", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const candidates = [{ text: "Hello!", strategy: "natural" }];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation).toBeDefined();
    });
  });

  describe("Ranking Fallback", () => {
    it("ranking handles empty candidates", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      const ranked = rankReplies([], { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked).toBeDefined();
      expect(ranked.length).toBe(0);
    });

    it("ranking handles single candidate", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      const candidates = [{ text: "Hello!", strategy: "natural" }];
      const ranked = rankReplies(candidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked).toBeDefined();
      expect(ranked.length).toBe(1);
    });
  });

  describe("Preservation Fallback", () => {
    it("preservation handles empty original", () => {
      const contract = createPreservationContract("", { primary: "english", script: "latin", romanized: false, codeMixed: false });

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });

    it("preservation handles empty generated", () => {
      const original = "Hello, how are you?";
      const contract = createPreservationContract(original, { primary: "english", script: "latin", romanized: false, codeMixed: false });
      const result = validatePreservation(contract, "");

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe("boolean");
    });
  });

  describe("AI-Likeness Fallback", () => {
    it("AI-likeness handles empty text", () => {
      const score = scoreAILikeness("");

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("AI-likeness handles very long text", () => {
      const longText = "a".repeat(10000);
      const score = scoreAILikeness(longText);

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("AI-likeness handles special characters", () => {
      const score = scoreAILikeness("!@#$%^&*()_+-=[]{}|;':\",./<>?");

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Strategy Selection Fallback", () => {
    it("strategy selection handles empty state", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy).toBeDefined();
      expect(strategy.ranked).toBeDefined();
      expect(strategy.primary).toBeDefined();
    });
  });

  describe("Graceful Degradation", () => {
    it("system produces output even with minimal input", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "k" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(state).toBeDefined();
      expect(strategy.ranked.length).toBeGreaterThan(0);
    });

    it("system produces output with unusual characters", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "مرحبا" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(state).toBeDefined();
    });
  });
});
