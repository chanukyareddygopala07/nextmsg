import type {
  ParticipantIntelligence,
  ParticipantIntent,
  ParticipantStance,
  ParticipantClaim,
  ParticipantBehavior,
  ParticipantEmotion,
  ParticipantTone,
  ConflictStructure,
  Misunderstanding,
  FactualDispute,
  ResolutionOpportunity,
  BlamePattern,
  EscalationTrend,
  GroupConversationAnalysis,
  GroupDynamics,
} from "./participant-intelligence";
import type { ConversationIntelligence } from "./intelligence";
import type { ConversationState } from "./conversation-state";

// ─── Conflict Analysis Engine ───────────────────────────────────────────────────
//
// Deterministic logic for analyzing conflicts and participants.
// Uses the intelligence from Grok as input and produces structured analysis.
//
// Design:
// - No additional AI calls
// - Deterministic rules based on existing intelligence
// - Extends existing types without breaking them
// - Focuses on observable communication behavior
// ──────────────────────────────────────────────────────────────────────────────

export interface ConflictAnalysisResult {
  participants: ParticipantIntelligence[];
  conflictStructure: ConflictStructure;
  groupAnalysis: GroupConversationAnalysis;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function analyzeConflict(
  messages: { sender: string; text: string }[],
  intelligence: ConversationIntelligence,
  state: ConversationState,
  userFacts?: string[]
): ConflictAnalysisResult {
  const participants = extractParticipants(messages, intelligence, userFacts);
  const conflictStructure = buildConflictStructure(messages, intelligence, participants);
  const groupAnalysis = buildGroupAnalysis(participants, intelligence);

  return {
    participants,
    conflictStructure,
    groupAnalysis,
  };
}

// ─── Participant Extraction ────────────────────────────────────────────────────

function extractParticipants(
  messages: { sender: string; text: string }[],
  intelligence: ConversationIntelligence,
  userFacts?: string[]
): ParticipantIntelligence[] {
  const participantMap = new Map<string, { messages: string[]; label: string }>();

  // Collect messages per participant
  for (const msg of messages) {
    const id = normalizeParticipantId(msg.sender);
    if (!participantMap.has(id)) {
      participantMap.set(id, { messages: [], label: msg.sender });
    }
    participantMap.get(id)!.messages.push(msg.text);
  }

  // Build participant intelligence
  const participants: ParticipantIntelligence[] = [];

  for (const [id, data] of participantMap) {
    const participant = buildParticipantIntelligence(
      id,
      data.label,
      data.messages,
      intelligence,
      userFacts
    );
    participants.push(participant);
  }

  return participants;
}

function normalizeParticipantId(sender: string): string {
  const lower = sender.toLowerCase();
  if (lower === "me" || lower === "user") return "user";
  // Keep original label for display, normalize for ID
  return lower.replace(/[^a-z0-9]/g, "_");
}

function buildParticipantIntelligence(
  participantId: string,
  label: string,
  messages: string[],
  intelligence: ConversationIntelligence,
  userFacts?: string[]
): ParticipantIntelligence {
  const isUser = participantId === "user";

  // Infer position from messages
  const position = inferPosition(messages, intelligence, isUser);

  // Infer intent from messages
  const intent = inferIntent(messages, intelligence, isUser);

  // Infer emotion from messages
  const emotion = inferEmotion(messages, intelligence, isUser);

  // Infer tone from messages
  const tone = inferTone(messages, intelligence, isUser);

  // Determine stance
  const stance = inferStance(messages, intelligence);

  // Analyze behavior
  const behavior = analyzeBehavior(messages, intelligence);

  // Extract claims
  const claims = extractClaims(messages, participantId, userFacts);

  // Extract concerns and requests
  const concerns = extractConcerns(messages);
  const requests = extractRequests(messages);

  // Extract known and disputed facts
  const { knownFacts, disputedFacts } = extractFacts(messages, claims, userFacts);

  return {
    participantId,
    label,
    role: isUser ? "user" : inferRole(messages, intelligence),
    relationshipToUser: isUser ? "self" : inferRelationship(messages, intelligence),
    language: inferLanguage(messages, intelligence),
    position,
    intent,
    emotion,
    tone,
    stance,
    behavior,
    concerns,
    requests,
    claims,
    knownFacts,
    disputedFacts,
  };
}

// ─── Position Inference ────────────────────────────────────────────────────────

function inferPosition(
  messages: string[],
  _intelligence: ConversationIntelligence,
  isUser: boolean
): ParticipantIntelligence["position"] {
  const combined = messages.join(" ").toLowerCase();

  // Common position patterns
  if (combined.includes("deadline") || combined.includes("late") || combined.includes("submit")) {
    if (combined.includes("my part") || combined.includes("my section")) {
      return {
        mainPosition: "Completed assigned portion on time",
        supportingReasoning: "Claims individual work was submitted",
        requestedOutcome: "Recognition of completed work",
      };
    }
    return {
      mainPosition: "Expects timely completion",
      supportingReasoning: "References deadlines or delays",
      requestedOutcome: "Completion or accountability",
    };
  }

  if (combined.includes("deadline") && combined.includes("change")) {
    return {
      mainPosition: "Deadline was changed without communication",
      supportingReasoning: "Claims lack of information about change",
      requestedOutcome: "Clear communication going forward",
    };
  }

  if (combined.includes("misunderstand") || combined.includes("thought")) {
    return {
      mainPosition: "Different interpretation of situation",
      supportingReasoning: "Expresses confusion or different understanding",
      requestedOutcome: "Clarification",
    };
  }

  // Default position
  return {
    mainPosition: isUser ? "Responding to conversation" : "Expressing position",
    supportingReasoning: "Limited evidence available",
    requestedOutcome: "Resolution or understanding",
  };
}

// ─── Intent Inference ──────────────────────────────────────────────────────────

function inferIntent(
  messages: string[],
  intelligence: ConversationIntelligence,
  isUser: boolean
): ParticipantIntent {
  const combined = messages.join(" ").toLowerCase();

  // Check for specific intents
  if (combined.includes("sorry") || combined.includes("apologize")) {
    return "apologize";
  }

  if (combined.includes("please") || combined.includes("can you") || combined.includes("could you")) {
    return "request_action";
  }

  if (combined.includes("why") || combined.includes("explain") || combined.includes("because")) {
    return "explain";
  }

  if (combined.includes("you always") || combined.includes("you never") || combined.includes("your fault")) {
    return "accuse";
  }

  if (combined.includes("i did") || combined.includes("i sent") || combined.includes("i completed")) {
    return "defend";
  }

  if (combined.includes("what do you mean") || combined.includes("i don't understand")) {
    return "clarify";
  }

  if (combined.includes("let's") || combined.includes("how about") || combined.includes("we could")) {
    return "negotiate";
  }

  if (combined.includes("calm down") || combined.includes("let's not")) {
    return "de_escalate";
  }

  if (combined.includes("i need") || combined.includes("i want") || combined.includes("i expect")) {
    return "request_action";
  }

  if (combined.includes("you're wrong") || combined.includes("that's not true")) {
    return "express_disagreement";
  }

  if (combined.includes("i'm frustrated") || combined.includes("this is frustrating")) {
    return "express_frustration";
  }

  // Default based on intelligence
  if (isUser) {
    return mapIntelligenceToIntent(intelligence.userIntent);
  }

  return mapOtherIntent(intelligence.otherIntent);
}

function mapIntelligenceToIntent(intent: string): ParticipantIntent {
  const map: Record<string, ParticipantIntent> = {
    explain: "explain",
    apologize: "apologize",
    convince: "persuade",
    persuade: "persuade",
    negotiate: "negotiate",
    clarify: "clarify",
    de_escalate: "de_escalate",
    resolve_conflict: "resolve_conflict",
    set_boundary: "set_boundary",
    defend_position: "defend",
  };
  return map[intent] || "unknown";
}

function mapOtherIntent(intent: string): ParticipantIntent {
  const map: Record<string, ParticipantIntent> = {
    asking_for_explanation: "explain",
    expressing_frustration: "express_frustration",
    requesting_action: "request_action",
    disagreeing: "express_disagreement",
    negotiating: "negotiate",
  };
  return map[intent] || "unknown";
}

// ─── Emotion Inference ─────────────────────────────────────────────────────────

function inferEmotion(
  messages: string[],
  intelligence: ConversationIntelligence,
  isUser: boolean
): ParticipantEmotion {
  const combined = messages.join(" ").toLowerCase();

  // Detect specific emotions from text
  if (combined.includes("frustrat") || combined.includes("annoy")) {
    return {
      primary: "frustrated",
      secondary: "angry",
      intensity: 0.7,
      confidence: "high",
    };
  }

  if (combined.includes("angry") || combined.includes("furious")) {
    return {
      primary: "angry",
      secondary: "frustrated",
      intensity: 0.8,
      confidence: "high",
    };
  }

  if (combined.includes("confus") || combined.includes("don't understand")) {
    return {
      primary: "confused",
      secondary: "concerned",
      intensity: 0.5,
      confidence: "medium",
    };
  }

  if (combined.includes("sorry") || combined.includes("apologize")) {
    return {
      primary: "embarrassed",
      secondary: "concerned",
      intensity: 0.6,
      confidence: "medium",
    };
  }

  if (combined.includes("disappoint")) {
    return {
      primary: "disappointed",
      secondary: "frustrated",
      intensity: 0.6,
      confidence: "medium",
    };
  }

  if (combined.includes("worried") || combined.includes("anxious")) {
    return {
      primary: "anxious",
      secondary: "concerned",
      intensity: 0.5,
      confidence: "medium",
    };
  }

  // Use intelligence as fallback
  if (isUser) {
    return {
      primary: intelligence.emotion.primary,
      secondary: intelligence.emotion.secondary,
      intensity: intelligence.emotion.intensity,
      confidence: "inferred",
    };
  }

  return {
    primary: intelligence.emotion.primary,
    secondary: intelligence.emotion.secondary,
    intensity: intelligence.emotion.intensity * 0.8,
    confidence: "inferred",
  };
}

// ─── Tone Inference ────────────────────────────────────────────────────────────

function inferTone(
  messages: string[],
  _intelligenceParam: ConversationIntelligence,
  _isUserParam: boolean
): ParticipantTone {
  const combined = messages.join(" ").toLowerCase();

  // Detect tone from language patterns
  if (combined.includes("please") && combined.includes("thank")) {
    return {
      primary: "polite",
      secondary: "professional",
      intensity: 0.6,
    };
  }

  if (combined.includes("!!") || combined.includes("CAPS")) {
    return {
      primary: "angry",
      secondary: "assertive",
      intensity: 0.8,
    };
  }

  if (combined.includes("...") || combined.includes("idk")) {
    return {
      primary: "passive",
      secondary: "uncertain",
      intensity: 0.4,
    };
  }

  if (combined.includes("haha") || combined.includes("lol")) {
    return {
      primary: "playful",
      secondary: "friendly",
      intensity: 0.6,
    };
  }

  // Use intelligence as fallback
  return {
    primary: "casual",
    secondary: "friendly",
    intensity: 0.5,
  };
}

// ─── Stance Inference ──────────────────────────────────────────────────────────

function inferStance(
  messages: string[],
  intelligence: ConversationIntelligence
): ParticipantStance {
  const combined = messages.join(" ").toLowerCase();
  const conflictLevel = intelligence.conflict.level;

  if (combined.includes("let's") || combined.includes("we can") || combined.includes("together")) {
    return "cooperative";
  }

  if (combined.includes("i did") || combined.includes("my part") || combined.includes("not my fault")) {
    return "defensive";
  }

  if (combined.includes("you always") || combined.includes("you never") || combined.includes("your fault")) {
    return "hostile";
  }

  if (combined.includes("both sides") || combined.includes("let me help") || combined.includes("mediator")) {
    return "mediating";
  }

  if (combined.includes("fine") || combined.includes("whatever") || combined.includes("ok")) {
    return "passive";
  }

  if (conflictLevel < 0.3) {
    return "neutral";
  }

  return "unknown";
}

// ─── Behavior Analysis ─────────────────────────────────────────────────────────

function analyzeBehavior(
  messages: string[],
  intelligence: ConversationIntelligence
): ParticipantBehavior {
  const combined = messages.join(" ").toLowerCase();

  let cooperationLevel = 0.5;
  let defensiveness = 0.3;
  let escalationContribution = 0.2;
  let personalAttacks = false;
  let blameTarget: string | undefined;

  // Cooperation signals
  if (combined.includes("let's") || combined.includes("we can") || combined.includes("together")) {
    cooperationLevel = 0.8;
  }

  // Defensive signals
  if (combined.includes("i did") || combined.includes("my part") || combined.includes("not my fault")) {
    defensiveness = 0.7;
  }

  // Escalation signals
  if (combined.includes("you always") || combined.includes("you never")) {
    escalationContribution = 0.8;
    blameTarget = "other";
  }

  // Personal attack detection
  if (combined.includes("you are useless") || combined.includes("you're an idiot") ||
      combined.includes("you never do") || combined.includes("you always mess")) {
    personalAttacks = true;
    escalationContribution = 0.9;
  }

  return {
    cooperationLevel,
    defensiveness,
    escalationContribution,
    personalAttacks,
    blameTarget,
  };
}

// ─── Claim Extraction ──────────────────────────────────────────────────────────

function extractClaims(
  messages: string[],
  participantId: string,
  userFacts?: string[]
): ParticipantClaim[] {
  const claims: ParticipantClaim[] = [];

  for (const msg of messages) {
    const lower = msg.toLowerCase();

    // Detect claims (statements of fact)
    if (lower.includes("i sent") || lower.includes("i submitted") || lower.includes("i completed")) {
      const claimText = msg;
      const isUserFact = userFacts?.some(f => f.toLowerCase().includes(lower)) || false;

      claims.push({
        text: claimText,
        type: isUserFact ? "verified_fact" : "participant_claim",
        supportedByEvidence: false,
        disputedBy: [],
      });
    }

    if (lower.includes("you didn't") || lower.includes("you never") || lower.includes("you didn't send")) {
      claims.push({
        text: msg,
        type: "participant_claim",
        supportedByEvidence: false,
        disputedBy: [],
      });
    }
  }

  return claims;
}

// ─── Concern Extraction ────────────────────────────────────────────────────────

function extractConcerns(messages: string[]): string[] {
  const concerns: string[] = [];

  for (const msg of messages) {
    const lower = msg.toLowerCase();

    if (lower.includes("concern") || lower.includes("worried") || lower.includes("afraid")) {
      concerns.push(msg);
    }

    if (lower.includes("problem") || lower.includes("issue") || lower.includes("wrong")) {
      concerns.push(msg);
    }
  }

  return concerns;
}

// ─── Request Extraction ────────────────────────────────────────────────────────

function extractRequests(messages: string[]): string[] {
  const requests: string[] = [];

  for (const msg of messages) {
    const lower = msg.toLowerCase();

    if (lower.includes("please") || lower.includes("can you") || lower.includes("could you")) {
      requests.push(msg);
    }

    if (lower.includes("i need") || lower.includes("i want") || lower.includes("i expect")) {
      requests.push(msg);
    }
  }

  return requests;
}

// ─── Fact Extraction ───────────────────────────────────────────────────────────

function extractFacts(
  messages: string[],
  claims: ParticipantClaim[],
  userFacts?: string[]
): { knownFacts: string[]; disputedFacts: string[] } {
  const knownFacts: string[] = [];
  const disputedFacts: string[] = [];

  // User-provided facts are considered known
  if (userFacts) {
    knownFacts.push(...userFacts);
  }

  // Check for disputed facts (contradicting claims)
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      if (claims[i].text.toLowerCase() !== claims[j].text.toLowerCase()) {
        // Simple heuristic: if claims are different, they might be disputed
        if (claims[i].text.toLowerCase().includes(claims[j].text.toLowerCase()) ||
            claims[j].text.toLowerCase().includes(claims[i].text.toLowerCase())) {
          disputedFacts.push(claims[i].text);
          disputedFacts.push(claims[j].text);
        }
      }
    }
  }

  return { knownFacts, disputedFacts };
}

