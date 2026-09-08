import type { AIMessage, AIVisionMessage, AIProvider, StructuredOutputConfig } from "./provider";
import { withRetry } from "./retry";
import { canRequest, recordSuccess, recordFailure } from "../observability/circuit-breaker";
import { logAIRequest, logAIError } from "../observability/logger";
import { recordMetric } from "../observability/metrics";

const OLLAMA_API_CHAT = "/api/chat";
const OLLAMA_API_GENERATE = "/api/generate";
const REQUEST_TIMEOUT_MS = 120_000; // Ollama can be slower
const CIRCUIT_NAME = "ollama-provider";

export type OllamaErrorCategory =
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

export class OllamaProviderError extends Error {
  constructor(
    public category: OllamaErrorCategory,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "OllamaProviderError";
  }
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "qwen3:8b";

    // Remove trailing slash if present
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  private classifyError(
    status: number,
    body: string
  ): OllamaErrorCategory {
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
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    const url = `${this.baseUrl}${endpoint}`;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Ollama request:", {
        url,
        model: body.model,
        messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
        timeoutMs,
      });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const elapsedMs = Date.now() - startTime;

      if (process.env.NEXTMSG_DEBUG_AI === "true") {
        console.log("[NEXTMSG AI DEBUG] Ollama response:", {
          status: response.status,
          elapsedMs,
          url,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        const category = this.classifyError(response.status, errorText);

        if (category === "PROVIDER_RATE_LIMIT") {
          const error = new OllamaProviderError(
            category,
            `Ollama API error ${response.status}: ${errorText.slice(0, 200)}`,
            response.status
          );
          throw error;
        }

        throw new OllamaProviderError(
          category,
          `Ollama API error ${response.status}: ${errorText.slice(0, 200)}`,
          response.status
        );
      }

      const data = await response.json();

      // Ollama's /api/chat returns { message: { content: string, ... }, ... }
      // Ollama's /api/generate returns { response: string, ... }
      const content = data?.message?.content || data?.response;

      if (!content || (typeof content === "string" && content.trim().length === 0)) {
        throw new OllamaProviderError(
          "MODEL_EMPTY_RESPONSE",
          "Ollama returned an empty response"
        );
      }

      return content;
    } catch (error) {
      if (error instanceof OllamaProviderError) {
        throw error;
      }

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new OllamaProviderError(
          "PROVIDER_TIMEOUT",
          `Request timed out after ${timeoutMs / 1000}s`
        );
      }

      // Handle connection errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OllamaProviderError(
          "PROVIDER_UNKNOWN_ERROR",
          `Cannot connect to Ollama at ${url}. Make sure Ollama is running.`
        );
      }

      throw new OllamaProviderError(
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
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs = REQUEST_TIMEOUT_MS,
    operation: string = "unknown"
  ): Promise<string> {
    if (!canRequest(CIRCUIT_NAME)) {
      throw new OllamaProviderError(
        "PROVIDER_UNKNOWN_ERROR",
        "Provider circuit is open — too many recent failures"
      );
    }

    const startTime = Date.now();
    try {
      const result = await withRetry(
        () => this.singleRequest(endpoint, body, timeoutMs),
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
      logAIRequest({ operation, model: this.model, durationMs, success: true });
      recordMetric({ operation, durationMs, success: true, category: "ai" });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      recordFailure(CIRCUIT_NAME);
      const errorCode = error instanceof OllamaProviderError ? error.category : "UNKNOWN";
      logAIError({ operation, errorCode, durationMs });
      recordMetric({ operation, durationMs, success: false, category: "ai" });
      throw error;
    }
  }

  private convertToOllamaMessages(
    messages: AIMessage[]
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => {
      let content = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Extract text content from multimodal content
        const textParts = msg.content
          .filter((item) => item.type === "text" && item.text)
          .map((item) => item.text as string);
        content = textParts.join("\n");
      }
      return {
        role: msg.role,
        content,
      };
    });
  }

  async chat(
    messages: AIMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const ollamaMessages = this.convertToOllamaMessages(messages);
    
    return this.requestWithRetry(
      OLLAMA_API_CHAT,
      {
        model: this.model,
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.8,
          num_predict: options.maxTokens ?? 1024,
        },
      },
      REQUEST_TIMEOUT_MS,
      "chat"
    );
  }

  async chatVision(
    messages: AIVisionMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    // Check if Ollama model supports vision
    // For now, convert vision messages to text only
    const textMessages: AIMessage[] = messages.map((msg) => {
      let content = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Extract text content from multimodal content
        const textParts = msg.content
          .filter((item) => item.type === "text" && item.text)
          .map((item) => item.text as string);
        content = textParts.join("\n");
        // Note: Ollama vision support would require base64 image encoding
        // For now, we'll fall back to text-only
      }
      return {
        role: msg.role,
        content,
      };
    });

    return this.chat(textMessages, options);
  }

  async chatStructured(
    messages: AIMessage[],
    structuredOutput: StructuredOutputConfig,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    // Ollama doesn't have native structured output, so we need to instruct the model
    const systemMessage: AIMessage = {
      role: "system",
      content: `You MUST output valid JSON that matches this schema: ${JSON.stringify(structuredOutput.schema)}. Output ONLY the JSON object, no other text.`,
    };

    const ollamaMessages = this.convertToOllamaMessages([systemMessage, ...messages]);

    const response = await this.requestWithRetry(
      OLLAMA_API_CHAT,
      {
        model: this.model,
        messages: ollamaMessages,
        stream: false,
        format: "json", // Ollama's format option for JSON output
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 1024,
        },
      },
      REQUEST_TIMEOUT_MS,
      "chat_structured"
    );

    // Try to parse JSON to validate
    try {
      JSON.parse(response);
      return response;
    } catch (error) {
      // If not valid JSON, try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = jsonMatch[0];
        try {
          JSON.parse(extracted);
          return extracted;
        } catch {
          throw new OllamaProviderError(
            "MODEL_INVALID_JSON",
            `Ollama returned invalid JSON for structured output: ${response.slice(0, 200)}`
          );
        }
      }
      throw new OllamaProviderError(
        "MODEL_INVALID_JSON",
        `Ollama returned non-JSON response for structured output: ${response.slice(0, 200)}`
      );
    }
  }
}