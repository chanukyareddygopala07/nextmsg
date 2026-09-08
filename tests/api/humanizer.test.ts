import { describe, it, expect, vi } from "vitest";
import { humanizeReplies, scoreAILikeness } from "@/lib/ai/humanizer";
import { assembleContextAwareHumanizationPrompt } from "@/lib/ai/prompt-builder";
import type { AIProvider } from "@/lib/ai/provider";
import type { ConversationContext } from "@/lib/ai/context";
import type { ConversationState } from "@/lib/ai/conversation-state";
import type { WritingStyleProfile } from "@/lib/ai/personality";

function createMockProvider(responseContent: string): AIProvider {
  return {
    chat: vi.fn().mockResolvedValue(responseContent),
    chatVision: vi.fn().mockResolvedValue(responseContent),
    chatStructured: vi.fn().mockResolvedValue(responseContent),
  };
}

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

function createFormalProfile(): WritingStyleProfile {
  return {
    emoji: {
      usesEmojis: false,
      frequency: 0,
      placement: "none",
      commonEmojis: [],
      categories: [],
    },
    punctuation: {
      style: "standard",
      exclamationRate: 0.1,
      questionRate: 0.2,
      usesEllipses: false,
      endsWithPeriod: true,
      multiPunctuationRate: 0,
    },
    sentence: {
      averageWords: 12,
      averageChars: 70,
      completenessRate: 0.9,
      prefersFragments: false,
      lengthCategory: "medium",
    },
    slang: {
      usesSlang: false,
      frequency: 0,
      commonSlang: [],
      commonAbbreviations: [],
      codeSwitchTendency: 0,
    },
    humor: {
      usesHumor: false,
      indicators: [],
      style: "none",
    },
    tonePreference: {
      dominant: "professional",
      secondary: "formal",
      formality: "very_formal",
      warmth: 0.3,
      directness: 0.6,
    },
    confidence: 0.85,
    messageCount: 12,
    languageStyle: "standard_english",
  };
}

const candidates = [
  { text: "That sounds amazing!", strategy: "natural" },
  { text: "I'd love to hear more about that.", strategy: "playful" },
];

describe("humanizeReplies", () => {
  describe("Basic functionality", () => {
    it("returns humanized replies from structured output", async () => {
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "haha yeah that's cool", strategy: "natural" },
          { text: "wait tell me more 👀", strategy: "playful" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, candidates, defaultContext);

      expect(result.humanized).toHaveLength(2);
      expect(result.humanized[0].text).toBe("haha yeah that's cool");
      expect(result.error).toBeUndefined();
      expect(provider.chatStructured).toHaveBeenCalled();
    });

    it("returns original candidates and error on invalid JSON", async () => {
      const provider = createMockProvider("not json");
      const result = await humanizeReplies(provider, candidates, defaultContext);

      expect(result.humanized).toEqual(candidates);
      expect(result.error).toBeDefined();
      expect(result.error?.stage).toBe("humanization");
    });

    it("returns original candidates and error on schema validation failure", async () => {
      const mockResponse = JSON.stringify({ humanized: [] });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, candidates, defaultContext);

      expect(result.humanized).toEqual(candidates);
      expect(result.error).toBeDefined();
      expect(result.error?.stage).toBe("schema_validation");
    });

    it("returns original candidates and error on provider error", async () => {
      const provider = createMockProvider("");
      provider.chatStructured = vi.fn().mockRejectedValue(new Error("Rate limit"));
      const result = await humanizeReplies(provider, candidates, defaultContext);

      expect(result.humanized).toEqual(candidates);
      expect(result.error).toBeDefined();
      expect(result.error?.stage).toBe("humanization");
    });
  });

  describe("Context-aware humanization", () => {
    it("uses state when provided", async () => {
      const state = createDefaultState();
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "haha yeah that's cool", strategy: "natural" },
          { text: "wait tell me more 👀", strategy: "playful" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, candidates, defaultContext, state);

      expect(result.humanized).toHaveLength(2);
      expect(result.error).toBeUndefined();
      expect(provider.chatStructured).toHaveBeenCalled();
    });

    it("falls back to basic context when no state", async () => {
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "haha yeah that's cool", strategy: "natural" },
          { text: "wait tell me more 👀", strategy: "playful" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, candidates, defaultContext);

      expect(result.humanized).toHaveLength(2);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Strategy preservation", () => {
    it("preserves strategy labels in humanized output", async () => {
      const state = createDefaultState({
        strategy: {
          primary: "professional",
          ranked: [{ strategy: "professional", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
      });
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "Thank you for your patience.", strategy: "professional" },
          { text: "I'll look into this right away.", strategy: "accountable" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, candidates, defaultContext, state);

      expect(result.humanized[0].strategy).toBe("professional");
      expect(result.humanized[1].strategy).toBe("accountable");
    });
  });

  describe("Style profile integration", () => {
    it("includes style profile in prompt when available", async () => {
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
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "haha nah that's wild", strategy: "natural" },
          { text: "bruh 💀", strategy: "playful" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, candidates, defaultContext, state);

      expect(result.humanized).toHaveLength(2);
      expect(result.error).toBeUndefined();
    });
  });
});

