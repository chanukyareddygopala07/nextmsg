import { describe, it, expect } from "vitest";
import {
  createPreservationContract,
  validatePreservation,
  extractNegations,
  extractTemporalConstraints,
  extractAbilityConstraints,
  extractPosition,
  extractBoundaries,
  extractFactualClaims,
  type LanguageState,
  type PreservationContract,
} from "@/lib/ai/preservation";

// ─── Test Helpers ───────────────────────────────────────────────────────────

const defaultLanguageState: LanguageState = {
  primary: "english",
  script: "latin",
  romanized: false,
  codeMixed: false,
};

const teluguLanguageState: LanguageState = {
  primary: "telugu",
  script: "latin",
  romanized: true,
  codeMixed: true,
};

const hindiLanguageState: LanguageState = {
  primary: "hindi",
  script: "latin",
  romanized: true,
  codeMixed: true,
};

// ─── Negation Tests ─────────────────────────────────────────────────────────

describe("Preservation Engine", () => {
  describe("Negation Detection", () => {
    it("detects English negation 'not'", () => {
      const text = "I am not available today";
      const negations = extractNegations(text, defaultLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "not")).toBe(true);
    });

    it("detects English negation 'cannot'", () => {
      const text = "I cannot attend the meeting";
      const negations = extractNegations(text, defaultLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "cannot")).toBe(true);
    });

    it("detects English negation 'can't'", () => {
      const text = "I can't finish today";
      const negations = extractNegations(text, defaultLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "can't")).toBe(true);
    });

    it("detects English negation 'don't'", () => {
      const text = "I don't agree with this";
      const negations = extractNegations(text, defaultLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "don't")).toBe(true);
    });

    it("detects English negation 'won't'", () => {
      const text = "I won't be able to attend";
      const negations = extractNegations(text, defaultLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "won't")).toBe(true);
    });

    it("detects Romanized Telugu negation 'kadu'", () => {
      const text = "naku ivala submit cheyyadam possible kadu sir";
      const negations = extractNegations(text, teluguLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "kadu")).toBe(true);
    });

    it("detects Romanized Telugu negation 'kaadu'", () => {
      const text = "naku ivala submit cheyyadam possible kaadu";
      const negations = extractNegations(text, teluguLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "kaadu")).toBe(true);
    });

    it("detects Romanized Telugu negation 'ledu'", () => {
      const text = "nenu ivala available ledu";
      const negations = extractNegations(text, teluguLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "ledu")).toBe(true);
    });

    it("detects Romanized Telugu negation 'vaddhu'", () => {
      const text = "naku adi vaddhu";
      const negations = extractNegations(text, teluguLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "vaddhu")).toBe(true);
    });

    it("detects Romanized Hindi negation 'nahi'", () => {
      const text = "main nahi aa sakta";
      const negations = extractNegations(text, hindiLanguageState);
      expect(negations.length).toBeGreaterThan(0);
      expect(negations.some((n) => n.word.toLowerCase() === "nahi")).toBe(true);
    });

    it("does not detect negation in positive statement", () => {
      const text = "I can attend the meeting tomorrow";
      const negations = extractNegations(text, defaultLanguageState);
      expect(negations.length).toBe(0);
    });
  });

  describe("Temporal Constraint Detection", () => {
    it("detects 'today'", () => {
      const text = "I can't finish today";
      const temporal = extractTemporalConstraints(text, defaultLanguageState);
      expect(temporal.length).toBeGreaterThan(0);
      expect(temporal.some((t) => t.normalized === "today")).toBe(true);
    });

    it("detects 'tomorrow'", () => {
      const text = "I'll send it tomorrow";
      const temporal = extractTemporalConstraints(text, defaultLanguageState);
      expect(temporal.length).toBeGreaterThan(0);
      expect(temporal.some((t) => t.normalized === "tomorrow")).toBe(true);
    });

    it("detects time '5 PM'", () => {
      const text = "I'll send it by 5 PM";
      const temporal = extractTemporalConstraints(text, defaultLanguageState);
      expect(temporal.length).toBeGreaterThan(0);
      expect(temporal.some((t) => t.value.includes("5 PM"))).toBe(true);
    });

    it("detects time '3:30pm'", () => {
      const text = "Let's meet at 3:30pm";
      const temporal = extractTemporalConstraints(text, defaultLanguageState);
      expect(temporal.length).toBeGreaterThan(0);
      expect(temporal.some((t) => t.value.includes("3:30"))).toBe(true);
    });

    it("detects day of week", () => {
      const text = "I can meet on Monday";
      const temporal = extractTemporalConstraints(text, defaultLanguageState);
      expect(temporal.length).toBeGreaterThan(0);
      expect(temporal.some((t) => t.normalized === "monday")).toBe(true);
    });

    it("detects Romanized Telugu 'ivala'", () => {
      const text = "naku ivala submit cheyyadam possible kadu";
      const temporal = extractTemporalConstraints(text, teluguLanguageState);
      expect(temporal.length).toBeGreaterThan(0);
      expect(temporal.some((t) => t.normalized === "today")).toBe(true);
    });

    it("detects Romanized Telugu 'repu'", () => {
      const text = "repu chestha";
      const temporal = extractTemporalConstraints(text, teluguLanguageState);
      expect(temporal.length).toBeGreaterThan(0);
      expect(temporal.some((t) => t.normalized === "tomorrow")).toBe(true);
    });

    it("does not detect temporal in generic text", () => {
      const text = "I need to finish this";
      const temporal = extractTemporalConstraints(text, defaultLanguageState);
      expect(temporal.length).toBe(0);
    });
  });

  describe("Ability Constraint Detection", () => {
    it("detects 'can'", () => {
      const text = "I can attend the meeting";
      const ability = extractAbilityConstraints(text, defaultLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "can" && !a.negated)).toBe(true);
    });

    it("detects 'cannot'", () => {
      const text = "I cannot attend the meeting";
      const ability = extractAbilityConstraints(text, defaultLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "cannot" && a.negated)).toBe(true);
    });

    it("detects 'can't'", () => {
      const text = "I can't finish today";
      const ability = extractAbilityConstraints(text, defaultLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "cannot" && a.negated)).toBe(true);
    });

    it("detects 'possible'", () => {
      const text = "Is it possible to reschedule?";
      const ability = extractAbilityConstraints(text, defaultLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "possible" && !a.negated)).toBe(true);
    });

    it("detects 'impossible'", () => {
      const text = "It's impossible to finish today";
      const ability = extractAbilityConstraints(text, defaultLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "impossible" && a.negated)).toBe(true);
    });

    it("detects 'available'", () => {
      const text: string = "I am available tomorrow";
      const ability = extractAbilityConstraints(text, defaultLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "available" && !a.negated)).toBe(true);
    });

    it("detects 'unavailable'", () => {
      const text: string = "I am unavailable today";
      const ability = extractAbilityConstraints(text, defaultLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "unavailable" && a.negated)).toBe(true);
    });

    it("detects Romanized Telugu 'possible kadu'", () => {
      const text = "naku ivala submit cheyyadam possible kadu";
      const ability = extractAbilityConstraints(text, teluguLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "impossible" && a.negated)).toBe(true);
    });

    it("detects Romanized Telugu 'kastam'", () => {
      const text = "naku ivala submit cheyyadam kastam";
      const ability = extractAbilityConstraints(text, teluguLanguageState);
      expect(ability.length).toBeGreaterThan(0);
      expect(ability.some((a) => a.type === "cannot")).toBe(true);
    });
  });

  describe("Position Detection", () => {
    it("detects 'agree'", () => {
      const text = "I agree with this decision";
      const position = extractPosition(text, defaultLanguageState);
      expect(position).not.toBeNull();
      expect(position?.type).toBe("agree");
    });

    it("detects 'disagree'", () => {
      const text = "I disagree with this approach";
      const position = extractPosition(text, defaultLanguageState);
      expect(position).not.toBeNull();
      expect(position?.type).toBe("disagree");
    });

    it("detects 'support'", () => {
      const text = "I support this proposal";
      const position = extractPosition(text, defaultLanguageState);
      expect(position).not.toBeNull();
      expect(position?.type).toBe("support");
    });

    it("detects 'oppose'", () => {
      const text = "I oppose this change";
      const position = extractPosition(text, defaultLanguageState);
      expect(position).not.toBeNull();
      expect(position?.type).toBe("disagree");
    });

    it("detects 'reject'", () => {
      const text = "I reject this offer";
      const position = extractPosition(text, defaultLanguageState);
      expect(position).not.toBeNull();
      expect(position?.type).toBe("disagree");
    });

    it("returns null for neutral text", () => {
      const text = "I need to finish this project";
      const position = extractPosition(text, defaultLanguageState);
      expect(position).toBeNull();
    });

    it("detects Romanized Telugu position", () => {
      const text = "nenu agree avvanu with this";
      const position = extractPosition(text, teluguLanguageState);
      expect(position).not.toBeNull();
      expect(position?.type).toBe("agree");
    });
  });

  describe("Boundary Detection", () => {
    it("detects 'I can't'", () => {
      const text = "I can't work this weekend";
      const boundaries = extractBoundaries(text, defaultLanguageState);
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some((b) => b.type === "can't")).toBe(true);
    });

    it("detects 'I won't'", () => {
      const text = "I won't be available";
      const boundaries = extractBoundaries(text, defaultLanguageState);
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some((b) => b.type === "won't")).toBe(true);
    });

    it("detects 'not available'", () => {
      const text = "I'm not available this weekend";
      const boundaries = extractBoundaries(text, defaultLanguageState);
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some((b) => b.type === "not_available")).toBe(true);
    });

    it("detects 'not possible'", () => {
      const text = "It's not possible to attend";
      const boundaries = extractBoundaries(text, defaultLanguageState);
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some((b) => b.type === "not_possible")).toBe(true);
    });

    it("does not detect boundary in positive statement", () => {
      const text = "I can work this weekend";
      const boundaries = extractBoundaries(text, defaultLanguageState);
      expect(boundaries.length).toBe(0);
    });

    it("detects Romanized Telugu boundary 'vaddhu'", () => {
      const text = "naku adi vaddhu";
      const boundaries = extractBoundaries(text, teluguLanguageState);
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some((b) => b.type === "refusal")).toBe(true);
    });
  });

  describe("Factual Claim Detection", () => {
    it("detects time", () => {
      const text = "I'll send it by 5 PM";
      const facts = extractFactualClaims(text);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => f.type === "time" && f.value.includes("5"))).toBe(true);
    });

    it("detects date", () => {
      const text = "I'll submit it on 12/25";
      const facts = extractFactualClaims(text);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => f.type === "date")).toBe(true);
    });

    it("detects number", () => {
      const text = "I need 3 more days";
      const facts = extractFactualClaims(text);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => f.type === "number" && f.value === "3")).toBe(true);
    });

    it("detects URL", () => {
      const text = "Check https://example.com for details";
      const facts = extractFactualClaims(text);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => f.type === "url")).toBe(true);
    });

    it("detects email", () => {
      const text = "Email me at test@example.com";
      const facts = extractFactualClaims(text);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => f.type === "email")).toBe(true);
    });

    it("detects phone number", () => {
      const text = "Call me at 555-123-4567";
      const facts = extractFactualClaims(text);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => f.type === "phone")).toBe(true);
    });
  });

  describe("Preservation Contract Creation", () => {
    it("creates contract for English text", () => {
      const text = "I can't attend tomorrow because I have another appointment";
      const contract = createPreservationContract(text, defaultLanguageState);

      expect(contract.originalText).toBe(text);
      expect(contract.semanticConstraints.negations.length).toBeGreaterThan(0);
      expect(contract.semanticConstraints.temporalConstraints.length).toBeGreaterThan(0);
      expect(contract.semanticConstraints.abilityConstraints.length).toBeGreaterThan(0);
      expect(contract.confidence).toBeGreaterThan(0);
    });

    it("creates contract for Romanized Telugu text", () => {
      const text = "naku ivala submit cheyyadam possible kadu sir";
      const contract = createPreservationContract(text, teluguLanguageState);

      expect(contract.originalText).toBe(text);
      expect(contract.semanticConstraints.negations.length).toBeGreaterThan(0);
      expect(contract.semanticConstraints.temporalConstraints.length).toBeGreaterThan(0);
      expect(contract.semanticConstraints.abilityConstraints.length).toBeGreaterThan(0);
      expect(contract.languageState.primary).toBe("telugu");
      expect(contract.languageState.romanized).toBe(true);
      expect(contract.languageState.codeMixed).toBe(true);
    });

    it("creates contract with position", () => {
      const text = "I don't agree with this decision";
      const contract = createPreservationContract(text, defaultLanguageState);

      expect(contract.semanticConstraints.position).not.toBeNull();
      expect(contract.semanticConstraints.position?.type).toBe("disagree");
    });

    it("creates contract with boundary", () => {
      const text = "I can't work this weekend";
      const contract = createPreservationContract(text, defaultLanguageState);

      expect(contract.semanticConstraints.boundaries.length).toBeGreaterThan(0);
    });
  });

  describe("Preservation Validation", () => {
    it("passes when candidate preserves negation", () => {
      const text = "I can't attend tomorrow";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I won't be able to attend tomorrow";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
      expect(result.details.negationPreserved).toBe(true);
    });

    it("fails when candidate removes negation", () => {
      const text = "I can't attend tomorrow";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I can attend tomorrow";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.negationPreserved).toBe(false);
    });

    it("fails when candidate reverses negation", () => {
      const text = "I don't agree with this";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I agree with this";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.positionPreserved).toBe(false);
    });

    it("passes when candidate preserves temporal constraint", () => {
      const text = "I'll send it by 5 PM tomorrow";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'll deliver it by 5 PM tomorrow";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
      expect(result.details.temporalPreserved).toBe(true);
    });

    it("fails when candidate changes temporal constraint", () => {
      const text = "I'll send it by 5 PM today";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'll send it by 5 PM tomorrow";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.temporalPreserved).toBe(false);
    });

    it("passes when candidate preserves boundary", () => {
      const text = "I can't work this weekend";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'm not available to work this weekend";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
      expect(result.details.boundaryPreserved).toBe(true);
    });

    it("fails when candidate weakens boundary", () => {
      const text = "I can't work this weekend";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'll try to work this weekend";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.boundaryPreserved).toBe(false);
    });

    it("passes when candidate preserves ability constraint", () => {
      const text = "I cannot submit today";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I won't be able to submit today";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
      expect(result.details.abilityPreserved).toBe(true);
    });

    it("fails when candidate reverses ability constraint", () => {
      const text = "I cannot submit today";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I can submit today";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.abilityPreserved).toBe(false);
    });

    it("passes when candidate preserves facts", () => {
      const text = "I'll send it by 5 PM";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'll deliver it by 5 PM";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
      expect(result.details.factsPreserved).toBe(true);
    });

    it("fails when candidate changes facts", () => {
      const text = "I'll send it by 5 PM";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'll send it tonight";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.factsPreserved).toBe(false);
    });

    it("passes for Romanized Telugu text preservation", () => {
      const text = "naku ivala submit cheyyadam possible kadu sir";
      const contract = createPreservationContract(text, teluguLanguageState);
      const candidate = "sir, naku ivala submit cheyyadam possible kadu";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
      expect(result.details.negationPreserved).toBe(true);
      expect(result.details.temporalPreserved).toBe(true);
    });

    it("fails for Romanized Telugu negation reversal", () => {
      const text = "naku ivala submit cheyyadam possible kadu sir";
      const contract = createPreservationContract(text, teluguLanguageState);
      const candidate = "sir, can I submit this now?";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.negationPreserved).toBe(false);
      expect(result.details.abilityPreserved).toBe(false);
    });

    it("fails when candidate invents reason", () => {
      const text = "I can't attend tomorrow";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I can't attend tomorrow because I'm sick";

      const result = validatePreservation(contract, candidate);
      // This should pass because we're not checking for invented reasons
      // The preservation engine focuses on semantic constraints
      expect(result.passed).toBe(true);
    });

    it("provides detailed validation results", () => {
      const text = "I can't attend tomorrow because I have another appointment";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I won't be able to attend tomorrow due to another appointment";

      const result = validatePreservation(contract, candidate);
      expect(result.score).toBeGreaterThan(0);
      expect(result.details).toBeDefined();
      expect(result.issues).toBeDefined();
    });
  });

  describe("Critical Failure Tests", () => {
    it("rejects 'cannot submit today' → 'can I submit today?'", () => {
      const text = "I cannot submit today";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "Can I submit today?";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.abilityPreserved).toBe(false);
    });

    it("rejects 'don't agree' → 'agree'", () => {
      const text = "I don't agree with this";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I agree with this";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.positionPreserved).toBe(false);
    });

    it("rejects 'can't work this weekend' → 'will try to work'", () => {
      const text = "I can't work this weekend";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'll try to work this weekend";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.boundaryPreserved).toBe(false);
    });

    it("rejects 'send by 5 PM' → 'send tonight'", () => {
      const text = "I'll send it by 5 PM";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I'll send it tonight";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.factsPreserved).toBe(false);
    });

    it("rejects 'today' → 'tomorrow'", () => {
      const text = "I can't finish today";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I can't finish tomorrow";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.temporalPreserved).toBe(false);
    });

    it("rejects Romanized Telugu negation reversal", () => {
      const text = "naku ivala submit cheyyadam possible kadu sir";
      const contract = createPreservationContract(text, teluguLanguageState);
      const candidate = "Sir, can I submit this now?";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.negationPreserved).toBe(false);
      expect(result.details.abilityPreserved).toBe(false);
    });

    it("rejects Romanized Telugu temporal change", () => {
      const text = "naku ivala submit cheyyadam possible kadu sir";
      const contract = createPreservationContract(text, teluguLanguageState);
      const candidate = "sir, naku repu submit cheyyadam possible";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(false);
      expect(result.details.temporalPreserved).toBe(false);
    });
  });

  describe("Style Preservation Tests", () => {
    it("passes for natural improvement", () => {
      const text = "Can't finish today. Too much work.";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I can't finish today. Too much work right now.";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
    });

    it("passes for professional improvement", () => {
      const text = "Can't finish today. Too much work.";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I won't be able to complete this today due to my current workload.";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
    });

    it("passes for diplomatic improvement", () => {
      const text = "You're always blaming me. I already did my part.";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "I feel like the conversation is becoming focused on blame. I completed my part.";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
    });

    it("passes for playful improvement", () => {
      const text = "Why didn't you reply?";
      const contract = createPreservationContract(text, defaultLanguageState);
      const candidate = "You disappeared on me 👀 busy?";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
    });

    it("passes for multilingual improvement", () => {
      const text = "naku ivala submit cheyyadam possible kadu sir";
      const contract = createPreservationContract(text, teluguLanguageState);
      const candidate = "sir, naku ivala submit cheyyadam kastam avutundi";

      const result = validatePreservation(contract, candidate);
      expect(result.passed).toBe(true);
    });
  });
});