// ─── Role Inference ────────────────────────────────────────────────────────────

function inferRole(messages: string[], _intelligenceParam: ConversationIntelligence): string {
  const combined = messages.join(" ").toLowerCase();

  if (combined.includes("manager") || combined.includes("boss") || combined.includes("supervisor")) {
    return "manager";
  }

  if (combined.includes("employee") || combined.includes("team member")) {
    return "employee";
  }

  if (combined.includes("professor") || combined.includes("teacher")) {
    return "professor";
  }

  if (combined.includes("student")) {
    return "student";
  }

  if (combined.includes("client") || combined.includes("customer")) {
    return "client";
  }

  return "unknown";
}

// ─── Relationship Inference ────────────────────────────────────────────────────

function inferRelationship(messages: string[], intelligenceParam: ConversationIntelligence): string {
  return intelligenceParam.relationship;
}

// ─── Language Inference ────────────────────────────────────────────────────────

function inferLanguage(messages: string[], intelligenceParam: ConversationIntelligence): string {
  return intelligenceParam.language.primary;
}

// ─── Conflict Structure Building ───────────────────────────────────────────────

function buildConflictStructure(
  messages: { sender: string; text: string }[],
  intelligence: ConversationIntelligence,
  participants: ParticipantIntelligence[]
): ConflictStructure {
  const conflictLevel = intelligence.conflict.level;
  const escalationLevel = intelligence.conflict.escalation;
  const escalationTrend = determineEscalationTrend(messages);
  const trigger = intelligence.conflict.trigger;
  const coreDisagreement = intelligence.conflict.coreDisagreement;

  // Find secondary disagreements
  const secondaryDisagreements = findSecondaryDisagreements(participants);

  // Detect misunderstandings
  const misunderstandings = detectMisunderstandings(messages, participants);

  // Detect factual disputes
  const factualDisputes = detectFactualDisputes(participants);

  // Detect personal attacks
  const personalAttacks = intelligence.conflict.personalAttacks;
  const personalAttackTargets = findPersonalAttackTargets(participants);

  // Detect blame pattern
  const blamePattern = detectBlamePattern(participants);
  const blameTargets = findBlameTargets(participants);

  // Calculate defensiveness
  const defensiveness = calculateDefensiveness(participants);

  // Find unresolved questions
  const unresolvedQuestions = findUnresolvedQuestions(messages, participants);

  // Identify resolution opportunities
  const resolutionOpportunities = identifyResolutionOpportunities(
    intelligence,
    participants,
    misunderstandings
  );

  return {
    conflictLevel,
    escalationLevel,
    escalationTrend,
    escalationTriggerPoint: trigger || undefined,
    trigger,
    coreDisagreement,
    secondaryDisagreements,
    misunderstandings,
    factualDisputes,
    personalAttacks,
    personalAttackTargets,
    blamePattern,
    blameTargets,
    defensiveness,
    unresolvedQuestions,
    resolutionOpportunities,
  };
}

