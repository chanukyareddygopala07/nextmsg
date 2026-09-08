import type { ConversationState } from "./conversation-state";
import type { CommunicationStrategy } from "./intelligence";

// ─── Strategy Engine ──────────────────────────────────────────────────────────
//
// Consumes ConversationState and produces ranked recommended strategies.
//
// Design:
// - Deterministic scoring rules (no additional AI call)
// - Rules are evaluated and scored independently
// - Final ranking = sum of all rule scores
// - Primary strategy = highest scoring
//
// Priority system (safety > objective > situation > relationship > emotion > style):
// 1. Safety / Respect (conflict, rejection, boundaries)
// 2. User Objective (goal, intent)
// 3. Situation (deadline, interview, complaint)
// 4. Relationship (professional, dating, family)
// 5. Emotional State (tone, emotion, dynamics)
// 6. Communication Context (platform, general context)
// 7. Style Preference (user style)
// ──────────────────────────────────────────────────────────────────────────────

export interface StrategyRecommendation {
  strategy: CommunicationStrategy;
  priority: number;
  confidence: number;
  reason: string;
}

export interface StrategyResult {
  primary: CommunicationStrategy;
  ranked: StrategyRecommendation[];
  confidence: number;
}

type ScoredStrategy = {
  strategy: CommunicationStrategy;
  score: number;
  reasons: string[];
};

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function selectStrategies(state: ConversationState): StrategyResult {
  const scored = new Map<CommunicationStrategy, ScoredStrategy>();

  function ensure(strategy: CommunicationStrategy): ScoredStrategy {
    if (!scored.has(strategy)) {
      scored.set(strategy, { strategy, score: 0, reasons: [] });
    }
    return scored.get(strategy)!;
  }

  function boost(strategy: CommunicationStrategy, amount: number, reason: string) {
    const s = ensure(strategy);
    s.score += amount;
    s.reasons.push(reason);
  }

  function suppress(strategy: CommunicationStrategy, amount: number, reason: string) {
    const s = ensure(strategy);
    s.score -= amount;
    s.reasons.push(`SUPPRESSED: ${reason}`);
  }

  // ── Layer 1: Safety / Respect (highest priority) ──

  applySafetyRules(state, boost, suppress);

  // ── Layer 2: User Objective ──

  applyObjectiveRules(state, boost, suppress);

  // ── Layer 3: Situation ──

  applySituationRules(state, boost, suppress);

  // ── Layer 4: Relationship ──

  applyRelationshipRules(state, boost, suppress);

  // ── Layer 5: Emotional State ──

  applyEmotionRules(state, boost, suppress);

  // ── Layer 6: Communication Context ──

  applyContextRules(state, boost, suppress);

  // ── Layer 7: Style Preference ──

  applyStyleRules(state, boost, suppress);

  // ── Group Conversation Adjustments ──

  if (state.participants.isGroup) {
    applyGroupRules(boost, suppress);
  }

  // ── Ensure minimum strategies ──

  ensureMinimumStrategies(scored, state);

  // ── Sort and rank ──

  const all = Array.from(scored.values())
    .filter((s) => s.score > -10)
    .sort((a, b) => b.score - a.score);

  const maxScore = all[0]?.score || 0;
  const minScore = all[all.length - 1]?.score || 0;
  const range = maxScore - minScore || 1;

  const ranked: StrategyRecommendation[] = all.map((s, i) => ({
    strategy: s.strategy,
    priority: i + 1,
    confidence: Math.max(0.1, Math.min(1, (s.score - minScore) / range)),
    reason: s.reasons[0] || "General recommendation",
  }));

  const primary = ranked[0]?.strategy || "natural";
  const avgConfidence = ranked.length
    ? ranked.reduce((sum, r) => sum + r.confidence, 0) / ranked.length
    : 0.5;

  return {
    primary,
    ranked: ranked.slice(0, 5),
    confidence: avgConfidence,
  };
}

// ─── Safety Rules ─────────────────────────────────────────────────────────────
// Highest priority — never generate harmful or inappropriate responses

