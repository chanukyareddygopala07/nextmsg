// ─── Conversation Coaching Engine ─────────────────────────────────────────────
//
// Deterministic coaching engine that helps users understand what to do next
// in a conversation. Consumes ConversationState, ConflictIntelligence,
// SituationRecovery, PersuasionEngine, DraftAnalysis, and ImpactPrediction
// to produce actionable next-move guidance.
//
// Core Principle:
//   UNDERSTAND → ADVISE → EXPLAIN → OPTIONALLY RESPOND
//   Never fabricate excuses, facts, deadlines, or recommendations.
//
// Design:
//   - Deterministic rules (no additional AI call)
//   - Each rule evaluates independently
//   - Final coaching = highest priority matching rule
//   - Fallback to natural conversation guidance
// ──────────────────────────────────────────────────────────────────────────────

import type { ConversationState } from "./conversation-state";
import type { ConflictStructure, ParticipantIntelligence } from "./participant-intelligence";
import type { SituationRecovery } from "./situation-recovery";
import type { PersuasionEngine } from "./persuasion";
import type { DraftAnalysis } from "./draft-types";
import type { CommunicationImpactPrediction } from "./impact-types";
import type { StrategyRecommendation } from "./strategy";
import type { CommunicationStrategy } from "./intelligence";
import type {
  ConversationCoachingResult,
  CoachingInput,
  CoachingSignals,
  NextMove,
  TimingGuidance,
  ResponseGuidance,
  CoachingPriority,
  ContextSummary,
  NextMoveAction,
  TimingWhen,
} from "./coaching-types";

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function coachConversation(
  state: ConversationState,
  input?: CoachingInput,
  conflictStructure?: ConflictStructure | null,
  recovery?: SituationRecovery | null,
  persuasion?: PersuasionEngine | null,
  draftAnalysis?: DraftAnalysis | null,
  impact?: CommunicationImpactPrediction | null,
  strategies?: StrategyRecommendation[],
  participants?: ParticipantIntelligence[]
): ConversationCoachingResult {
  const signals = extractSignals(state, input, conflictStructure, participants);
  const responseNeeded = determineResponseNeeded(signals, state);
  const nextMove = determineNextMove(signals, state, recovery, participants);
  const timing = determineTiming(signals, state, nextMove.action);
  const responseGuidance = responseNeeded
    ? buildResponseGuidance(nextMove, state, recovery, persuasion, strategies)
    : buildNoResponseGuidance(nextMove, state);
  const avoid = buildAvoidList(nextMove.action, state, conflictStructure, recovery);
  const priority = assessPriority(signals, nextMove.action);
  const contextSummary = buildContextSummary(state, conflictStructure);
  const followUpSuggestions = buildFollowUpSuggestions(nextMove.action, state, recovery);
  const confidence = calculateConfidence(signals, state, nextMove.action);
  const reasoning = buildReasoning(nextMove, signals, state, responseNeeded);

  return {
    nextMove,
    timing,
    responseGuidance,
    avoid,
    confidence,
    reasoning,
    priority,
    contextSummary,
    followUpSuggestions,
    responseNeeded,
  };
}

// ─── Signal Extraction ───────────────────────────────────────────────────────

function extractSignals(
  state: ConversationState,
  input: CoachingInput | undefined,
  conflictStructure: ConflictStructure | null | undefined,
  participants: ParticipantIntelligence[] | undefined
): CoachingSignals {
  const { conflict, dynamics, emotion, context, intent } = state;

  // Urgency: conflict level + context urgency + emotional intensity
  let urgencyScore = 0;
  urgencyScore += conflict.level * 0.3;
  urgencyScore += conflict.escalation * 0.2;
  urgencyScore += state.emotion.intensity * 0.15;
  if (context.urgency === "urgent") urgencyScore += 0.25;
  else if (context.urgency === "high") urgencyScore += 0.15;
  urgencyScore = Math.min(1, urgencyScore);

  // Conflict score
  const conflictScore = Math.min(1, conflict.level * 0.6 + conflict.escalation * 0.4);

  // Engagement: reciprocity + cooperation
  const engagementScore = Math.min(1,
    (dynamics.reciprocity + dynamics.cooperation + dynamics.responsiveness) / 3
  );

  // Recency: high if recent messages, low if conversation has stalled
  const recencyScore = dynamics.responsiveness > 0.5 ? 0.8 : 0.3;

  // Direct question detection (check last message from other person)
  const lastMessage = state.participants.others.length > 0;
  const hasDirectQuestion = detectDirectQuestion(participants);

  // Unresolved issue
  const hasUnresolvedIssue = !!(
    conflictStructure?.unresolvedQuestions.length ||
    conflictStructure?.misunderstandings.length ||
    conflict.coreDisagreement
  );

  // User owes a response (they haven't replied to a recent message)
  const owesResponse = detectOwesResponse(state, dynamics);

  // Deadline or commitment
  const hasDeadline = detectDeadline(state);

  return {
    urgencyScore,
    conflictScore,
    engagementScore,
    recencyScore,
    hasDirectQuestion,
    hasUnresolvedIssue,
    owesResponse,
    hasDeadline,
  };
}

