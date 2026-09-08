import { describe, it, expect } from "vitest";
import {
  validateCandidates,
  type QualityGateConfig,
} from "@/lib/ai/quality-validator";
import type { ConversationState } from "@/lib/ai/conversation-state";
import type { WritingStyleProfile } from "@/lib/ai/personality";

function createDefaultState(overrides?: Partial<ConversationState>): ConversationState {
  return {
    participants: {
      count: 2,
      roles: ["friend"],
      userId: "me",
      others: ["them"],
      isGroup: false,
    },
    relationship: "friend",
    language: {
      primary: "english",
      secondary: [],
      script: "latin",
      codeMixed: false,
      romanized: false,
      codeMixRatio: [],
      outputPreference: "auto",
      confidence: 0.8,
      scriptConfidence: 0.9,
      detectionSource: "heuristic",
      participantLanguages: [],
    },
    context: {
      type: "general",
      platform: undefined,
      situation: "casual_chat",
      urgency: "normal",
    },
    intent: {
      userGoal: "keep_going",
      userIntent: "continue_conversation",
      otherIntent: "unknown",
    },
    emotion: {
      primary: "neutral",
      secondary: "neutral",
      intensity: 0.3,
    },
    tone: {
      primary: "casual",
      secondary: "friendly",
      intensity: 0.5,
    },
    dynamics: {
      engagement: 0.5,
      reciprocity: 0.5,
      cooperation: 0.5,
      defensiveness: 0.2,
      escalation: 0.1,
      rapport: 0.5,
      pressure: 0.2,
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
      resolutionOpportunity: true,
    },
    risks: [],
    conflictIntelligence: {
      participants: [],
      conflictStructure: null,
      groupAnalysis: null,
    },
    strategy: {
      primary: "natural",
      ranked: [],
      confidence: 0.5,
    },
    style: {
      preferred: "casual",
      writingCharacteristics: "casual",
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
      languageSource: "fallback",
    },
    ...overrides,
  };
}

function createCasualProfile(): WritingStyleProfile {
  return {
    emoji: {
      usesEmojis: true,
      frequency: 0.6,
      placement: "end",
      commonEmojis: ["😂", "🤣", "💀"],
      categories: ["faces"],
    },
    punctuation: {
      style: "expressive",
      exclamationRate: 0.3,
      questionRate: 0.2,
      usesEllipses: false,
      endsWithPeriod: false,
      multiPunctuationRate: 0.1,
    },
    sentence: {
      averageWords: 4,
      averageChars: 20,
      completenessRate: 0.2,
      prefersFragments: true,
      lengthCategory: "short",
    },
    slang: {
      usesSlang: true,
      frequency: 0.4,
      commonSlang: ["nah", "bruh", "haha"],
      commonAbbreviations: ["lol", "ngl"],
      codeSwitchTendency: 0,
    },
    humor: {
      usesHumor: true,
      indicators: ["haha", "lol"],
      style: "playful",
    },
    tonePreference: {
      dominant: "casual",
      secondary: "playful",
      formality: "very_casual",
      warmth: 0.6,
      directness: 0.4,
    },
    confidence: 0.8,
    messageCount: 10,
    languageStyle: "standard_english",
  };
}

