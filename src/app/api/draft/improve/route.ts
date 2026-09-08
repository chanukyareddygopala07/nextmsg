import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";
import { improveMessage } from "@/lib/ai/message-improver";
import { analyzeConversationIntelligence } from "@/lib/ai/intelligence-service";
import { createRequestCache } from "@/lib/ai/request-cache";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { checkGenerationRateLimit, getRateLimitHeaders, getClientIdentifier } from "@/lib/rate-limit";
import type { ConversationMessage } from "@/types/conversation";
import type { ImprovementMode, DraftAnalysis } from "@/lib/ai/draft-types";

// ─── Draft Improvement API ──────────────────────────────────────────────────
//
// POST /api/draft/improve
//
// Improves a user's draft message while preserving meaning.
// Returns multiple improved candidates with preservation validation.
// ──────────────────────────────────────────────────────────────────────────────

const DraftImproveRequestSchema = z.object({
  draft: z.string().min(1).max(2000),
  mode: z.enum([
    "keep_meaning_improve_clarity",
    "more_professional",
    "more_diplomatic",
    "more_assertive",
    "more_empathetic",
    "more_concise",
    "more_persuasive",
    "more_natural",
    "more_playful",
    "more_flirty",
  ]),
  messages: z.array(
    z.object({
      sender: z.enum(["me", "them", "unknown"]),
      text: z.string().min(1),
    })
  ).min(1).max(200),
  goal: z.string().optional(),
  platform: z.string().optional(),
  userFacts: z.array(z.string()).optional(),
  draftAnalysis: z.object({
    intent: z.string(),
    draftStrategy: z.string(),
    tone: z.object({
      primary: z.string(),
      secondary: z.string(),
      intensity: z.number(),
    }),
    perceivedImpact: z.string(),
    perceivedImpactExplanation: z.string(),
    goalAlignment: z.number(),
    clarity: z.number(),
    misunderstandingRisk: z.number(),
    escalationRisk: z.number(),
    pressureRisk: z.number(),
    styleConsistency: z.number(),
    languageConsistency: z.number(),
    factualIntegrity: z.number(),
    strengths: z.array(z.object({
      category: z.string(),
      explanation: z.string(),
    })),
    issues: z.array(z.object({
      category: z.string(),
      severity: z.string(),
      explanation: z.string(),
      suggestion: z.string().optional(),
    })),
    recommendedApproach: z.string(),
    coaching: z.string(),
    analysisConfidence: z.number(),
  }).optional(),
});

export async function POST(request: Request) {
  try {
    // Rate limit
    const clientId = getClientIdentifier(request);
    const rateLimit = checkGenerationRateLimit(`draft:improve:${clientId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = DraftImproveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Please provide a draft, mode, and at least one message." },
        { status: 400 }
      );
    }

    const { draft, mode, messages, goal, platform, userFacts, draftAnalysis } = parsed.data;

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

    // Get AI provider
    const provider = await getAIProvider();

    // Run improvement
    const result = await improveMessage(
      provider,
      {
        draft,
        mode: mode as ImprovementMode,
        messages,
        analysis: draftAnalysis as unknown as DraftAnalysis,
        goal,
        platform,
        userFacts,
      },
      state,
      undefined, // strategies
      undefined, // recovery
      undefined, // persuasion
      undefined, // userFacts (already passed in input)
      undefined, // relevantMemory
      undefined, // conflictCoaching
      undefined  // relevantResolutions
    );

    return NextResponse.json({
      result,
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
    console.error("[Draft Improvement API] Error:", error);
    return NextResponse.json(
      { error: "Failed to improve message. Please try again." },
      { status: 500 }
    );
  }
}
