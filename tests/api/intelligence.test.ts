import { describe, it, expect } from "vitest";
import { ConversationIntelligenceSchema } from "@/lib/ai/schemas";
import { rankReplies } from "@/lib/ai/ranker";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import type { ConversationAnalysis } from "@/types/conversation";
import type { ConversationIntelligence } from "@/lib/ai/intelligence";
import type { ConversationContext } from "@/lib/ai/context";

const defaultContext: ConversationContext = {
  language: "english",
  script: "english",
  conversationType: "general",
  participants: 2,
  goal: "keep_going",
  tone: "casual",
  urgency: "normal",
  userStyle: "casual",
};

const mockIntelligence: ConversationIntelligence = {
  language: {
    primary: "english",
    secondary: [],
    script: "english",
    codeMixed: false,
    romanized: false,
    confidence: 0.95,
  },
  participants: {
    count: 2,
    roles: ["friend", "friend"],
    userIdentification: "me",
    otherParticipants: ["them"],
  },
  relationship: "friend",
  context: "dating",
  situation: "casual_chat",
  userIntent: "flirt",
  otherIntent: "flirting",
  emotion: {
    primary: "playful",
    secondary: "happy",
    intensity: 0.7,
  },
  tone: {
    primary: "casual",
    secondary: "playful",
    intensity: 0.8,
  },
  conflict: {
    level: 0.0,
    escalation: 0.0,
    trigger: "",
    coreDisagreement: "",
    personalAttacks: false,
    misunderstanding: false,
    resolutionOpportunity: true,
  },
  dynamics: {
    engagement: 0.8,
    reciprocity: 0.7,
    cooperation: 0.9,
    defensiveness: 0.1,
    escalation: 0.0,
    rapport: 0.8,
    pressure: 0.1,
    uncertainty: 0.2,
    responsiveness: 0.9,
  },
  risks: [],
  recommendedStrategies: ["playful", "flirty", "natural", "funny"],
  confidence: {
    language: 0.95,
    context: 0.9,
    situation: 0.8,
    relationship: 0.85,
    intent: 0.9,
  },
};

const mockConflictIntelligence: ConversationIntelligence = {
  ...mockIntelligence,
  context: "conflict",
  situation: "heated_argument",
  userIntent: "de_escalate",
  emotion: { primary: "frustrated", secondary: "angry", intensity: 0.8 },
  tone: { primary: "assertive", secondary: "defensive", intensity: 0.7 },
  conflict: {
    level: 0.8,
    escalation: 0.6,
    trigger: "missed deadline",
    coreDisagreement: "responsibility for delay",
    personalAttacks: false,
    misunderstanding: true,
    resolutionOpportunity: true,
  },
  dynamics: {
    engagement: 0.9,
    reciprocity: 0.4,
    cooperation: 0.3,
    defensiveness: 0.7,
    escalation: 0.6,
    rapport: 0.2,
    pressure: 0.7,
    uncertainty: 0.3,
    responsiveness: 0.6,
  },
  recommendedStrategies: ["diplomatic", "empathetic", "de_escalate", "accountable", "solution_oriented"],
  confidence: {
    language: 0.95,
    context: 0.95,
    situation: 0.9,
    relationship: 0.9,
    intent: 0.9,
  },
};

const mockProfessionalIntelligence: ConversationIntelligence = {
  ...mockIntelligence,
  context: "professional",
  situation: "follow_up",
  relationship: "manager",
  userIntent: "explain",
  emotion: { primary: "neutral", secondary: "anxious", intensity: 0.4 },
  tone: { primary: "professional", secondary: "formal", intensity: 0.8 },
  conflict: {
    level: 0.1,
    escalation: 0.0,
    trigger: "",
    coreDisagreement: "",
    personalAttacks: false,
    misunderstanding: false,
    resolutionOpportunity: true,
  },
  dynamics: {
    engagement: 0.6,
    reciprocity: 0.5,
    cooperation: 0.7,
    defensiveness: 0.2,
    escalation: 0.0,
    rapport: 0.4,
    pressure: 0.3,
    uncertainty: 0.5,
    responsiveness: 0.7,
  },
  recommendedStrategies: ["professional", "concise", "clear_direct", "accountable"],
  confidence: {
    language: 0.95,
    context: 0.95,
    situation: 0.85,
    relationship: 0.9,
    intent: 0.85,
  },
};

const mockAnalysis: ConversationAnalysis = {
  stage: "flirting",
  engagement: 0.8,
  flirting: 0.6,
  humor: 0.4,
  reciprocity: 0.7,
  conversationHealth: 0.9,
};

