// ─── Participant Intelligence Types ─────────────────────────────────────────────
//
// Models individual participants in a conversation with their:
// - Identity (who they are, their role, relationship)
// - Position (what they believe, want, claim)
// - Intent (what they're trying to accomplish)
// - Emotion (how they're feeling)
// - Tone (how they're communicating)
// - Stance (cooperative, defensive, neutral)
// - Claims (what they're asserting as fact)
//
// Design:
// - Each participant is analyzed independently
// - Evidence-based inference (not assumptions)
// - "unknown" when information is insufficient
// - Does not diagnose personalities or mental health
// ──────────────────────────────────────────────────────────────────────────────

export type ParticipantStance =
  | "cooperative"
  | "defensive"
  | "neutral"
  | "hostile"
  | "mediating"
  | "passive"
  | "unknown";

export type ParticipantIntent =
  | "ask"
  | "explain"
  | "defend"
  | "accuse"
  | "clarify"
  | "apologize"
  | "negotiate"
  | "persuade"
  | "request_action"
  | "request_information"
  | "express_frustration"
  | "reassure"
  | "de_escalate"
  | "resolve_conflict"
  | "set_boundary"
  | "end_conversation"
  | "seek_accountability"
  | "express_disagreement"
  | "unknown";

export type EmotionConfidence = "high" | "medium" | "low" | "inferred";

export interface ParticipantEmotion {
  primary: string;
  secondary: string;
  intensity: number;
  confidence: EmotionConfidence;
}

export interface ParticipantTone {
  primary: string;
  secondary: string;
  intensity: number;
}

export interface ParticipantPosition {
  mainPosition: string;
  supportingReasoning: string;
  requestedOutcome: string;
}

export type ClaimType =
  | "participant_claim"
  | "user_fact"
  | "ai_inference"
  | "disputed_fact"
  | "verified_fact";

export interface ParticipantClaim {
  text: string;
  type: ClaimType;
  supportedByEvidence: boolean;
  disputedBy: string[];
}

export interface ParticipantBehavior {
  cooperationLevel: number;
  defensiveness: number;
  escalationContribution: number;
  personalAttacks: boolean;
  blameTarget?: string;
}

export interface ParticipantIntelligence {
  participantId: string;
  label: string;
  role: string;
  relationshipToUser: string;
  language: string;
  position: ParticipantPosition;
  intent: ParticipantIntent;
  emotion: ParticipantEmotion;
  tone: ParticipantTone;
  stance: ParticipantStance;
  behavior: ParticipantBehavior;
  concerns: string[];
  requests: string[];
  claims: ParticipantClaim[];
  knownFacts: string[];
  disputedFacts: string[];
}

// ─── Conflict Structure ─────────────────────────────────────────────────────────
//
// Represents the deeper structure of a conflict:
// - What triggered it
// - What the core disagreement is
// - Secondary issues
// - Factual disputes
// - Misunderstandings
// - Blame patterns
// - Resolution opportunities
// ──────────────────────────────────────────────────────────────────────────────

export type BlamePattern =
  | "direct_blame"
  | "indirect_blame"
  | "shared_responsibility"
  | "self_blame"
  | "unclear_responsibility"
  | "none";

export type EscalationTrend =
  | "decreasing"
  | "stable"
  | "increasing"
  | "unknown";

export interface Misunderstanding {
  description: string;
  participants: string[];
  possibleCause: string;
  resolutionSuggestion: string;
}

export interface FactualDispute {
  topic: string;
  claims: Array<{
    participantId: string;
    claim: string;
  }>;
  possibleResolution: string;
}

export interface ResolutionOpportunity {
  type: string;
  description: string;
  requiredParticipants: string[];
  difficulty: "easy" | "moderate" | "hard";
}

export interface ConflictStructure {
  conflictLevel: number;
  escalationLevel: number;
  escalationTrend: EscalationTrend;
  escalationTriggerPoint?: string;
  trigger: string;
  coreDisagreement: string;
  secondaryDisagreements: string[];
  misunderstandings: Misunderstanding[];
  factualDisputes: FactualDispute[];
  personalAttacks: boolean;
  personalAttackTargets: string[];
  blamePattern: BlamePattern;
  blameTargets: string[];
  defensiveness: number;
  unresolvedQuestions: string[];
  resolutionOpportunities: ResolutionOpportunity[];
}

// ─── Group Conversation Analysis ────────────────────────────────────────────────
//
// Represents a multi-person conversation:
// - Participant count and roles
// - Active vs silent participants
// - Conflict vs neutral participants
// - Potential mediators
// - Dominant language(s)
// - Social dynamics (without inferring alliances)
// ──────────────────────────────────────────────────────────────────────────────

export interface GroupDynamics {
  dominantParticipants: string[];
  silentParticipants: string[];
  conflictParticipants: string[];
  neutralParticipants: string[];
  affectedParticipants: string[];
  potentialMediators: string[];
}

export interface GroupConversationAnalysis {
  isGroup: boolean;
  participantCount: number;
  participants: ParticipantIntelligence[];
  groupDynamics: GroupDynamics;
  dominantLanguage: string;
  multilingual: boolean;
  languageDistribution: Array<{
    participantId: string;
    language: string;
  }>;
  userPosition: ParticipantIntelligence | null;
}

// ─── Extended Conflict Info ─────────────────────────────────────────────────────
//
// Extends the existing ConflictInfo with deeper analysis
// ──────────────────────────────────────────────────────────────────────────────

export interface ExtendedConflictInfo {
  level: number;
  escalation: number;
  escalationTrend: EscalationTrend;
  trigger: string;
  coreDisagreement: string;
  secondaryDisagreements: string[];
  personalAttacks: boolean;
  misunderstanding: boolean;
  misunderstandings: Misunderstanding[];
  factualDisputes: FactualDispute[];
  blamePattern: BlamePattern;
  resolutionOpportunity: boolean;
  resolutionOpportunities: ResolutionOpportunity[];
  unresolvedQuestions: string[];
}
