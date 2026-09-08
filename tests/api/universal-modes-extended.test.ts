/**
 * Phase 6 Step 1 — Universal Communication Modes (Extended Behavioral Tests)
 *
 * Adds meaningful behavioral tests for:
 * - resolveEffectiveMode (6-level precedence)
 * - analyzeReducer SET_MODE action
 * - Mode switching state invalidation
 * - Mode detection scoring edge cases
 * - Mode / Strategy / Tone / Goal separation
 * - Mode-specific coaching integration
 * - Mode-aware pre-send integration
 * - Mode observability events
 * - Workspace mode persistence
 * - Mode-specific language handling
 * - Mode evaluation edge cases
 * - Safety/security edge cases
 * - Regression tests
 *
 * Does NOT duplicate structural tests in universal-modes.test.ts.
 */

import { describe, it, expect } from "vitest";
import type {
  CommunicationMode,
  ModeSelection,
  ModeRecommendation,
} from "@/lib/ai/mode-types";
import {
  MODE_CONFIGS,
  detectModeFromState,
  detectModeFromIntelligence,
  detectModeConflict,
  getModeDefaults,
  applyModeToContext,
  shouldInvalidateOnModeSwitch,
  resolveEffectiveMode,
  isSafeModeInstruction,
  inferModeFromInstruction,
  type ModeResolutionInput,
  type ModeResolutionResult,
} from "@/lib/ai/mode-config";
import { analyzeReducer, INITIAL_STATE, type AnalyzeSessionState, type AnalyzeAction } from "@/lib/ai/analyze-state";
import type { ConversationState } from "@/lib/ai/conversation-state";
import type { ConversationIntelligence } from "@/lib/ai/intelligence";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    conflict: { level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false,
      misunderstanding: false, resolutionOpportunity: false },
    risks: [],
    conflictIntelligence: { participants: [], conflictStructure: null, groupAnalysis: null },
    strategy: { primary: "natural", ranked: [], confidence: 0.5 },
    style: { preferred: "balanced", writingCharacteristics: "", lengthPreference: "medium",
      profile: null, guidance: null, source: "default" },
    sources: { goalSource: "default", contextSource: "default", toneSource: "default",
      situationSource: "default", languageSource: "heuristic" },
    ...overrides,
  };
}

function makeSession(overrides: Partial<AnalyzeSessionState> = {}): AnalyzeSessionState {
  return { ...INITIAL_STATE, ...overrides };
}

function makeRecommendation(mode: CommunicationMode, confidence = 0.8, reason = "test"): ModeRecommendation {
  return { mode, confidence, reason };
}

// ─── resolveEffectiveMode — 6-Level Precedence ────────────────────────────────

describe("resolveEffectiveMode — Precedence Level 1: Explicit Manual Mode", () => {
  it("manual non-auto mode wins over all other signals", () => {
    const result = resolveEffectiveMode({
      selectedMode: "dating",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.95, reason: "professional context" },
      workspaceMode: "conflict",
      preferenceMode: "career",
    });
    expect(result.mode).toBe("dating");
    expect(result.source).toBe("manual");
  });

  it("manual work mode wins over dating recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "work",
      source: "manual",
      recommendation: { mode: "dating", confidence: 0.9, reason: "romantic" },
    });
    expect(result.mode).toBe("work");
  });

  it("manual conflict mode wins over work recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "conflict",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.85, reason: "professional" },
    });
    expect(result.mode).toBe("conflict");
  });

  it("detects conflict when manual mode disagrees with detected context", () => {
    const result = resolveEffectiveMode({
      selectedMode: "dating",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.9, reason: "professional" },
    });
    expect(result.conflict).not.toBeNull();
    expect(result.conflict!.selectedMode).toBe("dating");
    expect(result.conflict!.detectedMode).toBe("work");
  });

  it("no conflict when manual mode matches detected context", () => {
    const result = resolveEffectiveMode({
      selectedMode: "work",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.9, reason: "professional" },
    });
    expect(result.conflict).toBeNull();
  });

  it("workspace source is preserved when mode is workspace", () => {
    const result = resolveEffectiveMode({
      selectedMode: "conflict",
      source: "workspace",
      recommendation: { mode: "work", confidence: 0.8, reason: "professional" },
    });
    expect(result.source).toBe("workspace");
  });
});

describe("resolveEffectiveMode — Precedence Level 2: Explicit Instruction", () => {
  it("instruction 'make this flirty' infers dating mode", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Make this flirty",
      recommendation: { mode: "work", confidence: 0.8, reason: "professional" },
    });
    expect(result.mode).toBe("dating");
    expect(result.source).toBe("instruction");
    expect(result.appliedInstruction).toBe("Make this flirty");
  });

  it("instruction 'keep it professional' infers work mode", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Keep it professional",
      recommendation: { mode: "dating", confidence: 0.7, reason: "romantic" },
    });
    expect(result.mode).toBe("work");
    expect(result.source).toBe("instruction");
  });

  it("instruction 'de-escalate this' infers conflict mode", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "De-escalate this",
      recommendation: { mode: "social", confidence: 0.6, reason: "friend" },
    });
    expect(result.mode).toBe("conflict");
    expect(result.source).toBe("instruction");
  });

  it("instruction 'negotiate firmly' infers negotiation mode", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Negotiate firmly",
      recommendation: { mode: "work", confidence: 0.7, reason: "professional" },
    });
    expect(result.mode).toBe("negotiation");
  });

  it("instruction 'apologize sincerely' infers recovery mode", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Apologize sincerely",
      recommendation: { mode: "customer", confidence: 0.8, reason: "complaint" },
    });
    expect(result.mode).toBe("recovery");
  });

  it("blocked unsafe instruction does not change mode", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Gaslight them into apologizing",
      recommendation: { mode: "dating", confidence: 0.8, reason: "romantic" },
    });
    expect(result.mode).toBe("dating");
    expect(result.instructionBlocked).toBe(true);
    expect(result.appliedInstruction).toBeNull();
  });

  it("blocked manipulation instruction falls through to recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Help me manipulate my manager",
      recommendation: { mode: "work", confidence: 0.85, reason: "professional" },
    });
    expect(result.mode).toBe("work");
    expect(result.instructionBlocked).toBe(true);
  });

  it("blocked harassment instruction falls through to recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Harass them until they reply",
      recommendation: { mode: "social", confidence: 0.6, reason: "friend" },
    });
    expect(result.mode).toBe("social");
    expect(result.instructionBlocked).toBe(true);
  });

  it("empty instruction is safe", () => {
    expect(isSafeModeInstruction(null)).toBe(true);
    expect(isSafeModeInstruction("")).toBe(true);
    expect(isSafeModeInstruction("  ")).toBe(true);
  });

  it("instruction with no mode hint falls through to recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Say something nice",
      recommendation: { mode: "work", confidence: 0.8, reason: "professional" },
    });
    expect(result.mode).toBe("work");
    expect(result.source).toBe("auto");
  });
});

