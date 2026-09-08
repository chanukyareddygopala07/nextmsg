import type { ConversationMessage } from "@/types/conversation";
import type { ConversationIntelligence } from "./intelligence";
import { ConversationIntelligenceSchema } from "./schemas";
import { getAIProvider, type AIMessage } from "./provider";
import { INTELLIGENCE_ANALYSIS_PROMPT, INTELLIGENCE_OUTPUT_CONFIG } from "./prompts/intelligence";

/**
 * Analyze conversation intelligence with request-scoped caching.
 *
 * If a requestId is provided, results are cached by message content hash
 * to avoid redundant AI calls when the same conversation is analyzed
 * multiple times within a single request.
 */
export async function analyzeConversationIntelligence(
  messages: ConversationMessage[],
  requestId?: string
): Promise<ConversationIntelligence> {
  // Check request-scoped cache first
  if (requestId) {
    const { getCachedIntelligence, setCachedIntelligence } = await import("./request-cache");
    const cached = getCachedIntelligence(requestId, messages);
    if (cached) return cached;

    const result = await doAnalyze(messages);
    setCachedIntelligence(requestId, messages, result);
    return result;
  }

  return doAnalyze(messages);
}

async function doAnalyze(messages: ConversationMessage[]): Promise<ConversationIntelligence> {
  const provider = await getAIProvider();

  const conversationText = messages
    .map((m) => `${m.sender === "me" ? "Me" : m.sender === "them" ? "Them" : m.sender}: ${m.text}`)
    .join("\n");

  const aiMessages: AIMessage[] = [
    { role: "system", content: INTELLIGENCE_ANALYSIS_PROMPT },
    { role: "user", content: conversationText },
  ];

  const raw = await provider.chatStructured(
    aiMessages,
    INTELLIGENCE_OUTPUT_CONFIG,
    { temperature: 0.3, maxTokens: 2048 }
  );

  const parsed = JSON.parse(raw);

  const result = ConversationIntelligenceSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Intelligence validation failed: ${result.error.issues.map((i) => i.message).join("; ")}`);
  }

  return result.data;
}
