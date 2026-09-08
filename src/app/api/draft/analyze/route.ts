import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";
import { analyzeDraft, analyzeDraftWithAI } from "@/lib/ai/draft-analysis";
import { analyzeConversationIntelligence } from "@/lib/ai/intelligence-service";
import { createRequestCache } from "@/lib/ai/request-cache";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { checkGenerationRateLimit, getRateLimitHeaders, getClientIdentifier } from "@/lib/rate-limit";
import type { ConversationMessage } from "@/types/conversation";

// ─── Draft Analysis API ──────────────────────────────────────────────────────
//
// POST /api/draft/analyze
//
// Analyzes a user's draft message against the current conversation.
// Returns structured DraftAnalysis with coaching and improvement suggestions.
// ──────────────────────────────────────────────────────────────────────────────

const DraftAnalyzeRequestSchema = z.object({
  draft: z.string().min(1).max(2000),
  messages: z.array(
    z.object({
      sender: z.enum(["me", "them", "unknown"]),
      text: z.string().min(1),
    })
  ).min(1).max(200),
  goal: z.string().optional(),
  platform: z.string().optional(),
  userFacts: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    // Rate limit
    const clientId = getClientIdentifier(request);
    const rateLimit = checkGenerationRateLimit(`draft:analyze:${clientId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = DraftAnalyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Please provide a draft and at least one message." },
        { status: 400 }
      );
    }

    const { draft, messages, goal, platform, userFacts } = parsed.data;

    // Build conversation context from messages
    const context = {
      language: "english",
      script: "english" as const,
      conversationType: "general" as const,
      participants: 2,
      goal: goal || "continue_conversation",
      tone: "neutral",
      urgency: "normal" as const,
      userStyle: "casual",
      platform,
    };

    // Build ConversationMessage[] for intelligence pipeline
    const conversationMessages: ConversationMessage[] = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    // Run conversation intelligence pipeline
    const requestId = createRequestCache();
    const intelligence = await analyzeConversationIntelligence(conversationMessages, requestId);
    const languageState = detectLanguageState(conversationMessages, intelligence.language.primary);
    const state = resolveConversationState(context, intelligence, languageState, conversationMessages);

    // Try AI-enhanced analysis first, fall back to deterministic
    let result;
    try {
      const provider = await getAIProvider();
      result = await analyzeDraftWithAI(provider, { draft, messages, goal, platform, userFacts }, state);
    } catch {
      // Fall back to deterministic analysis
      result = analyzeDraft({ draft, messages, goal, platform, userFacts }, state);
    }

    return NextResponse.json({
      analysis: result.analysis,
      state: {
        relationship: state.relationship,
        context: state.context.type,
        situation: state.context.situation,
        tone: state.tone.primary,
        conflict: state.conflict.level,
        strategy: state.strategy.primary,
      },
    }, {
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error("[Draft Analysis API] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze draft. Please try again." },
      { status: 500 }
    );
  }
}
