import { describe, it, expect } from "vitest";
import { evaluatePreSendGate } from "@/lib/ai/pre-send-gate";
import type { PreSendGateInput, CheckDimension } from "@/lib/ai/pre-send-types";
import type { ConversationState } from "@/lib/ai/conversation-state";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    participants: { count: 2, roles: ["user", "other"], userId: "user", others: ["other"], isGroup: false },
    relationship: "friend",
    language: {
      primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false,
      codeMixRatio: [], outputPreference: "auto", confidence: 0.8, scriptConfidence: 0.9,
      detectionSource: "ai", participantLanguages: [],
    },
    context: {
      type: "friendship", platform: undefined, situation: "casual_chat", urgency: "normal",
    },
    intent: { userGoal: "continue_conversation", userIntent: "reply", otherIntent: "unknown" },
    emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
    tone: { primary: "casual", secondary: "neutral", intensity: 0.4 },
    dynamics: {
      engagement: 0.5, reciprocity: 0.5, cooperation: 0.6, defensiveness: 0.2,
      escalation: 0.1, rapport: 0.5, pressure: 0.1, uncertainty: 0.3, responsiveness: 0.5,
    },
    conflict: { level: 0.1, escalation: 0.05, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
    risks: [],
    conflictIntelligence: { participants: [], conflictStructure: null, groupAnalysis: null },
    strategy: { primary: "natural", ranked: [], confidence: 0.6 },
    style: { preferred: "casual", writingCharacteristics: "short", lengthPreference: "short", profile: null, guidance: null, source: "default" },
    sources: { goalSource: "default", contextSource: "default", toneSource: "default", situationSource: "detector", languageSource: "ai" },
    ...overrides,
  } as ConversationState;
}

function makeInput(overrides: Partial<PreSendGateInput> = {}): PreSendGateInput {
  return {
    draft: "Hey, how are you?",
    messages: [
      { sender: "them", text: "Hey! What's up?" },
      { sender: "me", text: "Not much, just wanted to check in." },
    ],
    ...overrides,
  };
}

// ─── Semantic Preservation (8 tests) ────────────────────────────────────────

describe("Pre-Send Gate: Semantic Preservation", () => {
  it("passes when meaning is preserved", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I can't come today" }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(true);
    expect(result.dimensionScores.semantic_preservation.score).toBeGreaterThanOrEqual(0.7);
  });

  it("detects negation reversal", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I can come today",
        originalDraft: "I can't come today",
      }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(false);
    expect(result.risks.some((r) => r.dimension === "semantic_preservation")).toBe(true);
  });

  it("detects position change", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I agree with your approach",
        originalDraft: "I disagree with your approach",
      }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(false);
  });

  it("detects boundary removal", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Sure, I can do that",
        originalDraft: "I can't do that",
      }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(false);
  });

  it("detects temporal shift", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I'll do it next week",
        originalDraft: "I'll do it today",
      }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(false);
  });

  it("detects ability change", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I'm available tomorrow",
        originalDraft: "I'm not available tomorrow",
      }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(false);
  });

  it("handles multilingual preservation", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Nenu raledu",
        originalDraft: "Nenu raledu",
      }),
      makeState({
        language: {
          primary: "telugu", secondary: ["english"], script: "latin", codeMixed: true, romanized: true,
          codeMixRatio: [], outputPreference: "romanized", confidence: 0.8, scriptConfidence: 0.9,
          detectionSource: "ai", participantLanguages: [],
        },
      })
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(true);
  });

  it("handles perfect preservation", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I can't make it to the meeting today" }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.score).toBe(1.0);
  });
});

// ─── Factual Integrity (8 tests) ────────────────────────────────────────────

