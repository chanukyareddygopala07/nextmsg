import type { AIProvider } from "./provider";
import type { ReplyCandidate } from "@/types/conversation";

const GENERATION_SYSTEM_PROMPT = `You are a reply generator for casual text conversations. Generate multiple reply candidates with different conversational strategies.

The user wants to reply to a conversation. Generate replies that sound like a REAL PERSON texting, NOT an AI.

Critical rules:
- NO "That sounds amazing!" or "That's really interesting!"
- NO formal language or full sentences unless that's the user's style
- Use contractions, fragments, casual language
- Sound natural and human
- Match the energy of the conversation
- Be contextually appropriate
- DO NOT use generic compliments

Return ONLY valid JSON with this structure:
{
  "candidates": [
    { "text": "reply text", "strategy": "strategy name" }
  ]
}

Strategies to generate:
1. "natural" - A balanced, casual reply that fits naturally
2. "playful" - Slightly teasing or lighthearted
3. "funny" - Humor-focused, witty
4. "flirty" - Subtle romantic interest (only if context allows)
5. "confident" - Direct and assured
6. "curious" - Asks an engaging follow-up question

Generate exactly 6 candidates, one for each strategy. Each should be 1-2 short messages max.
The replies should feel like something you'd actually text a friend or date.`;

export async function generateReplies(
  provider: AIProvider,
  messages: { sender: string; text: string }[],
  goal?: string,
  styleProfile?: Record<string, string>,
  platform?: string
): Promise<ReplyCandidate[]> {
  const conversationText = messages
    .map((m) => `${m.sender}: ${m.text}`)
    .join("\n");

  const contextParts: string[] = [];
  if (goal) contextParts.push(`Goal: ${goal}`);
  if (platform) contextParts.push(`Platform: ${platform}`);
  if (styleProfile) {
    const styleStr = Object.entries(styleProfile)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    contextParts.push(`User style: ${styleStr}`);
  }

  const context = contextParts.length > 0 ? `\n${contextParts.join("\n")}` : "";

  const response = await provider.chat(
    [
      { role: "system", content: GENERATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate replies for this conversation:${context}\n\n${conversationText}\n\nLast message was from: ${messages[messages.length - 1]?.sender || "unknown"}`,
      },
    ],
    { temperature: 0.9, maxTokens: 1024 }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultCandidates(messages);
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
      return parsed.candidates.map((c: { text: string; strategy: string }) => ({
        text: c.text || "",
        strategy: c.strategy || "natural",
      }));
    }
    return getDefaultCandidates(messages);
  } catch {
    return getDefaultCandidates(messages);
  }
}

function getDefaultCandidates(messages: { sender: string; text: string }[]): ReplyCandidate[] {
  const lastMessage = messages[messages.length - 1]?.text || "";
  return [
    { text: `haha yeah ${lastMessage.length > 20 ? "that's wild" : "for real"}`, strategy: "natural" },
    { text: "wait no way 😂", strategy: "playful" },
    { text: "that's actually funny", strategy: "funny" },
    { text: "okay but tell me more 👀", strategy: "flirty" },
    { text: "nah i get that", strategy: "confident" },
    { text: "what do you mean by that?", strategy: "curious" },
  ];
}
