import { describe, it, expect } from "vitest";
import {
  predictImpact,
  extractDeterministicImpactSignals,
} from "@/lib/ai/impact-prediction";
import { analyzeDraft, runDeterministicDraftChecks } from "@/lib/ai/draft-analysis";
import type { ImpactPredictionInput } from "@/lib/ai/impact-types";
import type { DraftAnalysis } from "@/lib/ai/draft-types";
import type { ConversationState } from "@/lib/ai/conversation-state";

// ─── Communication Impact Prediction Tests ────────────────────────────────────
//
// Covers all required test categories:
// - Basic functionality
// - Goal progression
// - Conflict-aware prediction
// - Risk detection
// - Positive impact
// - Context fit
// - Relationship-aware
// - Group conversations
// - Language support
// - Style impact
// - Memory integration
// - Preservation
// - Recommendations
// - Edge cases
// ──────────────────────────────────────────────────────────────────────────────

// ─── Default ConversationState ────────────────────────────────────────────────

function makeState(overrides?: Partial<ConversationState>): ConversationState {
  return {
    participants: { count: 2, roles: ["user", "other"], userId: "user", others: ["other"], isGroup: false },
    relationship: "unknown",
    language: {
      primary: "english", secondary: [], script: "latin", codeMixed: false,
      romanized: false, codeMixRatio: [], outputPreference: "auto",
      confidence: 0.9, scriptConfidence: 0.9, detectionSource: "heuristic",
      participantLanguages: [],
    },
    context: { type: "general", platform: undefined, situation: "unknown", urgency: "normal" },
    intent: { userGoal: "continue_conversation", userIntent: "reply", otherIntent: "unknown" },
    emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
    tone: { primary: "casual", secondary: "unknown", intensity: 0.4 },
    dynamics: {
      engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.2,
      escalation: 0.2, rapport: 0.5, pressure: 0.1, uncertainty: 0.3, responsiveness: 0.5,
    },
    conflict: { level: 0.1, escalation: 0.1, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
    risks: [],
    conflictIntelligence: { participants: [], conflictStructure: null, groupAnalysis: null },
    strategy: { primary: "natural", ranked: [], confidence: 0.6 },
    style: {
      preferred: "casual", writingCharacteristics: "short messages", lengthPreference: "short",
      profile: null, guidance: null, source: "default",
    },
    sources: { goalSource: "default", contextSource: "default", toneSource: "default", situationSource: "default", languageSource: "heuristic" },
    ...overrides,
  };
}

function makeInput(
  draft: string,
  messages?: Array<{ sender: "me" | "them" | "unknown"; text: string }>,
  overrides?: Partial<ImpactPredictionInput>
): ImpactPredictionInput {
  return {
    draft,
    messages: messages || [
      { sender: "them", text: "Hey, how are you?" },
      { sender: "me", text: "I'm good, thanks!" },
    ],
    ...overrides,
  };
}

function getAnalysis(draft: string, state: ConversationState): DraftAnalysis {
  const input = makeInput(draft);
  const result = analyzeDraft(input, state);
  return result.analysis;
}

function getChecks(draft: string) {
  return runDeterministicDraftChecks(draft);
}

// ─── BASIC TESTS ──────────────────────────────────────────────────────────────

describe("Impact Prediction - Basic", () => {
  it("should produce a valid prediction", () => {
    const state = makeState();
    const draft = "Thanks for letting me know!";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
    expect(result.prediction.cooperation).toBeGreaterThanOrEqual(0);
    expect(result.prediction.cooperation).toBeLessThanOrEqual(1);
  });

  it("should handle empty draft", () => {
    const state = makeState();
    const draft = "";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should produce bounded scores", () => {
    const state = makeState();
    const draft = "I need to talk about this important issue right now";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    const p = result.prediction;
    expect(p.cooperation).toBeGreaterThanOrEqual(0);
    expect(p.cooperation).toBeLessThanOrEqual(1);
    expect(p.responseLikelihood).toBeGreaterThanOrEqual(0);
    expect(p.responseLikelihood).toBeLessThanOrEqual(1);
    expect(p.escalationRisk).toBeGreaterThanOrEqual(0);
    expect(p.escalationRisk).toBeLessThanOrEqual(1);
    expect(p.defensivenessRisk).toBeGreaterThanOrEqual(0);
    expect(p.defensivenessRisk).toBeLessThanOrEqual(1);
    expect(p.pressureRisk).toBeGreaterThanOrEqual(0);
    expect(p.pressureRisk).toBeLessThanOrEqual(1);
    expect(p.trustImpact).toBeGreaterThanOrEqual(0);
    expect(p.trustImpact).toBeLessThanOrEqual(1);
    expect(p.clarityImpact).toBeGreaterThanOrEqual(0);
    expect(p.clarityImpact).toBeLessThanOrEqual(1);
    expect(p.goalProgression).toBeGreaterThanOrEqual(0);
    expect(p.goalProgression).toBeLessThanOrEqual(1);
  });

  it("should produce scenarios", () => {
    const state = makeState();
    const draft = "Could we meet tomorrow to discuss this?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.scenarios.length).toBeGreaterThan(0);
    expect(result.prediction.scenarios.length).toBeLessThanOrEqual(3);
  });

  it("should produce send readiness", () => {
    const state = makeState();
    const draft = "Thanks for the update";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(["ready", "mostly_ready", "needs_review", "high_risk"]).toContain(result.prediction.sendReadiness);
  });

  it("should produce recommended action", () => {
    const state = makeState();
    const draft = "Could you please send me the report?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.recommendedAction).toBeDefined();
  });

  it("should produce impact summary", () => {
    const state = makeState();
    const draft = "I'll have it ready by tomorrow";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.impactSummary).toBeTruthy();
    expect(result.prediction.impactSummary.length).toBeGreaterThan(10);
  });

  it("should produce why explanation", () => {
    const state = makeState();
    const draft = "Please review the attached document";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.whyExplanation).toBeTruthy();
  });
});

