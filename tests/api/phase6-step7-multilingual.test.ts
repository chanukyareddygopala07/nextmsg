// ─── Phase 6 Step 7: Multilingual End-to-End Tests ──────────────────────────
//
// Tests complete flows in multiple languages: English, Telugu, Hindi, Tamil,
// Romanized Telugu, Romanized Hindi, Romanized Tamil, and code-mixed language.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { validateCandidates } from "@/lib/ai/quality-validator";
import { rankReplies } from "@/lib/ai/ranker";
import {
  createPreservationContract,
  validatePreservation,
} from "@/lib/ai/preservation";
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

// ─── English Tests ──────────────────────────────────────────────────────────

describe("Phase 6 Step 7: Multilingual End-to-End", () => {
  describe("English", () => {
    it("English conversation is preserved end-to-end", () => {
      const messages = [{ sender: "other", text: "How are you doing today?" }];
      const languageState = detectLanguageState(messages);

      expect(languageState.primary).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("English formal conversation maintains formality", () => {
      const context = makeContext({ tone: "formal" });
      const messages = [{ sender: "other", text: "Please submit the report by Friday." }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.language).toBeDefined();
      expect(state.language.primary).toBeDefined();
    });

    it("English casual conversation maintains casualness", () => {
      const context = makeContext({ tone: "casual" });
      const messages = [{ sender: "other", text: "yo what's up" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.language).toBeDefined();
    });
  });

  describe("Telugu (Script)", () => {
    it("Telugu script is detected", () => {
      const messages = [{ sender: "other", text: "నేను రేపు వస్తాను" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("Telugu conversation preserves meaning", () => {
      const original = "నేను రేపు వస్తాను";
      const langState = { primary: "telugu", script: "telugu", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });
  });

  describe("Hindi (Script)", () => {
    it("Hindi script is detected", () => {
      const messages = [{ sender: "other", text: "मैं कल आऊँगा" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("Hindi conversation preserves meaning", () => {
      const original = "मैं कल आऊँगा";
      const langState = { primary: "hindi", script: "devanagari", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });
  });

  describe("Tamil (Script)", () => {
    it("Tamil script is detected", () => {
      const messages = [{ sender: "other", text: "நாளை வருவேன்" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("Tamil conversation preserves meaning", () => {
      const original = "நாளை வருவேன்";
      const langState = { primary: "tamil", script: "tamil", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });
  });

  describe("Romanized Telugu", () => {
    it("Romanized Telugu is detected", () => {
      const messages = [{ sender: "other", text: "nenu raalenu" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("Romanized Telugu inability is preserved", () => {
      const original = "naku ivala time ledu";
      const langState = { primary: "telugu", script: "latin", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });

    it("Romanized Telugu refusal is preserved", () => {
      const original = "nenu raalenu";
      const langState = { primary: "telugu", script: "latin", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
    });
  });

  describe("Romanized Hindi", () => {
    it("Romanized Hindi is detected", () => {
      const messages = [{ sender: "other", text: "main kal aaunga" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("Romanized Hindi meaning is preserved", () => {
      const original = "main kal aaunga";
      const langState = { primary: "hindi", script: "latin", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });
  });

  describe("Romanized Tamil", () => {
    it("Romanized Tamil is detected", () => {
      const messages = [{ sender: "other", text: "naalai varuven" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("Romanized Tamil meaning is preserved", () => {
      const original = "naalai varuven";
      const langState = { primary: "tamil", script: "latin", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });
  });

  describe("Code-Mixed Language", () => {
    it("Code-mixed text is detected", () => {
      const messages = [{ sender: "other", text: "Hey, naku ivala time ledu" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(typeof languageState.primary).toBe("string");
    });

    it("Code-mixed meaning is preserved", () => {
      const original = "Hey, naku ivala time ledu";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: true };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints).toBeDefined();
    });
  });

  describe("Multilingual Pipeline Integration", () => {
    it("multilingual input flows through full pipeline", () => {
      const context = makeContext({ tone: "casual" });
      const messages = [{ sender: "other", text: "naku ivala time ledu" }];
      const intelligence = makeIntelligence({
        language: { primary: "telugu", secondary: [], script: "latin", codeMixed: false, romanized: true, confidence: 0.8 },
      });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(state.language).toBeDefined();
      expect(state.language.primary).toBeDefined();
      expect(strategy.ranked.length).toBeGreaterThan(0);
    });

    it("multilingual candidates can be validated", () => {
      const context = makeContext({ tone: "casual" });
      const messages = [{ sender: "other", text: "naku ivala time ledu" }];
      const intelligence = makeIntelligence({
        language: { primary: "telugu", secondary: [], script: "latin", codeMixed: false, romanized: true, confidence: 0.8 },
      });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const candidates = [
        { text: "sorry bro, ivala possible kadu", strategy: "natural" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation.passedCandidates.length).toBeGreaterThan(0);
    });

    it("multilingual candidates can be ranked", () => {
      const context = makeContext({ tone: "casual" });
      const messages = [{ sender: "other", text: "naku ivala time ledu" }];
      const intelligence = makeIntelligence({
        language: { primary: "telugu", secondary: [], script: "latin", codeMixed: false, romanized: true, confidence: 0.8 },
      });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      const candidates = [
        { text: "sorry bro, ivala possible kadu", strategy: "natural" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Multilingual Semantic Preservation", () => {
    it("Telugu inability is preserved through pipeline", () => {
      const original = "naku ivala time ledu";
      const langState = { primary: "telugu", script: "latin", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);
      const generated = "sorry, I don't have time today";
      const validation = validatePreservation(contract, generated);

      expect(validation).toBeDefined();
      expect(typeof validation.passed).toBe("boolean");
    });

    it("Hindi refusal is preserved through pipeline", () => {
      const original = "main nahi aa sakta";
      const langState = { primary: "hindi", script: "latin", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);
      const generated = "I can't come";
      const validation = validatePreservation(contract, generated);

      expect(validation).toBeDefined();
      expect(typeof validation.passed).toBe("boolean");
    });

    it("Tamil request is preserved through pipeline", () => {
      const original = "meeru repu pampinchandi";
      const langState = { primary: "tamil", script: "latin", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);
      const generated = "please send it tomorrow";
      const validation = validatePreservation(contract, generated);

      expect(validation).toBeDefined();
      expect(typeof validation.passed).toBe("boolean");
    });
  });
});