// ─── Escalation Trend Detection ────────────────────────────────────────────────

function determineEscalationTrend(messages: { sender: string; text: string }[]): EscalationTrend {
  if (messages.length < 3) return "unknown";

  // Simple heuristic: check if messages become more aggressive over time
  const earlyMessages = messages.slice(0, Math.floor(messages.length / 2));
  const lateMessages = messages.slice(Math.floor(messages.length / 2));

  const earlyAggression = calculateAggression(earlyMessages);
  const lateAggression = calculateAggression(lateMessages);

  if (lateAggression > earlyAggression + 0.2) return "increasing";
  if (lateAggression < earlyAggression - 0.2) return "decreasing";
  return "stable";
}

function calculateAggression(messages: { sender: string; text: string }[]): number {
  let score = 0;
  for (const msg of messages) {
    const lower = msg.text.toLowerCase();
    if (lower.includes("!!")) score += 0.2;
    if (lower.includes("you always") || lower.includes("you never")) score += 0.3;
    if (lower.includes("your fault") || lower.includes("you did")) score += 0.3;
    if (lower.includes("useless") || lower.includes("idiot")) score += 0.4;
  }
  return Math.min(1, score);
}

// ─── Secondary Disagreements ───────────────────────────────────────────────────

function findSecondaryDisagreements(participants: ParticipantIntelligence[]): string[] {
  const disagreements: string[] = [];

  // Check for different positions
  const positions = participants.map(p => p.position.mainPosition);
  const uniquePositions = new Set(positions);

  if (uniquePositions.size > 1) {
    disagreements.push("Different interpretations of the situation");
  }

  // Check for different requested outcomes
  const outcomes = participants.map(p => p.position.requestedOutcome);
  const uniqueOutcomes = new Set(outcomes);

  if (uniqueOutcomes.size > 1) {
    disagreements.push("Different desired outcomes");
  }

  return disagreements;
}