describe("Quality Validator", () => {
  describe("Basic functionality", () => {
    it("validates candidates and returns results", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "haha yeah that's cool", strategy: "natural" },
        { text: "nah i get that", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      expect(result.results).toHaveLength(2);
      expect(result.passedCandidates.length).toBeGreaterThan(0);
      expect(result.validationSummary.totalCandidates).toBe(2);
    });

    it("returns empty results for empty candidates", () => {
      const state = createDefaultState();
      const result = validateCandidates([], state);

      expect(result.results).toHaveLength(0);
      expect(result.passedCandidates).toHaveLength(0);
      expect(result.allFailed).toBe(true);
    });

    it("computes overall scores", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "haha yeah that's cool", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].overallScore).toBeGreaterThanOrEqual(0);
      expect(result.results[0].overallScore).toBeLessThanOrEqual(1);
    });
  });

  describe("Semantic validation", () => {
    it("passes when original text is not provided", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.semantic.passed).toBe(true);
    });

    it("detects high semantic overlap", () => {
      const state = createDefaultState();
      const candidates = [{ text: "I missed the deadline because I was busy", strategy: "accountable" }];
      const originals = ["I missed the deadline because I was busy with work"];

      const result = validateCandidates(candidates, state, originals);

      expect(result.results[0].dimensions.semantic.score).toBeGreaterThan(0.5);
    });

    it("detects low semantic overlap", () => {
      const state = createDefaultState();
      const candidates = [{ text: "The weather is nice today", strategy: "natural" }];
      const originals = ["I need to finish the important project by tomorrow deadline"];

      const result = validateCandidates(candidates, state, originals);

      // Score is 0.8 because overlap is ~0.14 (one word "the" overlaps)
      expect(result.results[0].dimensions.semantic.score).toBeLessThanOrEqual(0.8);
      expect(result.results[0].dimensions.semantic.issues.length).toBeGreaterThan(0);
    });

    it("detects negation reversal", () => {
      const state = createDefaultState();
      const candidates = [{ text: "I will do it", strategy: "natural" }];
      const originals = ["I will not do it"];

      const result = validateCandidates(candidates, state, originals);

      expect(result.results[0].dimensions.semantic.issues.length).toBeGreaterThan(0);
    });

    it("penalizes overly long responses", () => {
      const state = createDefaultState();
      const longText = "a ".repeat(50);
      const candidates = [{ text: longText, strategy: "natural" }];
      const originals = ["short message"];

      const result = validateCandidates(candidates, state, originals);

      expect(result.results[0].dimensions.semantic.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Factual validation", () => {
    it("passes when original text is not provided", () => {
      const state = createDefaultState();
      const candidates = [{ text: "See you at 3pm", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.factual.passed).toBe(true);
    });

    it("preserves time facts", () => {
      const state = createDefaultState();
      const candidates = [{ text: "Can we meet at 3:30pm?", strategy: "professional" }];
      const originals = ["Let's meet at 3:30pm tomorrow"];

      const result = validateCandidates(candidates, state, originals);

      expect(result.results[0].dimensions.factual.score).toBeGreaterThan(0.5);
    });

    it("detects missing facts", () => {
      const state = createDefaultState();
      const candidates = [{ text: "Let's meet tomorrow", strategy: "professional" }];
      const originals = ["Let's meet at 3:30pm tomorrow"];

      const result = validateCandidates(candidates, state, originals);

      expect(result.results[0].dimensions.factual.issues.length).toBeGreaterThan(0);
    });

    it("detects fabricated facts", () => {
      const state = createDefaultState();
      const candidates = [{ text: "I'll be there at 5pm", strategy: "professional" }];
      const originals = ["Let's meet at 3:30pm"];

      const result = validateCandidates(candidates, state, originals);

      expect(result.results[0].dimensions.factual.issues.length).toBeGreaterThan(0);
    });

    it("preserves proper nouns", () => {
      const state = createDefaultState();
      const candidates = [{ text: "John is coming too", strategy: "natural" }];
      const originals = ["John said he would come"];

      const result = validateCandidates(candidates, state, originals);

      expect(result.results[0].dimensions.factual.score).toBeGreaterThan(0.5);
    });
  });

  describe("Strategy validation", () => {
    it("passes when strategy is in recommended list", () => {
      const state = createDefaultState({
        strategy: {
          primary: "natural",
          ranked: [{ strategy: "natural", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
      });
      const candidates = [{ text: "haha yeah", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.strategy.passed).toBe(true);
    });

    it("warns when strategy is not recommended", () => {
      const state = createDefaultState({
        strategy: {
          primary: "natural",
          ranked: [{ strategy: "natural", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
      });
      const candidates = [{ text: "haha yeah", strategy: "playful" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.strategy.issues.length).toBeGreaterThan(0);
    });

    it("penalizes inappropriate strategy for conflict context", () => {
      const state = createDefaultState({
        conflict: {
          level: 0.8,
          escalation: 0.6,
          trigger: "disagreement",
          coreDisagreement: "approach",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });
      const candidates = [{ text: "haha that's funny", strategy: "playful" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.strategy.score).toBeLessThanOrEqual(0.7);
      expect(result.results[0].dimensions.strategy.issues.length).toBeGreaterThan(0);
    });

    it("penalizes inappropriate strategy for professional context", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "professional_feedback",
          urgency: "normal",
        },
      });
      const candidates = [{ text: "hey cutie", strategy: "flirty" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.strategy.score).toBeLessThanOrEqual(0.6);
      expect(result.results[0].dimensions.strategy.issues.length).toBeGreaterThan(0);
    });

    it("penalizes formal strategy for dating context", () => {
      const state = createDefaultState({
        context: {
          type: "dating",
          platform: undefined,
          situation: "romantic_interest",
          urgency: "normal",
        },
      });
      const candidates = [{ text: "Dear sir,", strategy: "professional" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.strategy.score).toBeLessThanOrEqual(0.8);
      expect(result.results[0].dimensions.strategy.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Style validation", () => {
    it("passes when no style profile is available", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.style.passed).toBe(true);
    });

    it("matches emoji usage", () => {
      const profile = createCasualProfile();
      const state = createDefaultState({
        style: {
          preferred: "casual",
          writingCharacteristics: "casual",
          lengthPreference: "short",
          profile,
          guidance: null,
          source: "extracted",
        },
      });
      const candidates = [{ text: "haha yeah 😂", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.style.score).toBeGreaterThan(0.6);
    });

    it("penalizes missing emojis when expected", () => {
      const profile = createCasualProfile();
      const state = createDefaultState({
        style: {
          preferred: "casual",
          writingCharacteristics: "casual",
          lengthPreference: "short",
          profile,
          guidance: null,
          source: "extracted",
        },
      });
      const candidates = [{ text: "haha yeah", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.style.issues.length).toBeGreaterThan(0);
    });

    it("matches length preference", () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        sentence: {
          averageWords: 4,
          averageChars: 20,
          completenessRate: 0.2,
          prefersFragments: true,
          lengthCategory: "short",
        },
      };
      const state = createDefaultState({
        style: {
          preferred: "casual",
          writingCharacteristics: "casual",
          lengthPreference: "short",
          profile,
          guidance: null,
          source: "extracted",
        },
      });
      const candidates = [{ text: "haha yeah", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.style.score).toBeGreaterThan(0.5);
    });

    it("penalizes casual strategy for formal style", () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        tonePreference: {
          dominant: "professional",
          secondary: "formal",
          formality: "very_formal",
          warmth: 0.3,
          directness: 0.6,
        },
      };
      const state = createDefaultState({
        style: {
          preferred: "professional",
          writingCharacteristics: "professional",
          lengthPreference: "medium",
          profile,
          guidance: null,
          source: "extracted",
        },
      });
      const candidates = [{ text: "haha that's funny", strategy: "playful" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.style.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Naturalness validation", () => {
    it("penalizes AI-like patterns", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "That sounds amazing! I'd love to hear more about that.", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.naturalness.score).toBeLessThan(0.7);
      expect(result.results[0].dimensions.naturalness.issues.length).toBeGreaterThan(0);
    });

    it("penalizes excessive exclamation marks", () => {
      const state = createDefaultState();
      const candidates = [{ text: "That's great!!!", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.naturalness.issues.length).toBeGreaterThan(0);
    });

    it("penalizes all caps", () => {
      const state = createDefaultState();
      const candidates = [{ text: "THAT'S GREAT", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.naturalness.issues.length).toBeGreaterThan(0);
    });

    it("penalizes ellipsis abuse", () => {
      const state = createDefaultState();
      const candidates = [{ text: "well...", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.naturalness.issues.length).toBeGreaterThan(0);
    });

    it("passes natural messages", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah that's cool", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.naturalness.score).toBeGreaterThan(0.6);
    });

    it("penalizes long messages in casual context", () => {
      const state = createDefaultState();
      const longMessage = "word ".repeat(35);
      const candidates = [{ text: longMessage, strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.naturalness.issues.length).toBeGreaterThan(0);
    });

    it("allows longer messages in professional context", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "professional_feedback",
          urgency: "normal",
        },
      });
      const longMessage = "word ".repeat(35);
      const candidates = [{ text: longMessage, strategy: "professional" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.naturalness.issues).not.toContainEqual(
        expect.stringContaining("too long")
      );
    });
  });

  describe("Context validation", () => {
    it("penalizes long messages in conflict context", () => {
      const state = createDefaultState({
        conflict: {
          level: 0.8,
          escalation: 0.6,
          trigger: "disagreement",
          coreDisagreement: "approach",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });
      const longMessage = "word ".repeat(25);
      const candidates = [{ text: longMessage, strategy: "de_escalate" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.context.issues.length).toBeGreaterThan(0);
    });

    it("penalizes humor in conflict context", () => {
      const state = createDefaultState({
        conflict: {
          level: 0.8,
          escalation: 0.6,
          trigger: "disagreement",
          coreDisagreement: "approach",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });
      const candidates = [{ text: "haha that's funny", strategy: "playful" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.context.issues.length).toBeGreaterThan(0);
    });

    it("penalizes short messages in professional context", () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "professional_feedback",
          urgency: "normal",
        },
      });
      const candidates = [{ text: "ok", strategy: "professional" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.context.issues.length).toBeGreaterThan(0);
    });

    it("penalizes formal strategy in dating context", () => {
      const state = createDefaultState({
        context: {
          type: "dating",
          platform: undefined,
          situation: "romantic_interest",
          urgency: "normal",
        },
      });
      const candidates = [{ text: "Dear sir,", strategy: "professional" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.context.issues.length).toBeGreaterThan(0);
    });

    it("penalizes long messages in urgent context", () => {
      const state = createDefaultState({
        context: {
          type: "general",
          platform: undefined,
          situation: "casual_chat",
          urgency: "high",
        },
      });
      const longMessage = "word ".repeat(20);
      const candidates = [{ text: longMessage, strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.context.issues.length).toBeGreaterThan(0);
    });

    it("penalizes long messages in group chat", () => {
      const state = createDefaultState({
        participants: {
          count: 5,
          roles: ["friend", "friend", "friend", "friend"],
          userId: "me",
          others: ["a", "b", "c", "d"],
          isGroup: true,
        },
      });
      const longMessage = "word ".repeat(30);
      const candidates = [{ text: longMessage, strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.context.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Language validation", () => {
    it("passes for standard English", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah that's cool", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.language.passed).toBe(true);
    });

    it("penalizes non-Latin for Romanized output", () => {
      const state = createDefaultState({
        language: {
          primary: "telugu",
          secondary: [],
          script: "latin",
          codeMixed: false,
          romanized: true,
          codeMixRatio: [],
          outputPreference: "romanized",
          confidence: 0.85,
          scriptConfidence: 0.9,
          detectionSource: "ai",
          participantLanguages: [],
        },
      });
      const candidates = [{ text: "నమస్కారం", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.language.issues.length).toBeGreaterThan(0);
    });

    it("penalizes missing Devanagari for native script output", () => {
      const state = createDefaultState({
        language: {
          primary: "hindi",
          secondary: [],
          script: "devanagari",
          codeMixed: false,
          romanized: false,
          codeMixRatio: [],
          outputPreference: "native_script",
          confidence: 0.9,
          scriptConfidence: 0.95,
          detectionSource: "ai",
          participantLanguages: [],
        },
      });
      const candidates = [{ text: "hello how are you", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.language.issues.length).toBeGreaterThan(0);
    });

    it("penalizes missing Telugu for native script output", () => {
      const state = createDefaultState({
        language: {
          primary: "telugu",
          secondary: [],
          script: "telugu",
          codeMixed: false,
          romanized: false,
          codeMixRatio: [],
          outputPreference: "native_script",
          confidence: 0.9,
          scriptConfidence: 0.95,
          detectionSource: "ai",
          participantLanguages: [],
        },
      });
      const candidates = [{ text: "hello how are you", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.language.issues.length).toBeGreaterThan(0);
    });

    it("penalizes non-Latin for English output", () => {
      const state = createDefaultState({
        language: {
          primary: "english",
          secondary: [],
          script: "latin",
          codeMixed: false,
          romanized: false,
          codeMixRatio: [],
          outputPreference: "auto",
          confidence: 0.9,
          scriptConfidence: 0.95,
          detectionSource: "heuristic",
          participantLanguages: [],
        },
      });
      const candidates = [{ text: "नमस्ते कैसे हैं आप", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.language.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Safety validation", () => {
    it("passes for clean messages", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah that's cool", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.safety.passed).toBe(true);
      expect(result.results[0].dimensions.safety.score).toBe(1.0);
    });

    it("penalizes offensive language", () => {
      const state = createDefaultState();
      const candidates = [{ text: "that's damn cool", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.safety.score).toBeLessThan(0.7);
      expect(result.results[0].dimensions.safety.passed).toBe(false);
    });

    it("penalizes harmful content", () => {
      const state = createDefaultState();
      const candidates = [{ text: "I want to kill time", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.safety.score).toBeLessThan(0.6);
      expect(result.results[0].dimensions.safety.passed).toBe(false);
    });

    it("penalizes phone numbers", () => {
      const state = createDefaultState();
      const candidates = [{ text: "call me at 555-123-4567", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.safety.score).toBeLessThan(0.8);
      expect(result.results[0].dimensions.safety.issues.length).toBeGreaterThan(0);
    });

    it("penalizes email addresses", () => {
      const state = createDefaultState();
      const candidates = [{ text: "email me at test@example.com", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].dimensions.safety.score).toBeLessThan(0.8);
      expect(result.results[0].dimensions.safety.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Quality Gate", () => {
    it("passes candidates above threshold", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "haha yeah that's cool", strategy: "natural" },
        { text: "nah i get that", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      expect(result.passedCandidates.length).toBeGreaterThan(0);
      expect(result.allFailed).toBe(false);
    });

    it("fails candidates with critical issues", () => {
      const state = createDefaultState();
      const candidates = [{ text: "that's damn cool", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results[0].criticalIssues.length).toBeGreaterThan(0);
    });

    it("falls back to failed candidates when all fail", () => {
      const state = createDefaultState();
      const candidates = [{ text: "that's damn cool", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.allFailed).toBe(true);
      expect(result.passedCandidates.length).toBe(1);
    });

    it("respects custom quality gate config", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah that's cool", strategy: "natural" }];
      const strictConfig: QualityGateConfig = {
        minimumOverallScore: 0.9,
        minimumDimensionScores: {
          semantic: 0.9,
          factual: 0.9,
          strategy: 0.9,
          style: 0.9,
          naturalness: 0.9,
          context: 0.9,
          language: 0.9,
          safety: 0.9,
          preservation: 0.9,
        },
        criticalDimensions: ["safety"],
        fallbackToFailed: false,
      };

      const result = validateCandidates(candidates, state, undefined, strictConfig);

      expect(result.passedCandidates.length).toBe(0);
      expect(result.allFailed).toBe(true);
    });

    it("computes validation summary", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "haha yeah that's cool", strategy: "natural" },
        { text: "nah i get that", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      expect(result.validationSummary.totalCandidates).toBe(2);
      expect(result.validationSummary.averageScore).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.averageScore).toBeLessThanOrEqual(1);
      expect(result.validationSummary.dimensionAverages).toBeDefined();
    });

    it("computes dimension averages", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "haha yeah that's cool", strategy: "natural" },
        { text: "nah i get that", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      expect(result.validationSummary.dimensionAverages.semantic).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.dimensionAverages.factual).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.dimensionAverages.strategy).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.dimensionAverages.style).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.dimensionAverages.naturalness).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.dimensionAverages.context).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.dimensionAverages.language).toBeGreaterThanOrEqual(0);
      expect(result.validationSummary.dimensionAverages.safety).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge cases", () => {
    it("handles single candidate", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results).toHaveLength(1);
      expect(result.validationSummary.totalCandidates).toBe(1);
    });

    it("handles empty text", () => {
      const state = createDefaultState();
      const candidates = [{ text: "", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results).toHaveLength(1);
    });

    it("handles very long text", () => {
      const state = createDefaultState();
      const longText = "word ".repeat(100);
      const candidates = [{ text: longText, strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results).toHaveLength(1);
    });

    it("handles special characters", () => {
      const state = createDefaultState();
      const candidates = [{ text: "haha yeah!!! 😂💀👀", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results).toHaveLength(1);
    });

    it("handles unicode text", () => {
      const state = createDefaultState();
      const candidates = [{ text: "नमस्ते कैसे हैं आप", strategy: "natural" }];

      const result = validateCandidates(candidates, state);

      expect(result.results).toHaveLength(1);
    });
  });

  describe("Multiple candidates", () => {
    it("validates all candidates independently", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "haha yeah that's cool", strategy: "natural" },
        { text: "that's damn cool", strategy: "natural" },
        { text: "nah i get that", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].dimensions.safety.passed).toBe(true);
      expect(result.results[1].dimensions.safety.passed).toBe(false);
      expect(result.results[2].dimensions.safety.passed).toBe(true);
    });

    it("ranks candidates by overall score", () => {
      const state = createDefaultState();
      const candidates = [
        { text: "that's damn cool", strategy: "natural" },
        { text: "haha yeah that's cool", strategy: "natural" },
      ];

      const result = validateCandidates(candidates, state);

      // First candidate should have lower score due to safety issue
      expect(result.results[0].overallScore).toBeLessThan(result.results[1].overallScore);
    });
  });
});
