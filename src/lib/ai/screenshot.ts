import { z } from "zod";
import type { AIProvider } from "./provider";
import { ProviderError, type ExtractionErrorCategory } from "./openrouter";

const ExtractionMessageSchema = z.object({
  sender: z.enum(["me", "them", "unknown"]),
  text: z.string().min(1),
});

const ExtractionResultSchema = z.object({
  platform: z.string().nullable().optional(),
  messages: z.array(ExtractionMessageSchema),
  confidence: z.number().min(0).max(1).optional(),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export interface ExtractionResponse extends ExtractionResult {
  error?: string;
  errorCategory?: ExtractionErrorCategory;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a conversation screenshot analyzer. Your ONLY job is to extract visible messages from this chat screenshot.

Return ONLY valid JSON — no markdown fences, no explanation, no extra text.

Required JSON structure:
{
  "platform": "instagram" | "whatsapp" | "discord" | "telegram" | "snapchat" | "dating" | "other" | null,
  "messages": [
    {
      "sender": "me" | "them" | "unknown",
      "text": "exact message content"
    }
  ],
  "confidence": 0.0 to 1.0
}

Rules:
- Inspect the image carefully. Identify chat bubbles and their positions.
- Left-aligned bubbles = "them". Right-aligned bubbles = "me".
- If sender cannot be determined, use "unknown". Do NOT guess.
- Preserve the EXACT text including emojis, slang, abbreviations, typos.
- Order messages chronologically from top to bottom (oldest first).
- Do NOT invent, add, or summarize messages not visible in the screenshot.
- Do NOT include system messages, timestamps, read receipts, typing indicators, or UI chrome.
- Do NOT include profile photos, navigation bars, status bars, or app headers.
- Read the image as-is. If text is partially obscured, include what is readable.
- If the image is not a chat screenshot, return {"platform": null, "messages": [], "confidence": 0.0}
- If the image is blurry or unclear, still extract what you can and set confidence < 0.5`;

const EXTRACTION_USER_PROMPT = "Extract every visible message from this conversation screenshot. Return only the JSON object — nothing else.";

function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return s.trim();
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
    rawResponse = await provider.chatVision(
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
    if (err instanceof ProviderError) {
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
  const cleaned = stripMarkdownFences(rawResponse);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      messages: [],
      confidence: 0,
      error: "We couldn't read this screenshot clearly. Try a clearer screenshot or crop the chat area.",
      errorCategory: "MODEL_INVALID_JSON",
    };
  }

  const result = ExtractionResultSchema.safeParse(parsed);
  if (!result.success) {
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

function getProviderUserMessage(category: ExtractionErrorCategory): string {
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