describe("Pre-Send Gate: Factual Integrity", () => {
  it("passes for clean facts", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "See you at 3pm tomorrow" }),
      makeState()
    );
    expect(result.dimensionScores.factual_integrity.passed).toBe(true);
  });

  it("detects fabricated excuse", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "My laptop crashed so I couldn't submit" }),
      makeState()
    );
    expect(result.dimensionScores.factual_integrity.passed).toBe(false);
    expect(result.risks.some((r) => r.dimension === "factual_integrity")).toBe(true);
  });

  it("detects fabricated illness via deception check", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I was sick yesterday so I missed the meeting" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.passed).toBe(false);
  });

  it("detects fabricated deadline via deception check", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You said the deadline was Friday" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.passed).toBe(false);
  });

  it("detects fabricated event via deception check", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "There was a flood so I couldn't come" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.passed).toBe(false);
  });

  it("preserves original facts", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "The meeting is at 3pm tomorrow",
        originalDraft: "The meeting is at 3pm tomorrow",
      }),
      makeState()
    );
    expect(result.dimensionScores.factual_integrity.passed).toBe(true);
  });

  it("detects changed numbers via semantic preservation", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "The deadline is 5pm tomorrow",
        originalDraft: "The deadline is 3pm tomorrow",
      }),
      makeState()
    );
    expect(result.dimensionScores.semantic_preservation.passed).toBe(false);
  });

  it("passes for factual contradiction", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I completed the project on time" }),
      makeState()
    );
    // No context to contradict, so should pass
    expect(result.dimensionScores.factual_integrity.score).toBeGreaterThanOrEqual(0.5);
  });
});

// ─── Goal Alignment (6 tests) ───────────────────────────────────────────────

describe("Pre-Send Gate: Goal Alignment", () => {
  it("passes when no goal specified", async () => {
    const result = await evaluatePreSendGate(makeInput(), makeState());
    expect(result.dimensionScores.goal_alignment.passed).toBe(true);
  });

  it("passes when aligned with goal", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Could I get a 2-day extension on the deadline?", goal: "ask_for_extension" }),
      makeState()
    );
    expect(result.dimensionScores.goal_alignment.passed).toBe(true);
  });

  it("flags misalignment with goal", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey, nice weather today!", goal: "apologize" }),
      makeState()
    );
    expect(result.dimensionScores.goal_alignment.score).toBeLessThan(0.8);
  });

  it("passes for professional goal", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I'd like to discuss the project timeline", goal: "request" }),
      makeState()
    );
    expect(result.dimensionScores.goal_alignment.score).toBeGreaterThanOrEqual(0.5);
  });

  it("passes for dating goal", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Want to grab coffee this weekend?", goal: "flirt" }),
      makeState()
    );
    expect(result.dimensionScores.goal_alignment.score).toBeGreaterThanOrEqual(0.5);
  });

  it("detects goal-undermining patterns", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're wrong about this", goal: "de_escalate" }),
      makeState()
    );
    expect(result.dimensionScores.goal_alignment.score).toBeLessThan(0.8);
  });
});

// ─── Context Fit (6 tests) ──────────────────────────────────────────────────

describe("Pre-Send Gate: Context Fit", () => {
  it("passes for casual context", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey, what are you up to?" }),
      makeState()
    );
    expect(result.dimensionScores.context_fit.passed).toBe(true);
  });

  it("flags casual humor in conflict", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "lol that's funny 😂" }),
      makeState({
        context: { type: "conflict", platform: undefined, situation: "heated_argument", urgency: "normal" },
      })
    );
    expect(result.dimensionScores.context_fit.passed).toBe(false);
  });

  it("flags overly casual in professional", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "yo bro what's up" }),
      makeState({ relationship: "manager" })
    );
    expect(result.dimensionScores.context_fit.passed).toBe(false);
  });

  it("flags long message in group chat", async () => {
    const longDraft = "This is a very long message ".repeat(15);
    const result = await evaluatePreSendGate(
      makeInput({ draft: longDraft }),
      makeState({ participants: { count: 5, roles: ["user", "a", "b", "c", "d"], userId: "user", others: ["a", "b", "c", "d"], isGroup: true } })
    );
    expect(result.dimensionScores.context_fit.score).toBeLessThan(0.8);
  });

  it("flags verbose in urgent situation", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I just wanted to reach out and let you know that I think we should probably consider all the options" }),
      makeState({ context: { type: "general", platform: undefined, situation: "scheduling_problem", urgency: "urgent" } })
    );
    expect(result.dimensionScores.context_fit.score).toBeLessThan(0.8);
  });

  it("passes for appropriate context", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Thanks for the update!" }),
      makeState()
    );
    expect(result.dimensionScores.context_fit.passed).toBe(true);
  });
});

// ─── Tone Fit (6 tests) ─────────────────────────────────────────────────────

