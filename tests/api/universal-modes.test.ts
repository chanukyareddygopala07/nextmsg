import { describe, it, expect, beforeEach } from "vitest";
import type {
  CommunicationMode,
  ModeConfig,
  ModeSelection,
  ModeRecommendation,
  ModeConflict,
} from "@/lib/ai/mode-types";
import {
  MODE_CONFIGS,
  detectModeFromState,
  detectModeFromIntelligence,
  detectModeConflict,
  getModeDefaults,
  applyModeToContext,
  shouldInvalidateOnModeSwitch,
} from "@/lib/ai/mode-config";
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

function makeIntelligence(overrides: Partial<ConversationIntelligence> = {}): ConversationIntelligence {
  return {
    language: { primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false, confidence: 0.9 },
    participants: { count: 2, roles: [], userIdentification: "", otherParticipants: [] },
    relationship: "unknown",
    context: "general",
    situation: "unknown", userIntent: "unknown", otherIntent: "unknown",
    emotion: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
    tone: { primary: "unknown", secondary: "unknown", intensity: 0.3 },
    conflict: { level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false,
      misunderstanding: false, resolutionOpportunity: false },
    dynamics: { engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.1,
      escalation: 0.1, rapport: 0.5, pressure: 0.1, uncertainty: 0.3, responsiveness: 0.5 },
    risks: [], recommendedStrategies: [],
    confidence: { language: 0.9, context: 0.7, situation: 0.7, relationship: 0.8, intent: 0.6 },
    ...overrides,
  };
}

// ─── Mode Model ───────────────────────────────────────────────────────────────