function applySafetyRules(
  state: ConversationState,
  boost: StrategyFn,
  suppress: StrategyFn
): void {
  const { conflict, dynamics, emotion } = state;

  // High conflict → suppress provocative strategies
  if (conflict.level > 0.7) {
    boost("de_escalate", 3.0, "High conflict level");
    boost("empathetic", 2.0, "Conflict requires empathy");
    boost("clarifying", 1.5, "Resolve misunderstandings");
    suppress("playful", 2.0, "Inappropriate during high conflict");
    suppress("flirty", 2.0, "Inappropriate during high conflict");
    suppress("funny", 1.5, "Inappropriate during high conflict");
    suppress("romantic", 2.0, "Inappropriate during high conflict");
  }

  // Escalation → de-escalate
  if (conflict.escalation > 0.5) {
    boost("de_escalate", 2.5, "Active escalation detected");
    boost("boundary_setting", 1.0, "Set boundaries during escalation");
  }

  // Personal attacks → assertive + boundary
  if (conflict.personalAttacks) {
    boost("assertive", 2.0, "Personal attacks detected");
    boost("boundary_setting", 2.5, "Set clear boundaries");
    suppress("apologetic", 1.5, "Don't apologize for being attacked");
  }

  // High defensiveness → reassure + clarify
  if (dynamics.defensiveness > 0.6) {
    boost("reassuring", 1.5, "Counter defensiveness with reassurance");
    boost("clarifying", 1.0, "Reduce defensiveness through clarity");
    suppress("assertive", 0.5, "Assertiveness may increase defensiveness");
  }

  // Anger emotion → don't provoke
  if (emotion.primary === "angry") {
    suppress("playful", 1.5, "Inappropriate when other is angry");
    suppress("flirty", 1.5, "Inappropriate when other is angry");
    boost("de_escalate", 1.5, "Address anger with de-escalation");
  }
}

// ─── Objective Rules ──────────────────────────────────────────────────────────
// User's explicit goal drives strategy selection