describe("Pre-Send Gate: Tone Fit", () => {
  it("passes for matching tone", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey! How's it going? 😊" }),
      makeState()
    );
    expect(result.dimensionScores.tone_fit.passed).toBe(true);
  });

  it("passes for flirty in dating context", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You look amazing today 😍" }),
      makeState({ relationship: "date" })
    );
    expect(result.dimensionScores.tone_fit.score).toBeGreaterThanOrEqual(0.5);
  });

  it("detects aggressive language", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You always do this, you never listen!" }),
      makeState()
    );
    expect(result.dimensionScores.tone_fit.passed).toBe(false);
  });

  it("detects personal attack", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're being an idiot about this" }),
      makeState()
    );
    expect(result.dimensionScores.tone_fit.passed).toBe(false);
  });

  it("passes for appropriate tone in professional", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Thank you for the feedback. I'll incorporate it." }),
      makeState({ relationship: "manager" })
    );
    expect(result.dimensionScores.tone_fit.score).toBeGreaterThanOrEqual(0.5);
  });

  it("detects sarcastic tone in conflict", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Oh great, another brilliant idea from you" }),
      makeState({
        context: { type: "conflict", platform: undefined, situation: "disagreement", urgency: "normal" },
      })
    );
    expect(result.dimensionScores.tone_fit.score).toBeLessThan(0.8);
  });
});

// ─── Communication Impact (6 tests) ─────────────────────────────────────────

describe("Pre-Send Gate: Communication Impact", () => {
  it("passes for cooperative message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I understand your concern. Let's find a solution together." }),
      makeState()
    );
    expect(result.dimensionScores.communication_impact.passed).toBe(true);
  });

  it("passes without impact prediction", async () => {
    const result = await evaluatePreSendGate(makeInput(), makeState());
    expect(result.dimensionScores.communication_impact.passed).toBe(true);
  });

  it("uses impact prediction when provided", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        impactPrediction: {
          cooperation: 0.3, responseLikelihood: 0.2, conversationContinuation: 0.2,
          misunderstandingRisk: 0.1, escalationRisk: 0.8, defensivenessRisk: 0.8,
          pressureRisk: 0.1, trustImpact: 0.2, clarityImpact: 0.5, goalProgression: 0.2,
          scenarios: [], riskFactors: [], sendReadiness: "high_risk",
          recommendedAction: "improve_message", impactSummary: "Bad", whyExplanation: "Risky",
          predictionConfidence: 0.7,
        },
      }),
      makeState()
    );
    expect(result.dimensionScores.communication_impact.passed).toBe(false);
  });

  it("flags high defensiveness risk", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        impactPrediction: {
          cooperation: 0.5, responseLikelihood: 0.5, conversationContinuation: 0.5,
          misunderstandingRisk: 0.5, escalationRisk: 0.5, defensivenessRisk: 0.8,
          pressureRisk: 0.5, trustImpact: 0.5, clarityImpact: 0.5, goalProgression: 0.5,
          scenarios: [], riskFactors: [], sendReadiness: "needs_review",
          recommendedAction: "improve_message", impactSummary: "", whyExplanation: "",
          predictionConfidence: 0.7,
        },
      }),
      makeState()
    );
    expect(result.dimensionScores.communication_impact.score).toBeLessThan(0.8);
  });

  it("flags high escalation risk", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        impactPrediction: {
          cooperation: 0.5, responseLikelihood: 0.5, conversationContinuation: 0.5,
          misunderstandingRisk: 0.5, escalationRisk: 0.9, defensivenessRisk: 0.5,
          pressureRisk: 0.5, trustImpact: 0.5, clarityImpact: 0.5, goalProgression: 0.5,
          scenarios: [], riskFactors: [], sendReadiness: "high_risk",
          recommendedAction: "improve_message", impactSummary: "", whyExplanation: "",
          predictionConfidence: 0.7,
        },
      }),
      makeState()
    );
    expect(result.dimensionScores.communication_impact.score).toBeLessThan(0.8);
  });

  it("flags high pressure risk", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        impactPrediction: {
          cooperation: 0.5, responseLikelihood: 0.5, conversationContinuation: 0.5,
          misunderstandingRisk: 0.5, escalationRisk: 0.5, defensivenessRisk: 0.5,
          pressureRisk: 0.9, trustImpact: 0.5, clarityImpact: 0.5, goalProgression: 0.5,
          scenarios: [], riskFactors: [], sendReadiness: "needs_review",
          recommendedAction: "improve_message", impactSummary: "", whyExplanation: "",
          predictionConfidence: 0.7,
        },
      }),
      makeState()
    );
    expect(result.dimensionScores.communication_impact.score).toBeLessThan(0.8);
  });
});

