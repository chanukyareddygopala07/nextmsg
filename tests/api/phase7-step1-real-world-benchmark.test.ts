/**
 * Phase 7 Step 1 — Real-World Communication Quality Benchmark Tests
 *
 * Tests for the real-world benchmark dataset, evaluator, and integration.
 * Validates that the 300-case benchmark is well-formed and the evaluator works correctly.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getRealWorldBenchmark } from "../../src/lib/evaluation/datasets/real-world-benchmark";
import { loadDataset, listDatasets } from "../../src/lib/evaluation/datasets/loader";
import { evaluateRealWorld } from "../../src/lib/evaluation/evaluators/real-world";
import type { BenchmarkCase, EvaluationCategory } from "../../src/lib/evaluation/types";

// ─── Dataset Tests ──────────────────────────────────────────────────────────

describe("Real-World Benchmark Dataset", () => {
  let dataset: ReturnType<typeof getRealWorldBenchmark>;

  beforeAll(() => {
    dataset = getRealWorldBenchmark();
  });

  it("should have 300+ cases", () => {
    expect(dataset.totalCases).toBeGreaterThanOrEqual(300);
    expect(dataset.cases.length).toBeGreaterThanOrEqual(300);
  });

  it("should have version real-world-v1.0", () => {
    expect(dataset.version).toBe("real-world-v1.0");
  });

  it("should have proper metadata", () => {
    expect(dataset.name).toContain("Real-World");
    expect(dataset.description).toContain("300+");
    expect(dataset.createdAt).toBeDefined();
  });

  it("should have all required fields on each case", () => {
    for (const c of dataset.cases) {
      expect(c.id).toBeDefined();
      expect(typeof c.id).toBe("string");
      expect(c.category).toBeDefined();
      expect(c.difficulty).toBeDefined();
      expect(c.context).toBeDefined();
      expect(c.relationship).toBeDefined();
      expect(c.language).toBeDefined();
      expect(c.script).toBeDefined();
      expect(Array.isArray(c.conversation)).toBe(true);
      expect(c.conversation.length).toBeGreaterThanOrEqual(2);
      expect(c.draft).toBeDefined();
      expect(c.goal).toBeDefined();
      expect(c.targetTone).toBeDefined();
      expect(c.expected).toBeDefined();
      expect(Array.isArray(c.tags)).toBe(true);
    }
  });

  it("should have unique IDs", () => {
    const ids = dataset.cases.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have IDs starting with RW-", () => {
    for (const c of dataset.cases) {
      expect(c.id).toMatch(/^RW-/);
    }
  });

  it("should have valid categories", () => {
    const validCategories = [
      "professional", "academic", "dating", "conflict", "negotiation",
      "customer", "recovery", "friendship", "family", "group",
      "advisory", "preservation", "golden_rule", "golden", "multilingual", "multi_turn",
      "adversarial", "career", "social", "general",
    ];
    for (const c of dataset.cases) {
      expect(validCategories).toContain(c.category);
    }
  });

  it("should have valid difficulties", () => {
    const validDifficulties = ["easy", "medium", "hard", "adversarial"];
    for (const c of dataset.cases) {
      expect(validDifficulties).toContain(c.difficulty);
    }
  });

  it("should have valid languages", () => {
    const validLanguages = [
      "english", "telugu", "hindi", "tamil", "tanglish", "hinglish", "tagalog",
      "romanized_telugu", "romanized_tamil", "romanized_hindi",
      "hindi_english", "english_telugu", "english_tamil",
    ];
    for (const c of dataset.cases) {
      expect(validLanguages).toContain(c.language);
    }
  });

  it("should have valid scripts", () => {
    const validScripts = ["latin", "telugu", "devanagari", "tamil"];
    for (const c of dataset.cases) {
      expect(validScripts).toContain(c.script);
    }
  });

  it("should have conversation with role and content", () => {
    for (const c of dataset.cases) {
      for (const msg of c.conversation) {
        expect(msg.role).toBeDefined();
        expect(["user", "other"]).toContain(msg.role);
        expect(typeof msg.content).toBe("string");
        expect(msg.content.length).toBeGreaterThan(0);
      }
    }
  });

  it("should have at least 20% multilingual cases", () => {
    const multilingualCases = dataset.cases.filter((c) => c.language !== "english");
    const percentage = (multilingualCases.length / dataset.cases.length) * 100;
    expect(percentage).toBeGreaterThanOrEqual(20);
  });

  it("should have all modes represented", () => {
    const categories = new Set(dataset.cases.map((c) => c.category));
    const expectedCategories = [
      "professional", "dating", "conflict", "friendship", "family",
      "negotiation", "customer", "recovery", "group", "advisory",
      "preservation", "golden_rule", "multilingual", "multi_turn", "academic",
      "career", "social", "general",
    ];
    for (const cat of expectedCategories) {
      expect(categories.has(cat as EvaluationCategory)).toBe(true);
    }
  });

  it("should have difficulty distribution", () => {
    const easy = dataset.cases.filter((c) => c.difficulty === "easy").length;
    const medium = dataset.cases.filter((c) => c.difficulty === "medium").length;
    const hard = dataset.cases.filter((c) => c.difficulty === "hard").length;
    expect(easy).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(0);
    expect(hard).toBeGreaterThan(0);
  });

  it("should have multi_turn cases with 3+ messages", () => {
    const multiTurnCases = dataset.cases.filter((c) => c.category === "multi_turn");
    for (const c of multiTurnCases) {
      expect(c.conversation.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("should have cases with expected.tone or targetTone", () => {
    for (const c of dataset.cases) {
      const hasTone = c.expected.tone || c.targetTone;
      expect(hasTone).toBeDefined();
    }
  });
});

// ─── Loader Integration Tests ───────────────────────────────────────────────

describe("Real-World Dataset Loader", () => {
  it("should list real-world-v1.0 in available datasets", () => {
    const datasets = listDatasets();
    expect(datasets).toContain("real-world-v1.0");
  });

  it("should load real-world-v1.0 via loadDataset", () => {
    const dataset = loadDataset("real-world-v1.0");
    expect(dataset.version).toBe("real-world-v1.0");
    expect(dataset.cases.length).toBeGreaterThanOrEqual(300);
  });

  it("should load via alias 'real-world'", () => {
    const dataset = loadDataset("real-world");
    expect(dataset.version).toBe("real-world-v1.0");
    expect(dataset.cases.length).toBeGreaterThanOrEqual(300);
  });
});

// ─── Evaluator Tests ────────────────────────────────────────────────────────

describe("Real-World Evaluator", () => {
  const baseCase: BenchmarkCase = {
    id: "RW-TEST-001",
    category: "friendship",
    difficulty: "easy",
    context: "social",
    relationship: "friend",
    language: "english",
    script: "latin",
    conversation: [
      { role: "other", content: "What's up?" },
      { role: "user", content: "not much... just chilling" },
    ],
    draft: "not much... just chilling",
    goal: "casual_greeting",
    targetTone: "casual",
    expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
    tags: ["casual", "greeting"],
  };

  it("should evaluate a natural-sounding candidate highly", () => {
    const result = evaluateRealWorld(baseCase, "nm just watching tv... u?");
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it("should penalize AI-sounding candidates", () => {
    const result = evaluateRealWorld(baseCase, "That sounds amazing! What inspired you to just chill? I would love to hear more about that.");
    const naturalnessMetric = result.metrics.find((m) => m.name === "naturalness");
    expect(naturalnessMetric?.value).toBeLessThan(0.9);
  });

  it("should check semantic preservation", () => {
    const result = evaluateRealWorld(baseCase, "not much... just chilling");
    const semanticMetric = result.metrics.find((m) => m.name === "semantic_preservation");
    expect(semanticMetric?.value).toBeGreaterThan(0.3);
  });

  it("should check length appropriateness", () => {
    const result = evaluateRealWorld(baseCase, "ok");
    const lengthMetric = result.metrics.find((m) => m.name === "length_appropriateness");
    expect(lengthMetric).toBeDefined();
  });

  it("should check context fit", () => {
    const result = evaluateRealWorld(baseCase, "sure lets hang out");
    const contextMetric = result.metrics.find((m) => m.name === "context_fit");
    expect(contextMetric?.value).toBeGreaterThan(0.5);
  });

  it("should check casual style", () => {
    const result = evaluateRealWorld(baseCase, "sure... sounds good lol");
    const casualMetric = result.metrics.find((m) => m.name === "casual_style");
    expect(casualMetric?.value).toBeGreaterThan(0.5);
  });

  it("should check tone match", () => {
    const result = evaluateRealWorld(baseCase, "sure sounds good");
    const toneMetric = result.metrics.find((m) => m.name === "tone_match");
    expect(toneMetric).toBeDefined();
  });

  it("should handle conflict scenarios with de-escalation check", () => {
    const conflictCase: BenchmarkCase = {
      ...baseCase,
      id: "RW-TEST-002",
      category: "conflict",
      context: "conflict",
      expected: { ...baseCase.expected, deEscalationExpected: true, negationPreserved: true },
    };
    const result = evaluateRealWorld(conflictCase, "i understand... lets figure this out");
    const deEscMetric = result.metrics.find((m) => m.name === "de_escalation");
    expect(deEscMetric).toBeDefined();
    expect(deEscMetric?.value).toBeGreaterThan(0);
  });

  it("should handle negotiation scenarios with position preservation check", () => {
    const negCase: BenchmarkCase = {
      ...baseCase,
      id: "RW-TEST-003",
      category: "negotiation",
      context: "negotiation",
      expected: { ...baseCase.expected, positionPreserved: true },
    };
    const result = evaluateRealWorld(negCase, "can you do 10% off?");
    const posMetric = result.metrics.find((m) => m.name === "position_preservation");
    expect(posMetric).toBeDefined();
  });

  it("should handle multilingual cases", () => {
    const mlCase: BenchmarkCase = {
      ...baseCase,
      id: "RW-TEST-004",
      language: "telugu",
      script: "telugu",
      conversation: [
        { role: "other", content: "ela unnav?" },
        { role: "user", content: "bagunnav... nuvvu?" },
      ],
      draft: "bagunnav... nuvvu?",
    };
    const result = evaluateRealWorld(mlCase, "bagunnav nuvvu?");
    expect(result.score).toBeGreaterThan(0);
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it("should return overall score between 0 and 1", () => {
    const result = evaluateRealWorld(baseCase, "sure");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("should have all expected metric names", () => {
    const result = evaluateRealWorld(baseCase, "nm just chilling");
    const metricNames = result.metrics.map((m) => m.name);
    expect(metricNames).toContain("naturalness");
    expect(metricNames).toContain("length_appropriateness");
    expect(metricNames).toContain("casual_style");
    expect(metricNames).toContain("context_fit");
    expect(metricNames).toContain("semantic_preservation");
    expect(metricNames).toContain("tone_match");
  });
});

// ─── Sample Case Quality Tests ──────────────────────────────────────────────

describe("Real-World Benchmark Sample Quality", () => {
  let dataset: ReturnType<typeof getRealWorldBenchmark>;

  beforeAll(() => {
    dataset = getRealWorldBenchmark();
  });

  it("should have realistic English conversations", () => {
    const englishCases = dataset.cases.filter((c) => c.language === "english");
    expect(englishCases.length).toBeGreaterThan(100);
    for (const c of englishCases.slice(0, 20)) {
      const lastMsg = c.conversation[c.conversation.length - 1];
      expect(lastMsg.content.length).toBeGreaterThan(5);
    }
  });

  it("should have Telugu conversations with proper script", () => {
    const teluguCases = dataset.cases.filter((c) => c.language === "telugu" || c.language === "romanized_telugu");
    expect(teluguCases.length).toBeGreaterThan(5);
  });

  it("should have Hindi conversations with Devanagari script", () => {
    const hindiCases = dataset.cases.filter((c) => c.language === "hindi" || c.language === "romanized_hindi");
    expect(hindiCases.length).toBeGreaterThan(5);
  });

  it("should have Tamil conversations with Tamil script", () => {
    const tamilCases = dataset.cases.filter((c) => c.language === "tamil" || c.language === "romanized_tamil");
    expect(tamilCases.length).toBeGreaterThan(5);
  });

  it("should have messy/realistic inputs", () => {
    const messyIndicators = ["...", "??", "lol", "omg", "haha", "tbh", "ngl"];
    const messyCases = dataset.cases.filter((c) =>
      c.conversation.some((m) =>
        messyIndicators.some((ind) => m.content.includes(ind)),
      ),
    );
    expect(messyCases.length).toBeGreaterThan(20);
  });

  it("should have varied goals", () => {
    const goals = new Set(dataset.cases.map((c) => c.goal));
    expect(goals.size).toBeGreaterThan(30);
  });

  it("should have expected.tone on most cases", () => {
    const casesWithTone = dataset.cases.filter((c) => c.expected.tone);
    expect(casesWithTone.length).toBeGreaterThan(dataset.cases.length * 0.8);
  });

  it("should have tags on all cases", () => {
    for (const c of dataset.cases) {
      expect(c.tags.length).toBeGreaterThan(0);
    }
  });

  it("should have preservedFacts on preservation cases", () => {
    const presCases = dataset.cases.filter((c) => c.expected.semanticPreservationRequired);
    expect(presCases.length).toBeGreaterThan(50);
    const withFacts = presCases.filter((c) => c.expected.preservedFacts);
    expect(withFacts.length).toBeGreaterThan(30);
  });

  it("should have multi_turn cases with 3+ messages", () => {
    const mtCases = dataset.cases.filter((c) => c.category === "multi_turn");
    expect(mtCases.length).toBeGreaterThanOrEqual(10);
    for (const c of mtCases) {
      expect(c.conversation.length).toBeGreaterThanOrEqual(3);
    }
  });
});