function applyObjectiveRules(
  state: ConversationState,
  boost: StrategyFn,
  suppress: StrategyFn
): void {
  const { intent } = state;
  const goal = intent.userGoal;

  switch (goal) {
    case "ask_for_extension":
      boost("accountable", 3.0, "Goal: ask for extension");
      boost("extension_request", 3.5, "Goal: ask for extension");
      boost("diplomatic", 1.5, "Polite request");
      boost("solution_oriented", 1.0, "Show plan");
      suppress("playful", 1.0, "Not appropriate for extension request");
      suppress("flirty", 2.0, "Not appropriate for extension request");
      break;

    case "ask_them_out":
      boost("flirty", 2.0, "Goal: ask them out");
      boost("charming", 1.5, "Goal: ask them out");
      boost("confident", 1.0, "Goal: ask them out");
      boost("natural", 1.0, "Keep it natural");
      break;

    case "flirt_naturally":
      boost("flirty", 2.5, "Goal: flirt naturally");
      boost("playful", 2.0, "Goal: flirt naturally");
      boost("charming", 1.5, "Goal: flirt naturally");
      boost("curious", 1.0, "Show interest");
      break;

    case "make_them_laugh":
      boost("funny", 3.0, "Goal: make them laugh");
      boost("playful", 2.0, "Goal: make them laugh");
      boost("natural", 1.5, "Goal: make them laugh");
      break;

    case "show_interest":
      boost("curious", 2.5, "Goal: show interest");
      boost("natural", 1.5, "Goal: show interest");
      boost("friendly", 1.0, "Goal: show interest");
      break;

    case "recover_dry":
      boost("natural", 2.0, "Goal: recover dry conversation");
      boost("playful", 1.5, "Goal: recover dry conversation");
      boost("curious", 1.0, "Goal: recover dry conversation");
      suppress("professional", 0.5, "Too formal for recovery");
      break;

    case "change_topic":
      boost("natural", 2.0, "Goal: change topic");
      boost("curious", 1.5, "Goal: change topic");
      suppress("professional", 0.5, "Too formal for topic change");
      break;

    case "reconnect":
      boost("follow_up", 3.0, "Goal: reconnect");
      boost("friendly", 1.5, "Goal: reconnect");
      boost("natural", 1.0, "Goal: reconnect");
      break;

    case "end_conversation":
      boost("concise", 2.0, "Goal: end conversation");
      boost("natural", 1.5, "Goal: end conversation");
      suppress("flirty", 1.0, "Don't flirt while ending");
      break;
  }

  // Intent-based boosts
  switch (intent.userIntent) {
    case "de_escalate":
      boost("de_escalate", 3.0, "User wants to de-escalate");
      boost("empathetic", 2.0, "User wants to de-escalate");
      boost("clarifying", 1.0, "Resolve misunderstandings");
      break;

    case "resolve_conflict":
      boost("de_escalate", 2.5, "User wants to resolve conflict");
      boost("accountable", 1.5, "Take responsibility");
      boost("solution_oriented", 2.0, "Focus on resolution");
      break;

    case "apologize":
      boost("apologetic", 3.0, "User wants to apologize");
      boost("accountable", 2.0, "User wants to apologize");
      boost("empathetic", 1.0, "Apology must be empathetic");
      break;

    case "persuade":
      boost("persuasive", 3.0, "User wants to persuade");
      boost("clear_direct", 1.5, "Clear argument");
      boost("confident", 1.0, "Confident delivery");
      break;

    case "negotiate":
      boost("negotiation", 3.0, "User wants to negotiate");
      boost("clear_direct", 1.5, "Clear terms");
      boost("compromise", 1.5, "Find middle ground");
      break;

    case "explain":
      boost("clear_direct", 2.5, "User wants to explain");
      boost("clarifying", 1.5, "User wants to explain");
      boost("concise", 1.0, "Keep it clear");
      break;

    case "request":
      boost("diplomatic", 2.0, "User wants to make a request");
      boost("clear_direct", 1.5, "Clear request");
      break;

    case "decline":
      boost("diplomatic", 2.5, "User wants to decline");
      boost("concise", 1.5, "Brief decline");
      boost("clear_direct", 1.0, "Clear boundary");
      break;

    case "set_boundary":
      boost("boundary_setting", 3.0, "User wants to set boundary");
      boost("assertive", 2.0, "Clear boundary");
      boost("diplomatic", 1.0, "Respectful boundary");
      break;

    case "ask_for_reschedule":
      boost("reschedule_request", 3.0, "User wants to reschedule");
      boost("professional", 1.5, "Professional reschedule");
      boost("diplomatic", 1.0, "Polite request");
      break;

    case "defend_position":
      boost("assertive", 2.5, "User wants to defend position");
      boost("clear_direct", 2.0, "Clear defense");
      boost("confident", 1.5, "Confident defense");
      break;

    case "recover_from_mistake":
      boost("accountable", 3.0, "User recovering from mistake");
      boost("solution_oriented", 2.0, "Focus on remedy");
      boost("apologetic", 1.5, "Acknowledge mistake");
      break;

    case "comfort":
      boost("empathetic", 3.0, "User wants to comfort");
      boost("reassuring", 2.5, "User wants to comfort");
      boost("supportive", 2.0, "User wants to comfort");
      break;

    case "reassure":
      boost("reassuring", 3.0, "User wants to reassure");
      boost("empathetic", 1.5, "User wants to reassure");
      boost("supportive", 1.5, "User wants to reassure");
      break;

    case "flirt":
      boost("flirty", 2.5, "User wants to flirt");
      boost("playful", 2.0, "User wants to flirt");
      boost("charming", 1.5, "User wants to flirt");
      break;

    case "show_interest":
      boost("curious", 2.5, "User wants to show interest");
      boost("natural", 1.5, "User wants to show interest");
      break;

    case "impress":
      boost("confident", 2.5, "User wants to impress");
      boost("charming", 1.5, "User wants to impress");
      boost("natural", 1.0, "User wants to impress");
      break;
  }
}

