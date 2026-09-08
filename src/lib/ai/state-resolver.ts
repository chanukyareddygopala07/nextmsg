import type { ConversationContext } from "./context";
import type { ConversationIntelligence } from "./intelligence";
import type { ConversationState } from "./conversation-state";
import type { LanguageState } from "./language";
import type { WritingStyleProfile } from "./personality";
import { extractWritingStyle, generateStyleGuidance } from "./style-extractor";

// ─── Precedence Constants ─────────────────────────────────────────────────────
const HIGH_CONFIDENCE_THRESHOLD = 0.7;
const LOW_CONFIDENCE_THRESHOLD = 0.4;

const DEFAULT_EMOTION_PRIMARY = "neutral" as const;
const DEFAULT_EMOTION_SECONDARY = "neutral" as const;
const DEFAULT_TONE_SECONDARY = "casual" as const;
const DEFAULT_SITUATION = "unknown" as const;
const DEFAULT_USER_INTENT = "unknown" as const;
const DEFAULT_OTHER_INTENT = "unknown" as const;
const DEFAULT_STRATEGY = "natural" as const;

// ─── State Resolver ───────────────────────────────────────────────────────────
//
// Merges ConversationContext (UI + detector), ConversationIntelligence (AI),
// and LanguageState (heuristic) into a single authoritative ConversationState.
//
// Precedence rules:
// 1. Explicit user input (UI) wins for: goal, platform, style, outputLanguage, language
// 2. AI intelligence wins for: situation, relationship, emotion, tone, dynamics,
//    conflict, risks — when confidence >= 0.7
// 3. AI intelligence can override weak detector signals when confidence is high
// 4. Detector wins when AI confidence is low (< 0.4) and detector has a signal
// 5. When both are uncertain, use "unknown"
//
// Language Precedence:
// 1. Explicit user selection (UI) — always wins
// 2. AI intelligence — when confidence >= 0.7
// 3. Heuristic detector — fallback signals
// 4. Default ("unknown") — lowest priority
// ──────────────────────────────────────────────────────────────────────────────

export function resolveConversationState(
  context: ConversationContext,
  intelligence: ConversationIntelligence | null,
  languageState?: LanguageState | null,
  messages?: { sender: string; text: string }[]
): ConversationState {
  const state: ConversationState = {
    participants: resolveParticipants(context, intelligence),
    relationship: resolveRelationship(context, intelligence),
    language: resolveLanguage(context, intelligence, languageState),
    context: resolveContext(context, intelligence),
    intent: resolveIntent(context, intelligence),
    emotion: resolveEmotion(intelligence),
    tone: resolveTone(context, intelligence),
    dynamics: resolveDynamics(intelligence),
    conflict: resolveConflict(intelligence),
    risks: resolveRisks(intelligence),
    conflictIntelligence: {
      participants: [],
      conflictStructure: null,
      groupAnalysis: null,
    },
    strategy: { primary: DEFAULT_STRATEGY, ranked: [], confidence: 0 },
    style: resolveStyle(context, messages),
    sources: {
      goalSource: "default",
      contextSource: "default",
      toneSource: "default",
      situationSource: "default",
      languageSource: "fallback",
    },
  };

  // Apply precedence and source tracking
  applyGoalPrecedence(state, context, intelligence);
  applyContextPrecedence(state, context, intelligence);
  applyTonePrecedence(state, context, intelligence);
  applySituationPrecedence(state, intelligence);
  applyLanguagePrecedence(state, context, intelligence, languageState);

  return state;
}

// ─── Participants ─────────────────────────────────────────────────────────────

function resolveParticipants(
  context: ConversationContext,
  intelligence: ConversationIntelligence | null
): ConversationState["participants"] {
  if (intelligence) {
    const count = intelligence.participants.count || context.participants;
    return {
      count,
      roles: intelligence.participants.roles,
      userId: intelligence.participants.userIdentification || "me",
      others: intelligence.participants.otherParticipants,
      isGroup: count > 2,
    };
  }

  return {
    count: context.participants,
    roles: [],
    userId: "me",
    others: [],
    isGroup: context.participants > 2,
  };
}

// ─── Relationship ─────────────────────────────────────────────────────────────

