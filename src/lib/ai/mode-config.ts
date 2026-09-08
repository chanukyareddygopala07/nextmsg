import type { CommunicationMode, ModeConfig, ModeSelection, ModeRecommendation, ModeConflict } from "./mode-types";
import type { ConversationState } from "./conversation-state";
import type { ConversationIntelligence } from "./intelligence";

// ─── Mode Configurations ──────────────────────────────────────────────────────
//
// Data-driven mode definitions. Each mode has:
// - UI metadata (label, description, icon)
// - Recommended tones and quick actions
// - Default preferences
// - Help text for the draft area
//
// Quick actions map to existing ToneType / CommunicationStyle values.
// Goals map to existing GoalType values.
// ──────────────────────────────────────────────────────────────────────────────

export const MODE_CONFIGS: Record<CommunicationMode, ModeConfig> = {
  auto: {
    id: "auto",
    label: "Auto",
    description: "Detect the best communication context automatically.",
    icon: "✦",
    recommendedTones: [],
    quickGoals: [],
    quickActions: [],
    defaults: { tone: "natural", style: "balanced", length: "medium", formality: "contextual" },
    helpText: "Paste your conversation and write what you want to say. NextMsg will detect the best communication context.",
    visible: true,
    order: 0,
  },
  work: {
    id: "work",
    label: "Work",
    description: "Messages for managers, clients, and teammates.",
    icon: "💼",
    recommendedTones: ["professional", "concise", "assertive", "diplomatic"],
    quickGoals: [
      { label: "Status update", goal: "give_update", description: "Share progress or status" },
      { label: "Request extension", goal: "request_extension", description: "Ask for more time" },
      { label: "Follow up", goal: "follow_up", description: "Check on previous request" },
      { label: "Disagree professionally", goal: "disagree_professionally", description: "Express disagreement respectfully" },
      { label: "Ask for clarification", goal: "ask_clarification", description: "Get more details" },
      { label: "Schedule meeting", goal: "schedule_meeting", description: "Propose a meeting time" },
    ],
    quickActions: [
      { label: "Professional", tone: "professional", description: "Clear and business-appropriate" },
      { label: "Concise", tone: "concise", description: "Brief and to the point" },
      { label: "Assertive", tone: "assertive", description: "Direct and confident" },
      { label: "Diplomatic", tone: "diplomatic", description: "Tactful and considerate" },
    ],
    defaults: { tone: "professional", style: "concise", length: "short", formality: "formal" },
    helpText: "Paste the conversation and write what you want to say.",
    visible: true,
    order: 1,
  },
  academic: {
    id: "academic",
    label: "Academic",
    description: "College, school, and education communication.",
    icon: "📚",
    recommendedTones: ["professional", "respectful", "clear_direct", "formal"],
    quickGoals: [
      { label: "Ask professor", goal: "ask_professor", description: "Question or request to faculty" },
      { label: "Request extension", goal: "request_extension", description: "Ask for deadline extension" },
      { label: "Project update", goal: "project_update", description: "Update on group project" },
      { label: "Teammate message", goal: "team_communication", description: "Message to project teammates" },
    ],
    quickActions: [
      { label: "Professional", tone: "professional", description: "Academic and respectful" },
      { label: "Respectful", tone: "respectful", description: "Polite and considerate" },
      { label: "Clear", tone: "clear_direct", description: "Direct and unambiguous" },
      { label: "Formal", tone: "formal", description: "Proper academic tone" },
    ],
    defaults: { tone: "professional", style: "formal", length: "medium", formality: "formal" },
    helpText: "Write your message to professors, teammates, or classmates.",
    visible: true,
    order: 2,
  },
  career: {
    id: "career",
    label: "Career",
    description: "Interviews, recruiters, and job applications.",
    icon: "🎯",
    recommendedTones: ["professional", "confident", "warm", "concise"],
    quickGoals: [
      { label: "Recruiter reply", goal: "recruiter_reply", description: "Respond to a recruiter" },
      { label: "Interview follow-up", goal: "interview_followup", description: "Thank you or follow-up" },
      { label: "Networking", goal: "networking", description: "Professional networking message" },
      { label: "Application message", goal: "application_message", description: "Job application communication" },
      { label: "Salary discussion", goal: "salary_discussion", description: "Compensation conversation" },
    ],
    quickActions: [
      { label: "Professional", tone: "professional", description: "Polished and competent" },
      { label: "Confident", tone: "confident", description: "Self-assured without arrogance" },
      { label: "Warm", tone: "warm", description: "Friendly but professional" },
      { label: "Concise", tone: "concise", description: "Brief and impactful" },
    ],
    defaults: { tone: "professional", style: "confident", length: "medium", formality: "formal" },
    helpText: "Write your message to recruiters, interviewers, or hiring managers.",
    visible: true,
    order: 3,
  },
  social: {
    id: "social",
    label: "Social",
    description: "Friends, casual conversations, and networking.",
    icon: "👥",
    recommendedTones: ["friendly", "casual", "warm", "humorous"],
    quickGoals: [
      { label: "Catch up", goal: "catch_up", description: "Reconnect with someone" },
      { label: "Invitation", goal: "invitation", description: "Invite to an event" },
      { label: "Casual reply", goal: "reply_casually", description: "Easy-going response" },
      { label: "Apology", goal: "apologize", description: "Sincere apology" },
    ],
    quickActions: [
      { label: "Friendly", tone: "friendly", description: "Warm and approachable" },
      { label: "Casual", tone: "casual", description: "Relaxed and easy-going" },
      { label: "Warm", tone: "warm", description: "Genuine and caring" },
      { label: "Humorous", tone: "humorous", description: "Light and fun" },
    ],
    defaults: { tone: "friendly", style: "casual", length: "medium", formality: "informal" },
    helpText: "Write naturally — NextMsg helps you keep the conversation flowing.",
    visible: true,
    order: 4,
  },
  dating: {
    id: "dating",
    label: "Dating",
    description: "Natural, playful, or flirty conversations.",
    icon: "💬",
    recommendedTones: ["natural", "playful", "flirty", "confident", "warm"],
    quickGoals: [
      { label: "Start conversation", goal: "start_conversation", description: "Open a new conversation" },
      { label: "Continue chat", goal: "continue_conversation", description: "Keep the conversation going" },
      { label: "Playful response", goal: "playful_response", description: "Light and fun reply" },
      { label: "Express interest", goal: "show_interest", description: "Show genuine interest" },
      { label: "Clarify plans", goal: "clarify_plans", description: "Confirm or suggest plans" },
    ],
    quickActions: [
      { label: "Natural", tone: "natural", description: "Authentic and relaxed" },
      { label: "Playful", tone: "playful", description: "Fun and light-hearted" },
      { label: "Flirty", tone: "flirty", description: "Charming and interested" },
      { label: "Confident", tone: "confident", description: "Self-assured and genuine" },
    ],
    defaults: { tone: "natural", style: "casual", length: "short", formality: "informal" },
    helpText: "Write your draft naturally — NextMsg will help you match the conversation.",
    visible: true,
    order: 5,
  },
  conflict: {
    id: "conflict",
    label: "Conflict",
    description: "Disagreements, misunderstandings, and boundaries.",
    icon: "⚖️",
    recommendedTones: ["diplomatic", "calm", "assertive", "empathetic"],
    quickGoals: [
      { label: "De-escalate", goal: "de_escalate", description: "Reduce tension" },
      { label: "Clarify", goal: "clarify", description: "Clear up misunderstanding" },
      { label: "Defend position", goal: "defend_position", description: "Stand your ground respectfully" },
      { label: "Set boundary", goal: "set_boundary", description: "Establish a clear boundary" },
      { label: "Find solution", goal: "resolve_conflict", description: "Work toward resolution" },
    ],
    quickActions: [
      { label: "Diplomatic", tone: "diplomatic", description: "Tactful and measured" },
      { label: "Calm", tone: "calm", description: "Composed and level-headed" },
      { label: "Assertive", tone: "assertive", description: "Direct and firm" },
      { label: "De-escalate", tone: "de_escalate", description: "Reduce tension" },
    ],
    defaults: { tone: "calm", style: "diplomatic", length: "medium", formality: "contextual" },
    helpText: "Write what you're thinking of sending. We'll check how it may come across.",
    visible: true,
    order: 6,
  },
  negotiation: {
    id: "negotiation",
    label: "Negotiation",
    description: "Persuasion, trade-offs, and requests.",
    icon: "🤝",
    recommendedTones: ["persuasive", "direct", "professional", "confident"],
    quickGoals: [
      { label: "Persuade", goal: "persuade", description: "Make a compelling case" },
      { label: "Propose", goal: "propose", description: "Present an offer or idea" },
      { label: "Compromise", goal: "compromise", description: "Find middle ground" },
      { label: "Counteroffer", goal: "counteroffer", description: "Respond with alternative terms" },
      { label: "Ask flexibility", goal: "ask_flexibility", description: "Request accommodation" },
    ],
    quickActions: [
      { label: "Persuasive", tone: "persuasive", description: "Compelling and evidence-based" },
      { label: "Direct", tone: "direct", description: "Straightforward and clear" },
      { label: "Professional", tone: "professional", description: "Business-appropriate" },
      { label: "Confident", tone: "confident", description: "Self-assured" },
    ],
    defaults: { tone: "persuasive", style: "direct", length: "medium", formality: "formal" },
    helpText: "Write your proposal or response. We'll help you find the right balance.",
    visible: true,
    order: 7,
  },
  customer: {
    id: "customer",
    label: "Customer",
    description: "Support, complaints, and service communication.",
    icon: "🎧",
    recommendedTones: ["clear_direct", "professional", "empathetic", "concise"],
    quickGoals: [
      { label: "Complaint", goal: "complaint", description: "Report an issue" },
      { label: "Request resolution", goal: "request_resolution", description: "Ask for a fix" },
      { label: "Apology", goal: "apology", description: "Apologize for a service issue" },
      { label: "Follow-up", goal: "follow_up", description: "Check on status" },
      { label: "Escalation", goal: "escalation", description: "Escalate to supervisor" },
    ],
    quickActions: [
      { label: "Clear", tone: "clear_direct", description: "Direct and factual" },
      { label: "Professional", tone: "professional", description: "Business-appropriate" },
      { label: "Empathetic", tone: "empathetic", description: "Understanding" },
      { label: "Concise", tone: "concise", description: "Brief and to the point" },
    ],
    defaults: { tone: "professional", style: "clear_direct", length: "medium", formality: "formal" },
    helpText: "Describe your issue clearly. We'll help you communicate effectively.",
    visible: true,
    order: 8,
  },
  family: {
    id: "family",
    label: "Family",
    description: "Family communication.",
    icon: "🏠",
    recommendedTones: ["warm", "empathetic", "natural", "calm"],
    quickGoals: [
      { label: "Check in", goal: "check_in", description: "See how they're doing" },
      { label: "Make plans", goal: "make_plans", description: "Coordinate family plans" },
      { label: "Express concern", goal: "express_concern", description: "Show you care" },
      { label: "Set boundary", goal: "set_boundary", description: "Establish a boundary respectfully" },
    ],
    quickActions: [
      { label: "Warm", tone: "warm", description: "Genuine and caring" },
      { label: "Empathetic", tone: "empathetic", description: "Understanding" },
      { label: "Natural", tone: "natural", description: "Authentic" },
      { label: "Calm", tone: "calm", description: "Composed" },
    ],
    defaults: { tone: "warm", style: "natural", length: "medium", formality: "informal" },
    helpText: "Write naturally — family conversations are about connection.",
    visible: true,
    order: 9,
  },
  group: {
    id: "group",
    label: "Group",
    description: "Multi-person conversations.",
    icon: "👥",
    recommendedTones: ["professional", "friendly", "clear_direct", "diplomatic"],
    quickGoals: [
      { label: "Coordinate", goal: "coordinate", description: "Organize group activity" },
      { label: "Update group", goal: "update_group", description: "Share information" },
      { label: "Resolve group issue", goal: "resolve_group_issue", description: "Address group concern" },
    ],
    quickActions: [
      { label: "Clear", tone: "clear_direct", description: "Easy to follow" },
      { label: "Professional", tone: "professional", description: "Polished" },
      { label: "Friendly", tone: "friendly", description: "Approachable" },
      { label: "Diplomatic", tone: "diplomatic", description: "Considerate of all" },
    ],
    defaults: { tone: "friendly", style: "clear_direct", length: "medium", formality: "contextual" },
    helpText: "Write for the group. Consider all participants.",
    visible: true,
    order: 10,
  },
  recovery: {
    id: "recovery",
    label: "Recovery",
    description: "Mistakes, delays, and rescheduling.",
    icon: "🔄",
    recommendedTones: ["empathetic", "professional", "clear_direct", "calm"],
    quickGoals: [
      { label: "Explain honestly", goal: "explain_honestly", description: "Be transparent about what happened" },
      { label: "Apologize", goal: "apologize", description: "Sincere apology" },
      { label: "Request extension", goal: "request_extension", description: "Ask for more time" },
      { label: "Reschedule", goal: "reschedule", description: "Propose new time" },
      { label: "Correct mistake", goal: "correct_mistake", description: "Fix what went wrong" },
      { label: "Ask another chance", goal: "ask_another_chance", description: "Request opportunity to retry" },
    ],
    quickActions: [
      { label: "Honest", tone: "clear_direct", description: "Transparent and factual" },
      { label: "Empathetic", tone: "empathetic", description: "Acknowledging impact" },
      { label: "Professional", tone: "professional", description: "Business-appropriate" },
      { label: "Calm", tone: "calm", description: "Composed" },
    ],
    defaults: { tone: "empathetic", style: "clear_direct", length: "medium", formality: "contextual" },
    helpText: "Tell us what happened and what you need to communicate.",
    visible: true,
    order: 11,
  },
  general: {
    id: "general",
    label: "General",
    description: "Anything else.",
    icon: "✨",
    recommendedTones: ["natural", "friendly", "casual", "professional"],
    quickGoals: [
      { label: "Reply casually", goal: "reply_casually", description: "Easy-going response" },
      { label: "Continue conversation", goal: "continue_conversation", description: "Keep it going" },
      { label: "Ask question", goal: "ask_clarification", description: "Get more information" },
    ],
    quickActions: [
      { label: "Natural", tone: "natural", description: "Authentic and relaxed" },
      { label: "Friendly", tone: "friendly", description: "Warm and approachable" },
      { label: "Casual", tone: "casual", description: "Relaxed" },
      { label: "Professional", tone: "professional", description: "Polished" },
    ],
    defaults: { tone: "natural", style: "balanced", length: "medium", formality: "contextual" },
    helpText: "Write what you want to say. We'll help you say it well.",
    visible: true,
    order: 12,
  },
};