// ─── Situation Rules ──────────────────────────────────────────────────────────
// Specific situations get specific strategies

function applySituationRules(
  state: ConversationState,
  boost: StrategyFn,
  suppress: StrategyFn
): void {
  const { context } = state;

  switch (context.situation) {
    case "missed_deadline":
    case "late_submission":
      boost("accountable", 3.0, "Missed deadline situation");
      boost("solution_oriented", 2.0, "Show plan to fix");
      boost("apologetic", 1.5, "Acknowledge the issue");
      suppress("playful", 2.0, "Not appropriate for deadline");
      suppress("flirty", 2.0, "Not appropriate for deadline");
      break;

    case "missed_interview":
      boost("professional", 3.0, "Missed interview");
      boost("accountable", 2.5, "Take responsibility");
      boost("reschedule_request", 3.0, "Request reschedule");
      boost("concise", 1.0, "Brief explanation");
      suppress("playful", 2.5, "Not appropriate for interview");
      suppress("flirty", 3.0, "Not appropriate for interview");
      break;

    case "late_arrival":
    case "missed_meeting":
      boost("accountable", 2.5, "Late or missed meeting");
      boost("apologetic", 2.0, "Acknowledge lateness");
      boost("concise", 1.0, "Brief apology");
      break;

    case "delayed_response":
      boost("apologetic", 1.5, "Delayed response");
      boost("natural", 1.0, "Keep it natural");
      break;

    case "misunderstanding":
      boost("clarifying", 3.0, "Misunderstanding detected");
      boost("clear_direct", 2.0, "Clear up confusion");
      boost("empathetic", 1.0, "Understand their perspective");
      break;

    case "disagreement":
      boost("diplomatic", 2.5, "Disagreement present");
      boost("clear_direct", 1.5, "State position clearly");
      boost("compromise", 1.0, "Find middle ground");
      break;

    case "heated_argument":
      boost("de_escalate", 3.5, "Heated argument");
      boost("empathetic", 2.5, "Address emotions");
      boost("clarifying", 1.5, "Resolve misunderstandings");
      suppress("playful", 3.0, "Inappropriate during argument");
      suppress("flirty", 3.0, "Inappropriate during argument");
      suppress("assertive", 1.0, "May escalate");
      break;

    case "personal_conflict":
      boost("de_escalate", 3.0, "Personal conflict");
      boost("empathetic", 2.5, "Address personal feelings");
      boost("boundary_setting", 1.5, "Set personal boundaries");
      suppress("playful", 2.5, "Inappropriate during personal conflict");
      break;

    case "customer_complaint":
      boost("empathetic", 3.0, "Customer complaint");
      boost("solution_oriented", 2.5, "Focus on resolution");
      boost("reassuring", 2.0, "Reassure customer");
      boost("professional", 1.5, "Professional response");
      suppress("playful", 2.0, "Inappropriate for complaints");
      break;

    case "negotiation":
      boost("negotiation", 3.0, "Negotiation situation");
      boost("clear_direct", 2.0, "Clear terms");
      boost("persuasive", 1.5, "Build case");
      boost("compromise", 1.0, "Find middle ground");
      break;

    case "apology":
      boost("apologetic", 2.5, "Apology situation");
      boost("empathetic", 1.5, "Acknowledge feelings");
      boost("accountable", 1.0, "Take responsibility");
      break;

    case "rejection":
      boost("concise", 2.0, "Rejection received");
      boost("diplomatic", 1.5, "Respect their decision");
      boost("natural", 1.0, "Keep dignity");
      suppress("flirty", 3.0, "Do not pursue after rejection");
      suppress("persuasive", 2.0, "Do not argue against rejection");
      break;

    case "professional_feedback":
      boost("professional", 2.5, "Professional feedback");
      boost("empathetic", 1.5, "Consider their perspective");
      boost("solution_oriented", 1.0, "Focus on improvement");
      break;

    case "performance_issue":
      boost("diplomatic", 2.5, "Performance issue");
      boost("solution_oriented", 2.0, "Focus on solutions");
      boost("clear_direct", 1.5, "Address directly");
      break;

    case "scheduling_problem":
      boost("reschedule_request", 2.5, "Scheduling problem");
      boost("diplomatic", 1.5, "Polite request");
      boost("clear_direct", 1.0, "Clear availability");
      break;

    case "request_for_help":
      boost("supportive", 2.5, "Help requested");
      boost("empathetic", 1.5, "Show willingness");
      boost("clear_direct", 1.0, "Clear response");
      break;

    case "boundary_setting":
      boost("boundary_setting", 3.0, "Boundary situation");
      boost("assertive", 2.0, "Clear boundary");
      boost("diplomatic", 1.0, "Respectful boundary");
      break;

    case "romantic_interest":
      boost("flirty", 2.0, "Romantic interest");
      boost("charming", 1.5, "Romantic interest");
      boost("natural", 1.0, "Keep it natural");
      break;

    case "casual_chat":
      boost("natural", 2.0, "Casual chat");
      boost("friendly", 1.5, "Casual chat");
      break;

    case "follow_up":
      boost("follow_up", 2.5, "Follow up situation");
      boost("natural", 1.5, "Keep it natural");
      break;

    case "reconnecting":
      boost("follow_up", 2.5, "Reconnecting");
      boost("friendly", 1.5, "Friendly reconnection");
      boost("natural", 1.0, "Keep it natural");
      break;
  }
}