function detectDirectQuestion(participants: ParticipantIntelligence[] | undefined): boolean {
  if (!participants || participants.length === 0) return false;

  for (const p of participants) {
    if (p.intent === "ask" || p.intent === "request_information") {
      return true;
    }
    if (p.requests.length > 0) return true;
  }
  return false;
}

function detectOwesResponse(
  state: ConversationState,
  dynamics: ConversationState["dynamics"]
): boolean {
  // If reciprocity is low, user may owe a response
  if (dynamics.reciprocity < 0.3 && dynamics.responsiveness > 0.5) return true;

  // If it's a professional context, always owe a response
  if (state.context.type === "professional" || state.context.type === "interview") return true;

  // If there's a clear situation requiring response
  if (
    state.context.situation === "late_submission" ||
    state.context.situation === "missed_deadline" ||
    state.context.situation === "customer_complaint" ||
    state.context.situation === "missed_meeting" ||
    state.context.situation === "wrong_file"
  ) return true;

  return false;
}

function detectDeadline(state: ConversationState): boolean {
  const deadlineSituations: string[] = [
    "late_submission",
    "missed_deadline",
    "late_arrival",
    "missed_interview",
    "missed_meeting",
    "wrong_file",
    "scheduling_problem",
  ];
  return deadlineSituations.includes(state.context.situation);
}

// ─── Response Needed ─────────────────────────────────────────────────────────

function determineResponseNeeded(
  signals: CoachingSignals,
  state: ConversationState
): boolean {
  // Always respond if there's a direct question
  if (signals.hasDirectQuestion) return true;

  // Always respond in professional context
  if (state.context.type === "professional" || state.context.type === "interview") return true;

  // Respond if there's an unresolved issue
  if (signals.hasUnresolvedIssue) return true;

  // Respond if the other person expressed emotion
  if (
    state.emotion.primary === "angry" ||
    state.emotion.primary === "frustrated" ||
    state.emotion.primary === "sad" ||
    state.emotion.primary === "disappointed"
  ) return true;

  // Respond if there's a deadline
  if (signals.hasDeadline) return true;

  // Respond if conflict is elevated
  if (signals.conflictScore > 0.4) return true;

  // Respond if user owes a response
  if (signals.owesResponse) return true;

  // Respond in high-urgency situations
  if (signals.urgencyScore > 0.6) return true;

  // Respond in dating/friendship contexts (social expectations)
  if (state.context.type === "dating" || state.context.type === "friendship") return true;

  // Respond in family context
  if (state.context.type === "family") return true;

  return false;
}

// ─── Next Move Determination ─────────────────────────────────────────────────

