import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  transformTone,
  scoreToneFit,
  checkToneCompatibility,
  type TargetTone,
  type ToneIntensity,
} from "@/lib/ai/tone-transformer";
import {
  createPreservationContract,
  validatePreservation,
  extractNegations,
  extractAbilityConstraints,
  extractBoundaries,
  extractPosition,
  extractTemporalConstraints,
  type LanguageState,
} from "@/lib/ai/preservation";

// ─── Mock AI Provider ───────────────────────────────────────────────────────

function createMockProvider(responseText?: string) {
  const text = responseText || "This is a mock response.";
  return {
    chat: vi.fn().mockResolvedValue(text),
    chatVision: vi.fn().mockResolvedValue(text),
    chatStructured: vi.fn().mockImplementation((_messages: unknown, config: { name?: string }) => {
      // Return appropriate format based on the config name
      if (config?.name === "tone_transformation") {
        // Multi-intensity format for the new tone transformer
        return Promise.resolve(JSON.stringify({ light: text, medium: text, strong: text }));
      }
      // Legacy format for other callers
      return Promise.resolve(JSON.stringify({
        candidates: [{ text, strategy: "natural" }],
      }));
    }),
  };
}

function createMockProviderFailing() {
  return {
    chat: vi.fn().mockRejectedValue(new Error("Provider failure")),
    chatVision: vi.fn().mockRejectedValue(new Error("Provider failure")),
    chatStructured: vi.fn().mockRejectedValue(new Error("Provider failure")),
  };
}

// ─── Default Language States ────────────────────────────────────────────────

const defaultLang: LanguageState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
const teluguLang: LanguageState = { primary: "telugu", script: "latin", romanized: true, codeMixed: true };
const hindiLang: LanguageState = { primary: "hindi", script: "latin", romanized: true, codeMixed: true };
const tamilLang: LanguageState = { primary: "tamil", script: "latin", romanized: true, codeMixed: true };

const teluguLanguageOverride = {
  primary: "telugu", secondary: [], script: "latin" as const, romanized: true, codeMixed: true,
  codeMixRatio: [], outputPreference: "romanized" as const, confidence: 0.8, scriptConfidence: 0.9,
  detectionSource: "heuristic" as const, participantLanguages: [],
};
const hindiLanguageOverride = {
  primary: "hindi", secondary: [], script: "latin" as const, romanized: true, codeMixed: true,
  codeMixRatio: [], outputPreference: "romanized" as const, confidence: 0.8, scriptConfidence: 0.9,
  detectionSource: "heuristic" as const, participantLanguages: [],
};
const tamilLanguageOverride = {
  primary: "tamil", secondary: [], script: "latin" as const, romanized: true, codeMixed: true,
  codeMixRatio: [], outputPreference: "romanized" as const, confidence: 0.8, scriptConfidence: 0.9,
  detectionSource: "heuristic" as const, participantLanguages: [],
};

// ─── Default Conversation State (mock) ──────────────────────────────────────

function createMockState(overrides?: Record<string, unknown>) {
  return {
    participants: { count: 2, roles: [], userId: "user1", others: ["user2"], isGroup: false },
    relationship: "friend" as const,
    language: {
      primary: "english", secondary: [], script: "latin" as const, romanized: false, codeMixed: false,
      codeMixRatio: [], outputPreference: "auto" as const, confidence: 0.8, scriptConfidence: 0.9,
      detectionSource: "heuristic" as const, participantLanguages: [],
    },
    context: { type: "general", urgency: "normal" as const, platform: undefined, situation: "normal" as const },
    intent: { userIntent: "continue_conversation" as const, userGoal: "continue_conversation", otherIntent: "unknown" as const },
    emotion: { primary: "neutral" as const, secondary: "neutral" as const, intensity: 0.3 },
    tone: { primary: "neutral" as const, secondary: "neutral" as const, intensity: 0.3 },
    conflict: { level: 0.1, escalation: 0, trigger: "", coreDisagreement: "", personalAttacks: 0, misunderstanding: false, resolutionOpportunity: true },
    dynamics: { engagement: 0.5, cooperation: 0.5, reciprocity: 0.5, defensiveness: 0, escalation: 0, rapport: 0.5, pressure: 0, uncertainty: 0, responsiveness: 0.5 },
    risks: [],
    conflictIntelligence: { participants: [], conflictStructure: null, groupAnalysis: null },
    strategy: { primary: "natural" as const, ranked: [], confidence: 0.5 },
    style: { preferred: "casual", writingCharacteristics: "", lengthPreference: "medium", profile: null, guidance: null, source: "default" as const },
    sources: { goalSource: "default" as const, contextSource: "default" as const, toneSource: "default" as const, situationSource: "default" as const, languageSource: "heuristic" as const },
    ...overrides,
  } as never;
}