describe("Context-Aware Humanization Prompt", () => {
  it("generates basic prompt without state", () => {
    const prompt = assembleContextAwareHumanizationPrompt(
      "1. [natural] That sounds amazing!",
      defaultContext
    );

    expect(prompt).toContain("Humanize these replies");
    expect(prompt).toContain("Conversation type: general");
  });

  it("generates detailed prompt with state", () => {
    const state = createDefaultState();
    const prompt = assembleContextAwareHumanizationPrompt(
      "1. [natural] That sounds amazing!",
      defaultContext,
      state
    );

    expect(prompt).toContain("Conversation State");
    expect(prompt).toContain("Relationship: friend");
    expect(prompt).toContain("Context: general");
    expect(prompt).toContain("Candidates to Humanize");
  });

  it("includes style profile section", () => {
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
    const prompt = assembleContextAwareHumanizationPrompt(
      "1. [natural] That sounds amazing!",
      defaultContext,
      state
    );

    expect(prompt).toContain("User Writing Style Profile");
    expect(prompt).toContain("Average words per message: 4");
    expect(prompt).toContain("Uses emojis: true");
    expect(prompt).toContain("Punctuation style: expressive");
    expect(prompt).toContain("Uses slang: true");
    expect(prompt).toContain("Formality: very_casual");
  });

  it("includes language section", () => {
    const state = createDefaultState({
      language: {
        primary: "telugu",
        secondary: ["english"],
        script: "mixed",
        codeMixed: true,
        romanized: true,
        codeMixRatio: [
          { language: "telugu", ratio: 0.6 },
          { language: "english", ratio: 0.4 },
        ],
        outputPreference: "auto",
        confidence: 0.85,
        scriptConfidence: 0.9,
        detectionSource: "ai",
        participantLanguages: [],
      },
    });
    const prompt = assembleContextAwareHumanizationPrompt(
      "1. [natural] That sounds amazing!",
      defaultContext,
      state
    );

    expect(prompt).toContain("Language Settings");
    expect(prompt).toContain("Primary language: telugu");
    expect(prompt).toContain("Code-mixed: true");
    expect(prompt).toContain("Romanized: true");
    expect(prompt).toContain("telugu: 60%");
  });

  it("includes conflict information", () => {
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
    const prompt = assembleContextAwareHumanizationPrompt(
      "1. [natural] That sounds amazing!",
      defaultContext,
      state
    );

    expect(prompt).toContain("Conflict Level: 0.8");
    expect(prompt).toContain("Conflict Escalation: 0.6");
  });
});