function determineNextMove(
  signals: CoachingSignals,
  state: ConversationState,
  recovery: SituationRecovery | null | undefined,
  participants: ParticipantIntelligence[] | undefined
): NextMove {
  const { conflict, dynamics, emotion, intent, context } = state;

  // ── Priority 1: High conflict → de-escalate ──
  if (signals.conflictScore > 0.7) {
    return buildNextMove(
      "de_escalate",
      "The conversation is highly charged. Focus on lowering tension before addressing the issue.",
      "de_escalate",
      getDeEscalateExample(state)
    );
  }

  // ── Priority 2: Personal attacks → set boundary ──
  if (conflict.personalAttacks) {
    return buildNextMove(
      "set_boundary",
      "Personal attacks are happening. Set a clear boundary while staying calm.",
      "boundary_setting",
      getBoundaryExample(state)
    );
  }

  // ── Priority 3: User wants to apologize / recovery ──
  if (recovery && recovery.accountabilityLevel === "full") {
    return buildNextMove(
      "apologize",
      recovery.recommendedApproach,
      recovery.recommendedStrategies[0] || "accountable",
      recovery.candidateGuidance[0]?.example
    );
  }

  // ── Priority 4: Direct question from other person ──
  if (signals.hasDirectQuestion) {
    const question = findDirectQuestion(participants);
    return buildNextMove(
      "respond",
      question
        ? `They asked: "${question}". Provide a clear, direct answer.`
        : "They asked a question. Provide a clear, direct answer.",
      "clear_direct"
    );
  }

  // ── Priority 5: Misunderstanding → clarify ──
  if (conflict.misunderstanding) {
    return buildNextMove(
      "clarify",
      "There's a misunderstanding. Clarify your position clearly and calmly.",
      "clarifying"
    );
  }

  // ── Priority 6: Angry/frustrated other person → acknowledge ──
  if (emotion.primary === "angry" || emotion.primary === "frustrated") {
    return buildNextMove(
      "acknowledge",
      `The other person is ${emotion.primary}. Acknowledge their feelings before presenting your perspective.`,
      "empathetic"
    );
  }

  // ── Priority 7: Sad/disappointed other person → comfort ──
  if (emotion.primary === "sad" || emotion.primary === "disappointed") {
    return buildNextMove(
      "comfort",
      `The other person seems ${emotion.primary}. Offer support and understanding.`,
      "empathetic"
    );
  }

  // ── Priority 8: Anxious/nervous other person → reassure ──
  if (emotion.primary === "anxious" || emotion.primary === "nervous") {
    return buildNextMove(
      "reassure",
      "The other person is anxious. Provide reassurance and clarity.",
      "reassuring"
    );
  }

  // ── Priority 9: High pressure → set boundary ──
  if (dynamics.pressure > 0.7) {
    return buildNextMove(
      "set_boundary",
      "There's excessive pressure. Set a clear boundary to protect your position.",
      "boundary_setting"
    );
  }

  // ── Priority 10: Negotiation situation → negotiate ──
  if (context.situation === "negotiation" || intent.userIntent === "negotiate") {
    return buildNextMove(
      "negotiate",
      "Present your position with clear reasoning. Offer alternatives and show flexibility.",
      "negotiation"
    );
  }

  // ── Priority 11: Persuasion situation → persuade ──
  if (intent.userIntent === "persuade" || intent.userIntent === "convince") {
    return buildNextMove(
      "persuade",
      "Build your case with evidence and mutual benefit. Be specific about your request.",
      "persuasive"
    );
  }

  // ── Priority 12: Explain position → explain ──
  if (intent.userIntent === "explain") {
    return buildNextMove(
      "explain",
      "Present your perspective clearly. Use 'I' statements and be specific.",
      "clear_direct"
    );
  }

  // ── Priority 13: Deadline situation → respond with accountability ──
  if (signals.hasDeadline) {
    return buildNextMove(
      "respond",
      "A deadline or commitment needs attention. Acknowledge and propose next steps.",
      "accountable"
    );
  }

  // ── Priority 14: High engagement, casual → continue naturally ──
  if (signals.engagementScore > 0.6 && context.type !== "professional") {
    return buildNextMove(
      "respond",
      "The conversation is flowing well. Continue naturally and match their energy.",
      "natural"
    );
  }

  // ── Priority 15: Disagreement → find common ground ──
  if (context.situation === "disagreement" || context.situation === "heated_argument") {
    return buildNextMove(
      "clarify",
      "There's a disagreement. Acknowledge their perspective and clarify your position.",
      "diplomatic"
    );
  }

  // ── Priority 16: Change topic if stuck ──
  if (dynamics.engagement < 0.3 && dynamics.uncertainty > 0.5) {
    return buildNextMove(
      "change_topic",
      "The conversation has stalled. Try a natural topic shift.",
      "natural"
    );
  }

  // ── Priority 17: Professional context → formal response ──
  if (context.type === "professional" || context.type === "interview") {
    return buildNextMove(
      "respond",
      "Respond professionally and concisely. Focus on the key point.",
      "professional"
    );
  }

  // ── Priority 18: Dating context → natural/flirty ──
  if (context.type === "dating") {
    return buildNextMove(
      "respond",
      "Keep it light and natural. Show genuine interest.",
      "natural"
    );
  }

  // ── Default: natural response ──
  return buildNextMove(
    "respond",
    "Continue the conversation naturally. Match their tone and energy.",
    "natural"
  );
}

