import { describe, it, expect } from "vitest";
import {
  detectScriptType,
  detectRomanizedLanguage,
  detectCodeMixing,
  estimateLanguageRatio,
  detectParticipantLanguages,
  detectLanguageState,
  isShortAmbiguous,
  normalizeSpelling,
} from "@/lib/ai/language-detect";
import type { ConversationContext } from "@/lib/ai/context";
import { resolveConversationState } from "@/lib/ai/state-resolver";

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

// ─── Script Detection Tests ───────────────────────────────────────────────────

describe("Script Detection", () => {
  it("detects Latin script for English", () => {
    const result = detectScriptType("Hello world, how are you?");
    expect(result.hasLatin).toBe(true);
    expect(result.hasIndic).toBe(false);
    expect(result.dominant).toBe("latin");
  });

  it("detects Devanagari script for Hindi", () => {
    const result = detectScriptType("नमस्ते, आप कैसे हैं?");
    expect(result.hasIndic).toBe(true);
    expect(result.dominant).toBe("devanagari");
  });

  it("detects Telugu script", () => {
    const result = detectScriptType("నాకు ఇవాళ చాలా పని ఉంది");
    expect(result.hasIndic).toBe(true);
    expect(result.dominant).toBe("telugu");
  });

  it("detects Tamil script", () => {
    const result = detectScriptType("நான் இப்போது பிஸியாக இருக்கிறேன்");
    expect(result.hasIndic).toBe(true);
    expect(result.dominant).toBe("tamil");
  });

  it("detects mixed scripts", () => {
    const result = detectScriptType("రేపు project submit చేస్తా");
    expect(result.hasMixed).toBe(true);
    expect(result.hasLatin).toBe(true);
    expect(result.hasIndic).toBe(true);
  });

  it("handles empty text", () => {
    const result = detectScriptType("");
    expect(result.scripts).toContain("unknown");
  });
});

// ─── Romanized Language Detection Tests ───────────────────────────────────────

