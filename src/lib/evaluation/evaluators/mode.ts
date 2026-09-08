/**
 * Mode Evaluator
 *
 * Evaluates mode classification, recommendation, precedence, and conflict
 * handling using the existing mode-config mapping layer — not a new detector.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";
import type { ConversationState } from "../../ai/conversation-state";
import type { CommunicationMode } from "../../ai/mode-types";
import {
  detectModeFromState,
  detectModeConflict,
  resolveEffectiveMode,
  isSafeModeInstruction,
} from "../../ai/mode-config";

function makeMinimalState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    participants: { count: 2, roles: [], userId: "me", others: ["them"], isGroup: false },
    relationship: "unknown",
    language: {
      primary: "english",
      secondary: [],
      script: "latin",
      codeMixed: false,
      romanized: false,
      codeMixRatio: [],
      outputPreference: "auto",
      confidence: 0.9,
      scriptConfidence: 0.9,
      detectionSource: "heuristic",
      participantLanguages: [],
    },
    context: { type: "general", platform: undefined, situation: "unknown", urgency: "normal" },
    intent: { userGoal: "", userIntent: "unknown", otherIntent: "unknown" },
    emotion: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
    tone: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
    dynamics: {
      engagement: 0.5,
      reciprocity: 0.5,
      cooperation: 0.5,
      defensiveness: 0.1,
      escalation: 0.1,
      rapport: 0.5,
      pressure: 0.1,
      uncertainty: 0.3,
      responsiveness: 0.5,
    },
    conflict: {
      level: 0,
      escalation: 0,
      trigger: "",
      coreDisagreement: "",
      personalAttacks: false,
      misunderstanding: false,
      resolutionOpportunity: false,
    },
    risks: [],
    conflictIntelligence: { participants: [], conflictStructure: null, groupAnalysis: null },
    strategy: { primary: "natural", ranked: [], confidence: 0.5 },
    style: {
      preferred: "balanced",
      writingCharacteristics: "",
      lengthPreference: "medium",
      profile: null,
      guidance: null,
      source: "default",
    },
    sources: {
      goalSource: "default",
      contextSource: "default",
      toneSource: "default",
      situationSource: "default",
      languageSource: "heuristic",
    },
    ...overrides,
  };
}

function stateFromCase(benchCase: BenchmarkCase): ConversationState {
  const meta = (benchCase.metadata || {}) as Record<string, unknown>;
  const participantCount =
    typeof meta.participants === "number" ? meta.participants : benchCase.conversation.length > 2 ? 4 : 2;
  const isGroup = participantCount >= 3 || Boolean(meta.isGroup);

  const situation =
    (typeof meta.situation === "string" && meta.situation) ||
    (isGroup
      ? "unknown"
      : typeof benchCase.context === "string"
        ? mapContextToSituation(benchCase.context)
        : "unknown");

  const userIntent =
    (typeof meta.userIntent === "string" && meta.userIntent) ||
    benchCase.goal ||
    "unknown";

  return makeMinimalState({
    relationship: (benchCase.relationship || "unknown") as ConversationState["relationship"],
    participants: {
      count: participantCount,
      roles: [],
      userId: "me",
      others: participantCount > 2 ? ["a", "b", "c"] : ["them"],
      isGroup,
    },
    context: {
      type: benchCase.context || "general",
      platform: benchCase.platform,
      situation: situation as ConversationState["context"]["situation"],
      urgency: "normal",
    },
    intent: {
      userGoal: benchCase.goal || "",
      userIntent: userIntent as ConversationState["intent"]["userIntent"],
      otherIntent: "unknown",
    },
    language: {
      ...makeMinimalState().language,
      primary: benchCase.language || "english",
      script: (benchCase.script as ConversationState["language"]["script"]) || "latin",
      codeMixed: Boolean(meta.codeMixed),
      romanized: Boolean(meta.romanized),
    },
  });
}

function mapContextToSituation(context: string): string {
  const map: Record<string, string> = {
    professional: "professional_feedback",
    academic: "request_for_help",
    interview: "request",
    conflict: "disagreement",
    dating: "romantic_interest",
    friendship: "casual_chat",
    family: "casual_chat",
    negotiation: "negotiation",
    customer: "customer_complaint",
    recovery: "apology",
    group: "casual_chat",
    social: "casual_chat",
    career: "request",
  };
  return map[context] || "unknown";
}

function metric(
  name: string,
  pass: PassFail,
  value: number,
  details?: string
): MetricResult {
  return { name, pass, value, details };
}

export function evaluateMode(
  benchCase: BenchmarkCase,
  _candidate: string,
  _context: EvaluationContext = {}
): EvalResult {
  const start = Date.now();
  const metrics: MetricResult[] = [];
  const expected = benchCase.expected;
  const state = stateFromCase(benchCase);
  const recommendation = detectModeFromState(state);

  const expectedMode = expected.expectedMode as CommunicationMode | undefined;
  const acceptable = new Set(
    (expected.acceptableAlternatives || []).map(String).concat(expectedMode ? [expectedMode] : [])
  );

  if (expectedMode) {
    const hit =
      recommendation.mode === expectedMode ||
      acceptable.has(recommendation.mode);
    metrics.push(
      metric(
        "mode_classification",
        hit ? "PASS" : "FAIL",
        hit ? 1 : 0,
        `expected=${expectedMode} got=${recommendation.mode} confidence=${recommendation.confidence.toFixed(2)}`
      )
    );
  } else {
    metrics.push(metric("mode_classification", "SKIP", 1, "no expectedMode"));
  }

  if (typeof expected.modeConfidenceMin === "number") {
    const ok = recommendation.confidence >= expected.modeConfidenceMin;
    metrics.push(
      metric(
        "mode_confidence",
        ok ? "PASS" : "FAIL",
        ok ? 1 : recommendation.confidence / Math.max(expected.modeConfidenceMin, 0.01),
        `min=${expected.modeConfidenceMin} got=${recommendation.confidence.toFixed(2)}`
      )
    );
  }

  const selectedMode = (expected.selectedMode || "auto") as CommunicationMode;
  const overrideInstruction = expected.overrideInstruction || null;
  const workspaceMode = (benchCase.metadata?.workspaceMode as CommunicationMode | undefined) || null;
  const preferenceMode = (benchCase.metadata?.preferenceMode as CommunicationMode | undefined) || null;

  const resolution = resolveEffectiveMode({
    selectedMode,
    overrideInstruction,
    recommendation,
    workspaceMode,
    preferenceMode,
  });

  if (expected.expectedEffectiveMode) {
    const ok = resolution.mode === expected.expectedEffectiveMode;
    metrics.push(
      metric(
        "mode_precedence",
        ok ? "PASS" : "FAIL",
        ok ? 1 : 0,
        `expected=${expected.expectedEffectiveMode} got=${resolution.mode} source=${resolution.source}`
      )
    );
  }

  if (typeof expected.expectConflict === "boolean") {
    const conflict =
      resolution.conflict ||
      detectModeConflict(selectedMode, recommendation.mode, recommendation.confidence);
    const hasConflict = conflict !== null;
    const ok = hasConflict === expected.expectConflict;
    metrics.push(
      metric(
        "mode_conflict",
        ok ? "PASS" : "FAIL",
        ok ? 1 : 0,
        `expectedConflict=${expected.expectConflict} got=${hasConflict}`
      )
    );
  }

  if (overrideInstruction) {
    const safe = isSafeModeInstruction(overrideInstruction);
    const expectBlocked = Boolean(benchCase.metadata?.expectInstructionBlocked);
    const ok = expectBlocked ? !safe || resolution.instructionBlocked : safe && !resolution.instructionBlocked;
    metrics.push(
      metric(
        "mode_instruction_safety",
        ok ? "PASS" : "FAIL",
        ok ? 1 : 0,
        `safe=${safe} blocked=${resolution.instructionBlocked}`
      )
    );
  }

  // Leakage / privacy: evaluator must not require message body echoes in metrics
  const leaked = metrics.some((m) =>
    (m.details || "").includes(benchCase.conversation[0]?.content || "___never___")
  );
  metrics.push(
    metric(
      "mode_no_content_leakage",
      leaked ? "FAIL" : "PASS",
      leaked ? 0 : 1,
      leaked ? "metric details leaked conversation content" : "safe metadata only"
    )
  );

  const scored = metrics.filter((m) => m.pass !== "SKIP");
  const failed = scored.filter((m) => m.pass === "FAIL");
  const warned = scored.filter((m) => m.pass === "WARN");
  const overall: PassFail =
    failed.length > 0 ? "FAIL" : warned.length > 0 ? "WARN" : scored.length === 0 ? "SKIP" : "PASS";

  return {
    caseId: benchCase.id,
    category: benchCase.category,
    difficulty: benchCase.difficulty,
    overall,
    score:
      scored.length === 0
        ? 0
        : scored.reduce((sum, m) => sum + m.value, 0) / scored.length,
    metrics,
    executionTimeMs: Date.now() - start,
    evaluatorVersion: "1.0.0",
  };
}
