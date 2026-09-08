export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface AIVisionMessage {
  role: "system" | "user";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface StructuredOutputConfig {
  name: string;
  schema: Record<string, unknown>;
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string>;
  chatVision(messages: AIVisionMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string>;
  chatStructured(
    messages: AIMessage[],
    structuredOutput: StructuredOutputConfig,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;
}

let providerInstance: AIProvider | null = null;

export async function getAIProvider(): Promise<AIProvider> {
  if (providerInstance) return providerInstance;

  const providerType = process.env.AI_PROVIDER || "xai";

  switch (providerType) {
    case "xai": {
      const { XAIProvider } = await import("./xai");
      providerInstance = new XAIProvider();
      break;
    }
    case "openrouter": {
      const { OpenRouterProvider } = await import("./openrouter");
      providerInstance = new OpenRouterProvider();
      break;
    }
    case "ollama": {
      const { OllamaProvider } = await import("./ollama");
      providerInstance = new OllamaProvider();
      break;
    }
    default:
      throw new Error(`Unknown AI_PROVIDER: ${providerType}. Must be one of: xai, openrouter, ollama`);
  }

  return providerInstance;
}

export function resetAIProvider(): void {
  providerInstance = null;
}