function buildNextMove(
  action: NextMoveAction,
  description: string,
  strategy: CommunicationStrategy,
  example?: string
): NextMove {
  return { action, description, strategy, example };
}

function findDirectQuestion(participants: ParticipantIntelligence[] | undefined): string | null {
  if (!participants) return null;
  for (const p of participants) {
    for (const req of p.requests) {
      if (req.includes("?")) return req;
    }
    if (p.intent === "ask" && p.concerns.length > 0) {
      return p.concerns[0];
    }
  }
  return null;
}

// ─── Timing ──────────────────────────────────────────────────────────────────

function determineTiming(
  signals: CoachingSignals,
  state: ConversationState,
  action: NextMoveAction
): TimingGuidance {
  const { context, conflict, dynamics } = state;

  // No response needed → no timing
  if (action === "wait" || action === "take_break") {
    return {
      when: "wait_for_right_moment",
      urgency: 0.1,
      explanation: "This isn't the right moment. Wait for the situation to settle.",
    };
  }

  // Urgent conflict → immediately
  if (signals.urgencyScore > 0.7 || signals.conflictScore > 0.7) {
    return {
      when: "immediately",
      urgency: Math.min(1, signals.urgencyScore + 0.2),
      explanation: "This needs immediate attention. The situation is urgent.",
    };
  }

  // Direct question → immediately
  if (signals.hasDirectQuestion) {
    return {
      when: "immediately",
      urgency: 0.8,
      explanation: "They asked a direct question. Respond promptly.",
    };
  }

  // Professional context → within hours
  if (context.type === "professional" || context.type === "interview") {
    return {
      when: "within_hours",
      urgency: 0.5,
      explanation: "Professional context — respond within a reasonable business timeframe.",
    };
  }

  // High engagement → within minutes
  if (signals.engagementScore > 0.6 && dynamics.responsiveness > 0.5) {
    return {
      when: "within_minutes",
      urgency: 0.4,
      explanation: "The conversation is active. Keep the momentum going.",
    };
  }

  // Casual context → within day
  if (context.type === "casual" || context.type === "friendship" || context.type === "social") {
    return {
      when: "within_day",
      urgency: 0.2,
      explanation: "Casual context — respond when it feels natural.",
    };
  }

  // Dating → within hours
  if (context.type === "dating") {
    return {
      when: "within_hours",
      urgency: 0.3,
      explanation: "Keep the conversation going without seeming desperate.",
    };
  }

  // Default → within hours
  return {
    when: "within_hours",
    urgency: 0.3,
    explanation: "Respond when you're ready. No rush, but don't leave it too long.",
  };
}

// ─── Response Guidance ───────────────────────────────────────────────────────

function buildResponseGuidance(
  nextMove: NextMove,
  state: ConversationState,
  recovery: SituationRecovery | null | undefined,
  persuasion: PersuasionEngine | null | undefined,
  strategies: StrategyRecommendation[] | undefined
): ResponseGuidance {
  const { context, conflict, relationship } = state;

  // Use recovery guidance if available
  if (recovery && recovery.candidateGuidance.length > 0) {
    const g = recovery.candidateGuidance[0];
    return {
      tone: g.tone,
      length: g.length,
      structure: g.structure,
      keyPoints: recovery.requiredElements.map((e) => e.description),
      example: g.example,
    };
  }

  // Use persuasion guidance if available
  if (persuasion && persuasion.strategies.length > 0) {
    const s = persuasion.strategies[0];
    return {
      tone: s.tone,
      length: s.length,
      structure: s.structure,
      keyPoints: persuasion.guidance.slice(0, 3),
    };
  }

  // Default guidance based on action and context
  const tone = getToneForAction(nextMove.action, state);
  const length = getLengthForAction(nextMove.action, state);
  const structure = getStructureForAction(nextMove.action, state);
  const keyPoints = getKeyPointsForAction(nextMove.action, state);

  return { tone, length, structure, keyPoints };
}