describe("Style Tests", () => {
  describe("Short-message user", () => {
    it("generates prompt for short message style", async () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        sentence: {
          averageWords: 3,
          averageChars: 15,
          completenessRate: 0.1,
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [accountable] I apologize for the delay.",
        defaultContext,
        state
      );

      expect(prompt).toContain("Average words per message: 3");
      expect(prompt).toContain("Length category: short");
    });
  });

  describe("Long-message user", () => {
    it("generates prompt for long message style", async () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        sentence: {
          averageWords: 20,
          averageChars: 120,
          completenessRate: 0.8,
          prefersFragments: false,
          lengthCategory: "long",
        },
      };
      const state = createDefaultState({
        style: {
          preferred: "casual",
          writingCharacteristics: "casual",
          lengthPreference: "long",
          profile,
          guidance: null,
          source: "extracted",
        },
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [accountable] I apologize for the delay.",
        defaultContext,
        state
      );

      expect(prompt).toContain("Average words per message: 20");
      expect(prompt).toContain("Length category: long");
    });
  });

  describe("Emoji-heavy user", () => {
    it("generates prompt for emoji-heavy style", async () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        emoji: {
          usesEmojis: true,
          frequency: 0.9,
          placement: "end",
          commonEmojis: ["😂", "🤣", "💀", "👀"],
          categories: ["faces"],
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That sounds amazing!",
        defaultContext,
        state
      );

      expect(prompt).toContain("Uses emojis: true");
      expect(prompt).toContain("Emoji frequency: 90%");
      expect(prompt).toContain("Common emojis: 😂 🤣 💀 👀");
    });
  });

  describe("No-emoji user", () => {
    it("generates prompt for no-emoji style", async () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        emoji: {
          usesEmojis: false,
          frequency: 0,
          placement: "none",
          commonEmojis: [],
          categories: [],
        },
      };
      const state = createDefaultState({
        style: {
          preferred: "casual",
          writingCharacteristics: "casual",
          lengthPreference: "medium",
          profile,
          guidance: null,
          source: "extracted",
        },
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That sounds amazing!",
        defaultContext,
        state
      );

      expect(prompt).toContain("Uses emojis: false");
    });
  });

  describe("Slang-heavy user", () => {
    it("generates prompt for slang-heavy style", async () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        slang: {
          usesSlang: true,
          frequency: 0.6,
          commonSlang: ["bruh", "fam", "dead", "slay", "bussin"],
          commonAbbreviations: ["lol", "ngl", "tbh"],
          codeSwitchTendency: 0,
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That sounds amazing!",
        defaultContext,
        state
      );

      expect(prompt).toContain("Uses slang: true");
      expect(prompt).toContain("Slang frequency: 60%");
      expect(prompt).toContain("Common slang: bruh, fam, dead, slay, bussin");
    });
  });

  describe("Formal user", () => {
    it("generates prompt for formal style", async () => {
      const state = createDefaultState({
        style: {
          preferred: "professional",
          writingCharacteristics: "professional",
          lengthPreference: "medium",
          profile: createFormalProfile(),
          guidance: null,
          source: "extracted",
        },
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [professional] I apologize for the delay.",
        defaultContext,
        state
      );

      expect(prompt).toContain("Uses emojis: false");
      expect(prompt).toContain("Formality: very_formal");
      expect(prompt).toContain("Dominant tone: professional");
    });
  });

  describe("Casual user", () => {
    it("generates prompt for casual style", async () => {
      const state = createDefaultState({
        style: {
          preferred: "casual",
          writingCharacteristics: "casual",
          lengthPreference: "short",
          profile: createCasualProfile(),
          guidance: null,
          source: "extracted",
        },
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That sounds amazing!",
        defaultContext,
        state
      );

      expect(prompt).toContain("Formality: very_casual");
      expect(prompt).toContain("Dominant tone: casual");
    });
  });

  describe("High punctuation user", () => {
    it("generates prompt for expressive punctuation", async () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        punctuation: {
          style: "expressive",
          exclamationRate: 0.6,
          questionRate: 0.3,
          usesEllipses: false,
          endsWithPeriod: false,
          multiPunctuationRate: 0.3,
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That sounds amazing!",
        defaultContext,
        state
      );

      expect(prompt).toContain("Punctuation style: expressive");
      expect(prompt).toContain("Exclamation rate: 60%");
    });
  });

  describe("Minimal punctuation user", () => {
    it("generates prompt for minimal punctuation", async () => {
      const profile: WritingStyleProfile = {
        ...createCasualProfile(),
        punctuation: {
          style: "minimal",
          exclamationRate: 0.02,
          questionRate: 0.05,
          usesEllipses: false,
          endsWithPeriod: false,
          multiPunctuationRate: 0,
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That sounds amazing!",
        defaultContext,
        state
      );

      expect(prompt).toContain("Punctuation style: minimal");
    });
  });
});