// ─── Mode Detection ────────────────────────────────────────────────────────────
//
// Maps existing intelligence types to CommunicationMode.
// This is a mapping layer, NOT a new detection engine.
// ──────────────────────────────────────────────────────────────────────────────

const RELATIONSHIP_TO_MODE: Partial<Record<string, CommunicationMode>> = {
  manager: "work",
  employee: "work",
  coworker: "work",
  teammate: "work",
  client: "work",
  professor: "academic",
  student: "academic",
  classmate: "academic",
  interviewer: "career",
  candidate: "career",
  recruiter: "career",
  customer: "customer",
  friend: "social",
  stranger: "social",
  family: "family",
  partner: "dating",
  date: "dating",
  romantic_interest: "dating",
  group: "group",
};

const SITUATION_TO_MODE: Partial<Record<string, CommunicationMode>> = {
  late_submission: "recovery",
  missed_deadline: "recovery",
  missed_interview: "recovery",
  late_arrival: "recovery",
  missed_meeting: "recovery",
  delayed_response: "recovery",
  missed_call: "recovery",
  wrong_file: "recovery",
  misunderstanding: "conflict",
  disagreement: "conflict",
  heated_argument: "conflict",
  personal_conflict: "conflict",
  customer_complaint: "customer",
  negotiation: "negotiation",
  request: "general",
  apology: "recovery",
  rejection: "dating",
  romantic_interest: "dating",
  casual_chat: "social",
  professional_feedback: "work",
  performance_issue: "work",
  scheduling_problem: "work",
  follow_up: "general",
  request_for_help: "general",
  boundary_setting: "conflict",
  reconnecting: "social",
  unknown: "general",
};