// ─── Misunderstanding Detection ────────────────────────────────────────────────

function detectMisunderstandings(
  messages: { sender: string; text: string }[],
  participants: ParticipantIntelligence[]
): Misunderstanding[] {
  const misunderstandings: Misunderstanding[] = [];

  // Check for "I thought" or "I understood" patterns
  for (const msg of messages) {
    const lower = msg.text.toLowerCase();
    if (lower.includes("i thought") || lower.includes("i understood") || lower.includes("i didn't know")) {
      misunderstandings.push({
        description: "Possible miscommunication about expectations or information",
        participants: [msg.sender],
        possibleCause: "Unclear communication or missing information",
        resolutionSuggestion: "Clarify what was communicated and what was understood",
      });
    }
  }

  // Check for deadline/scope ambiguity
  const hasDeadlineMention = messages.some(m => m.text.toLowerCase().includes("deadline"));
  const hasScopeMention = messages.some(m => m.text.toLowerCase().includes("my part") || m.text.toLowerCase().includes("my section"));

  if (hasDeadlineMention && hasScopeMention) {
    misunderstandings.push({
      description: "Possible scope ambiguity about what was expected",
      participants: participants.map(p => p.participantId),
      possibleCause: "Deadline or scope may not have been clearly communicated",
      resolutionSuggestion: "Clarify exactly what was expected and by when",
    });
  }

  return misunderstandings;
}

