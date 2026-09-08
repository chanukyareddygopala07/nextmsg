import type { AIProvider, AIMessage, AIVisionMessage, StructuredOutputConfig } from "./provider";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FALLBACK_VISION_MODELS = [
  "minimax/minimax-m3:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
];

const FALLBACK_TEXT_MODELS = [
  "minimax/minimax-m3:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
];

const REQUEST_TIMEOUT_MS = 90_000;

export type ExtractionErrorCategory =
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

export class ProviderError extends Error {
  constructor(
    public category: ExtractionErrorCategory,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private visionModel: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";
    this.model = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";
    this.visionModel = process.env.OPENROUTER_VISION_MODEL || FALLBACK_VISION_MODELS[0];
    if (!this.apiKey) {
      throw new ProviderError("PROVIDER_AUTH_ERROR", "OPENROUTER_API_KEY is required");
    }
  }

  private classifyError(status: number, body: string): ExtractionErrorCategory {
    if (status === 401 || status === 403) return "PROVIDER_AUTH_ERROR";
    if (status === 429) return "PROVIDER_RATE_LIMIT";
    if (status === 408) return "PROVIDER_TIMEOUT";
    if (status === 404) return "MODEL_NOT_FOUND";
    if (status === 400) {
      if (body.includes("image") || body.includes("vision") || body.includes("multimodal")) {
        return "MODEL_UNSUPPORTED_IMAGE";
      }
      return "PROVIDER_BAD_REQUEST";
    }
    return "PROVIDER_UNKNOWN_ERROR";
  }

  private async singleRequest(
    modelId: string,
    body: Record<string, unknown>,
    timeoutMs: number = REQUEST_TIMEOUT_MS
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Provider request:", {
        model: modelId,
        hasMessages: Array.isArray(body.messages),
        messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
        timeoutMs,
      });
    }

    try {
      const res = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nextmsg.app",
          "X-Title": "NEXTMSG",
        },
        body: JSON.stringify({ ...body, model: modelId }),
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;

      if (process.env.NEXTMSG_DEBUG_AI === "true") {
        console.log("[NEXTMSG AI DEBUG] Provider response:", {
          status: res.status,
          elapsedMs: elapsed,
        });
      }

      if (!res.ok) {
        const errorText = await res.text();
        const category = this.classifyError(res.status, errorText);
        if (process.env.NEXTMSG_DEBUG_AI === "true") {
          console.log("[NEXTMSG AI DEBUG] Provider error:", {
            status: res.status,
            category,
            errorText: errorText.slice(0, 300),
          });
        }
        throw new ProviderError(
          category,
          `OpenRouter API error ${res.status}: ${errorText.slice(0, 200)}`,
          res.status
        );
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content || (typeof content === "string" && content.trim().length === 0)) {
        throw new ProviderError("MODEL_EMPTY_RESPONSE", "Model returned empty response");
      }
      return content;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ProviderError("PROVIDER_TIMEOUT", `Request timed out after ${timeoutMs / 1000}s`);
      }
      throw new ProviderError("PROVIDER_UNKNOWN_ERROR", String(err));
    } finally {
      clearTimeout(timeout);
    }
  }

  async chatVision(
    messages: AIVisionMessage[],
    options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
  ): Promise<string> {
    const models = [this.visionModel, ...FALLBACK_VISION_MODELS.filter((m) => m !== this.visionModel)];
    const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

    let lastError: ProviderError | undefined;

    for (const modelId of models) {
      try {
        const content = await this.singleRequest(
          modelId,
          {
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 2048,
          },
          timeoutMs
        );
        return content;
      } catch (err) {
        if (err instanceof ProviderError) {
          lastError = err;
          if (
            err.category === "PROVIDER_AUTH_ERROR" ||
            err.category === "MODEL_NOT_FOUND" ||
            err.category === "MODEL_UNSUPPORTED_IMAGE"
          ) {
            throw err;
          }
          if (process.env.NEXTMSG_DEBUG_AI === "true") {
            console.log("[NEXTMSG AI DEBUG] Model failed, trying next:", {
              model: modelId,
              category: err.category,
            });
          }
          continue;
        }
        throw err;
      }
    }

    throw lastError || new ProviderError("PROVIDER_UNKNOWN_ERROR", "All vision models failed");
  }

  async chat(
    messages: AIMessage[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const models = [this.model, ...FALLBACK_TEXT_MODELS.filter((m) => m !== this.model)];
    let lastError: ProviderError | undefined;

    for (const modelId of models) {
      try {
        return await this.singleRequest(modelId, {
          messages,
          temperature: options.temperature ?? 0.8,
          max_tokens: options.maxTokens ?? 1024,
        });
      } catch (err) {
        if (err instanceof ProviderError) {
          lastError = err;
          if (
            err.category === "PROVIDER_AUTH_ERROR" ||
            err.category === "MODEL_NOT_FOUND"
          ) {
            throw err;
          }
          if (process.env.NEXTMSG_DEBUG_AI === "true") {
            console.log("[NEXTMSG AI DEBUG] Text model failed, trying next:", {
              model: modelId,
              category: err.category,
            });
          }
          continue;
        }
        throw err;
      }
    }

    throw lastError || new ProviderError("PROVIDER_UNKNOWN_ERROR", "All text models failed");
  }

  async chatStructured(
    messages: AIMessage[],
    structuredOutput: StructuredOutputConfig,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    return this.singleRequest(this.model, {
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
    });
  }
}
