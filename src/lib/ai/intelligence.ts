export type RelationshipType =
  | "manager"
  | "employee"
  | "professor"
  | "student"
  | "interviewer"
  | "candidate"
  | "recruiter"
  | "coworker"
  | "teammate"
  | "client"
  | "customer"
  | "friend"
  | "classmate"
  | "family"
  | "partner"
  | "date"
  | "romantic_interest"
  | "stranger"
  | "group"
  | "unknown";

export type SituationType =
  | "late_submission"
  | "missed_deadline"
  | "missed_interview"
  | "late_arrival"
  | "missed_meeting"
  | "delayed_response"
  | "missed_call"
  | "wrong_file"
  | "misunderstanding"
  | "disagreement"
  | "heated_argument"
  | "personal_conflict"
  | "customer_complaint"
  | "negotiation"
  | "request"
  | "apology"
  | "rejection"
  | "romantic_interest"
  | "casual_chat"
  | "professional_feedback"
  | "performance_issue"
  | "scheduling_problem"
  | "follow_up"
  | "request_for_help"
  | "boundary_setting"
  | "reconnecting"
  | "unknown";

export type UserIntentType =
  | "reply"
  | "explain"
  | "apologize"
  | "convince"
  | "persuade"
  | "negotiate"
  | "request"
  | "decline"
  | "accept"
  | "clarify"
  | "de_escalate"
  | "resolve_conflict"
  | "set_boundary"
  | "ask_for_extension"
  | "ask_for_reschedule"
  | "continue_conversation"
  | "start_conversation"
  | "flirt"
  | "show_interest"
  | "impress"
  | "make_them_laugh"
  | "comfort"
  | "reassure"
  | "follow_up"
  | "defend_position"
  | "recover_from_mistake"
  | "end_conversation"
  | "unknown";

export type OtherIntentType =
  | "asking_for_explanation"
  | "expressing_frustration"
  | "requesting_action"
  | "seeking_reassurance"
  | "disagreeing"
  | "flirting"
  | "ending_conversation"
  | "negotiating"
  | "asking_question"
  | "expressing_interest"
  | "unknown";

export type EmotionType =
  | "neutral"
  | "happy"
  | "excited"
  | "curious"
  | "confused"
  | "sad"
  | "disappointed"
  | "frustrated"
  | "angry"
  | "anxious"
  | "nervous"
  | "embarrassed"
  | "hurt"
  | "defensive"
  | "hopeful"
  | "romantic"
  | "playful"
  | "unknown";

export type ToneType =
  | "professional"
  | "formal"
  | "casual"
  | "friendly"
  | "warm"
  | "playful"
  | "humorous"
  | "flirty"
  | "romantic"
  | "serious"
  | "diplomatic"
  | "assertive"
  | "empathetic"
  | "angry"
  | "sarcastic"
  | "passive_aggressive"
  | "defensive"
  | "urgent"
  | "unknown";

export type CommunicationStrategy =
  | "natural"
  | "friendly"
  | "professional"
  | "concise"
  | "clear_direct"
  | "diplomatic"
  | "empathetic"
  | "assertive"
  | "persuasive"
  | "accountable"
  | "solution_oriented"
  | "reassuring"
  | "clarifying"
  | "de_escalate"
  | "boundary_setting"
  | "compromise"
  | "negotiation"
  | "apologetic"
  | "confident"
  | "curious"
  | "playful"
  | "funny"
  | "flirty"
  | "charming"
  | "romantic"
  | "supportive"
  | "follow_up"
  | "reschedule_request"
  | "extension_request";

export interface ParticipantInfo {
  count: number;
  roles: string[];
  userIdentification: string;
  otherParticipants: string[];
}

export interface EmotionInfo {
  primary: EmotionType;
  secondary: EmotionType;
  intensity: number;
}

export interface ToneInfo {
  primary: ToneType;
  secondary: ToneType;
  intensity: number;
}

export interface ConflictInfo {
  level: number;
  escalation: number;
  trigger: string;
  coreDisagreement: string;
  personalAttacks: boolean;
  misunderstanding: boolean;
  resolutionOpportunity: boolean;
}

export interface ConversationDynamics {
  engagement: number;
  reciprocity: number;
  cooperation: number;
  defensiveness: number;
  escalation: number;
  rapport: number;
  pressure: number;
  uncertainty: number;
  responsiveness: number;
}

export interface CommunicationRisk {
  type: string;
  severity: number;
  description: string;
}

export interface ConversationIntelligence {
  language: {
    primary: string;
    secondary: string[];
    script: string;
    codeMixed: boolean;
    romanized: boolean;
    confidence: number;
  };
  participants: ParticipantInfo;
  relationship: RelationshipType;
  context: string;
  situation: SituationType;
  userIntent: UserIntentType;
  otherIntent: OtherIntentType;
  emotion: EmotionInfo;
  tone: ToneInfo;
  conflict: ConflictInfo;
  dynamics: ConversationDynamics;
  risks: CommunicationRisk[];
  recommendedStrategies: CommunicationStrategy[];
  confidence: {
    language: number;
    context: number;
    situation: number;
    relationship: number;
    intent: number;
  };
}
