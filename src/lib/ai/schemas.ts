import { z } from "zod";

export const ReplyCandidateSchema = z.object({
  text: z.string().min(1),
  strategy: z.string().min(1),
});

export const ReplyGenerationSchema = z.object({
  candidates: z.array(ReplyCandidateSchema).min(1).max(6),
});

export type ReplyGeneration = z.infer<typeof ReplyGenerationSchema>;

export const ConversationStageSchema = z.enum([
  "opening",
  "getting_to_know_each_other",
  "rapport",
  "playful",
  "flirting",
  "deep_conversation",
  "planning",
  "reconnecting",
  "dry_conversation",
  "awkward_conversation",
  "closing",
]);

export const ConversationAnalysisSchema = z.object({
  stage: ConversationStageSchema,
  engagement: z.number().min(0).max(1),
  flirting: z.number().min(0).max(1),
  humor: z.number().min(0).max(1),
  reciprocity: z.number().min(0).max(1),
  conversationHealth: z.number().min(0).max(1),
});

export type ConversationAnalysisResult = z.infer<typeof ConversationAnalysisSchema>;

export const HumanizationSchema = z.object({
  humanized: z.array(ReplyCandidateSchema).min(1),
});

export type HumanizationResult = z.infer<typeof HumanizationSchema>;

export const ExtractionMessageSchema = z.object({
  sender: z.enum(["me", "them", "unknown"]),
  text: z.string().min(1),
});

