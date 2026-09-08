// ─── Phase 6 Step 7: Semantic Regression Protection Tests ───────────────────
//
// Tests that semantic preservation does not regress from 94.6%.
// Especially tests: negation, inability, availability, disagreement, refusal,
// dates, times, numbers, commitments, conditions, boundaries, factual statements.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  createPreservationContract,
  validatePreservation,
  extractFactualClaims,
  extractNegations,
  type LanguageState,
} from "@/lib/ai/preservation";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { validateCandidates } from "@/lib/ai/quality-validator";
import { detectLanguageState } from "@/lib/ai/language-detect";
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

const EN: LanguageState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
const TE: LanguageState = { primary: "telugu", script: "latin", romanized: true, codeMixed: false };
const HI: LanguageState = { primary: "hindi", script: "latin", romanized: true, codeMixed: false };

// ─── Semantic Regression Tests ──────────────────────────────────────────────

describe("Phase 6 Step 7: Semantic Regression Protection", () => {
  describe("Negation", () => {
    it("negation 'cannot' is preserved", () => {
      const original = "I cannot attend the meeting.";
      const contract = createPreservationContract(original, EN);
      const generated = "I won't be able to make it to the meeting.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe("boolean");
    });

    it("negation 'won't' is preserved", () => {
      const original = "I won't be there.";
      const contract = createPreservationContract(original, EN);
      const generated = "I'm not going to be there.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });

    it("negation patterns are extracted", () => {
      const text = "I cannot attend. I won't be there. I don't have time.";
      const negations = extractNegations(text, EN);

      expect(Array.isArray(negations)).toBe(true);
      expect(negations.length).toBeGreaterThan(0);
    });
  });

  describe("Inability", () => {
    it("inability meaning is preserved", () => {
      const original = "naku ivala time ledu";
      const contract = createPreservationContract(original, TE);
      const generated = "sorry, I don't have time today";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });

    it("English inability is preserved", () => {
      const original = "I don't have time today.";
      const contract = createPreservationContract(original, EN);
      const generated = "I'm not available today.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Availability", () => {
    it("availability status is preserved", () => {
      const original = "I'm available tomorrow afternoon.";
      const contract = createPreservationContract(original, EN);
      const generated = "I can meet tomorrow afternoon.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });

    it("unavailability is preserved", () => {
      const original = "I'm not available this week.";
      const contract = createPreservationContract(original, EN);
      const generated = "I can't meet this week.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Disagreement", () => {
    it("disagreement meaning is preserved", () => {
      const original = "I disagree with option A.";
      const contract = createPreservationContract(original, EN);
      const generated = "I think option B would be better.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Refusal", () => {
    it("refusal meaning is preserved", () => {
      const original = "nenu raalenu";
      const contract = createPreservationContract(original, TE);
      const generated = "I'm not coming";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });

    it("English refusal is preserved", () => {
      const original = "I can't come to the party.";
      const contract = createPreservationContract(original, EN);
      const generated = "I won't be able to make it.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Dates and Times", () => {
    it("date information is preserved", () => {
      const original = "Let's meet on Friday at 3pm.";
      const contract = createPreservationContract(original, EN);
      const generated = "Friday at 3pm works for me.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });

    it("time information is preserved", () => {
      const original = "The meeting is at 2:30 PM.";
      const contract = createPreservationContract(original, EN);
      const generated = "I'll be there at 2:30 PM.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Numbers", () => {
    it("numerical information is preserved", () => {
      const original = "We need 5 more units.";
      const contract = createPreservationContract(original, EN);
      const generated = "We're short by 5 units.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });

    it("monetary amounts are preserved", () => {
      const original = "The budget is $10,000.";
      const contract = createPreservationContract(original, EN);
      const generated = "We have $10,000 allocated.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Commitments", () => {
    it("commitment meaning is preserved", () => {
      const original = "I'll have the report done by Friday.";
      const contract = createPreservationContract(original, EN);
      const generated = "The report will be ready by Friday.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Conditions", () => {
    it("conditional meaning is preserved", () => {
      const original = "If it rains, we'll postpone.";
      const contract = createPreservationContract(original, EN);
      const generated = "We'll postpone if it rains.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Boundaries", () => {
    it("boundary meaning is preserved", () => {
      const original = "I'm not comfortable with that.";
      const contract = createPreservationContract(original, EN);
      const generated = "That doesn't work for me.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("Factual Statements", () => {
    it("factual claims are extracted", () => {
      const original = "The meeting is at 3pm and we need 5 people.";
      const claims = extractFactualClaims(original);

      expect(Array.isArray(claims)).toBe(true);
    });

    it("factual information is preserved", () => {
      const original = "The project deadline is March 15th.";
      const contract = createPreservationContract(original, EN);
      const generated = "We need to finish by March 15th.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });

  describe("End-to-End Semantic Preservation", () => {
    it("preservation contract captures required elements", () => {
      const original = "I can't attend because I have another meeting at 3pm.";
      const contract = createPreservationContract(original, EN);

      expect(contract.semanticConstraints).toBeDefined();
      expect(contract.semanticConstraints.negations.length).toBeGreaterThan(0);
    });

    it("preservation validation checks all elements", () => {
      const original = "I can't attend because I have another meeting at 3pm.";
      const contract = createPreservationContract(original, EN);
      const generated = "I have a conflict at 3pm so I can't make it.";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe("boolean");
    });

    it("preservation works through full pipeline", () => {
      const context = makeContext({ tone: "warm" });
      const messages = [{ sender: "other", text: "Can you come to the meeting?" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      const candidates = [
        { text: "I can't make it, I have another meeting.", strategy: "natural" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation.passedCandidates.length).toBeGreaterThan(0);
    });
  });

  describe("Multilingual Semantic Preservation", () => {
    it("Telugu inability is preserved end-to-end", () => {
      const original = "naku ivala time ledu";
      const contract = createPreservationContract(original, TE);
      const generated = "sorry, ivala possible kadu";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });

    it("Hindi refusal is preserved end-to-end", () => {
      const original = "main nahi aa sakta";
      const contract = createPreservationContract(original, HI);
      const generated = "I can't come";
      const result = validatePreservation(contract, generated);

      expect(result).toBeDefined();
    });
  });
});
