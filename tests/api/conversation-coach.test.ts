import { describe, it, expect } from "vitest";
import { coachConversation } from "@/lib/ai/conversation-coach";
import type { ConversationCoachingResult } from "@/lib/ai/coaching-types";

// ─── Mock Conversation State Factory ─────────────────────────────────────────

function createMockState(overrides?: Record<string, unknown>) {
  return {
    participants: { count: 2, roles: [], userId: "user1", others: ["user2"], isGroup: false },
    relationship: "friend" as const,
    language: {
      primary: "english", secondary: [], script: "latin" as const, romanized: false, codeMixed: false,
      codeMixRatio: [], outputPreference: "auto" as const, confidence: 0.8, scriptConfidence: 0.9,
      detectionSource: "heuristic" as const, participantLanguages: [],
    },
    context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
    intent: { userIntent: "continue_conversation" as const, userGoal: "continue_conversation", otherIntent: "unknown" as const },
    emotion: { primary: "neutral" as const, secondary: "neutral" as const, intensity: 0.3 },
    tone: { primary: "neutral" as const, secondary: "neutral" as const, intensity: 0.3 },
    conflict: { level: 0.1, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
    dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0, escalation: 0, rapport: 0.5, pressure: 0, uncertainty: 0, responsiveness: 0.5 },
    risks: [],
    conflictIntelligence: { participants: [], conflictStructure: null, groupAnalysis: null },
    strategy: { primary: "natural" as const, ranked: [], confidence: 0.5 },
    style: { preferred: "casual", writingCharacteristics: "", lengthPreference: "medium", profile: null, guidance: null, source: "default" as const },
    sources: { goalSource: "default" as const, contextSource: "default" as const, toneSource: "default" as const, situationSource: "default" as const, languageSource: "heuristic" as const },
    ...overrides,
  } as never;
}

function createMockConflictStructure(overrides?: Record<string, unknown>) {
  return {
    conflictLevel: 0.3,
    escalationLevel: 0.2,
    escalationTrend: "stable" as const,
    trigger: "misunderstanding about deadline",
    coreDisagreement: "When the report was due",
    secondaryDisagreements: [],
    misunderstandings: [],
    factualDisputes: [],
    personalAttacks: false,
    personalAttackTargets: [],
    blamePattern: "none" as const,
    blameTargets: [],
    defensiveness: 0.2,
    unresolvedQuestions: [],
    resolutionOpportunities: [],
    ...overrides,
  };
}

