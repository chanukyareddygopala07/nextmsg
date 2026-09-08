import type { AIProvider } from "./provider";
import { XAIProviderError, type XAIErrorCategory } from "./xai";
import {
  ScreenshotExtractionSchema,
  type ScreenshotExtraction,
} from "./schemas";

const SCREENSHOT_EXTRACTION_OUTPUT_CONFIG = {
  name: "screenshot_extraction",
  schema: {
    type: "object",
    properties: {
      platform: {
        anyOf: [
          { type: "string" },
          { type: "null" },
        ],
      },
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sender: {
              type: "string",
              enum: ["me", "them", "unknown"],
            },
            text: { type: "string" },
          },
          required: ["sender", "text"],
          additionalProperties: false,
        },
      },
      confidence: { type: "number" },
    },
    required: ["messages"],
    additionalProperties: false,
  },
};

export interface ExtractionResponse extends ScreenshotExtraction {
  error?: string;
  errorCategory?: XAIErrorCategory;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a conversation screenshot analyzer. Your ONLY job is to extract visible messages from this chat screenshot.

Inspect the image carefully. Identify chat bubbles and their positions.

Rules:
- Left-aligned bubbles = "them". Right-aligned bubbles = "me".
- If sender cannot be determined, use "unknown". Do NOT guess.
- Preserve the EXACT text including emojis, slang, abbreviations, typos.
- Order messages chronologically from top to bottom (oldest first).
- Do NOT invent, add, or summarize messages not visible in the screenshot.
- Do NOT include system messages, timestamps, read receipts, typing indicators, or UI chrome.
- Do NOT include profile photos, navigation bars, status bars, or app headers.
- Read the image as-is. If text is partially obscured, include what is readable.
- If the image is not a chat screenshot, return an empty messages array with confidence 0.0.
- If the image is blurry or unclear, still extract what you can and set confidence < 0.5`;

const EXTRACTION_USER_PROMPT = "Extract every visible message from this conversation screenshot.";

export async function extractFromScreenshot(
  provider: AIProvider,
  imageBase64: string,
  mimeType: string
): Promise<ExtractionResponse> {
  const totalStart = Date.now();
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  if (process.env.NEXTMSG_DEBUG_AI === "true") {
    console.log("[NEXTMSG AI DEBUG] Screenshot extraction started:", {
      mime: mimeType,
      base64Length: imageBase64.length,
      sizeKB: Math.round((imageBase64.length * 3) / 4 / 1024),
    });
  }

  let rawResponse: string;
  try {
    const aiStart = Date.now();
    rawResponse = await provider.chatStructured(
      [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
            {
              type: "text",
              text: EXTRACTION_USER_PROMPT,
            },
          ],
        },
      ],
      SCREENSHOT_EXTRACTION_OUTPUT_CONFIG,
      { temperature: 0.1, maxTokens: 2048 }
    );
    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] AI response received:", {
        elapsedMs: Date.now() - aiStart,
        responseLength: rawResponse.length,
      });
    }
  } catch (err) {
    const elapsed = Date.now() - totalStart;
    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] AI request failed:", {
        elapsedMs: elapsed,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (err instanceof XAIProviderError) {
      const userMessage = getProviderUserMessage(err.category);
      return { messages: [], confidence: 0, error: userMessage, errorCategory: err.category };
    }
    return {
      messages: [],
      confidence: 0,
      error: "The AI service is temporarily unavailable. Please try again.",
      errorCategory: "PROVIDER_UNKNOWN_ERROR",
    };
  }

  const parseStart = Date.now();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    return {
      messages: [],
      confidence: 0,
      error: "We couldn't read this screenshot clearly. Try a clearer screenshot or crop the chat area.",
      errorCategory: "MODEL_INVALID_JSON",
    };
  }

  const result = ScreenshotExtractionSchema.safeParse(parsed);
  if (!result.success) {
    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Screenshot extraction schema validation failed:", {
        errors: result.error.issues,
      });
    }

    const rawMessages = (parsed && typeof parsed === "object" && "messages" in parsed)
      ? (parsed as Record<string, unknown>).messages
      : [];
    const normalized = normalizeMessages(rawMessages);
    if (normalized.length > 0) {
      return { platform: undefined, messages: normalized, confidence: 0.4 };
    }
    return {
      messages: [],
      confidence: 0,
      error: "We couldn't read this screenshot clearly. Try a clearer screenshot or crop the chat area.",
      errorCategory: "SCHEMA_VALIDATION_ERROR",
    };
  }

  const messages = result.data.messages.filter((m) => m.text.length > 0);
  const confidence = result.data.confidence ?? (messages.length > 0 ? 0.7 : 0.0);

  if (process.env.NEXTMSG_DEBUG_AI === "true") {
    console.log("[NEXTMSG AI DEBUG] Extraction complete:", {
      totalMs: Date.now() - totalStart,
      parseMs: Date.now() - parseStart,
      messageCount: messages.length,
      confidence,
      platform: result.data.platform,
    });
  }

  return {
    platform: result.data.platform ?? undefined,
    messages,
    confidence,
  };
}

function normalizeMessages(raw: unknown): { sender: "me" | "them" | "unknown"; text: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is { sender: string; text: unknown } =>
      typeof m === "object" && m !== null && "sender" in m && "text" in m
    )
    .map((m) => ({
      sender: (["me", "them", "unknown"].includes(m.sender) ? m.sender : "unknown") as "me" | "them" | "unknown",
      text: String(m.text).trim(),
    }))
    .filter((m) => m.text.length > 0);
}

export function getProviderUserMessage(category: XAIErrorCategory): string {
  switch (category) {
    case "PROVIDER_AUTH_ERROR":
      return "The AI service is not configured correctly. Please check your settings.";
    case "PROVIDER_RATE_LIMIT":
      return "You've reached the AI usage limit. Please try again in a minute.";
    case "PROVIDER_TIMEOUT":
      return "The AI model is taking too long to respond. Try again or paste the chat instead.";
    case "MODEL_NOT_FOUND":
      return "The AI model is not available. Please try again later.";
    case "MODEL_UNSUPPORTED_IMAGE":
      return "This image format is not supported. Try a PNG or JPG screenshot.";
    case "MODEL_EMPTY_RESPONSE":
      return "We couldn't read this screenshot clearly. Try a clearer screenshot or crop the chat area.";
    case "PROVIDER_BAD_REQUEST":
      return "The image could not be processed. Try a smaller or different image.";
    default:
      return "The AI service is temporarily unavailable. Please try again.";
  }
}