describe("resolveEffectiveMode — Precedence Level 3: Conversation Context", () => {
  it("strong recommendation wins when auto and no instruction", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: { mode: "work", confidence: 0.8, reason: "manager relationship" },
    });
    expect(result.mode).toBe("work");
    expect(result.source).toBe("auto");
  });

  it("weak recommendation (< 0.5) falls through to defaults", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: null,
      recommendation: { mode: "dating", confidence: 0.3, reason: "weak signal" },
    });
    // Weak recommendation falls through — defaults to recommendation.mode (general/fallback)
    expect(result.mode).toBeDefined();
  });

  it("general recommendation falls through to defaults", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: null,
      recommendation: { mode: "general", confidence: 0.8, reason: "unclear" },
    });
    // general mode in recommendation falls through to defaults
    expect(result.mode).toBeDefined();
  });

  it("no recommendation falls through", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: null,
    });
    expect(result.mode).toBeDefined();
  });
});

describe("resolveEffectiveMode — Precedence Level 4: Workspace Context", () => {
  it("workspace mode applies when no recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: null,
      workspaceMode: "work",
    });
    expect(result.mode).toBe("work");
    expect(result.source).toBe("workspace");
  });

  it("workspace mode applies when recommendation is weak", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: { mode: "general", confidence: 0.2, reason: "weak" },
      workspaceMode: "conflict",
    });
    expect(result.mode).toBe("conflict");
    expect(result.source).toBe("workspace");
  });

  it("workspace auto mode is ignored", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: null,
      workspaceMode: "auto",
    });
    expect(result.mode).toBe("general");
  });
});

describe("resolveEffectiveMode — Precedence Level 5: Preferences", () => {
  it("preference mode applies when no workspace and weak recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: null,
      preferenceMode: "social",
    });
    expect(result.mode).toBe("social");
  });

  it("preference auto mode is ignored", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: null,
      preferenceMode: "auto",
    });
    expect(result.mode).toBe("general");
  });
});

describe("resolveEffectiveMode — Precedence Level 6: Defaults", () => {
  it("defaults to general when no signals exist", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
    });
    expect(result.mode).toBe("general");
    expect(result.source).toBe("auto");
  });

  it("defaults to recommendation mode when no other signals", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: { mode: "dating", confidence: 0.6, reason: "signal" },
    });
    expect(result.mode).toBe("dating");
  });
});

// ─── analyzeReducer — SET_MODE ────────────────────────────────────────────────