describe("ConversationIntelligenceSchema", () => {
  it("validates a complete intelligence object", () => {
    const result = ConversationIntelligenceSchema.safeParse(mockIntelligence);
    expect(result.success).toBe(true);
  });

  it("rejects invalid relationship type", () => {
    const invalid = { ...mockIntelligence, relationship: "invalid" };
    const result = ConversationIntelligenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid situation type", () => {
    const invalid = { ...mockIntelligence, situation: "invalid" };
    const result = ConversationIntelligenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid strategy", () => {
    const invalid = { ...mockIntelligence, recommendedStrategies: ["invalid"] };
    const result = ConversationIntelligenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty strategies array", () => {
    const invalid = { ...mockIntelligence, recommendedStrategies: [] };
    const result = ConversationIntelligenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates emotion intensity bounds", () => {
    const invalid = { ...mockIntelligence, emotion: { ...mockIntelligence.emotion, intensity: 1.5 } };
    const result = ConversationIntelligenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates conflict level bounds", () => {
    const invalid = { ...mockIntelligence, conflict: { ...mockIntelligence.conflict, level: -0.1 } };
    const result = ConversationIntelligenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates confidence bounds", () => {
    const invalid = { ...mockIntelligence, confidence: { ...mockIntelligence.confidence, language: 2.0 } };
    const result = ConversationIntelligenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("State Resolver", () => {
  it("creates state from context without intelligence", () => {
    const state = resolveConversationState(defaultContext, null);
    expect(state.participants.count).toBe(2);
    expect(state.context.type).toBe("general");
    expect(state.intent.userGoal).toBe("keep_going");
    expect(state.sources.goalSource).toBe("default");
  });

  it("prefers explicit user goal over intelligence", () => {
    const contextWithGoal = { ...defaultContext, goal: "ask_for_extension" };
    const state = resolveConversationState(contextWithGoal, mockIntelligence);
    expect(state.intent.userGoal).toBe("ask_for_extension");
    expect(state.sources.goalSource).toBe("user");
  });

  it("uses intelligence when context is general", () => {
    const state = resolveConversationState(defaultContext, mockIntelligence);
    expect(state.context.type).toBe("dating");
    expect(state.sources.contextSource).toBe("intelligence");
  });

  it("prefers user context over intelligence", () => {
    const contextWithType = { ...defaultContext, conversationType: "professional" as const };
    const state = resolveConversationState(contextWithType, mockIntelligence);
    expect(state.context.type).toBe("professional");
    expect(state.sources.contextSource).toBe("user");
  });

  it("returns unknown when intelligence is null", () => {
    const state = resolveConversationState(defaultContext, null);
    expect(state.relationship).toBe("unknown");
    expect(state.context.situation).toBe("unknown");
    expect(state.intent.userIntent).toBe("unknown");
  });

  it("detects group conversations", () => {
    const groupContext = { ...defaultContext, participants: 5 };
    const groupIntelligence = {
      ...mockIntelligence,
      participants: { count: 5, roles: ["friend", "friend", "friend", "friend"], userIdentification: "me", otherParticipants: ["a", "b", "c", "d"] },
    };
    const state = resolveConversationState(groupContext, groupIntelligence);
    expect(state.participants.isGroup).toBe(true);
    expect(state.participants.count).toBe(5);
  });
});

describe("Strategy Engine", () => {
  it("selects professional strategies for professional context", () => {
    const state = resolveConversationState(
      { ...defaultContext, conversationType: "professional" },
      mockProfessionalIntelligence
    );
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("professional");
    expect(strategies).not.toContain("flirty");
  });

  it("selects dating strategies for dating context", () => {
    const state = resolveConversationState(defaultContext, mockIntelligence);
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("flirty");
    expect(strategies).toContain("playful");
  });

  it("selects de-escalation strategies for conflict", () => {
    const state = resolveConversationState(defaultContext, mockConflictIntelligence);
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("de_escalate");
    expect(strategies).toContain("empathetic");
    expect(strategies).not.toContain("flirty");
  });

  it("selects accountable strategies for missed deadline", () => {
    const missedDeadlineIntel: ConversationIntelligence = {
      ...mockIntelligence,
      context: "professional",
      situation: "missed_deadline",
      userIntent: "ask_for_extension",
      recommendedStrategies: ["accountable", "solution_oriented", "apologetic"],
    };
    const state = resolveConversationState(
      { ...defaultContext, goal: "ask_for_extension" },
      missedDeadlineIntel
    );
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("accountable");
    expect(strategies).toContain("extension_request");
  });

  it("selects negotiation strategies for negotiation", () => {
    const negIntel: ConversationIntelligence = {
      ...mockIntelligence,
      context: "negotiation",
      situation: "negotiation",
      userIntent: "negotiate",
      recommendedStrategies: ["persuasive", "clear_direct", "compromise"],
    };
    const state = resolveConversationState(defaultContext, negIntel);
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("negotiation");
    expect(strategies).toContain("persuasive");
  });

  it("suppresses inappropriate strategies during heated argument", () => {
    const heatedIntel: ConversationIntelligence = {
      ...mockIntelligence,
      situation: "heated_argument",
      conflict: { ...mockIntelligence.conflict, level: 0.9, escalation: 0.8 },
      recommendedStrategies: ["de_escalate", "empathetic", "clarifying"],
    };
    const state = resolveConversationState(defaultContext, heatedIntel);
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("de_escalate");
    expect(strategies).not.toContain("playful");
    expect(strategies).not.toContain("flirty");
  });

  it("provides strategy recommendations with priorities", () => {
    const state = resolveConversationState(defaultContext, mockIntelligence);
    const result = selectStrategies(state);
    expect(result.ranked.length).toBeGreaterThan(0);
    expect(result.ranked[0].priority).toBe(1);
    expect(result.ranked[0].confidence).toBeGreaterThan(0);
  });

  it("selects boundary-setting strategies when user wants to set boundary", () => {
    const boundaryIntel: ConversationIntelligence = {
      ...mockIntelligence,
      userIntent: "set_boundary",
      situation: "boundary_setting",
    };
    const state = resolveConversationState(defaultContext, boundaryIntel);
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("boundary_setting");
    expect(strategies).toContain("assertive");
  });

  it("selects interview strategies for missed interview", () => {
    const interviewIntel: ConversationIntelligence = {
      ...mockIntelligence,
      context: "interview",
      situation: "missed_interview",
      relationship: "interviewer",
      recommendedStrategies: ["professional", "accountable", "reschedule_request"],
    };
    const state = resolveConversationState(defaultContext, interviewIntel);
    const result = selectStrategies(state);
    const strategies = result.ranked.map((r) => r.strategy);
    expect(strategies).toContain("professional");
  });

  it("works without intelligence", () => {
    const state = resolveConversationState(defaultContext, null);
    const result = selectStrategies(state);
    expect(result.ranked.length).toBeGreaterThan(0);
    expect(result.primary).toBeDefined();
  });
});

describe("rankReplies with state", () => {
  const candidates = [
    { text: "haha that's funny 😂", strategy: "funny" },
    { text: "hey you free tonight?", strategy: "flirty" },
    { text: "I need to talk to you about something important.", strategy: "professional" },
    { text: "tell me more", strategy: "natural" },
  ];

  it("boosts strategy-matched replies for dating context", () => {
    const state = resolveConversationState(defaultContext, mockIntelligence);
    const strategies = selectStrategies(state);
    const ranked = rankReplies(candidates, mockAnalysis, "flirt_naturally", state, strategies.ranked);
    const rankedStrategies = ranked.map((r) => r.strategy);

    const flirtyIdx = rankedStrategies.indexOf("flirty");

    expect(flirtyIdx).toBeLessThan(candidates.length - 1);
  });

  it("penalizes playful strategy in conflict context", () => {
    const conflictCandidates = [
      { text: "lol calm down", strategy: "playful" },
      { text: "I understand your frustration. Let's fix this.", strategy: "diplomatic" },
    ];

    const state = resolveConversationState(defaultContext, mockConflictIntelligence);
    const strategies = selectStrategies(state);
    const ranked = rankReplies(conflictCandidates, mockAnalysis, undefined, state, strategies.ranked);
    const rankedStrategies = ranked.map((r) => r.strategy);

    expect(rankedStrategies[0]).toBe("diplomatic");
    expect(rankedStrategies).toContain("playful");
  });

  it("boosts professional strategies in professional context", () => {
    const profCandidates = [
      { text: "haha nice", strategy: "playful" },
      { text: "I've reviewed the report and have feedback.", strategy: "professional" },
      { text: "The deadline is tomorrow.", strategy: "concise" },
    ];

    const state = resolveConversationState(
      { ...defaultContext, conversationType: "professional" },
      mockProfessionalIntelligence
    );
    const strategies = selectStrategies(state);
    const ranked = rankReplies(profCandidates, mockAnalysis, undefined, state, strategies.ranked);
    const rankedStrategies = ranked.map((r) => r.strategy);

    expect(rankedStrategies[0]).not.toBe("playful");
  });

  it("still ranks by AI-likeness when state is provided", () => {
    const aiLikely = "That sounds absolutely fascinating! I'd love to hear more about that.";
    const natural = "oh cool lol";

    const testCandidates = [
      { text: aiLikely, strategy: "natural" },
      { text: natural, strategy: "playful" },
    ];

    const state = resolveConversationState(defaultContext, mockIntelligence);
    const strategies = selectStrategies(state);
    const ranked = rankReplies(testCandidates, mockAnalysis, undefined, state, strategies.ranked);

    expect(ranked[0].text).toBe(natural);
  });

  it("works without state (backward compatible)", () => {
    const ranked = rankReplies(candidates, mockAnalysis, "flirt_naturally");
    expect(ranked.length).toBe(candidates.length);
  });
});
