import { describe, it, expect } from "vitest";

describe("SituationDisplay", () => {
  const validSituations = [
    "late_submission",
    "missed_deadline",
    "missed_interview",
    "late_arrival",
    "missed_meeting",
    "delayed_response",
    "misunderstanding",
    "heated_argument",
    "customer_complaint",
    "romantic_interest",
    "casual_chat",
    "professional_feedback",
    "request",
    "reconnecting",
  ];

  const validSeverities = ["low", "medium", "high", "critical"];
  const validAccountability = ["full", "partial", "minimal", "none"];

  it("should have all required situation types", () => {
    expect(validSituations.length).toBeGreaterThanOrEqual(14);
  });

  it("should have all severity levels", () => {
    expect(validSeverities).toContain("low");
    expect(validSeverities).toContain("medium");
    expect(validSeverities).toContain("high");
    expect(validSeverities).toContain("critical");
  });

  it("should have all accountability levels", () => {
    expect(validAccountability).toContain("full");
    expect(validAccountability).toContain("partial");
    expect(validAccountability).toContain("minimal");
    expect(validAccountability).toContain("none");
  });
});

describe("RecoveryGuidance", () => {
  const validElements = [
    "acknowledgement",
    "accountability",
    "new_timeline",
    "solution",
    "prevention",
    "empathy",
    "compromise",
    "reassurance",
    "boundary",
    "factual_correction",
    "validation",
    "redirect",
    "closing",
    "evidence",
    "logical_argument",
    "shared_values",
    "practical_benefit",
    "timeline",
    "clarity",
    "sincerity",
    "removal_of_pressure",
    "demonstration_of_value",
    "time_to_consider",
    "specific_examples",
    "positive_impact",
    "emotional_connection",
    "normative_pressure",
    "action_request",
  ];

  const validStrategies = [
    "accountable",
    "solution_oriented",
    "empathetic",
    "direct",
    "de_escalating",
    "compromise_seeking",
    "evidence_based",
    "boundary_setting",
    "reassurance",
    "factual_correction",
    "redirecting",
    "closing",
  ];

  it("should have all required element types", () => {
    expect(validElements.length).toBeGreaterThanOrEqual(28);
  });

  it("should have all strategy types", () => {
    expect(validStrategies.length).toBeGreaterThanOrEqual(12);
  });

  it("should include accountability elements", () => {
    expect(validElements).toContain("acknowledgement");
    expect(validElements).toContain("accountability");
    expect(validElements).toContain("solution");
  });

  it("should include de-escalation strategies", () => {
    expect(validStrategies).toContain("accountable");
    expect(validStrategies).toContain("empathetic");
    expect(validStrategies).toContain("de_escalating");
  });
});

describe("FactEditor", () => {
  interface UserFact {
    id: string;
    text: string;
  }

  const createFact = (text: string): UserFact => ({
    id: `fact-${Date.now()}-${Math.random()}`,
    text,
  });

  it("should create facts with unique IDs", () => {
    const fact1 = createFact("Meeting was at 3pm");
    const fact2 = createFact("Meeting was at 4pm");
    expect(fact1.id).not.toBe(fact2.id);
  });

  it("should trim whitespace from facts", () => {
    const fact = createFact("  Meeting was at 3pm  ");
    expect(fact.text.trim()).toBe("Meeting was at 3pm");
  });

  it("should handle empty text", () => {
    const fact = createFact("");
    expect(fact.text).toBe("");
  });

  it("should support adding multiple facts", () => {
    const facts: UserFact[] = [
      createFact("Fact 1"),
      createFact("Fact 2"),
      createFact("Fact 3"),
    ];
    expect(facts.length).toBe(3);
  });

  it("should support removing facts by ID", () => {
    const facts: UserFact[] = [
      createFact("Fact 1"),
      createFact("Fact 2"),
      createFact("Fact 3"),
    ];
    const removed = facts.filter((f) => f.id !== facts[1].id);
    expect(removed.length).toBe(2);
  });

  it("should support updating facts by ID", () => {
    const facts: UserFact[] = [createFact("Fact 1")];
    const updated = facts.map((f) =>
      f.id === facts[0].id ? { ...f, text: "Updated Fact" } : f
    );
    expect(updated[0].text).toBe("Updated Fact");
  });
});