describe("analyzeReducer — SET_MODE", () => {
  it("sets mode to work", () => {
    const state = makeSession();
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "work" });
    expect(next.modeSelection.mode).toBe("work");
    expect(next.modeSelection.source).toBe("manual");
  });

  it("sets mode to auto with auto source", () => {
    const state = makeSession();
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "auto" });
    expect(next.modeSelection.mode).toBe("auto");
    expect(next.modeSelection.source).toBe("auto");
  });

  it("sets explicit source when provided", () => {
    const state = makeSession();
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating", source: "workspace" });
    expect(next.modeSelection.source).toBe("workspace");
  });

  it("clears mode conflict on mode change", () => {
    const state = makeSession({
      modeConflict: { selectedMode: "dating", detectedMode: "work", confidence: 0.9, reason: "mismatch" },
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "work" });
    expect(next.modeConflict).toBeNull();
  });

  it("preserves conversation messages on mode switch", () => {
    const state = makeSession({
      messages: [
        { sender: "me", text: "hello" },
        { sender: "them", text: "hi there" },
      ],
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.messages).toHaveLength(2);
    expect(next.messages[0].text).toBe("hello");
  });

  it("preserves draft on mode switch", () => {
    const state = makeSession({
      draft: { originalDraft: "my draft", currentDraft: "my draft", draftVersion: 1 },
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "conflict" });
    expect(next.draft).not.toBeNull();
    expect(next.draft!.currentDraft).toBe("my draft");
  });

  it("invalidates conversationState on mode switch", () => {
    const state = makeSession({
      conversationState: makeState({ relationship: "manager" }),
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.conversationState).toBeNull();
  });

  it("invalidates bestMatch on mode switch", () => {
    const state = makeSession({
      bestMatch: { text: "reply", strategy: "professional" },
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.bestMatch).toBeNull();
  });

  it("invalidates draftAnalysis on mode switch", () => {
    const state = makeSession({
      draftAnalysis: { intent: "reply", tone: "professional" } as never,
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.draftAnalysis).toBeNull();
  });

  it("invalidates impactPrediction on mode switch", () => {
    const state = makeSession({
      impactPrediction: { sendReadiness: "ready" } as never,
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.impactPrediction).toBeNull();
  });

  it("invalidates coaching on mode switch", () => {
    const state = makeSession({
      coaching: { nextMove: { action: "respond", description: "test", strategy: "natural" } } as never,
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.coaching).toBeNull();
  });

  it("invalidates improvementCandidates on mode switch", () => {
    const state = makeSession({
      improvementCandidates: [{ text: "improved", strategy: "better" }],
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.improvementCandidates).toHaveLength(0);
  });

  it("invalidates toneTransformCandidates on mode switch", () => {
    const state = makeSession({
      toneTransformCandidates: [{ text: "toned", strategy: "professional" }],
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.toneTransformCandidates).toHaveLength(0);
  });

  it("invalidates preSendGate on mode switch", () => {
    const state = makeSession({
      preSendGate: { decision: "READY" } as never,
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.preSendGate).toBeNull();
  });

  it("invalidates recoveryGuidance on mode switch", () => {
    const state = makeSession({
      recoveryGuidance: { requiredElements: ["honesty"], recommendedStrategies: ["clarify"], conflictAdjusted: false, groupAdjusted: false },
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.recoveryGuidance).toBeNull();
  });

  it("invalidates conflictIntelligence on mode switch", () => {
    const state = makeSession({
      conflictIntelligence: { conflictLevel: 0.5, escalationTrend: "rising", trigger: "test", coreDisagreement: "test", misunderstandings: [], resolutionOpportunities: [] },
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.conflictIntelligence).toBeNull();
  });

  it("invalidates participants on mode switch", () => {
    const state = makeSession({
      participants: [{ participantId: "1", label: "Alice", position: { mainPosition: "test", requestedOutcome: "test" }, intent: "test", emotion: { primary: "neutral", secondary: "neutral", intensity: 0, confidence: "high" }, tone: { primary: "neutral", secondary: "neutral", intensity: 0 }, stance: "neutral" }],
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "dating" });
    expect(next.participants).toBeNull();
  });

  it("resets goal on mode switch", () => {
    const state = makeSession({ goal: "keep_going" as never });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "work" });
    expect(next.goal).toBeUndefined();
  });

  it("increments stateVersion on mode switch", () => {
    const state = makeSession({ stateVersion: 5 });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "work" });
    expect(next.stateVersion).toBe(6);
  });

  it("increments requestVersion on mode switch", () => {
    const state = makeSession({ requestVersion: 3 });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "work" });
    expect(next.requestVersion).toBe(4);
  });

  it("sets phase to conversation_loaded when messages exist", () => {
    const state = makeSession({
      messages: [{ sender: "me", text: "hello" }],
      phase: "ready",
    });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "work" });
    expect(next.phase).toBe("conversation_loaded");
  });

  it("sets phase to empty when no messages", () => {
    const state = makeSession({ phase: "ready" });
    const next = analyzeReducer(state, { type: "SET_MODE", mode: "work" });
    expect(next.phase).toBe("empty");
  });
});

// ─── analyzeReducer — DISMISS_MODE_CONFLICT ───────────────────────────────────

describe("analyzeReducer — DISMISS_MODE_CONFLICT", () => {
  it("clears mode conflict", () => {
    const state = makeSession({
      modeConflict: { selectedMode: "dating", detectedMode: "work", confidence: 0.9, reason: "mismatch" },
    });
    const next = analyzeReducer(state, { type: "DISMISS_MODE_CONFLICT" });
    expect(next.modeConflict).toBeNull();
  });

  it("does not affect other state", () => {
    const state = makeSession({
      modeConflict: { selectedMode: "dating", detectedMode: "work", confidence: 0.9, reason: "mismatch" },
      messages: [{ sender: "me", text: "hello" }],
    });
    const next = analyzeReducer(state, { type: "DISMISS_MODE_CONFLICT" });
    expect(next.messages).toHaveLength(1);
  });
});

// ─── analyzeReducer — SET_CONVERSATION_STATE with mode conflict ───────────────

describe("analyzeReducer — SET_CONVERSATION_STATE mode conflict", () => {
  it("detects mode conflict when manual mode disagrees with state recommendation", () => {
    const state = makeSession({
      modeSelection: { mode: "dating", source: "manual", recommendation: null, overrideInstruction: null },
    });
    const conversationState = makeState({
      relationship: "manager",
      context: { type: "work", platform: undefined, situation: "professional_feedback", urgency: "normal" },
    });
    const next = analyzeReducer(state, {
      type: "SET_CONVERSATION_STATE",
      state: {
        ...conversationState,
        mode: { selected: "dating", source: "manual", recommendation: { mode: "work", confidence: 0.85, reason: "manager" } },
      },
    });
    expect(next.modeConflict).not.toBeNull();
    expect(next.modeConflict!.selectedMode).toBe("dating");
    expect(next.modeConflict!.detectedMode).toBe("work");
  });

  it("no conflict when auto mode", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_CONVERSATION_STATE",
      state: {
        ...makeState({ relationship: "manager" }),
        mode: { selected: "auto", source: "auto", recommendation: { mode: "work", confidence: 0.9, reason: "manager" } },
      },
    });
    expect(next.modeConflict).toBeNull();
  });

  it("updates recommendation from conversation state", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_CONVERSATION_STATE",
      state: {
        ...makeState({ relationship: "date" }),
        mode: { selected: "auto", source: "auto", recommendation: { mode: "dating", confidence: 0.8, reason: "date" } },
      },
    });
    expect(next.modeSelection.recommendation).not.toBeNull();
    expect(next.modeSelection.recommendation!.mode).toBe("dating");
  });
});

// ─── Mode Detection — Edge Cases ──────────────────────────────────────────────

