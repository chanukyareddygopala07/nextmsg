import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { generateReplies } from "@/lib/ai/generator";
import { humanizeReplies } from "@/lib/ai/humanizer";
import { rankReplies } from "@/lib/ai/ranker";
import { analyzeConversation } from "@/lib/ai/conversation";

export async function POST(request: Request) {
  const totalStart = Date.now();

  try {
    const body = await request.json();
    const { messages, goal, styleProfile, platform } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Generation request:", {
        messageCount: messages.length,
        goal,
        hasStyleProfile: !!styleProfile,
        platform,
      });
    }

    const provider = await getAIProvider();

    const analysisStart = Date.now();
    const generationStart = Date.now();

    const [analysis, candidates] = await Promise.all([
      analyzeConversation(provider, messages).catch((err) => {
        if (process.env.NEXTMSG_DEBUG_AI === "true") {
          console.log("[NEXTMSG AI DEBUG] Analysis failed:", err.message);
        }
        return {
          stage: "getting_to_know_each_other" as const,
          engagement: 0.5,
          flirting: 0.3,
          humor: 0.4,
          reciprocity: 0.5,
          conversationHealth: 0.5,
        };
      }),
      generateReplies(provider, messages, goal, styleProfile, platform),
    ]);

    const generationMs = Date.now() - generationStart;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Generation complete:", {
        generationMs,
        candidateCount: candidates.length,
        candidates: candidates.map((c) => ({
          strategy: c.strategy,
          textLength: c.text.length,
        })),
      });
    }

    const humanizeStart = Date.now();
    const humanized = await humanizeReplies(provider, candidates, styleProfile);
    const humanizeMs = Date.now() - humanizeStart;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Humanization complete:", {
        humanizeMs,
        humanizedCount: humanized.length,
      });
    }

    const ranked = rankReplies(humanized, analysis, goal);

    const bestMatch = ranked[0] || { text: "haha yeah for real", strategy: "natural" };
    const alternatives = ranked.slice(1, 5);

    const totalMs = Date.now() - totalStart;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Full pipeline complete:", {
        totalMs,
        analysisMs: Date.now() - analysisStart - generationMs - humanizeMs,
        generationMs,
        humanizeMs,
        rankedCount: ranked.length,
        bestMatch: bestMatch.text.slice(0, 50),
      });
    }

    return NextResponse.json({
      bestMatch,
      alternatives,
      analysis: {
        stage: analysis.stage,
        engagement: analysis.engagement,
        health: analysis.conversationHealth,
      },
    });
  } catch (error) {
    const totalMs = Date.now() - totalStart;
    console.error("[NEXTMSG AI DEBUG] Generation pipeline error:", {
      totalMs,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 200) : undefined,
    });
    return NextResponse.json(
      { error: "Failed to generate replies" },
      { status: 500 }
    );
  }
}