function buildNoResponseGuidance(
  nextMove: NextMove,
  state: ConversationState
): ResponseGuidance {
  return {
    tone: "calm and measured",
    length: "short",
    structure: [],
    keyPoints: ["No response needed right now. Take time to process."],
  };
}

function getToneForAction(action: NextMoveAction, state: ConversationState): string {
  if (state.conflict.level > 0.5) return "calm and measured";
  if (state.context.type === "professional") return "professional and respectful";
  if (state.context.type === "dating") return "warm and genuine";

  switch (action) {
    case "de_escalate": return "calm, empathetic, and solution-focused";
    case "apologize": return "sincere, accountable, and direct";
    case "set_boundary": return "clear, firm, and respectful";
    case "clarify": return "calm, specific, and non-accusatory";
    case "comfort": return "warm, supportive, and understanding";
    case "reassure": return "calm, confident, and reassuring";
    case "negotiate": return "balanced, reasonable, and flexible";
    case "persuade": return "confident, factual, and respectful";
    case "explain": return "clear, specific, and non-defensive";
    case "defend": return "assertive, factual, and calm";
    case "acknowledge": return "empathetic and understanding";
    case "agree": return "positive and collaborative";
    case "decline": return "diplomatic, clear, and respectful";
    case "change_topic": return "natural and light";
    case "end_conversation": return "polite, brief, and conclusive";
    default: return "natural and appropriate";
  }
}

function getLengthForAction(action: NextMoveAction, state: ConversationState): "short" | "medium" | "long" {
  if (state.context.type === "professional") return "medium";
  if (action === "clarify" || action === "explain") return "medium";
  if (action === "acknowledge" || action === "agree" || action === "comfort") return "short";
  if (action === "negotiate" || action === "persuade") return "medium";
  if (action === "de_escalate") return "medium";
  return "short";
}

function getStructureForAction(action: NextMoveAction, state: ConversationState): string[] {
  switch (action) {
    case "de_escalate":
      return ["acknowledge their concern", "lower tension", "focus on resolution"];
    case "apologize":
      return ["acknowledge the issue", "take responsibility", "propose next step"];
    case "set_boundary":
      return ["state your boundary clearly", "explain why it matters", "stay firm"];
    case "clarify":
      return ["acknowledge the confusion", "explain your position", "confirm understanding"];
    case "comfort":
      return ["acknowledge their feelings", "show empathy", "offer support"];
    case "reassure":
      return ["acknowledge their concern", "provide clarity", "express confidence"];
    case "negotiate":
      return ["state your position", "explain reasoning", "offer alternatives"];
    case "persuade":
      return ["state your case", "provide evidence", "show benefit", "make request"];
    case "explain":
      return ["acknowledge their perspective", "explain your reasoning", "ask for understanding"];
    case "defend":
      return ["state your position", "provide evidence", "set boundary"];
    case "acknowledge":
      return ["acknowledge their feelings", "show understanding"];
    case "respond":
      return ["address the key point", "keep it clear", "match their energy"];
    case "change_topic":
      return ["acknowledge current topic", "transition naturally"];
    case "end_conversation":
      return ["acknowledge the conversation", "end on a positive note"];
    default:
      return ["respond naturally", "continue conversation"];
  }
}

function getKeyPointsForAction(action: NextMoveAction, state: ConversationState): string[] {
  const points: string[] = [];

  if (state.conflict.level > 0.5) {
    points.push("Stay calm and don't escalate");
  }

  if (state.emotion.primary === "angry") {
    points.push("Acknowledge their frustration before responding");
  }

  if (state.conflict.misunderstanding) {
    points.push("Address the misunderstanding directly");
  }

  switch (action) {
    case "de_escalate":
      points.push("Focus on understanding, not winning");
      points.push("Use 'I' statements");
      break;
    case "apologize":
      points.push("Be specific about what you're apologizing for");
      points.push("Don't add 'but' after the apology");
      break;
    case "set_boundary":
      points.push("Be clear and direct");
      points.push("Don't apologize for the boundary");
      break;
    case "clarify":
      points.push("Be specific with examples");
      points.push("Ask if they understand");
      break;
    case "respond":
      points.push("Address their main point");
      points.push("Keep it concise");
      break;
  }

  return points;
}