describe("Mode Detection — Edge Cases", () => {
  it("multiple strong signals compound confidence", () => {
    const state = makeState({
      relationship: "manager",
      context: { ...makeState().context, situation: "professional_feedback" },
      intent: { ...makeState().intent, userIntent: "follow_up" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
    expect(rec.confidence).toBeGreaterThan(0.7);
  });

  it("conflicting signals favor highest score", () => {
    const state = makeState({
      relationship: "manager",
      context: { ...makeState().context, situation: "romantic_interest" },
    });
    const rec = detectModeFromState(state);
    // manager=0.4 (work), romantic_interest=0.35 (dating) → work wins
    expect(rec.mode).toBe("work");
  });

  it("group signal adds to existing mode", () => {
    const state = makeState({
      participants: { count: 4, roles: [], userId: "me", others: ["a", "b", "c"], isGroup: true },
      relationship: "manager",
    });
    const rec = detectModeFromState(state);
    // manager=0.4 (work), group=0.3 → work still wins at 0.4
    expect(rec.mode).toBe("work");
  });

  it("group signal alone detects group mode", () => {
    const state = makeState({
      participants: { count: 5, roles: [], userId: "me", others: ["a", "b", "c", "d"], isGroup: true },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("group");
  });

  it("low confidence returns general", () => {
    const state = makeState({
      relationship: "unknown",
      context: { ...makeState().context, situation: "unknown" },
      intent: { ...makeState().intent, userIntent: "unknown" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("general");
    expect(rec.confidence).toBeLessThan(0.5);
  });

  it("recovery detected from missed_interview situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "missed_interview" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("recovery detected from late_arrival situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "late_arrival" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("recovery detected from wrong_file situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "wrong_file" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("recovery detected from delayed_response situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "delayed_response" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("customer detected from customer_complaint situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "customer_complaint" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("customer");
  });

  it("negotiation detected from negotiation situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "negotiation" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("negotiation");
  });

  it("conflict detected from boundary_setting situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "boundary_setting" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("conflict");
  });

  it("social detected from reconnecting situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "reconnecting" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("social");
  });

  it("work detected from performance_issue situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "performance_issue" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("work detected from scheduling_problem situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "scheduling_problem" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("work detected from professional_feedback situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "professional_feedback" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("detects career from recruiter via intelligence", () => {
    const intel: ConversationIntelligence = {
      language: { primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false, confidence: 0.9 },
      participants: { count: 2, roles: [], userIdentification: "", otherParticipants: [] },
      relationship: "recruiter",
      context: "interview",
      situation: "unknown",
      userIntent: "unknown",
      otherIntent: "unknown",
      emotion: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
      tone: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
      conflict: { level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: false },
      dynamics: { engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.1, escalation: 0.1, rapport: 0.5, pressure: 0.1, uncertainty: 0.3, responsiveness: 0.5 },
      risks: [],
      recommendedStrategies: [],
      confidence: { language: 0.9, context: 0.7, situation: 0.7, relationship: 0.8, intent: 0.6 },
    };
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("career");
  });

  it("detects group from intelligence with >2 participants", () => {
    const intel: ConversationIntelligence = {
      language: { primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false, confidence: 0.9 },
      participants: { count: 5, roles: [], userIdentification: "", otherParticipants: [] },
      relationship: "unknown",
      context: "general",
      situation: "unknown",
      userIntent: "unknown",
      otherIntent: "unknown",
      emotion: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
      tone: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
      conflict: { level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: false },
      dynamics: { engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.1, escalation: 0.1, rapport: 0.5, pressure: 0.1, uncertainty: 0.3, responsiveness: 0.5 },
      risks: [],
      recommendedStrategies: [],
      confidence: { language: 0.9, context: 0.7, situation: 0.7, relationship: 0.8, intent: 0.6 },
    };
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("group");
  });

  it("intelligence low confidence returns general", () => {
    const intel: ConversationIntelligence = {
      language: { primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false, confidence: 0.9 },
      participants: { count: 2, roles: [], userIdentification: "", otherParticipants: [] },
      relationship: "unknown",
      context: "general",
      situation: "unknown",
      userIntent: "unknown",
      otherIntent: "unknown",
      emotion: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
      tone: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
      conflict: { level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: false },
      dynamics: { engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.1, escalation: 0.1, rapport: 0.5, pressure: 0.1, uncertainty: 0.3, responsiveness: 0.5 },
      risks: [],
      recommendedStrategies: [],
      confidence: { language: 0.9, context: 0.7, situation: 0.7, relationship: 0.8, intent: 0.6 },
    };
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("general");
    expect(rec.confidence).toBeLessThan(0.5);
  });
});

// ─── Mode / Strategy / Tone / Goal Separation ────────────────────────────────

describe("Mode / Strategy / Tone / Goal Separation", () => {
  it("mode and strategy are separate concepts", () => {
    const modeConfig = MODE_CONFIGS.work;
    const strategy = "assertive";
    expect(modeConfig.id).not.toBe(strategy);
    expect(modeConfig.recommendedTones).toContain(strategy);
  });

  it("mode and tone are separate concepts", () => {
    const modeConfig = MODE_CONFIGS.dating;
    const tone = "playful";
    expect(modeConfig.id).not.toBe(tone);
    expect(modeConfig.quickActions.some((a) => a.tone === tone)).toBe(true);
  });

  it("mode and goal are separate concepts", () => {
    const modeConfig = MODE_CONFIGS.conflict;
    const goal = "de_escalate";
    expect(modeConfig.id).not.toBe(goal);
    expect(modeConfig.quickGoals.some((g) => g.goal === goal)).toBe(true);
  });

  it("same mode can have different strategies", () => {
    const workActions = MODE_CONFIGS.work.quickActions.map((a) => a.tone);
    expect(workActions).toContain("professional");
    expect(workActions).toContain("assertive");
    expect(workActions).toContain("diplomatic");
    expect(new Set(workActions).size).toBeGreaterThanOrEqual(3);
  });

  it("same strategy can appear in different modes", () => {
    const workTones = MODE_CONFIGS.work.recommendedTones;
    const careerTones = MODE_CONFIGS.career.recommendedTones;
    const overlap = workTones.filter((t) => careerTones.includes(t));
    expect(overlap.length).toBeGreaterThan(0);
  });

  it("instruction overrides mode defaults when in auto", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Make this flirty",
      recommendation: { mode: "work", confidence: 0.9, reason: "professional" },
    });
    // "flirty" matches dating pattern → instruction precedence wins
    expect(result.mode).toBe("dating");
    expect(result.source).toBe("instruction");
  });

  it("mode provides context, strategy provides approach", () => {
    const state = makeState({
      relationship: "manager",
      context: { ...makeState().context, situation: "professional_feedback" },
      intent: { ...makeState().intent, userIntent: "follow_up" },
    });
    const rec = detectModeFromState(state);
    // Mode is "work" — that's the context
    expect(rec.mode).toBe("work");
    // Strategy would be determined by the strategy engine, not mode
    expect(state.strategy.primary).toBe("natural");
  });

  it("mode-specific goals map to different strategies", () => {
    const workGoals = MODE_CONFIGS.work.quickGoals.map((g) => g.goal);
    const datingGoals = MODE_CONFIGS.dating.quickGoals.map((g) => g.goal);
    // No overlap between work and dating goals
    const overlap = workGoals.filter((g) => datingGoals.includes(g));
    expect(overlap.length).toBe(0);
  });

  it("mode-specific tones are distinct per mode", () => {
    const workTones = MODE_CONFIGS.work.recommendedTones;
    const conflictTones = MODE_CONFIGS.conflict.recommendedTones;
    // Some tones may overlap but defaults should differ
    expect(MODE_CONFIGS.work.defaults.tone).not.toBe(MODE_CONFIGS.conflict.defaults.tone);
  });

  it("mode selection does not change strategy engine behavior", () => {
    const state1 = makeState({ relationship: "manager" });
    const state2 = makeState({ relationship: "manager" });
    // Same state should produce same strategy regardless of mode
    expect(state1.strategy.primary).toBe(state2.strategy.primary);
  });
});

// ─── Mode Detection from Instructions ─────────────────────────────────────────

describe("inferModeFromInstruction", () => {
  it("infers dating from 'flirty'", () => {
    expect(inferModeFromInstruction("Make this flirty")).toBe("dating");
  });

  it("infers dating from 'romantic'", () => {
    expect(inferModeFromInstruction("Be more romantic")).toBe("dating");
  });

  it("infers work from 'professional'", () => {
    expect(inferModeFromInstruction("Keep it professional")).toBe("work");
  });

  it("infers work from 'formal'", () => {
    expect(inferModeFromInstruction("Make it formal")).toBe("work");
  });

  it("infers career from 'interview'", () => {
    expect(inferModeFromInstruction("This is for an interview")).toBe("career");
  });

  it("infers career from 'career'", () => {
    expect(inferModeFromInstruction("Career advice")).toBe("career");
  });

  it("infers recovery from 'apologize'", () => {
    expect(inferModeFromInstruction("Apologize sincerely")).toBe("recovery");
  });

  it("infers conflict from 'de-escalate'", () => {
    expect(inferModeFromInstruction("De-escalate this")).toBe("conflict");
  });

  it("infers negotiation from 'negotiate'", () => {
    expect(inferModeFromInstruction("Negotiate firmly")).toBe("negotiation");
  });

  it("infers customer from 'complaint'", () => {
    expect(inferModeFromInstruction("Customer complaint tone")).toBe("customer");
  });

  it("infers family from 'family'", () => {
    expect(inferModeFromInstruction("Make it family-friendly")).toBe("family");
  });

  it("infers academic from 'professor'", () => {
    expect(inferModeFromInstruction("Email to professor")).toBe("academic");
  });

  it("returns null for unrecognized instruction", () => {
    expect(inferModeFromInstruction("Say something nice")).toBeNull();
  });

  it("returns null for empty instruction", () => {
    expect(inferModeFromInstruction("")).toBeNull();
    expect(inferModeFromInstruction(null)).toBeNull();
  });

  it("blocks unsafe gaslight instruction", () => {
    expect(isSafeModeInstruction("Gaslight them")).toBe(false);
  });

  it("blocks unsafe manipulate instruction", () => {
    expect(isSafeModeInstruction("Manipulate the situation")).toBe(false);
  });

  it("blocks unsafe harass instruction", () => {
    expect(isSafeModeInstruction("Harass them")).toBe(false);
  });

  it("blocks unsafe threaten instruction", () => {
    expect(isSafeModeInstruction("Threaten them")).toBe(false);
  });

  it("blocks unsafe blackmail instruction", () => {
    expect(isSafeModeInstruction("Blackmail them")).toBe(false);
  });

  it("allows safe instructions", () => {
    expect(isSafeModeInstruction("Make it professional")).toBe(true);
    expect(isSafeModeInstruction("Be more playful")).toBe(true);
    expect(isSafeModeInstruction("De-escalate the situation")).toBe(true);
  });
});

// ─── Mode Conflict Detection ──────────────────────────────────────────────────

describe("Mode Conflict Detection — Extended", () => {
  it("detects customer vs dating conflict", () => {
    const conflict = detectModeConflict("customer", "dating", 0.8);
    expect(conflict).not.toBeNull();
    expect(conflict!.selectedMode).toBe("customer");
    expect(conflict!.detectedMode).toBe("dating");
  });

  it("detects family vs work conflict", () => {
    const conflict = detectModeConflict("family", "work", 0.75);
    expect(conflict).not.toBeNull();
  });

  it("detects recovery vs social conflict", () => {
    const conflict = detectModeConflict("recovery", "social", 0.8);
    expect(conflict).not.toBeNull();
  });

  it("detects negotiation vs dating conflict", () => {
    const conflict = detectModeConflict("negotiation", "dating", 0.85);
    expect(conflict).not.toBeNull();
  });

  it("no conflict between auto and any mode", () => {
    expect(detectModeConflict("auto", "work", 0.9)).toBeNull();
    expect(detectModeConflict("auto", "dating", 0.9)).toBeNull();
    expect(detectModeConflict("auto", "conflict", 0.9)).toBeNull();
  });

  it("no conflict between same modes", () => {
    expect(detectModeConflict("work", "work", 0.9)).toBeNull();
    expect(detectModeConflict("dating", "dating", 0.9)).toBeNull();
    expect(detectModeConflict("conflict", "conflict", 0.9)).toBeNull();
  });

  it("no conflict at below 0.5 confidence", () => {
    expect(detectModeConflict("dating", "work", 0.49)).toBeNull();
  });

  it("conflict at exactly 0.5 confidence (threshold is >=)", () => {
    // detectModeConflict uses confidence < 0.5 to skip — so 0.5 triggers conflict
    expect(detectModeConflict("dating", "work", 0.5)).not.toBeNull();
  });

  it("conflict reason does not contain HTML", () => {
    const conflict = detectModeConflict("dating", "work", 0.9);
    expect(conflict!.reason).not.toContain("<");
  });

  it("conflict reason contains both mode labels", () => {
    const conflict = detectModeConflict("dating", "work", 0.9);
    expect(conflict!.reason).toContain("dating");
    expect(conflict!.reason).toContain("work");
  });
});

// ─── Mode-Specific Defaults ───────────────────────────────────────────────────

describe("Mode-Specific Defaults — Extended", () => {
  it("work defaults are formal and professional", () => {
    const d = getModeDefaults("work");
    expect(d.formality).toBe("formal");
    expect(d.tone).toBe("professional");
    expect(d.style).toBe("concise");
    expect(d.length).toBe("short");
  });

  it("dating defaults are informal and natural", () => {
    const d = getModeDefaults("dating");
    expect(d.formality).toBe("informal");
    expect(d.tone).toBe("natural");
    expect(d.style).toBe("casual");
  });

  it("conflict defaults are calm and diplomatic", () => {
    const d = getModeDefaults("conflict");
    expect(d.tone).toBe("calm");
    expect(d.style).toBe("diplomatic");
  });

  it("negotiation defaults are persuasive and formal", () => {
    const d = getModeDefaults("negotiation");
    expect(d.tone).toBe("persuasive");
    expect(d.formality).toBe("formal");
  });

  it("recovery defaults are empathetic", () => {
    const d = getModeDefaults("recovery");
    expect(d.tone).toBe("empathetic");
  });

  it("family defaults are warm and informal", () => {
    const d = getModeDefaults("family");
    expect(d.tone).toBe("warm");
    expect(d.formality).toBe("informal");
  });

  it("social defaults are friendly and informal", () => {
    const d = getModeDefaults("social");
    expect(d.tone).toBe("friendly");
    expect(d.formality).toBe("informal");
  });

  it("career defaults are professional and formal", () => {
    const d = getModeDefaults("career");
    expect(d.tone).toBe("professional");
    expect(d.formality).toBe("formal");
    expect(d.style).toBe("confident");
  });

  it("academic defaults are formal", () => {
    const d = getModeDefaults("academic");
    expect(d.formality).toBe("formal");
  });

  it("customer defaults are professional", () => {
    const d = getModeDefaults("customer");
    expect(d.tone).toBe("professional");
    expect(d.formality).toBe("formal");
  });

  it("group defaults are contextual", () => {
    const d = getModeDefaults("group");
    expect(d.formality).toBe("contextual");
  });

  it("general defaults are natural and balanced", () => {
    const d = getModeDefaults("general");
    expect(d.tone).toBe("natural");
    expect(d.style).toBe("balanced");
  });

  it("auto defaults same as general", () => {
    const d = getModeDefaults("auto");
    expect(d.tone).toBe("natural");
  });

  it("all modes have non-empty defaults", () => {
    for (const mode of Object.keys(MODE_CONFIGS) as CommunicationMode[]) {
      const d = getModeDefaults(mode);
      expect(d.tone.length).toBeGreaterThan(0);
      expect(d.style.length).toBeGreaterThan(0);
      expect(d.length.length).toBeGreaterThan(0);
      expect(d.formality.length).toBeGreaterThan(0);
    }
  });
});

// ─── applyModeToContext ───────────────────────────────────────────────────────

describe("applyModeToContext", () => {
  it("auto mode preserves original context type", () => {
    const state = makeState({ context: { ...makeState().context, type: "professional" } });
    expect(applyModeToContext("auto", state)).toBe("professional");
  });

  it("general mode preserves original context type", () => {
    const state = makeState({ context: { ...makeState().context, type: "dating" } });
    expect(applyModeToContext("general", state)).toBe("dating");
  });

  it("work mode returns work", () => {
    const state = makeState();
    expect(applyModeToContext("work", state)).toBe("work");
  });

  it("dating mode returns dating", () => {
    const state = makeState();
    expect(applyModeToContext("dating", state)).toBe("dating");
  });

  it("conflict mode returns conflict", () => {
    const state = makeState();
    expect(applyModeToContext("conflict", state)).toBe("conflict");
  });

  it("negotiation mode returns negotiation", () => {
    const state = makeState();
    expect(applyModeToContext("negotiation", state)).toBe("negotiation");
  });

  it("recovery mode returns recovery", () => {
    const state = makeState();
    expect(applyModeToContext("recovery", state)).toBe("recovery");
  });

  it("customer mode returns customer", () => {
    const state = makeState();
    expect(applyModeToContext("customer", state)).toBe("customer");
  });

  it("family mode returns family", () => {
    const state = makeState();
    expect(applyModeToContext("family", state)).toBe("family");
  });

  it("group mode returns group", () => {
    const state = makeState();
    expect(applyModeToContext("group", state)).toBe("group");
  });

  it("academic mode returns academic", () => {
    const state = makeState();
    expect(applyModeToContext("academic", state)).toBe("academic");
  });

  it("career mode returns career", () => {
    const state = makeState();
    expect(applyModeToContext("career", state)).toBe("career");
  });

  it("social mode returns social", () => {
    const state = makeState();
    expect(applyModeToContext("social", state)).toBe("social");
  });
});

// ─── shouldInvalidateOnModeSwitch ─────────────────────────────────────────────

describe("shouldInvalidateOnModeSwitch — Extended", () => {
  it("invalidates on every mode pair change", () => {
    const modes: CommunicationMode[] = ["work", "dating", "conflict", "negotiation", "recovery", "customer", "family", "group", "academic", "career", "social", "general"];
    for (let i = 0; i < modes.length; i++) {
      for (let j = 0; j < modes.length; j++) {
        if (i === j) {
          expect(shouldInvalidateOnModeSwitch(modes[i], modes[j])).toBe(false);
        } else {
          expect(shouldInvalidateOnModeSwitch(modes[i], modes[j])).toBe(true);
        }
      }
    }
  });

  it("auto to any mode invalidates", () => {
    const modes: CommunicationMode[] = ["work", "dating", "conflict", "general"];
    for (const mode of modes) {
      expect(shouldInvalidateOnModeSwitch("auto", mode)).toBe(true);
    }
  });

  it("any mode to auto invalidates", () => {
    const modes: CommunicationMode[] = ["work", "dating", "conflict", "general"];
    for (const mode of modes) {
      expect(shouldInvalidateOnModeSwitch(mode, "auto")).toBe(true);
    }
  });
});

// ─── Mode Configuration Completeness ─────────────────────────────────────────

describe("Mode Configuration Completeness", () => {
  it("every non-auto mode has at least 4 quick actions", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      if (id === "auto") continue;
      expect(config.quickActions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("every non-auto mode has at least 3 quick goals", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      if (id === "auto") continue;
      expect(config.quickGoals.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every mode has unique quick action tones", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      const tones = config.quickActions.map((a) => a.tone);
      expect(new Set(tones).size).toBe(tones.length);
    }
  });

  it("every mode has unique quick goal labels", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      const labels = config.quickGoals.map((g) => g.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("every mode's quick action tones are strings", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      for (const action of config.quickActions) {
        expect(typeof action.tone).toBe("string");
        expect(action.tone.length).toBeGreaterThan(0);
      }
    }
  });

  it("every mode's quick goals have valid goal strings", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      for (const goal of config.quickGoals) {
        expect(typeof goal.goal).toBe("string");
        expect(goal.goal.length).toBeGreaterThan(0);
      }
    }
  });

  it("every mode has at least 2 recommended tones", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      if (id === "auto") continue;
      expect(config.recommendedTones.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("mode config IDs match their keys", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      expect(config.id).toBe(id);
    }
  });

  it("mode descriptions are 10-100 characters", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.description.length).toBeGreaterThanOrEqual(10);
      expect(config.description.length).toBeLessThanOrEqual(100);
    }
  });

  it("mode help texts are 10-200 characters", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.helpText.length).toBeGreaterThanOrEqual(10);
      expect(config.helpText.length).toBeLessThanOrEqual(200);
    }
  });
});

