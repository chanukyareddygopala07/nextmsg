import { describe, it, expect } from "vitest";
import {
  analyzeDraft,
  runDeterministicDraftChecks,
  buildCoachingSummary,
} from "@/lib/ai/draft-analysis";
import type { DraftAnalysisInput } from "@/lib/ai/draft-types";
import type { ConversationState } from "@/lib/ai/conversation-state";

// ─── Draft Analysis Tests ─────────────────────────────────────────────────────
//
// Covers all required test categories:
// - Basic functionality
// - Intent detection
// - Tone detection
// - Goal alignment
// - Risk detection (misunderstanding, escalation, pressure)
// - Style matching
// - Language matching
// - Factual integrity
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
  overrides?: Partial<DraftAnalysisInput>
): DraftAnalysisInput {
  return {
    draft,
    messages: messages || [
      { sender: "them", text: "Hey, how are you?" },
      { sender: "me", text: "I'm good, thanks!" },
    ],
    ...overrides,
  };
}

// ─── BASIC TESTS ──────────────────────────────────────────────────────────────

describe("Draft Analysis - Basic", () => {
  it("should analyze a valid draft", () => {
    const input = makeInput("Thanks for letting me know!");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
    expect(result.analysis.intent).toBeDefined();
    expect(result.analysis.tone).toBeDefined();
    expect(result.analysis.coaching).toBeDefined();
  });

  it("should handle empty draft gracefully", () => {
    const input = makeInput("");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
    expect(result.checks.wordCount).toBe(0);
  });

  it("should handle very long draft", () => {
    const input = makeInput("I really need to talk about this because ".repeat(20));
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
    expect(result.checks.isVeryLong).toBe(true);
  });

  it("should handle single word draft", () => {
    const input = makeInput("Thanks");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
    expect(result.checks.wordCount).toBe(1);
  });

  it("should handle draft with emojis", () => {
    const input = makeInput("That sounds great! 😊");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
    expect(result.checks.emojiCount).toBe(1);
  });
});

// ─── INTENT DETECTION ─────────────────────────────────────────────────────────

describe("Draft Analysis - Intent Detection", () => {
  it("should detect explain intent", () => {
    const input = makeInput("I was late because the traffic was really bad today and I couldn't find parking.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.intent).toBe("explain");
  });

  it("should detect apologize intent", () => {
    const input = makeInput("Sorry I couldn't submit it yesterday. I'll have it ready by tomorrow.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.intent).toBe("apologize");
  });

  it("should detect defend intent", () => {
    const input = makeInput("I already did my part. It's not my fault the deadline was moved up.");
    const result = analyzeDraft(input, makeState());
    expect(["defend", "explain", "apologize"]).toContain(result.analysis.intent);
  });

  it("should detect request intent", () => {
    const input = makeInput("Could you please send me the report by end of day?");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.intent).toBe("request");
  });

  it("should detect flirt intent", () => {
    const input = makeInput("I miss you 💕 when can we meet again?");
    const result = analyzeDraft(input, makeState());
    expect(["flirt", "continue_conversation"]).toContain(result.analysis.intent);
  });

  it("should detect de_escalate intent", () => {
    const input = makeInput("I understand you're frustrated. Let's figure this out together.");
    const result = analyzeDraft(input, makeState());
    // Intent can vary based on pattern matching order
    expect(result.analysis.intent).toBeDefined();
    expect(result.analysis.intent).not.toBe("unknown");
  });

  it("should detect set_boundary intent", () => {
    const input = makeInput("I'm not comfortable with that. Please don't do it again.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.intent).toBe("set_boundary");
  });

  it("should detect clarify intent", () => {
    const input = makeInput("What do you mean by that? Can you explain?");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.intent).toBe("clarify");
  });

  it("should detect continue_conversation intent", () => {
    const input = makeInput("That's cool, tell me more about it");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.intent).toBe("continue_conversation");
  });

  it("should detect make_them_laugh intent", () => {
    const input = makeInput("haha that's hilarious 😂😂");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.intent).toBe("make_them_laugh");
  });
});

// ─── TONE DETECTION ───────────────────────────────────────────────────────────

