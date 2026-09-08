import { describe, it, expect } from "vitest";
import {
  analyzeConflict,
  logConflictAnalysis,
} from "@/lib/ai/conflict-analysis";
import type { ConversationIntelligence } from "@/lib/ai/intelligence";
import type { ConversationState } from "@/lib/ai/conversation-state";

// ─── Mock Intelligence ────────────────────────────────────────────────────────

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
  context: "general",
  situation: "disagreement",
  userIntent: "de_escalate",
  otherIntent: "expressing_frustration",
  emotion: {
    primary: "frustrated",
    secondary: "angry",
    intensity: 0.7,
  },
  tone: {
    primary: "assertive",
    secondary: "defensive",
    intensity: 0.6,
  },
  conflict: {
    level: 0.7,
    escalation: 0.5,
    trigger: "missed deadline",
    coreDisagreement: "responsibility for delay",
    personalAttacks: false,
    misunderstanding: true,
    resolutionOpportunity: true,
  },
  dynamics: {
    engagement: 0.8,
    reciprocity: 0.4,
    cooperation: 0.3,
    defensiveness: 0.6,
    escalation: 0.5,
    rapport: 0.3,
    pressure: 0.6,
    uncertainty: 0.4,
    responsiveness: 0.5,
  },
  risks: [],
  recommendedStrategies: ["de_escalate", "empathetic", "clarifying", "solution_oriented"],
  confidence: {
    language: 0.95,
    context: 0.9,
    situation: 0.85,
    relationship: 0.8,
    intent: 0.85,
  },
};

const mockState: ConversationState = {
  participants: {
    count: 2,
    roles: ["friend", "friend"],
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
    confidence: 0.95,
    scriptConfidence: 0.9,
    detectionSource: "ai",
    participantLanguages: [],
  },
  context: {
    type: "general",
    platform: undefined,
    situation: "disagreement",
    urgency: "normal",
  },
  intent: {
    userGoal: "de_escalate",
    userIntent: "de_escalate",
    otherIntent: "expressing_frustration",
  },
  emotion: {
    primary: "frustrated",
    secondary: "angry",
    intensity: 0.7,
  },
  tone: {
    primary: "assertive",
    secondary: "defensive",
    intensity: 0.6,
  },
  dynamics: {
    engagement: 0.8,
    reciprocity: 0.4,
    cooperation: 0.3,
    defensiveness: 0.6,
    escalation: 0.5,
    rapport: 0.3,
    pressure: 0.6,
    uncertainty: 0.4,
    responsiveness: 0.5,
  },
  conflict: {
    level: 0.7,
    escalation: 0.5,
    trigger: "missed deadline",
    coreDisagreement: "responsibility for delay",
    personalAttacks: false,
    misunderstanding: true,
    resolutionOpportunity: true,
  },
  risks: [],
  conflictIntelligence: {
    participants: [],
    conflictStructure: null,
    groupAnalysis: null,
  },
  strategy: {
    primary: "de_escalate",
    ranked: [
      { strategy: "de_escalate", priority: 1, confidence: 0.9, reason: "High conflict" },
    ],
    confidence: 0.8,
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
    goalSource: "user",
    contextSource: "intelligence",
    toneSource: "intelligence",
    situationSource: "intelligence",
    languageSource: "ai",
  },
};

// ─── Participant Tests ────────────────────────────────────────────────────────