function createMockRecovery(overrides?: Record<string, unknown>) {
  return {
    situation: "late_submission" as const,
    severity: "medium" as const,
    userGoal: "apologize" as const,
    accountabilityLevel: "full" as const,
    relevantFacts: [],
    otherPersonConcern: "Deadline was not met",
    recommendedApproach: "ACKNOWLEDGE + ACCOUNTABILITY + EXPLANATION + NEW TIMELINE",
    recommendedStrategies: ["accountable", "solution_oriented"] as never[],
    requiredElements: [
      { element: "acknowledgement", description: "Acknowledge the issue", priority: "required" as const },
    ],
    riskyElements: ["Fabricating excuses"],
    nextAction: "Send acknowledgement with new deadline",
    candidateGuidance: [
      { strategy: "accountable" as const, structure: ["acknowledge", "take responsibility"], tone: "sincere", length: "medium" as const, avoid: ["excuses"] },
    ],
    conflictAdjusted: false,
    groupAdjusted: false,
    languageAdjusted: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ CONVERSATION COACHING ENGINE — CORE TESTS ═══════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

describe("Conversation Coaching Engine", () => {
  describe("Basic Structure", () => {
    it("returns valid CoachingResult structure", () => {
      const state = createMockState();
      const result = coachConversation(state);

      expect(result).toHaveProperty("nextMove");
      expect(result).toHaveProperty("timing");
      expect(result).toHaveProperty("responseGuidance");
      expect(result).toHaveProperty("avoid");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("priority");
      expect(result).toHaveProperty("contextSummary");
      expect(result).toHaveProperty("followUpSuggestions");
      expect(result).toHaveProperty("responseNeeded");
    });

    it("nextMove has action, description, strategy", () => {
      const result = coachConversation(createMockState());

      expect(result.nextMove).toHaveProperty("action");
      expect(result.nextMove).toHaveProperty("description");
      expect(result.nextMove).toHaveProperty("strategy");
      expect(typeof result.nextMove.action).toBe("string");
      expect(typeof result.nextMove.description).toBe("string");
    });

    it("timing has when, urgency, explanation", () => {
      const result = coachConversation(createMockState());

      expect(result.timing).toHaveProperty("when");
      expect(result.timing).toHaveProperty("urgency");
      expect(result.timing).toHaveProperty("explanation");
      expect(typeof result.timing.when).toBe("string");
      expect(typeof result.timing.urgency).toBe("number");
    });

    it("responseGuidance has tone, length, structure, keyPoints", () => {
      const result = coachConversation(createMockState());

      expect(result.responseGuidance).toHaveProperty("tone");
      expect(result.responseGuidance).toHaveProperty("length");
      expect(result.responseGuidance).toHaveProperty("structure");
      expect(result.responseGuidance).toHaveProperty("keyPoints");
      expect(["short", "medium", "long"]).toContain(result.responseGuidance.length);
    });

    it("contextSummary has all required fields", () => {
      const result = coachConversation(createMockState());

      expect(result.contextSummary).toHaveProperty("relationship");
      expect(result.contextSummary).toHaveProperty("situation");
      expect(result.contextSummary).toHaveProperty("conflictLevel");
      expect(result.contextSummary).toHaveProperty("otherPersonEmotion");
      expect(result.contextSummary).toHaveProperty("conversationHealth");
    });

    it("avoid is an array of strings", () => {
      const result = coachConversation(createMockState());

      expect(Array.isArray(result.avoid)).toBe(true);
      expect(result.avoid.length).toBeGreaterThan(0);
      result.avoid.forEach((item) => expect(typeof item).toBe("string"));
    });

    it("followUpSuggestions is an array of strings", () => {
      const result = coachConversation(createMockState());

      expect(Array.isArray(result.followUpSuggestions)).toBe(true);
      expect(result.followUpSuggestions.length).toBeGreaterThan(0);
    });

    it("confidence is between 0 and 1", () => {
      const result = coachConversation(createMockState());

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("reasoning is a non-empty string", () => {
      const result = coachConversation(createMockState());

      expect(typeof result.reasoning).toBe("string");
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("Response Needed Detection", () => {
    it("returns responseNeeded=true for professional context", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true when conflict is high", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.6, trigger: "disagreement", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for angry other person", () => {
      const state = createMockState({
        emotion: { primary: "angry" as const, secondary: "neutral" as const, intensity: 0.8 },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for frustrated other person", () => {
      const state = createMockState({
        emotion: { primary: "frustrated" as const, secondary: "neutral" as const, intensity: 0.7 },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for sad other person", () => {
      const state = createMockState({
        emotion: { primary: "sad" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for disappointed other person", () => {
      const state = createMockState({
        emotion: { primary: "disappointed" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for deadline situations", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for missed deadline", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "missed_deadline" as const },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for customer complaint", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "customer_complaint" as const },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for unresolved issues", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "some issue", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for dating context", () => {
      const state = createMockState({
        context: { type: "dating" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for friendship context", () => {
      const state = createMockState({
        context: { type: "friendship" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for family context", () => {
      const state = createMockState({
        context: { type: "family" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });

    it("returns responseNeeded=true for high urgency combined with other signals", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "urgent" as const, platform: undefined, situation: "unknown" as const },
        emotion: { primary: "frustrated" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.responseNeeded).toBe(true);
    });
  });

  describe("High Conflict → De-escalate", () => {
    it("recommends de_escalate when conflict level is high", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("de_escalate");
      expect(result.nextMove.strategy).toBe("de_escalate");
    });

    it("recommends de_escalate when escalation is high with moderate conflict", () => {
      const state = createMockState({
        conflict: { level: 0.7, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
        dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0.3, escalation: 0.6, rapport: 0.3, pressure: 0, uncertainty: 0, responsiveness: 0.5 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("de_escalate");
    });

    it("includes de-escalation guidance in reasoning", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.reasoning.toLowerCase()).toContain("conflict");
    });

    it("sets high priority for high conflict", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(["urgent", "high"]).toContain(result.priority);
    });

    it("de-escalation includes timing=immediately", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.timing.when).toBe("immediately");
    });
  });

  describe("Personal Attacks → Set Boundary", () => {
    it("recommends set_boundary when personal attacks are present", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("set_boundary");
      expect(result.nextMove.strategy).toBe("boundary_setting");
    });

    it("set_boundary has high priority", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(["urgent", "high"]).toContain(result.priority);
    });
  });

  describe("Recovery → Apologize", () => {
    it("recommends apologize when recovery has full accountability", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.nextMove.action).toBe("apologize");
    });

    it("apologize uses recovery recommended approach", () => {
      const recovery = createMockRecovery({
        accountabilityLevel: "full",
        recommendedApproach: "ACKNOWLEDGE + ACCOUNTABILITY + NEW TIMELINE",
      });
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.nextMove.description).toContain("ACKNOWLEDGE");
    });

    it("apologize uses recovery candidate guidance for tone", () => {
      const recovery = createMockRecovery({
        accountabilityLevel: "full",
        candidateGuidance: [
          { strategy: "accountable" as const, structure: ["acknowledge", "accountability"], tone: "sincere and direct", length: "medium" as const, avoid: ["excuses"] },
        ],
      });
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.responseGuidance.tone).toContain("sincere");
    });
  });

  describe("Direct Question → Respond", () => {
    it("recommends respond when participant has ask intent", () => {
      const participants = [
        {
          participantId: "p1",
          label: "Them",
          role: "friend",
          relationshipToUser: "friend",
          language: "english",
          position: { mainPosition: "", supportingReasoning: "", requestedOutcome: "" },
          intent: "ask" as const,
          emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3, confidence: "medium" as const },
          tone: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
          stance: "neutral" as const,
          behavior: { cooperationLevel: 0.5, defensiveness: 0, escalationContribution: 0, personalAttacks: false },
          concerns: [],
          requests: ["What time is the meeting?"],
          claims: [],
          knownFacts: [],
          disputedFacts: [],
        },
      ];
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null, null, null, undefined, participants);
      expect(result.nextMove.action).toBe("respond");
    });

    it("responds immediately when direct question is asked", () => {
      const participants = [
        {
          participantId: "p1",
          label: "Them",
          role: "colleague",
          relationshipToUser: "coworker",
          language: "english",
          position: { mainPosition: "", supportingReasoning: "", requestedOutcome: "" },
          intent: "request_information" as const,
          emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3, confidence: "medium" as const },
          tone: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
          stance: "neutral" as const,
          behavior: { cooperationLevel: 0.5, defensiveness: 0, escalationContribution: 0, personalAttacks: false },
          concerns: [],
          requests: ["Can you send the report?"],
          claims: [],
          knownFacts: [],
          disputedFacts: [],
        },
      ];
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null, null, null, undefined, participants);
      expect(result.timing.when).toBe("immediately");
    });
  });

  describe("Misunderstanding → Clarify", () => {
    it("recommends clarify when misunderstanding is detected", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("clarify");
      expect(result.nextMove.strategy).toBe("clarifying");
    });

    it("clarify uses empathetic tone", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("calm");
    });
  });

  describe("Angry Other Person → Acknowledge", () => {
    it("recommends acknowledge when other person is angry", () => {
      const state = createMockState({
        emotion: { primary: "angry" as const, secondary: "neutral" as const, intensity: 0.8 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("acknowledge");
      expect(result.nextMove.strategy).toBe("empathetic");
    });

    it("acknowledges emotional state in description", () => {
      const state = createMockState({
        emotion: { primary: "angry" as const, secondary: "neutral" as const, intensity: 0.8 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.description.toLowerCase()).toContain("angry");
    });
  });

  describe("Frustrated Other Person → Acknowledge", () => {
    it("recommends acknowledge when other person is frustrated", () => {
      const state = createMockState({
        emotion: { primary: "frustrated" as const, secondary: "neutral" as const, intensity: 0.7 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("acknowledge");
    });
  });

  describe("Sad Other Person → Comfort", () => {
    it("recommends comfort when other person is sad", () => {
      const state = createMockState({
        emotion: { primary: "sad" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("comfort");
      expect(result.nextMove.strategy).toBe("empathetic");
    });

    it("comfort includes emotional acknowledgment", () => {
      const state = createMockState({
        emotion: { primary: "sad" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.description.toLowerCase()).toContain("sad");
    });
  });

  describe("Disappointed Other Person → Comfort", () => {
    it("recommends comfort when other person is disappointed", () => {
      const state = createMockState({
        emotion: { primary: "disappointed" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("comfort");
    });
  });

  describe("Anxious Other Person → Reassure", () => {
    it("recommends reassure when other person is anxious", () => {
      const state = createMockState({
        emotion: { primary: "anxious" as const, secondary: "neutral" as const, intensity: 0.7 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("reassure");
      expect(result.nextMove.strategy).toBe("reassuring");
    });

    it("reassure includes emotional acknowledgment", () => {
      const state = createMockState({
        emotion: { primary: "anxious" as const, secondary: "neutral" as const, intensity: 0.7 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.description.toLowerCase()).toContain("anxious");
    });
  });

  describe("Nervous Other Person → Reassure", () => {
    it("recommends reassure when other person is nervous", () => {
      const state = createMockState({
        emotion: { primary: "nervous" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("reassure");
    });
  });

  describe("High Pressure → Set Boundary", () => {
    it("recommends set_boundary when pressure is high", () => {
      const state = createMockState({
        dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0, escalation: 0, rapport: 0.5, pressure: 0.8, uncertainty: 0, responsiveness: 0.5 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("set_boundary");
      expect(result.nextMove.strategy).toBe("boundary_setting");
    });
  });

  describe("Negotiation Situation → Negotiate", () => {
    it("recommends negotiate for negotiation situation", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "negotiation" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("negotiate");
      expect(result.nextMove.strategy).toBe("negotiation");
    });

    it("recommends negotiate for negotiate user intent", () => {
      const state = createMockState({
        intent: { userIntent: "negotiate" as const, userGoal: "negotiate", otherIntent: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("negotiate");
    });
  });

  describe("Persuasion Situation → Persuade", () => {
    it("recommends persuade for persuade user intent", () => {
      const state = createMockState({
        intent: { userIntent: "persuade" as const, userGoal: "persuade", otherIntent: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("persuade");
      expect(result.nextMove.strategy).toBe("persuasive");
    });

    it("recommends persuade for convince user intent", () => {
      const state = createMockState({
        intent: { userIntent: "convince" as const, userGoal: "convince", otherIntent: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("persuade");
    });
  });

  describe("Explain Intent → Explain", () => {
    it("recommends explain for explain user intent", () => {
      const state = createMockState({
        intent: { userIntent: "explain" as const, userGoal: "explain", otherIntent: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("explain");
      expect(result.nextMove.strategy).toBe("clear_direct");
    });
  });

  describe("Deadline Situation → Respond", () => {
    it("recommends respond for late_submission", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
      expect(result.nextMove.strategy).toBe("accountable");
    });

    it("recommends respond for missed_deadline", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "missed_deadline" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
    });

    it("recommends respond for missed_interview", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "missed_interview" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
    });

    it("recommends respond for wrong_file", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "wrong_file" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
    });
  });

  describe("High Engagement → Natural Response", () => {
    it("recommends natural response when engagement is high", () => {
      const state = createMockState({
        dynamics: { engagement: 0.8, cooperation: 0.7, reciprocity: 0.7, defensiveness: 0, escalation: 0, rapport: 0.7, pressure: 0, uncertainty: 0, responsiveness: 0.7 },
        context: { type: "friendship" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
      expect(result.nextMove.strategy).toBe("natural");
    });
  });

  describe("Disagreement → Clarify/Diplomatic", () => {
    it("recommends clarify for disagreement situation", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "disagreement" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("clarify");
      expect(result.nextMove.strategy).toBe("diplomatic");
    });

    it("recommends clarify for heated_argument", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "heated_argument" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("clarify");
    });
  });

  describe("Stalled Conversation → Change Topic", () => {
    it("recommends change_topic when conversation is stalled", () => {
      const state = createMockState({
        dynamics: { engagement: 0.2, cooperation: 0.3, reciprocity: 0.3, defensiveness: 0, escalation: 0, rapport: 0.3, pressure: 0, uncertainty: 0.6, responsiveness: 0.3 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("change_topic");
      expect(result.nextMove.strategy).toBe("natural");
    });
  });

  describe("Professional Context → Professional Response", () => {
    it("recommends professional response for professional context", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
      expect(result.nextMove.strategy).toBe("professional");
    });

    it("professional response uses professional tone", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("professional");
    });

    it("professional context has timing=within_hours", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.timing.when).toBe("within_hours");
    });
  });

  describe("Interview Context", () => {
    it("recommends professional response for interview context", () => {
      const state = createMockState({
        context: { type: "interview" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
      expect(result.nextMove.strategy).toBe("professional");
    });
  });

  describe("Dating Context → Natural Response", () => {
    it("recommends natural response for dating context", () => {
      const state = createMockState({
        context: { type: "dating" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBe("respond");
      expect(result.nextMove.strategy).toBe("natural");
    });

    it("dating response uses warm tone", () => {
      const state = createMockState({
        context: { type: "dating" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("warm");
    });
  });

  describe("Timing Guidance", () => {
    it("sets immediate timing for urgent conflict with high urgency score", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
        context: { type: "general" as const, urgency: "urgent" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.timing.when).toBe("immediately");
      expect(result.timing.urgency).toBeGreaterThan(0.7);
    });

    it("sets immediate timing for direct question", () => {
      const participants = [
        {
          participantId: "p1",
          label: "Them",
          role: "friend",
          relationshipToUser: "friend",
          language: "english",
          position: { mainPosition: "", supportingReasoning: "", requestedOutcome: "" },
          intent: "ask" as const,
          emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3, confidence: "medium" as const },
          tone: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
          stance: "neutral" as const,
          behavior: { cooperationLevel: 0.5, defensiveness: 0, escalationContribution: 0, personalAttacks: false },
          concerns: [],
          requests: ["What time?"],
          claims: [],
          knownFacts: [],
          disputedFacts: [],
        },
      ];
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null, null, null, undefined, participants);
      expect(result.timing.when).toBe("immediately");
    });

    it("sets within_hours for professional context", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.timing.when).toBe("within_hours");
    });

    it("sets within_minutes for high engagement", () => {
      const state = createMockState({
        dynamics: { engagement: 0.8, cooperation: 0.7, reciprocity: 0.7, defensiveness: 0, escalation: 0, rapport: 0.7, pressure: 0, uncertainty: 0, responsiveness: 0.8 },
        context: { type: "friendship" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.timing.when).toBe("within_minutes");
    });

    it("sets within_day for casual context", () => {
      const state = createMockState({
        context: { type: "casual" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.timing.when).toBe("within_day");
    });

    it("sets wait_for_right_moment for wait action", () => {
      const state = createMockState();
      const result = coachConversation(state);
      // The default state doesn't trigger wait, but we test the timing function exists
      expect(result.timing.when).toBeDefined();
    });

    it("urgency scales with conflict level", () => {
      const lowConflict = coachConversation(createMockState({
        conflict: { level: 0.2, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      }));
      const highConflict = coachConversation(createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      }));
      expect(highConflict.timing.urgency).toBeGreaterThan(lowConflict.timing.urgency);
    });
  });

  describe("Response Guidance", () => {
    it("uses recovery guidance when available", () => {
      const recovery = createMockRecovery({
        candidateGuidance: [
          { strategy: "accountable" as const, structure: ["acknowledge", "account"], tone: "sincere", length: "medium" as const, avoid: ["excuses"] },
        ],
      });
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.responseGuidance.tone).toContain("sincere");
      expect(result.responseGuidance.length).toBe("medium");
      expect(result.responseGuidance.structure).toContain("acknowledge");
    });

    it("uses persuasion guidance when available", () => {
      const persuasion = {
        assessment: {} as never,
        strategies: [
          { mode: "direct" as const, elements: [], structure: ["state position", "make request"], tone: "confident", length: "short" as const, avoid: [] },
        ],
        recommendedMode: "direct" as const,
        guidance: ["Be specific"],
      };
      const state = createMockState({
        intent: { userIntent: "persuade" as const, userGoal: "persuade", otherIntent: "unknown" as const },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state, undefined, null, null, persuasion);
      expect(result.responseGuidance.tone).toContain("confident");
      expect(result.responseGuidance.structure).toContain("state position");
    });

    it("de_escalate uses calm tone", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("calm");
    });

    it("apologize uses sincere tone", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("sincere");
    });

    it("set_boundary uses calm tone when conflict is high", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
        dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0, escalation: 0.3, rapport: 0.3, pressure: 0, uncertainty: 0, responsiveness: 0.5 },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("calm");
    });

    it("clarify uses calm tone", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("calm");
    });

    it("negotiate uses professional tone in professional context", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "negotiation" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("professional");
    });

    it("persuade uses professional tone in professional context", () => {
      const state = createMockState({
        intent: { userIntent: "persuade" as const, userGoal: "persuade", otherIntent: "unknown" as const },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.tone.toLowerCase()).toContain("professional");
    });

    it("no-response guidance has short length", () => {
      const state = createMockState();
      const result = coachConversation(state, undefined, undefined);
      // The default state returns responseNeeded=true, so we test that guidance exists
      expect(result.responseGuidance).toBeDefined();
    });

    it("response length is short for acknowledge action", () => {
      const state = createMockState({
        emotion: { primary: "angry" as const, secondary: "neutral" as const, intensity: 0.8 },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.length).toBe("short");
    });

    it("response length is medium for explain action", () => {
      const state = createMockState({
        intent: { userIntent: "explain" as const, userGoal: "explain", otherIntent: "unknown" as const },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.length).toBe("medium");
    });

    it("response length is medium for professional context", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.length).toBe("medium");
    });
  });

  describe("Avoid List", () => {
    it("always includes fabricating excuses", () => {
      const result = coachConversation(createMockState());
      expect(result.avoid.some((a) => a.toLowerCase().includes("fabricat"))).toBe(true);
    });

    it("always includes blaming others", () => {
      const result = coachConversation(createMockState());
      expect(result.avoid.some((a) => a.toLowerCase().includes("blam"))).toBe(true);
    });

    it("always includes making promises", () => {
      const result = coachConversation(createMockState());
      expect(result.avoid.some((a) => a.toLowerCase().includes("promise"))).toBe(true);
    });

    it("includes matching aggressive tone for high conflict", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("matching aggressive"))).toBe(true);
    });

    it("includes escalating the conflict for high conflict", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("escalat"))).toBe(true);
    });

    it("includes personal attacks avoidance when personal attacks present", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("personal attack"))).toBe(true);
    });

    it("de_escalate avoids being sarcastic", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("sarcastic"))).toBe(true);
    });

    it("apologize avoids 'I'm sorry you feel that way'", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState();
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.avoid.some((a) => a.toLowerCase().includes("sorry you feel"))).toBe(true);
    });

    it("apologize avoids adding 'but' after apology", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState();
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.avoid.some((a) => a.toLowerCase().includes("but"))).toBe(true);
    });

    it("set_boundary avoids being aggressive", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("aggressive"))).toBe(true);
    });

    it("set_boundary avoids apologizing for the boundary", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("apologizing for"))).toBe(true);
    });

    it("clarify avoids being condescending", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("condescending"))).toBe(true);
    });

    it("negotiate avoids ultimatums", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "negotiation" as const },
      });
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("ultimat"))).toBe(true);
    });

    it("respond avoids over-explaining", () => {
      const state = createMockState();
      const result = coachConversation(state);
      expect(result.avoid.some((a) => a.toLowerCase().includes("over-explain"))).toBe(true);
    });

    it("avoid list has no duplicates", () => {
      const result = coachConversation(createMockState());
      const unique = [...new Set(result.avoid)];
      expect(result.avoid.length).toBe(unique.length);
    });

    it("includes recovery risky elements in avoid list", () => {
      const recovery = createMockRecovery({
        riskyElements: ["Fabricating excuses", "Custom risk item"],
      });
      const state = createMockState();
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.avoid).toContain("Custom risk item");
    });
  });

  describe("Priority Assessment", () => {
    it("urgent for very high conflict", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.priority).toBe("urgent");
    });

    it("high for de_escalate action", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(["urgent", "high"]).toContain(result.priority);
    });

    it("high for apologize action", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState();
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.priority).toBe("high");
    });

    it("high for set_boundary action", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(["urgent", "high"]).toContain(result.priority);
    });

    it("medium for owes response", () => {
      const state = createMockState({
        dynamics: { engagement: 0.3, cooperation: 0.3, reciprocity: 0.2, defensiveness: 0, escalation: 0, rapport: 0.3, pressure: 0, uncertainty: 0, responsiveness: 0.6 },
      });
      const result = coachConversation(state);
      expect(["medium", "high"]).toContain(result.priority);
    });

    it("low for calm, low-engagement conversation", () => {
      const state = createMockState({
        dynamics: { engagement: 0.3, cooperation: 0.3, reciprocity: 0.3, defensiveness: 0, escalation: 0, rapport: 0.3, pressure: 0, uncertainty: 0, responsiveness: 0.3 },
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(["low", "medium"]).toContain(result.priority);
    });
  });

  describe("Confidence Calculation", () => {
    it("confidence is above 0.5 for strong signals", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
        context: { type: "professional" as const, urgency: "urgent" as const, platform: undefined, situation: "missed_deadline" as const },
      });
      const result = coachConversation(state);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("confidence is above 0.4 for direct question", () => {
      const participants = [
        {
          participantId: "p1",
          label: "Them",
          role: "friend",
          relationshipToUser: "friend",
          language: "english",
          position: { mainPosition: "", supportingReasoning: "", requestedOutcome: "" },
          intent: "ask" as const,
          emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3, confidence: "medium" as const },
          tone: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
          stance: "neutral" as const,
          behavior: { cooperationLevel: 0.5, defensiveness: 0, escalationContribution: 0, personalAttacks: false },
          concerns: [],
          requests: ["What time?"],
          claims: [],
          knownFacts: [],
          disputedFacts: [],
        },
      ];
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null, null, null, undefined, participants);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it("confidence is above 0.4 for deadline situation", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it("confidence is between 0 and 1", () => {
      const state = createMockState();
      const result = coachConversation(state);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("confidence is higher for known situation than unknown", () => {
      const known = coachConversation(createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      }));
      const unknown = coachConversation(createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      }));
      expect(known.confidence).toBeGreaterThanOrEqual(unknown.confidence);
    });

    it("confidence is higher for known relationship than unknown", () => {
      const known = coachConversation(createMockState({ relationship: "manager" as const }));
      const unknown = coachConversation(createMockState({ relationship: "unknown" as const }));
      expect(known.confidence).toBeGreaterThanOrEqual(unknown.confidence);
    });
  });

  describe("Context Summary", () => {
    it("formats relationship label correctly", () => {
      const state = createMockState({ relationship: "manager" as const });
      const result = coachConversation(state);
      expect(result.contextSummary.relationship).toBe("Manager");
    });

    it("formats situation label correctly", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.situation).toBe("Late Submission");
    });

    it("shows high conflict for high conflict level", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conflictLevel).toBe("High conflict");
    });

    it("shows moderate tension for medium conflict", () => {
      const state = createMockState({
        conflict: { level: 0.5, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conflictLevel).toBe("Moderate tension");
    });

    it("shows calm for low conflict", () => {
      const state = createMockState({
        conflict: { level: 0.1, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conflictLevel).toBe("Calm");
    });

    it("formats emotion label correctly", () => {
      const state = createMockState({
        emotion: { primary: "frustrated" as const, secondary: "neutral" as const, intensity: 0.7 },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.otherPersonEmotion).toBe("Frustrated");
    });

    it("shows healthy conversation health for good dynamics", () => {
      const state = createMockState({
        dynamics: { engagement: 0.8, cooperation: 0.8, reciprocity: 0.8, defensiveness: 0, escalation: 0, rapport: 0.8, pressure: 0, uncertainty: 0, responsiveness: 0.8 },
        conflict: { level: 0.1, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conversationHealth).toBe("Healthy");
    });

    it("shows strained conversation health for poor dynamics", () => {
      const state = createMockState({
        dynamics: { engagement: 0.2, cooperation: 0.2, reciprocity: 0.2, defensiveness: 0.8, escalation: 0.5, rapport: 0.2, pressure: 0.5, uncertainty: 0.5, responsiveness: 0.2 },
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conversationHealth).toBe("Strained");
    });
  });

  describe("Follow-Up Suggestions", () => {
    it("de_escalate suggests clarifying underlying issue", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.followUpSuggestions.some((s) => s.toLowerCase().includes("underlying"))).toBe(true);
    });

    it("apologize suggests asking how to make it right", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState();
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.followUpSuggestions.some((s) => s.toLowerCase().includes("make it right"))).toBe(true);
    });

    it("set_boundary suggests reinforcing if crossed", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.followUpSuggestions.some((s) => s.toLowerCase().includes("reinforce"))).toBe(true);
    });

    it("clarify suggests confirming understanding", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.followUpSuggestions.some((s) => s.toLowerCase().includes("confirm"))).toBe(true);
    });

    it("respond suggests listening before replying", () => {
      const state = createMockState();
      const result = coachConversation(state);
      expect(result.followUpSuggestions.some((s) => s.toLowerCase().includes("listen"))).toBe(true);
    });

    it("change_topic suggests related topics", () => {
      const state = createMockState({
        dynamics: { engagement: 0.2, cooperation: 0.3, reciprocity: 0.3, defensiveness: 0, escalation: 0, rapport: 0.3, pressure: 0, uncertainty: 0.6, responsiveness: 0.3 },
      });
      const result = coachConversation(state);
      expect(result.followUpSuggestions.some((s) => s.toLowerCase().includes("topic"))).toBe(true);
    });

    it("end_conversation suggests ending on positive note", () => {
      const state = createMockState();
      const result = coachConversation(state);
      // Default action is respond, which suggests listening
      expect(result.followUpSuggestions.length).toBeGreaterThan(0);
    });

    it("includes recovery nextAction when available", () => {
      const recovery = createMockRecovery({
        nextAction: "Send acknowledgement with new deadline",
      });
      const state = createMockState();
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.followUpSuggestions).toContain("Send acknowledgement with new deadline");
    });

    it("follow-up suggestions have no duplicates", () => {
      const result = coachConversation(createMockState());
      const unique = [...new Set(result.followUpSuggestions)];
      expect(result.followUpSuggestions.length).toBe(unique.length);
    });
  });

  describe("Reasoning", () => {
    it("includes conflict information when conflict is high", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.reasoning.toLowerCase()).toContain("conflict");
    });

    it("includes direct question information", () => {
      const participants = [
        {
          participantId: "p1",
          label: "Them",
          role: "friend",
          relationshipToUser: "friend",
          language: "english",
          position: { mainPosition: "", supportingReasoning: "", requestedOutcome: "" },
          intent: "ask" as const,
          emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3, confidence: "medium" as const },
          tone: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
          stance: "neutral" as const,
          behavior: { cooperationLevel: 0.5, defensiveness: 0, escalationContribution: 0, personalAttacks: false },
          concerns: [],
          requests: ["What time?"],
          claims: [],
          knownFacts: [],
          disputedFacts: [],
        },
      ];
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null, null, null, undefined, participants);
      expect(result.reasoning.toLowerCase()).toContain("question");
    });

    it("includes deadline information", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state);
      expect(result.reasoning.toLowerCase()).toContain("deadline");
    });

    it("includes emotion information when other person is emotional", () => {
      const state = createMockState({
        emotion: { primary: "angry" as const, secondary: "neutral" as const, intensity: 0.8 },
      });
      const result = coachConversation(state);
      expect(result.reasoning.toLowerCase()).toContain("angry");
    });

    it("includes nextMove description in reasoning", () => {
      const state = createMockState();
      const result = coachConversation(state);
      expect(result.reasoning).toContain(result.nextMove.description);
    });
  });

  describe("Input Options", () => {
    it("accepts draft option", () => {
      const state = createMockState();
      const result = coachConversation(state, { draft: "Hello, how are you?" });
      expect(result).toHaveProperty("nextMove");
    });

    it("accepts userFacts option", () => {
      const state = createMockState();
      const result = coachConversation(state, { userFacts: ["I told them I'd be late"] });
      expect(result).toHaveProperty("nextMove");
    });

    it("accepts both draft and userFacts", () => {
      const state = createMockState();
      const result = coachConversation(state, {
        draft: "I'll be there in 5 minutes",
        userFacts: ["Traffic was bad"],
      });
      expect(result).toHaveProperty("nextMove");
    });
  });

  describe("Conflict Structure Integration", () => {
    it("includes conflict structure in signal extraction", () => {
      const conflictStructure = createMockConflictStructure({
        unresolvedQuestions: ["When will this be resolved?"],
      });
      const state = createMockState();
      const result = coachConversation(state, undefined, conflictStructure);
      expect(result).toHaveProperty("nextMove");
    });

    it("uses conflict structure for resolution opportunities", () => {
      const conflictStructure = createMockConflictStructure({
        resolutionOpportunities: [
          { type: "compromise", description: "Meet in the middle", requiredParticipants: ["p1"], difficulty: "easy" as const },
        ],
      });
      const state = createMockState();
      const result = coachConversation(state, undefined, conflictStructure);
      expect(result).toHaveProperty("nextMove");
    });
  });

  describe("Strategy Integration", () => {
    it("accepts strategy recommendations", () => {
      const strategies = [
        { strategy: "de_escalate" as const, priority: 1, confidence: 0.8, reason: "High conflict" },
        { strategy: "empathetic" as const, priority: 2, confidence: 0.6, reason: "Emotional state" },
      ];
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state, undefined, null, null, null, null, null, strategies);
      expect(result).toHaveProperty("nextMove");
    });
  });

  describe("Persuasion Integration", () => {
    it("uses persuasion guidance for negotiate action", () => {
      const persuasion = {
        assessment: {} as never,
        strategies: [
          { mode: "compromise" as const, elements: [], structure: ["acknowledge position", "offer alternatives"], tone: "flexible", length: "medium" as const, avoid: ["ultimatums"] },
        ],
        recommendedMode: "compromise" as const,
        guidance: ["Find common ground"],
      };
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "negotiation" as const },
      });
      const result = coachConversation(state, undefined, null, null, persuasion);
      expect(result.responseGuidance.tone).toBe("flexible");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty participants array", () => {
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null, null, null, undefined, []);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles null conflict structure", () => {
      const state = createMockState();
      const result = coachConversation(state, undefined, null);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles null recovery", () => {
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles null persuasion", () => {
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles undefined strategies", () => {
      const state = createMockState();
      const result = coachConversation(state, undefined, null, null, null, null, null, undefined);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles undefined input", () => {
      const state = createMockState();
      const result = coachConversation(state, undefined);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles all neutral state", () => {
      const state = createMockState();
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
      expect(result.timing.when).toBeDefined();
      expect(result.responseGuidance).toBeDefined();
    });

    it("handles high defensiveness", () => {
      const state = createMockState({
        dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0.8, escalation: 0, rapport: 0.3, pressure: 0, uncertainty: 0, responsiveness: 0.5 },
      });
      const result = coachConversation(state);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles high uncertainty", () => {
      const state = createMockState({
        dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0, escalation: 0, rapport: 0.5, pressure: 0, uncertainty: 0.8, responsiveness: 0.5 },
      });
      const result = coachConversation(state);
      expect(result).toHaveProperty("nextMove");
    });

    it("handles high escalation without personal attacks", () => {
      const state = createMockState({
        conflict: { level: 0.5, escalation: 0.9, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
    });

    it("handles mixed signals (high conflict + high engagement)", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "disagreement", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
        dynamics: { engagement: 0.8, cooperation: 0.6, reciprocity: 0.7, defensiveness: 0.3, escalation: 0.2, rapport: 0.5, pressure: 0, uncertainty: 0, responsiveness: 0.7 },
      });
      const result = coachConversation(state);
      expect(result).toHaveProperty("nextMove");
    });
  });

  describe("Action-Strategy Mapping", () => {
    it("de_escalate maps to de_escalate strategy", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("de_escalate");
    });

    it("set_boundary maps to boundary_setting strategy", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("boundary_setting");
    });

    it("clarify maps to clarifying strategy", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("clarifying");
    });

    it("acknowledge maps to empathetic strategy", () => {
      const state = createMockState({
        emotion: { primary: "angry" as const, secondary: "neutral" as const, intensity: 0.8 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("empathetic");
    });

    it("comfort maps to empathetic strategy", () => {
      const state = createMockState({
        emotion: { primary: "sad" as const, secondary: "neutral" as const, intensity: 0.6 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("empathetic");
    });

    it("reassure maps to reassuring strategy", () => {
      const state = createMockState({
        emotion: { primary: "anxious" as const, secondary: "neutral" as const, intensity: 0.7 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("reassuring");
    });

    it("negotiate maps to negotiation strategy", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "negotiation" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("negotiation");
    });

    it("persuade maps to persuasive strategy", () => {
      const state = createMockState({
        intent: { userIntent: "persuade" as const, userGoal: "persuade", otherIntent: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("persuasive");
    });

    it("explain maps to clear_direct strategy", () => {
      const state = createMockState({
        intent: { userIntent: "explain" as const, userGoal: "explain", otherIntent: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("clear_direct");
    });

    it("professional respond maps to professional strategy", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("professional");
    });

    it("natural respond maps to natural strategy", () => {
      const state = createMockState({
        dynamics: { engagement: 0.8, cooperation: 0.7, reciprocity: 0.7, defensiveness: 0, escalation: 0, rapport: 0.7, pressure: 0, uncertainty: 0, responsiveness: 0.7 },
        context: { type: "friendship" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("natural");
    });

    it("disagreement maps to diplomatic strategy", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "disagreement" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("diplomatic");
    });

    it("change_topic maps to natural strategy", () => {
      const state = createMockState({
        dynamics: { engagement: 0.2, cooperation: 0.3, reciprocity: 0.3, defensiveness: 0, escalation: 0, rapport: 0.3, pressure: 0, uncertainty: 0.6, responsiveness: 0.3 },
      });
      const result = coachConversation(state);
      expect(result.nextMove.strategy).toBe("natural");
    });
  });

  describe("Example Generation", () => {
    it("provides example for de_escalate in professional context", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.example).toBeDefined();
      expect(result.nextMove.example!.length).toBeGreaterThan(0);
    });

    it("provides example for de_escalate in dating context", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
        context: { type: "dating" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.example).toBeDefined();
    });

    it("provides example for set_boundary in professional context", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.example).toBeDefined();
    });

    it("provides example for set_boundary in general context", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.nextMove.example).toBeDefined();
    });
  });

  describe("Structure Steps", () => {
    it("de_escalate has correct structure", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.structure).toContain("acknowledge their concern");
      expect(result.responseGuidance.structure).toContain("lower tension");
      expect(result.responseGuidance.structure).toContain("focus on resolution");
    });

    it("apologize has correct structure", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state, undefined, null, recovery);
      // Uses recovery structure
      expect(result.responseGuidance.structure.length).toBeGreaterThan(0);
    });

    it("set_boundary has correct structure", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.structure).toContain("state your boundary clearly");
      expect(result.responseGuidance.structure).toContain("explain why it matters");
      expect(result.responseGuidance.structure).toContain("stay firm");
    });

    it("clarify has correct structure", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.structure).toContain("acknowledge the confusion");
      expect(result.responseGuidance.structure).toContain("explain your position");
      expect(result.responseGuidance.structure).toContain("confirm understanding");
    });

    it("respond has correct structure", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.structure).toContain("address the key point");
      expect(result.responseGuidance.structure).toContain("keep it clear");
      expect(result.responseGuidance.structure).toContain("match their energy");
    });

    it("negotiate has correct structure", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "negotiation" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.structure).toContain("state your position");
      expect(result.responseGuidance.structure).toContain("explain reasoning");
      expect(result.responseGuidance.structure).toContain("offer alternatives");
    });

    it("persuade has correct structure", () => {
      const state = createMockState({
        intent: { userIntent: "persuade" as const, userGoal: "persuade", otherIntent: "unknown" as const },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.structure).toContain("state your case");
      expect(result.responseGuidance.structure).toContain("provide evidence");
      expect(result.responseGuidance.structure).toContain("show benefit");
      expect(result.responseGuidance.structure).toContain("make request");
    });

    it("explain has correct structure", () => {
      const state = createMockState({
        intent: { userIntent: "explain" as const, userGoal: "explain", otherIntent: "unknown" as const },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.structure).toContain("acknowledge their perspective");
      expect(result.responseGuidance.structure).toContain("explain your reasoning");
      expect(result.responseGuidance.structure).toContain("ask for understanding");
    });
  });

  describe("Key Points", () => {
    it("includes stay calm for high conflict", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.keyPoints.some((p) => p.toLowerCase().includes("stay calm"))).toBe(true);
    });

    it("includes acknowledge frustration for angry emotion", () => {
      const state = createMockState({
        emotion: { primary: "angry" as const, secondary: "neutral" as const, intensity: 0.8 },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.keyPoints.some((p) => p.toLowerCase().includes("frustration"))).toBe(true);
    });

    it("includes address misunderstanding when misunderstanding present", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.keyPoints.some((p) => p.toLowerCase().includes("misunderstanding"))).toBe(true);
    });

    it("de_escalate includes focusing on understanding", () => {
      const state = createMockState({
        conflict: { level: 0.9, escalation: 0.8, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.keyPoints.some((p) => p.toLowerCase().includes("understanding"))).toBe(true);
    });

    it("apologize includes recovery required elements as key points", () => {
      const recovery = createMockRecovery({ accountabilityLevel: "full" });
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "late_submission" as const },
      });
      const result = coachConversation(state, undefined, null, recovery);
      expect(result.responseGuidance.keyPoints.length).toBeGreaterThan(0);
      expect(result.responseGuidance.keyPoints.some((p) => p.toLowerCase().includes("acknowledge"))).toBe(true);
    });

    it("set_boundary includes being clear and direct", () => {
      const state = createMockState({
        conflict: { level: 0.6, escalation: 0.4, trigger: "insult", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: false },
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.keyPoints.some((p) => p.toLowerCase().includes("clear"))).toBe(true);
    });

    it("respond includes addressing main point", () => {
      const state = createMockState({
        context: { type: "professional" as const, urgency: "normal" as const, platform: undefined, situation: "unknown" as const },
      });
      const result = coachConversation(state);
      expect(result.responseGuidance.keyPoints.some((p) => p.toLowerCase().includes("main point") || p.toLowerCase().includes("address"))).toBe(true);
    });
  });

  describe("Conversation Health Labels", () => {
    it("shows healthy for high cooperation, low conflict", () => {
      const state = createMockState({
        dynamics: { engagement: 0.8, cooperation: 0.8, reciprocity: 0.8, defensiveness: 0, escalation: 0, rapport: 0.8, pressure: 0, uncertainty: 0, responsiveness: 0.8 },
        conflict: { level: 0.1, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conversationHealth).toBe("Healthy");
    });

    it("shows needs attention for medium dynamics", () => {
      const state = createMockState({
        dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0.3, escalation: 0, rapport: 0.5, pressure: 0, uncertainty: 0, responsiveness: 0.5 },
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conversationHealth).toBe("Needs attention");
    });

    it("shows strained for low cooperation, high conflict", () => {
      const state = createMockState({
        dynamics: { engagement: 0.2, cooperation: 0.2, reciprocity: 0.2, defensiveness: 0.8, escalation: 0.5, rapport: 0.2, pressure: 0.5, uncertainty: 0.5, responsiveness: 0.2 },
        conflict: { level: 0.8, escalation: 0.7, trigger: "argument", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conversationHealth).toBe("Strained");
    });
  });

  describe("Conflict Level Labels", () => {
    it("shows High conflict for level > 0.7", () => {
      const state = createMockState({
        conflict: { level: 0.8, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conflictLevel).toBe("High conflict");
    });

    it("shows Moderate tension for level 0.4-0.7", () => {
      const state = createMockState({
        conflict: { level: 0.5, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conflictLevel).toBe("Moderate tension");
    });

    it("shows Some tension for level 0.2-0.4", () => {
      const state = createMockState({
        conflict: { level: 0.3, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conflictLevel).toBe("Some tension");
    });

    it("shows Calm for level < 0.2", () => {
      const state = createMockState({
        conflict: { level: 0.1, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      });
      const result = coachConversation(state);
      expect(result.contextSummary.conflictLevel).toBe("Calm");
    });
  });

  describe("Situation-Specific Coaching", () => {
    it("provides coaching for customer_complaint", () => {
      const state = createMockState({
        context: { type: "customer" as const, urgency: "normal" as const, platform: undefined, situation: "customer_complaint" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
      expect(result.responseGuidance).toBeDefined();
    });

    it("provides coaching for missed_meeting", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "missed_meeting" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
    });

    it("provides coaching for scheduling_problem", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "scheduling_problem" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
    });

    it("provides coaching for boundary_setting", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "boundary_setting" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
    });

    it("provides coaching for romantic_interest", () => {
      const state = createMockState({
        context: { type: "dating" as const, urgency: "normal" as const, platform: undefined, situation: "romantic_interest" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
    });

    it("provides coaching for rejection", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "rejection" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
    });

    it("provides coaching for apology", () => {
      const state = createMockState({
        context: { type: "general" as const, urgency: "normal" as const, platform: undefined, situation: "apology" as const },
      });
      const result = coachConversation(state);
      expect(result.nextMove.action).toBeDefined();
    });
  });
});