function resolveRelationship(
  context: ConversationContext,
  intelligence: ConversationIntelligence | null
): ConversationState["relationship"] {
  if (intelligence && intelligence.confidence.relationship >= HIGH_CONFIDENCE_THRESHOLD) {
    return intelligence.relationship;
  }

  if (intelligence && intelligence.confidence.relationship >= LOW_CONFIDENCE_THRESHOLD) {
    if (intelligence.relationship !== "unknown") return intelligence.relationship;
  }

  return inferRelationshipFromContext(context);
}

function inferRelationshipFromContext(
  context: ConversationContext
): ConversationState["relationship"] {
  const map: Record<string, ConversationState["relationship"]> = {
    professional: "coworker",
    academic: "classmate",
    interview: "interviewer",
    dating: "date",
    friendship: "friend",
    family: "family",
    customer: "customer",
    negotiation: "stranger",
    conflict: "unknown",
  };
  return map[context.conversationType] || "unknown";
}

// ─── Language ─────────────────────────────────────────────────────────────────

function resolveLanguage(
  context: ConversationContext,
  intelligence: ConversationIntelligence | null,
  languageState?: LanguageState | null
): ConversationState["language"] {
  // Start with heuristic detector defaults
  const base = languageState
    ? {
        primary: languageState.primary,
        secondary: languageState.secondary,
        script: languageState.script,
        codeMixed: languageState.codeMixed,
        romanized: languageState.romanized,
        codeMixRatio: languageState.codeMixRatio,
        outputPreference: languageState.outputPreference,
        confidence: languageState.confidence,
        scriptConfidence: languageState.scriptConfidence,
        detectionSource: languageState.detectionSource,
        participantLanguages: languageState.participantLanguages,
      }
    : {
        primary: context.language || "english",
        secondary: [] as string[],
        script: mapScriptType(context.script),
        codeMixed: false,
        romanized: false,
        codeMixRatio: [] as { language: string; ratio: number }[],
        outputPreference: (context.outputLanguage || "auto") as ConversationState["language"]["outputPreference"],
        confidence: 0.5,
        scriptConfidence: 0.5,
        detectionSource: "heuristic" as const,
        participantLanguages: [] as ConversationState["language"]["participantLanguages"],
      };

  return base;
}

function mapScriptType(script: string): ConversationState["language"]["script"] {
  const map: Record<string, ConversationState["language"]["script"]> = {
    romanized: "latin",
    native: "devanagari",
    english: "latin",
    mixed: "mixed",
    latin: "latin",
    devanagari: "devanagari",
    telugu: "telugu",
    tamil: "tamil",
    kannada: "kannada",
    malayalam: "malayalam",
    bengali: "bengali",
    gujarati: "gujarati",
    gurmukhi: "gurmukhi",
    odia: "odia",
    arabic: "arabic",
  };
  return map[script] || "unknown";
}

// ─── Context ──────────────────────────────────────────────────────────────────

function resolveContext(
  context: ConversationContext,
  _intelligence: ConversationIntelligence | null
): ConversationState["context"] {
  return {
    type: context.conversationType,
    platform: context.platform,
    situation: DEFAULT_SITUATION,
    urgency: context.urgency,
  };
}

// ─── Intent ───────────────────────────────────────────────────────────────────

function resolveIntent(
  context: ConversationContext,
  intelligence: ConversationIntelligence | null
): ConversationState["intent"] {
  if (intelligence && intelligence.confidence.intent >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      userGoal: context.goal,
      userIntent: intelligence.userIntent,
      otherIntent: intelligence.otherIntent,
    };
  }

  return {
    userGoal: context.goal,
    userIntent: DEFAULT_USER_INTENT,
    otherIntent: DEFAULT_OTHER_INTENT,
  };
}

// ─── Emotion ──────────────────────────────────────────────────────────────────

function resolveEmotion(
  intelligence: ConversationIntelligence | null
): ConversationState["emotion"] {
  if (intelligence) {
    return {
      primary: intelligence.emotion.primary,
      secondary: intelligence.emotion.secondary,
      intensity: intelligence.emotion.intensity,
    };
  }

  return {
    primary: DEFAULT_EMOTION_PRIMARY,
    secondary: DEFAULT_EMOTION_SECONDARY,
    intensity: 0.3,
  };
}

// ─── Tone ─────────────────────────────────────────────────────────────────────