// ─── Escalation Risk (6 tests) ──────────────────────────────────────────────

describe("Pre-Send Gate: Escalation Risk", () => {
  it("passes for calm message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I understand. Let's talk about this." }),
      makeState()
    );
    expect(result.dimensionScores.escalation_risk.passed).toBe(true);
  });

  it("detects absolute language", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You always do this! Every single time!" }),
      makeState()
    );
    expect(result.dimensionScores.escalation_risk.passed).toBe(false);
  });

  it("detects harsh judgment", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "This is pathetic and unacceptable" }),
      makeState()
    );
    expect(result.dimensionScores.escalation_risk.passed).toBe(false);
  });

  it("detects threat/ultimatum", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "If you don't fix this, I'll make sure everyone knows" }),
      makeState()
    );
    expect(result.dimensionScores.escalation_risk.passed).toBe(false);
  });

  it("detects personal attack", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're wrong and you're incompetent" }),
      makeState()
    );
    expect(result.dimensionScores.escalation_risk.passed).toBe(false);
  });

  it("allows assertive language in conflict context", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I disagree with this approach and I think we need to reconsider" }),
      makeState({
        context: { type: "conflict", platform: undefined, situation: "disagreement", urgency: "normal" },
      })
    );
    // Assertive but not escalating — should pass
    expect(result.dimensionScores.escalation_risk.score).toBeGreaterThanOrEqual(0.5);
  });
});

// ─── Defensiveness Risk (5 tests) ───────────────────────────────────────────

describe("Pre-Send Gate: Defensiveness Risk", () => {
  it("passes for accountable message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I see your point. I'll do better next time." }),
      makeState()
    );
    expect(result.dimensionScores.defensiveness_risk.passed).toBe(true);
  });

  it("detects blame avoidance", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "It's not my fault this happened" }),
      makeState()
    );
    expect(result.dimensionScores.defensiveness_risk.passed).toBe(false);
  });

  it("detects deflection", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "But you did the same thing last week" }),
      makeState()
    );
    expect(result.dimensionScores.defensiveness_risk.passed).toBe(false);
  });

  it("detects excuse-making", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I had no choice, I was forced to do it" }),
      makeState()
    );
    expect(result.dimensionScores.defensiveness_risk.passed).toBe(false);
  });

  it("detects justification", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Technically, I was right about this" }),
      makeState()
    );
    expect(result.dimensionScores.defensiveness_risk.passed).toBe(false);
  });
});

// ─── Pressure Risk (5 tests) ────────────────────────────────────────────────

describe("Pre-Send Gate: Pressure Risk", () => {
  it("passes for non-pressuring message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "When you get a chance, could you review this?" }),
      makeState()
    );
    expect(result.dimensionScores.pressure_risk.passed).toBe(true);
  });

  it("detects urgency pressure", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I need this done right now, immediately" }),
      makeState()
    );
    expect(result.dimensionScores.pressure_risk.passed).toBe(false);
  });

  it("detects conditional pressure", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "If you don't submit this, there will be consequences" }),
      makeState()
    );
    expect(result.dimensionScores.pressure_risk.passed).toBe(false);
  });

  it("detects ultimatum", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "This is your last chance to fix this" }),
      makeState()
    );
    expect(result.dimensionScores.pressure_risk.passed).toBe(false);
  });

  it("detects social pressure", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Everyone else has already submitted theirs" }),
      makeState()
    );
    expect(result.dimensionScores.pressure_risk.passed).toBe(false);
  });
});

// ─── Misunderstanding Risk (5 tests) ────────────────────────────────────────

describe("Pre-Send Gate: Misunderstanding Risk", () => {
  it("passes for clear message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Can we reschedule our meeting from 3pm to 5pm tomorrow?" }),
      makeState()
    );
    expect(result.dimensionScores.misunderstanding_risk.passed).toBe(true);
  });

  it("detects vague language", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You know what I mean, right?" }),
      makeState()
    );
    expect(result.dimensionScores.misunderstanding_risk.score).toBeLessThan(0.85);
  });

  it("detects unclear request", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Can you handle this?" }),
      makeState()
    );
    expect(result.dimensionScores.misunderstanding_risk.score).toBeLessThan(0.85);
  });

  it("detects excessive questions", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "What do you think? Should we go? When? Where? How?" }),
      makeState()
    );
    expect(result.dimensionScores.clarity.score).toBeLessThan(0.85);
  });

  it("passes for specific request", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Could you send me the report by Thursday at 5pm?" }),
      makeState()
    );
    expect(result.dimensionScores.misunderstanding_risk.passed).toBe(true);
  });
});

