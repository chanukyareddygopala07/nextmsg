import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { generateReplies } from "@/lib/ai/generator";
import { humanizeReplies } from "@/lib/ai/humanizer";
import { rankReplies } from "@/lib/ai/ranker";
import { analyzeConversation } from "@/lib/ai/conversation";
import { analyzeConversationIntelligence } from "@/lib/ai/intelligence-service";
import { createRequestCache, destroyRequestCache } from "@/lib/ai/request-cache";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { validateCandidates, logQualityValidation } from "@/lib/ai/quality-validator";
import { generateRecovery, logSituationRecovery, type UserFact } from "@/lib/ai/situation-recovery";
import { buildPersuasionEngine, logPersuasionEngine } from "@/lib/ai/persuasion";
import { analyzeConflict, logConflictAnalysis } from "@/lib/ai/conflict-analysis";
import { XAIProviderError } from "@/lib/ai/xai";
import { getProviderUserMessage } from "@/lib/ai/screenshot";
import type { ConversationContext } from "@/lib/ai/context";
import type { CommunicationMode } from "@/lib/ai/mode-types";
import { detectModeFromState, resolveEffectiveMode } from "@/lib/ai/mode-config";
import { logger, logModeEvent } from "@/lib/observability";
import { auth } from "@/lib/auth";
import { getPreferenceProfile, buildCompactProfile } from "@/lib/ai/personalization";
import {
  checkGenerationRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  const totalStart = Date.now();

  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = checkGenerationRateLimit(clientId);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    const body = await request.json();
    const { messages, context: rawContext, userFacts: rawUserFacts } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Parse user-provided facts
    const userFacts: UserFact[] = Array.isArray(rawUserFacts)
      ? rawUserFacts.map((f: { text: string; source?: string }) => ({
          text: f.text,
          source: (f.source === "user" ? "user" : "inferred") as "user" | "inferred",
          verified: f.source === "user",
        }))
      : [];

    const context: ConversationContext = {
      language: rawContext?.language || "english",
      script: rawContext?.script || "english",
      conversationType: rawContext?.conversationType || "general",
      participants: rawContext?.participants || 2,
      goal: rawContext?.goal || "keep_going",
      tone: rawContext?.tone || "casual",
      urgency: rawContext?.urgency || "normal",
      userStyle: rawContext?.userStyle || "casual",
      platform: rawContext?.platform,
      outputLanguage: rawContext?.outputLanguage || "auto",
      preferredStyle: rawContext?.preferredStyle,
      communicationMode: (rawContext?.communicationMode || "auto") as CommunicationMode,
      overrideInstruction:
        typeof rawContext?.overrideInstruction === "string"
          ? rawContext.overrideInstruction
          : null,
    };

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Generation request:", {
        messageCount: messages.length,
        context,
      });
    }

    const provider = await getAIProvider();

    const requestId = createRequestCache();

    const analysisStart = Date.now();

    const [analysisResult, intelligenceResult] = await Promise.all([
      analyzeConversation(provider, messages, context),
      analyzeConversationIntelligence(messages, requestId).catch(() => null),
    ]);

    const intelligence = intelligenceResult;

    const analysisMs = Date.now() - analysisStart;

    // ── Language Detection (deterministic, no AI call) ──
    const languageState = detectLanguageState(
      messages,
      rawContext?.language,
      rawContext?.outputLanguage
    );

    // ── State Resolution ──
    const state = resolveConversationState(context, intelligence, languageState, messages);
    const modeRecommendation = detectModeFromState(state);
    const selectedMode = context.communicationMode || "auto";
    const overrideInstruction = context.overrideInstruction ?? null;
    const modeResolution = resolveEffectiveMode({
      selectedMode,
      source: selectedMode !== "auto" ? "manual" : "auto",
      overrideInstruction,
      recommendation: modeRecommendation,
    });

    state.mode = {
      selected: selectedMode,
      source: modeResolution.source,
      recommendation: modeRecommendation,
    };

    logModeEvent({
      event: "mode_detected",
      mode: modeRecommendation.mode,
      confidence: modeRecommendation.confidence,
      source: "conversation_state",
    });

    if (modeRecommendation.confidence >= 0.5) {
      logModeEvent({
        event: "mode_recommendation_shown",
        mode: modeRecommendation.mode,
        confidence: modeRecommendation.confidence,
        selectedMode,
      });
    }

    if (selectedMode !== "auto") {
      logModeEvent({
        event: "mode_selected",
        mode: selectedMode,
        source: "manual",
        detectedMode: modeRecommendation.mode,
        confidence: modeRecommendation.confidence,
      });
    }

    if (
      modeResolution.conflict ||
      (selectedMode !== "auto" &&
        selectedMode !== modeRecommendation.mode &&
        modeRecommendation.confidence >= 0.5) ||
      modeResolution.source === "instruction"
    ) {
      logModeEvent({
        event: "mode_overridden",
        selectedMode,
        detectedMode: modeRecommendation.mode,
        mode: modeResolution.mode,
        source: modeResolution.source,
        confidence: modeRecommendation.confidence,
        reason: modeResolution.conflict?.reason || modeResolution.source,
      });
    }

    // ── Strategy Engine ──
    const strategyResult = selectStrategies(state);
    state.strategy = strategyResult;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] State resolved:", {
        analysisMs,
        contextSource: state.sources.contextSource,
        goalSource: state.sources.goalSource,
        situationSource: state.sources.situationSource,
        toneSource: state.sources.toneSource,
        languageSource: state.sources.languageSource,
        languagePrimary: state.language.primary,
        languageSecondary: state.language.secondary,
        languageCodeMixed: state.language.codeMixed,
        languageRomanized: state.language.romanized,
        languageScript: state.language.script,
        languageConfidence: state.language.confidence,
        situation: state.context.situation,
        relationship: state.relationship,
        primaryStrategy: strategyResult.primary,
        strategyCount: strategyResult.ranked.length,
        hasIntelligence: !!intelligence,
        styleSource: state.style.source,
        styleConfidence: state.style.profile?.confidence || 0,
      });
    }

    // ── Situation Recovery ──
    const recoveryStart = Date.now();
    const recovery = generateRecovery({ state, userFacts, messages });
    const persuasion = buildPersuasionEngine(state);
    const recoveryMs = Date.now() - recoveryStart;

    logSituationRecovery(recovery);
    logPersuasionEngine(persuasion);

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Situation recovery complete:", {
        recoveryMs,
        situation: recovery.situation,
        severity: recovery.severity,
        userGoal: recovery.userGoal,
        accountabilityLevel: recovery.accountabilityLevel,
        recommendedStrategies: recovery.recommendedStrategies,
        persuasionFeasibility: persuasion.assessment.persuasionFeasibility,
        persuasionModes: persuasion.assessment.appropriateModes,
      });
    }

    // ── Conflict Analysis (deterministic, no AI call) ──
    const conflictAnalysisStart = Date.now();
    const conflictAnalysis = analyzeConflict(
      messages,
      intelligence || {
        language: {
          primary: state.language.primary,
          secondary: state.language.secondary,
          script: state.language.script,
          codeMixed: state.language.codeMixed,
          romanized: state.language.romanized,
          confidence: state.language.confidence,
        },
        participants: {
          count: state.participants.count,
          roles: state.participants.roles,
          userIdentification: state.participants.userId,
          otherParticipants: state.participants.others,
        },
        relationship: state.relationship,
        context: state.context.type,
        situation: state.context.situation,
        userIntent: state.intent.userIntent,
        otherIntent: state.intent.otherIntent,
        emotion: state.emotion,
        tone: state.tone,
        conflict: state.conflict,
        dynamics: state.dynamics,
        risks: state.risks,
        recommendedStrategies: state.strategy.ranked.map((s) => s.strategy),
        confidence: {
          language: state.language.confidence,
          context: 0.5,
          situation: 0.5,
          relationship: 0.5,
          intent: 0.5,
        },
      },
      state,
      userFacts.map((f) => f.text)
    );
    const conflictAnalysisMs = Date.now() - conflictAnalysisStart;

    // Update state with conflict intelligence
    state.conflictIntelligence = {
      participants: conflictAnalysis.participants,
      conflictStructure: conflictAnalysis.conflictStructure,
      groupAnalysis: conflictAnalysis.groupAnalysis,
    };

    logConflictAnalysis(conflictAnalysis);

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Conflict analysis complete:", {
        conflictAnalysisMs,
        participantCount: conflictAnalysis.participants.length,
        conflictLevel: conflictAnalysis.conflictStructure.conflictLevel,
        escalationTrend: conflictAnalysis.conflictStructure.escalationTrend,
        misunderstandings: conflictAnalysis.conflictStructure.misunderstandings.length,
        resolutionOpportunities: conflictAnalysis.conflictStructure.resolutionOpportunities.length,
      });
    }

    // ── Generation ──
    const generationStart = Date.now();

    // Load user preferences (if authenticated)
    let compactPreferences = undefined;
    try {
      const session = await auth();
      if (session?.user?.id) {
        const profile = await getPreferenceProfile(session.user.id);
        compactPreferences = buildCompactProfile(profile, context.conversationType);
      }
    } catch {
      // Personalization is optional — fail silently
    }

    const generationResult = await generateReplies(
      provider,
      messages,
      context,
      state,
      strategyResult.ranked,
      recovery,
      persuasion,
      userFacts,
      undefined, // relevantMemory
      undefined, // conflictCoaching
      undefined, // relevantResolutions
      compactPreferences
    );

    const generationMs = Date.now() - generationStart;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Generation complete:", {
        generationMs,
        candidateCount: generationResult.candidates.length,
        hasGenerationError: !!generationResult.error,
      });
    }

    // ── Humanization ──
    const humanizeStart = Date.now();
    const humanizeResult = await humanizeReplies(
      provider,
      generationResult.candidates,
      context,
      state
    );
    const humanizeMs = Date.now() - humanizeStart;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Humanization complete:", {
        humanizeMs,
        humanizedCount: humanizeResult.humanized.length,
        hasHumanizeError: !!humanizeResult.error,
        contextType: state.context.type,
        strategySet: state.strategy.ranked.map((s) => s.strategy),
        styleConfidence: state.style.profile?.confidence || 0,
        languagePrimary: state.language.primary,
        conflictLevel: state.conflict.level,
      });
    }

    // ── Quality Validation ──
    const validationStart = Date.now();
    const originalTexts = generationResult.candidates.map((c) => c.text);
    const validationResult = validateCandidates(
      humanizeResult.humanized,
      state,
      originalTexts
    );
    const validationMs = Date.now() - validationStart;

    logQualityValidation(validationResult);

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Quality validation complete:", {
        validationMs,
        totalCandidates: validationResult.validationSummary.totalCandidates,
        passedCount: validationResult.validationSummary.passedCount,
        failedCount: validationResult.validationSummary.failedCount,
        averageScore: Math.round(validationResult.validationSummary.averageScore * 100) / 100,
        allFailed: validationResult.allFailed,
      });
    }

    // ── Ranking ──
    const ranked = rankReplies(
      validationResult.passedCandidates,
      analysisResult.analysis,
      context.goal,
      state,
      strategyResult.ranked,
      recovery,
      compactPreferences
    );

    const bestMatch = ranked[0] || {
      text: "haha yeah for real",
      strategy: "natural",
    };
    const alternatives = ranked.slice(1, 5);

    const totalMs = Date.now() - totalStart;

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Full pipeline complete:", {
        totalMs,
        analysisMs,
        recoveryMs,
        generationMs,
        humanizeMs,
        validationMs,
        rankedCount: ranked.length,
        bestMatch: bestMatch.text.slice(0, 50),
      });
    }

    const warnings: string[] = [];
    if (analysisResult.error) warnings.push(analysisResult.error.userMessage);
    if (generationResult.error) warnings.push(generationResult.error.userMessage);
    if (humanizeResult.error) warnings.push(humanizeResult.error.userMessage);
    if (validationResult.allFailed) {
      warnings.push("All candidates failed quality validation. Using fallback candidates.");
    }

    return NextResponse.json(
      {
        bestMatch,
        alternatives,
        conversationState: state,
        modeRecommendation,
        analysis: {
          stage: analysisResult.analysis.stage,
          engagement: analysisResult.analysis.engagement,
          health: analysisResult.analysis.conversationHealth,
        },
        intelligence: intelligence
          ? {
              situation: state.context.situation,
              userIntent: state.intent.userIntent,
              relationship: state.relationship,
              context: state.context.type,
              emotion: state.emotion.primary,
              tone: state.tone.primary,
              conflict: state.conflict.level,
              strategies: strategyResult.ranked.map((s) => s.strategy),
              primaryStrategy: strategyResult.primary,
              sources: state.sources,
              language: {
                primary: state.language.primary,
                secondary: state.language.secondary,
                script: state.language.script,
                codeMixed: state.language.codeMixed,
                romanized: state.language.romanized,
                confidence: state.language.confidence,
                detectionSource: state.language.detectionSource,
                outputPreference: state.language.outputPreference,
              },
              style: {
                source: state.style.source,
                confidence: state.style.profile?.confidence || 0,
                lengthCategory: state.style.profile?.sentence.lengthCategory || "medium",
                formality: state.style.profile?.tonePreference.formality || "casual",
                emojiUsage: state.style.profile?.emoji.usesEmojis || false,
                slangUsage: state.style.profile?.slang.usesSlang || false,
              },
              qualityValidation: {
                passedCount: validationResult.validationSummary.passedCount,
                failedCount: validationResult.validationSummary.failedCount,
                averageScore: Math.round(validationResult.validationSummary.averageScore * 100) / 100,
                allFailed: validationResult.allFailed,
              },
              recovery: {
                situation: recovery.situation,
                severity: recovery.severity,
                userGoal: recovery.userGoal,
                accountabilityLevel: recovery.accountabilityLevel,
                recommendedApproach: recovery.recommendedApproach,
                recommendedStrategies: recovery.recommendedStrategies,
                requiredElements: recovery.requiredElements.map((e) => e.element),
                nextAction: recovery.nextAction,
                conflictAdjusted: recovery.conflictAdjusted,
                groupAdjusted: recovery.groupAdjusted,
              },
              persuasion: {
                feasibility: persuasion.assessment.persuasionFeasibility,
                recommendedMode: persuasion.recommendedMode,
                appropriateModes: persuasion.assessment.appropriateModes,
              },
              conflictIntelligence: {
                participants: conflictAnalysis.participants.map((p) => ({
                  participantId: p.participantId,
                  label: p.label,
                  position: p.position,
                  intent: p.intent,
                  emotion: p.emotion,
                  tone: p.tone,
                  stance: p.stance,
                })),
                conflictStructure: {
                  conflictLevel: conflictAnalysis.conflictStructure.conflictLevel,
                  escalationTrend: conflictAnalysis.conflictStructure.escalationTrend,
                  trigger: conflictAnalysis.conflictStructure.trigger,
                  coreDisagreement: conflictAnalysis.conflictStructure.coreDisagreement,
                  misunderstandings: conflictAnalysis.conflictStructure.misunderstandings,
                  blamePattern: conflictAnalysis.conflictStructure.blamePattern,
                  resolutionOpportunities: conflictAnalysis.conflictStructure.resolutionOpportunities,
                },
                groupAnalysis: conflictAnalysis.groupAnalysis ? {
                  isGroup: conflictAnalysis.groupAnalysis.isGroup,
                  participantCount: conflictAnalysis.groupAnalysis.participantCount,
                  groupDynamics: conflictAnalysis.groupAnalysis.groupDynamics,
                } : null,
              },
            }
          : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      {
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    const totalMs = Date.now() - totalStart;

    if (error instanceof XAIProviderError) {
      const userMessage = getProviderUserMessage(error.category);
      if (process.env.NEXTMSG_DEBUG_AI === "true") {
        console.log("[NEXTMSG AI DEBUG] Generation pipeline provider error:", {
          totalMs,
          category: error.category,
          status: error.status,
        });
      }
      const httpStatus = error.category === "PROVIDER_AUTH_ERROR" ? 401
        : error.category === "PROVIDER_RATE_LIMIT" ? 429
        : error.category === "PROVIDER_TIMEOUT" ? 504
        : 502;
      return NextResponse.json(
        { error: userMessage, errorCategory: error.category },
        { status: httpStatus }
      );
    }

    console.error("[NEXTMSG AI DEBUG] Generation pipeline error:", {
      totalMs,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 200) : undefined,
    });
    return NextResponse.json(
      { error: "Failed to generate replies", errorCategory: "PROVIDER_UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