export const ScreenshotExtractionSchema = z.object({
  platform: z.string().nullable().optional(),
  messages: z.array(ExtractionMessageSchema).min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export type ScreenshotExtraction = z.infer<typeof ScreenshotExtractionSchema>;

export const ConversationIntelligenceSchema = z.object({
  language: z.object({
    primary: z.string(),
    secondary: z.array(z.string()),
    script: z.enum(["romanized", "native", "english", "mixed"]),
    codeMixed: z.boolean(),
    romanized: z.boolean(),
    confidence: z.number().min(0).max(1),
  }),
  participants: z.object({
    count: z.number(),
    roles: z.array(z.string()),
    userIdentification: z.string(),
    otherParticipants: z.array(z.string()),
  }),
  relationship: z.enum([
    "manager", "employee", "professor", "student", "interviewer",
    "candidate", "recruiter", "coworker", "teammate", "client",
    "customer", "friend", "classmate", "family", "partner",
    "date", "romantic_interest", "stranger", "group", "unknown",
  ]),
  context: z.enum([
    "professional", "academic", "interview", "friendship", "dating",
    "family", "social", "customer", "negotiation", "conflict", "general",
  ]),
  situation: z.enum([
    "late_submission", "missed_deadline", "missed_interview", "late_arrival",
    "missed_meeting", "delayed_response", "missed_call", "wrong_file",
    "misunderstanding", "disagreement", "heated_argument", "personal_conflict",
    "customer_complaint", "negotiation", "request", "apology", "rejection",
    "romantic_interest", "casual_chat", "professional_feedback", "performance_issue",
    "scheduling_problem", "follow_up", "request_for_help", "boundary_setting",
    "reconnecting", "unknown",
  ]),
  userIntent: z.enum([
    "reply", "explain", "apologize", "convince", "persuade", "negotiate",
    "request", "decline", "accept", "clarify", "de_escalate", "resolve_conflict",
    "set_boundary", "ask_for_extension", "ask_for_reschedule", "continue_conversation",
    "start_conversation", "flirt", "show_interest", "impress", "make_them_laugh",
    "comfort", "reassure", "follow_up", "defend_position", "recover_from_mistake",
    "end_conversation", "unknown",
  ]),
  otherIntent: z.enum([
    "asking_for_explanation", "expressing_frustration", "requesting_action",
    "seeking_reassurance", "disagreeing", "flirting", "ending_conversation",
    "negotiating", "asking_question", "expressing_interest", "unknown",
  ]),
  emotion: z.object({
    primary: z.enum([
      "neutral", "happy", "excited", "curious", "confused", "sad",
      "disappointed", "frustrated", "angry", "anxious", "nervous",
      "embarrassed", "hurt", "defensive", "hopeful", "romantic", "playful", "unknown",
    ]),
    secondary: z.enum([
      "neutral", "happy", "excited", "curious", "confused", "sad",
      "disappointed", "frustrated", "angry", "anxious", "nervous",
      "embarrassed", "hurt", "defensive", "hopeful", "romantic", "playful", "unknown",
    ]),
    intensity: z.number().min(0).max(1),
  }),
  tone: z.object({
    primary: z.enum([
      "professional", "formal", "casual", "friendly", "warm", "playful",
      "humorous", "flirty", "romantic", "serious", "diplomatic", "assertive",
      "empathetic", "angry", "sarcastic", "passive_aggressive", "defensive",
      "urgent", "unknown",
    ]),
    secondary: z.enum([
      "professional", "formal", "casual", "friendly", "warm", "playful",
      "humorous", "flirty", "romantic", "serious", "diplomatic", "assertive",
      "empathetic", "angry", "sarcastic", "passive_aggressive", "defensive",
      "urgent", "unknown",
    ]),
    intensity: z.number().min(0).max(1),
  }),
  conflict: z.object({
    level: z.number().min(0).max(1),
    escalation: z.number().min(0).max(1),
    trigger: z.string(),
    coreDisagreement: z.string(),
    personalAttacks: z.boolean(),
    misunderstanding: z.boolean(),
    resolutionOpportunity: z.boolean(),
  }),
  dynamics: z.object({
    engagement: z.number().min(0).max(1),
    reciprocity: z.number().min(0).max(1),
    cooperation: z.number().min(0).max(1),
    defensiveness: z.number().min(0).max(1),
    escalation: z.number().min(0).max(1),
    rapport: z.number().min(0).max(1),
    pressure: z.number().min(0).max(1),
    uncertainty: z.number().min(0).max(1),
    responsiveness: z.number().min(0).max(1),
  }),
  risks: z.array(z.object({
    type: z.string(),
    severity: z.number().min(0).max(1),
    description: z.string(),
  })),
  recommendedStrategies: z.array(z.enum([
    "natural", "friendly", "professional", "concise", "clear_direct",
    "diplomatic", "empathetic", "assertive", "persuasive", "accountable",
    "solution_oriented", "reassuring", "clarifying", "de_escalate",
    "boundary_setting", "compromise", "negotiation", "apologetic",
    "confident", "curious", "playful", "funny", "flirty", "charming",
    "romantic", "supportive", "follow_up", "reschedule_request", "extension_request",
  ])).min(1).max(5),
  confidence: z.object({
    language: z.number().min(0).max(1),
    context: z.number().min(0).max(1),
    situation: z.number().min(0).max(1),
    relationship: z.number().min(0).max(1),
    intent: z.number().min(0).max(1),
  }),
});

export type ConversationIntelligence = z.infer<typeof ConversationIntelligenceSchema>;

export const DraftAnalysisSchema = z.object({
  intent: z.enum([
    "explain", "apologize", "persuade", "defend", "clarify", "request",
    "decline", "flirt", "continue_conversation", "de_escalate",
    "set_boundary", "negotiate", "ask_for_help", "comfort", "reassure",
    "show_interest", "make_them_laugh", "reject", "accept", "confirm",
    "inform", "unknown",
  ]),
  draftStrategy: z.enum([
    "natural", "friendly", "professional", "concise", "clear_direct",
    "diplomatic", "empathetic", "assertive", "persuasive", "accountable",
    "solution_oriented", "reassuring", "clarifying", "de_escalate",
    "boundary_setting", "compromise", "negotiation", "apologetic",
    "confident", "curious", "playful", "funny", "flirty", "charming",
    "romantic", "supportive", "follow_up", "reschedule_request", "extension_request",
  ]),
  tone: z.object({
    primary: z.enum([
      "calm", "friendly", "professional", "warm", "direct", "defensive",
      "angry", "sarcastic", "passive_aggressive", "playful", "flirty",
      "empathetic", "formal", "casual", "urgent", "anxious", "confident",
      "uncertain", "neutral", "unknown",
    ]),
    secondary: z.enum([
      "calm", "friendly", "professional", "warm", "direct", "defensive",
      "angry", "sarcastic", "passive_aggressive", "playful", "flirty",
      "empathetic", "formal", "casual", "urgent", "anxious", "confident",
      "uncertain", "neutral", "unknown",
    ]),
    intensity: z.number().min(0).max(1),
  }),
  perceivedImpact: z.enum([
    "cooperative", "defensive", "confrontational", "supportive", "dismissive",
    "confident", "uncertain", "apologetic", "pressuring", "professional",
    "playful", "warm", "cold", "neutral", "unknown",
  ]),
  perceivedImpactExplanation: z.string(),
  goalAlignment: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  misunderstandingRisk: z.number().min(0).max(1),
  escalationRisk: z.number().min(0).max(1),
  pressureRisk: z.number().min(0).max(1),
  styleConsistency: z.number().min(0).max(1),
  languageConsistency: z.number().min(0).max(1),
  factualIntegrity: z.number().min(0).max(1),
  strengths: z.array(z.object({
    category: z.enum([
      "clarity", "accountability", "conciseness", "natural_style",
      "appropriate_tone", "good_context_fit", "clear_boundary",
      "persuasive_reasoning", "empathy", "humor", "directness",
      "style_consistency", "language_consistency",
    ]),
    explanation: z.string(),
  })),
  issues: z.array(z.object({
    category: z.enum([
      "tone", "clarity", "escalation", "pressure", "style", "language",
      "factual", "goal_alignment", "context_fit", "misunderstanding",
    ]),
    severity: z.enum(["low", "medium", "high"]),
    explanation: z.string(),
    suggestion: z.string().optional(),
  })),
  recommendedApproach: z.string(),
  coaching: z.string(),
  analysisConfidence: z.number().min(0).max(1),
});

export type DraftAnalysisOutput = z.infer<typeof DraftAnalysisSchema>;

// ─── Communication Impact Prediction Schema ──────────────────────────────────

export const OutcomeScenarioSchema = z.object({
  likelihood: z.enum(["most_likely", "possible", "risk"]),
  description: z.string(),
  confidence: z.number().min(0).max(1),
});

export const RiskFactorSchema = z.object({
  factor: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  explanation: z.string(),
});

export const CommunicationImpactPredictionSchema = z.object({
  cooperation: z.number().min(0).max(1),
  responseLikelihood: z.number().min(0).max(1),
  conversationContinuation: z.number().min(0).max(1),
  misunderstandingRisk: z.number().min(0).max(1),
  escalationRisk: z.number().min(0).max(1),
  defensivenessRisk: z.number().min(0).max(1),
  pressureRisk: z.number().min(0).max(1),
  trustImpact: z.number().min(0).max(1),
  clarityImpact: z.number().min(0).max(1),
  goalProgression: z.number().min(0).max(1),
  scenarios: z.array(OutcomeScenarioSchema).min(1).max(4),
  riskFactors: z.array(RiskFactorSchema),
  sendReadiness: z.enum(["ready", "mostly_ready", "needs_review", "high_risk"]),
  recommendedAction: z.enum([
    "send_as_is", "soften_opening", "clarify_request", "add_specific_next_step",
    "reduce_blame", "acknowledge_concern", "add_context", "set_clear_boundary",
    "wait_and_rephrase", "improve_message",
  ]),
  impactSummary: z.string(),
  whyExplanation: z.string(),
  predictionConfidence: z.number().min(0).max(1),
});

export type CommunicationImpactPredictionOutput = z.infer<typeof CommunicationImpactPredictionSchema>;

export interface StructuredOutputConfig {
  name: string;
  schema: Record<string, unknown>;
}