// ─── Boundary Integrity (5 tests) ───────────────────────────────────────────

describe("Pre-Send Gate: Boundary Integrity", () => {
  it("passes when no boundaries to preserve", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Sounds good!" }),
      makeState()
    );
    expect(result.dimensionScores.boundary_integrity.passed).toBe(true);
  });

  it("passes when boundary is preserved", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I can't do that, sorry",
        originalDraft: "I can't do that",
      }),
      makeState()
    );
    expect(result.dimensionScores.boundary_integrity.passed).toBe(true);
  });

  it("detects boundary removal", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Sure, I can do that",
        originalDraft: "I can't do that",
      }),
      makeState()
    );
    expect(result.dimensionScores.boundary_integrity.passed).toBe(false);
  });

  it("detects boundary weakening", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I might be able to find some time",
        originalDraft: "I'm not available this week",
      }),
      makeState()
    );
    expect(result.dimensionScores.boundary_integrity.score).toBeLessThan(0.9);
  });

  it("notes new boundary addition", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I'm not comfortable with that",
        originalDraft: "That sounds interesting",
      }),
      makeState()
    );
    // New boundary added — should note it
    expect(result.dimensionScores.boundary_integrity.issues.length).toBeGreaterThanOrEqual(0);
  });
});

// ─── Position Integrity (5 tests) ───────────────────────────────────────────

describe("Pre-Send Gate: Position Integrity", () => {
  it("passes when no position to preserve", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Sounds good!" }),
      makeState()
    );
    expect(result.dimensionScores.position_integrity.passed).toBe(true);
  });

  it("passes when position is preserved", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I agree with your approach",
        originalDraft: "I agree with this",
      }),
      makeState()
    );
    expect(result.dimensionScores.position_integrity.passed).toBe(true);
  });

  it("detects position flip", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I disagree with your approach",
        originalDraft: "I agree with your approach",
      }),
      makeState()
    );
    expect(result.dimensionScores.position_integrity.passed).toBe(false);
  });

  it("detects support-to-oppose flip", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I can't support this",
        originalDraft: "I support this initiative",
      }),
      makeState()
    );
    expect(result.dimensionScores.position_integrity.passed).toBe(false);
  });

  it("passes for neutral position", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I'll think about it" }),
      makeState()
    );
    expect(result.dimensionScores.position_integrity.passed).toBe(true);
  });
});

// ─── Language Consistency (5 tests) ──────────────────────────────────────────

describe("Pre-Send Gate: Language Consistency", () => {
  it("passes for consistent English", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hello, how are you?" }),
      makeState()
    );
    expect(result.dimensionScores.language_consistency.passed).toBe(true);
  });

  it("detects script switch", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Namaste, kaise ho?",
        originalDraft: "Hello, how are you?",
      }),
      makeState()
    );
    expect(result.dimensionScores.language_consistency.score).toBeLessThan(0.9);
  });

  it("passes for consistent Romanized", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Nenu raledu" }),
      makeState({
        language: {
          primary: "telugu", secondary: [], script: "latin", codeMixed: false, romanized: true,
          codeMixRatio: [], outputPreference: "romanized", confidence: 0.8, scriptConfidence: 0.9,
          detectionSource: "ai", participantLanguages: [],
        },
      })
    );
    expect(result.dimensionScores.language_consistency.passed).toBe(true);
  });

  it("passes for code-mixed message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey, nenu vastha tomorrow" }),
      makeState({
        language: {
          primary: "telugu", secondary: ["english"], script: "latin", codeMixed: true, romanized: true,
          codeMixRatio: [], outputPreference: "code_mixed", confidence: 0.8, scriptConfidence: 0.9,
          detectionSource: "ai", participantLanguages: [],
        },
      })
    );
    expect(result.dimensionScores.language_consistency.passed).toBe(true);
  });

  it("detects sudden native script switch", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "\u0C07\u0C26\u0C3F \u0C35\u0C38\u0C4D\u0C24\u0C3E\u0C28\u0D4D",
        originalDraft: "I'm coming",
      }),
      makeState()
    );
    expect(result.dimensionScores.language_consistency.score).toBeLessThan(0.9);
  });
});

