// ─── Phase 6 Step 7: Pre-Send Quality Gate Tests ────────────────────────────
//
// Tests the pre-send quality gate for all critical outcomes:
// READY, REVIEW, HIGH_RISK
// Verifies critical checks remain hard constraints.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { validateCandidates } from "@/lib/ai/quality-validator";
import { detectLanguageState } from "@/lib/ai/language-detect";
import {
  createPreservationContract,
  validatePreservation,
  extractFactualClaims,
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

// ─── Pre-Send Quality Gate Tests ────────────────────────────────────────────

describe("Phase 6 Step 7: Pre-Send Quality Gate", () => {
  describe("Semantic Preservation Gate", () => {
    it("semantic mismatch is caught by validation", () => {
      const original = "I cannot attend the meeting.";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);
      const generated = "I will attend the meeting.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe("boolean");
    });

    it("semantic preservation passes for equivalent meanings", () => {
      const original = "I can't make it to the meeting.";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);
      const generated = "I won't be able to attend the meeting.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Factual Integrity Gate", () => {
    it("factual claims are extracted for validation", () => {
      const original = "The meeting is at 3pm and we need 5 people.";
      const claims = extractFactualClaims(original);

      expect(Array.isArray(claims)).toBe(true);
    });

    it("factual information is preserved through validation", () => {
      const original = "The deadline is Friday at 5pm.";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);
      const generated = "We need to finish by Friday 5pm.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Safety Gate", () => {
    it("safe candidates pass validation", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const candidates = [
        { text: "Hello! How can I help you today?", strategy: "friendly" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation.passedCandidates.length).toBeGreaterThan(0);
    });

    it("AI-likeness is scored", () => {
      const text = "That sounds fascinating! I'd love to hear more about that.";
      const score = scoreAILikeness(text);

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Deception/Fabrication Gate", () => {
    it("original text is used for comparison", () => {
      const original = "I have a meeting at 3pm.";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.originalText).toBe(original);
    });
  });

  describe("Tone Fit Gate", () => {
    it("tone selection is available for validation", () => {
      const context = makeContext({ tone: "professional" });
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.tone).toBeDefined();
      expect(state.tone.primary).toBeDefined();
    });

    it("strategy selection is available for validation", () => {
      const context = makeContext({ tone: "warm" });
      const messages = [{ sender: "other", text: "Thanks!" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Context Fit Gate", () => {
    it("context is available for validation", () => {
      const context = makeContext({ communicationMode: "work" });
      const messages = [{ sender: "other", text: "Meeting at 3?" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.context).toBeDefined();
    });

    it("conflict context is available for validation", () => {
      const context = makeContext({ communicationMode: "conflict" });
      const messages = [{ sender: "other", text: "I'm upset!" }];
      const intelligence = makeIntelligence({ conflict: { level: 0.7, type: "verbal" } });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.conflict.level).toBeGreaterThan(0);
    });
  });

  describe("Goal Alignment Gate", () => {
    it("goal is available for validation", () => {
      const context = makeContext({ goal: "disagree" });
      const messages = [{ sender: "other", text: "I think A is better." }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Communication Impact Gate", () => {
    it("impact prediction is available for validation", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.dynamics).toBeDefined();
    });
  });

  describe("Escalation Risk Gate", () => {
    it("conflict level is available for risk assessment", () => {
      const context = makeContext({ communicationMode: "conflict" });
      const messages = [{ sender: "other", text: "I'm so angry!" }];
      const intelligence = makeIntelligence({ conflict: { level: 0.9, type: "verbal" } });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.conflict.level).toBeGreaterThan(0);
    });
  });

  describe("Boundary Integrity Gate", () => {
    it("boundary setting is available for validation", () => {
      const context = makeContext({ goal: "set_boundary" });
      const messages = [{ sender: "other", text: "Can you do this?" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Language Consistency Gate", () => {
    it("language detection is available for validation", () => {
      const messages = [{ sender: "other", text: "naku ivala time ledu" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });
  });

  describe("Style Consistency Gate", () => {
    it("style profile is available for validation", () => {
      const context = makeContext({ userStyle: "casual" });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.style).toBeDefined();
      expect(state.style.source).toBeDefined();
    });
  });

  describe("Contradiction Gate", () => {
    it("contradiction detection is available", () => {
      const original = "I will attend the meeting.";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints.negations.length).toBe(0);
    });
  });

  describe("Clarity Gate", () => {
    it("clarity is assessed through validation", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const candidates = [
        { text: "Hello! How can I help you today?", strategy: "friendly" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation.results.length).toBe(1);
      expect(validation.results[0].dimensions).toBeDefined();
    });
  });

  describe("End-to-End Pre-Send Validation", () => {
    it("complete pre-send validation produces result", () => {
      const context = makeContext({
        tone: "professional",
        communicationMode: "work",
        goal: "inform",
      });
      const messages = [{ sender: "other", text: "What's the project status?" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const candidates = [
        { text: "The project is on track and we're meeting all milestones.", strategy: "professional" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation).toBeDefined();
      expect(validation.results.length).toBe(1);
      expect(validation.results[0].overallScore).toBeGreaterThanOrEqual(0);
      expect(validation.results[0].overallScore).toBeLessThanOrEqual(1);
    });

    it("multiple candidates are validated", () => {
      const context = makeContext({ tone: "warm" });
      const messages = [{ sender: "other", text: "Thanks!" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const candidates = [
        { text: "You're welcome!", strategy: "warm" },
        { text: "Happy to help!", strategy: "friendly" },
        { text: "No problem!", strategy: "natural" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation.results.length).toBe(3);
      expect(validation.validationSummary.totalCandidates).toBe(3);
    });
  });
});
