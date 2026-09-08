import { describe, it, expect } from "vitest";
import {
  generateRecovery,
  classifyFact,
  buildSafeResponse,
  type UserFact,
} from "@/lib/ai/situation-recovery";
import {
  buildPersuasionEngine,
} from "@/lib/ai/persuasion";
import type { ConversationState } from "@/lib/ai/conversation-state";

function createDefaultState(overrides?: Partial<ConversationState>): ConversationState {
  return {
    participants: {
      count: 2,
      roles: ["friend"],
      userId: "me",
      others: ["them"],
      isGroup: false,
    },
    relationship: "friend",
    language: {
      primary: "english",
      secondary: [],
      script: "latin",
      codeMixed: false,
      romanized: false,
      codeMixRatio: [],
      outputPreference: "auto",
      confidence: 0.8,
      scriptConfidence: 0.9,
      detectionSource: "heuristic",
      participantLanguages: [],
    },
    context: {
      type: "general",
      platform: undefined,
      situation: "casual_chat",
      urgency: "normal",
    },
    intent: {
      userGoal: "keep_going",
      userIntent: "continue_conversation",
      otherIntent: "unknown",
    },
    emotion: {
      primary: "neutral",
      secondary: "neutral",
      intensity: 0.3,
    },
    tone: {
      primary: "casual",
      secondary: "friendly",
      intensity: 0.5,
    },
    dynamics: {
      engagement: 0.5,
      reciprocity: 0.5,
      cooperation: 0.5,
      defensiveness: 0.2,
      escalation: 0.1,
      rapport: 0.5,
      pressure: 0.2,
      uncertainty: 0.3,
      responsiveness: 0.5,
    },
    conflict: {
      level: 0,
      escalation: 0,
      trigger: "",
      coreDisagreement: "",
      personalAttacks: false,
      misunderstanding: false,
      resolutionOpportunity: true,
    },
    risks: [],
    conflictIntelligence: {
      participants: [],
      conflictStructure: null,
      groupAnalysis: null,
    },
    strategy: {
      primary: "natural",
      ranked: [],
      confidence: 0.5,
    },
    style: {
      preferred: "casual",
      writingCharacteristics: "casual",
      lengthPreference: "medium",
      profile: null,
      guidance: null,
      source: "default",
    },
    sources: {
      goalSource: "default",
      contextSource: "default",
      toneSource: "default",
      situationSource: "default",
      languageSource: "fallback",
    },
    ...overrides,
  };
}