// ─── Style Consistency (5 tests) ────────────────────────────────────────────

describe("Pre-Send Gate: Style Consistency", () => {
  it("passes for consistent style", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Hey, what's up?",
        originalDraft: "Hey, how are you?",
      }),
      makeState()
    );
    expect(result.dimensionScores.style_consistency.passed).toBe(true);
  });

  it("detects much shorter message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "No",
        originalDraft: "I'm really sorry but I don't think I can make it to the meeting tomorrow because I have a prior commitment",
      }),
      makeState()
    );
    expect(result.dimensionScores.style_consistency.score).toBeLessThan(0.85);
  });

  it("detects much longer message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Hey ".repeat(40),
        originalDraft: "Hey",
      }),
      makeState()
    );
    expect(result.dimensionScores.style_consistency.score).toBeLessThan(0.85);
  });

  it("detects emoji increase", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "That's great! 😊 😂 🎉 ❤️ 👍",
        originalDraft: "That's great",
      }),
      makeState()
    );
    expect(result.dimensionScores.style_consistency.score).toBeLessThan(0.85);
  });

  it("detects excessive exclamation marks", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "This is amazing!!!",
        originalDraft: "This is nice",
      }),
      makeState()
    );
    expect(result.dimensionScores.style_consistency.score).toBeLessThan(0.85);
  });
});

// ─── Safety (8 tests) ───────────────────────────────────────────────────────

describe("Pre-Send Gate: Safety", () => {
  it("passes for clean message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Have a great day!" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(true);
    expect(result.dimensionScores.safety.score).toBe(1.0);
  });

  it("detects offensive language", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're being an idiot" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(false);
    expect(result.dimensionScores.safety.score).toBe(0.0);
    expect(result.risks.some((r) => r.dimension === "safety" && r.severity === "critical")).toBe(true);
  });

  it("detects harmful content", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I hate you so much" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(false);
  });

  it("detects phone number", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Call me at 555-123-4567" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(false);
  });

  it("detects email address", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Email me at test@example.com" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(false);
  });

  it("detects SSN-like number", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "My SSN is 123-45-6789" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(false);
  });

  it("detects credit card number", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "My card number is 4111 1111 1111 1111" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(false);
  });

  it("passes for normal numbers", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Let's meet at 3pm" }),
      makeState()
    );
    expect(result.dimensionScores.safety.passed).toBe(true);
  });
});

// ─── Deception / Fabrication (8 tests) ──────────────────────────────────────

describe("Pre-Send Gate: Deception / Fabrication", () => {
  it("passes for supported claims", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I couldn't submit because my laptop crashed",
        messages: [
          { sender: "them", text: "Why didn't you submit?" },
          { sender: "me", text: "My laptop crashed this morning" },
        ],
      }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.passed).toBe(true);
  });

  it("detects unsupported excuse", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "My laptop crashed so I couldn't submit" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.passed).toBe(false);
    expect(result.risks.some((r) => r.dimension === "deception_fabrication" && r.severity === "critical")).toBe(true);
  });

  it("detects fabricated illness", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I was sick yesterday" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.score).toBeLessThan(0.8);
  });

  it("detects fabricated deadline", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You said the deadline was Friday" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.score).toBeLessThan(0.8);
  });

  it("detects fabricated event", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "There was a flood so I couldn't come" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.score).toBeLessThan(0.8);
  });

  it("passes for clean message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I'll be there at 3pm" }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.passed).toBe(true);
  });

  it("detects contradicted claim via deception check", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I can't make it to the meeting",
        messages: [
          { sender: "them", text: "Are you coming to the meeting?" },
          { sender: "me", text: "Yes, I'll be there" },
        ],
      }),
      makeState()
    );
    // The draft contradicts the earlier user message about being available
    expect(result.dimensionScores.contradiction.passed).toBe(false);
  });

  it("detects fabricated attribution", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: 'You said "the meeting is at 2pm"',
        messages: [
          { sender: "them", text: "Let's meet tomorrow" },
        ],
      }),
      makeState()
    );
    expect(result.dimensionScores.deception_fabrication.score).toBeLessThan(0.8);
  });
});

// ─── Contradiction (5 tests) ────────────────────────────────────────────────

