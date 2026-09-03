import type { TextingProfileData } from "@/types/style";

const STYLE_ANALYSIS_PROMPT = `You are a texting style analyzer. Given examples of how someone texts, analyze their style.

Return ONLY valid JSON with this structure:
{
  "messageLength": "short" | "medium" | "long",
  "capitalization": "mostly_lowercase" | "mixed" | "mostly_uppercase" | "all_caps",
  "punctuation": "minimal" | "moderate" | "heavy",
  "emojiFrequency": "none" | "low" | "moderate" | "heavy",
  "favoriteEmojis": ["emoji1", "emoji2"],
  "humor": "low" | "moderate" | "high",
  "flirting": "none" | "low" | "moderate" | "high",
  "slang": "none" | "low" | "moderate" | "heavy",
  "abbreviations": "none" | "low" | "moderate" | "heavy",
  "directness": "low" | "moderate" | "high",
  "questionFrequency": "low" | "moderate" | "high",
  "energy": "low" | "moderate" | "high" | "playful",
  "sarcasm": "low" | "moderate" | "high",
  "useOfLowercase": "rarely" | "sometimes" | "mostly" | "always",
  "typicalOpenings": ["opening1", "opening2"],
  "typicalClosings": ["closing1", "closing2"],
  "oneLinerTendency": "low" | "moderate" | "high",
  "conversationalEnergy": "low" | "moderate" | "high" | "playful"
}

Analyze carefully. Return ONLY the JSON.`;

export async function analyzeStyle(
  examples: string[]
): Promise<TextingProfileData> {
  const examplesText = examples.map((e, i) => `${i + 1}. "${e}"`).join("\n");

  try {
    const { getAIProvider } = await import("../ai/provider");
    const provider = await getAIProvider();
    const response = await provider.chat(
      [
        { role: "system", content: STYLE_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `Analyze the texting style from these message examples:\n\n${examplesText}`,
        },
      ],
      { temperature: 0.3, maxTokens: 1024 }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultProfile(examples);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      messageLength: parsed.messageLength || "medium",
      capitalization: parsed.capitalization || "mixed",
      punctuation: parsed.punctuation || "moderate",
      emojiFrequency: parsed.emojiFrequency || "moderate",
      favoriteEmojis: Array.isArray(parsed.favoriteEmojis) ? parsed.favoriteEmojis : [],
      humor: parsed.humor || "moderate",
      flirting: parsed.flirting || "moderate",
      slang: parsed.slang || "moderate",
      abbreviations: parsed.abbreviations || "moderate",
      directness: parsed.directness || "moderate",
      questionFrequency: parsed.questionFrequency || "moderate",
      energy: parsed.energy || "moderate",
      sarcasm: parsed.sarcasm || "low",
      useOfLowercase: parsed.useOfLowercase || "sometimes",
      typicalOpenings: Array.isArray(parsed.typicalOpenings) ? parsed.typicalOpenings : [],
      typicalClosings: Array.isArray(parsed.typicalClosings) ? parsed.typicalClosings : [],
      oneLinerTendency: parsed.oneLinerTendency || "moderate",
      conversationalEnergy: parsed.conversationalEnergy || "moderate",
      onboardingExamples: examples,
    };
  } catch {
    return getDefaultProfile(examples);
  }
}

function getDefaultProfile(examples: string[]): TextingProfileData {
  const allText = examples.join(" ");
  const hasEmojis = /[\p{Emoji}]/u.test(allText);
  const isLowercase = allText === allText.toLowerCase();
  const avgLength =
    examples.reduce((sum, e) => sum + e.split(/\s+/).length, 0) / examples.length;

  return {
    messageLength: avgLength < 5 ? "short" : avgLength < 12 ? "medium" : "long",
    capitalization: isLowercase ? "mostly_lowercase" : "mixed",
    punctuation: (allText.match(/[.!?]/g) || []).length < examples.length ? "minimal" : "moderate",
    emojiFrequency: hasEmojis ? "moderate" : "low",
    favoriteEmojis: [],
    humor: "moderate",
    flirting: "low",
    slang: "low",
    abbreviations: "low",
    directness: "moderate",
    questionFrequency: examples.some((e) => e.includes("?")) ? "moderate" : "low",
    energy: "moderate",
    sarcasm: "low",
    useOfLowercase: isLowercase ? "mostly" : "sometimes",
    typicalOpenings: [],
    typicalClosings: [],
    oneLinerTendency: avgLength < 5 ? "high" : "moderate",
    conversationalEnergy: "moderate",
    onboardingExamples: examples,
  };
}

export function getStyleSummary(profile: TextingProfileData): string[] {
  const summary: string[] = [];

  summary.push(capitalize(profile.messageLength));
  summary.push(profile.capitalization === "mostly_lowercase" ? "Lowercase" : "Mixed case");
  summary.push(`${capitalize(profile.emojiFrequency)} emojis`);
  summary.push(`${capitalize(profile.humor)} humor`);
  summary.push(`${capitalize(profile.energy)} energy`);

  if (profile.flirting !== "none") {
    summary.push(`${capitalize(profile.flirting)} flirting`);
  }

  if (profile.slang !== "none") {
    summary.push(`${capitalize(profile.slang)} slang`);
  }

  return summary;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