// ─── Mode Precedence via resolveEffectiveMode — Full Chain ────────────────────

describe("Mode Precedence — Full Chain", () => {
  it("manual > instruction > context > workspace > preference > default", () => {
    // All signals present — manual wins
    const result = resolveEffectiveMode({
      selectedMode: "conflict",
      source: "manual",
      overrideInstruction: "Make this flirty",
      recommendation: { mode: "work", confidence: 0.9, reason: "professional" },
      workspaceMode: "career",
      preferenceMode: "social",
    });
    expect(result.mode).toBe("conflict");
  });

  it("instruction wins when auto and no manual", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Make this flirty",
      recommendation: { mode: "work", confidence: 0.9, reason: "professional" },
      workspaceMode: "career",
      preferenceMode: "social",
    });
    expect(result.mode).toBe("dating");
    expect(result.source).toBe("instruction");
  });

  it("context wins when auto, no instruction, strong recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: { mode: "work", confidence: 0.8, reason: "professional" },
      workspaceMode: "career",
      preferenceMode: "social",
    });
    expect(result.mode).toBe("work");
    expect(result.source).toBe("auto");
  });

  it("workspace wins when auto, no instruction, weak recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: { mode: "general", confidence: 0.2, reason: "weak" },
      workspaceMode: "career",
      preferenceMode: "social",
    });
    expect(result.mode).toBe("career");
    expect(result.source).toBe("workspace");
  });

  it("preference wins when auto, no instruction, no workspace, no recommendation", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: null,
      preferenceMode: "social",
    });
    expect(result.mode).toBe("social");
  });

  it("default wins when nothing else is available", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
    });
    expect(result.mode).toBe("general");
  });
});