// ─── Relationship Rules ───────────────────────────────────────────────────────

function applyRelationshipRules(
  state: ConversationState,
  boost: StrategyFn,
  suppress: StrategyFn
): void {
  const { relationship } = state;

  const isProfessional = [
    "manager", "employee", "professor", "student", "interviewer",
    "candidate", "recruiter", "coworker", "teammate", "client",
  ].includes(relationship);

  if (isProfessional) {
    boost("professional", 2.0, "Professional relationship");
    boost("clear_direct", 1.0, "Professional relationship");
    boost("concise", 0.5, "Professional relationship");
    suppress("playful", 1.0, "Not appropriate for professional relationship");
    suppress("flirty", 2.0, "Never appropriate for professional relationship");
  }

  if (relationship === "manager" || relationship === "professor") {
    boost("professional", 1.5, "Authority figure");
    boost("professional", 1.0, "Authority figure");
  }

  if (relationship === "customer" || relationship === "client") {
    boost("empathetic", 1.5, "Customer relationship");
    boost("solution_oriented", 1.5, "Customer relationship");
    boost("professional", 1.0, "Customer relationship");
  }

  if (relationship === "friend" || relationship === "classmate") {
    boost("natural", 1.5, "Friend relationship");
    boost("friendly", 1.0, "Friend relationship");
  }

  if (relationship === "family" || relationship === "partner") {
    boost("empathetic", 1.5, "Family/partner relationship");
    boost("empathetic", 1.0, "Family/partner relationship");
  }

  if (relationship === "date" || relationship === "romantic_interest") {
    boost("flirty", 1.5, "Romantic relationship");
    boost("playful", 1.0, "Romantic relationship");
    boost("charming", 1.0, "Romantic relationship");
  }
}

// ─── Emotion Rules ────────────────────────────────────────────────────────────