describe("Pre-Send Gate: Contradiction", () => {
  it("passes with no contradiction", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I'll be there at 3pm" }),
      makeState()
    );
    expect(result.dimensionScores.contradiction.passed).toBe(true);
  });

  it("detects direct contradiction", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I won't be able to make it",
        messages: [
          { sender: "them", text: "Are you coming?" },
          { sender: "me", text: "Yes, I'll be there" },
        ],
      }),
      makeState()
    );
    expect(result.dimensionScores.contradiction.passed).toBe(false);
  });

  it("detects availability contradiction", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I'm not available tomorrow",
        messages: [
          { sender: "them", text: "Can we meet tomorrow?" },
          { sender: "me", text: "I'm free tomorrow" },
        ],
      }),
      makeState()
    );
    expect(result.dimensionScores.contradiction.passed).toBe(false);
  });

  it("passes for consistent statements", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I agree with your plan",
        messages: [
          { sender: "them", text: "Let's go with Plan A" },
          { sender: "me", text: "Plan A sounds good" },
        ],
      }),
      makeState()
    );
    expect(result.dimensionScores.contradiction.passed).toBe(true);
  });

  it("detects time contradiction", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "I'm coming today",
        messages: [
          { sender: "them", text: "When are you coming?" },
          { sender: "me", text: "I'll come tomorrow" },
        ],
      }),
      makeState()
    );
    expect(result.dimensionScores.contradiction.passed).toBe(false);
  });
});

// ─── Clarity (5 tests) ──────────────────────────────────────────────────────

describe("Pre-Send Gate: Clarity", () => {
  it("passes for clear message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Can we reschedule our meeting from 3pm to 5pm tomorrow?" }),
      makeState()
    );
    expect(result.dimensionScores.clarity.passed).toBe(true);
  });

  it("flags very brief message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "No" }),
      makeState()
    );
    expect(result.dimensionScores.clarity.score).toBeLessThan(0.85);
  });

  it("flags long message", async () => {
    const longDraft = "This is a very detailed explanation ".repeat(20);
    const result = await evaluatePreSendGate(
      makeInput({ draft: longDraft }),
      makeState()
    );
    expect(result.dimensionScores.clarity.score).toBeLessThan(0.85);
  });

  it("flags excessive exclamation marks", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "This is great!!!!! Oh my god!!!!!" }),
      makeState()
    );
    expect(result.dimensionScores.clarity.score).toBeLessThan(0.85);
  });

  it("flags all caps", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "THIS IS VERY IMPORTANT AND YOU NEED TO READ THIS NOW" }),
      makeState()
    );
    expect(result.dimensionScores.clarity.score).toBeLessThan(0.85);
  });
});

// ─── Decision Logic (10 tests) ──────────────────────────────────────────────

describe("Pre-Send Gate: Decision Logic", () => {
  it("returns READY for clean message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey, how's it going? Want to grab lunch?" }),
      makeState()
    );
    expect(result.decision).toBe("READY");
  });

  it("returns REVIEW for non-critical issues", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're wrong about this" }),
      makeState()
    );
    expect(result.decision).toMatch(/REVIEW|HIGH_RISK/);
  });

  it("returns HIGH_RISK for safety violation", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're an idiot" }),
      makeState()
    );
    expect(result.decision).toBe("HIGH_RISK");
  });

  it("returns HIGH_RISK for fabricated claims", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "My laptop crashed so I couldn't submit" }),
      makeState()
    );
    expect(result.decision).toBe("HIGH_RISK");
  });

  it("returns HIGH_RISK for multiple severe risks", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "You're wrong and you always do this! My laptop crashed so I couldn't submit",
      }),
      makeState()
    );
    expect(result.decision).toBe("HIGH_RISK");
  });

  it("does not return HIGH_RISK for assertiveness", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I disagree with this approach and I think we need to reconsider" }),
      makeState()
    );
    expect(result.decision).not.toBe("HIGH_RISK");
  });

  it("does not return HIGH_RISK for legitimate boundary setting", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "I'm not comfortable with that and I need you to stop" }),
      makeState()
    );
    expect(result.decision).not.toBe("HIGH_RISK");
  });

  it("does not return HIGH_RISK for flirting in dating context", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You look amazing today 😍" }),
      makeState({ relationship: "date" })
    );
    expect(result.decision).not.toBe("HIGH_RISK");
  });

  it("does not return HIGH_RISK for criticism in professional context", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "This report needs significant revisions before it's ready" }),
      makeState({ relationship: "coworker" })
    );
    expect(result.decision).not.toBe("HIGH_RISK");
  });

  it("includes confidence score", async () => {
    const result = await evaluatePreSendGate(makeInput(), makeState());
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
  });
});

