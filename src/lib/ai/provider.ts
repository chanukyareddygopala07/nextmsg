export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIVisionMessage {
  role: "system" | "user";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string>;
  chatVision(messages: AIVisionMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string>;
}

let providerInstance: AIProvider | null = null;

export async function getAIProvider(): Promise<AIProvider> {
  if (providerInstance) return providerInstance;
  const { OpenRouterProvider } = await import("./openrouter");
  providerInstance = new OpenRouterProvider();
  return providerInstance;
}

export function resetAIProvider(): void {
  providerInstance = null;
}