function applyEmotionRules(
  state: ConversationState,
  boost: StrategyFn,
  suppress: StrategyFn
): void {
  const { emotion, tone, dynamics } = state;

  // Other person's emotions
  if (emotion.primary === "frustrated") {
    boost("empathetic", 2.0, "Other person is frustrated");
    boost("solution_oriented", 1.5, "Address frustration with solutions");
  }

  if (emotion.primary === "sad" || emotion.primary === "disappointed") {
    boost("empathetic", 2.5, "Other person is sad/disappointed");
    boost("reassuring", 2.0, "Provide reassurance");
    boost("supportive", 1.5, "Show support");
    suppress("playful", 1.5, "Inappropriate when sad");
    suppress("funny", 1.5, "Inappropriate when sad");
  }

  if (emotion.primary === "anxious" || emotion.primary === "nervous") {
    boost("reassuring", 2.5, "Other person is anxious");
    boost("empathetic", 1.5, "Address anxiety");
    boost("clear_direct", 1.0, "Reduce uncertainty");
  }

  if (emotion.primary === "happy" || emotion.primary === "excited") {
    boost("friendly", 1.5, "Other person is happy");
    boost("playful", 1.0, "Match positive energy");
    boost("natural", 1.0, "Match positive energy");
  }

  if (emotion.primary === "curious") {
    boost("clear_direct", 2.0, "Answer curiosity");
    boost("friendly", 1.0, "Respond to curiosity");
  }

  if (emotion.primary === "romantic") {
    boost("flirty", 2.0, "Match romantic tone");
    boost("charming", 1.5, "Match romantic tone");
    boost("natural", 1.0, "Match romantic tone");
  }

  if (emotion.primary === "playful") {
    boost("playful", 2.0, "Match playful energy");
    boost("funny", 1.0, "Match playful energy");
    boost("natural", 1.0, "Match playful energy");
  }

  // Tone signals
  if (tone.primary === "angry") {
    boost("de_escalate", 2.0, "Angry tone detected");
    boost("empathetic", 1.5, "Address anger");
    suppress("playful", 2.0, "Inappropriate with angry tone");
  }

  if (tone.primary === "formal") {
    boost("professional", 1.5, "Formal tone");
    boost("concise", 0.5, "Formal tone");
  }

  if (tone.primary === "urgent") {
    boost("concise", 2.0, "Urgent tone");
    boost("clear_direct", 1.5, "Urgent tone");
    suppress("playful", 1.5, "Inappropriate during urgency");
  }

  // Dynamics
  if (dynamics.pressure > 0.7) {
    boost("boundary_setting", 1.5, "High pressure detected");
    boost("clear_direct", 1.0, "Address pressure directly");
  }

  if (dynamics.uncertainty > 0.7) {
    boost("clarifying", 2.0, "High uncertainty");
    boost("clear_direct", 1.5, "Reduce uncertainty");
  }
}

// ─── Context Rules ────────────────────────────────────────────────────────────

function applyContextRules(
  state: ConversationState,
  boost: StrategyFn,
  suppress: StrategyFn
): void {
  const { context } = state;

  switch (context.type) {
    case "professional":
      boost("professional", 2.0, "Professional context");
      boost("clear_direct", 1.0, "Professional context");
      boost("concise", 0.5, "Professional context");
      suppress("playful", 1.0, "Reduced in professional context");
      suppress("flirty", 2.0, "Inappropriate in professional context");
      break;

    case "academic":
      boost("professional", 1.5, "Academic context");
      boost("clear_direct", 1.0, "Academic context");
      boost("concise", 0.5, "Academic context");
      break;

    case "interview":
      boost("professional", 2.5, "Interview context");
      boost("confident", 1.5, "Interview context");
      boost("clear_direct", 1.0, "Interview context");
      suppress("playful", 1.5, "Not appropriate for interview");
      suppress("flirty", 3.0, "Never appropriate for interview");
      break;

    case "dating":
      boost("flirty", 1.5, "Dating context");
      boost("playful", 1.5, "Dating context");
      boost("charming", 1.0, "Dating context");
      boost("natural", 1.0, "Dating context");
      suppress("professional", 1.0, "Too formal for dating");
      break;

    case "friendship":
      boost("natural", 2.0, "Friendship context");
      boost("friendly", 1.5, "Friendship context");
      boost("playful", 1.0, "Friendship context");
      suppress("professional", 1.0, "Too formal for friendship");
      break;

    case "family":
      boost("empathetic", 2.0, "Family context");
      boost("empathetic", 1.0, "Family context");
      boost("natural", 1.0, "Family context");
      suppress("flirty", 2.0, "Never appropriate for family");
      break;

    case "social":
      boost("friendly", 1.5, "Social context");
      boost("natural", 1.5, "Social context");
      boost("playful", 1.0, "Social context");
      break;

    case "customer":
      boost("empathetic", 2.0, "Customer context");
      boost("solution_oriented", 2.0, "Customer context");
      boost("professional", 1.5, "Customer context");
      boost("reassuring", 1.0, "Customer context");
      break;

    case "negotiation":
      boost("negotiation", 2.5, "Negotiation context");
      boost("persuasive", 2.0, "Negotiation context");
      boost("clear_direct", 1.5, "Negotiation context");
      boost("compromise", 1.0, "Negotiation context");
      break;

    case "conflict":
      boost("de_escalate", 2.0, "Conflict context");
      boost("empathetic", 1.5, "Conflict context");
      boost("diplomatic", 1.5, "Conflict context");
      break;
  }
}

