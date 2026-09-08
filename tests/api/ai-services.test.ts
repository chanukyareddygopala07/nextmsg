import { describe, it, expect, vi } from "vitest";
import { generateReplies } from "@/lib/ai/generator";
import { analyzeConversation } from "@/lib/ai/conversation";
import { humanizeReplies } from "@/lib/ai/humanizer";
import type { AIProvider } from "@/lib/ai/provider";
import type { ConversationContext } from "@/lib/ai/context";

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

const testMessages = [
  { sender: "them", text: "hey what's up" },
  { sender: "me", text: "not much, you?" },
  { sender: "them", text: "just hanging out" },
];

describe("generateReplies", () => {
  it("returns candidates from structured output", async () => {
    const mockResponse = JSON.stringify({
      candidates: [
        { text: "haha cool", strategy: "natural" },
        { text: "that's fun", strategy: "playful" },
      ],
    });
    const provider = createMockProvider(mockResponse);
    const result = await generateReplies(provider, testMessages, defaultContext);

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].text).toBe("haha cool");
    expect(result.candidates[0].strategy).toBe("natural");
    expect(result.error).toBeUndefined();
    expect(provider.chatStructured).toHaveBeenCalled();
  });

  it("returns default candidates and error on invalid JSON", async () => {
    const provider = createMockProvider("not json at all");
    const result = await generateReplies(provider, testMessages, defaultContext);

    expect(result.candidates).toHaveLength(6);
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBe("reply_generation");
  });

  it("returns default candidates and error on schema validation failure", async () => {
    const mockResponse = JSON.stringify({ candidates: [] });
    const provider = createMockProvider(mockResponse);
    const result = await generateReplies(provider, testMessages, defaultContext);

    expect(result.candidates).toHaveLength(6);
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBe("schema_validation");
  });

  it("returns default candidates and error on provider error", async () => {
    const provider = createMockProvider("");
    provider.chatStructured = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await generateReplies(provider, testMessages, defaultContext);

    expect(result.candidates).toHaveLength(6);
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBe("reply_generation");
  });
});

describe("analyzeConversation", () => {
  it("returns analysis from structured output", async () => {
    const mockResponse = JSON.stringify({
      stage: "flirting",
      engagement: 0.8,
      flirting: 0.6,
      humor: 0.4,
      reciprocity: 0.7,
      conversationHealth: 0.9,
    });
    const provider = createMockProvider(mockResponse);
    const result = await analyzeConversation(provider, testMessages, defaultContext);

    expect(result.analysis.stage).toBe("flirting");
    expect(result.analysis.engagement).toBe(0.8);
    expect(result.analysis.conversationHealth).toBe(0.9);
    expect(result.error).toBeUndefined();
    expect(provider.chatStructured).toHaveBeenCalled();
  });

  it("returns default analysis and error on invalid JSON", async () => {
    const provider = createMockProvider("not json");
    const result = await analyzeConversation(provider, testMessages, defaultContext);

    expect(result.analysis.stage).toBe("getting_to_know_each_other");
    expect(result.analysis.engagement).toBe(0.5);
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBe("conversation_analysis");
  });

  it("returns default analysis and error on schema validation failure", async () => {
    const mockResponse = JSON.stringify({ stage: "invalid_stage" });
    const provider = createMockProvider(mockResponse);
    const result = await analyzeConversation(provider, testMessages, defaultContext);

    expect(result.analysis.stage).toBe("getting_to_know_each_other");
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBe("schema_validation");
  });

  it("returns default analysis and error on provider error", async () => {
    const provider = createMockProvider("");
    provider.chatStructured = vi.fn().mockRejectedValue(new Error("Timeout"));
    const result = await analyzeConversation(provider, testMessages, defaultContext);

    expect(result.analysis.stage).toBe("getting_to_know_each_other");
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBe("conversation_analysis");
  });
});

describe("humanizeReplies", () => {
  const candidates = [
    { text: "That sounds amazing!", strategy: "natural" },
    { text: "I'd love to hear more about that.", strategy: "playful" },
  ];

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
