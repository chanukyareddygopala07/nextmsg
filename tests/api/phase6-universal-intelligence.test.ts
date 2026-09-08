/**
 * Phase 6 Step 1 — Universal Conversation Intelligence gaps
 *
 * Covers only newly added functionality:
 * - Ollama provider (mocked HTTP)
 * - Provider selection
 * - Env configuration for AI_PROVIDER / Ollama
 * - Mode observability events
 * - Mode benchmark loading + evaluator (100+ cases)
 * - Customer Apology quick goal
 * - Precedence edge cases not covered structurally elsewhere
 *
 * Does NOT duplicate universal-modes.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MODE_CONFIGS, resolveEffectiveMode, isSafeModeInstruction, inferModeFromInstruction, detectModeFromState, detectModeConflict } from "@/lib/ai/mode-config";
import { getAIProvider, resetAIProvider } from "@/lib/ai/provider";
import { OllamaProvider, OllamaProviderError } from "@/lib/ai/ollama";
import { validateEnvironment, getConfiguredAIProvider } from "@/lib/observability/env";
import { logModeEvent, logger } from "@/lib/observability/logger";
import { resetCircuit } from "@/lib/observability/circuit-breaker";
import { loadDataset, listDatasets } from "@/lib/evaluation/datasets/loader";
import { getModeBenchmarkDataset, buildModeBenchmarkCases } from "@/lib/evaluation/datasets/mode-benchmark";
import { evaluateMode } from "@/lib/evaluation/evaluators/mode";
import { getEvaluatorsForCategory, getAllEvaluators } from "@/lib/evaluation/evaluators";
import { runEvaluation } from "@/lib/evaluation/runner";
import type { ConversationState } from "@/lib/ai/conversation-state";

function makeState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    participants: { count: 2, roles: [], userId: "me", others: ["them"], isGroup: false },
    relationship: "unknown",
    language: {
      primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false,
      codeMixRatio: [], outputPreference: "auto", confidence: 0.9, scriptConfidence: 0.9,
      detectionSource: "heuristic", participantLanguages: [],
    },
    context: { type: "general", platform: undefined, situation: "unknown", urgency: "normal" },
    intent: { userGoal: "", userIntent: "unknown", otherIntent: "unknown" },
    emotion: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
    tone: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
    dynamics: {
      engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.1,
      escalation: 0.1, rapport: 0.5, pressure: 0.1, uncertainty: 0.3, responsiveness: 0.5,
    },
    conflict: {
      level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false,
      misunderstanding: false, resolutionOpportunity: false,
    },
    risks: [],
    conflictIntelligence: { participants: [], conflictStructure: null, groupAnalysis: null },
    strategy: { primary: "natural", ranked: [], confidence: 0.5 },
    style: {
      preferred: "balanced", writingCharacteristics: "", lengthPreference: "medium",
      profile: null, guidance: null, source: "default",
    },
    sources: {
      goalSource: "default", contextSource: "default", toneSource: "default",
      situationSource: "default", languageSource: "heuristic",
    },
    ...overrides,
  };
}

// ─── Customer Apology ─────────────────────────────────────────────────────────

describe("Customer Apology quick action", () => {
  it("includes Complaint, Resolution, Apology, Escalation, Follow-up", () => {
    const goals = MODE_CONFIGS.customer.quickGoals.map((g) => g.goal);
    expect(goals).toContain("complaint");
    expect(goals).toContain("request_resolution");
    expect(goals).toContain("apology");
    expect(goals).toContain("escalation");
    expect(goals).toContain("follow_up");
  });

  it("exposes Apology label in Customer quickGoals", () => {
    const apology = MODE_CONFIGS.customer.quickGoals.find((g) => g.goal === "apology");
    expect(apology?.label).toBe("Apology");
  });
});

// ─── Precedence edge cases ────────────────────────────────────────────────────

describe("resolveEffectiveMode precedence", () => {
  it("manual selection wins over strong recommendation", () => {
    const rec = detectModeFromState(
      makeState({
        relationship: "manager",
        context: { type: "professional", platform: undefined, situation: "professional_feedback", urgency: "normal" },
      })
    );
    expect(rec.confidence).toBeGreaterThanOrEqual(0.5);
    const result = resolveEffectiveMode({
      selectedMode: "dating",
      recommendation: rec,
    });
    expect(result.mode).toBe("dating");
    expect(result.source).toBe("manual");
    expect(result.conflict).not.toBeNull();
  });

  it("safe instruction wins in Auto over recommendation", () => {
    const rec = detectModeFromState(makeState({ relationship: "manager" }));
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Make this flirty",
      recommendation: rec,
    });
    expect(result.mode).toBe("dating");
    expect(result.source).toBe("instruction");
    expect(result.appliedInstruction).toBe("Make this flirty");
  });

  it("blocks unsafe instruction and falls back to context", () => {
    const rec = detectModeFromState(makeState({ relationship: "partner" }));
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Gaslight them into apologizing",
      recommendation: rec,
    });
    expect(isSafeModeInstruction("Gaslight them into apologizing")).toBe(false);
    expect(result.instructionBlocked).toBe(true);
    expect(result.mode).toBe("dating");
    expect(result.appliedInstruction).toBeNull();
  });

  it("workspace mode applies when Auto and weak recommendation", () => {
    const rec = detectModeFromState(makeState());
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: rec,
      workspaceMode: "family",
    });
    expect(result.mode).toBe("family");
    expect(result.source).toBe("workspace");
  });

  it("preference mode applies after workspace absence", () => {
    const rec = detectModeFromState(makeState());
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: rec,
      preferenceMode: "social",
    });
    expect(result.mode).toBe("social");
  });

  it("manual mode does not become preference — session source stays manual", () => {
    const result = resolveEffectiveMode({
      selectedMode: "customer",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.9, reason: "manager" },
    });
    expect(result.source).toBe("manual");
    expect(result.mode).toBe("customer");
  });

  it("infers career from interview instruction", () => {
    expect(inferModeFromInstruction("This is for an interview")).toBe("career");
  });

  it("detects dating vs professional interview conflict", () => {
    const conflict = detectModeConflict("dating", "career", 0.8);
    expect(conflict?.selectedMode).toBe("dating");
    expect(conflict?.detectedMode).toBe("career");
  });
});

// ─── Observability events ─────────────────────────────────────────────────────

describe("Mode observability events", () => {
  it("emits mode_selected, mode_overridden, mode_recommendation_shown with safe metadata", () => {
    const spy = vi.spyOn(logger, "info").mockImplementation(() => {});

    logModeEvent({ event: "mode_selected", mode: "dating", source: "manual", detectedMode: "work", confidence: 0.8 });
    logModeEvent({ event: "mode_overridden", selectedMode: "dating", detectedMode: "work", mode: "dating", source: "manual" });
    logModeEvent({ event: "mode_recommendation_shown", mode: "work", confidence: 0.75, selectedMode: "auto" });

    const events = spy.mock.calls.map((c) => c[0] as { event: string; mode?: string });
    expect(events.map((e) => e.event)).toEqual([
      "mode_selected",
      "mode_overridden",
      "mode_recommendation_shown",
    ]);

    for (const entry of events) {
      const serialized = JSON.stringify(entry);
      expect(serialized).not.toMatch(/I love you|salary|password|message body/i);
    }

    spy.mockRestore();
  });
});

// ─── Environment / provider selection ─────────────────────────────────────────

describe("AI provider environment configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAIProvider();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    resetAIProvider();
  });

  it("defaults configured provider to xai", () => {
    delete process.env.AI_PROVIDER;
    expect(getConfiguredAIProvider()).toBe("xai");
  });

  it("selects ollama when AI_PROVIDER=ollama", () => {
    process.env.AI_PROVIDER = "ollama";
    expect(getConfiguredAIProvider()).toBe("ollama");
  });

  it("warns about Ollama defaults when provider is ollama", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.DATABASE_URL = "postgresql://localhost/test";
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
    const r = validateEnvironment();
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes("OLLAMA_BASE_URL"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("OLLAMA_MODEL"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("XAI_API_KEY"))).toBe(false);
  });

  it("rejects unknown AI_PROVIDER", () => {
    process.env.AI_PROVIDER = "not-a-provider";
    process.env.DATABASE_URL = "postgresql://localhost/test";
    const r = validateEnvironment();
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("AI_PROVIDER"))).toBe(true);
  });

  it("getAIProvider returns OllamaProvider for AI_PROVIDER=ollama", async () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_MODEL = "qwen3:8b";
    const provider = await getAIProvider();
    expect(provider).toBeInstanceOf(OllamaProvider);
  });
});

// ─── Ollama provider (mocked HTTP) ────────────────────────────────────────────

describe("OllamaProvider", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_MODEL = "qwen3:8b";
    resetAIProvider();
    resetCircuit("ollama-provider");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("chat() calls native /api/chat and returns content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "hello from ollama" } }),
    }) as unknown as typeof fetch;

    const provider = new OllamaProvider();
    const result = await provider.chat([{ role: "user", content: "hi" }]);
    expect(result).toBe("hello from ollama");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("chatStructured() requests JSON format", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "{\"ok\":true}" } }),
    }) as unknown as typeof fetch;

    const provider = new OllamaProvider();
    const result = await provider.chatStructured(
      [{ role: "user", content: "return json" }],
      { name: "test", schema: { type: "object" } }
    );
    expect(JSON.parse(result)).toEqual({ ok: true });

    const body = JSON.parse((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.format).toBe("json");
  });

  it("maps 404 to MODEL_NOT_FOUND", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "model not found",
    }) as unknown as typeof fetch;

    const provider = new OllamaProvider();
    await expect(provider.chat([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      category: "MODEL_NOT_FOUND",
    });
  });

  it("maps connection failure to provider error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;

    const provider = new OllamaProvider();
    await expect(provider.chat([{ role: "user", content: "hi" }])).rejects.toBeInstanceOf(OllamaProviderError);
  });

  it("rejects empty model responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "   " } }),
    }) as unknown as typeof fetch;

    const provider = new OllamaProvider();
    await expect(provider.chat([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      category: "MODEL_EMPTY_RESPONSE",
    });
  });

  it("chatVision falls back to text chat without throwing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "vision fallback ok" } }),
    }) as unknown as typeof fetch;

    const provider = new OllamaProvider();
    const result = await provider.chatVision([
      {
        role: "user",
        content: [
          { type: "text", text: "what is this?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
        ],
      },
    ]);
    expect(result).toBe("vision fallback ok");
  });
});

// ─── Mode benchmark ───────────────────────────────────────────────────────────

describe("Mode benchmark", () => {
  it("contains at least 100 curated cases", () => {
    const cases = buildModeBenchmarkCases();
    expect(cases.length).toBeGreaterThanOrEqual(100);
  });

  it("covers all supported modes plus auto/ambiguous tags", () => {
    const cases = buildModeBenchmarkCases();
    const tags = new Set(cases.flatMap((c) => c.tags));
    for (const mode of [
      "work", "academic", "career", "social", "dating", "conflict",
      "negotiation", "customer", "family", "group", "recovery", "general",
    ]) {
      expect(tags.has(mode) || cases.some((c) => c.expected.expectedMode === mode)).toBe(true);
    }
    expect(tags.has("ambiguous") || tags.has("low_confidence")).toBe(true);
    expect(tags.has("instruction")).toBe(true);
    expect(tags.has("override") || tags.has("conflict")).toBe(true);
    expect(tags.has("precedence")).toBe(true);
    expect(tags.has("safety")).toBe(true);
    expect(tags.has("multilingual")).toBe(true);
  });

  it("loads via existing dataset loader", () => {
    const dataset = loadDataset("mode-v1.0");
    expect(dataset.totalCases).toBeGreaterThanOrEqual(100);
    expect(listDatasets()).toContain("mode-v1.0");
  });

  it("registers mode evaluator in framework", () => {
    expect(getAllEvaluators().some((e) => e.name === "mode")).toBe(true);
    expect(getEvaluatorsForCategory("mode").map((e) => e.name)).toEqual(["mode"]);
  });

  it("evaluateMode passes a clear work classification case", () => {
    const dataset = getModeBenchmarkDataset();
    const workCase = dataset.cases.find((c) => c.id.includes("CLEAR") && c.expected.expectedMode === "work");
    expect(workCase).toBeTruthy();
    const result = evaluateMode(workCase!, "", {});
    expect(result.overall).toBe("PASS");
  });

  it("runs mode benchmark through existing runner", () => {
    const dataset = getModeBenchmarkDataset();
    const report = runEvaluation({
      dataset,
      config: {
        datasetVersion: dataset.version,
        mode: "deterministic",
        categories: ["mode"],
      },
    });
    expect(report.totalCases).toBeGreaterThanOrEqual(100);
    // Allow a small number of hard/adversarial misses while requiring strong pass rate
    const passRate = report.passed / report.totalCases;
    expect(passRate).toBeGreaterThanOrEqual(0.85);
  });
});