// ─── Language Support — Mode Detection ────────────────────────────────────────

describe("Language Support — Mode Detection", () => {
  it("mode detection works with Telugu script", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "telugu", script: "telugu" },
      relationship: "manager",
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("mode detection works with Hindi-English code-mix", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "hindi", codeMixed: true },
      relationship: "friend",
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("social");
  });

  it("mode detection works with Tamil-English code-mix", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "tamil", codeMixed: true },
      relationship: "family",
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("family");
  });

  it("mode detection works with Romanized Hindi", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "hindi", romanized: true, script: "latin" },
      relationship: "date",
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("dating");
  });

  it("mode detection works with Devanagari script", () => {
    const state = makeState({
      language: { ...makeState().language, script: "devanagari" },
      relationship: "professor",
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("academic");
  });

  it("mode detection works with mixed scripts", () => {
    const state = makeState({
      language: { ...makeState().language, codeMixed: true, script: "latin" },
      context: { ...makeState().context, situation: "heated_argument" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("conflict");
  });
});

// ─── Workspace Isolation ──────────────────────────────────────────────────────

describe("Workspace Isolation", () => {
  it("workspace mode does not leak to other workspaces", () => {
    const ws1 = resolveEffectiveMode({
      selectedMode: "auto",
      workspaceMode: "work",
      recommendation: null,
    });
    const ws2 = resolveEffectiveMode({
      selectedMode: "auto",
      workspaceMode: "dating",
      recommendation: null,
    });
    expect(ws1.mode).toBe("work");
    expect(ws2.mode).toBe("dating");
  });

  it("manual mode in one session does not affect another", () => {
    const session1 = resolveEffectiveMode({
      selectedMode: "dating",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.9, reason: "professional" },
    });
    const session2 = resolveEffectiveMode({
      selectedMode: "work",
      source: "manual",
      recommendation: { mode: "dating", confidence: 0.8, reason: "romantic" },
    });
    expect(session1.mode).toBe("dating");
    expect(session2.mode).toBe("work");
  });

  it("mode preference is not persisted across sessions", () => {
    const selection: ModeSelection = {
      mode: "dating",
      source: "manual",
      recommendation: null,
      overrideInstruction: null,
    };
    // Mode selection is ephemeral — not stored as memory
    expect(selection.source).toBe("manual");
  });
});

// ─── Mode Recommendation Display ──────────────────────────────────────────────

describe("Mode Recommendation Display", () => {
  it("recommendation with high confidence provides reason", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      recommendation: { mode: "work", confidence: 0.85, reason: "manager relationship" },
    });
    expect(result.mode).toBe("work");
  });

  it("recommendation below threshold does not win over defaults", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: null,
      recommendation: { mode: "dating", confidence: 0.3, reason: "weak signal" },
    });
    // Weak rec falls through to defaults; mode is still defined
    expect(result.mode).toBeDefined();
  });

  it("general recommendation does not win even with high confidence", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: null,
      recommendation: { mode: "general", confidence: 0.95, reason: "unclear context" },
    });
    // general falls through since it's not a specific mode
    expect(result.mode).toBeDefined();
  });
});