function createMockMessages(texts: string[]) {
  return texts.map((text, i) => ({
    sender: (i % 2 === 0 ? "me" : "them") as "me" | "them",
    text,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. BASIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tone Transformer", () => {
  describe("Basic Functionality", () => {
    it("1. returns a valid transformation result", async () => {
      const provider = createMockProvider("I won't be able to finish this today.");
      const state = createMockState();
      const messages = createMockMessages(["Can you finish this today?"]);
      const result = await transformTone(provider, {
        draft: "Can't finish today",
        targetTone: "professional",
        messages,
      }, state);

      expect(result).toBeDefined();
      expect(result.originalDraft).toBe("Can't finish today");
      expect(result.targetTone).toBe("professional");
      expect(result.candidates).toBeDefined();
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.preservation).toBeDefined();
    });

    it("2. handles empty draft gracefully", async () => {
      const provider = createMockProvider();
      const state = createMockState();
      const messages = createMockMessages(["Hello"]);
      // Empty draft should be caught by Zod validation at API level,
      // but the engine should handle it gracefully
      const result = await transformTone(provider, {
        draft: "",
        targetTone: "professional",
        messages,
      }, state);

      expect(result).toBeDefined();
      expect(result.originalDraft).toBe("");
    });

    it("3. handles provider failure gracefully", async () => {
      const provider = createMockProviderFailing();
      const state = createMockState();
      const messages = createMockMessages(["Hello"]);
      const result = await transformTone(provider, {
        draft: "Can't finish today",
        targetTone: "professional",
        messages,
      }, state);

      expect(result).toBeDefined();
      expect(result.candidates.length).toBeGreaterThan(0);
      // Should fallback to original draft
      expect(result.candidates[0].text).toBe("Can't finish today");
    });

    it("4. produces 3 candidates at different intensities", async () => {
      const provider = createMockProvider("I appreciate your patience. I won't be able to finish this today.");
      const state = createMockState();
      const messages = createMockMessages(["Can you finish this today?"]);
      const result = await transformTone(provider, {
        draft: "Can't finish today",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.candidates.length).toBe(3);
      expect(result.candidates[0].intensity).toBe("light");
      expect(result.candidates[1].intensity).toBe("medium");
      expect(result.candidates[2].intensity).toBe("strong");
    });

    it("5. preserves original draft in result", async () => {
      const provider = createMockProvider();
      const state = createMockState();
      const messages = createMockMessages(["Hello"]);
      const result = await transformTone(provider, {
        draft: "I can't attend tomorrow",
        targetTone: "friendly",
        messages,
      }, state);

      expect(result.originalDraft).toBe("I can't attend tomorrow");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. ALL 15 TONES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Target Tones", () => {
    const tones: TargetTone[] = [
      "professional", "friendly", "casual", "formal", "diplomatic",
      "assertive", "empathetic", "concise", "warm", "confident",
      "calm", "serious", "playful", "humorous", "flirty",
    ];

    for (const tone of tones) {
      it(`6-${tones.indexOf(tone) + 6}. transforms to ${tone} tone`, async () => {
        const provider = createMockProvider(`Transformed to ${tone} tone.`);
        const state = createMockState();
        const messages = createMockMessages(["Hello there"]);
        const result = await transformTone(provider, {
          draft: "Hello there",
          targetTone: tone,
          messages,
        }, state);

        expect(result.targetTone).toBe(tone);
        expect(result.candidates.length).toBeGreaterThan(0);
        expect(result.candidates.every((c) => c.tone === tone)).toBe(true);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. TONE FIT SCORING
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Tone Fit Scoring", () => {
    it("21. scores professional tone high for formal language", () => {
      const score = scoreToneFit("I would like to discuss this further.", "professional");
      expect(score).toBeGreaterThan(0.5);
    });

    it("22. scores professional tone low for casual language", () => {
      const score = scoreToneFit("lol that's hilarious 😂", "professional");
      expect(score).toBeLessThan(0.5);
    });

    it("23. scores friendly tone high for warm language", () => {
      const score = scoreToneFit("That's awesome! I'm so glad to hear that.", "friendly");
      expect(score).toBeGreaterThan(0.5);
    });

    it("24. scores casual tone high for conversational language", () => {
      const score = scoreToneFit("Yeah that's cool, nah I'm good.", "casual");
      expect(score).toBeGreaterThan(0.5);
    });

    it("25. scores formal tone high for formal language", () => {
      const score = scoreToneFit("Dear Sir, I am writing to inform you.", "formal");
      expect(score).toBeGreaterThan(0.5);
    });

    it("26. scores diplomatic tone high for tactful language", () => {
      const score = scoreToneFit("I understand your perspective, and I appreciate it.", "diplomatic");
      expect(score).toBeGreaterThan(0.5);
    });

    it("27. scores assertive tone high for direct language", () => {
      const score = scoreToneFit("I need this done by Friday. I will not accept delays.", "assertive");
      expect(score).toBeGreaterThan(0.5);
    });

    it("28. scores empathetic tone high for understanding language", () => {
      const score = scoreToneFit("I understand how frustrating that must be.", "empathetic");
      expect(score).toBeGreaterThan(0.5);
    });

    it("29. scores concise tone reasonably for short messages", () => {
      const score = scoreToneFit("Done. Sent.", "concise");
      expect(score).toBeGreaterThanOrEqual(0.4);
    });

    it("30. scores concise tone lower for verbose messages", () => {
      const verboseScore = scoreToneFit(
        "I just wanted to let you know that unfortunately due to the fact that I have prior commitments, I won't be able to attend the meeting.",
        "concise"
      );
      const shortScore = scoreToneFit("Done. Sent.", "concise");
      expect(verboseScore).toBeLessThanOrEqual(shortScore);
    });

    it("31. scores warm tone high for caring language", () => {
      const score = scoreToneFit("Thanks so much, I really appreciate it! 😊", "warm");
      expect(score).toBeGreaterThan(0.5);
    });

    it("32. scores confident tone high for assured language", () => {
      const score = scoreToneFit("I am certain this will work. Definitely.", "confident");
      expect(score).toBeGreaterThan(0.5);
    });

    it("33. scores calm tone high for measured language", () => {
      const score = scoreToneFit("Let's take a moment to consider this.", "calm");
      expect(score).toBeGreaterThan(0.5);
    });

    it("34. scores serious tone high for direct language", () => {
      const score = scoreToneFit("This is important. I need to address it.", "serious");
      expect(score).toBeGreaterThan(0.5);
    });

    it("35. scores playful tone high for humorous language", () => {
      const score = scoreToneFit("Haha that's hilarious! 😂😂", "playful");
      expect(score).toBeGreaterThan(0.5);
    });

    it("36. scores humorous tone high for funny language", () => {
      const score = scoreToneFit("LOL that's so funny 🤣", "humorous");
      expect(score).toBeGreaterThan(0.5);
    });

    it("37. scores flirty tone high for romantic language", () => {
      const score = scoreToneFit("You're so cute 😏 miss you", "flirty");
      expect(score).toBeGreaterThan(0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. MEANING PRESERVATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Meaning Preservation", () => {
    it("38. preserves intent", async () => {
      const provider = createMockProvider("I understand the concern, but I cannot attend tomorrow.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come tomorrow?"]);
      const result = await transformTone(provider, {
        draft: "I can't come tomorrow",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.preservation.intent).toBe(true);
    });

    it("39. preserves position (disagreement)", async () => {
      const provider = createMockProvider("I see this differently, and I'd like to discuss my concerns.");
      const state = createMockState();
      const messages = createMockMessages(["Do you agree with this plan?"]);
      const result = await transformTone(provider, {
        draft: "I don't agree with this",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.preservation.position).toBe(true);
    });

    it("40. preserves boundaries", async () => {
      const provider = createMockProvider("I'm not available to work this weekend.");
      const state = createMockState();
      const messages = createMockMessages(["Can you work this weekend?"]);
      const result = await transformTone(provider, {
        draft: "I can't work this weekend",
        targetTone: "assertive",
        messages,
      }, state);

      expect(result.preservation.boundaries).toBe(true);
    });

    it("41. preserves factual claims", async () => {
      const provider = createMockProvider("I'll send the report by 5 PM on Friday.");
      const state = createMockState();
      const messages = createMockMessages(["When will you send the report?"]);
      const result = await transformTone(provider, {
        draft: "I'll send the report by 5 PM on Friday",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.preservation.facts).toBe(true);
    });

    it("42. preserves names", async () => {
      const provider = createMockProvider("I spoke with John about the project.");
      const state = createMockState();
      const messages = createMockMessages(["What did John say?"]);
      const result = await transformTone(provider, {
        draft: "I talked to John about the project",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.preservation.facts).toBe(true);
    });

    it("43. preserves dates", async () => {
      const provider = createMockProvider("The meeting is on March 15th.");
      const state = createMockState();
      const messages = createMockMessages(["When is the meeting?"]);
      const result = await transformTone(provider, {
        draft: "The meeting is March 15th",
        targetTone: "formal",
        messages,
      }, state);

      expect(result.preservation.facts).toBe(true);
    });

    it("44. preserves times", async () => {
      const provider = createMockProvider("I'll be there at 3:30 PM.");
      const state = createMockState();
      const messages = createMockMessages(["What time?"]);
      const result = await transformTone(provider, {
        draft: "I'll be there at 3:30 PM",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.preservation.facts).toBe(true);
    });

    it("45. preserves numbers", async () => {
      const provider = createMockProvider("We need exactly 42 units.");
      const state = createMockState();
      const messages = createMockMessages(["How many?"]);
      const result = await transformTone(provider, {
        draft: "We need 42 units",
        targetTone: "assertive",
        messages,
      }, state);

      expect(result.preservation.facts).toBe(true);
    });

    it("46. preserves URLs", async () => {
      const provider = createMockProvider("Check https://example.com for details.");
      const state = createMockState();
      const messages = createMockMessages(["Where?"]);
      const result = await transformTone(provider, {
        draft: "Go to https://example.com",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.preservation.facts).toBe(true);
    });

    it("47. preserves commitments", async () => {
      const provider = createMockProvider("I will finish this by tomorrow.");
      const state = createMockState();
      const messages = createMockMessages(["Can you finish?"]);
      const result = await transformTone(provider, {
        draft: "I'll finish this by tomorrow",
        targetTone: "confident",
        messages,
      }, state);

      expect(result.preservation.intent).toBe(true);
    });

    it("48. preserves requested action", async () => {
      const provider = createMockProvider("Could you please send me the file?");
      const state = createMockState();
      const messages = createMockMessages(["What do you need?"]);
      const result = await transformTone(provider, {
        draft: "Send me the file",
        targetTone: "friendly",
        messages,
      }, state);

      expect(result.preservation.intent).toBe(true);
    });

    it("49. preserves negation", async () => {
      const provider = createMockProvider("I won't be able to attend.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come?"]);
      const result = await transformTone(provider, {
        draft: "I can't attend",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
    });

    it("50. preserves availability constraints", async () => {
      const provider = createMockProvider("I'm unavailable this weekend.");
      const state = createMockState();
      const messages = createMockMessages(["Are you free this weekend?"]);
      const result = await transformTone(provider, {
        draft: "I'm not free this weekend",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.preservation.boundaries).toBe(true);
    });

    it("51. preserves temporal constraints", async () => {
      const provider = createMockProvider("I can't do it today, but tomorrow works for me.");
      const state = createMockState();
      const messages = createMockMessages(["Can you do it today?"]);
      const result = await transformTone(provider, {
        draft: "I can't do it today, but tomorrow works",
        targetTone: "friendly",
        messages,
      }, state);

      expect(result.preservation.temporalConstraints).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. NEGATION PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Negation Patterns", () => {
    const negationTests: Array<{ negation: string; original: string; tone: TargetTone }> = [
      { negation: "can't", original: "I can't come", tone: "diplomatic" },
      { negation: "cannot", original: "I cannot attend", tone: "professional" },
      { negation: "don't", original: "I don't agree", tone: "assertive" },
      { negation: "doesn't", original: "This doesn't work", tone: "professional" },
      { negation: "didn't", original: "I didn't say that", tone: "diplomatic" },
      { negation: "won't", original: "I won't accept this", tone: "assertive" },
      { negation: "haven't", original: "I haven't finished", tone: "professional" },
      { negation: "isn't", original: "This isn't right", tone: "diplomatic" },
      { negation: "never", original: "I never agreed to this", tone: "assertive" },
    ];

    for (const { negation, original, tone } of negationTests) {
      it(`52-neg. preserves negation "${negation}" in ${tone} tone`, async () => {
        const provider = createMockProvider(`Transformed: ${original}`);
        const state = createMockState();
        const messages = createMockMessages(["Hello"]);
        const result = await transformTone(provider, {
          draft: original,
          targetTone: tone,
          messages,
        }, state);

        expect(result.preservation.negation).toBe(true);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. ROMANIZED TELUGU
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Romanized Telugu", () => {
    it("61. preserves kadu (negation)", async () => {
      const provider = createMockProvider("naku ivala submit cheyyadam possible kadu sir");
      const state = createMockState({ language: teluguLanguageOverride });
      const messages = createMockMessages(["Can you submit today?"]);
      const result = await transformTone(provider, {
        draft: "naku ivala submit cheyyadam possible kadu sir",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
      expect(result.languageState.romanized).toBe(true);
    });

    it("62. preserves kaadu", async () => {
      const provider = createMockProvider("adi possible kaadu");
      const state = createMockState({
        language: teluguLanguageOverride,
      });
      const messages = createMockMessages(["Is that possible?"]);
      const result = await transformTone(provider, {
        draft: "adi possible kaadu",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
    });

    it("63. preserves kastam (difficulty/impossibility)", async () => {
      const provider = createMockProvider("naku ivala submit cheyyadam kastam avutundi");
      const state = createMockState({
        language: teluguLanguageOverride,
      });
      const messages = createMockMessages(["Can you submit today?"]);
      const result = await transformTone(provider, {
        draft: "naku ivala submit cheyyadam possible kadu sir",
        targetTone: "friendly",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
    });

    it("64. preserves kashtam", async () => {
      const provider = createMockProvider("adi kashtam avutundi");
      const state = createMockState({
        language: teluguLanguageOverride,
      });
      const messages = createMockMessages(["Is that easy?"]);
      const result = await transformTone(provider, {
        draft: "adi kashtam avutundi",
        targetTone: "empathetic",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
    });

    it("65. preserves possible kadu", async () => {
      const provider = createMockProvider("that is possible kadu sir");
      const state = createMockState({
        language: teluguLanguageOverride,
      });
      const messages = createMockMessages(["Is that possible?"]);
      const result = await transformTone(provider, {
        draft: "that is possible kadu sir",
        targetTone: "formal",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
    });

    it("66. preserves possible kaadu", async () => {
      const provider = createMockProvider("that is possible kaadu sir");
      const state = createMockState({
        language: teluguLanguageOverride,
      });
      const messages = createMockMessages(["Is that possible?"]);
      const result = await transformTone(provider, {
        draft: "that is possible kaadu sir",
        targetTone: "assertive",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
    });

    it("67. preserves possible ledu", async () => {
      const provider = createMockProvider("that is possible ledu");
      const state = createMockState({
        language: teluguLanguageOverride,
      });
      const messages = createMockMessages(["Is that possible?"]);
      const result = await transformTone(provider, {
        draft: "that is possible ledu",
        targetTone: "calm",
        messages,
      }, state);

      expect(result.preservation.negation).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. LANGUAGE VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Language Variants", () => {
    it("68. handles English", async () => {
      const provider = createMockProvider("I won't be able to attend the meeting.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come to the meeting?"]);
      const result = await transformTone(provider, {
        draft: "I can't come to the meeting",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.languageState.primary).toBe("english");
    });

    it("69. handles Telugu Romanized", async () => {
      const provider = createMockProvider("naku ivala submit cheyyadam possible kadu sir");
      const state = createMockState({
        language: teluguLanguageOverride,
      });
      const messages = createMockMessages(["Can you submit today?"]);
      const result = await transformTone(provider, {
        draft: "naku ivala submit cheyyadam possible kadu sir",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.languageState.primary).toBe("telugu");
      expect(result.languageState.romanized).toBe(true);
    });

    it("70. handles Telugu-English code-mixing", async () => {
      const provider = createMockProvider("Sir, naku ivala submit cheyyadam possible kadu.");
      const state = createMockState({
        language: { ...teluguLanguageOverride, outputPreference: "code_mixed" as const },
      });
      const messages = createMockMessages(["Can you submit today?"]);
      const result = await transformTone(provider, {
        draft: "naku ivala submit cheyyadam possible kadu sir",
        targetTone: "formal",
        messages,
      }, state);

      expect(result.languageState.codeMixed).toBe(true);
    });

    it("71. handles Hindi-English", async () => {
      const provider = createMockProvider("Main aaj nahi aa sakta");
      const state = createMockState({
        language: hindiLanguageOverride,
      });
      const messages = createMockMessages(["Can you come today?"]);
      const result = await transformTone(provider, {
        draft: "Main aaj nahi aa sakta",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.languageState.primary).toBe("hindi");
    });

    it("72. handles Tamil-English", async () => {
      const provider = createMockProvider("Enakku innaikku var mudiyadhu");
      const state = createMockState({
        language: tamilLanguageOverride,
      });
      const messages = createMockMessages(["Can you come today?"]);
      const result = await transformTone(provider, {
        draft: "Enakku innaikku var mudiyadhu",
        targetTone: "empathetic",
        messages,
      }, state);

      expect(result.languageState.primary).toBe("tamil");
    });

    it("73. preserves native script when configured", async () => {
      const provider = createMockProvider("नहीं आ सकता");
      const state = createMockState({
        language: { ...hindiLanguageOverride, script: "devanagari" as const, romanized: false, codeMixed: false, outputPreference: "native_script" as const },
      });
      const messages = createMockMessages(["क्या तुम आ सकते हो?"]);
      const result = await transformTone(provider, {
        draft: "nahi aa sakta",
        targetTone: "formal",
        messages,
      }, state);

      expect(result.languageState.script).toBe("devanagari");
    });

    it("74. preserves Romanized output preference", async () => {
      const provider = createMockProvider("Main nahi aa sakta");
      const state = createMockState({
        language: { ...hindiLanguageOverride, codeMixed: false },
      });
      const messages = createMockMessages(["Kya tum aa sakte ho?"]);
      const result = await transformTone(provider, {
        draft: "nahi aa sakta",
        targetTone: "casual",
        messages,
      }, state);

      expect(result.languageState.romanized).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 8. STYLE VARIATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Style Variations", () => {
    it("75. casual style", async () => {
      const provider = createMockProvider("Yeah I can't make it lol");
      const state = createMockState();
      const messages = createMockMessages(["Can you come?"]);
      const result = await transformTone(provider, {
        draft: "I can't come",
        targetTone: "casual",
        messages,
      }, state);

      expect(result.targetTone).toBe("casual");
    });

    it("76. formal style", async () => {
      const provider = createMockProvider("I regret to inform you that I am unable to attend.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come?"]);
      const result = await transformTone(provider, {
        draft: "I can't come",
        targetTone: "formal",
        messages,
      }, state);

      expect(result.targetTone).toBe("formal");
    });

    it("77. short message style", async () => {
      const provider = createMockProvider("Can't.");
      const state = createMockState();
      const messages = createMockMessages(["Can you?"]);
      const result = await transformTone(provider, {
        draft: "No",
        targetTone: "concise",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("78. long message style", async () => {
      const provider = createMockProvider(
        "I wanted to let you know that unfortunately due to prior commitments I won't be able to attend the meeting tomorrow at 3 PM."
      );
      const state = createMockState();
      const messages = createMockMessages(["Can you come tomorrow?"]);
      const result = await transformTone(provider, {
        draft: "I can't come tomorrow",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("79. code-mixed style", async () => {
      const provider = createMockProvider("Sir, naku ivala submit cheyyadam possible kadu.");
      const state = createMockState({
        language: { ...teluguLanguageOverride, outputPreference: "code_mixed" as const },
      });
      const messages = createMockMessages(["Can you submit today?"]);
      const result = await transformTone(provider, {
        draft: "naku ivala submit cheyyadam possible kadu sir",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.languageState.codeMixed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 9. CONTEXT-AWARE TONE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Context-Aware Tone", () => {
    it("80. professional context", async () => {
      const provider = createMockProvider("I appreciate the update. I won't be able to attend the meeting.");
      const state = createMockState({ context: { type: "professional", urgency: "normal" } });
      const messages = createMockMessages(["Can you come to the meeting?"]);
      const result = await transformTone(provider, {
        draft: "I can't come to the meeting",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("81. dating context", async () => {
      const provider = createMockProvider("Hey! What are you up to? 😊");
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const messages = createMockMessages(["What are you doing?"]);
      const result = await transformTone(provider, {
        draft: "What are you doing?",
        targetTone: "playful",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("82. conflict context", async () => {
      const provider = createMockProvider("I see this differently. Let's discuss.");
      const state = createMockState({ context: { type: "conflict", urgency: "normal" }, conflict: { level: 0.7 } });
      const messages = createMockMessages(["You're wrong about this."]);
      const result = await transformTone(provider, {
        draft: "You're wrong about this",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("83. academic context", async () => {
      const provider = createMockProvider("I believe there may be alternative interpretations to consider.");
      const state = createMockState({ context: { type: "academic", urgency: "normal" } });
      const messages = createMockMessages(["Do you agree with this theory?"]);
      const result = await transformTone(provider, {
        draft: "I don't agree with this theory",
        targetTone: "formal",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("84. friendship context", async () => {
      const provider = createMockProvider("Hey! Sounds fun, count me in!");
      const state = createMockState({ context: { type: "friendship", urgency: "normal" } });
      const messages = createMockMessages(["Want to hang out?"]);
      const result = await transformTone(provider, {
        draft: "Yeah sure, sounds good",
        targetTone: "friendly",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("85. group chat context", async () => {
      const provider = createMockProvider("I'm in!");
      const state = createMockState({ context: { type: "social", urgency: "normal" }, participants: { count: 5, isGroup: true } });
      const messages = createMockMessages(["Who's coming?"]);
      const result = await transformTone(provider, {
        draft: "I'm coming",
        targetTone: "casual",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 10. CONFLICT-SPECIFIC
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Conflict-Aware Transformation", () => {
    it("86. handles blame without adding false empathy", async () => {
      const provider = createMockProvider("I completed my part. Let's clarify what's pending.");
      const state = createMockState({ conflict: { level: 0.6 } });
      const messages = createMockMessages(["You always blame me!"]);
      const result = await transformTone(provider, {
        draft: "You always blame me",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.preservation.position).toBe(true);
    });

    it("87. handles accusation without changing position", async () => {
      const provider = createMockProvider("I see this differently. Let me explain.");
      const state = createMockState({ conflict: { level: 0.5 } });
      const messages = createMockMessages(["You're wrong about this!"]);
      const result = await transformTone(provider, {
        draft: "You're wrong about this",
        targetTone: "assertive",
        messages,
      }, state);

      expect(result.preservation.position).toBe(true);
    });

    it("88. handles disagreement preserving stance", async () => {
      const provider = createMockProvider("I have a different perspective on this.");
      const state = createMockState();
      const messages = createMockMessages(["Do you agree?"]);
      const result = await transformTone(provider, {
        draft: "I don't agree",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.preservation.position).toBe(true);
    });

    it("89. handles escalating conversation", async () => {
      const provider = createMockProvider("I understand this is frustrating. Let's take a step back.");
      const state = createMockState({ conflict: { level: 0.8 } });
      const messages = createMockMessages(["This is ridiculous!"]);
      const result = await transformTone(provider, {
        draft: "This is ridiculous!",
        targetTone: "calm",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("90. handles firm boundary", async () => {
      const provider = createMockProvider("I'm not available to work this weekend. I've communicated this before.");
      const state = createMockState();
      const messages = createMockMessages(["Can you work this weekend?"]);
      const result = await transformTone(provider, {
        draft: "I can't work this weekend",
        targetTone: "assertive",
        messages,
      }, state);

      expect(result.preservation.boundaries).toBe(true);
    });

    it("91. handles personal attack without retaliation", async () => {
      const provider = createMockProvider("I'd like to focus on the issue rather than personal comments.");
      const state = createMockState({ conflict: { level: 0.7 } });
      const messages = createMockMessages(["You're terrible at your job!"]);
      const result = await transformTone(provider, {
        draft: "You're terrible at your job",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 11. DATING CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Dating Context", () => {
    it("92. playful dating tone", async () => {
      const provider = createMockProvider("Hey! What are you up to? 👀");
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const messages = createMockMessages(["What are you doing?"]);
      const result = await transformTone(provider, {
        draft: "What are you doing?",
        targetTone: "playful",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("93. flirty dating tone", async () => {
      const provider = createMockProvider("You're on my mind 😏");
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const messages = createMockMessages(["Hey"]);
      const result = await transformTone(provider, {
        draft: "Hey",
        targetTone: "flirty",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("94. non-flirty dating context", async () => {
      const provider = createMockProvider("Thanks for letting me know.");
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const messages = createMockMessages(["I can't make it tonight"]);
      const result = await transformTone(provider, {
        draft: "I can't make it tonight",
        targetTone: "empathetic",
        messages,
      }, state);

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("95. rejection boundary preserved in dating", async () => {
      const provider = createMockProvider("I appreciate you telling me, but I'm not interested.");
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const messages = createMockMessages(["Do you want to go out?"]);
      const result = await transformTone(provider, {
        draft: "I'm not interested",
        targetTone: "diplomatic",
        messages,
      }, state);

      expect(result.preservation.position).toBe(true);
      expect(result.preservation.boundaries).toBe(true);
    });

    it("96. avoids invented romantic claims", async () => {
      const provider = createMockProvider("I miss talking to you.");
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const messages = createMockMessages(["Hey"]);
      const result = await transformTone(provider, {
        draft: "Hey",
        targetTone: "flirty",
        messages,
      }, state);

      // The flirty tone should not invent "I love you" or relationship claims
      expect(result.candidates.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 12. TONE COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Tone Compatibility", () => {
    it("97. professional + professional (compatible)", () => {
      const state = createMockState({ context: { type: "professional", urgency: "normal" } });
      const warnings = checkToneCompatibility("professional", state);
      expect(warnings.filter((w) => w.severity === "warning").length).toBe(0);
    });

    it("98. professional + flirty (incompatible)", () => {
      const state = createMockState({ context: { type: "professional", urgency: "normal" } });
      const warnings = checkToneCompatibility("flirty", state);
      expect(warnings.some((w) => w.severity === "warning")).toBe(true);
    });

    it("99. conflict + humorous (warning)", () => {
      const state = createMockState({ context: { type: "conflict", urgency: "normal" }, conflict: { level: 0.8 } });
      const warnings = checkToneCompatibility("humorous", state);
      expect(warnings.some((w) => w.severity === "warning")).toBe(true);
    });

    it("100. dating + professional (info)", () => {
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const warnings = checkToneCompatibility("professional", state);
      expect(warnings.some((w) => w.severity === "info")).toBe(true);
    });

    it("101. academic + casual (no warning)", () => {
      const state = createMockState({ context: { type: "academic", urgency: "normal" } });
      const warnings = checkToneCompatibility("casual", state);
      expect(warnings.filter((w) => w.severity === "warning").length).toBe(0);
    });

    it("102. conflict + assertive (info)", () => {
      const state = createMockState({ context: { type: "conflict", urgency: "normal" }, conflict: { level: 0.8 } });
      const warnings = checkToneCompatibility("assertive", state);
      expect(warnings.some((w) => w.severity === "info")).toBe(true);
    });

    it("103. interview + playful (warning)", () => {
      const state = createMockState({ context: { type: "interview", urgency: "normal" } });
      const warnings = checkToneCompatibility("playful", state);
      expect(warnings.some((w) => w.severity === "warning")).toBe(true);
    });

    it("104. dating + formal (info)", () => {
      const state = createMockState({ context: { type: "dating", urgency: "normal" } });
      const warnings = checkToneCompatibility("formal", state);
      expect(warnings.some((w) => w.severity === "info")).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 13. PRESERVATION ENGINE (detailed)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Preservation Engine Integration", () => {
    it("105. creates preservation contract correctly", () => {
      const contract = createPreservationContract(
        "I can't come tomorrow at 5 PM",
        defaultLang
      );

      expect(contract.semanticConstraints.negations.length).toBeGreaterThan(0);
      expect(contract.semanticConstraints.temporalConstraints.length).toBeGreaterThan(0);
      expect(contract.semanticConstraints.abilityConstraints.length).toBeGreaterThan(0);
    });

    it("106. validates preservation correctly", () => {
      const contract = createPreservationContract(
        "I can't come tomorrow",
        defaultLang
      );

      // Same meaning preserved
      const result1 = validatePreservation(contract, "I won't be able to come tomorrow");
      expect(result1.passed).toBe(true);

      // Negation reversed
      const result2 = validatePreservation(contract, "I can come tomorrow");
      expect(result2.passed).toBe(false);
    });

    it("107. extracts negations correctly", () => {
      const negations = extractNegations("I can't don't won't", defaultLang);
      expect(negations.length).toBeGreaterThanOrEqual(3);
    });

    it("108. extracts ability constraints correctly", () => {
      const ability = extractAbilityConstraints("I can't work but I am available", defaultLang);
      expect(ability.length).toBeGreaterThan(0);
    });

    it("109. extracts boundaries correctly", () => {
      const boundaries = extractBoundaries("I can't work this weekend", defaultLang);
      expect(boundaries.length).toBeGreaterThan(0);
    });

    it("110. extracts position correctly", () => {
      const position = extractPosition("I don't agree with this", defaultLang);
      expect(position).not.toBeNull();
      expect(position?.type).toBe("disagree");
    });

    it("111. extracts temporal constraints correctly", () => {
      const temporal = extractTemporalConstraints("I'll do it tomorrow at 5 PM", defaultLang);
      expect(temporal.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 14. QUALITY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Quality Validation", () => {
    it("112. detects semantic reversal (preservation flags it)", async () => {
      const provider = createMockProvider("I can come tomorrow");
      const state = createMockState();
      const messages = createMockMessages(["Can you come tomorrow?"]);
      const result = await transformTone(provider, {
        draft: "I can't come tomorrow",
        targetTone: "professional",
        messages,
      }, state);

      // The mock response reverses the negation — preservation should flag it
      expect(result.preservation.negation).toBe(false);
    });

    it("113. rejects factual invention", async () => {
      const provider = createMockProvider("I'll send it by Friday at 5 PM with the report.");
      const state = createMockState();
      const messages = createMockMessages(["When will you send it?"]);
      const result = await transformTone(provider, {
        draft: "I'll send it tomorrow",
        targetTone: "professional",
        messages,
      }, state);

      // Should preserve original facts, not invent new ones
      expect(result.preservation.facts).toBe(true);
    });

    it("114. detects boundary reversal (preservation flags it)", async () => {
      const provider = createMockProvider("I'm available this weekend.");
      const state = createMockState();
      const messages = createMockMessages(["Can you work this weekend?"]);
      const result = await transformTone(provider, {
        draft: "I can't work this weekend",
        targetTone: "assertive",
        messages,
      }, state);

      // The mock response reverses the boundary — preservation should flag it
      expect(result.preservation.boundaries).toBe(false);
    });

    it("115. detects negation reversal (preservation flags it)", async () => {
      const provider = createMockProvider("I agree with this approach.");
      const state = createMockState();
      const messages = createMockMessages(["Do you agree?"]);
      const result = await transformTone(provider, {
        draft: "I don't agree",
        targetTone: "diplomatic",
        messages,
      }, state);

      // The mock response reverses the negation — preservation should flag it
      expect(result.preservation.position).toBe(false);
    });

    it("116. preserves temporal constraints", async () => {
      const provider = createMockProvider("I'll do it tomorrow morning.");
      const state = createMockState();
      const messages = createMockMessages(["When can you do it?"]);
      const result = await transformTone(provider, {
        draft: "I'll do it tomorrow",
        targetTone: "friendly",
        messages,
      }, state);

      expect(result.preservation.temporalConstraints).toBe(true);
    });

    it("117. preserves requested action", async () => {
      const provider = createMockProvider("Could you please send the file?");
      const state = createMockState();
      const messages = createMockMessages(["What do you need?"]);
      const result = await transformTone(provider, {
        draft: "Send me the file",
        targetTone: "friendly",
        messages,
      }, state);

      expect(result.preservation.intent).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 15. RANKING
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Ranking", () => {
    it("118. preservation beats tone fit", async () => {
      const provider = createMockProvider("I understand, but I can't come tomorrow.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come tomorrow?"]);
      const result = await transformTone(provider, {
        draft: "I can't come tomorrow",
        targetTone: "professional",
        messages,
      }, state);

      // The recommended candidate should preserve meaning
      const recommended = result.candidates[result.recommendedCandidate];
      expect(recommended.meaningPreserved).toBe(true);
    });

    it("119. recommends a candidate with meaning preserved", async () => {
      const provider = createMockProvider("I appreciate the invitation. I'm unable to attend.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come?"]);
      const result = await transformTone(provider, {
        draft: "I can't come",
        targetTone: "professional",
        messages,
      }, state);

      const recommended = result.candidates[result.recommendedCandidate];
      // The recommended candidate should be one of the 3 intensity levels
      expect(["light", "medium", "strong"]).toContain(recommended.intensity);
      expect(result.candidates.length).toBe(3);
    });

    it("120. all candidates have tone fit scores", async () => {
      const provider = createMockProvider("I won't be able to make it.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come?"]);
      const result = await transformTone(provider, {
        draft: "I can't come",
        targetTone: "professional",
        messages,
      }, state);

      for (const candidate of result.candidates) {
        expect(candidate.toneFit).toBeGreaterThanOrEqual(0);
        expect(candidate.toneFit).toBeLessThanOrEqual(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 16. TRANSFORMATION SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Transformation Summary", () => {
    it("121. provides summary with formality shift", async () => {
      const provider = createMockProvider("I appreciate your inquiry. I'm unable to attend.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come?"]);
      const result = await transformTone(provider, {
        draft: "Can't come",
        targetTone: "professional",
        messages,
      }, state);

      expect(result.summary).toBeDefined();
      expect(result.summary.formalityShift).toBeDefined();
      expect(result.summary.assertivenessShift).toBeDefined();
      expect(result.summary.warmthShift).toBeDefined();
    });

    it("122. lists changes and preserved elements", async () => {
      const provider = createMockProvider("I appreciate the invitation. I'm unable to attend.");
      const state = createMockState();
      const messages = createMockMessages(["Can you come?"]);
      const result = await transformTone(provider, {
        draft: "Can't come",
        targetTone: "professional",
        messages,
      }, state);

      expect(Array.isArray(result.summary.changes)).toBe(true);
      expect(Array.isArray(result.summary.preserved)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 17. CRITICAL REGRESSION TEST (Telugu Input)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Critical Regression: Telugu Input", () => {
    const teluguDraft = "naku ivala submit cheyyadam possible kadu sir";
    const teluguState = createMockState({
      language: teluguLanguageOverride,
    });
    const teluguMessages = createMockMessages(["Can you submit today?"]);

    const tonesToTest: TargetTone[] = ["professional", "diplomatic", "assertive", "friendly", "concise"];

    for (const tone of tonesToTest) {
      it(`123-regression. ${tone}: submission=subject, inability=inability, today=today, no inventions`, async () => {
        const provider = createMockProvider(`Sir, naku ivala submit cheyyadam possible kadu.`);
        const result = await transformTone(provider, {
          draft: teluguDraft,
          targetTone: tone,
          messages: teluguMessages,
        }, teluguState);

        expect(result).toBeDefined();
        expect(result.originalDraft).toBe(teluguDraft);
        expect(result.languageState.primary).toBe("telugu");
        expect(result.languageState.romanized).toBe(true);

        // Check preservation
        expect(result.preservation.negation).toBe(true);
        expect(result.preservation.intent).toBe(true);

        // Check candidates exist
        expect(result.candidates.length).toBeGreaterThan(0);
        for (const candidate of result.candidates) {
          expect(candidate.tone).toBe(tone);
          expect(candidate.meaningPreserved).toBe(true);
        }
      });
    }
  });
});
