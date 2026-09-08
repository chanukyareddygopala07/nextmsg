import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeConversationIntelligence } from "@/lib/ai/intelligence-service";
import { createRequestCache } from "@/lib/ai/request-cache";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { generateRecovery } from "@/lib/ai/situation-recovery";
import { buildPersuasionEngine } from "@/lib/ai/persuasion";
import { coachConversation } from "@/lib/ai/conversation-coach";
import { analyzeConflict } from "@/lib/ai/conflict-analysis";
import { checkGenerationRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import type { ConversationMessage } from "@/types/conversation";

// ─── Conversation Coaching API ───────────────────────────────────────────────
//
// POST /api/conversation/coach
//
// Provides next-move coaching for a conversation.
// Returns deterministic coaching guidance: what to do next, when, how, and why.
// No AI call — purely rule-based analysis of conversation state.
// ──────────────────────────────────────────────────────────────────────────────

const ConversationCoachRequestSchema = z.object({
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
  draft: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    // Rate limit
    const rateLimit = checkGenerationRateLimit("conversation:coach");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = ConversationCoachRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Please provide at least one message." },
        { status: 400 }
      );
    }

    const { messages, goal, platform, userFacts, draft } = parsed.data;

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

    // Resolve conversation state
    const state = await resolveConversationState(context, intelligence, languageState, conversationMessages);

    // Run strategy selection
    const strategyResult = selectStrategies(state);

    // Run conflict analysis
    const conflictAnalysis = analyzeConflict(
      messages.map((m) => ({ sender: m.sender, text: m.text })),
      intelligence,
      state,
      userFacts
    );

    // Generate situation recovery (if applicable)
    const recovery = generateRecovery({
      state,
      userFacts: userFacts?.map((f) => ({ text: f, source: "user" as const, verified: true })),
      messages,
    });

    // Build persuasion engine (if applicable)
    const persuasion = buildPersuasionEngine(state);

    // Run coaching engine
    const coaching = coachConversation(
      state,
      { draft, userFacts },
      conflictAnalysis.conflictStructure,
      recovery,
      persuasion,
      undefined, // draftAnalysis
      undefined, // impact
      strategyResult.ranked,
      conflictAnalysis.participants
    );

    return NextResponse.json(
      {
        coaching,
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
    console.error("[Conversation Coach API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate coaching. Please try again." },
      { status: 500 }
    );
  }
}
