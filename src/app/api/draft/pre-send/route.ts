import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeConversationIntelligence } from "@/lib/ai/intelligence-service";
import { createRequestCache } from "@/lib/ai/request-cache";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { evaluatePreSendGate } from "@/lib/ai/pre-send-gate";
import { checkGenerationRateLimit, getRateLimitHeaders, getClientIdentifier } from "@/lib/rate-limit";
import type { ConversationMessage } from "@/types/conversation";

// ─── Pre-Send Quality Gate API ──────────────────────────────────────────────
//
// POST /api/draft/pre-send
//
// Evaluates a user's draft message before sending using 18 deterministic checks.
// Returns READY, REVIEW, or HIGH_RISK with detailed dimension scores.
// ──────────────────────────────────────────────────────────────────────────────

const PreSendGateRequestSchema = z.object({
  draft: z.string().min(1).max(2000),
  originalDraft: z.string().max(2000).optional(),
  messages: z
    .array(
      z.object({
        sender: z.enum(["me", "them", "unknown"]),
        text: z.string().min(1),
      })
    )
    .min(1)
    .max(200),
  goal: z.string().optional(),
  platform: z.string().optional(),
  userFacts: z.array(z.string()).optional(),
  draftAnalysis: z
    .object({
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
      strengths: z.array(
        z.object({
          category: z.string(),
          explanation: z.string(),
        })
      ),
      issues: z.array(
        z.object({
          category: z.string(),
          severity: z.string(),
          explanation: z.string(),
          suggestion: z.string().optional(),
        })
      ),
      recommendedApproach: z.string(),
      coaching: z.string(),
      analysisConfidence: z.number(),
    })
    .optional(),
  impactPrediction: z
    .object({
      cooperation: z.number(),
      responseLikelihood: z.number(),
      conversationContinuation: z.number(),
      misunderstandingRisk: z.number(),
      escalationRisk: z.number(),
      defensivenessRisk: z.number(),
      pressureRisk: z.number(),
      trustImpact: z.number(),
      clarityImpact: z.number(),
      goalProgression: z.number(),
      scenarios: z.array(
        z.object({
          likelihood: z.string(),
          description: z.string(),
          confidence: z.number(),
        })
      ),
      riskFactors: z.array(
        z.object({
          factor: z.string(),
          severity: z.string(),
          explanation: z.string(),
        })
      ),
      sendReadiness: z.string(),
      recommendedAction: z.string(),
      impactSummary: z.string(),
      whyExplanation: z.string(),
      predictionConfidence: z.number(),
    })
    .optional(),
  coaching: z
    .object({
      nextMove: z.object({
        action: z.string(),
        description: z.string(),
        strategy: z.string(),
        example: z.string().optional(),
      }),
      timing: z.object({
        when: z.string(),
        urgency: z.number(),
        explanation: z.string(),
      }),
      responseGuidance: z.object({
        tone: z.string(),
        length: z.string(),
        structure: z.array(z.string()),
        keyPoints: z.array(z.string()),
        example: z.string().optional(),
      }),
      avoid: z.array(z.string()),
      confidence: z.number(),
      reasoning: z.string(),
      priority: z.string(),
      contextSummary: z.object({
        relationship: z.string(),
        situation: z.string(),
        conflictLevel: z.string(),
        otherPersonEmotion: z.string(),
        conversationHealth: z.string(),
      }),
      followUpSuggestions: z.array(z.string()),
      responseNeeded: z.boolean(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    // Rate limit
    const clientId = getClientIdentifier(request);
    const rateLimit = checkGenerationRateLimit(`draft:pre-send:${clientId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = PreSendGateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Please provide a draft and at least one message." },
        { status: 400 }
      );
    }

    const { draft, originalDraft, messages, goal, platform, userFacts, draftAnalysis, impactPrediction, coaching } =
      parsed.data;

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

    // Evaluate the pre-send gate
    const gate = await evaluatePreSendGate(
      {
        draft,
        originalDraft,
        messages,
        goal,
        platform,
        userFacts,
        draftAnalysis: draftAnalysis as never,
        impactPrediction: impactPrediction as never,
        coaching: coaching as never,
      },
      state
    );

    return NextResponse.json(
      {
        gate,
        state: {
          relationship: state.relationship,
          context: state.context.type,
          situation: state.context.situation,
          tone: state.tone.primary,
          conflict: state.conflict.level,
          strategy: state.strategy.primary,
        },
      },
      {
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    console.error("[Pre-Send Gate API] Error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate message. Please try again." },
      { status: 500 }
    );
  }
}