describe("Situation Recovery", () => {
  describe("Late project/missed deadline", () => {
    it("generates recovery for late submission", () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "late_submission",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
        relationship: "professor",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("late_submission");
      expect(recovery.accountabilityLevel).toBe("full");
      expect(recovery.recommendedStrategies).toContain("accountable");
      expect(recovery.recommendedStrategies).toContain("solution_oriented");
      expect(recovery.requiredElements.some((e) => e.element === "acknowledgement")).toBe(true);
      expect(recovery.requiredElements.some((e) => e.element === "new_timeline")).toBe(true);
    });

    it("generates recovery for missed deadline", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "missed_deadline",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
        relationship: "manager",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("missed_deadline");
      expect(recovery.accountabilityLevel).toBe("full");
      expect(recovery.recommendedApproach).toContain("ACKNOWLEDGE");
      expect(recovery.recommendedApproach).toContain("ACCOUNTABILITY");
    });
  });

  describe("Late interview/missed interview", () => {
    it("generates recovery for late arrival", () => {
      const state = createDefaultState({
        context: {
          type: "interview",
          platform: undefined,
          situation: "late_arrival",
          urgency: "urgent",
        },
        intent: {
          userGoal: "ask_for_reschedule",
          userIntent: "ask_for_reschedule",
          otherIntent: "unknown",
        },
        relationship: "interviewer",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("late_arrival");
      expect(recovery.severity).toMatch(/medium|high/);
      expect(recovery.recommendedStrategies).toContain("professional");
      expect(recovery.recommendedStrategies).toContain("accountable");
      expect(recovery.recommendedStrategies).toContain("concise");
    });

    it("generates recovery for missed interview", () => {
      const state = createDefaultState({
        context: {
          type: "interview",
          platform: undefined,
          situation: "missed_interview",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_reschedule",
          userIntent: "ask_for_reschedule",
          otherIntent: "unknown",
        },
        relationship: "interviewer",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("missed_interview");
      expect(recovery.requiredElements.some((e) => e.element === "eta_or_reschedule")).toBe(true);
    });
  });

  describe("Missed meeting", () => {
    it("generates recovery for missed meeting", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "missed_meeting",
          urgency: "normal",
        },
        intent: {
          userGoal: "recover_from_mistake",
          userIntent: "apologize",
          otherIntent: "unknown",
        },
        relationship: "manager",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("missed_meeting");
      expect(recovery.accountabilityLevel).toBe("full");
      expect(recovery.recommendedStrategies).toContain("accountable");
      expect(recovery.requiredElements.some((e) => e.element === "reschedule")).toBe(true);
    });
  });

  describe("Wrong file", () => {
    it("generates recovery for wrong file", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "wrong_file",
          urgency: "normal",
        },
        intent: {
          userGoal: "recover_from_mistake",
          userIntent: "apologize",
          otherIntent: "unknown",
        },
        relationship: "client",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("wrong_file");
      expect(recovery.accountabilityLevel).toBe("full");
      expect(recovery.recommendedStrategies).toContain("solution_oriented");
      expect(recovery.requiredElements.some((e) => e.element === "correct")).toBe(true);
    });
  });

  describe("Customer complaint", () => {
    it("generates recovery for customer complaint", () => {
      const state = createDefaultState({
        context: {
          type: "customer",
          platform: undefined,
          situation: "customer_complaint",
          urgency: "high",
        },
        intent: {
          userGoal: "keep_going",
          userIntent: "reply",
          otherIntent: "requesting_action",
        },
        relationship: "customer",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("customer_complaint");
      expect(recovery.recommendedStrategies).toContain("empathetic");
      expect(recovery.recommendedStrategies).toContain("solution_oriented");
      expect(recovery.requiredElements.some((e) => e.element === "empathy")).toBe(true);
      expect(recovery.requiredElements.some((e) => e.element === "solution")).toBe(true);
    });
  });

  describe("Negotiation", () => {
    it("generates recovery for negotiation", () => {
      const state = createDefaultState({
        context: {
          type: "negotiation",
          platform: undefined,
          situation: "negotiation",
          urgency: "normal",
        },
        intent: {
          userGoal: "negotiate",
          userIntent: "negotiate",
          otherIntent: "negotiating",
        },
        relationship: "client",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("negotiation");
      expect(recovery.recommendedStrategies).toContain("persuasive");
      expect(recovery.recommendedStrategies).toContain("clear_direct");
      expect(recovery.requiredElements.some((e) => e.element === "objective")).toBe(true);
      expect(recovery.requiredElements.some((e) => e.element === "rationale")).toBe(true);
    });
  });

  describe("Conflict situations", () => {
    it("generates recovery for disagreement", () => {
      const state = createDefaultState({
        context: {
          type: "conflict",
          platform: undefined,
          situation: "disagreement",
          urgency: "normal",
        },
        intent: {
          userGoal: "keep_going",
          userIntent: "clarify",
          otherIntent: "disagreeing",
        },
        conflict: {
          level: 0.4,
          escalation: 0.2,
          trigger: "approach",
          coreDisagreement: "methodology",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("disagreement");
      expect(recovery.recommendedStrategies).toContain("assertive");
      expect(recovery.recommendedStrategies).toContain("clarifying");
    });

    it("generates recovery for heated argument with de-escalation", () => {
      const state = createDefaultState({
        context: {
          type: "conflict",
          platform: undefined,
          situation: "heated_argument",
          urgency: "high",
        },
        intent: {
          userGoal: "de_escalate",
          userIntent: "de_escalate",
          otherIntent: "disagreeing",
        },
        conflict: {
          level: 0.8,
          escalation: 0.7,
          trigger: "approach",
          coreDisagreement: "methodology",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("heated_argument");
      expect(recovery.severity).toBe("high");
      expect(recovery.recommendedStrategies).toContain("de_escalate");
      expect(recovery.conflictAdjusted).toBe(true);
    });

    it("generates recovery for personal conflict", () => {
      const state = createDefaultState({
        context: {
          type: "conflict",
          platform: undefined,
          situation: "personal_conflict",
          urgency: "normal",
        },
        intent: {
          userGoal: "keep_going",
          userIntent: "clarify",
          otherIntent: "disagreeing",
        },
        conflict: {
          level: 0.6,
          escalation: 0.4,
          trigger: "personal",
          coreDisagreement: "values",
          personalAttacks: true,
          misunderstanding: false,
          resolutionOpportunity: false,
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("personal_conflict");
      expect(recovery.riskyElements.some((r) => r.includes("personal attacks"))).toBe(true);
    });
  });

  describe("Misunderstanding", () => {
    it("generates recovery for misunderstanding", () => {
      const state = createDefaultState({
        context: {
          type: "general",
          platform: undefined,
          situation: "misunderstanding",
          urgency: "normal",
        },
        intent: {
          userGoal: "keep_going",
          userIntent: "clarify",
          otherIntent: "asking_for_explanation",
        },
        conflict: {
          level: 0.2,
          escalation: 0.1,
          trigger: "communication",
          coreDisagreement: "",
          personalAttacks: false,
          misunderstanding: true,
          resolutionOpportunity: true,
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("misunderstanding");
      expect(recovery.recommendedStrategies).toContain("clarifying");
      expect(recovery.requiredElements.some((e) => e.element === "clarification")).toBe(true);
    });
  });

  describe("Dating/flirting scenarios", () => {
    it("generates recovery for romantic interest", () => {
      const state = createDefaultState({
        context: {
          type: "dating",
          platform: undefined,
          situation: "romantic_interest",
          urgency: "normal",
        },
        intent: {
          userGoal: "flirt_naturally",
          userIntent: "flirt",
          otherIntent: "flirting",
        },
        relationship: "date",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("romantic_interest");
      expect(recovery.recommendedStrategies).toContain("natural");
      expect(recovery.recommendedStrategies).toContain("friendly");
    });

    it("generates recovery for delayed response in dating", () => {
      const state = createDefaultState({
        context: {
          type: "dating",
          platform: undefined,
          situation: "delayed_response",
          urgency: "normal",
        },
        intent: {
          userGoal: "reconnect",
          userIntent: "continue_conversation",
          otherIntent: "unknown",
        },
        relationship: "date",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("delayed_response");
      expect(recovery.severity).toBe("low");
    });
  });

  describe("Persuasion", () => {
    it("builds persuasion engine for negotiation", () => {
      const state = createDefaultState({
        context: {
          type: "negotiation",
          platform: undefined,
          situation: "negotiation",
          urgency: "normal",
        },
        intent: {
          userGoal: "negotiate",
          userIntent: "negotiate",
          otherIntent: "negotiating",
        },
      });

      const engine = buildPersuasionEngine(state);

      expect(engine.assessment.situation).toBe("negotiation");
      expect(engine.assessment.persuasionFeasibility).toBe("high");
      expect(engine.strategies.length).toBeGreaterThan(0);
      expect(engine.recommendedMode).toBeDefined();
    });

    it("builds persuasion engine for request", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "request",
          urgency: "normal",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
      });

      const engine = buildPersuasionEngine(state);

      expect(engine.assessment.persuasionFeasibility).toBe("high");
      expect(engine.strategies.some((s) => s.mode === "compromise")).toBe(true);
    });

    it("limits persuasion in high conflict", () => {
      const state = createDefaultState({
        context: {
          type: "conflict",
          platform: undefined,
          situation: "heated_argument",
          urgency: "high",
        },
        intent: {
          userGoal: "keep_going",
          userIntent: "de_escalate",
          otherIntent: "disagreeing",
        },
        conflict: {
          level: 0.8,
          escalation: 0.7,
          trigger: "approach",
          coreDisagreement: "methodology",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });

      const engine = buildPersuasionEngine(state);

      expect(engine.assessment.persuasionFeasibility).toBe("low");
      expect(engine.assessment.risks.length).toBeGreaterThan(0);
    });

    it("respects ethical boundaries", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "negotiation",
          urgency: "normal",
        },
        intent: {
          userGoal: "negotiate",
          userIntent: "negotiate",
          otherIntent: "unknown",
        },
      });

      const engine = buildPersuasionEngine(state);

      expect(engine.assessment.ethicalBoundaries.length).toBeGreaterThan(0);
      expect(engine.assessment.ethicalBoundaries.some((b) => b.includes("Never fabricate"))).toBe(true);
    });
  });

  describe("Factual safety", () => {
    it("does not invent excuses", () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "late_submission",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.riskyElements.some((r) => r.includes("Fabricating excuses"))).toBe(true);
      expect(recovery.riskyElements.some((r) => r.includes("Inventing emergencies"))).toBe(true);
    });

    it("does not invent emergency", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "late_arrival",
          urgency: "urgent",
        },
        intent: {
          userGoal: "ask_for_reschedule",
          userIntent: "ask_for_reschedule",
          otherIntent: "unknown",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.riskyElements.some((r) => r.includes("Inventing emergencies"))).toBe(true);
    });

    it("preserves user-provided facts", () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "late_submission",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
      });

      const userFacts: UserFact[] = [
        { text: "The project is 90% complete", source: "user", verified: true },
        { text: "I can submit tomorrow by 6 PM", source: "user", verified: true },
      ];

      const recovery = generateRecovery({ state, userFacts });

      expect(recovery.relevantFacts.length).toBe(2);
      expect(recovery.relevantFacts[0].text).toBe("The project is 90% complete");
      expect(recovery.relevantFacts[0].source).toBe("user");
    });

    it("classifies facts correctly", () => {
      const userStatedFacts = ["project is 90% complete", "can submit tomorrow"];

      expect(classifyFact("project is 90% complete", userStatedFacts)).toBe("user");
      expect(classifyFact("I was sick", userStatedFacts)).toBe("inferred");
    });

    it("builds safe response when no explanation provided", () => {
      const safeResponse = buildSafeResponse("late_submission", []);

      expect(safeResponse.length).toBeGreaterThan(0);
      expect(safeResponse).not.toContain("illness");
      expect(safeResponse).not.toContain("emergency");
    });

    it("returns empty when user provides explanation", () => {
      const userFacts: UserFact[] = [
        { text: "I was dealing with a family matter", source: "user", verified: true },
      ];

      const safeResponse = buildSafeResponse("late_submission", userFacts);

      expect(safeResponse).toBe("");
    });
  });

  describe("Context integration", () => {
    it("handles professional context appropriately", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "missed_deadline",
          urgency: "normal",
        },
        relationship: "manager",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.recommendedStrategies).toContain("accountable");
      expect(recovery.recommendedStrategies).toContain("solution_oriented");
    });

    it("handles academic context appropriately", () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "late_submission",
          urgency: "high",
        },
        relationship: "professor",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.accountabilityLevel).toBe("full");
      expect(recovery.recommendedStrategies).toContain("accountable");
    });

    it("handles interview context appropriately", () => {
      const state = createDefaultState({
        context: {
          type: "interview",
          platform: undefined,
          situation: "late_arrival",
          urgency: "urgent",
        },
        relationship: "interviewer",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.recommendedStrategies).toContain("professional");
      expect(recovery.recommendedStrategies).toContain("concise");
    });

    it("handles friendship context appropriately", () => {
      const state = createDefaultState({
        context: {
          type: "friendship",
          platform: undefined,
          situation: "delayed_response",
          urgency: "normal",
        },
        relationship: "friend",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.severity).toBe("low");
    });

    it("handles dating context appropriately", () => {
      const state = createDefaultState({
        context: {
          type: "dating",
          platform: undefined,
          situation: "romantic_interest",
          urgency: "normal",
        },
        relationship: "date",
      });

      const recovery = generateRecovery({ state });

      expect(recovery.recommendedStrategies).toContain("natural");
      expect(recovery.recommendedStrategies).toContain("friendly");
    });

    it("handles conflict context with de-escalation", () => {
      const state = createDefaultState({
        context: {
          type: "conflict",
          platform: undefined,
          situation: "heated_argument",
          urgency: "high",
        },
        conflict: {
          level: 0.8,
          escalation: 0.7,
          trigger: "approach",
          coreDisagreement: "methodology",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.conflictAdjusted).toBe(true);
      expect(recovery.recommendedStrategies).toContain("de_escalate");
    });
  });

  describe("Language integration", () => {
    it("marks language adjustment for code-mixed", () => {
      const state = createDefaultState({
        language: {
          primary: "telugu",
          secondary: ["english"],
          script: "mixed",
          codeMixed: true,
          romanized: true,
          codeMixRatio: [
            { language: "telugu", ratio: 0.6 },
            { language: "english", ratio: 0.4 },
          ],
          outputPreference: "code_mixed",
          confidence: 0.85,
          scriptConfidence: 0.9,
          detectionSource: "ai",
          participantLanguages: [],
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.languageAdjusted).toBe(true);
    });

    it("marks language adjustment for romanized", () => {
      const state = createDefaultState({
        language: {
          primary: "hindi",
          secondary: [],
          script: "latin",
          codeMixed: false,
          romanized: true,
          codeMixRatio: [],
          outputPreference: "romanized",
          confidence: 0.85,
          scriptConfidence: 0.9,
          detectionSource: "ai",
          participantLanguages: [],
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.languageAdjusted).toBe(true);
    });
  });

  describe("Style integration", () => {
    it("warns about casual language in professional context", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "missed_deadline",
          urgency: "normal",
        },
        style: {
          preferred: "casual",
          writingCharacteristics: "casual",
          lengthPreference: "short",
          profile: {
            emoji: {
              usesEmojis: true,
              frequency: 0.6,
              placement: "end",
              commonEmojis: ["😂", "🤣", "💀"],
              categories: ["faces"],
            },
            punctuation: {
              style: "expressive",
              exclamationRate: 0.3,
              questionRate: 0.2,
              usesEllipses: false,
              endsWithPeriod: false,
              multiPunctuationRate: 0.1,
            },
            sentence: {
              averageWords: 4,
              averageChars: 20,
              completenessRate: 0.2,
              prefersFragments: true,
              lengthCategory: "short",
            },
            slang: {
              usesSlang: true,
              frequency: 0.4,
              commonSlang: ["nah", "bruh", "haha"],
              commonAbbreviations: ["lol", "ngl"],
              codeSwitchTendency: 0,
            },
            humor: {
              usesHumor: true,
              indicators: ["haha", "lol"],
              style: "playful",
            },
            tonePreference: {
              dominant: "casual",
              secondary: "playful",
              formality: "very_casual",
              warmth: 0.6,
              directness: 0.4,
            },
            confidence: 0.8,
            messageCount: 10,
            languageStyle: "standard_english",
          },
          guidance: null,
          source: "extracted",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.riskyElements.some((r) => r.includes("casual language"))).toBe(true);
    });
  });

  describe("Group integration", () => {
    it("handles group conversations", () => {
      const state = createDefaultState({
        participants: {
          count: 4,
          roles: ["friend", "friend", "friend"],
          userId: "me",
          others: ["a", "b", "c"],
          isGroup: true,
        },
        context: {
          type: "professional",
          platform: undefined,
          situation: "missed_deadline",
          urgency: "normal",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.groupAdjusted).toBe(true);
      expect(recovery.riskyElements.some((r) => r.includes("Assigning blame"))).toBe(true);
      expect(recovery.riskyElements.some((r) => r.includes("Speaking for others"))).toBe(true);
    });

    it("adds shared responsibility element for groups", () => {
      const state = createDefaultState({
        participants: {
          count: 4,
          roles: ["friend", "friend", "friend"],
          userId: "me",
          others: ["a", "b", "c"],
          isGroup: true,
        },
        context: {
          type: "professional",
          platform: undefined,
          situation: "missed_deadline",
          urgency: "normal",
        },
      });

      const recovery = generateRecovery({ state });

      expect(
        recovery.requiredElements.some((e) => e.element === "shared_responsibility")
      ).toBe(true);
    });
  });

  describe("Recovery quality", () => {
    it("produces a concrete next step", () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "late_submission",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.nextAction.length).toBeGreaterThan(0);
      expect(recovery.nextAction).toContain("Send");
    });

    it("avoids over-explaining in required elements", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "wrong_file",
          urgency: "normal",
        },
      });

      const recovery = generateRecovery({ state });

      // Wrong file should have concise required elements
      expect(recovery.requiredElements.length).toBeLessThanOrEqual(4);
    });

    it("preserves user goal", () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "late_submission",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.userGoal).toBe("ask_for_extension");
    });

    it("preserves strategy recommendations", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "negotiation",
          urgency: "normal",
        },
        intent: {
          userGoal: "negotiate",
          userIntent: "negotiate",
          otherIntent: "unknown",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.recommendedStrategies.length).toBeGreaterThan(0);
      expect(recovery.recommendedStrategies).toContain("persuasive");
    });

    it("returns usable response guidance", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "missed_deadline",
          urgency: "high",
        },
        intent: {
          userGoal: "ask_for_extension",
          userIntent: "ask_for_extension",
          otherIntent: "unknown",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.candidateGuidance.length).toBeGreaterThan(0);
      expect(recovery.candidateGuidance[0].structure.length).toBeGreaterThan(0);
      expect(recovery.candidateGuidance[0].tone.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("handles unknown situation", () => {
      const state = createDefaultState({
        context: {
          type: "general",
          platform: undefined,
          situation: "unknown",
          urgency: "normal",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.situation).toBe("unknown");
      expect(recovery.recommendedStrategies.length).toBeGreaterThan(0);
    });

    it("handles empty user facts", () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "late_submission",
          urgency: "high",
        },
      });

      const recovery = generateRecovery({ state, userFacts: [] });

      expect(recovery.relevantFacts.length).toBe(0);
    });

    it("filters unverified facts", () => {
      const state = createDefaultState();
      const userFacts: UserFact[] = [
        { text: "verified fact", source: "user", verified: true },
        { text: "unverified fact", source: "inferred", verified: false },
      ];

      const recovery = generateRecovery({ state, userFacts });

      expect(recovery.relevantFacts.length).toBe(1);
      expect(recovery.relevantFacts[0].text).toBe("verified fact");
    });

    it("handles high urgency", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "late_arrival",
          urgency: "urgent",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.severity).toMatch(/medium|high/);
    });

    it("handles multiple required elements", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "negotiation",
          urgency: "normal",
        },
        intent: {
          userGoal: "negotiate",
          userIntent: "negotiate",
          otherIntent: "unknown",
        },
      });

      const recovery = generateRecovery({ state });

      expect(recovery.requiredElements.length).toBeGreaterThanOrEqual(4);
    });
  });
});