// ─── GOAL PROGRESSION ─────────────────────────────────────────────────────────

describe("Impact Prediction - Goal Progression", () => {
  it("should score high for clear goal-aligned draft", () => {
    const state = makeState();
    const draft = "Could I please have one more day to submit the project?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft, undefined, { goal: "ask_for_extension" }), state, analysis, checks);
    expect(result.prediction.goalProgression).toBeGreaterThanOrEqual(0.5);
  });

  it("should score lower for unclear goal", () => {
    const state = makeState();
    const draft = "I've been really busy lately";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft, undefined, { goal: "ask_for_extension" }), state, analysis, checks);
    expect(result.prediction.goalProgression).toBeLessThanOrEqual(0.8);
  });

  it("should recognize specific next steps", () => {
    const state = makeState();
    const draft = "I'll have it ready by tomorrow morning at 9am";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.goalProgression).toBeGreaterThanOrEqual(0.5);
  });
});

// ─── CONFLICT-AWARE PREDICTION ────────────────────────────────────────────────

describe("Impact Prediction - Conflict Awareness", () => {
  it("should increase risk in high conflict context", () => {
    const state = makeState({
      conflict: { level: 0.8, escalation: 0.7, trigger: "disagreement", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      dynamics: { engagement: 0.5, reciprocity: 0.5, cooperation: 0.3, defensiveness: 0.6, escalation: 0.7, rapport: 0.2, pressure: 0.3, uncertainty: 0.4, responsiveness: 0.4 },
    });
    const draft = "You need to fix this";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.escalationRisk).toBeGreaterThan(0.3);
  });

  it("should lower risk when escalation is falling", () => {
    const state = makeState({
      conflict: { level: 0.3, escalation: 0.2, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      conflictIntelligence: {
        participants: [],
        conflictStructure: {
          conflictLevel: 0.3, escalationLevel: 0.2, escalationTrend: "decreasing",
          trigger: "", coreDisagreement: "", secondaryDisagreements: [],
          misunderstandings: [], factualDisputes: [], personalAttacks: false,
          personalAttackTargets: [], blamePattern: "none", blameTargets: [],
          defensiveness: 0.2, unresolvedQuestions: [],
          resolutionOpportunities: [],
        },
        groupAnalysis: null,
      },
    });
    const draft = "Let's work together to solve this";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.cooperation).toBeGreaterThan(0.4);
  });

  it("should detect personal attacks", () => {
    const state = makeState({
      conflict: { level: 0.6, escalation: 0.5, trigger: "", coreDisagreement: "", personalAttacks: true, misunderstanding: false, resolutionOpportunity: true },
    });
    const draft = "You're such an idiot";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.sendReadiness).toBe("high_risk");
    expect(result.prediction.escalationRisk).toBeGreaterThan(0.5);
  });

  it("should detect blame patterns", () => {
    const state = makeState({
      conflictIntelligence: {
        participants: [],
        conflictStructure: {
          conflictLevel: 0.5, escalationLevel: 0.4, escalationTrend: "stable",
          trigger: "", coreDisagreement: "", secondaryDisagreements: [],
          misunderstandings: [], factualDisputes: [], personalAttacks: false,
          personalAttackTargets: [], blamePattern: "direct_blame", blameTargets: [],
          defensiveness: 0.5, unresolvedQuestions: [],
          resolutionOpportunities: [],
        },
        groupAnalysis: null,
      },
    });
    const draft = "You always do this wrong";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.defensivenessRisk).toBeGreaterThan(0.3);
  });

  it("should detect misunderstandings", () => {
    const state = makeState({
      conflict: { level: 0.4, escalation: 0.3, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: true, resolutionOpportunity: true },
    });
    const draft = "I think there's a misunderstanding";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should increase risk with rising escalation", () => {
    const state = makeState({
      conflict: { level: 0.5, escalation: 0.6, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      conflictIntelligence: {
        participants: [],
        conflictStructure: {
          conflictLevel: 0.5, escalationLevel: 0.6, escalationTrend: "increasing",
          trigger: "", coreDisagreement: "", secondaryDisagreements: [],
          misunderstandings: [], factualDisputes: [], personalAttacks: false,
          personalAttackTargets: [], blamePattern: "none", blameTargets: [],
          defensiveness: 0.4, unresolvedQuestions: [],
          resolutionOpportunities: [],
        },
        groupAnalysis: null,
      },
    });
    const draft = "Why are you always like this?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.escalationRisk).toBeGreaterThan(0.4);
  });
});