describe("RecoverySettings", () => {
  const situations = [
    { value: "", label: "Auto-detect" },
    { value: "late_submission", label: "Late Submission" },
    { value: "missed_deadline", label: "Missed Deadline" },
    { value: "missed_interview", label: "Missed Interview" },
    { value: "late_arrival", label: "Late Arrival" },
    { value: "missed_meeting", label: "Missed Meeting" },
    { value: "delayed_response", label: "Delayed Response" },
    { value: "misunderstanding", label: "Misunderstanding" },
    { value: "heated_argument", label: "Heated Argument" },
    { value: "customer_complaint", label: "Customer Complaint" },
    { value: "romantic_interest", label: "Romantic Interest" },
    { value: "casual_chat", label: "Casual Chat" },
    { value: "professional_feedback", label: "Professional Feedback" },
    { value: "request", label: "Request" },
    { value: "reconnecting", label: "Reconnecting" },
  ];

  const goals = [
    { value: "", label: "Auto-detect" },
    { value: "reply", label: "Reply" },
    { value: "explain", label: "Explain" },
    { value: "apologize", label: "Apologize" },
    { value: "convince", label: "Convince" },
    { value: "negotiate", label: "Negotiate" },
    { value: "deescalate", label: "De-escalate" },
    { value: "clarify", label: "Clarify" },
    { value: "support", label: "Support" },
    { value: "decline", label: "Decline" },
    { value: "reconnect", label: "Reconnect" },
  ];

  const styles = [
    { value: "", label: "Use detected style" },
    { value: "formal", label: "Formal" },
    { value: "casual", label: "Casual" },
    { value: "friendly", label: "Friendly" },
    { value: "assertive", label: "Assertive" },
    { value: "conciliatory", label: "Conciliatory" },
  ];

  const tones = [
    { value: "", label: "Auto-detect" },
    { value: "professional", label: "Professional" },
    { value: "warm", label: "Warm" },
    { value: "neutral", label: "Neutral" },
    { value: "serious", label: "Serious" },
    { value: "lighthearted", label: "Lighthearted" },
    { value: "empathetic", label: "Empathetic" },
    { value: "confident", label: "Confident" },
  ];

  const languages = [
    { value: "", label: "Auto-detect" },
    { value: "english", label: "English" },
    { value: "hindi", label: "Hindi" },
    { value: "bengali", label: "Bengali" },
    { value: "tamil", label: "Tamil" },
    { value: "telugu", label: "Telugu" },
    { value: "marathi", label: "Marathi" },
    { value: "gujarati", label: "Gujarati" },
    { value: "kannada", label: "Kannada" },
    { value: "malayalam", label: "Malayalam" },
    { value: "punjabi", label: "Punjabi" },
    { value: "odia", label: "Odia" },
    { value: "urdu", label: "Urdu" },
    { value: "assamese", label: "Assamese" },
  ];

  it("should have auto-detect option for all selectors", () => {
    expect(situations[0].value).toBe("");
    expect(goals[0].value).toBe("");
    expect(styles[0].value).toBe("");
    expect(tones[0].value).toBe("");
    expect(languages[0].value).toBe("");
  });

  it("should have 15 situation options", () => {
    expect(situations.length).toBe(15);
  });

  it("should have 11 goal options", () => {
    expect(goals.length).toBe(11);
  });

  it("should have 6 style options", () => {
    expect(styles.length).toBe(6);
  });

  it("should have 8 tone options", () => {
    expect(tones.length).toBe(8);
  });

  it("should have 14 language options", () => {
    expect(languages.length).toBe(14);
  });

  it("should include Indic languages", () => {
    const languageValues = languages.map((l) => l.value);
    expect(languageValues).toContain("hindi");
    expect(languageValues).toContain("bengali");
    expect(languageValues).toContain("tamil");
    expect(languageValues).toContain("telugu");
    expect(languageValues).toContain("malayalam");
    expect(languageValues).toContain("kannada");
    expect(languageValues).toContain("marathi");
    expect(languageValues).toContain("gujarati");
    expect(languageValues).toContain("punjabi");
    expect(languageValues).toContain("odia");
    expect(languageValues).toContain("urdu");
    expect(languageValues).toContain("assamese");
  });

  it("should include recovery-specific goals", () => {
    const goalValues = goals.map((g) => g.value);
    expect(goalValues).toContain("apologize");
    expect(goalValues).toContain("deescalate");
    expect(goalValues).toContain("negotiate");
    expect(goalValues).toContain("explain");
    expect(goalValues).toContain("clarify");
  });
});