// ─── Factual Dispute Detection ─────────────────────────────────────────────────

function detectFactualDisputes(participants: ParticipantIntelligence[]): FactualDispute[] {
  const disputes: FactualDispute[] = [];

  // Find contradicting claims
  const allClaims = participants.flatMap(p => p.claims);

  for (let i = 0; i < allClaims.length; i++) {
    for (let j = i + 1; j < allClaims.length; j++) {
      const claim1 = allClaims[i];
      const claim2 = allClaims[j];

      // Simple heuristic: if claims mention similar topics but different outcomes
      if (claim1.text.toLowerCase().includes("sent") && claim2.text.toLowerCase().includes("didn't receive")) {
        disputes.push({
          topic: "File submission",
          claims: [
            { participantId: "unknown", claim: claim1.text },
            { participantId: "unknown", claim: claim2.text },
          ],
          possibleResolution: "Verify file delivery through other channels",
        });
      }
    }
  }

  return disputes;
}

// ─── Personal Attack Target Finding ────────────────────────────────────────────

function findPersonalAttackTargets(participants: ParticipantIntelligence[]): string[] {
  const targets: string[] = [];

  for (const participant of participants) {
    if (participant.behavior.personalAttacks) {
      // The target is likely the person being addressed
      targets.push(participant.participantId);
    }
  }

  return targets;
}