const INTENT_TO_MODE: Partial<Record<string, CommunicationMode>> = {
  de_escalate: "conflict",
  resolve_conflict: "conflict",
  set_boundary: "conflict",
  defend_position: "conflict",
  negotiate: "negotiation",
  persuade: "negotiation",
  convince: "negotiation",
  recover_from_mistake: "recovery",
  ask_for_extension: "recovery",
  ask_for_reschedule: "recovery",
  flirt: "dating",
  show_interest: "dating",
  impress: "dating",
  start_conversation: "dating",
  continue_conversation: "social",
  reply_casually: "social",
  comfort: "family",
  reassure: "family",
  follow_up: "work",
  request: "general",
  explain: "general",
  apologize: "recovery",
  clarify: "general",
  decline: "general",
  accept: "general",
  reply: "general",
  make_them_laugh: "dating",
  end_conversation: "general",
  unknown: "general",
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect the most likely CommunicationMode from ConversationState.
 * Returns the mode and a confidence score.
 */
export function detectModeFromState(
  state: ConversationState
): ModeRecommendation {
  const scores: Partial<Record<CommunicationMode, number>> = {};

  // Relationship signal (strong)
  const relMode = RELATIONSHIP_TO_MODE[state.relationship];
  if (relMode && relMode !== "general") {
    scores[relMode] = (scores[relMode] || 0) + 0.4;
  }

  // Situation signal (strong)
  const sitMode = SITUATION_TO_MODE[state.context.situation];
  if (sitMode && sitMode !== "general") {
    scores[sitMode] = (scores[sitMode] || 0) + 0.35;
  }

  // Intent signal (moderate)
  const intentMode = INTENT_TO_MODE[state.intent.userIntent];
  if (intentMode && intentMode !== "general") {
    scores[intentMode] = (scores[intentMode] || 0) + 0.25;
  }

  // Group detection
  if (state.participants.isGroup) {
    scores["group"] = (scores["group"] || 0) + 0.3;
  }

  // Find the mode with the highest score
  let bestMode: CommunicationMode = "general";
  let bestScore = 0;

  for (const [mode, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestMode = mode as CommunicationMode;
      bestScore = score;
    }
  }

  // Build reason
  const reasons: string[] = [];
  if (relMode && relMode !== "general") {
    reasons.push(`relationship is ${state.relationship}`);
  }
  if (sitMode && sitMode !== "general") {
    reasons.push(`situation is ${state.context.situation}`);
  }
  if (intentMode && intentMode !== "general") {
    reasons.push(`intent is ${state.intent.userIntent}`);
  }
  if (state.participants.isGroup) {
    reasons.push("group conversation detected");
  }

  const confidence = Math.min(bestScore, 1.0);

  if (bestMode === "general" || confidence < 0.25) {
    return {
      mode: "general",
      confidence: Math.max(confidence, 0.1),
      reason: reasons.length > 0 ? reasons.join("; ") : "Insufficient context to identify a specific mode",
    };
  }

  return {
    mode: bestMode,
    confidence,
    reason: reasons.join("; "),
  };
}

/**
 * Detect mode from raw ConversationIntelligence (before state resolution).
 */
export function detectModeFromIntelligence(
  intel: ConversationIntelligence
): ModeRecommendation {
  const scores: Partial<Record<CommunicationMode, number>> = {};

  const relMode = RELATIONSHIP_TO_MODE[intel.relationship];
  if (relMode && relMode !== "general") {
    scores[relMode] = (scores[relMode] || 0) + 0.4;
  }

  const sitMode = SITUATION_TO_MODE[intel.situation];
  if (sitMode && sitMode !== "general") {
    scores[sitMode] = (scores[sitMode] || 0) + 0.35;
  }

  const intentMode = INTENT_TO_MODE[intel.userIntent];
  if (intentMode && intentMode !== "general") {
    scores[intentMode] = (scores[intentMode] || 0) + 0.25;
  }

  if (intel.participants?.count > 2) {
    scores["group"] = (scores["group"] || 0) + 0.3;
  }

  let bestMode: CommunicationMode = "general";
  let bestScore = 0;
  for (const [mode, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestMode = mode as CommunicationMode;
      bestScore = score;
    }
  }

  const confidence = Math.min(bestScore, 1.0);

  if (bestMode === "general" || confidence < 0.3) {
    return {
      mode: "general",
      confidence: Math.max(confidence, 0.1),
      reason: "Insufficient context to identify a specific mode",
    };
  }

  const reasons: string[] = [];
  if (relMode && relMode !== "general") reasons.push(`relationship is ${intel.relationship}`);
  if (sitMode && sitMode !== "general") reasons.push(`situation is ${intel.situation}`);
  if (intentMode && intentMode !== "general") reasons.push(`intent is ${intel.userIntent}`);

  return { mode: bestMode, confidence, reason: reasons.join("; ") };
}

/**
 * Check if there's a conflict between selected mode and detected context.
 */
export function detectModeConflict(
  selectedMode: CommunicationMode,
  detectedMode: CommunicationMode,
  confidence: number
): ModeConflict | null {
  if (selectedMode === "auto" || selectedMode === detectedMode) {
    return null;
  }

  if (confidence < 0.5) {
    return null;
  }

  return {
    selectedMode,
    detectedMode,
    confidence,
    reason: `Your selected mode "${selectedMode}" doesn't match the detected context "${detectedMode}".`,
  };
}

/**
 * Get mode-specific defaults, merged with user preferences.
 * Mode defaults provide a starting point; user preferences override.
 */
export function getModeDefaults(mode: CommunicationMode) {
  return MODE_CONFIGS[mode]?.defaults || MODE_CONFIGS.general.defaults;
}

/**
 * Apply mode context to a ConversationState's context type.
 * Returns a new context type string that incorporates the mode.
 */
export function applyModeToContext(
  mode: CommunicationMode,
  currentState: ConversationState
): string {
  if (mode === "auto" || mode === "general") {
    return currentState.context.type;
  }
  return mode;
}

/**
 * Check if a mode switch should invalidate downstream state.
 * Mode changes should invalidate: coaching, impact, improvement, pre-send.
 * Mode changes should NOT invalidate: conversation, draft, personalization.
 */
export function shouldInvalidateOnModeSwitch(
  oldMode: CommunicationMode,
  newMode: CommunicationMode
): boolean {
  return oldMode !== newMode;
}

// ─── Effective Mode Resolution ─────────────────────────────────────────────────
//
// Thin precedence helper over existing ModeSelection / ModeRecommendation.
// Does NOT create a ModeState or parallel detection engine.
//
// Precedence (safety/semantic integrity always wins):
//   1. Explicit current mode selection (manual, non-auto)
//   2. Current explicit user instruction (when safe)
//   3. Current conversation context (recommendation)
//   4. Workspace context
//   5. Effective preferences
//   6. Defaults (general)
// ──────────────────────────────────────────────────────────────────────────────

export interface ModeResolutionInput {
  selectedMode: CommunicationMode;
  source?: ModeSelection["source"];
  overrideInstruction?: string | null;
  recommendation?: ModeRecommendation | null;
  workspaceMode?: CommunicationMode | null;
  preferenceMode?: CommunicationMode | null;
}

export interface ModeResolutionResult {
  mode: CommunicationMode;
  source: ModeSelection["source"];
  appliedInstruction: string | null;
  instructionBlocked: boolean;
  conflict: ModeConflict | null;
}

const UNSAFE_INSTRUCTION_PATTERNS = [
  /\bgaslight\b/i,
  /\bmanipulate\b/i,
  /\bdeceiv(?:e|ing)\b/i,
  /\blie\b(?:\s+to|\s+about)/i,
  /\bharass\b/i,
  /\bstalk\b/i,
  /\bthreaten\b/i,
  /\bblackmail\b/i,
  /\bwithout\s+(?:their|his|her)\s+consent\b/i,
];

const INSTRUCTION_MODE_HINTS: Array<{ pattern: RegExp; mode: CommunicationMode }> = [
  { pattern: /\bflirt(?:y|ing)?\b/i, mode: "dating" },
  { pattern: /\bromantic\b/i, mode: "dating" },
  { pattern: /\bdating\b/i, mode: "dating" },
  { pattern: /\bprofessional\b/i, mode: "work" },
  { pattern: /\bformal\b/i, mode: "work" },
  { pattern: /\binterview\b/i, mode: "career" },
  { pattern: /\bcareer\b/i, mode: "career" },
  { pattern: /\bapolog(?:y|ize|ise)\b/i, mode: "recovery" },
  { pattern: /\bde[- ]?escalat/i, mode: "conflict" },
  { pattern: /\bnegotiat/i, mode: "negotiation" },
  { pattern: /\bcustomer\b|\bcomplaint\b|\bsupport ticket\b/i, mode: "customer" },
  { pattern: /\bfamily\b/i, mode: "family" },
  { pattern: /\bacademic\b|\bthesis\b|\bprofessor\b/i, mode: "academic" },
];

export function isSafeModeInstruction(instruction: string | null | undefined): boolean {
  if (!instruction || !instruction.trim()) return true;
  return !UNSAFE_INSTRUCTION_PATTERNS.some((re) => re.test(instruction));
}

export function inferModeFromInstruction(
  instruction: string | null | undefined
): CommunicationMode | null {
  if (!instruction || !instruction.trim()) return null;
  if (!isSafeModeInstruction(instruction)) return null;
  for (const hint of INSTRUCTION_MODE_HINTS) {
    if (hint.pattern.test(instruction)) return hint.mode;
  }
  return null;
}

/**
 * Resolve the effective communication mode using documented precedence.
 * Manual session selection does not become a permanent preference.
 */
export function resolveEffectiveMode(input: ModeResolutionInput): ModeResolutionResult {
  const selected = input.selectedMode || "auto";
  const instruction = input.overrideInstruction?.trim() || null;
  const instructionSafe = isSafeModeInstruction(instruction);
  const instructionBlocked = Boolean(instruction) && !instructionSafe;
  const inferredFromInstruction =
    instruction && instructionSafe ? inferModeFromInstruction(instruction) : null;

  const recommendation = input.recommendation;
  const detectedMode = recommendation?.mode ?? "general";
  const detectedConfidence = recommendation?.confidence ?? 0;

  // 1. Explicit manual mode selection (non-auto)
  if (selected !== "auto") {
    const conflict = detectModeConflict(selected, detectedMode, detectedConfidence);
    return {
      mode: selected,
      source: input.source === "workspace" ? "workspace" : "manual",
      appliedInstruction: instructionSafe ? instruction : null,
      instructionBlocked,
      conflict,
    };
  }

  // 2. Safe explicit instruction (when in Auto)
  if (inferredFromInstruction) {
    return {
      mode: inferredFromInstruction,
      source: "instruction",
      appliedInstruction: instruction,
      instructionBlocked: false,
      conflict: detectModeConflict(inferredFromInstruction, detectedMode, detectedConfidence),
    };
  }

  // 3. Conversation context / recommendation
  if (recommendation && recommendation.mode !== "general" && detectedConfidence >= 0.5) {
    return {
      mode: recommendation.mode,
      source: "auto",
      appliedInstruction: instructionSafe ? instruction : null,
      instructionBlocked,
      conflict: null,
    };
  }

  // 4. Workspace context
  if (input.workspaceMode && input.workspaceMode !== "auto") {
    return {
      mode: input.workspaceMode,
      source: "workspace",
      appliedInstruction: instructionSafe ? instruction : null,
      instructionBlocked,
      conflict: detectModeConflict(input.workspaceMode, detectedMode, detectedConfidence),
    };
  }

  // 5. Effective preferences
  if (input.preferenceMode && input.preferenceMode !== "auto") {
    return {
      mode: input.preferenceMode,
      source: "auto",
      appliedInstruction: instructionSafe ? instruction : null,
      instructionBlocked,
      conflict: null,
    };
  }

  // 6. Defaults
  return {
    mode: recommendation?.mode || "general",
    source: "auto",
    appliedInstruction: instructionSafe ? instruction : null,
    instructionBlocked,
    conflict: null,
  };
}