function resolveTone(
  context: ConversationContext,
  intelligence: ConversationIntelligence | null
): ConversationState["tone"] {
  if (intelligence && intelligence.confidence.context >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      primary: intelligence.tone.primary,
      secondary: intelligence.tone.secondary,
      intensity: intelligence.tone.intensity,
    };
  }

  return {
    primary: mapDetectorTone(context.tone),
    secondary: DEFAULT_TONE_SECONDARY,
    intensity: 0.5,
  };
}

function mapDetectorTone(detectorTone: string): ConversationState["tone"]["primary"] {
  const map: Record<string, ConversationState["tone"]["primary"]> = {
    professional: "professional",
    formal: "formal",
    casual: "casual",
    friendly: "friendly",
    playful: "playful",
    flirty: "flirty",
    romantic: "romantic",
    serious: "serious",
    assertive: "assertive",
    empathetic: "empathetic",
    warm: "warm",
    confident: "serious",
    humorous: "playful",
    calm: "casual",
    respectful: "friendly",
  };
  return map[detectorTone] || "casual";
}

// ─── Dynamics ─────────────────────────────────────────────────────────────────

function resolveDynamics(
  intelligence: ConversationIntelligence | null
): ConversationState["dynamics"] {
  if (intelligence) {
    return { ...intelligence.dynamics };
  }

  return {
    engagement: 0.5,
    reciprocity: 0.5,
    cooperation: 0.5,
    defensiveness: 0.2,
    escalation: 0.1,
    rapport: 0.5,
    pressure: 0.2,
    uncertainty: 0.3,
    responsiveness: 0.5,
  };
}

// ─── Conflict ─────────────────────────────────────────────────────────────────

function resolveConflict(
  intelligence: ConversationIntelligence | null
): ConversationState["conflict"] {
  if (intelligence) {
    return { ...intelligence.conflict };
  }

  return {
    level: 0,
    escalation: 0,
    trigger: "",
    coreDisagreement: "",
    personalAttacks: false,
    misunderstanding: false,
    resolutionOpportunity: true,
  };
}

// ─── Risks ────────────────────────────────────────────────────────────────────

function resolveRisks(
  intelligence: ConversationIntelligence | null
): ConversationState["risks"] {
  if (intelligence) {
    return [...intelligence.risks];
  }
  return [];
}

// ─── Style ────────────────────────────────────────────────────────────────────

function resolveStyle(
  context: ConversationContext,
  messages?: { sender: string; text: string }[]
): ConversationState["style"] {
  const preferredStyle = context.preferredStyle || context.userStyle || "casual";
  const writingCharacteristics = context.userStyle || "casual";

  // Extract style from messages if available
  if (messages && messages.length > 0) {
    const userMessages = messages.filter((m) => m.sender === "me");
    if (userMessages.length > 0) {
      const profile = extractWritingStyle(messages);
      const guidance = generateStyleGuidance(profile);

      return {
        preferred: preferredStyle,
        writingCharacteristics,
        lengthPreference: inferLengthPreference(context, profile),
        profile,
        guidance,
        source: "extracted",
      };
    }
  }

  // Fallback to context-based style
  return {
    preferred: preferredStyle,
    writingCharacteristics,
    lengthPreference: inferLengthPreference(context, null),
    profile: null,
    guidance: null,
    source: "default",
  };
}

function inferLengthPreference(
  context: ConversationContext,
  profile: WritingStyleProfile | null
): string {
  // If we have a profile, use the detected length category
  if (profile) {
    switch (profile.sentence.lengthCategory) {
      case "very_short":
      case "short":
        return "short";
      case "long":
        return "long";
      default:
        return "medium";
    }
  }

  // Fallback to context-based inference
  if (context.preferredStyle === "concise" || context.preferredStyle === "clear_direct") {
    return "short";
  }
  if (context.preferredStyle === "professional" || context.preferredStyle === "formal") {
    return "medium";
  }
  return "medium";
}

// ─── Precedence Application ───────────────────────────────────────────────────

