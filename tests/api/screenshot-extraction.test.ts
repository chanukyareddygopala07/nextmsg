import { describe, it, expect, vi } from "vitest";
import { extractFromScreenshot } from "@/lib/ai/screenshot";
import type { AIProvider } from "@/lib/ai/provider";

function createMockProvider(responseContent: string): AIProvider {
  return {
    chat: vi.fn().mockResolvedValue(responseContent),
    chatVision: vi.fn().mockResolvedValue(responseContent),
    chatStructured: vi.fn().mockResolvedValue(responseContent),
  };
}

describe("extractFromScreenshot", () => {
  it("extracts messages from valid JSON response", async () => {
    const mockResponse = JSON.stringify({
      platform: "instagram",
      messages: [
        { sender: "them", text: "hey" },
        { sender: "me", text: "hey 😂" },
        { sender: "them", text: "what are you doing?" },
      ],
      confidence: 0.95,
    });

    const provider = createMockProvider(mockResponse);
    const result = await extractFromScreenshot(provider, "dGVzdA==", "image/png");

    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]).toEqual({ sender: "them", text: "hey" });
    expect(result.messages[1]).toEqual({ sender: "me", text: "hey 😂" });
    expect(result.messages[2]).toEqual({ sender: "them", text: "what are you doing?" });
    expect(result.platform).toBe("instagram");
    expect(result.confidence).toBe(0.95);
  });

  it("returns error for invalid JSON", async () => {
    const provider = createMockProvider("This is not JSON at all");
    const result = await extractFromScreenshot(provider, "dGVzdA==", "image/png");

    expect(result.messages).toHaveLength(0);
    expect(result.error).toBeDefined();
    expect(result.errorCategory).toBe("MODEL_INVALID_JSON");
  });

  it("filters out empty messages", async () => {
    const mockResponse = JSON.stringify({
      messages: [
        { sender: "me", text: "hello" },
        { sender: "them", text: "" },
        { sender: "me", text: "  " },
        { sender: "them", text: "world" },
      ],
    });

    const provider = createMockProvider(mockResponse);
    const result = await extractFromScreenshot(provider, "dGVzdA==", "image/png");

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toBe("hello");
    expect(result.messages[1].text).toBe("world");
  });

  it("normalizes invalid sender to unknown", async () => {
    const mockResponse = JSON.stringify({
      messages: [
        { sender: "bot", text: "hello" },
        { sender: "me", text: "hi" },
      ],
    });

    const provider = createMockProvider(mockResponse);
    const result = await extractFromScreenshot(provider, "dGVzdA==", "image/png");

    expect(result.messages[0].sender).toBe("unknown");
    expect(result.messages[1].sender).toBe("me");
  });

  it("handles provider errors gracefully", async () => {
    const provider = createMockProvider("");
    provider.chatVision = vi.fn().mockRejectedValue(new Error("Network error"));
    provider.chatStructured = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await extractFromScreenshot(provider, "dGVzdA==", "image/png");

    expect(result.messages).toHaveLength(0);
    expect(result.error).toBeDefined();
  });

  it("handles null platform in response", async () => {
    const mockResponse = JSON.stringify({
      platform: null,
      messages: [{ sender: "me", text: "test" }],
    });

    const provider = createMockProvider(mockResponse);
    const result = await extractFromScreenshot(provider, "dGVzdA==", "image/png");

    expect(result.platform).toBeUndefined();
    expect(result.messages).toHaveLength(1);
  });

  it("uses structured output via chatStructured", async () => {
    const mockResponse = JSON.stringify({
      platform: "whatsapp",
      messages: [{ sender: "them", text: "yo" }],
      confidence: 0.8,
    });

    const provider = createMockProvider(mockResponse);
    await extractFromScreenshot(provider, "dGVzdA==", "image/png");

    expect(provider.chatStructured).toHaveBeenCalled();
    expect(provider.chatVision).not.toHaveBeenCalled();
  });
});