// ─── Blame Pattern Detection ───────────────────────────────────────────────────

function detectBlamePattern(participants: ParticipantIntelligence[]): BlamePattern {
  let blameCount = 0;
  let selfBlameCount = 0;
  let sharedBlameCount = 0;

  for (const participant of participants) {
    if (participant.behavior.blameTarget === "other") blameCount++;
    if (participant.behavior.blameTarget === "self") selfBlameCount++;
    if (participant.position.mainPosition.includes("we") || participant.position.mainPosition.includes("both")) {
      sharedBlameCount++;
    }
  }

  if (selfBlameCount > 0 && blameCount === 0) return "self_blame";
  if (blameCount > 1) return "shared_responsibility";
  if (blameCount === 1) return "direct_blame";
  if (sharedBlameCount > 0) return "shared_responsibility";

  return "unclear_responsibility";
}

// ─── Blame Target Finding ──────────────────────────────────────────────────────

function findBlameTargets(participants: ParticipantIntelligence[]): string[] {
  const targets: string[] = [];

  for (const participant of participants) {
    if (participant.behavior.blameTarget === "other") {
      targets.push(participant.participantId);
    }
  }

  return targets;
}

// ─── Defensiveness Calculation ─────────────────────────────────────────────────

function calculateDefensiveness(participants: ParticipantIntelligence[]): number {
  if (participants.length === 0) return 0;

  const totalDefensiveness = participants.reduce(
    (sum, p) => sum + p.behavior.defensiveness,
    0
  );

  return totalDefensiveness / participants.length;
}