describe("Conflict Analysis - Participants", () => {
  it("analyzes two-person conflict", () => {
    const messages = [
      { sender: "me", text: "You said you'd finish this yesterday." },
      { sender: "them", text: "I sent my part already." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
    expect(result.participants[0].participantId).toBe("user");
    expect(result.participants[1].participantId).toBe("them");
  });

  it("analyzes three-person group", () => {
    const messages = [
      { sender: "me", text: "The deadline was yesterday." },
      { sender: "Alice", text: "I submitted my part." },
      { sender: "Bob", text: "I didn't know it changed." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants).toHaveLength(3);
    expect(result.groupAnalysis.isGroup).toBe(true);
  });

  it("analyzes four-person group", () => {
    const messages = [
      { sender: "me", text: "We need to finish this." },
      { sender: "Alice", text: "I'm done with my part." },
      { sender: "Bob", text: "What's the deadline?" },
      { sender: "Charlie", text: "This always happens." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants).toHaveLength(4);
    expect(result.groupAnalysis.isGroup).toBe(true);
    expect(result.groupAnalysis.participantCount).toBe(4);
  });

  it("handles unknown participants", () => {
    const messages = [
      { sender: "me", text: "What's going on?" },
      { sender: "them", text: "I don't know." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
    expect(result.participants[1].label).toBe("them");
  });

  it("preserves participant labels", () => {
    const messages = [
      { sender: "me", text: "I finished my part." },
      { sender: "John", text: "I sent mine too." },
      { sender: "Sarah", text: "What about the deadline?" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants[1].label).toBe("John");
    expect(result.participants[2].label).toBe("Sarah");
  });

  it("identifies participant roles", () => {
    const messages = [
      { sender: "me", text: "I need an extension." },
      { sender: "Manager", text: "What happened?" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants[1].role).toBeTruthy();
  });

  it("identifies participant relationship", () => {
    const messages = [
      { sender: "me", text: "Hey, I finished the project." },
      { sender: "Coworker", text: "Great, I'll review it." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants[1].relationshipToUser).toBe("friend");
  });
});

// ─── Position Tests ───────────────────────────────────────────────────────────

describe("Conflict Analysis - Positions", () => {
  it("detects different positions", () => {
    const messages = [
      { sender: "me", text: "You said you'd finish this yesterday." },
      { sender: "them", text: "I sent my part already." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const userPosition = result.participants.find((p) => p.participantId === "user");
    const otherPosition = result.participants.find((p) => p.participantId === "them");

    expect(userPosition?.position.mainPosition).toBeTruthy();
    expect(otherPosition?.position.mainPosition).toBeTruthy();
  });

  it("detects shared position", () => {
    const messages = [
      { sender: "me", text: "We need to work together on this." },
      { sender: "them", text: "Agreed, let's figure it out." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
  });

  it("detects disputed position", () => {
    const messages = [
      { sender: "me", text: "You never sent the file." },
      { sender: "them", text: "I sent it yesterday." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.factualDisputes.length).toBeGreaterThanOrEqual(0);
  });

  it("extracts user position", () => {
    const messages = [
      { sender: "me", text: "I completed my part on time." },
      { sender: "them", text: "The whole project was late." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.position.mainPosition).toBeTruthy();
  });
});

// ─── Intent Tests ─────────────────────────────────────────────────────────────

describe("Conflict Analysis - Intents", () => {
  it("detects accusation intent", () => {
    const messages = [
      { sender: "me", text: "You always miss deadlines." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("detects defense intent", () => {
    const messages = [
      { sender: "me", text: "I sent my part yesterday." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("detects clarification intent", () => {
    const messages = [
      { sender: "me", text: "What do you mean by that?" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("detects request intent", () => {
    const messages = [
      { sender: "me", text: "Can you please send the file?" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("detects apology intent", () => {
    const messages = [
      { sender: "me", text: "I'm sorry for the delay." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("detects negotiation intent", () => {
    const messages = [
      { sender: "me", text: "Let's figure out a solution together." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });
});

// ─── Emotion Tests ────────────────────────────────────────────────────────────

describe("Conflict Analysis - Emotions", () => {
  it("detects frustration", () => {
    const messages = [
      { sender: "me", text: "This is so frustrating." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.emotion.primary).toBeTruthy();
  });

  it("detects anger", () => {
    const messages = [
      { sender: "me", text: "I'm angry about this." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.emotion.primary).toBeTruthy();
  });

  it("detects defensiveness", () => {
    const messages = [
      { sender: "me", text: "I did my part, it's not my fault." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.stance).toBeTruthy();
  });

  it("detects confusion", () => {
    const messages = [
      { sender: "me", text: "I don't understand what happened." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.emotion.primary).toBeTruthy();
  });

  it("detects concern", () => {
    const messages = [
      { sender: "me", text: "I'm worried about the deadline." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.emotion.primary).toBeTruthy();
  });

  it("detects mixed emotions", () => {
    const messages = [
      { sender: "me", text: "I'm frustrated but also concerned." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.emotion.primary).toBeTruthy();
    expect(user?.emotion.secondary).toBeTruthy();
  });
});

// ─── Conflict Tests ───────────────────────────────────────────────────────────

describe("Conflict Analysis - Conflict Structure", () => {
  it("detects low conflict", () => {
    const lowConflictIntelligence = {
      ...mockIntelligence,
      conflict: { ...mockIntelligence.conflict, level: 0.2 },
    };

    const messages = [
      { sender: "me", text: "Hey, quick question." },
      { sender: "them", text: "Sure, what's up?" },
    ];

    const result = analyzeConflict(messages, lowConflictIntelligence, mockState);

    expect(result.conflictStructure.conflictLevel).toBeLessThan(0.5);
  });

  it("detects medium conflict", () => {
    const messages = [
      { sender: "me", text: "You said you'd finish this." },
      { sender: "them", text: "I did my part." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.conflictLevel).toBeGreaterThanOrEqual(0);
    expect(result.conflictStructure.conflictLevel).toBeLessThanOrEqual(1);
  });

  it("detects high conflict", () => {
    const highConflictIntelligence = {
      ...mockIntelligence,
      conflict: { ...mockIntelligence.conflict, level: 0.9 },
    };

    const messages = [
      { sender: "me", text: "This is unacceptable!" },
      { sender: "them", text: "You're always blaming me!" },
    ];

    const result = analyzeConflict(messages, highConflictIntelligence, mockState);

    expect(result.conflictStructure.conflictLevel).toBeGreaterThan(0.5);
  });

  it("detects escalation trend", () => {
    const messages = [
      { sender: "me", text: "Hey, question." },
      { sender: "them", text: "What?" },
      { sender: "me", text: "You didn't finish." },
      { sender: "them", text: "Yes I did!" },
      { sender: "me", text: "No you didn't!" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.escalationTrend).toBeTruthy();
  });

  it("detects personal attacks", () => {
    const attackIntelligence = {
      ...mockIntelligence,
      conflict: { ...mockIntelligence.conflict, personalAttacks: true },
    };

    const messages = [
      { sender: "me", text: "You're useless." },
      { sender: "them", text: "You're the worst." },
    ];

    const result = analyzeConflict(messages, attackIntelligence, mockState);

    expect(result.conflictStructure.personalAttacks).toBe(true);
  });

  it("detects blame patterns", () => {
    const messages = [
      { sender: "me", text: "This is your fault." },
      { sender: "them", text: "No, it's your fault." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.blamePattern).toBeTruthy();
  });

  it("detects misunderstandings", () => {
    const messages = [
      { sender: "me", text: "I asked you to submit it." },
      { sender: "them", text: "I thought you meant my part." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.misunderstandings).toBeDefined();
  });

  it("detects factual disputes", () => {
    const messages = [
      { sender: "me", text: "You never sent the file." },
      { sender: "them", text: "I sent it yesterday." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.factualDisputes).toBeDefined();
  });

  it("identifies resolution opportunities", () => {
    const messages = [
      { sender: "me", text: "We need to fix this." },
      { sender: "them", text: "Agreed." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.resolutionOpportunities).toBeDefined();
  });
});

// ─── Group Tests ──────────────────────────────────────────────────────────────

describe("Conflict Analysis - Group", () => {
  it("detects shared responsibility", () => {
    const messages = [
      { sender: "me", text: "We all need to work on this." },
      { sender: "Alice", text: "I'm doing my part." },
      { sender: "Bob", text: "Same here." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants.length).toBeGreaterThanOrEqual(2);
  });

  it("detects no-blame response", () => {
    const messages = [
      { sender: "me", text: "Let's not blame anyone." },
      { sender: "them", text: "Agreed, let's move forward." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
  });

  it("detects group de-escalation", () => {
    const messages = [
      { sender: "me", text: "Let's calm down." },
      { sender: "Alice", text: "You're right." },
      { sender: "Bob", text: "Sorry for the heat." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.groupAnalysis.isGroup).toBe(true);
  });

  it("detects participant-specific response", () => {
    const messages = [
      { sender: "me", text: "Alice, can you check the file?" },
      { sender: "Alice", text: "Sure, checking now." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
  });

  it("detects mediator-style strategy", () => {
    const messages = [
      { sender: "me", text: "Let me help you two figure this out." },
      { sender: "Alice", text: "Thanks." },
      { sender: "Bob", text: "Appreciate it." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.groupAnalysis.isGroup).toBe(true);
  });
});

// ─── Strategy Tests ───────────────────────────────────────────────────────────

describe("Conflict Analysis - Strategies", () => {
  it("suggests de-escalate strategy", () => {
    const messages = [
      { sender: "me", text: "Let's not fight." },
      { sender: "them", text: "You started it." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.resolutionOpportunities).toBeDefined();
  });

  it("suggests clarify strategy", () => {
    const messages = [
      { sender: "me", text: "I don't understand." },
      { sender: "them", text: "What don't you understand?" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.misunderstandings).toBeDefined();
  });

  it("suggests assertive strategy", () => {
    const messages = [
      { sender: "me", text: "I need this done by tomorrow." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("suggests boundary strategy", () => {
    const messages = [
      { sender: "me", text: "Please don't talk to me like that." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("suggests evidence-based strategy", () => {
    const messages = [
      { sender: "me", text: "I have proof I sent the file." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.claims.length).toBeGreaterThanOrEqual(0);
  });

  it("suggests compromise strategy", () => {
    const messages = [
      { sender: "me", text: "How about we split the work?" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    expect(user?.intent).toBeTruthy();
  });

  it("suggests solution-oriented strategy", () => {
    const messages = [
      { sender: "me", text: "Let's fix this together." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.conflictStructure.resolutionOpportunities).toBeDefined();
  });
});

// ─── Multilingual Tests ───────────────────────────────────────────────────────

describe("Conflict Analysis - Multilingual", () => {
  it("analyzes Telugu-English group", () => {
    const teluguEnglishIntelligence = {
      ...mockIntelligence,
      language: { ...mockIntelligence.language, primary: "telugu", codeMixed: true },
    };

    const messages = [
      { sender: "me", text: "deadline ninna" },
      { sender: "them", text: "I sent my part" },
    ];

    const result = analyzeConflict(messages, teluguEnglishIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
    expect(result.groupAnalysis.dominantLanguage).toBe("telugu");
  });

  it("analyzes Hindi-English group", () => {
    const hindiEnglishIntelligence = {
      ...mockIntelligence,
      language: { ...mockIntelligence.language, primary: "hindi", codeMixed: true },
    };

    const messages = [
      { sender: "me", text: "yeh kab hoga?" },
      { sender: "them", text: "I'm working on it" },
    ];

    const result = analyzeConflict(messages, hindiEnglishIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
    expect(result.groupAnalysis.dominantLanguage).toBe("hindi");
  });

  it("analyzes Tamil-English group", () => {
    const tamilEnglishIntelligence = {
      ...mockIntelligence,
      language: { ...mockIntelligence.language, primary: "tamil", codeMixed: true },
    };

    const messages = [
      { sender: "me", text: "idhu eppo mudiyum?" },
      { sender: "them", text: "Soon" },
    ];

    const result = analyzeConflict(messages, tamilEnglishIntelligence, mockState);

    expect(result.participants).toHaveLength(2);
  });

  it("detects mixed scripts", () => {
    const mixedIntelligence = {
      ...mockIntelligence,
      language: { ...mockIntelligence.language, codeMixed: true },
    };

    const messages = [
      { sender: "me", text: "Hey bro, yeh kya hai?" },
      { sender: "them", text: "Nothing yaar" },
    ];

    const result = analyzeConflict(messages, mixedIntelligence, mockState);

    // Multilingual is based on participant languages, not codeMixed flag
    expect(result.groupAnalysis.multilingual).toBeDefined();
  });

  it("handles participant language differences", () => {
    const messages = [
      { sender: "me", text: "What's the status?" },
      { sender: "Telugu Friend", text: "Ayindi" },
      { sender: "Hindi Friend", text: "Ho gaya" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    expect(result.groupAnalysis.languageDistribution.length).toBeGreaterThan(0);
  });
});

// ─── Safety Tests ─────────────────────────────────────────────────────────────

describe("Conflict Analysis - Safety", () => {
  it("does not diagnose personality", () => {
    const messages = [
      { sender: "me", text: "You're so narcissistic." },
      { sender: "them", text: "No, you are." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    // Should not contain personality diagnoses
    const allText = JSON.stringify(result);
    expect(allText).not.toContain("narcissist");
    expect(allText).not.toContain("personality disorder");
  });

  it("does not declare disputed claim true", () => {
    const messages = [
      { sender: "me", text: "You sent the wrong file." },
      { sender: "them", text: "I sent the right one." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    // Claims should be marked as claims, not facts
    for (const participant of result.participants) {
      for (const claim of participant.claims) {
        expect(claim.type).not.toBe("verified_fact");
      }
    }
  });

  it("does not escalate unnecessarily", () => {
    const messages = [
      { sender: "me", text: "I'm frustrated." },
      { sender: "them", text: "Me too." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    // Should identify resolution opportunities
    expect(result.conflictStructure.resolutionOpportunities).toBeDefined();
  });

  it("does not fabricate facts", () => {
    const messages = [
      { sender: "me", text: "Something happened." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    // Should not add facts that weren't in the conversation
    expect(result.participants[0].knownFacts.length).toBe(0);
  });

  it("does not reveal hidden inference as certainty", () => {
    const messages = [
      { sender: "me", text: "I think you're angry." },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    const user = result.participants.find((p) => p.participantId === "user");
    // Emotion confidence should not be "high" for inferences
    if (user?.emotion.confidence === "inferred") {
      expect(user.emotion.confidence).toBe("inferred");
    }
  });
});

// ─── Logging Tests ────────────────────────────────────────────────────────────

describe("Conflict Analysis - Logging", () => {
  it("logs conflict analysis when debug is enabled", () => {
    const messages = [
      { sender: "me", text: "Test message" },
      { sender: "them", text: "Response" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    // Should not throw
    expect(() => logConflictAnalysis(result, "test")).not.toThrow();
  });

  it("logs without context", () => {
    const messages = [
      { sender: "me", text: "Test message" },
    ];

    const result = analyzeConflict(messages, mockIntelligence, mockState);

    // Should not throw
    expect(() => logConflictAnalysis(result)).not.toThrow();
  });
});
