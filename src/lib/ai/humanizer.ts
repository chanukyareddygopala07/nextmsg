import type { AIProvider } from "./provider";

const HUMANIZATION_SYSTEM_PROMPT = `You are a humanization engine. Your job is to take AI-generated replies and make them sound like a REAL PERSON texting.

You will receive a list of candidate replies. For each one, rewrite it to be more natural and human-like.

Rules:
- REMOVE all AI-like patterns: "That sounds amazing!", "That's really interesting!", "I'd love to hear more"
- USE contractions (don't, can't, won't, it's)
- Use sentence fragments, not full sentences
- Match casual texting conventions
- Keep messages SHORT (1-2 lines max)
- Use natural emoji placement (not excessive)
- Avoid overly clever or polished wording
- Avoid unnecessary punctuation (!!!, ...)
- Use lowercase when appropriate
- Use slang only if it fits the context naturally
- DO NOT add generic compliments
- DO NOT make it sound like a dating coach wrote it
- Preserve the conversational strategy/intent of each candidate

Return ONLY valid JSON:
{
  "humanized": [
    { "text": "rewritten text", "strategy": "original strategy" }
  ]
}`;

export async function humanizeReplies(
  provider: AIProvider,
  candidates: { text: string; strategy: string }[],
  userStyle?: Record<string, string>
): Promise<{ text: string; strategy: string }[]> {
  const candidatesText = candidates
    .map((c, i) => `${i + 1}. [${c.strategy}] ${c.text}`)
    .join("\n");

  const styleContext = userStyle
    ? `\nUser texting style: ${Object.entries(userStyle)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`
    : "";

  const response = await provider.chat(
    [
      { role: "system", content: HUMANIZATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Humanize these replies to sound like a real person texting:${styleContext}\n\n${candidatesText}`,
      },
    ],
    { temperature: 0.8, maxTokens: 1024 }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return candidates;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.humanized) && parsed.humanized.length > 0) {
      return parsed.humanized.map((h: { text: string; strategy: string }) => ({
        text: h.text || "",
        strategy: h.strategy || "natural",
      }));
    }
    return candidates;
  } catch {
    return candidates;
  }
}

const AI_LIKENESS_PATTERNS = [
  /that sounds (amazing|wonderful|fantastic|great|interesting|fascinating)/i,
  /i(?:'d| would) (love|like) to (hear|know|learn)/i,
  /what (inspired|motivated|made) you/i,
  /that(?:'s| is) (really|truly|absolutely) (interesting|amazing|wonderful)/i,
  /i(?:'m| am) (happy|glad|delighted) to hear/i,
  /tell me more about/i,
  /how (did|does|do) you/i,
  /that(?:'s| is) a (great|wonderful|beautiful|nice)/i,
  /i (appreciate|admire|respect)/i,
  /what (a|an) (amazing|wonderful|incredible|beautiful)/i,
];

export function scoreAILikeness(text: string): number {
  let penalty = 0;
  for (const pattern of AI_LIKENESS_PATTERNS) {
    if (pattern.test(text)) penalty += 0.2;
  }
  if (text.length > 150) penalty += 0.1;
  if (text.split(/[.!?]/).length > 3) penalty += 0.1;
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 1) penalty += 0.1;
  return Math.min(1, penalty);
}
