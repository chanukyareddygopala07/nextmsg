import { describe, it, expect } from "vitest";
import {
  ReplyGenerationSchema,
  ConversationAnalysisSchema,
  HumanizationSchema,
  ScreenshotExtractionSchema,
} from "@/lib/ai/schemas";

describe("ReplyGenerationSchema", () => {
  it("accepts valid reply generation output", () => {
    const valid = {
      candidates: [
        { text: "haha yeah for real", strategy: "natural" },
        { text: "wait no way 😂", strategy: "playful" },
      ],
    };
    const result = ReplyGenerationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(2);
    }
  });

  it("rejects empty candidates array", () => {
    const invalid = { candidates: [] };
    const result = ReplyGenerationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 candidates", () => {
    const invalid = {
      candidates: Array.from({ length: 7 }, (_, i) => ({
        text: `reply ${i}`,
        strategy: "natural",
      })),
    };
    const result = ReplyGenerationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects candidate with empty text", () => {
    const invalid = {
      candidates: [{ text: "", strategy: "natural" }],
    };
    const result = ReplyGenerationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects candidate with empty strategy", () => {
    const invalid = {
      candidates: [{ text: "hello", strategy: "" }],
    };
    const result = ReplyGenerationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts exactly 1 candidate", () => {
    const valid = {
      candidates: [{ text: "hey", strategy: "natural" }],
    };
    const result = ReplyGenerationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts exactly 6 candidates", () => {
    const valid = {
      candidates: Array.from({ length: 6 }, (_, i) => ({
        text: `reply ${i}`,
        strategy: `strategy ${i}`,
      })),
    };
    const result = ReplyGenerationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe("ConversationAnalysisSchema", () => {
  it("accepts valid conversation analysis", () => {
    const valid = {
      stage: "flirting",
      engagement: 0.8,
      flirting: 0.6,
      humor: 0.4,
      reciprocity: 0.7,
      conversationHealth: 0.9,
    };
    const result = ConversationAnalysisSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe("flirting");
      expect(result.data.engagement).toBe(0.8);
    }
  });

  it("rejects invalid stage", () => {
    const invalid = {
      stage: "invalid_stage",
      engagement: 0.5,
      flirting: 0.3,
      humor: 0.4,
      reciprocity: 0.5,
      conversationHealth: 0.5,
    };
    const result = ConversationAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts all valid stages", () => {
    const stages = [
      "opening",
      "getting_to_know_each_other",
      "rapport",
      "playful",
      "flirting",
      "deep_conversation",
      "planning",
      "reconnecting",
      "dry_conversation",
      "awkward_conversation",
      "closing",
    ];
    for (const stage of stages) {
      const valid = {
        stage,
        engagement: 0.5,
        flirting: 0.3,
        humor: 0.4,
        reciprocity: 0.5,
        conversationHealth: 0.5,
      };
      const result = ConversationAnalysisSchema.safeParse(valid);
      expect(result.success).toBe(true);
    }
  });

  it("rejects engagement > 1", () => {
    const invalid = {
      stage: "opening",
      engagement: 1.5,
      flirting: 0.3,
      humor: 0.4,
      reciprocity: 0.5,
      conversationHealth: 0.5,
    };
    const result = ConversationAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects engagement < 0", () => {
    const invalid = {
      stage: "opening",
      engagement: -0.1,
      flirting: 0.3,
      humor: 0.4,
      reciprocity: 0.5,
      conversationHealth: 0.5,
    };
    const result = ConversationAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts boundary values (0 and 1)", () => {
    const valid = {
      stage: "opening",
      engagement: 0,
      flirting: 1,
      humor: 0,
      reciprocity: 1,
      conversationHealth: 0,
    };
    const result = ConversationAnalysisSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const invalid = {
      stage: "opening",
      engagement: 0.5,
    };
    const result = ConversationAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("HumanizationSchema", () => {
  it("accepts valid humanization output", () => {
    const valid = {
      humanized: [
        { text: "haha yeah for real", strategy: "natural" },
        { text: "wait no way 😂", strategy: "playful" },
      ],
    };
    const result = HumanizationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.humanized).toHaveLength(2);
    }
  });

  it("rejects empty humanized array", () => {
    const invalid = { humanized: [] };
    const result = HumanizationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects humanized item with empty text", () => {
    const invalid = {
      humanized: [{ text: "", strategy: "natural" }],
    };
    const result = HumanizationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects humanized item with empty strategy", () => {
    const invalid = {
      humanized: [{ text: "hello", strategy: "" }],
    };
    const result = HumanizationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts single humanized item", () => {
    const valid = {
      humanized: [{ text: "hey", strategy: "natural" }],
    };
    const result = HumanizationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe("ScreenshotExtractionSchema", () => {
  it("accepts valid screenshot extraction", () => {
    const valid = {
      platform: "instagram",
      messages: [
        { sender: "them", text: "hey" },
        { sender: "me", text: "hey 😂" },
      ],
      confidence: 0.95,
    };
    const result = ScreenshotExtractionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.platform).toBe("instagram");
    }
  });

  it("accepts null platform", () => {
    const valid = {
      platform: null,
      messages: [{ sender: "me", text: "test" }],
    };
    const result = ScreenshotExtractionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts missing platform", () => {
    const valid = {
      messages: [{ sender: "me", text: "test" }],
    };
    const result = ScreenshotExtractionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts missing confidence", () => {
    const valid = {
      messages: [{ sender: "me", text: "test" }],
    };
    const result = ScreenshotExtractionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid sender", () => {
    const invalid = {
      messages: [{ sender: "bot", text: "hello" }],
    };
    const result = ScreenshotExtractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts all valid senders", () => {
    const senders = ["me", "them", "unknown"] as const;
    for (const sender of senders) {
      const valid = {
        messages: [{ sender, text: "test" }],
      };
      const result = ScreenshotExtractionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty messages array", () => {
    const invalid = { messages: [] };
    const result = ScreenshotExtractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const invalid = {
      messages: [{ sender: "me", text: "test" }],
      confidence: 1.5,
    };
    const result = ScreenshotExtractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects confidence < 0", () => {
    const invalid = {
      messages: [{ sender: "me", text: "test" }],
      confidence: -0.1,
    };
    const result = ScreenshotExtractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