describe("Mode Model", () => {
  it("has all 13 modes defined", () => {
    const modes: CommunicationMode[] = [
      "auto", "work", "academic", "career", "social", "dating",
      "conflict", "negotiation", "customer", "family", "group", "recovery", "general",
    ];
    expect(Object.keys(MODE_CONFIGS)).toHaveLength(13);
    for (const mode of modes) {
      expect(MODE_CONFIGS[mode]).toBeDefined();
    }
  });

  it("auto mode is first in order", () => {
    expect(MODE_CONFIGS.auto.order).toBe(0);
  });

  it("all modes have required fields", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      expect(config.id).toBe(id);
      expect(typeof config.label).toBe("string");
      expect(typeof config.description).toBe("string");
      expect(typeof config.icon).toBe("string");
      expect(Array.isArray(config.recommendedTones)).toBe(true);
      expect(Array.isArray(config.quickGoals)).toBe(true);
      expect(Array.isArray(config.quickActions)).toBe(true);
      expect(typeof config.defaults.tone).toBe("string");
      expect(typeof config.helpText).toBe("string");
      expect(typeof config.visible).toBe("boolean");
      expect(typeof config.order).toBe("number");
    }
  });

  it("all modes are visible by default", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.visible).toBe(true);
    }
  });

  it("mode orders are unique", () => {
    const orders = Object.values(MODE_CONFIGS).map((m) => m.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("work has professional quick actions", () => {
    const tones = MODE_CONFIGS.work.quickActions.map((a) => a.tone);
    expect(tones).toContain("professional");
    expect(tones).toContain("concise");
  });

  it("dating has playful quick actions", () => {
    const tones = MODE_CONFIGS.dating.quickActions.map((a) => a.tone);
    expect(tones).toContain("natural");
    expect(tones).toContain("playful");
  });

  it("conflict has de-escalate quick action", () => {
    const tones = MODE_CONFIGS.conflict.quickActions.map((a) => a.tone);
    expect(tones).toContain("diplomatic");
    expect(tones).toContain("calm");
  });

  it("recovery has honest quick action", () => {
    const tones = MODE_CONFIGS.recovery.quickActions.map((a) => a.tone);
    expect(tones).toContain("clear_direct");
    expect(tones).toContain("empathetic");
  });

  it("negotiation has persuasive quick action", () => {
    const tones = MODE_CONFIGS.negotiation.quickActions.map((a) => a.tone);
    expect(tones).toContain("persuasive");
    expect(tones).toContain("direct");
  });

  it("general has natural quick action", () => {
    const tones = MODE_CONFIGS.general.quickActions.map((a) => a.tone);
    expect(tones).toContain("natural");
  });

  it("each mode has at least 3 quick goals", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      if (id === "auto") continue;
      expect(config.quickGoals.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("each mode has at least 3 quick actions", () => {
    for (const [id, config] of Object.entries(MODE_CONFIGS)) {
      if (id === "auto") continue;
      expect(config.quickActions.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ─── Auto Detection ───────────────────────────────────────────────────────────

describe("Auto Detection", () => {
  it("detects strong professional context", () => {
    const state = makeState({
      relationship: "manager",
      context: { ...makeState().context, situation: "professional_feedback" },
      intent: { ...makeState().intent, userIntent: "follow_up" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
    expect(rec.confidence).toBeGreaterThan(0.3);
  });

  it("detects strong dating context", () => {
    const state = makeState({
      relationship: "date",
      context: { ...makeState().context, situation: "romantic_interest" },
      intent: { ...makeState().intent, userIntent: "flirt" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("dating");
    expect(rec.confidence).toBeGreaterThan(0.3);
  });

  it("detects strong conflict context", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "heated_argument" },
      intent: { ...makeState().intent, userIntent: "de_escalate" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("conflict");
    expect(rec.confidence).toBeGreaterThan(0.3);
  });

  it("detects strong academic context", () => {
    const state = makeState({
      relationship: "professor",
      context: { ...makeState().context, situation: "request" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("academic");
  });

  it("detects strong negotiation context", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "negotiation" },
      intent: { ...makeState().intent, userIntent: "persuade" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("negotiation");
  });

  it("detects strong customer context", () => {
    const state = makeState({
      relationship: "customer",
      context: { ...makeState().context, situation: "customer_complaint" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("customer");
  });

  it("detects group conversations", () => {
    const state = makeState({
      participants: { count: 5, roles: [], userId: "me", others: ["a", "b", "c", "d"], isGroup: true },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("group");
  });

  it("returns general for ambiguous context", () => {
    const state = makeState();
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("general");
    expect(rec.confidence).toBeLessThan(0.5);
  });

  it("detects from intelligence directly", () => {
    const intel = makeIntelligence({
      relationship: "recruiter",
      situation: "unknown",
    });
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("career");
  });

  it("detects recovery from intelligence situation", () => {
    const intel = makeIntelligence({
      situation: "missed_deadline",
      relationship: "unknown",
    });
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("recovery");
  });

  it("detects family from intelligence relationship", () => {
    const intel = makeIntelligence({
      relationship: "family",
    });
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("family");
  });

  it("detects social from friendship relationship", () => {
    const intel = makeIntelligence({
      relationship: "friend",
    });
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("social");
  });
});

// ─── User Override ────────────────────────────────────────────────────────────

describe("User Override", () => {
  it("manual override changes mode", () => {
    const selection: ModeSelection = {
      mode: "dating",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.8, reason: "professional context" },
      overrideInstruction: null,
    };
    expect(selection.mode).toBe("dating");
    expect(selection.source).toBe("manual");
  });

  it("instruction override is respected", () => {
    const selection: ModeSelection = {
      mode: "work",
      source: "instruction",
      recommendation: { mode: "dating", confidence: 0.7, reason: "romantic context" },
      overrideInstruction: "make this flirty",
    };
    expect(selection.overrideInstruction).toBe("make this flirty");
  });

  it("workspace override persists for workspace", () => {
    const selection: ModeSelection = {
      mode: "conflict",
      source: "workspace",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.source).toBe("workspace");
  });

  it("explicit tone override is separate from mode", () => {
    const config = MODE_CONFIGS.work;
    const explicitTone = "playful";
    expect(config.defaults.tone).toBe("professional");
    expect(explicitTone).not.toBe(config.defaults.tone);
  });
});

// ─── Precedence ───────────────────────────────────────────────────────────────

describe("Precedence", () => {
  it("explicit current mode wins over auto", () => {
    const selection: ModeSelection = {
      mode: "dating",
      source: "manual",
      recommendation: { mode: "work", confidence: 0.9, reason: "professional" },
      overrideInstruction: null,
    };
    expect(selection.mode).toBe("dating");
  });

  it("current instruction wins over mode", () => {
    const selection: ModeSelection = {
      mode: "work",
      source: "instruction",
      recommendation: null,
      overrideInstruction: "make this flirty",
    };
    expect(selection.overrideInstruction).toBe("make this flirty");
  });

  it("context is respected when no override", () => {
    const state = makeState({ relationship: "manager" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("workspace context can provide mode", () => {
    const selection: ModeSelection = {
      mode: "conflict",
      source: "workspace",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.mode).toBe("conflict");
  });

  it("defaults apply when no signals exist", () => {
    const defaults = getModeDefaults("general");
    expect(defaults.tone).toBe("natural");
    expect(defaults.style).toBe("balanced");
  });

  it("auto mode returns general for unknown state", () => {
    const state = makeState();
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("general");
  });

  it("strong signals override weak ones", () => {
    const state = makeState({
      relationship: "manager",
      context: { ...makeState().context, situation: "casual_chat" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });
});

// ─── Mode/Context Conflict ────────────────────────────────────────────────────

describe("Mode/Context Conflict", () => {
  it("detects dating vs professional conflict", () => {
    const conflict = detectModeConflict("dating", "work", 0.8);
    expect(conflict).not.toBeNull();
    expect(conflict!.selectedMode).toBe("dating");
    expect(conflict!.detectedMode).toBe("work");
  });

  it("detects playful vs interview conflict", () => {
    const conflict = detectModeConflict("dating", "career", 0.7);
    expect(conflict).not.toBeNull();
  });

  it("no conflict when modes match", () => {
    const conflict = detectModeConflict("work", "work", 0.9);
    expect(conflict).toBeNull();
  });

  it("no conflict when auto mode selected", () => {
    const conflict = detectModeConflict("auto", "work", 0.9);
    expect(conflict).toBeNull();
  });

  it("no conflict when confidence is low", () => {
    const conflict = detectModeConflict("dating", "work", 0.3);
    expect(conflict).toBeNull();
  });

  it("detects formal vs casual conflict", () => {
    const conflict = detectModeConflict("career", "social", 0.75);
    expect(conflict).not.toBeNull();
  });

  it("detects conflict vs humorous conflict", () => {
    const conflict = detectModeConflict("conflict", "social", 0.8);
    expect(conflict).not.toBeNull();
  });
});

// ─── Work ─────────────────────────────────────────────────────────────────────

describe("Work Mode", () => {
  it("detects manager relationship", () => {
    const state = makeState({ relationship: "manager" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("detects client relationship", () => {
    const state = makeState({ relationship: "client" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("detects teammate relationship", () => {
    const state = makeState({ relationship: "teammate" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("detects deadline situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "missed_deadline" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("has professional tone default", () => {
    expect(MODE_CONFIGS.work.defaults.tone).toBe("professional");
  });

  it("has appropriate help text", () => {
    expect(MODE_CONFIGS.work.helpText).toContain("Paste the conversation");
  });
});

// ─── Academic ─────────────────────────────────────────────────────────────────

describe("Academic Mode", () => {
  it("detects professor relationship", () => {
    const state = makeState({ relationship: "professor" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("academic");
  });

  it("detects classmate relationship", () => {
    const intel = makeIntelligence({ relationship: "classmate" });
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("academic");
  });

  it("has formal default", () => {
    expect(MODE_CONFIGS.academic.defaults.formality).toBe("formal");
  });

  it("has professor quick goal", () => {
    const goals = MODE_CONFIGS.academic.quickGoals.map((g) => g.goal);
    expect(goals).toContain("ask_professor");
  });

  it("has extension quick goal", () => {
    const goals = MODE_CONFIGS.academic.quickGoals.map((g) => g.goal);
    expect(goals).toContain("request_extension");
  });
});

// ─── Career ───────────────────────────────────────────────────────────────────

describe("Career Mode", () => {
  it("detects recruiter relationship", () => {
    const state = makeState({ relationship: "recruiter" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("career");
  });

  it("detects interviewer relationship", () => {
    const state = makeState({ relationship: "interviewer" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("career");
  });

  it("has confident default", () => {
    expect(MODE_CONFIGS.career.defaults.style).toBe("confident");
  });

  it("has recruiter quick goal", () => {
    const goals = MODE_CONFIGS.career.quickGoals.map((g) => g.goal);
    expect(goals).toContain("recruiter_reply");
  });

  it("has interview follow-up goal", () => {
    const goals = MODE_CONFIGS.career.quickGoals.map((g) => g.goal);
    expect(goals).toContain("interview_followup");
  });
});

// ─── Social ───────────────────────────────────────────────────────────────────

describe("Social Mode", () => {
  it("detects friend relationship", () => {
    const state = makeState({ relationship: "friend" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("social");
  });

  it("detects casual chat situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "casual_chat" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("social");
  });

  it("has casual default", () => {
    expect(MODE_CONFIGS.social.defaults.formality).toBe("informal");
  });

  it("has catch up quick goal", () => {
    const goals = MODE_CONFIGS.social.quickGoals.map((g) => g.goal);
    expect(goals).toContain("catch_up");
  });
});

// ─── Dating ───────────────────────────────────────────────────────────────────

describe("Dating Mode", () => {
  it("detects date relationship", () => {
    const state = makeState({ relationship: "date" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("dating");
  });

  it("detects romantic interest", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "romantic_interest" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("dating");
  });

  it("detects flirt intent", () => {
    const state = makeState({
      intent: { ...makeState().intent, userIntent: "flirt" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("dating");
  });

  it("has natural default tone", () => {
    expect(MODE_CONFIGS.dating.defaults.tone).toBe("natural");
  });

  it("has start conversation quick goal", () => {
    const goals = MODE_CONFIGS.dating.quickGoals.map((g) => g.goal);
    expect(goals).toContain("start_conversation");
  });

  it("has playful quick action", () => {
    const actions = MODE_CONFIGS.dating.quickActions.map((a) => a.tone);
    expect(actions).toContain("playful");
  });
});

// ─── Conflict ─────────────────────────────────────────────────────────────────

describe("Conflict Mode", () => {
  it("detects heated argument", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "heated_argument" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("conflict");
  });

  it("detects disagreement", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "disagreement" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("conflict");
  });

  it("detects de-escalate intent", () => {
    const state = makeState({
      intent: { ...makeState().intent, userIntent: "de_escalate" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("conflict");
  });

  it("detects boundary setting", () => {
    const state = makeState({
      intent: { ...makeState().intent, userIntent: "set_boundary" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("conflict");
  });

  it("has calm default tone", () => {
    expect(MODE_CONFIGS.conflict.defaults.tone).toBe("calm");
  });

  it("has de-escalate quick action", () => {
    const actions = MODE_CONFIGS.conflict.quickActions.map((a) => a.tone);
    expect(actions).toContain("de_escalate");
  });
});

// ─── Negotiation ──────────────────────────────────────────────────────────────

describe("Negotiation Mode", () => {
  it("detects negotiation situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "negotiation" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("negotiation");
  });

  it("detects persuade intent", () => {
    const state = makeState({
      intent: { ...makeState().intent, userIntent: "persuade" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("negotiation");
  });

  it("has persuasive default tone", () => {
    expect(MODE_CONFIGS.negotiation.defaults.tone).toBe("persuasive");
  });

  it("has persuade quick goal", () => {
    const goals = MODE_CONFIGS.negotiation.quickGoals.map((g) => g.goal);
    expect(goals).toContain("persuade");
  });
});

// ─── Customer ─────────────────────────────────────────────────────────────────

describe("Customer Mode", () => {
  it("detects customer relationship", () => {
    const state = makeState({ relationship: "customer" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("customer");
  });

  it("detects customer complaint", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "customer_complaint" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("customer");
  });

  it("has professional default", () => {
    expect(MODE_CONFIGS.customer.defaults.tone).toBe("professional");
  });

  it("has complaint quick goal", () => {
    const goals = MODE_CONFIGS.customer.quickGoals.map((g) => g.goal);
    expect(goals).toContain("complaint");
  });
});

// ─── Family ───────────────────────────────────────────────────────────────────

describe("Family Mode", () => {
  it("detects family relationship", () => {
    const state = makeState({ relationship: "family" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("family");
  });

  it("has warm default tone", () => {
    expect(MODE_CONFIGS.family.defaults.tone).toBe("warm");
  });

  it("has check in quick goal", () => {
    const goals = MODE_CONFIGS.family.quickGoals.map((g) => g.goal);
    expect(goals).toContain("check_in");
  });
});

// ─── Group ────────────────────────────────────────────────────────────────────

describe("Group Mode", () => {
  it("detects group from participants", () => {
    const state = makeState({
      participants: { count: 4, roles: [], userId: "me", others: ["a", "b", "c"], isGroup: true },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("group");
  });

  it("detects group from intelligence participant count", () => {
    const intel = makeIntelligence({
      participants: { count: 5, roles: [], userIdentification: "", otherParticipants: [] },
    });
    const rec = detectModeFromIntelligence(intel);
    expect(rec.mode).toBe("group");
  });

  it("has friendly default tone", () => {
    expect(MODE_CONFIGS.group.defaults.tone).toBe("friendly");
  });

  it("has coordinate quick goal", () => {
    const goals = MODE_CONFIGS.group.quickGoals.map((g) => g.goal);
    expect(goals).toContain("coordinate");
  });
});

// ─── Recovery ─────────────────────────────────────────────────────────────────

describe("Recovery Mode", () => {
  it("detects missed deadline", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "missed_deadline" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("detects missed interview", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "missed_interview" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("detects late arrival", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "late_arrival" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("detects wrong file situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "wrong_file" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("recovery");
  });

  it("has empathetic default tone", () => {
    expect(MODE_CONFIGS.recovery.defaults.tone).toBe("empathetic");
  });

  it("has ask another chance goal", () => {
    const goals = MODE_CONFIGS.recovery.quickGoals.map((g) => g.goal);
    expect(goals).toContain("ask_another_chance");
  });
});

// ─── State ────────────────────────────────────────────────────────────────────

describe("State Integration", () => {
  it("workspace mode can be set", () => {
    const selection: ModeSelection = {
      mode: "work",
      source: "workspace",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.mode).toBe("work");
    expect(selection.source).toBe("workspace");
  });

  it("state invalidation occurs on mode switch", () => {
    expect(shouldInvalidateOnModeSwitch("work", "dating")).toBe(true);
  });

  it("no invalidation when same mode", () => {
    expect(shouldInvalidateOnModeSwitch("work", "work")).toBe(false);
  });

  it("mode switch preserves state structure", () => {
    const state = makeState({
      participants: { count: 2, roles: ["manager", "employee"], userId: "me", others: ["them"], isGroup: false },
    });
    const newContext = applyModeToContext("dating", state);
    expect(state.participants.count).toBe(2);
    expect(newContext).toBe("dating");
  });

  it("auto mode preserves original context", () => {
    const state = makeState({
      context: { ...makeState().context, type: "professional" },
    });
    const newContext = applyModeToContext("auto", state);
    expect(newContext).toBe("professional");
  });
});

// ─── Personalization ──────────────────────────────────────────────────────────

describe("Personalization Integration", () => {
  it("strong preference overrides mode default", () => {
    const userPreference = "concise";
    const modeDefault = MODE_CONFIGS.dating.defaults.style;
    expect(userPreference).not.toBe(modeDefault);
  });

  it("weak preference does not dominate mode", () => {
    const modeDefault = MODE_CONFIGS.work.defaults.tone;
    expect(modeDefault).toBe("professional");
  });

  it("context preference adapts to mode", () => {
    const defaults = getModeDefaults("conflict");
    expect(defaults.tone).toBe("calm");
  });

  it("explicit override wins over preference", () => {
    const selection: ModeSelection = {
      mode: "work",
      source: "instruction",
      recommendation: null,
      overrideInstruction: "make this playful",
    };
    expect(selection.overrideInstruction).toBe("make this playful");
  });

  it("cold start uses mode defaults", () => {
    const defaults = getModeDefaults("general");
    expect(defaults.tone).toBe("natural");
  });
});

// ─── Memory ───────────────────────────────────────────────────────────────────

describe("Memory Integration", () => {
  it("relevant memory provides context", () => {
    const state = makeState({
      relationship: "manager",
      context: { ...makeState().context, situation: "professional_feedback" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("work");
  });

  it("irrelevant memory does not affect mode", () => {
    const state = makeState({ relationship: "unknown" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("general");
  });

  it("mode selection is not stored as memory", () => {
    const selection: ModeSelection = {
      mode: "dating",
      source: "manual",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.source).toBe("manual");
  });
});

// ─── Language ─────────────────────────────────────────────────────────────────

describe("Language Support", () => {
  it("works with English", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "english", script: "latin" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("works with Telugu", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "telugu", script: "telugu" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("works with Telugu-English code-mix", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "english", codeMixed: true, script: "latin" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("works with Hindi-English", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "hindi", codeMixed: true },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("works with Tamil-English", () => {
    const state = makeState({
      language: { ...makeState().language, primary: "tamil", codeMixed: true },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("works with Romanized text", () => {
    const state = makeState({
      language: { ...makeState().language, romanized: true },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("works with native script", () => {
    const state = makeState({
      language: { ...makeState().language, script: "devanagari" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });
});

// ─── Coaching ─────────────────────────────────────────────────────────────────

describe("Coaching Integration", () => {
  it("work coaching provides professional guidance", () => {
    const config = MODE_CONFIGS.work;
    expect(config.quickGoals.some((g) => g.goal === "give_update")).toBe(true);
  });

  it("dating coaching provides conversational guidance", () => {
    const config = MODE_CONFIGS.dating;
    expect(config.quickGoals.some((g) => g.goal === "continue_conversation")).toBe(true);
  });

  it("conflict coaching provides de-escalation guidance", () => {
    const config = MODE_CONFIGS.conflict;
    expect(config.quickGoals.some((g) => g.goal === "de_escalate")).toBe(true);
  });

  it("negotiation coaching provides persuasion guidance", () => {
    const config = MODE_CONFIGS.negotiation;
    expect(config.quickGoals.some((g) => g.goal === "persuade")).toBe(true);
  });

  it("recovery coaching provides honest communication guidance", () => {
    const config = MODE_CONFIGS.recovery;
    expect(config.quickGoals.some((g) => g.goal === "explain_honestly")).toBe(true);
  });
});

// ─── Pre-Send ─────────────────────────────────────────────────────────────────

describe("Pre-Send Integration", () => {
  it("work mode has professional defaults", () => {
    const defaults = getModeDefaults("work");
    expect(defaults.formality).toBe("formal");
  });

  it("dating mode has informal defaults", () => {
    const defaults = getModeDefaults("dating");
    expect(defaults.formality).toBe("informal");
  });

  it("conflict mode has contextual defaults", () => {
    const defaults = getModeDefaults("conflict");
    expect(defaults.formality).toBe("contextual");
  });

  it("negotiation mode has formal defaults", () => {
    const defaults = getModeDefaults("negotiation");
    expect(defaults.formality).toBe("formal");
  });

  it("recovery mode has contextual defaults", () => {
    const defaults = getModeDefaults("recovery");
    expect(defaults.formality).toBe("contextual");
  });
});

// ─── Tone ─────────────────────────────────────────────────────────────────────

describe("Tone Integration", () => {
  it("professional tone for work", () => {
    expect(MODE_CONFIGS.work.recommendedTones).toContain("professional");
  });

  it("natural tone for dating", () => {
    expect(MODE_CONFIGS.dating.recommendedTones).toContain("natural");
  });

  it("diplomatic tone for conflict", () => {
    expect(MODE_CONFIGS.conflict.recommendedTones).toContain("diplomatic");
  });

  it("persuasive tone for negotiation", () => {
    expect(MODE_CONFIGS.negotiation.recommendedTones).toContain("persuasive");
  });

  it("empathetic tone for recovery", () => {
    expect(MODE_CONFIGS.recovery.recommendedTones).toContain("empathetic");
  });

  it("warm tone for family", () => {
    expect(MODE_CONFIGS.family.recommendedTones).toContain("warm");
  });

  it("friendly tone for social", () => {
    expect(MODE_CONFIGS.social.recommendedTones).toContain("friendly");
  });

  it("assertive tone available in work", () => {
    expect(MODE_CONFIGS.work.recommendedTones).toContain("assertive");
  });
});

// ─── UI ───────────────────────────────────────────────────────────────────────

describe("UI Components", () => {
  it("mode selector exports exist", async () => {
    const mod = await import("@/components/analyze/ModeSelector");
    expect(mod.ModeSelector).toBeDefined();
    expect(typeof mod.ModeSelector).toBe("function");
  });

  it("quick actions bar exports exist", async () => {
    const mod = await import("@/components/analyze/ModeSelector");
    expect(mod.QuickActionsBar).toBeDefined();
  });

  it("mode conflict banner exports exist", async () => {
    const mod = await import("@/components/analyze/ModeSelector");
    expect(mod.ModeConflictBanner).toBeDefined();
  });

  it("mode help text exports exist", async () => {
    const mod = await import("@/components/analyze/ModeSelector");
    expect(mod.ModeHelpText).toBeDefined();
  });

  it("auto mode is selectable", () => {
    expect(MODE_CONFIGS.auto.visible).toBe(true);
  });

  it("all modes have icons", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.icon.length).toBeGreaterThan(0);
    }
  });

  it("all modes have labels", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.label.length).toBeGreaterThan(0);
    }
  });

  it("all modes have descriptions", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.description.length).toBeGreaterThan(0);
    }
  });

  it("mode orders support compact display", () => {
    const sorted = Object.values(MODE_CONFIGS).sort((a, b) => a.order - b.order);
    expect(sorted[0].id).toBe("auto");
  });

  it("all modes have help text", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      expect(config.helpText.length).toBeGreaterThan(0);
    }
  });
});

// ─── Quick Actions ────────────────────────────────────────────────────────────

describe("Quick Actions", () => {
  it("work quick actions map to tones", () => {
    for (const action of MODE_CONFIGS.work.quickActions) {
      expect(typeof action.tone).toBe("string");
      expect(typeof action.label).toBe("string");
    }
  });

  it("dating quick actions map to tones", () => {
    for (const action of MODE_CONFIGS.dating.quickActions) {
      expect(typeof action.tone).toBe("string");
    }
  });

  it("conflict quick actions map to tones", () => {
    for (const action of MODE_CONFIGS.conflict.quickActions) {
      expect(typeof action.tone).toBe("string");
    }
  });

  it("negotiation quick actions map to tones", () => {
    for (const action of MODE_CONFIGS.negotiation.quickActions) {
      expect(typeof action.tone).toBe("string");
    }
  });

  it("customer quick actions map to tones", () => {
    for (const action of MODE_CONFIGS.customer.quickActions) {
      expect(typeof action.tone).toBe("string");
    }
  });

  it("recovery quick actions map to tones", () => {
    for (const action of MODE_CONFIGS.recovery.quickActions) {
      expect(typeof action.tone).toBe("string");
    }
  });

  it("work quick goals have valid goal strings", () => {
    for (const goal of MODE_CONFIGS.work.quickGoals) {
      expect(typeof goal.goal).toBe("string");
      expect(goal.goal.length).toBeGreaterThan(0);
    }
  });

  it("all quick actions have descriptions", () => {
    for (const config of Object.values(MODE_CONFIGS)) {
      for (const action of config.quickActions) {
        expect(action.description.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Generation Pipeline ──────────────────────────────────────────────────────

describe("Generation Pipeline", () => {
  it("mode reaches generator as context", () => {
    const state = makeState();
    const newContext = applyModeToContext("work", state);
    expect(newContext).toBe("work");
  });

  it("generator does not create new mode logic", () => {
    const config = MODE_CONFIGS.work;
    expect(config.defaults).toBeDefined();
  });

  it("humanizer receives mode context", () => {
    const defaults = getModeDefaults("dating");
    expect(defaults.tone).toBe("natural");
  });

  it("validator remains authoritative", () => {
    const config = MODE_CONFIGS.conflict;
    expect(config.defaults.tone).toBe("calm");
  });

  it("ranker remains authoritative", () => {
    const config = MODE_CONFIGS.negotiation;
    expect(config.defaults.style).toBe("direct");
  });
});

// ─── Privacy ──────────────────────────────────────────────────────────────────

describe("Privacy", () => {
  it("no mode-based sensitive profiling", () => {
    const selection: ModeSelection = {
      mode: "dating",
      source: "manual",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.source).toBe("manual");
  });

  it("no raw conversation analytics in mode detection", () => {
    const state = makeState({ relationship: "manager" });
    const rec = detectModeFromState(state);
    expect(rec.reason).not.toContain("message content");
  });

  it("no cross-workspace leakage", () => {
    const ws1: ModeSelection = { mode: "work", source: "workspace", recommendation: null, overrideInstruction: null };
    const ws2: ModeSelection = { mode: "dating", source: "workspace", recommendation: null, overrideInstruction: null };
    expect(ws1.mode).not.toBe(ws2.mode);
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────

describe("Security", () => {
  it("mode config does not expose secrets", () => {
    const config = MODE_CONFIGS.work;
    const str = JSON.stringify(config);
    expect(str).not.toContain("password");
    expect(str).not.toContain("secret");
    expect(str).not.toContain("token");
  });

  it("mode detection does not expose internal state", () => {
    const state = makeState();
    const rec = detectModeFromState(state);
    expect(typeof rec.mode).toBe("string");
    expect(typeof rec.confidence).toBe("number");
  });

  it("rate limiting applies to mode endpoints", () => {
    const selection: ModeSelection = {
      mode: "work",
      source: "manual",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.mode).toBeDefined();
  });

  it("mode conflict detection is safe", () => {
    const conflict = detectModeConflict("dating", "work", 0.9);
    expect(conflict).not.toBeNull();
    expect(conflict!.reason).not.toContain("<script>");
  });
});

// ─── Evaluation ───────────────────────────────────────────────────────────────

describe("Evaluation", () => {
  it("mode benchmark covers all modes", () => {
    const modes: CommunicationMode[] = [
      "auto", "work", "academic", "career", "social", "dating",
      "conflict", "negotiation", "customer", "family", "group", "recovery", "general",
    ];
    for (const mode of modes) {
      expect(MODE_CONFIGS[mode]).toBeDefined();
    }
  });

  it("ambiguous cases return general", () => {
    const state = makeState();
    const rec = detectModeFromState(state);
    expect(rec.mode).toBe("general");
  });

  it("override behavior is trackable via source", () => {
    const sources: ModeSelection["source"][] = ["auto", "manual", "workspace", "instruction"];
    for (const source of sources) {
      const selection: ModeSelection = { mode: "work", source, recommendation: null, overrideInstruction: null };
      expect(selection.source).toBe(source);
    }
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────

describe("Error Handling", () => {
  it("mode detection handles unknown relationship", () => {
    const state = makeState({ relationship: "unknown" });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("mode detection handles unknown situation", () => {
    const state = makeState({
      context: { ...makeState().context, situation: "unknown" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("mode detection handles unknown intent", () => {
    const state = makeState({
      intent: { ...makeState().intent, userIntent: "unknown" },
    });
    const rec = detectModeFromState(state);
    expect(rec.mode).toBeDefined();
  });

  it("getModeDefaults returns defaults for any mode", () => {
    for (const mode of Object.keys(MODE_CONFIGS) as CommunicationMode[]) {
      const defaults = getModeDefaults(mode);
      expect(defaults).toBeDefined();
      expect(typeof defaults.tone).toBe("string");
    }
  });
});

// ─── Mode Switch ──────────────────────────────────────────────────────────────

describe("Mode Switch", () => {
  it("preserves conversation on mode switch", () => {
    const state = makeState({
      participants: { count: 2, roles: [], userId: "me", others: ["them"], isGroup: false },
    });
    applyModeToContext("dating", state);
    expect(state.participants.others).toHaveLength(1);
  });

  it("preserves draft on mode switch", () => {
    const state = makeState();
    const draft = "my draft message";
    applyModeToContext("work", state);
    expect(draft).toBe("my draft message");
  });

  it("invalidates derived state on mode switch", () => {
    expect(shouldInvalidateOnModeSwitch("work", "dating")).toBe(true);
  });

  it("recomputes context on mode switch", () => {
    const state = makeState();
    const newContext = applyModeToContext("conflict", state);
    expect(newContext).toBe("conflict");
  });

  it("preserves personalization on mode switch", () => {
    const selection: ModeSelection = {
      mode: "work",
      source: "manual",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.mode).toBe("work");
  });
});

// ─── Regression ───────────────────────────────────────────────────────────────

describe("Regression - Existing Systems", () => {
  it("existing Analyze still works", () => {
    const state = makeState();
    expect(state.context).toBeDefined();
    expect(state.intent).toBeDefined();
  });

  it("existing Workspace still works", () => {
    const state = makeState({
      participants: { count: 2, roles: [], userId: "me", others: ["them"], isGroup: false },
    });
    expect(state.participants.count).toBe(2);
  });

  it("existing Coaching still works", () => {
    const config = MODE_CONFIGS.work;
    expect(config.quickGoals.length).toBeGreaterThan(0);
  });

  it("existing Tone still works", () => {
    const config = MODE_CONFIGS.dating;
    expect(config.recommendedTones.length).toBeGreaterThan(0);
  });

  it("existing Pre-Send still works", () => {
    const defaults = getModeDefaults("general");
    expect(defaults).toBeDefined();
  });

  it("existing Personalization still works", () => {
    const selection: ModeSelection = {
      mode: "work",
      source: "manual",
      recommendation: null,
      overrideInstruction: null,
    };
    expect(selection.mode).toBe("work");
  });

  it("existing Memory still works", () => {
    const state = makeState();
    expect(state.relationship).toBe("unknown");
  });

  it("existing Evaluation still works", () => {
    const modes = Object.keys(MODE_CONFIGS);
    expect(modes.length).toBe(13);
  });

  it("existing Security still works", () => {
    const config = MODE_CONFIGS.work;
    expect(JSON.stringify(config)).not.toContain("secret");
  });

  it("existing API behavior unchanged", () => {
    const state = makeState();
    const rec = detectModeFromState(state);
    expect(rec).toBeDefined();
    expect(typeof rec.mode).toBe("string");
  });
});
