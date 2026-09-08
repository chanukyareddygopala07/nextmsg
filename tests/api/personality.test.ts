import { describe, it, expect } from "vitest";
import { extractWritingStyle, generateStyleGuidance } from "@/lib/ai/style-extractor";
import type { WritingStyleProfile } from "@/lib/ai/personality";

describe("Style Extractor", () => {
  describe("Emoji Detection", () => {
    it("detects emoji usage", () => {
      const messages = [
        { sender: "me", text: "haha that's funny 😂" },
        { sender: "me", text: "no way 🤣" },
        { sender: "me", text: "yeah for real" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.emoji.usesEmojis).toBe(true);
      expect(profile.emoji.frequency).toBeGreaterThan(0.3);
    });

    it("detects no emojis", () => {
      const messages = [
        { sender: "me", text: "yeah that's cool" },
        { sender: "me", text: "no way" },
        { sender: "me", text: "for real" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.emoji.usesEmojis).toBe(false);
      expect(profile.emoji.frequency).toBe(0);
    });

    it("detects emoji placement at end", () => {
      const messages = [
        { sender: "me", text: "haha 😂" },
        { sender: "me", text: "no way 🤣" },
        { sender: "me", text: "that's crazy 💀" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.emoji.placement).toBe("end");
    });
  });

  describe("Punctuation Detection", () => {
    it("detects expressive punctuation", () => {
      const messages = [
        { sender: "me", text: "no way!!!" },
        { sender: "me", text: "wait seriously???" },
        { sender: "me", text: "that's crazy!!" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.punctuation.style).toBe("expressive");
    });

    it("detects minimal punctuation", () => {
      const messages = [
        { sender: "me", text: "yeah" },
        { sender: "me", text: "nah" },
        { sender: "me", text: "cool" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.punctuation.style).toBe("minimal");
    });

    it("detects question marks", () => {
      const messages = [
        { sender: "me", text: "wait what?" },
        { sender: "me", text: "really?" },
        { sender: "me", text: "how?" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.punctuation.questionRate).toBeGreaterThan(0.3);
    });
  });

  describe("Sentence Structure", () => {
    it("detects short messages", () => {
      const messages = [
        { sender: "me", text: "nah I get that" },
        { sender: "me", text: "for real though yeah" },
        { sender: "me", text: "haha that's funny" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.sentence.lengthCategory).toBe("short");
      expect(profile.sentence.averageWords).toBeLessThanOrEqual(7);
    });

    it("detects medium messages", () => {
      const messages = [
        { sender: "me", text: "haha yeah that's actually really funny though" },
        { sender: "me", text: "no way I can't believe that happened to you today" },
        { sender: "me", text: "wait really tell me more about what happened" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.sentence.lengthCategory).toBe("medium");
    });

    it("detects fragment preference", () => {
      const messages = [
        { sender: "me", text: "big mood" },
        { sender: "me", text: "same honestly" },
        { sender: "me", text: "no but actually" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.sentence.prefersFragments).toBe(true);
    });
  });

  describe("Slang Detection", () => {
    it("detects slang usage", () => {
      const messages = [
        { sender: "me", text: "bruh that's dead 💀" },
        { sender: "me", text: "ngl that's fire" },
        { sender: "me", text: "lmao wait what" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.slang.usesSlang).toBe(true);
      expect(profile.slang.frequency).toBeGreaterThan(0);
    });

    it("detects no slang", () => {
      const messages = [
        { sender: "me", text: "I understand your point" },
        { sender: "me", text: "That makes sense" },
        { sender: "me", text: "Thank you for explaining" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.slang.usesSlang).toBe(false);
    });

    it("detects abbreviations", () => {
      const messages = [
        { sender: "me", text: "lol that's funny" },
        { sender: "me", text: "brb gotta go" },
        { sender: "me", text: "ngl tbh" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.slang.commonAbbreviations).toContain("lol");
      expect(profile.slang.commonAbbreviations).toContain("brb");
    });
  });

  describe("Humor Detection", () => {
    it("detects humor indicators", () => {
      const messages = [
        { sender: "me", text: "lmao wait that's actually hilarious" },
        { sender: "me", text: "i'm dead 💀" },
        { sender: "me", text: "no but actually bruh" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.humor.usesHumor).toBe(true);
      expect(profile.humor.indicators.length).toBeGreaterThan(0);
    });

    it("detects no humor", () => {
      const messages = [
        { sender: "me", text: "I understand your concern" },
        { sender: "me", text: "Let me think about that" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.humor.usesHumor).toBe(false);
    });
  });

  describe("Tone Preference", () => {
    it("detects casual tone", () => {
      const messages = [
        { sender: "me", text: "haha yeah for real" },
        { sender: "me", text: "nah that's wild" },
        { sender: "me", text: "cool cool" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.tonePreference.formality).toMatch(/casual|very_casual/);
    });

    it("detects formal tone", () => {
      const messages = [
        { sender: "me", text: "Thank you for your patience" },
        { sender: "me", text: "I appreciate you bringing this to my attention" },
        { sender: "me", text: "Please let me know if you have any questions" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.tonePreference.formality).toMatch(/formal|very_formal/);
    });

    it("detects warm tone", () => {
      const messages = [
        { sender: "me", text: "I miss you so much" },
        { sender: "me", text: "You're the best thing that happened to me" },
        { sender: "me", text: "Can't wait to see you again ❤️" },
      ];
      const profile = extractWritingStyle(messages);
      expect(profile.tonePreference.warmth).toBeGreaterThan(0.5);
    });
  });

  describe("Confidence", () => {
    it("returns low confidence for few messages", () => {
      const messages = [{ sender: "me", text: "hey" }];
      const profile = extractWritingStyle(messages);
      expect(profile.confidence).toBeLessThanOrEqual(0.5);
    });

    it("returns higher confidence for more messages", () => {
      const messages = Array(15)
        .fill(null)
        .map((_, i) => ({
          sender: "me" as const,
          text: `message ${i} with some words here`,
        }));
      const profile = extractWritingStyle(messages);
      expect(profile.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Empty Messages", () => {
    it("returns default profile for no messages", () => {
      const profile = extractWritingStyle([]);
      expect(profile.confidence).toBe(0.3);
      expect(profile.messageCount).toBe(0);
      expect(profile.emoji.usesEmojis).toBe(false);
      expect(profile.slang.usesSlang).toBe(false);
    });
  });
});

describe("Style Guidance Generator", () => {
  it("generates guidance for short message style", () => {
    const profile: WritingStyleProfile = {
      emoji: {
        usesEmojis: false,
        frequency: 0,
        placement: "none",
        commonEmojis: [],
        categories: [],
      },
      punctuation: {
        style: "minimal",
        exclamationRate: 0,
        questionRate: 0,
        usesEllipses: false,
        endsWithPeriod: false,
        multiPunctuationRate: 0,
      },
      sentence: {
        averageWords: 3,
        averageChars: 15,
        completenessRate: 0.1,
        prefersFragments: true,
        lengthCategory: "short",
      },
      slang: {
        usesSlang: true,
        frequency: 0.4,
        commonSlang: ["nah", "cool", "haha"],
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

    const guidance = generateStyleGuidance(profile);
    expect(guidance.instruction).toContain("short");
    expect(guidance.confidence).toBe(0.8);
  });

  it("generates guidance for emoji-heavy style", () => {
    const profile: WritingStyleProfile = {
      emoji: {
        usesEmojis: true,
        frequency: 0.8,
        placement: "end",
        commonEmojis: ["😂", "🤣", "💀"],
        categories: ["faces"],
      },
      punctuation: {
        style: "standard",
        exclamationRate: 0.2,
        questionRate: 0.1,
        usesEllipses: false,
        endsWithPeriod: false,
        multiPunctuationRate: 0,
      },
      sentence: {
        averageWords: 5,
        averageChars: 25,
        completenessRate: 0.3,
        prefersFragments: true,
        lengthCategory: "short",
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
        dominant: "playful",
        secondary: "friendly",
        formality: "casual",
        warmth: 0.7,
        directness: 0.3,
      },
      confidence: 0.7,
      messageCount: 8,
      languageStyle: "standard_english",
    };

    const guidance = generateStyleGuidance(profile);
    expect(guidance.instruction).toContain("emoji");
  });

  it("generates guidance for formal style", () => {
    const profile: WritingStyleProfile = {
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

    const guidance = generateStyleGuidance(profile);
    expect(guidance.instruction).toContain("formal");
    expect(guidance.avoid).toContain("slang");
  });
});