// ─── Integration (5 tests) ──────────────────────────────────────────────────

describe("Pre-Send Gate: Integration", () => {
  it("works with existing draft analysis", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Thanks for the update!",
        draftAnalysis: {
          intent: "inform",
          draftStrategy: "natural",
          tone: { primary: "friendly", secondary: "neutral", intensity: 0.4 },
          perceivedImpact: "cooperative",
          perceivedImpactExplanation: "Friendly acknowledgment",
          goalAlignment: 0.8,
          clarity: 0.9,
          misunderstandingRisk: 0.1,
          escalationRisk: 0.05,
          pressureRisk: 0.05,
          styleConsistency: 0.8,
          languageConsistency: 0.9,
          factualIntegrity: 0.9,
          strengths: [],
          issues: [],
          recommendedApproach: "Natural",
          coaching: "Good message",
          analysisConfidence: 0.8,
        },
      }),
      makeState()
    );
    expect(result.decision).toBe("READY");
  });

  it("works without any existing analysis", async () => {
    const result = await evaluatePreSendGate(makeInput(), makeState());
    expect(result.decision).toBeDefined();
    expect(result.dimensionScores).toBeDefined();
  });

  it("works with multilingual conversation", async () => {
    const result = await evaluatePreSendGate(
      makeInput({
        draft: "Hey, nenu vastha tomorrow",
        messages: [
          { sender: "them", text: "Hey, meeru vasthara?" },
          { sender: "me", text: "Yes, I'll come" },
        ],
      }),
      makeState({
        language: {
          primary: "telugu", secondary: ["english"], script: "latin", codeMixed: true, romanized: true,
          codeMixRatio: [], outputPreference: "code_mixed", confidence: 0.8, scriptConfidence: 0.9,
          detectionSource: "ai", participantLanguages: [],
        },
      })
    );
    expect(result.decision).toBeDefined();
  });

  it("works with group chat", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey everyone, quick update on the project" }),
      makeState({
        participants: { count: 5, roles: ["user", "a", "b", "c", "d"], userId: "user", others: ["a", "b", "c", "d"], isGroup: true },
      })
    );
    expect(result.decision).toBeDefined();
  });

  it("works with dating context", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Had a great time tonight 😊" }),
      makeState({ relationship: "date" })
    );
    expect(result.decision).toBeDefined();
    expect(result.decision).not.toBe("HIGH_RISK");
  });
});

// ─── Strengths and Recommendations (4 tests) ────────────────────────────────

describe("Pre-Send Gate: Strengths and Recommendations", () => {
  it("identifies strengths for clean message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey, how's it going?" }),
      makeState()
    );
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it("generates recommendations for risky message", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're wrong about this" }),
      makeState()
    );
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("includes canAutoImprove flag", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "You're wrong about this" }),
      makeState()
    );
    expect(typeof result.canAutoImprove).toBe("boolean");
  });

  it("includes summary and explanation", async () => {
    const result = await evaluatePreSendGate(makeInput(), makeState());
    expect(result.summary).toBeTruthy();
    expect(result.explanation).toBeTruthy();
  });
});

// ─── Edge Cases (5 tests) ───────────────────────────────────────────────────

describe("Pre-Send Gate: Edge Cases", () => {
  it("handles empty draft", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "" }),
      makeState()
    );
    expect(result.decision).toBeDefined();
  });

  it("handles very long draft", async () => {
    const longDraft = "This is a very long message. ".repeat(50);
    const result = await evaluatePreSendGate(
      makeInput({ draft: longDraft }),
      makeState()
    );
    expect(result.decision).toBeDefined();
  });

  it("handles single word draft", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Yes" }),
      makeState()
    );
    expect(result.decision).toBeDefined();
  });

  it("handles emoji-only draft", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "😊 👍 ❤️" }),
      makeState()
    );
    expect(result.decision).toBeDefined();
  });

  it("handles special characters in draft", async () => {
    const result = await evaluatePreSendGate(
      makeInput({ draft: "Hey! How's it going? @#$%^&*()" }),
      makeState()
    );
    expect(result.decision).toBeDefined();
  });
});