// ─── Unresolved Question Finding ───────────────────────────────────────────────

function findUnresolvedQuestions(
  messages: { sender: string; text: string }[],
  _participantsParam: ParticipantIntelligence[]
): string[] {
  const questions: string[] = [];

  for (const msg of messages) {
    if (msg.text.includes("?")) {
      questions.push(msg.text);
    }
  }

  return questions;
}

// ─── Resolution Opportunity Identification ─────────────────────────────────────

function identifyResolutionOpportunities(
  intelligence: ConversationIntelligence,
  participants: ParticipantIntelligence[],
  misunderstandings: Misunderstanding[]
): ResolutionOpportunity[] {
  const opportunities: ResolutionOpportunity[] = [];

  // If there are misunderstandings, clarification is an opportunity
  if (misunderstandings.length > 0) {
    opportunities.push({
      type: "clarify_misunderstanding",
      description: "Address the miscommunication directly",
      requiredParticipants: participants.map(p => p.participantId),
      difficulty: "moderate",
    });
  }

  // If there are factual disputes, establishing facts is an opportunity
  const hasFactualDisputes = participants.some(p => p.disputedFacts.length > 0);
  if (hasFactualDisputes) {
    opportunities.push({
      type: "establish_facts",
      description: "Verify claims through evidence or third parties",
      requiredParticipants: participants.map(p => p.participantId),
      difficulty: "hard",
    });
  }

  // If blame is high, acknowledging concerns is an opportunity
  if (intelligence.conflict.level > 0.5) {
    opportunities.push({
      type: "acknowledge_concern",
      description: "Acknowledge each party's concerns",
      requiredParticipants: participants.map(p => p.participantId),
      difficulty: "easy",
    });
  }

  // If there's a resolution opportunity according to intelligence
  if (intelligence.conflict.resolutionOpportunity) {
    opportunities.push({
      type: "propose_solution",
      description: "Propose a concrete next step",
      requiredParticipants: ["user"],
      difficulty: "moderate",
    });
  }

  return opportunities;
}