function applyGoalPrecedence(
  state: ConversationState,
  context: ConversationContext,
  intelligence: ConversationIntelligence | null
): void {
  // Explicit user goal always wins
  if (context.goal && context.goal !== "keep_going") {
    state.intent.userGoal = context.goal;
    state.sources.goalSource = "user";
    return;
  }

  // Intelligence can suggest a goal if user didn't provide one
  if (intelligence && intelligence.confidence.intent >= HIGH_CONFIDENCE_THRESHOLD) {
    const inferredGoal = mapIntentToGoal(intelligence.userIntent);
    if (inferredGoal) {
      state.intent.userGoal = inferredGoal;
      state.sources.goalSource = "intelligence";
      return;
    }
  }

  state.sources.goalSource = "default";
}

function applyContextPrecedence(
  state: ConversationState,
  context: ConversationContext,
  intelligence: ConversationIntelligence | null
): void {
  // Explicit user context type always wins
  if (context.conversationType && context.conversationType !== "general") {
    state.context.type = context.conversationType;
    state.sources.contextSource = "user";
    return;
  }

  // Intelligence overrides weak detector
  if (intelligence && intelligence.confidence.context >= HIGH_CONFIDENCE_THRESHOLD) {
    state.context.type = intelligence.context;
    state.sources.contextSource = "intelligence";
    return;
  }

  state.sources.contextSource = "detector";
}

function applyTonePrecedence(
  state: ConversationState,
  context: ConversationContext,
  intelligence: ConversationIntelligence | null
): void {
  // Explicit user tone preference wins
  if (context.tone && context.tone !== "casual") {
    state.tone.primary = mapDetectorTone(context.tone);
    state.sources.toneSource = "user";
    return;
  }

  // Intelligence overrides when confident
  if (intelligence && intelligence.confidence.context >= HIGH_CONFIDENCE_THRESHOLD) {
    state.sources.toneSource = "intelligence";
    return;
  }

  state.sources.toneSource = "detector";
}

function applySituationPrecedence(
  state: ConversationState,
  intelligence: ConversationIntelligence | null
): void {
  if (intelligence && intelligence.confidence.situation >= HIGH_CONFIDENCE_THRESHOLD) {
    state.context.situation = intelligence.situation;
    state.sources.situationSource = "intelligence";
    return;
  }

  if (intelligence && intelligence.confidence.situation >= LOW_CONFIDENCE_THRESHOLD) {
    if (intelligence.situation !== "unknown") {
      state.context.situation = intelligence.situation;
      state.sources.situationSource = "intelligence";
      return;
    }
  }

  state.sources.situationSource = "default";
}

function applyLanguagePrecedence(
  state: ConversationState,
  context: ConversationContext,
  intelligence: ConversationIntelligence | null,
  languageState?: LanguageState | null
): void {
  // 1. Explicit user selection always wins
  if (context.language && context.language !== "english" && context.language !== "unknown") {
    state.language.primary = context.language;
    state.language.confidence = 0.95;
    state.language.detectionSource = "explicit_user";
    state.sources.languageSource = "explicit_user";
    return;
  }

  // 2. AI intelligence overrides when confident
  if (intelligence && intelligence.confidence.language >= HIGH_CONFIDENCE_THRESHOLD) {
    state.language.primary = intelligence.language.primary;
    state.language.secondary = intelligence.language.secondary;
    state.language.codeMixed = intelligence.language.codeMixed;
    state.language.romanized = intelligence.language.romanized;
    state.language.confidence = intelligence.language.confidence;
    state.language.detectionSource = "ai";
    state.sources.languageSource = "ai";

    // Update script from intelligence if available
    if (intelligence.language.script) {
      state.language.script = mapScriptType(intelligence.language.script);
    }

    return;
  }

  // 3. Heuristic detector has moderate confidence
  if (languageState && languageState.confidence >= LOW_CONFIDENCE_THRESHOLD) {
    state.sources.languageSource = "heuristic";
    return;
  }

  // 4. Fallback
  state.sources.languageSource = "fallback";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapIntentToGoal(
  intent: ConversationIntelligence["userIntent"]
): string | null {
  const map: Record<string, string> = {
    flirt: "flirt_naturally",
    show_interest: "show_interest",
    impress: "be_confident",
    make_them_laugh: "make_them_laugh",
    ask_for_extension: "ask_them_out",
    ask_for_reschedule: "ask_them_out",
    recover_from_mistake: "recover_dry",
    continue_conversation: "keep_going",
    start_conversation: "start_conversation",
    end_conversation: "end_conversation",
    follow_up: "reconnect",
  };
  return map[intent] || null;
}