describe("Context Tests", () => {
  describe("Professional", () => {
    it("generates prompt for professional context", async () => {
      const state = createDefaultState({
        context: {
          type: "professional",
          platform: undefined,
          situation: "professional_feedback",
          urgency: "normal",
        },
        relationship: "coworker",
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [empathetic] I understand your concern.",
        { ...defaultContext, conversationType: "professional" },
        state
      );

      expect(prompt).toContain("Context: professional");
      expect(prompt).toContain("Relationship: coworker");
    });
  });

  describe("Academic", () => {
    it("generates prompt for academic context", async () => {
      const state = createDefaultState({
        context: {
          type: "academic",
          platform: undefined,
          situation: "request_for_help",
          urgency: "normal",
        },
        relationship: "classmate",
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [empathetic] I understand your concern.",
        { ...defaultContext, conversationType: "academic" },
        state
      );

      expect(prompt).toContain("Context: academic");
      expect(prompt).toContain("Relationship: classmate");
    });
  });

  describe("Interview", () => {
    it("generates prompt for interview context", async () => {
      const state = createDefaultState({
        context: {
          type: "interview",
          platform: undefined,
          situation: "request",
          urgency: "normal",
        },
        relationship: "interviewer",
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [professional] I understand.",
        { ...defaultContext, conversationType: "interview" },
        state
      );

      expect(prompt).toContain("Context: interview");
      expect(prompt).toContain("Relationship: interviewer");
    });
  });

  describe("Friendship", () => {
    it("generates prompt for friendship context", async () => {
      const state = createDefaultState({
        context: {
          type: "friendship",
          platform: undefined,
          situation: "casual_chat",
          urgency: "normal",
        },
        relationship: "friend",
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That's cool!",
        { ...defaultContext, conversationType: "friendship" },
        state
      );

      expect(prompt).toContain("Context: friendship");
      expect(prompt).toContain("Relationship: friend");
    });
  });

  describe("Dating", () => {
    it("generates prompt for dating context", async () => {
      const state = createDefaultState({
        context: {
          type: "dating",
          platform: undefined,
          situation: "romantic_interest",
          urgency: "normal",
        },
        relationship: "date",
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [flirty] That's interesting!",
        { ...defaultContext, conversationType: "dating" },
        state
      );

      expect(prompt).toContain("Context: dating");
      expect(prompt).toContain("Relationship: date");
    });
  });

  describe("Conflict", () => {
    it("generates prompt for conflict context", async () => {
      const state = createDefaultState({
        context: {
          type: "conflict",
          platform: undefined,
          situation: "disagreement",
          urgency: "high",
        },
        conflict: {
          level: 0.8,
          escalation: 0.6,
          trigger: "approach",
          coreDisagreement: "methodology",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [de_escalate] Let's focus on the issue.",
        { ...defaultContext, conversationType: "conflict" },
        state
      );

      expect(prompt).toContain("Context: conflict");
      expect(prompt).toContain("Conflict Level: 0.8");
      expect(prompt).toContain("Conflict Escalation: 0.6");
    });
  });

  describe("Negotiation", () => {
    it("generates prompt for negotiation context", async () => {
      const state = createDefaultState({
        context: {
          type: "negotiation",
          platform: undefined,
          situation: "negotiation",
          urgency: "normal",
        },
        relationship: "stranger",
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [persuasive] Let's find a solution.",
        { ...defaultContext, conversationType: "negotiation" },
        state
      );

      expect(prompt).toContain("Context: negotiation");
      expect(prompt).toContain("Relationship: stranger");
    });
  });

  describe("Customer service", () => {
    it("generates prompt for customer context", async () => {
      const state = createDefaultState({
        context: {
          type: "customer",
          platform: undefined,
          situation: "customer_complaint",
          urgency: "high",
        },
        relationship: "customer",
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [empathetic] I understand your frustration.",
        { ...defaultContext, conversationType: "customer" },
        state
      );

      expect(prompt).toContain("Context: customer");
      expect(prompt).toContain("Relationship: customer");
    });
  });
});

describe("Language Tests", () => {
  describe("English", () => {
    it("generates prompt for English", async () => {
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That's cool!",
        defaultContext,
        state
      );

      expect(prompt).toContain("Primary language: english");
      expect(prompt).toContain("Code-mixed: false");
    });
  });

  describe("Romanized Telugu", () => {
    it("generates prompt for Romanized Telugu", async () => {
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That's cool!",
        { ...defaultContext, language: "telugu", outputLanguage: "romanized" },
        state
      );

      expect(prompt).toContain("Primary language: telugu");
      expect(prompt).toContain("Romanized: true");
      expect(prompt).toContain("Output preference: romanized");
    });
  });

  describe("Telugu-English code-mixed", () => {
    it("generates prompt for Telugu-English code-mixed", async () => {
      const state = createDefaultState({
        language: {
          primary: "telugu",
          secondary: ["english"],
          script: "mixed",
          codeMixed: true,
          romanized: true,
          codeMixRatio: [
            { language: "telugu", ratio: 0.6 },
            { language: "english", ratio: 0.4 },
          ],
          outputPreference: "code_mixed",
          confidence: 0.8,
          scriptConfidence: 0.85,
          detectionSource: "ai",
          participantLanguages: [],
        },
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That's cool!",
        { ...defaultContext, language: "telugu", outputLanguage: "code_mixed" },
        state
      );

      expect(prompt).toContain("Primary language: telugu");
      expect(prompt).toContain("Secondary languages: english");
      expect(prompt).toContain("Code-mixed: true");
      expect(prompt).toContain("Output preference: code_mixed");
      expect(prompt).toContain("telugu: 60%");
    });
  });

  describe("Romanized Hindi", () => {
    it("generates prompt for Romanized Hindi", async () => {
      const state = createDefaultState({
        language: {
          primary: "hindi",
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That's cool!",
        { ...defaultContext, language: "hindi", outputLanguage: "romanized" },
        state
      );

      expect(prompt).toContain("Primary language: hindi");
      expect(prompt).toContain("Romanized: true");
    });
  });

  describe("Hindi-English code-mixed", () => {
    it("generates prompt for Hindi-English code-mixed", async () => {
      const state = createDefaultState({
        language: {
          primary: "hindi",
          secondary: ["english"],
          script: "mixed",
          codeMixed: true,
          romanized: true,
          codeMixRatio: [
            { language: "hindi", ratio: 0.5 },
            { language: "english", ratio: 0.5 },
          ],
          outputPreference: "code_mixed",
          confidence: 0.8,
          scriptConfidence: 0.85,
          detectionSource: "ai",
          participantLanguages: [],
        },
      });
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That's cool!",
        { ...defaultContext, language: "hindi", outputLanguage: "code_mixed" },
        state
      );

      expect(prompt).toContain("Primary language: hindi");
      expect(prompt).toContain("Code-mixed: true");
      expect(prompt).toContain("hindi: 50%");
    });
  });

  describe("Native script", () => {
    it("generates prompt for native script", async () => {
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
      const prompt = assembleContextAwareHumanizationPrompt(
        "1. [natural] That's cool!",
        { ...defaultContext, language: "hindi", outputLanguage: "native_script" },
        state
      );

      expect(prompt).toContain("Primary language: hindi");
      expect(prompt).toContain("Script: devanagari");
      expect(prompt).toContain("Output preference: native_script");
    });
  });
});

describe("Strategy Tests", () => {
  const testCandidates = [
    { text: "I apologize for the delay.", strategy: "accountable" },
    { text: "Let me address this professionally.", strategy: "professional" },
  ];

  describe("Accountable", () => {
    it("preserves accountable strategy", async () => {
      const state = createDefaultState({
        strategy: {
          primary: "accountable",
          ranked: [{ strategy: "accountable", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
      });
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "Sorry about that. I'll fix it.", strategy: "accountable" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, testCandidates, defaultContext, state);

      expect(result.humanized[0].strategy).toBe("accountable");
    });
  });

  describe("Professional", () => {
    it("preserves professional strategy", async () => {
      const state = createDefaultState({
        strategy: {
          primary: "professional",
          ranked: [{ strategy: "professional", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
      });
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "Thank you for your patience.", strategy: "professional" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, testCandidates, defaultContext, state);

      expect(result.humanized[0].strategy).toBe("professional");
    });
  });

  describe("De-escalate", () => {
    it("preserves de-escalate strategy", async () => {
      const state = createDefaultState({
        strategy: {
          primary: "de_escalate",
          ranked: [{ strategy: "de_escalate", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
        conflict: {
          level: 0.7,
          escalation: 0.5,
          trigger: "disagreement",
          coreDisagreement: "approach",
          personalAttacks: false,
          misunderstanding: false,
          resolutionOpportunity: true,
        },
      });
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "I understand. Let's find a solution.", strategy: "de_escalate" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, testCandidates, defaultContext, state);

      expect(result.humanized[0].strategy).toBe("de_escalate");
    });
  });

  describe("Flirty", () => {
    it("preserves flirty strategy", async () => {
      const state = createDefaultState({
        strategy: {
          primary: "flirty",
          ranked: [{ strategy: "flirty", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
        context: {
          type: "dating",
          platform: undefined,
          situation: "romantic_interest",
          urgency: "normal",
        },
      });
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "okay now I'm curious 👀", strategy: "flirty" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, testCandidates, defaultContext, state);

      expect(result.humanized[0].strategy).toBe("flirty");
    });
  });

  describe("Playful", () => {
    it("preserves playful strategy", async () => {
      const state = createDefaultState({
        strategy: {
          primary: "playful",
          ranked: [{ strategy: "playful", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
      });
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "haha wait what 😂", strategy: "playful" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, testCandidates, defaultContext, state);

      expect(result.humanized[0].strategy).toBe("playful");
    });
  });

  describe("Concise", () => {
    it("preserves concise strategy", async () => {
      const state = createDefaultState({
        strategy: {
          primary: "concise",
          ranked: [{ strategy: "concise", priority: 1, confidence: 0.9, reason: "test" }],
          confidence: 0.9,
        },
      });
      const mockResponse = JSON.stringify({
        humanized: [
          { text: "Got it. I'll handle it.", strategy: "concise" },
        ],
      });
      const provider = createMockProvider(mockResponse);
      const result = await humanizeReplies(provider, testCandidates, defaultContext, state);

      expect(result.humanized[0].strategy).toBe("concise");
    });
  });
});

describe("Safety / Preservation Tests", () => {
  it("preserves facts in humanized output", async () => {
    const state = createDefaultState();
    const candidates = [
      { text: "I missed the deadline because I underestimated the testing time.", strategy: "accountable" },
    ];
    const mockResponse = JSON.stringify({
      humanized: [
        { text: "Sorry, I underestimated the testing time. I'll have it done by 6 PM.", strategy: "accountable" },
      ],
    });
    const provider = createMockProvider(mockResponse);
    const result = await humanizeReplies(provider, candidates, defaultContext, state);

    expect(result.humanized[0].text).toContain("testing time");
    expect(result.humanized[0].strategy).toBe("accountable");
  });

  it("preserves user intent", async () => {
    const state = createDefaultState();
    const candidates = [
      { text: "Please reschedule the interview.", strategy: "professional" },
    ];
    const mockResponse = JSON.stringify({
      humanized: [
        { text: "Could we reschedule the interview?", strategy: "professional" },
      ],
    });
    const provider = createMockProvider(mockResponse);
    const result = await humanizeReplies(provider, candidates, defaultContext, state);

    expect(result.humanized[0].text).toContain("reschedule");
    expect(result.humanized[0].strategy).toBe("professional");
  });

  it("preserves strategy in high-conflict scenario", async () => {
    const state = createDefaultState({
      conflict: {
        level: 0.9,
        escalation: 0.8,
        trigger: "disagreement",
        coreDisagreement: "approach",
        personalAttacks: false,
        misunderstanding: false,
        resolutionOpportunity: true,
      },
    });
    const candidates = [
      { text: "I don't think blaming each other is helping. Let's focus on what actually happened.", strategy: "de_escalate" },
    ];
    const mockResponse = JSON.stringify({
      humanized: [
        { text: "I don't think blaming each other helps tbh. let's just focus on what happened", strategy: "de_escalate" },
      ],
    });
    const provider = createMockProvider(mockResponse);
    const result = await humanizeReplies(provider, candidates, defaultContext, state);

    expect(result.humanized[0].strategy).toBe("de_escalate");
    expect(result.humanized[0].text).toContain("blaming");
  });

  it("does not fabricate excuses", async () => {
    const state = createDefaultState();
    const candidates = [
      { text: "I missed the deadline.", strategy: "accountable" },
    ];
    const mockResponse = JSON.stringify({
      humanized: [
        { text: "I missed the deadline. That's on me.", strategy: "accountable" },
      ],
    });
    const provider = createMockProvider(mockResponse);
    const result = await humanizeReplies(provider, candidates, defaultContext, state);

    expect(result.humanized[0].text).not.toContain("laptop");
    expect(result.humanized[0].text).not.toContain("illness");
    expect(result.humanized[0].text).not.toContain("emergency");
  });
});

describe("AI Likeness Scoring", () => {
  it("penalizes AI-like patterns", () => {
    expect(scoreAILikeness("That sounds amazing!")).toBeGreaterThan(0);
    expect(scoreAILikeness("I'd love to hear more about that.")).toBeGreaterThan(0);
    expect(scoreAILikeness("What inspired you to pursue that?")).toBeGreaterThan(0);
  });

  it("does not penalize natural messages", () => {
    expect(scoreAILikeness("haha yeah that's cool")).toBe(0);
    expect(scoreAILikeness("nah i get that")).toBe(0);
    expect(scoreAILikeness("wait what?")).toBe(0);
  });

  it("penalizes long messages", () => {
    const longMessage = "a".repeat(200);
    expect(scoreAILikeness(longMessage)).toBeGreaterThan(0);
  });

  it("penalizes excessive exclamation marks", () => {
    expect(scoreAILikeness("That's great!!")).toBeGreaterThan(0);
    expect(scoreAILikeness("Amazing!!!")).toBeGreaterThan(0);
  });
});