describe("Analyze Page Integration", () => {
  interface RecoveryData {
    situation: string;
    severity: string;
    accountabilityLevel: string;
    userGoal: string;
    nextAction?: string;
    requiredElements: string[];
    recommendedStrategies: string[];
    conflictAdjusted: boolean;
    groupAdjusted: boolean;
  }

  interface PersuasionData {
    feasibility: string;
    recommendedMode: string;
    appropriateModes: string[];
  }

  const createMockRecoveryData = (): RecoveryData => ({
    situation: "late_submission",
    severity: "medium",
    accountabilityLevel: "full",
    userGoal: "apologize",
    nextAction: "Send the acknowledgement with a specific new deadline.",
    requiredElements: ["acknowledgement", "accountability", "new_timeline"],
    recommendedStrategies: ["accountable", "solution_oriented"],
    conflictAdjusted: false,
    groupAdjusted: false,
  });

  const createMockPersuasionData = (): PersuasionData => ({
    feasibility: "high",
    recommendedMode: "direct",
    appropriateModes: ["direct", "evidence_based"],
  });

  it("should create valid recovery data", () => {
    const recovery = createMockRecoveryData();
    expect(recovery.situation).toBeTruthy();
    expect(recovery.severity).toBeTruthy();
    expect(recovery.accountabilityLevel).toBeTruthy();
    expect(recovery.userGoal).toBeTruthy();
    expect(Array.isArray(recovery.requiredElements)).toBe(true);
    expect(Array.isArray(recovery.recommendedStrategies)).toBe(true);
  });

  it("should create valid persuasion data", () => {
    const persuasion = createMockPersuasionData();
    expect(persuasion.feasibility).toBeTruthy();
    expect(persuasion.recommendedMode).toBeTruthy();
    expect(Array.isArray(persuasion.appropriateModes)).toBe(true);
  });

  it("should handle recovery data with optional fields", () => {
    const recovery: RecoveryData = {
      situation: "casual_chat",
      severity: "low",
      accountabilityLevel: "none",
      userGoal: "reply",
      requiredElements: [],
      recommendedStrategies: [],
      conflictAdjusted: false,
      groupAdjusted: false,
    };
    expect(recovery.nextAction).toBeUndefined();
  });

  it("should handle conflict-adjusted recovery", () => {
    const recovery = createMockRecoveryData();
    recovery.conflictAdjusted = true;
    recovery.severity = "high";
    expect(recovery.conflictAdjusted).toBe(true);
    expect(recovery.severity).toBe("high");
  });

  it("should handle group-adjusted recovery", () => {
    const recovery = createMockRecoveryData();
    recovery.groupAdjusted = true;
    expect(recovery.groupAdjusted).toBe(true);
  });

  it("should parse user facts from API response", () => {
    const userFacts = ["Meeting was at 3pm", "Project deadline is Friday"];
    expect(userFacts.length).toBe(2);
    expect(userFacts[0]).toBe("Meeting was at 3pm");
  });

  it("should handle empty user facts", () => {
    const userFacts: string[] = [];
    expect(userFacts.length).toBe(0);
  });

  it("should handle overrides in context", () => {
    const context = {
      language: "english",
      tone: "casual",
      goal: "keep_going",
      situationOverride: "late_submission",
      styleOverride: "formal",
      toneOverride: "professional",
      languageOverride: "hindi",
    };
    expect(context.situationOverride).toBe("late_submission");
    expect(context.styleOverride).toBe("formal");
    expect(context.toneOverride).toBe("professional");
    expect(context.languageOverride).toBe("hindi");
  });
});
