/**
 * Phase 6 Step 6 — Tone Accuracy Final Push Tests
 *
 * Tests for:
 * - Warm + Professional combinations
 * - Warm + Direct combinations
 * - Casual detection without slang
 * - Professional detection for workplace acknowledgments
 * - Passive-aggressive vs warm distinction
 * - Dimensional tone scoring
 * - Context-tone compatibility
 */

import { describe, it, expect } from "vitest";
import { evaluateTone } from "../../src/lib/evaluation/evaluators/tone";
import type { BenchmarkCase, EvaluationContext } from "../../src/lib/evaluation/types";

function makeCase(overrides: Partial<BenchmarkCase> = {}): BenchmarkCase {
  return {
    id: overrides.id || "TEST-001",
    category: overrides.category || "professional",
    difficulty: overrides.difficulty || "medium",
    conversation: overrides.conversation || [],
    expected: overrides.expected || {},
    targetTone: overrides.targetTone,
    context: overrides.context || "professional",
    relationship: overrides.relationship || "coworker",
    language: overrides.language || "en",
    script: overrides.script || "Latin",
    tags: overrides.tags || [],
    ...overrides,
  };
}

function makeContext(ctx: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    detectedContext: ctx.detectedContext || { conversationType: "professional" },
    ...ctx,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Warm + Professional Combinations (25 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Warm + Professional Combinations", () => {
  it("warm message with professional vocabulary gets warm credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thank you for taking the time to review this. I really appreciate your guidance.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional message with warm signals gets professional credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "I appreciate your feedback on the project. It was very helpful.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm + professional in work context", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thanks for helping me with this. I really value your support.",
      makeContext({ detectedContext: { conversationType: "professional" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm acknowledgment in workplace", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I'm glad we could work through this together.",
      makeContext({ detectedContext: { conversationType: "professional" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm apology in professional context", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I apologize if it came across that way. Your contribution was essential.",
      makeContext({ detectedContext: { conversationType: "professional" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional with appreciation gets professional credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "I appreciate your patience. I'll have an update for you shortly.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm customer support message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I'm sorry for the inconvenience. Let me make this right for you.",
      makeContext({ detectedContext: { conversationType: "customer" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional customer support message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "I apologize for the inconvenience. Let me resolve this for you.",
      makeContext({ detectedContext: { conversationType: "customer" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm academic message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I appreciate your feedback on the paper. It was very helpful.",
      makeContext({ detectedContext: { conversationType: "academic" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional academic message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "Thank you for reviewing the manuscript. I look forward to your feedback.",
      makeContext({ detectedContext: { conversationType: "academic" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Warm + Direct Combinations (15 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Warm + Direct Combinations", () => {
  it("warm apology with 'let me' gets warm credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I'm so sorry. That was thoughtless of me. Let me make it up to you this weekend.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm support with 'let me' gets warm credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I understand. Let me help you with that.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm acknowledgment with 'let me' gets warm credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I appreciate that. Let me make sure we get this right.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm conflict resolution with 'let me'", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I'm sorry. I've been unreliable lately. Let me make it up to you this weekend.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm message without 'let me' gets warm credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thank you for understanding. I really appreciate your patience.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("direct message without warm signals", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "direct" }),
      "Here's the issue: we need to resolve this by Friday.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("direct message with imperative structure", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "direct" }),
      "Let me be clear: this is critical for the launch.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Casual Detection (15 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Casual Detection", () => {
  it("casual message with slang", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "hey wanna grab dinner tonight?",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("casual message without slang but conversational", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "What about you? Any fun plans?",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("casual message with emojis", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "that's awesome 😊 can't wait!",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("casual short message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "sure! sounds fun",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("casual friendship message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "I know, right? We should catch up soon!",
      makeContext({ detectedContext: { conversationType: "friendship" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Professional Detection (15 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Professional Detection", () => {
  it("professional with work vocabulary", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "The project deadline is next week. Let's prioritize the deliverables.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional workplace acknowledgment", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "Understood. I'll handle it.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional meeting response", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "Confirmed. I'll be there.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional email response", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "Thank you for your patience. I'll have an update for you shortly.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional without slang gets credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "I'll review the proposal and provide feedback by end of day.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Passive-Aggressive vs Warm (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Passive-Aggressive vs Warm", () => {
  it("warm support message is not passive-aggressive", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "That's tough. What's making you feel that way? I'll support whatever you decide.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm together message is not passive-aggressive", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I'm listening. Whatever it is, we'll face it together.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("actual passive-aggressive message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "passive_aggressive" }),
      "Whatever. If you say so.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("passive-aggressive with sarcasm", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "passive_aggressive" }),
      "Must be nice to have it so easy.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Dimensional Tone Scoring (15 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Dimensional Tone Scoring", () => {
  it("warm message with professional vocabulary gets partial credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thanks for helping with the project. I really appreciate your support.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional message with warm signals gets partial credit", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "I appreciate your feedback. It was very helpful for the project.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("diplomatic message with professional signals", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "diplomatic" }),
      "Perhaps we could consider an alternative approach to the project.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("empathetic message with warm signals", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "empathetic" }),
      "I understand how you feel. I'm here for you.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("assertive message with professional signals", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "assertive" }),
      "We need to resolve this matter promptly. The terms are non-negotiable.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Context-Tone Compatibility (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Context-Tone Compatibility", () => {
  it("warm tone in dating context is compatible", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I really enjoy spending time with you.",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const compat = result.metrics.find((m) => m.name === "tone_context_compatibility");
    expect(compat).toBeDefined();
    expect(compat!.pass).not.toBe("FAIL");
  });

  it("casual tone in dating context is compatible", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "hey what's up?",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const compat = result.metrics.find((m) => m.name === "tone_context_compatibility");
    expect(compat).toBeDefined();
    expect(compat!.pass).not.toBe("FAIL");
  });

  it("professional tone in dating context is compatible (professional can coexist)", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "The project deadline is next week.",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const compat = result.metrics.find((m) => m.name === "tone_context_compatibility");
    expect(compat).toBeDefined();
    expect(compat!.pass).toBe("PASS");
  });

  it("flirty tone in professional context is incompatible", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "flirty" }),
      "you're so cute when you smile 😊",
      makeContext({ detectedContext: { conversationType: "professional" } })
    );
    const compat = result.metrics.find((m) => m.name === "tone_context_compatibility");
    expect(compat).toBeDefined();
    expect(compat!.pass).toBe("FAIL");
  });

  it("diplomatic tone in conflict context is compatible", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "diplomatic" }),
      "I understand your perspective. Perhaps we could find a middle ground.",
      makeContext({ detectedContext: { conversationType: "conflict" } })
    );
    const compat = result.metrics.find((m) => m.name === "tone_context_compatibility");
    expect(compat).toBeDefined();
    expect(compat!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Multilingual Tone (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Multilingual Tone", () => {
  it("warm message in Romanized Telugu", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "naku chala help ayyindi, thanks",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm message in Romanized Hindi", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "bahut madad mili, thank you so much",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("professional message in code-mixed language", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "professional" }),
      "meeting kal hogi, please confirm",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("casual message in Romanized Tamil", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "enna aachu? casual ah poalam",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("warm message in Hindi-English code-mix", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "sorry bro, thanks for understanding",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Conflict Tone (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Conflict Tone", () => {
  it("warm + assertive in conflict", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I understand your point, but I still have concerns about this approach.",
      makeContext({ detectedContext: { conversationType: "conflict" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("diplomatic + assertive in conflict", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "diplomatic" }),
      "I see your perspective. Perhaps we could consider an alternative approach.",
      makeContext({ detectedContext: { conversationType: "conflict" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("empathetic + firm in conflict", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "empathetic" }),
      "I understand how you feel. However, we need to address this issue.",
      makeContext({ detectedContext: { conversationType: "conflict" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("calm + assertive in conflict", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "diplomatic" }),
      "Let's take a step back and discuss this calmly.",
      makeContext({ detectedContext: { conversationType: "conflict" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Dating Tone (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Dating Tone", () => {
  it("warm dating message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I really enjoy spending time with you.",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("flirty dating message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "flirty" }),
      "you're so cute when you smile 😊",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("casual dating message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "casual" }),
      "hey wanna grab dinner tonight?",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("playful dating message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "playful" }),
      "haha you're so silly 😊",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });

  it("confident dating message", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "I'd love to take you out sometime. What do you think?",
      makeContext({ detectedContext: { conversationType: "dating" } })
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
    expect(tm!.pass).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: Evaluator Self-Tests (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 6 Step 6 — Evaluator Self-Tests", () => {
  it("evaluator returns version 3.0.0", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thank you for your help.",
      makeContext()
    );
    expect(result.evaluatorVersion).toBe("3.0.0");
  });

  it("evaluator includes tone_target_match metric", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thank you for your help.",
      makeContext()
    );
    const tm = result.metrics.find((m) => m.name === "tone_target_match");
    expect(tm).toBeDefined();
  });

  it("evaluator includes tone_intensity metric", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thank you for your help.",
      makeContext()
    );
    const ti = result.metrics.find((m) => m.name === "tone_intensity");
    expect(ti).toBeDefined();
  });

  it("evaluator includes tone_context_compatibility metric", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "Thank you for your help.",
      makeContext()
    );
    const tc = result.metrics.find((m) => m.name === "tone_context_compatibility");
    expect(tc).toBeDefined();
  });

  it("evaluator handles empty candidate gracefully", () => {
    const result = evaluateTone(
      makeCase({ targetTone: "warm" }),
      "",
      makeContext()
    );
    expect(result.overall).toBeDefined();
    expect(result.metrics.length).toBeGreaterThan(0);
  });
});