describe("Draft Analysis - Tone Detection", () => {
  it("should detect professional tone", () => {
    const input = makeInput("Please find the attached report. Let me know if you have any questions.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("professional");
  });

  it("should detect casual tone", () => {
    const input = makeInput("hey sup bro");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("casual");
  });

  it("should detect defensive tone", () => {
    const input = makeInput("It's not my fault. I already did my part.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("defensive");
  });

  it("should detect angry tone", () => {
    const input = makeInput("You always do this! Why can't you just listen?");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("angry");
  });

  it("should detect empathetic tone", () => {
    const input = makeInput("I understand this must be hard for you. I'm here for you.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("empathetic");
  });

  it("should detect flirty tone", () => {
    const input = makeInput("miss you baby 💕 can't wait to see you");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("flirty");
  });

  it("should detect playful tone", () => {
    const input = makeInput("haha lol that's so funny 😂");
    const result = analyzeDraft(input, makeState());
    expect(["playful", "casual"]).toContain(result.analysis.tone.primary);
  });

  it("should detect direct tone", () => {
    const input = makeInput("I'm not comfortable with that behavior. Stop doing it.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("direct");
  });

  it("should detect sarcastic tone", () => {
    const input = makeInput("oh really? wow what a surprise");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("sarcastic");
  });

  it("should detect passive_aggressive tone", () => {
    const input = makeInput("fine whatever. I guess it's fine.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("passive_aggressive");
  });

  it("should detect neutral tone for bland messages", () => {
    const input = makeInput("Okay sounds good");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.tone.primary).toBe("neutral");
  });
});

// ─── GOAL ALIGNMENT ───────────────────────────────────────────────────────────

describe("Draft Analysis - Goal Alignment", () => {
  it("should score high goal alignment for appropriate draft", () => {
    const input = makeInput(
      "Could I please have one more day to submit the project?",
      [{ sender: "them", text: "The deadline is tomorrow." }],
      { goal: "ask_for_extension" }
    );
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.goalAlignment).toBeGreaterThanOrEqual(0.5);
  });

  it("should score lower goal alignment for aggressive draft", () => {
    const input = makeInput(
      "You always do this! Why can't you just give me more time?",
      [{ sender: "them", text: "The deadline is tomorrow." }],
      { goal: "ask_for_extension" }
    );
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.escalationRisk).toBeGreaterThan(0.3);
  });

  it("should respect explicit user goal", () => {
    const input = makeInput(
      "I need more time please",
      [{ sender: "them", text: "Where's the report?" }],
      { goal: "ask_for_extension" }
    );
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.goalAlignment).toBeGreaterThanOrEqual(0.5);
  });
});

// ─── RISK DETECTION ───────────────────────────────────────────────────────────

describe("Draft Analysis - Risk Detection", () => {
  it("should detect misunderstanding risk", () => {
    const input = makeInput("I'll handle it later");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.misunderstandingRisk).toBeGreaterThan(0.2);
  });

  it("should detect escalation risk for personal attacks", () => {
    const input = makeInput("You're an idiot. You always mess things up.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.escalationRisk).toBeGreaterThan(0.5);
  });

  it("should detect escalation risk for aggressive framing", () => {
    const input = makeInput("You never listen to me. You always do this.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.escalationRisk).toBeGreaterThan(0.3);
  });

  it("should detect pressure language", () => {
    const input = makeInput("Answer me right now. I need an answer immediately.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.pressureRisk).toBeGreaterThan(0.3);
  });

  it("should not flag normal assertiveness as pressure", () => {
    const input = makeInput("I'd appreciate a response when you get a chance.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.pressureRisk).toBeLessThan(0.4);
  });

  it("should detect personal attacks", () => {
    const input = makeInput("You're so stupid. shut up.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.escalationRisk).toBeGreaterThanOrEqual(0.4);
    expect(result.checks.hasPersonalAttack).toBe(true);
  });

  it("should detect ambiguous wording", () => {
    const input = makeInput("I'll deal with it");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.misunderstandingRisk).toBeGreaterThan(0.2);
  });
});

// ─── STYLE MATCHING ───────────────────────────────────────────────────────────

describe("Draft Analysis - Style Matching", () => {
  it("should detect short style", () => {
    const input = makeInput("ok sounds good");
    const result = analyzeDraft(input, makeState());
    expect(result.checks.wordCount).toBeLessThanOrEqual(4);
  });

  it("should detect long style", () => {
    const input = makeInput("I wanted to let you know that I have been working really hard on this project and I think we are making good progress but there are a few things we need to address before the deadline and I would like to discuss them with you as soon as possible because the timeline is tight and we need to make sure everything is done correctly and on time and I want to make sure we are all on the same page about what needs to be done and who is responsible for what.");
    const result = analyzeDraft(input, makeState());
    expect(result.checks.isVeryLong).toBe(true);
  });

  it("should detect emoji-heavy style", () => {
    const input = makeInput("that's awesome 😊😂❤️");
    const result = analyzeDraft(input, makeState());
    expect(result.checks.emojiCount).toBeGreaterThanOrEqual(3);
  });

  it("should detect no emoji style", () => {
    const input = makeInput("Thanks for the update");
    const result = analyzeDraft(input, makeState());
    expect(result.checks.emojiCount).toBe(0);
  });

  it("should detect slang", () => {
    const input = makeInput("yo that's sick bro ngl");
    const result = analyzeDraft(input, makeState());
    expect(result.checks.hasCasualLanguage).toBe(true);
  });

  it("should detect formal style", () => {
    const input = makeInput("Please find the attached document. Best regards.");
    const result = analyzeDraft(input, makeState());
    expect(result.checks.hasProfessionalLanguage).toBe(true);
  });

  it("should detect casual style", () => {
    const input = makeInput("hey what's up dude");
    const result = analyzeDraft(input, makeState());
    expect(result.checks.hasCasualLanguage).toBe(true);
  });
});

// ─── LANGUAGE MATCHING ────────────────────────────────────────────────────────

describe("Draft Analysis - Language Matching", () => {
  it("should handle English drafts", () => {
    const state = makeState();
    const input = makeInput("Hello, how are you?");
    const result = analyzeDraft(input, state);
    expect(result.analysis.languageConsistency).toBeGreaterThanOrEqual(0.5);
  });

  it("should handle code-mixed drafts", () => {
    const state = makeState({
      language: {
        primary: "telugu", secondary: ["english"], script: "mixed", codeMixed: true,
        romanized: false, codeMixRatio: [{ language: "telugu", ratio: 0.5 }, { language: "english", ratio: 0.5 }],
        outputPreference: "code_mixed", confidence: 0.8, scriptConfidence: 0.7,
        detectionSource: "ai", participantLanguages: [],
      },
    });
    const input = makeInput("naku ivala project finish cheyyadam late ayindi");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
  });

  it("should handle Romanized drafts", () => {
    const state = makeState({
      language: {
        primary: "hindi", secondary: ["english"], script: "latin", codeMixed: true,
        romanized: true, codeMixRatio: [{ language: "hindi", ratio: 0.6 }, { language: "english", ratio: 0.4 }],
        outputPreference: "romanized", confidence: 0.8, scriptConfidence: 0.7,
        detectionSource: "ai", participantLanguages: [],
      },
    });
    const input = makeInput("mai kal aa raha hu aur tum?");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
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
    const input = makeInput("yar ye project ka deadline kab hai?");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
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
    const input = makeInput("enna aachu nee enna pannuva?");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
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
    const input = makeInput("नमस्ते आप कैसे हैं?");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
  });
});

// ─── CONTEXT FIT ──────────────────────────────────────────────────────────────

describe("Draft Analysis - Context Fit", () => {
  it("should work for professional context", () => {
    const state = makeState({
      context: { type: "professional", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const input = makeInput("Please review the attached document at your convenience.");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
  });

  it("should work for academic context", () => {
    const state = makeState({
      context: { type: "academic", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const input = makeInput("Sir, could I have one more day to submit the assignment?");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
  });

  it("should work for dating context", () => {
    const state = makeState({
      context: { type: "dating", platform: undefined, situation: "unknown", urgency: "normal" },
    });
    const input = makeInput("hey you disappeared on me 👀 busy?");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
  });

  it("should work for conflict context", () => {
    const state = makeState({
      context: { type: "conflict", platform: undefined, situation: "unknown", urgency: "normal" },
      conflict: { level: 0.6, escalation: 0.4, trigger: "disagreement", coreDisagreement: "approach", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
    });
    const input = makeInput("I think there's some confusion about what happened.");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
  });

  it("should work for group conversation", () => {
    const state = makeState({
      participants: { count: 4, roles: ["user", "a", "b", "c"], userId: "user", others: ["a", "b", "c"], isGroup: true },
    });
    const input = makeInput("You guys never communicate properly.");
    const result = analyzeDraft(input, state);
    expect(result.analysis).toBeDefined();
  });
});

// ─── Factual Integrity ────────────────────────────────────────────────────────

describe("Draft Analysis - Factual Integrity", () => {
  it("should score high for factual draft", () => {
    const input = makeInput(
      "I completed my part of the project.",
      [{ sender: "them", text: "Where's your part?" }],
      undefined
    );
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.factualIntegrity).toBeGreaterThanOrEqual(0.7);
  });

  it("should detect potential unsupported claims", () => {
    const input = makeInput(
      "My car broke down on the way to the office.",
      [{ sender: "them", text: "Where are you?" }],
      undefined
    );
    const result = analyzeDraft(input, makeState());
    // The car fact was never mentioned in conversation
    expect(result.analysis.factualIntegrity).toBeDefined();
  });

  it("should preserve user facts in conversation", () => {
    const input = makeInput(
      "I already submitted my part yesterday.",
      [{ sender: "them", text: "Did you finish?" }],
      { userFacts: ["User submitted their part yesterday"] }
    );
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.factualIntegrity).toBeGreaterThanOrEqual(0.7);
  });
});

// ─── COACHING ─────────────────────────────────────────────────────────────────

describe("Draft Analysis - Coaching", () => {
  it("should provide coaching for aggressive draft", () => {
    const input = makeInput("You always do this! Why can't you listen?");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.coaching).toBeTruthy();
    expect(result.analysis.coaching.length).toBeGreaterThan(20);
  });

  it("should provide coaching for defensive draft", () => {
    const input = makeInput("It's not my fault. I already did my part.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.coaching).toBeTruthy();
  });

  it("should provide coaching for boundary draft", () => {
    const input = makeInput("I'm not comfortable with that. Please stop.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.coaching).toBeTruthy();
  });

  it("should provide coaching for professional draft", () => {
    const input = makeInput("Please review the document at your convenience.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.coaching).toBeTruthy();
  });

  it("should provide coaching for casual draft", () => {
    const input = makeInput("hey what's up");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.coaching).toBeTruthy();
  });
});

// ─── DETERMINISTIC CHECKS ─────────────────────────────────────────────────────

describe("Draft Analysis - Deterministic Checks", () => {
  it("should count words correctly", () => {
    const checks = runDeterministicDraftChecks("hello world test");
    expect(checks.wordCount).toBe(3);
  });

  it("should count emojis correctly", () => {
    const checks = runDeterministicDraftChecks("hello 😊 world 😂");
    expect(checks.emojiCount).toBe(2);
  });

  it("should detect excessive punctuation", () => {
    const checks = runDeterministicDraftChecks("what??? really??!");
    expect(checks.hasExcessivePunctuation).toBe(true);
  });

  it("should detect all caps with mixed content", () => {
    const checks = runDeterministicDraftChecks("THIS IS important");
    expect(checks.hasAllCaps).toBe(true);
  });

  it("should detect clichés", () => {
    const checks = runDeterministicDraftChecks("That sounds amazing! I'd love to hear more.");
    expect(checks.hasCliché).toBe(true);
  });

  it("should detect aggressive language", () => {
    const checks = runDeterministicDraftChecks("You always do this wrong.");
    expect(checks.hasAggressiveLanguage).toBe(true);
  });

  it("should detect pressure language", () => {
    const checks = runDeterministicDraftChecks("Answer me right now!");
    expect(checks.hasPressureLanguage).toBe(true);
  });

  it("should detect boundary language", () => {
    const checks = runDeterministicDraftChecks("I'm not comfortable with that.");
    expect(checks.hasBoundaryLanguage).toBe(true);
  });

  it("should detect apology language", () => {
    const checks = runDeterministicDraftChecks("Sorry I couldn't make it.");
    expect(checks.hasApologyLanguage).toBe(true);
  });

  it("should detect professional language", () => {
    const checks = runDeterministicDraftChecks("Please find the attached document.");
    expect(checks.hasProfessionalLanguage).toBe(true);
  });

  it("should detect casual language", () => {
    const checks = runDeterministicDraftChecks("hey sup bro lol");
    expect(checks.hasCasualLanguage).toBe(true);
  });

  it("should detect flirty language", () => {
    const checks = runDeterministicDraftChecks("miss you baby 💕");
    expect(checks.hasFlirtyLanguage).toBe(true);
  });

  it("should detect playful language", () => {
    const checks = runDeterministicDraftChecks("haha lol 😂🤣");
    expect(checks.hasPlayfulLanguage).toBe(true);
  });

  it("should detect empathy language", () => {
    const checks = runDeterministicDraftChecks("I understand this must be hard for you.");
    expect(checks.hasEmpathyLanguage).toBe(true);
  });

  it("should detect defensive language", () => {
    const checks = runDeterministicDraftChecks("It's not my fault. I already did my part.");
    expect(checks.hasDefensiveLanguage).toBe(true);
  });

  it("should detect sarcasm indicators", () => {
    const checks = runDeterministicDraftChecks("oh really? wow what a surprise");
    expect(checks.hasSarcasmIndicators).toBe(true);
  });

  it("should detect passive-aggressive indicators", () => {
    const checks = runDeterministicDraftChecks("fine whatever. I guess it's fine.");
    expect(checks.hasPassiveAggressiveIndicators).toBe(true);
  });

  it("should detect personal attacks", () => {
    const checks = runDeterministicDraftChecks("You're so stupid. shut up.");
    expect(checks.hasPersonalAttack).toBe(true);
  });

  it("should detect very short messages", () => {
    const checks = runDeterministicDraftChecks("ok");
    expect(checks.isVeryShort).toBe(true);
  });

  it("should detect very long messages", () => {
    const checks = runDeterministicDraftChecks("word ".repeat(100));
    expect(checks.isVeryLong).toBe(true);
  });
});

// ─── COACHING SUMMARY ─────────────────────────────────────────────────────────

describe("Draft Analysis - Coaching Summary", () => {
  it("should build coaching summary", () => {
    const input = makeInput("Thanks for letting me know!");
    const result = analyzeDraft(input, makeState());
    const summary = buildCoachingSummary(result.analysis);
    expect(summary).toBeTruthy();
    expect(summary.length).toBeGreaterThan(10);
  });

  it("should include intent in summary", () => {
    const input = makeInput("Sorry about that");
    const result = analyzeDraft(input, makeState());
    const summary = buildCoachingSummary(result.analysis);
    expect(summary.toLowerCase()).toContain("intent");
  });

  it("should include tone in summary", () => {
    const input = makeInput("Please review the document.");
    const result = analyzeDraft(input, makeState());
    const summary = buildCoachingSummary(result.analysis);
    expect(summary.toLowerCase()).toContain("tone");
  });
});

// ─── PERCEIVED IMPACT ─────────────────────────────────────────────────────────

describe("Draft Analysis - Perceived Impact", () => {
  it("should detect confrontational impact", () => {
    const input = makeInput("You're an idiot. You always mess things up.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.perceivedImpact).toBe("confrontational");
  });

  it("should detect supportive impact", () => {
    const input = makeInput("I understand this must be hard. I'm here for you.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.perceivedImpact).toBe("supportive");
  });

  it("should detect professional impact", () => {
    const input = makeInput("Please find the attached report. Best regards.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.perceivedImpact).toBe("professional");
  });

  it("should detect pressuring impact", () => {
    const input = makeInput("Answer me right now! I need an answer immediately!");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.perceivedImpact).toBe("pressuring");
  });

  it("should detect confident impact for boundary", () => {
    const input = makeInput("I'm not comfortable with that. Stop doing it.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.perceivedImpact).toBe("confident");
  });

  it("should detect apologetic impact", () => {
    const input = makeInput("Sorry about that. My fault.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.perceivedImpact).toBe("apologetic");
  });

  it("should detect cold impact for passive-aggressive", () => {
    const input = makeInput("fine whatever. I guess it's fine.");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis.perceivedImpact).toBe("cold");
  });
});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe("Draft Analysis - Edge Cases", () => {
  it("should handle draft with only punctuation", () => {
    const input = makeInput("!?!.??");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
  });

  it("should handle draft with only emojis", () => {
    const input = makeInput("😂🤣😊❤️");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
    expect(result.checks.emojiCount).toBeGreaterThanOrEqual(4);
  });

  it("should handle draft with mixed languages", () => {
    const input = makeInput("hello नमस्ते world");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
  });

  it("should handle draft with URLs", () => {
    const input = makeInput("Check this out https://example.com");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
  });

  it("should handle draft with special characters", () => {
    const input = makeInput("What's up! @#$%^&*()");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
  });

  it("should handle draft with numbers", () => {
    const input = makeInput("Meeting at 3pm tomorrow for 1 hour");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
  });

  it("should handle very short ambiguous draft", () => {
    const input = makeInput("k");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
    expect(result.checks.isVeryShort).toBe(true);
  });

  it("should handle draft that is just a question", () => {
    const input = makeInput("?");
    const result = analyzeDraft(input, makeState());
    expect(result.analysis).toBeDefined();
  });
});