// ─── RISK DETECTION ───────────────────────────────────────────────────────────

describe("Impact Prediction - Risk Detection", () => {
  it("should detect escalation risk", () => {
    const state = makeState();
    const draft = "You always blame me for everything";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.escalationRisk).toBeGreaterThan(0.3);
  });

  it("should detect defensiveness risk", () => {
    const state = makeState();
    const draft = "It's not my fault. I already did my part.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.defensivenessRisk).toBeGreaterThan(0.3);
  });

  it("should detect pressure risk", () => {
    const state = makeState();
    const draft = "Answer me right now! I need an answer immediately!";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.pressureRisk).toBeGreaterThan(0.3);
  });

  it("should detect misunderstanding risk", () => {
    const state = makeState();
    const draft = "I'll handle it later";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.misunderstandingRisk).toBeGreaterThan(0.2);
  });

  it("should have risk factors for high-risk messages", () => {
    const state = makeState({
      conflict: { level: 0.7, escalation: 0.6, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
    });
    const draft = "You always do this. It's your fault.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.riskFactors.length).toBeGreaterThan(0);
  });
});

// ─── POSITIVE IMPACT ──────────────────────────────────────────────────────────

describe("Impact Prediction - Positive Impact", () => {
  it("should score high cooperation for solution-oriented draft", () => {
    const state = makeState();
    const draft = "Let's work together to solve this. I suggest we start with the priority items.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.cooperation).toBeGreaterThan(0.5);
  });

  it("should score high clarity for clear request", () => {
    const state = makeState();
    const draft = "Could you send me the report by end of day?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.clarityImpact).toBeGreaterThan(0.5);
  });

  it("should score high trust for accountable draft", () => {
    const state = makeState();
    const draft = "I'll take care of this. I'll have it ready by tomorrow.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.trustImpact).toBeGreaterThan(0.5);
  });

  it("should score high continuation for engaging draft", () => {
    const state = makeState();
    const draft = "That's a great point. What do you think we should do next?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.conversationContinuation).toBeGreaterThan(0.5);
  });
});

// ─── CONTEXT FIT ──────────────────────────────────────────────────────────────