// ─── Group Analysis Building ───────────────────────────────────────────────────

function buildGroupAnalysis(
  participants: ParticipantIntelligence[],
  intelligence: ConversationIntelligence
): GroupConversationAnalysis {
  const isGroup = participants.length > 2;

  // Determine group dynamics
  const groupDynamics = analyzeGroupDynamics(participants);

  // Determine dominant language
  const dominantLanguage = intelligence.language.primary;

  // Check if multilingual
  const languages = participants.map(p => p.language);
  const uniqueLanguages = new Set(languages);
  const multilingual = uniqueLanguages.size > 1;

  // Build language distribution
  const languageDistribution = participants.map(p => ({
    participantId: p.participantId,
    language: p.language,
  }));

  // Find user position
  const userPosition = participants.find(p => p.participantId === "user") || null;

  return {
    isGroup,
    participantCount: participants.length,
    participants,
    groupDynamics,
    dominantLanguage,
    multilingual,
    languageDistribution,
    userPosition,
  };
}

// ─── Group Dynamics Analysis ───────────────────────────────────────────────────

function analyzeGroupDynamics(participantsParam: ParticipantIntelligence[]): GroupDynamics {
  const dominantParticipants: string[] = [];
  const silentParticipants: string[] = [];
  const conflictParticipants: string[] = [];
  const neutralParticipants: string[] = [];
  const affectedParticipants: string[] = [];
  const potentialMediators: string[] = [];

  for (const participant of participantsParam) {
    // Dominant: high escalation contribution or many messages
    if (participant.behavior.escalationContribution > 0.6) {
      dominantParticipants.push(participant.participantId);
    }

    // Conflict: hostile stance or personal attacks
    if (participant.stance === "hostile" || participant.behavior.personalAttacks) {
      conflictParticipants.push(participant.participantId);
    }

    // Neutral: neutral stance and low conflict
    if (participant.stance === "neutral" || participant.stance === "cooperative") {
      neutralParticipants.push(participant.participantId);
    }

    // Affected: has concerns or is target of blame
    if (participant.concerns.length > 0 || participant.behavior.blameTarget) {
      affectedParticipants.push(participant.participantId);
    }

    // Potential mediator: cooperative or mediating stance
    if (participant.stance === "cooperative" || participant.stance === "mediating") {
      potentialMediators.push(participant.participantId);
    }
  }

  return {
    dominantParticipants,
    silentParticipants,
    conflictParticipants,
    neutralParticipants,
    affectedParticipants,
    potentialMediators,
  };
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export function logConflictAnalysis(
  result: ConflictAnalysisResult,
  context?: string
): void {
  if (process.env.NEXTMSG_DEBUG_AI !== "true") return;

  const prefix = context ? `[ConflictAnalysis:${context}]` : "[ConflictAnalysis]";

  console.log(`${prefix} Participants: ${result.participants.length}`);
  console.log(`${prefix} Conflict Level: ${result.conflictStructure.conflictLevel}`);
  console.log(`${prefix} Escalation Trend: ${result.conflictStructure.escalationTrend}`);
  console.log(`${prefix} Misunderstandings: ${result.conflictStructure.misunderstandings.length}`);
  console.log(`${prefix} Resolution Opportunities: ${result.conflictStructure.resolutionOpportunities.length}`);

  for (const participant of result.participants) {
    console.log(`${prefix} Participant ${participant.label}: ${participant.intent} / ${participant.emotion.primary}`);
  }
}