// ─── Avoid List ──────────────────────────────────────────────────────────────

function buildAvoidList(
  action: NextMoveAction,
  state: ConversationState,
  conflictStructure: ConflictStructure | null | undefined,
  recovery: SituationRecovery | null | undefined
): string[] {
  const avoid: string[] = [];

  // Universal avoids
  avoid.push("Fabricating excuses or false facts");
  avoid.push("Blaming others without justification");
  avoid.push("Making promises you cannot keep");

  // Conflict-specific avoids
  if (state.conflict.level > 0.5) {
    avoid.push("Matching aggressive tone");
    avoid.push("Escalating the conflict");
    avoid.push("Dismissive language");
  }

  if (state.conflict.personalAttacks) {
    avoid.push("Responding with personal attacks");
    avoid.push("Name-calling or insults");
  }

  if (conflictStructure?.personalAttacks) {
    avoid.push("Retaliating with personal attacks");
  }

  // Situation-specific avoids from recovery
  if (recovery) {
    for (const risk of recovery.riskyElements) {
      avoid.push(risk);
    }
  }

  // Action-specific avoids
  switch (action) {
    case "de_escalate":
      avoid.push("Being sarcastic or dismissive");
      avoid.push("Trying to win the argument");
      avoid.push("Using inflammatory language");
      break;
    case "apologize":
      avoid.push("Saying 'I'm sorry you feel that way'");
      avoid.push("Adding 'but' after your apology");
      avoid.push("Blaming them for your mistake");
      break;
    case "set_boundary":
      avoid.push("Being aggressive or threatening");
      avoid.push("Apologizing for the boundary");
      avoid.push("Being vague about the boundary");
      break;
    case "clarify":
      avoid.push("Being condescending");
      avoid.push("Assuming they understand");
      avoid.push("Getting defensive before explaining");
      break;
    case "negotiate":
      avoid.push("Ultimatums");
      avoid.push("Being inflexible");
      avoid.push("Revealing your position too early");
      break;
    case "respond":
      avoid.push("Over-explaining");
      avoid.push("Being unnecessarily formal");
      break;
  }

  return [...new Set(avoid)];
}

// ─── Priority ────────────────────────────────────────────────────────────────

function assessPriority(signals: CoachingSignals, action: NextMoveAction): CoachingPriority {
  if (signals.urgencyScore > 0.7 || signals.conflictScore > 0.7) return "urgent";
  if (signals.urgencyScore > 0.4 || signals.conflictScore > 0.4) return "high";
  if (action === "apologize" || action === "de_escalate" || action === "set_boundary") return "high";
  if (signals.owesResponse || signals.hasDirectQuestion) return "medium";
  return "low";
}

// ─── Context Summary ─────────────────────────────────────────────────────────

function buildContextSummary(
  state: ConversationState,
  conflictStructure: ConflictStructure | null | undefined
): ContextSummary {
  return {
    relationship: formatLabel(state.relationship),
    situation: formatLabel(state.context.situation),
    conflictLevel: getConflictLevelLabel(state.conflict.level),
    otherPersonEmotion: formatLabel(state.emotion.primary),
    conversationHealth: getConversationHealth(state),
  };
}

function getConflictLevelLabel(level: number): string {
  if (level > 0.7) return "High conflict";
  if (level > 0.4) return "Moderate tension";
  if (level > 0.2) return "Some tension";
  return "Calm";
}

function getConversationHealth(state: ConversationState): string {
  const { dynamics, conflict } = state;
  const health = (dynamics.cooperation + dynamics.reciprocity + (1 - conflict.level)) / 3;
  if (health > 0.7) return "Healthy";
  if (health > 0.4) return "Needs attention";
  return "Strained";
}

// ─── Follow-Up Suggestions ───────────────────────────────────────────────────