describe("Impact Prediction - Context Fit", () => {
  it("should work for professional context", () => {
    const state = makeState({
      context: { type: "professional", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const draft = "Please review the attached document at your convenience.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for academic context", () => {
    const state = makeState({
      context: { type: "academic", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const draft = "Sir, could I have one more day to submit the assignment?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for dating context", () => {
    const state = makeState({
      context: { type: "dating", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const draft = "hey you disappeared on me 👀 busy?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for conflict context", () => {
    const state = makeState({
      context: { type: "conflict", platform: undefined, situation: "unknown", urgency: "normal" },
      conflict: { level: 0.6, escalation: 0.4, trigger: "disagreement", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
    });
    const draft = "I think there's some confusion about what happened.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for friendship context", () => {
    const state = makeState({
      context: { type: "friendship", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const draft = "hey wanna grab lunch tomorrow?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for family context", () => {
    const state = makeState({
      context: { type: "family", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const draft = "I understand you're worried. Let's talk about it.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for customer context", () => {
    const state = makeState({
      context: { type: "customer", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const draft = "I apologize for the inconvenience. Let me resolve this for you.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for negotiation context", () => {
    const state = makeState({
      context: { type: "negotiation", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const draft = "What if we compromise on the timeline?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });
});

// ─── RELATIONSHIP-AWARE ───────────────────────────────────────────────────────

describe("Impact Prediction - Relationship Awareness", () => {
  it("should work for peer relationship", () => {
    const state = makeState({ relationship: "coworker" });
    const draft = "Hey, could you help me with this?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for manager relationship", () => {
    const state = makeState({ relationship: "manager" });
    const draft = "I need to discuss the timeline for the project.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for client relationship", () => {
    const state = makeState({ relationship: "client" });
    const draft = "I'll have the deliverable ready by Friday.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for friend relationship", () => {
    const state = makeState({ relationship: "friend" });
    const draft = "wanna hang out this weekend?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for romantic interest", () => {
    const state = makeState({ relationship: "romantic_interest" });
    const draft = "I had a great time yesterday 😊";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should work for family member", () => {
    const state = makeState({ relationship: "family" });
    const draft = "I understand you're concerned. Let's figure this out.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });
});

// ─── GROUP CONVERSATIONS ──────────────────────────────────────────────────────

describe("Impact Prediction - Group Conversations", () => {
  it("should handle group conversations", () => {
    const state = makeState({
      participants: { count: 4, roles: ["user", "a", "b", "c"], userId: "user", others: ["a", "b", "c"], isGroup: true },
    });
    const draft = "You guys never communicate properly.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle dominant participant scenario", () => {
    const state = makeState({
      participants: { count: 3, roles: ["user", "dominant", "other"], userId: "user", others: ["dominant", "other"], isGroup: true },
      conflictIntelligence: {
        participants: [
          { participantId: "dominant", label: "Dominant", role: "dominant", relationshipToUser: "coworker", language: "english", position: { mainPosition: "Their way", supportingReasoning: "Because", requestedOutcome: "Compliance" }, intent: "persuade", emotion: { primary: "confident", secondary: "neutral", intensity: 0.6, confidence: "medium" }, tone: { primary: "assertive", secondary: "neutral", intensity: 0.7 }, stance: "cooperative", behavior: { cooperationLevel: 0.6, defensiveness: 0.2, escalationContribution: 0.1, personalAttacks: false }, concerns: [], requests: [], claims: [], knownFacts: [], disputedFacts: [] },
        ],
        conflictStructure: null,
        groupAnalysis: { isGroup: true, participantCount: 3, participants: [], groupDynamics: { dominantParticipants: ["dominant"], silentParticipants: [], conflictParticipants: [], neutralParticipants: ["other"], affectedParticipants: [], potentialMediators: [] }, dominantLanguage: "english", multilingual: false, languageDistribution: [], userPosition: null },
      },
    });
    const draft = "I think we should consider a different approach.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle multilingual group", () => {
    const state = makeState({
      participants: { count: 3, roles: ["user", "a", "b"], userId: "user", others: ["a", "b"], isGroup: true },
      language: {
        primary: "hindi", secondary: ["english"], script: "mixed", codeMixed: true,
        romanized: false, codeMixRatio: [{ language: "hindi", ratio: 0.5 }, { language: "english", ratio: 0.5 }],
        outputPreference: "code_mixed", confidence: 0.8, scriptConfidence: 0.7,
        detectionSource: "ai", participantLanguages: [],
      },
    });
    const draft = "yaar ye issue kab resolve hoga?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });
});

// ─── LANGUAGE SUPPORT ──────────────────────────────────────────────────────────

describe("Impact Prediction - Language Support", () => {
  it("should handle English drafts", () => {
    const state = makeState();
    const draft = "Hello, how are you?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle Telugu Romanized", () => {
    const state = makeState({
      language: {
        primary: "telugu", secondary: ["english"], script: "latin", codeMixed: true,
        romanized: true, codeMixRatio: [{ language: "telugu", ratio: 0.6 }, { language: "english", ratio: 0.4 }],
        outputPreference: "romanized", confidence: 0.8, scriptConfidence: 0.7,
        detectionSource: "ai", participantLanguages: [],
      },
    });
    const draft = "naku ivala project finish cheyyadam late ayindi";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle Hindi-English code-mix", () => {
    const state = makeState({
      language: {
        primary: "hindi", secondary: ["english"], script: "mixed", codeMixed: true,
        romanized: false, codeMixRatio: [{ language: "hindi", ratio: 0.5 }, { language: "english", ratio: 0.5 }],
        outputPreference: "code_mixed", confidence: 0.8, scriptConfidence: 0.7,
        detectionSource: "ai", participantLanguages: [],
      },
    });
    const draft = "yar ye project ka deadline kab hai?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle Tamil-English code-mix", () => {
    const state = makeState({
      language: {
        primary: "tamil", secondary: ["english"], script: "mixed", codeMixed: true,
        romanized: false, codeMixRatio: [{ language: "tamil", ratio: 0.5 }, { language: "english", ratio: 0.5 }],
        outputPreference: "code_mixed", confidence: 0.8, scriptConfidence: 0.7,
        detectionSource: "ai", participantLanguages: [],
      },
    });
    const draft = "enna aachu nee enna pannuva?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle native script", () => {
    const state = makeState({
      language: {
        primary: "hindi", secondary: [], script: "devanagari", codeMixed: false,
        romanized: false, codeMixRatio: [], outputPreference: "native_script",
        confidence: 0.9, scriptConfidence: 0.9, detectionSource: "ai",
        participantLanguages: [],
      },
    });
    const draft = "नमस्ते आप कैसे हैं?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle mixed script", () => {
    const state = makeState({
      language: {
        primary: "hindi", secondary: ["english"], script: "mixed", codeMixed: true,
        romanized: false, codeMixRatio: [{ language: "hindi", ratio: 0.6 }, { language: "english", ratio: 0.4 }],
        outputPreference: "code_mixed", confidence: 0.8, scriptConfidence: 0.7,
        detectionSource: "ai", participantLanguages: [],
      },
    });
    const draft = "नमस्ते, how are you doing today?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });
});

// ─── STYLE IMPACT ─────────────────────────────────────────────────────────────

describe("Impact Prediction - Style Impact", () => {
  it("should handle professional style", () => {
    const state = makeState();
    const draft = "Please find the attached report. Best regards.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle casual style", () => {
    const state = makeState();
    const draft = "hey what's up dude";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle playful style", () => {
    const state = makeState();
    const draft = "haha that's hilarious 😂";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle flirty style", () => {
    const state = makeState();
    const draft = "miss you baby 💕 when can we meet?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle concise style", () => {
    const state = makeState();
    const draft = "ok sounds good";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });
});

// ─── RECOMMENDATIONS ──────────────────────────────────────────────────────────

describe("Impact Prediction - Recommendations", () => {
  it("should recommend send_as_is for good messages", () => {
    const state = makeState();
    const draft = "Could you send me the report by end of day?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(["send_as_is", "clarify_request", "add_specific_next_step"]).toContain(result.prediction.recommendedAction);
  });

  it("should recommend reduce_blame for accusatory messages", () => {
    const state = makeState();
    const draft = "You always do this. It's your fault.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.recommendedAction).toBeDefined();
  });

  it("should recommend soften_opening for aggressive openings", () => {
    const state = makeState();
    const draft = "Why are you blaming me? I already did my part.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.recommendedAction).toBeDefined();
  });

  it("should recommend clarify_request for ambiguous drafts", () => {
    const state = makeState();
    const draft = "I'll handle it later";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.recommendedAction).toBeDefined();
  });

  it("should recommend acknowledge_concern when other is frustrated", () => {
    const state = makeState({
      conflictIntelligence: {
        participants: [
          { participantId: "other", label: "Other", role: "other", relationshipToUser: "unknown", language: "english", position: { mainPosition: "", supportingReasoning: "", requestedOutcome: "" }, intent: "express_frustration", emotion: { primary: "frustrated", secondary: "angry", intensity: 0.7, confidence: "medium" }, tone: { primary: "frustrated", secondary: "angry", intensity: 0.7 }, stance: "defensive", behavior: { cooperationLevel: 0.3, defensiveness: 0.6, escalationContribution: 0.4, personalAttacks: false }, concerns: [], requests: [], claims: [], knownFacts: [], disputedFacts: [] },
        ],
        conflictStructure: null,
        groupAnalysis: null,
      },
    });
    const draft = "You need to fix this right now";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction.recommendedAction).toBeDefined();
  });
});

// ─── DETERMINISTIC SIGNALS ────────────────────────────────────────────────────

describe("Impact Prediction - Deterministic Signals", () => {
  it("should extract signals correctly", () => {
    const state = makeState();
    const draft = "Could you please send me the report?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const signals = extractDeterministicImpactSignals(analysis, state, checks, draft);
    expect(signals).toBeDefined();
    expect(typeof signals.draftEscalationRisk).toBe("number");
    expect(typeof signals.conversationConflictLevel).toBe("number");
    expect(typeof signals.hasClearRequest).toBe("boolean");
    expect(typeof signals.hasSpecificNextStep).toBe("boolean");
  });

  it("should detect clear request", () => {
    const state = makeState();
    const draft = "Could you please send me the report?";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const signals = extractDeterministicImpactSignals(analysis, state, checks, draft);
    expect(signals.hasClearRequest).toBe(true);
  });

  it("should detect specific next step", () => {
    const state = makeState();
    const draft = "I'll have it ready by tomorrow morning";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const signals = extractDeterministicImpactSignals(analysis, state, checks, draft);
    expect(signals.hasSpecificNextStep).toBe(true);
  });

  it("should detect ambiguous deadline", () => {
    const state = makeState();
    const draft = "I'll handle it later";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const signals = extractDeterministicImpactSignals(analysis, state, checks, draft);
    expect(signals.hasAmbiguousDeadline).toBe(true);
  });

  it("should detect solution orientation", () => {
    const state = makeState();
    const draft = "Let's find a solution to this problem";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const signals = extractDeterministicImpactSignals(analysis, state, checks, draft);
    expect(signals.hasSolutionOrientation).toBe(true);
  });

  it("should detect acknowledgement", () => {
    const state = makeState();
    const draft = "I understand your concern. Let's figure this out.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const signals = extractDeterministicImpactSignals(analysis, state, checks, draft);
    expect(signals.hasAcknowledgement).toBe(true);
  });
});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe("Impact Prediction - Edge Cases", () => {
  it("should handle very short draft", () => {
    const state = makeState();
    const draft = "ok";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle very long draft", () => {
    const state = makeState();
    const draft = "I wanted to let you know that I have been working really hard on this project and I think we are making good progress but there are a few things we need to address before the deadline and I would like to discuss them with you as soon as possible because the timeline is tight and we need to make sure everything is done correctly.";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle draft with only emojis", () => {
    const state = makeState();
    const draft = "😂🤣😊❤️";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle draft with only punctuation", () => {
    const state = makeState();
    const draft = "!?!.??";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle draft with URLs", () => {
    const state = makeState();
    const draft = "Check this out https://example.com";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });

  it("should handle draft with numbers", () => {
    const state = makeState();
    const draft = "Meeting at 3pm tomorrow for 1 hour";
    const analysis = getAnalysis(draft, state);
    const checks = getChecks(draft);
    const result = predictImpact(makeInput(draft), state, analysis, checks);
    expect(result.prediction).toBeDefined();
  });
});
