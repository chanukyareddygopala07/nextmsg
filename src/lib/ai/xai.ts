import type { AIMessage, AIVisionMessage, AIProvider, StructuredOutputConfig } from "./provider";
import { withRetry } from "./retry";
import { canRequest, recordSuccess, recordFailure } from "../observability/circuit-breaker";
import { logAIRequest, logAIError } from "../observability/logger";
import { recordMetric } from "../observability/metrics";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 90_000;
const CIRCUIT_NAME = "xai-provider";

export type XAIErrorCategory =
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_BAD_REQUEST"
  | "PROVIDER_TIMEOUT"
  | "MODEL_NOT_FOUND"
  | "MODEL_UNSUPPORTED_IMAGE"
  | "MODEL_EMPTY_RESPONSE"
  | "MODEL_INVALID_JSON"
  | "SCHEMA_VALIDATION_ERROR"
  | "PROVIDER_UNKNOWN_ERROR";

export class XAIProviderError extends Error {
  constructor(
    public category: XAIErrorCategory,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "XAIProviderError";
  }
}

export class XAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private visionModel: string;

  constructor() {
    this.apiKey = process.env.XAI_API_KEY || "";
    this.model = process.env.XAI_MODEL || "grok-4.6";
    this.visionModel =
      process.env.XAI_VISION_MODEL || this.model;

    if (!this.apiKey) {
      throw new XAIProviderError(
        "PROVIDER_AUTH_ERROR",
        "XAI_API_KEY is required"
      );
    }
  }

  private classifyError(
    status: number,
    body: string
  ): XAIErrorCategory {
    if (status === 401 || status === 403) {
      return "PROVIDER_AUTH_ERROR";
    }

    if (status === 429) {
      return "PROVIDER_RATE_LIMIT";
    }

    if (status === 408) {
      return "PROVIDER_TIMEOUT";
    }

    if (status === 404) {
      return "MODEL_NOT_FOUND";
    }

    if (status === 400) {
      if (
        body.toLowerCase().includes("image") ||
        body.toLowerCase().includes("vision") ||
        body.toLowerCase().includes("multimodal")
      ) {
        return "MODEL_UNSUPPORTED_IMAGE";
      }

      return "PROVIDER_BAD_REQUEST";
    }

    return "PROVIDER_UNKNOWN_ERROR";
  }

  private async singleRequest(
    modelId: string,
    body: Record<string, unknown>,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<string> {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    const startTime = Date.now();

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] xAI request:", {
        model: modelId,
        messageCount: Array.isArray(body.messages)
          ? body.messages.length
          : 0,
        structuredOutput: !!body.response_format,
        timeoutMs,
      });
    }

    try {
      const response = await fetch(XAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          model: modelId,
        }),
        signal: controller.signal,
      });

      const elapsedMs = Date.now() - startTime;

      if (process.env.NEXTMSG_DEBUG_AI === "true") {
        console.log("[NEXTMSG AI DEBUG] xAI response:", {
          status: response.status,
          elapsedMs,
          structuredOutput: !!body.response_format,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        const category = this.classifyError(response.status, errorText);

        if (category === "PROVIDER_RATE_LIMIT") {
          const retryAfter = response.headers.get("retry-after");
          const error = new XAIProviderError(
            category,
            `xAI API error ${response.status}: ${errorText.slice(0, 200)}`,
            response.status
          );
          (error as unknown as Record<string, unknown>).retryAfter = retryAfter;
          throw error;
        }

        throw new XAIProviderError(
          category,
          `xAI API error ${response.status}: ${errorText.slice(0, 200)}`,
          response.status
        );
      }

      const data = await response.json();

      const content = data?.choices?.[0]?.message?.content;

      if (
        !content ||
        (typeof content === "string" &&
          content.trim().length === 0)
      ) {
        throw new XAIProviderError(
          "MODEL_EMPTY_RESPONSE",
          "Grok returned an empty response"
        );
      }

      return content;
    } catch (error) {
      if (error instanceof XAIProviderError) {
        throw error;
      }

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new XAIProviderError(
          "PROVIDER_TIMEOUT",
          `Request timed out after ${timeoutMs / 1000}s`
        );
      }

      throw new XAIProviderError(
        "PROVIDER_UNKNOWN_ERROR",
        error instanceof Error
          ? error.message
          : String(error)
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestWithRetry(
    modelId: string,
    body: Record<string, unknown>,
    timeoutMs = REQUEST_TIMEOUT_MS,
    operation: string = "unknown"
  ): Promise<string> {
    if (!canRequest(CIRCUIT_NAME)) {
      throw new XAIProviderError(
        "PROVIDER_UNKNOWN_ERROR",
        "Provider circuit is open — too many recent failures"
      );
    }

    const startTime = Date.now();
    try {
      const result = await withRetry(
        () => this.singleRequest(modelId, body, timeoutMs),
        {
          maxRetries: 2,
          baseDelayMs: 1000,
          maxDelayMs: 30_000,
          backoffMultiplier: 2,
        },
        CIRCUIT_NAME
      );

      const durationMs = Date.now() - startTime;
      recordSuccess(CIRCUIT_NAME);
      logAIRequest({ operation, model: modelId, durationMs, success: true });
      recordMetric({ operation, durationMs, success: true, category: "ai" });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      recordFailure(CIRCUIT_NAME);
      const errorCode = error instanceof XAIProviderError ? error.category : "UNKNOWN";
      logAIError({ operation, errorCode, durationMs });
      recordMetric({ operation, durationMs, success: false, category: "ai" });
      throw error;
    }
  }

  async chat(
    messages: AIMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    return this.requestWithRetry(this.model, {
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 1024,
    }, REQUEST_TIMEOUT_MS, "chat");
  }

  async chatVision(
    messages: AIVisionMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    return this.requestWithRetry(this.visionModel, {
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
    }, REQUEST_TIMEOUT_MS, "chat_vision");
  }

  async chatStructured(
    messages: AIMessage[],
    structuredOutput: StructuredOutputConfig,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    return this.requestWithRetry(this.model, {
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: structuredOutput.name,
          strict: true,
          schema: structuredOutput.schema,
        },
      },
    }, REQUEST_TIMEOUT_MS, "chat_structured");
  }
}