function buildFollowUpSuggestions(
  action: NextMoveAction,
  state: ConversationState,
  recovery: SituationRecovery | null | undefined
): string[] {
  const suggestions: string[] = [];

  switch (action) {
    case "de_escalate":
      suggestions.push("After de-escalation, clarify the underlying issue");
      suggestions.push("If tension persists, suggest continuing the conversation later");
      break;
    case "apologize":
      suggestions.push("After apologizing, ask how you can make it right");
      suggestions.push("Follow up with action to show you're serious");
      break;
    case "set_boundary":
      suggestions.push("If the boundary is crossed, reinforce it calmly");
      suggestions.push("Consider whether the relationship respects your boundaries");
      break;
    case "clarify":
      suggestions.push("Confirm they understood your clarification");
      suggestions.push("Ask if there are other points of confusion");
      break;
    case "respond":
      suggestions.push("Listen to their response before replying again");
      suggestions.push("Match their engagement level");
      break;
    case "change_topic":
      suggestions.push("Choose a topic related to shared interests");
      suggestions.push("Keep it light and engaging");
      break;
    case "end_conversation":
      suggestions.push("End on a positive or neutral note");
      suggestions.push("Leave the door open for future conversations");
      break;
    default:
      suggestions.push("Continue monitoring the conversation dynamics");
      break;
  }

  // Add recovery-specific follow-up
  if (recovery && recovery.nextAction) {
    suggestions.push(recovery.nextAction);
  }

  return [...new Set(suggestions)];
}

// ─── Confidence ──────────────────────────────────────────────────────────────

function calculateConfidence(
  signals: CoachingSignals,
  state: ConversationState,
  action: NextMoveAction
): number {
  let confidence = 0.5; // Base confidence

  // Strong signals increase confidence
  if (signals.conflictScore > 0.7) confidence += 0.2;
  if (signals.hasDirectQuestion) confidence += 0.15;
  if (signals.hasDeadline) confidence += 0.15;
  if (signals.urgencyScore > 0.6) confidence += 0.1;

  // Strong emotional signals increase confidence
  if (state.emotion.intensity > 0.7) confidence += 0.1;

  // Known situations increase confidence
  if (state.context.situation !== "unknown") confidence += 0.1;
  if (state.relationship !== "unknown") confidence += 0.05;

  // Reduce confidence for ambiguous situations
  if (state.context.situation === "unknown" && state.conflict.level < 0.2) confidence -= 0.1;
  if (state.intent.userIntent === "unknown") confidence -= 0.05;

  return Math.max(0.1, Math.min(1, confidence));
}

// ─── Reasoning ───────────────────────────────────────────────────────────────

function buildReasoning(
  nextMove: NextMove,
  signals: CoachingSignals,
  state: ConversationState,
  responseNeeded: boolean
): string {
  const parts: string[] = [];

  if (!responseNeeded) {
    parts.push("No immediate response is needed.");
    parts.push(nextMove.description);
    return parts.join(" ");
  }

  if (signals.conflictScore > 0.7) {
    parts.push(`Conflict is high (${Math.round(signals.conflictScore * 100)}%).`);
  }

  if (signals.hasDirectQuestion) {
    parts.push("They asked a direct question that needs an answer.");
  }

  if (signals.hasDeadline) {
    parts.push("There's a deadline or commitment that needs attention.");
  }

  if (state.emotion.primary !== "neutral") {
    parts.push(`They're feeling ${state.emotion.primary}.`);
  }

  parts.push(nextMove.description);

  return parts.join(" ");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDeEscalateExample(state: ConversationState): string | undefined {
  if (state.context.type === "professional") {
    return "I understand your concern. Let me address this directly so we can find a resolution.";
  }
  if (state.context.type === "dating") {
    return "Hey, I can see this is important to you. Can we talk about it calmly?";
  }
  return "I hear you. Let's take a step back and figure this out together.";
}

function getBoundaryExample(state: ConversationState): string | undefined {
  if (state.context.type === "professional") {
    return "I need to be clear about this. I'm happy to discuss the work, but I won't engage with personal comments.";
  }
  return "I care about this conversation, but I need us to keep it respectful.";
}

// ─── Logging ─────────────────────────────────────────────────────────────────

export function logCoachingResult(result: ConversationCoachingResult): void {
  if (process.env.NEXTMSG_DEBUG_AI !== "true") return;

  console.log("[NEXTMSG AI DEBUG] Conversation coaching:", {
    nextMove: result.nextMove.action,
    strategy: result.nextMove.strategy,
    timing: result.timing.when,
    priority: result.priority,
    confidence: result.confidence,
    responseNeeded: result.responseNeeded,
    avoidCount: result.avoid.length,
    followUpCount: result.followUpSuggestions.length,
  });
}