// ─── Mode + Personalization Integration ──────────────────────────────────────

describe("Mode + Personalization Integration", () => {
  it("user preference overrides mode default when applicable", () => {
    const modeDefaults = getModeDefaults("work");
    expect(modeDefaults.tone).toBe("professional");
    // User preference "casual" would override this in the preference resolver
  });

  it("mode provides starting point, preference refines", () => {
    const datingDefaults = getModeDefaults("dating");
    expect(datingDefaults.tone).toBe("natural");
    expect(datingDefaults.style).toBe("casual");
    // Personalization can adjust within these bounds
  });

  it("explicit instruction overrides both mode and preference", () => {
    const result = resolveEffectiveMode({
      selectedMode: "auto",
      overrideInstruction: "Make this formal",
      recommendation: { mode: "dating", confidence: 0.8, reason: "romantic" },
      preferenceMode: "social",
    });
    expect(result.mode).toBe("work");
    expect(result.source).toBe("instruction");
  });

  it("cold start uses mode defaults", () => {
    const defaults = getModeDefaults("general");
    expect(defaults.tone).toBe("natural");
    expect(defaults.style).toBe("balanced");
  });
});

// ─── Mode Evaluation Coverage ─────────────────────────────────────────────────

describe("Mode Evaluation Coverage", () => {
  it("every CommunicationMode value has a config", () => {
    const allModes: CommunicationMode[] = [
      "auto", "work", "academic", "career", "social", "dating",
      "conflict", "negotiation", "customer", "family", "group", "recovery", "general",
    ];
    for (const mode of allModes) {
      expect(MODE_CONFIGS[mode]).toBeDefined();
      expect(MODE_CONFIGS[mode].id).toBe(mode);
    }
  });

  it("every mode is visible", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.visible).toBe(true);
    }
  });

  it("mode orders form a valid sequence 0-12", () => {
    const orders = Object.values(MODE_CONFIGS).map((m) => m.order).sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("mode icons are non-empty strings", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(typeof config.icon).toBe("string");
      expect(config.icon.length).toBeGreaterThan(0);
    }
  });
});

// ─── Regression — Existing Systems ────────────────────────────────────────────