describe("Romanized Language Detection", () => {
  it("detects Romanized Telugu", () => {
    const result = detectRomanizedLanguage("naku ivala chala work undhi");
    expect(result).not.toBeNull();
    expect(result!.language).toBe("telugu");
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it("detects Romanized Hindi", () => {
    const result = detectRomanizedLanguage("kal kya kar raha hai");
    expect(result).not.toBeNull();
    expect(result!.language).toBe("hindi");
  });

  it("detects Romanized Tamil", () => {
    const result = detectRomanizedLanguage("naan busy da, later call panren");
    expect(result).not.toBeNull();
    expect(result!.language).toBe("tamil");
  });

  it("detects Romanized Kannada", () => {
    const result = detectRomanizedLanguage("nanu swalpa busy iddini");
    expect(result).not.toBeNull();
    expect(result!.language).toBe("kannada");
  });

  it("detects Romanized Malayalam", () => {
    const result = detectRomanizedLanguage("njan ippo busy aanu");
    expect(result).not.toBeNull();
    expect(result!.language).toBe("malayalam");
  });

  it("returns null for pure English", () => {
    const result = detectRomanizedLanguage("Hello how are you doing today?");
    expect(result).toBeNull();
  });

  it("handles short ambiguous text", () => {
    const result = detectRomanizedLanguage("ok");
    expect(result).toBeNull();
  });
});

// ─── Code-Mixing Detection Tests ──────────────────────────────────────────────

describe("Code-Mixing Detection", () => {
  it("detects Telugu-English code-mixing", () => {
    const result = detectCodeMixing("repu project submit chestha, but testing complete kaaledu");
    expect(result.isCodeMixed).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("detects Hindi-English code-mixing", () => {
    const result = detectCodeMixing("kal meeting hai, I'll join after lunch");
    expect(result.isCodeMixed).toBe(true);
  });

  it("detects Tamil-English code-mixing", () => {
    const result = detectCodeMixing("naan busy da, I'll call you later");
    expect(result.isCodeMixed).toBe(true);
  });

  it("detects mixed scripts as code-mixed", () => {
    const result = detectCodeMixing("రేపు meeting ఉంది");
    expect(result.isCodeMixed).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("does not flag pure English as code-mixed", () => {
    const result = detectCodeMixing("Hello, how are you doing today?");
    expect(result.isCodeMixed).toBe(false);
  });
});

// ─── Language Ratio Estimation Tests ──────────────────────────────────────────

describe("Language Ratio Estimation", () => {
  it("estimates ratio for code-mixed text", () => {
    const result = estimateLanguageRatio("repu project submit chestha");
    expect(result.length).toBeGreaterThan(0);
    const total = result.reduce((sum, r) => sum + r.ratio, 0);
    expect(total).toBeCloseTo(1.0, 1);
  });

  it("returns English for pure English", () => {
    const result = estimateLanguageRatio("Hello how are you?");
    expect(result[0].language).toBe("english");
    expect(result[0].ratio).toBe(1.0);
  });
});

// ─── Per-Participant Language Detection Tests ─────────────────────────────────

describe("Participant Language Detection", () => {
  it("detects different languages for different participants", () => {
    const messages = [
      { sender: "A", text: "bro repu meeting undhi kada?" },
      { sender: "B", text: "haan, 6 baje hai" },
      { sender: "C", text: "guys I can't make it today" },
    ];
    const result = detectParticipantLanguages(messages);
    expect(result.length).toBe(3);
    expect(result[0].primary).toBe("telugu");
    expect(result[1].primary).toBe("hindi");
    expect(result[2].primary).toBe("english");
  });

  it("handles single participant", () => {
    const messages = [
      { sender: "me", text: "naku ivala chala work undhi" },
    ];
    const result = detectParticipantLanguages(messages);
    expect(result.length).toBe(1);
    expect(result[0].primary).toBe("telugu");
  });
});

// ─── Full Language State Detection Tests ──────────────────────────────────────

describe("Language State Detection", () => {
  it("detects Telugu-English code-mixed conversation", () => {
    const messages = [
      { sender: "them", text: "repu meeting undhi kada?" },
      { sender: "me", text: "haan, but testing complete kaaledu" },
    ];
    const state = detectLanguageState(messages);
    expect(state.primary).toBe("telugu");
    expect(state.codeMixed).toBe(true);
    expect(state.romanized).toBe(true);
  });

  it("detects Hindi-English code-mixed conversation", () => {
    const messages = [
      { sender: "them", text: "kal meeting hai, I'll join after lunch" },
    ];
    const state = detectLanguageState(messages);
    expect(state.primary).toBe("hindi");
    expect(state.codeMixed).toBe(true);
  });

  it("detects Tamil-English code-mixed conversation", () => {
    const messages = [
      { sender: "them", text: "naan busy da, later call panren" },
    ];
    const state = detectLanguageState(messages);
    expect(state.primary).toBe("tamil");
    expect(state.codeMixed).toBe(true);
  });

  it("detects native script Telugu", () => {
    const messages = [
      { sender: "them", text: "రేపు project submit చేస్తా" },
    ];
    const state = detectLanguageState(messages);
    expect(state.primary).toBe("telugu");
    expect(state.script).toBe("mixed");
    expect(state.codeMixed).toBe(true);
  });

  it("detects pure English", () => {
    const messages = [
      { sender: "them", text: "Hello, how are you doing today?" },
      { sender: "me", text: "I'm great, thanks for asking!" },
    ];
    const state = detectLanguageState(messages);
    expect(state.primary).toBe("english");
    expect(state.codeMixed).toBe(false);
  });

  it("respects explicit language override", () => {
    const messages = [
      { sender: "them", text: "hello" },
    ];
    const state = detectLanguageState(messages, "telugu");
    expect(state.primary).toBe("telugu");
    expect(state.detectionSource).toBe("explicit_user");
  });

  it("handles short ambiguous messages with low confidence", () => {
    const messages = [
      { sender: "them", text: "ra" },
    ];
    const state = detectLanguageState(messages);
    expect(state.confidence).toBeLessThan(0.7);
  });
});

// ─── Short Message Tests ──────────────────────────────────────────────────────

describe("Short Message Handling", () => {
  it("identifies short ambiguous messages", () => {
    expect(isShortAmbiguous("ra")).toBe(true);
    expect(isShortAmbiguous("da")).toBe(true);
    expect(isShortAmbiguous("ok")).toBe(true);
    expect(isShortAmbiguous("bro")).toBe(true);
  });

  it("does not flag longer messages as short", () => {
    expect(isShortAmbiguous("hello how are you")).toBe(false);
    expect(isShortAmbiguous("naku ivala work undhi")).toBe(false);
  });
});

// ─── Spelling Normalization Tests ─────────────────────────────────────────────

describe("Spelling Normalization", () => {
  it("normalizes common spelling variations", () => {
    expect(normalizeSpelling("undhi")).toBe("undi");
    expect(normalizeSpelling("chesta")).toBe("chestha");
    expect(normalizeSpelling("matladam")).toBe("matladham");
    expect(normalizeSpelling("naku")).toBe("naaku");
    expect(normalizeSpelling("endhuku")).toBe("enduku");
  });

  it("preserves unknown words", () => {
    expect(normalizeSpelling("hello")).toBe("hello");
    expect(normalizeSpelling("work")).toBe("work");
  });
});

// ─── State Resolver Language Precedence Tests ─────────────────────────────────

describe("State Resolver Language Precedence", () => {
  it("uses explicit user language when provided", () => {
    const context = { ...defaultContext, language: "telugu" };
    const state = resolveConversationState(context, null);
    expect(state.language.primary).toBe("telugu");
    expect(state.sources.languageSource).toBe("explicit_user");
  });

  it("uses heuristic detection when no explicit language", () => {
    const context = { ...defaultContext, language: "english" };
    const state = resolveConversationState(context, null);
    expect(state.language.primary).toBe("english");
  });

  it("prefers AI intelligence when confidence is high", () => {
    const intelligence = {
      language: {
        primary: "telugu",
        secondary: ["english"],
        script: "latin",
        codeMixed: true,
        romanized: true,
        confidence: 0.9,
      },
      participants: {
        count: 2,
        roles: ["friend"],
        userIdentification: "me",
        otherParticipants: ["them"],
      },
      relationship: "friend",
      context: "friendship",
      situation: "casual_chat",
      userIntent: "continue_conversation",
      otherIntent: "unknown",
      emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
      tone: { primary: "casual", secondary: "casual", intensity: 0.5 },
      conflict: { level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      dynamics: { engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.2, escalation: 0.1, rapport: 0.5, pressure: 0.2, uncertainty: 0.3, responsiveness: 0.5 },
      risks: [],
      recommendedStrategies: ["natural"],
      confidence: { language: 0.9, context: 0.8, situation: 0.7, relationship: 0.8, intent: 0.7 },
    } as unknown as import("@/lib/ai/intelligence").ConversationIntelligence;
    const context = { ...defaultContext, language: "english" };
    const state = resolveConversationState(context, intelligence);
    expect(state.language.primary).toBe("telugu");
    expect(state.sources.languageSource).toBe("ai");
  });

  it("preserves language info from intelligence", () => {
    const intelligence = {
      language: {
        primary: "hindi",
        secondary: ["english"],
        script: "latin",
        codeMixed: true,
        romanized: true,
        confidence: 0.85,
      },
      participants: {
        count: 2,
        roles: ["friend"],
        userIdentification: "me",
        otherParticipants: ["them"],
      },
      relationship: "friend",
      context: "friendship",
      situation: "casual_chat",
      userIntent: "continue_conversation",
      otherIntent: "unknown",
      emotion: { primary: "neutral", secondary: "neutral", intensity: 0.3 },
      tone: { primary: "casual", secondary: "casual", intensity: 0.5 },
      conflict: { level: 0, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: false, misunderstanding: false, resolutionOpportunity: true },
      dynamics: { engagement: 0.5, reciprocity: 0.5, cooperation: 0.5, defensiveness: 0.2, escalation: 0.1, rapport: 0.5, pressure: 0.2, uncertainty: 0.3, responsiveness: 0.5 },
      risks: [],
      recommendedStrategies: ["natural"],
      confidence: { language: 0.85, context: 0.8, situation: 0.7, relationship: 0.8, intent: 0.7 },
    } as unknown as import("@/lib/ai/intelligence").ConversationIntelligence;
    const context = { ...defaultContext, language: "english" };
    const state = resolveConversationState(context, intelligence);
    expect(state.language.codeMixed).toBe(true);
    expect(state.language.romanized).toBe(true);
    expect(state.language.secondary).toContain("english");
  });
});
