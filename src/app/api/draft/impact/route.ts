import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";
import { analyzeDraft, analyzeDraftWithAI, runDeterministicDraftChecks } from "@/lib/ai/draft-analysis";
import { predictImpact, predictImpactWithAI } from "@/lib/ai/impact-prediction";
import { analyzeConversationIntelligence } from "@/lib/ai/intelligence-service";
import { createRequestCache } from "@/lib/ai/request-cache";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { checkGenerationRateLimit, getRateLimitHeaders, getClientIdentifier } from "@/lib/rate-limit";
import type { ConversationMessage } from "@/types/conversation";
import type { DraftAnalysis } from "@/lib/ai/draft-types";

// ─── Draft Impact Prediction API ─────────────────────────────────────────────
//
// POST /api/draft/impact
//
// Predicts what might happen in the conversation if the user sends their draft.
// Uses DraftAnalysis + ConversationState + deterministic signals + optional AI.
// ──────────────────────────────────────────────────────────────────────────────

const DraftImpactRequestSchema = z.object({
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
    const rateLimit = checkGenerationRateLimit(`draft:impact:${clientId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = DraftImpactRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Please provide a draft and at least one message." },
        { status: 400 }
      );
    }

    const { draft, messages, goal, platform, userFacts, draftAnalysis: providedAnalysis } = parsed.data;

    // Build conversation context
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

    // Build ConversationMessage[]
    const conversationMessages: ConversationMessage[] = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    // Run conversation intelligence pipeline
    const requestId = createRequestCache();
    const intelligence = await analyzeConversationIntelligence(conversationMessages, requestId);
    const languageState = detectLanguageState(conversationMessages, intelligence.language.primary);
    const state = resolveConversationState(context, intelligence, languageState, conversationMessages);

    // Get or compute DraftAnalysis
    let draftAnalysis: DraftAnalysis;
    if (providedAnalysis) {
      // Use the provided analysis
      draftAnalysis = providedAnalysis as DraftAnalysis;
    } else {
      // Compute draft analysis
      try {
        const provider = await getAIProvider();
        const analysisResult = await analyzeDraftWithAI(
          provider,
          { draft, messages, goal, userFacts },
          state
        );
        draftAnalysis = analysisResult.analysis;
      } catch {
        const analysisResult = analyzeDraft(
          { draft, messages, goal, userFacts },
          state
        );
        draftAnalysis = analysisResult.analysis;
      }
    }

    // Run deterministic checks for impact signals
    const checks = runDeterministicDraftChecks(draft);

    // Try AI-enhanced prediction first, fall back to deterministic
    let result;
    try {
      const provider = await getAIProvider();
      result = await predictImpactWithAI(
        provider,
        { draft, messages, goal, userFacts, draftAnalysis },
        state,
        draftAnalysis,
        checks
      );
    } catch {
      result = predictImpact(
        { draft, messages, goal, userFacts, draftAnalysis },
        state,
        draftAnalysis,
        checks
      );
    }

    return NextResponse.json({
      prediction: result.prediction,
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
    console.error("[Draft Impact API] Error:", error);
    return NextResponse.json(
      { error: "Failed to predict communication impact. Please try again." },
      { status: 500 }
    );
  }
}
