import type { AIProvider } from "./provider";
import type { ConversationAnalysis, ConversationStage } from "@/types/conversation";

const ANALYSIS_SYSTEM_PROMPT = `You are a conversation analyst. Analyze the provided conversation and return a JSON object with the following fields:

{
  "stage": one of "opening", "getting_to_know_each_other", "rapport", "playful", "flirting", "deep_conversation", "planning", "reconnecting", "dry_conversation", "awkward_conversation", "closing",
  "engagement": 0.0 to 1.0,
  "flirting": 0.0 to 1.0,
  "humor": 0.0 to 1.0,
  "reciprocity": 0.0 to 1.0,
  "conversationHealth": 0.0 to 1.0
}

Analyze:
- Message length and frequency patterns
- Question balance and reciprocity
- Emoji and humor usage
- Emotional energy and tone
- Signs of engagement or disinterest
- Current conversation stage
- Overall conversation health

Return ONLY valid JSON. No explanation.`;

export async function analyzeConversation(
  provider: AIProvider,
  messages: { sender: string; text: string }[]
): Promise<ConversationAnalysis> {
  const conversationText = messages
    .map((m) => `${m.sender}: ${m.text}`)
    .join("\n");

  const response = await provider.chat(
    [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: `Analyze this conversation:\n\n${conversationText}` },
    ],
    { temperature: 0.3, maxTokens: 512 }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultAnalysis();
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      stage: validateStage(parsed.stage),
      engagement: clamp(parsed.engagement),
      flirting: clamp(parsed.flirting),
      humor: clamp(parsed.humor),
      reciprocity: clamp(parsed.reciprocity),
      conversationHealth: clamp(parsed.conversationHealth),
    };
  } catch {
    return getDefaultAnalysis();
  }
}

function getDefaultAnalysis(): ConversationAnalysis {
  return {
    stage: "getting_to_know_each_other",
    engagement: 0.5,
    flirting: 0.3,
    humor: 0.4,
    reciprocity: 0.5,
    conversationHealth: 0.5,
  };
}

function validateStage(stage: string): ConversationStage {
  const valid: ConversationStage[] = [
    "opening",
    "getting_to_know_each_other",
    "rapport",
    "playful",
    "flirting",
    "deep_conversation",
    "planning",
    "reconnecting",
    "dry_conversation",
    "awkward_conversation",
    "closing",
  ];
  return valid.includes(stage as ConversationStage)
    ? (stage as ConversationStage)
    : "getting_to_know_each_other";
}

function clamp(value: unknown): number {
  const num = typeof value === "number" ? value : 0.5;
  return Math.max(0, Math.min(1, num));
}