// ─── Style Rules ──────────────────────────────────────────────────────────────

function applyStyleRules(
  state: ConversationState,
  boost: StrategyFn,
  _suppress: StrategyFn
): void {
  const { style } = state;

  switch (style.preferred) {
    case "professional":
      boost("professional", 1.5, "User prefers professional");
      break;
    case "formal":
      boost("professional", 1.0, "User prefers formal");
      boost("concise", 0.5, "User prefers formal");
      break;
    case "casual":
      boost("natural", 1.0, "User prefers casual");
      break;
    case "friendly":
      boost("friendly", 1.5, "User prefers friendly");
      break;
    case "playful":
      boost("playful", 1.5, "User prefers playful");
      break;
    case "flirty":
      boost("flirty", 1.5, "User prefers flirty");
      break;
    case "clear_direct":
      boost("clear_direct", 1.5, "User prefers clear_direct");
      break;
    case "diplomatic":
      boost("diplomatic", 1.5, "User prefers diplomatic");
      break;
    case "empathetic":
      boost("empathetic", 1.5, "User prefers empathetic");
      break;
    case "assertive":
      boost("assertive", 1.5, "User prefers assertive");
      break;
    case "concise":
      boost("concise", 1.5, "User prefers concise");
      break;
    case "warm":
      boost("friendly", 1.5, "User prefers warm");
      break;
    case "confident":
      boost("confident", 1.5, "User prefers confident");
      break;
    case "humorous":
      boost("funny", 1.5, "User prefers humorous");
      boost("playful", 1.0, "User prefers humorous");
      break;
  }
}

// ─── Group Rules ──────────────────────────────────────────────────────────────

function applyGroupRules(boost: StrategyFn, suppress: StrategyFn): void {
  boost("clear_direct", 1.0, "Group conversation needs clarity");
  boost("concise", 0.5, "Group conversations benefit from brevity");
  suppress("flirty", 2.0, "Inappropriate in group settings");
  suppress("romantic", 2.0, "Inappropriate in group settings");
}

// ─── Minimum Strategies ───────────────────────────────────────────────────────

function ensureMinimumStrategies(scored: Map<CommunicationStrategy, ScoredStrategy>, state: ConversationState): void {
  const required: CommunicationStrategy[] = ["natural"];

  if (state.context.type === "dating" || state.intent.userIntent === "flirt") {
    required.push("playful", "flirty");
  }

  if (state.conflict.level > 0.5) {
    required.push("de_escalate", "empathetic");
  }

  if (state.intent.userIntent === "ask_for_extension") {
    required.push("accountable", "extension_request");
  }

  if (state.intent.userIntent === "ask_for_reschedule") {
    required.push("professional", "reschedule_request");
  }

  for (const s of required) {
    if (!scored.has(s)) {
      scored.set(s, { strategy: s, score: 0.5, reasons: ["Minimum fallback"] });
    }
  }
}

// ─── Type ─────────────────────────────────────────────────────────────────────

type StrategyFn = (strategy: CommunicationStrategy, amount: number, reason: string) => void;