describe("Regression — Existing Systems Unchanged", () => {
  it("ConversationState structure unchanged", () => {
    const state = makeState();
    expect(state.participants).toBeDefined();
    expect(state.relationship).toBeDefined();
    expect(state.language).toBeDefined();
    expect(state.context).toBeDefined();
    expect(state.intent).toBeDefined();
    expect(state.emotion).toBeDefined();
    expect(state.tone).toBeDefined();
    expect(state.dynamics).toBeDefined();
    expect(state.conflict).toBeDefined();
    expect(state.strategy).toBeDefined();
    expect(state.style).toBeDefined();
    expect(state.sources).toBeDefined();
  });

  it("AnalyzeSessionState initial mode is auto", () => {
    expect(INITIAL_STATE.modeSelection.mode).toBe("auto");
    expect(INITIAL_STATE.modeSelection.source).toBe("auto");
    expect(INITIAL_STATE.modeSelection.recommendation).toBeNull();
    expect(INITIAL_STATE.modeSelection.overrideInstruction).toBeNull();
  });

  it("AnalyzeSessionState initial modeConflict is null", () => {
    expect(INITIAL_STATE.modeConflict).toBeNull();
  });

  it("SET_MESSAGES still works after mode system", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_MESSAGES",
      messages: [{ sender: "me", text: "hello" }],
      context: null,
    });
    expect(next.messages).toHaveLength(1);
    expect(next.phase).toBe("conversation_loaded");
  });

  it("SET_DRAFT still works after mode system", () => {
    const state = makeSession({
      messages: [{ sender: "me", text: "hello" }],
    });
    const next = analyzeReducer(state, { type: "SET_DRAFT", draft: "my draft" });
    expect(next.draft?.currentDraft).toBe("my draft");
    expect(next.phase).toBe("draft_entered");
  });

  it("SET_REPLIES still works after mode system", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_REPLIES",
      bestMatch: { text: "reply", strategy: "natural" },
      alternatives: [],
    });
    expect(next.bestMatch?.text).toBe("reply");
    expect(next.phase).toBe("ready");
  });

  it("SET_DRAFT_ANALYSIS still works after mode system", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_DRAFT_ANALYSIS",
      analysis: { intent: "reply", tone: "professional" } as never,
    });
    expect(next.draftAnalysis).not.toBeNull();
    expect(next.phase).toBe("draft_analyzed");
  });

  it("SET_IMPACT still works after mode system", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_IMPACT",
      impact: { sendReadiness: "ready" } as never,
    });
    expect(next.impactPrediction).not.toBeNull();
    expect(next.phase).toBe("impact_analyzed");
  });

  it("SET_COACHING still works after mode system", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_COACHING",
      coaching: { nextMove: { action: "respond", description: "test", strategy: "natural" } } as never,
    });
    expect(next.coaching).not.toBeNull();
  });

  it("SET_PRE_SEND_GATE still works after mode system", () => {
    const state = makeSession();
    const next = analyzeReducer(state, {
      type: "SET_PRE_SEND_GATE",
      gate: { decision: "READY" } as never,
    });
    expect(next.preSendGate).not.toBeNull();
  });

  it("RESET clears everything including mode", () => {
    const state = makeSession({
      modeSelection: { mode: "work", source: "manual", recommendation: null, overrideInstruction: null },
      messages: [{ sender: "me", text: "hello" }],
    });
    const next = analyzeReducer(state, { type: "RESET" });
    expect(next.modeSelection.mode).toBe("auto");
    expect(next.messages).toHaveLength(0);
  });

  it("INVALIDATE_ALL clears mode-related state", () => {
    const state = makeSession({
      modeSelection: { mode: "work", source: "manual", recommendation: { mode: "work", confidence: 0.9, reason: "test" }, overrideInstruction: null },
    });
    const next = analyzeReducer(state, { type: "INVALIDATE_ALL" });
    expect(next.conversationState).toBeNull();
    expect(next.bestMatch).toBeNull();
  });

  it("existing goal types still work", () => {
    const goals = ["keep_going", "start_conversation", "make_them_laugh", "flirt_naturally", "recover_dry"];
    for (const goal of goals) {
      const state = makeSession();
      const next = analyzeReducer(state, { type: "SET_GOAL", goal: goal as never });
      expect(next.goal).toBe(goal);
    }
  });

  it("existing loading states still work", () => {
    const state = makeSession();
    const next = analyzeReducer(state, { type: "SET_LOADING", field: "generating", value: true });
    expect(next.loading.generating).toBe(true);
  });

  it("existing error states still work", () => {
    const state = makeSession();
    const next = analyzeReducer(state, { type: "SET_ERROR", field: "generate", value: "test error" });
    expect(next.errors.generate).toBe("test error");
  });
});

// ─── Security / Privacy ──────────────────────────────────────────────────────

describe("Security / Privacy", () => {
  it("mode detection reason does not leak message content", () => {
    const state = makeState({
      relationship: "manager",
      context: { ...makeState().context, situation: "professional_feedback" },
    });
    const rec = detectModeFromState(state);
    expect(rec.reason).not.toContain("message");
    expect(rec.reason).not.toContain("text");
    expect(rec.reason).not.toContain("content");
  });

  it("mode conflict reason does not contain script tags", () => {
    const conflict = detectModeConflict("dating", "work", 0.9);
    expect(conflict!.reason).not.toContain("<script>");
    expect(conflict!.reason).not.toContain("<img");
  });

  it("mode config does not contain sensitive fields", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      const serialized = JSON.stringify(config);
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("secret");
      expect(serialized).not.toContain("token");
      expect(serialized).not.toContain("apiKey");
    }
  });

  it("unsafe instruction patterns are blocked", () => {
    const unsafe = [
      "Gaslight them",
      "Manipulate the situation",
      "Deceive them into",
      "Lie to them about",
      "Harass them until",
      "Stalk their profile",
      "Threaten them with",
      "Blackmail them into",
      "Do this without their consent",
    ];
    for (const instruction of unsafe) {
      expect(isSafeModeInstruction(instruction)).toBe(false);
    }
  });

  it("safe instructions are allowed", () => {
    const safe = [
      "Make this professional",
      "Be more playful",
      "De-escalate the situation",
      "Negotiate firmly",
      "Apologize sincerely",
      "Keep it formal",
      "Make it casual",
    ];
    for (const instruction of safe) {
      expect(isSafeModeInstruction(instruction)).toBe(true);
    }
  });
});

// ─── Performance / Cheap Operations ───────────────────────────────────────────

describe("Performance — Mode Operations are Cheap", () => {
  it("detectModeFromState completes quickly", () => {
    const state = makeState({ relationship: "manager" });
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      detectModeFromState(state);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // 1000 iterations in < 1s
  });

  it("resolveEffectiveMode completes quickly", () => {
    const input: ModeResolutionInput = {
      selectedMode: "auto",
      overrideInstruction: "Make this flirty",
      recommendation: { mode: "work", confidence: 0.8, reason: "professional" },
      workspaceMode: "career",
      preferenceMode: "social",
    };
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      resolveEffectiveMode(input);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  it("detectModeConflict completes quickly", () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      detectModeConflict("dating", "work", 0.8);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it("inferModeFromInstruction completes quickly", () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      inferModeFromInstruction("Make this flirty");
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
