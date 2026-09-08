import type {
  ConflictCoachingInput,
  ConflictCoachingOutput,
  CoachingMode,
  ResolutionRecord,
  RelationshipProfile,
} from "./memory-types";

// ─── Conflict Coaching Engine ──────────────────────────────────────────────────
//
// Provides guidance based on memory, relationship context, and current conflict.
//
// Coaching Modes:
// - understand: Seek to understand the other person
// - calm_down: Help calm down and not escalate
// - defend: Defend your position respectfully
// - explain: Explain your perspective clearly
// - reach_agreement: Try to find common ground
// - set_boundary: Establish a boundary
// - apologize: Apologize effectively
// - repair_relationship: Work on relationship repair
// - end_respectfully: End the conflict respectfully
//
// Memory Integration:
// - Recurring issues: Suggest deeper conversation
// - Unresolved follow-up: Reference previous resolution
// - Boundary established: Remind of agreed boundary
// - Communication preference: Suggest preferred method
// - Resolution: Reference what worked before
// ──────────────────────────────────────────────────────────────────────────────

export function provideConflictCoaching(
  input: ConflictCoachingInput
): ConflictCoachingOutput {
  const { currentConflict, userGoal, relevantMemory, relationshipContext } = input;

  // Check for recurring issues
  const recurringIssue = detectRecurringIssue(
    currentConflict.coreDisagreement,
    relevantMemory
  );

  // Build assessment
  const assessment = buildAssessment(currentConflict, recurringIssue);

  // Build recommended approach
  const recommendedApproach = buildRecommendedApproach(
    userGoal,
    currentConflict,
    recurringIssue,
    relevantMemory,
    relationshipContext
  );

  // Build next steps
  const nextSteps = buildNextSteps(
    userGoal,
    currentConflict,
    recurringIssue,
    relevantMemory
  );

  // Build things to avoid
  const thingsToAvoid = buildThingsToAvoid(
    userGoal,
    currentConflict,
    relevantMemory
  );

  // Build relevant past context
  const relevantPastContext = buildRelevantPastContext(
    currentConflict.coreDisagreement,
    relevantMemory
  );

  return {
    assessment,
    recurringIssue: recurringIssue || undefined,
    recommendedApproach,
    nextSteps,
    thingsToAvoid,
    relevantPastContext: relevantPastContext || undefined,
  };
}

// ─── Detect Recurring Issue ───────────────────────────────────────────────────

function detectRecurringIssue(
  coreDisagreement: string,
  relevantMemory: ResolutionRecord[]
): string | null {
  const disagreementLower = coreDisagreement.toLowerCase();

  for (const resolution of relevantMemory) {
    const causeLower = resolution.conflictCause.toLowerCase();

    // Check if the current disagreement is similar to a previous cause
    if (isSimilarContent(disagreementLower, causeLower)) {
      return resolution.conflictCause;
    }

    // Check for keywords in common
    const causeWords = causeLower.split(/\s+/);
    const disagreementWords = disagreementLower.split(/\s+/);

    const commonWords = causeWords.filter((word) =>
      disagreementWords.includes(word)
    );

    if (commonWords.length >= 3) {
      return resolution.conflictCause;
    }
  }

  return null;
}

// ─── Build Assessment ─────────────────────────────────────────────────────────

function buildAssessment(
  conflict: ConflictCoachingInput["currentConflict"],
  recurringIssue: string | null
): string {
  let assessment = "";

  if (recurringIssue) {
    assessment += `This appears to be a recurring issue related to "${recurringIssue}". `;
  }

  if (conflict.escalation > 0.7) {
    assessment += "The conflict is highly escalated and needs de-escalation. ";
  } else if (conflict.escalation > 0.4) {
    assessment += "The conflict is moderately escalated. ";
  } else {
    assessment += "The conflict is relatively calm. ";
  }

  if (conflict.personalAttacks) {
    assessment += "There are personal attacks happening which makes resolution harder. ";
  }

  if (conflict.misunderstanding) {
    assessment += "There appears to be a misunderstanding that could be clarified. ";
  }

  return assessment.trim();
}

// ─── Build Recommended Approach ───────────────────────────────────────────────

function buildRecommendedApproach(
  goal: CoachingMode,
  conflict: ConflictCoachingInput["currentConflict"],
  recurringIssue: string | null,
  relevantMemory: ResolutionRecord[],
  relationshipContext?: RelationshipProfile
): string {
  let approach = "";

  switch (goal) {
    case "understand":
      approach = "Focus on asking open-ended questions to understand their perspective. ";
      if (recurringIssue) {
        approach += `This issue has come up before. Consider asking what's different this time. `;
      }
      break;

    case "calm_down":
      approach = "Use a calm, non-escalating tone. Acknowledge their feelings without necessarily agreeing. ";
      if (conflict.personalAttacks) {
        approach += "Try to redirect from personal attacks to the issue itself. ";
      }
      break;

    case "defend":
      approach = "State your position clearly without being aggressive. Use 'I' statements. ";
      if (conflict.misunderstanding) {
        approach += "Address the misunderstanding directly with specific examples. ";
      }
      break;

    case "explain":
      approach = "Explain your perspective clearly and calmly. Be specific about your reasons. ";
      if (relevantMemory.length > 0) {
        approach += `Reference past context if it helps explain your position. `;
      }
      break;

    case "reach_agreement":
      approach = "Look for common ground and areas of compromise. ";
      if (relationshipContext?.communicationPreferences.length) {
        approach += `Use the communication style you've agreed works best. `;
      }
      break;

    case "set_boundary":
      approach = "Clearly state your boundary without being aggressive. Explain why it's important to you. ";
      break;

    case "apologize":
      approach = "Take responsibility for your part. Be specific about what you're apologizing for. ";
      break;

    case "repair_relationship":
      approach = "Focus on the relationship rather than being right. Express your care for the relationship. ";
      if (recurringIssue) {
        approach += `This recurring issue may need a deeper conversation outside of this conflict. `;
      }
      break;

    case "end_respectfully":
      approach = "Acknowledge their perspective even if you disagree. End on a respectful note. ";
      break;
  }

  return approach;
}

// ─── Build Next Steps ─────────────────────────────────────────────────────────

function buildNextSteps(
  goal: CoachingMode,
  conflict: ConflictCoachingInput["currentConflict"],
  recurringIssue: string | null,
  relevantMemory: ResolutionRecord[]
): string[] {
  const steps: string[] = [];

  switch (goal) {
    case "understand":
      steps.push("Ask an open-ended question about their perspective");
      steps.push("Listen without interrupting");
      steps.push("Acknowledge what you hear before responding");
      if (recurringIssue) {
        steps.push("Ask if this connects to the previous time this came up");
      }
      break;

    case "calm_down":
      steps.push("Take a deep breath before responding");
      steps.push("Use a calm, measured tone");
      steps.push("Acknowledge their feelings");
      if (conflict.escalation > 0.7) {
        steps.push("Consider suggesting a brief pause");
      }
      break;

    case "defend":
      steps.push("State your position clearly");
      steps.push("Provide specific examples if needed");
      steps.push("Stay focused on the issue, not the person");
      break;

    case "explain":
      steps.push("Start with 'I feel' or 'I think'");
      steps.push("Be specific about your reasoning");
      steps.push("Ask if they understand your perspective");
      break;

    case "reach_agreement":
      steps.push("Identify areas of agreement first");
      steps.push("Propose a compromise or middle ground");
      steps.push("Ask for their suggestions");
      if (relevantMemory.length > 0) {
        steps.push("Consider what worked in previous resolutions");
      }
      break;

    case "set_boundary":
      steps.push("Clearly state your boundary");
      steps.push("Explain why it's important");
      steps.push("Be firm but respectful");
      break;

    case "apologize":
      steps.push("Take responsibility without excuses");
      steps.push("Be specific about what you're apologizing for");
      steps.push("Ask how you can make it right");
      break;

    case "repair_relationship":
      steps.push("Express your care for the relationship");
      steps.push("Acknowledge their feelings");
      steps.push("Suggest a time to talk more calmly");
      if (recurringIssue) {
        steps.push("Suggest addressing the recurring issue separately");
      }
      break;

    case "end_respectfully":
      steps.push("Acknowledge their perspective");
      steps.push("Express your position respectfully");
      steps.push("End on a neutral or positive note");
      break;
  }

  return steps;
}

// ─── Build Things to Avoid ────────────────────────────────────────────────────

function buildThingsToAvoid(
  goal: CoachingMode,
  conflict: ConflictCoachingInput["currentConflict"],
  relevantMemory: ResolutionRecord[]
): string[] {
  const avoid: string[] = [];

  // Universal things to avoid
  avoid.push("Personal attacks or name-calling");
  avoid.push("Bringing up unrelated past issues");

  // Avoid based on conflict characteristics
  if (conflict.personalAttacks) {
    avoid.push("Responding to personal attacks with more attacks");
    avoid.push("Defending yourself aggressively");
  }

  if (conflict.misunderstanding) {
    avoid.push("Assuming you know what they mean");
    avoid.push("Getting defensive before understanding");
  }

  if (conflict.escalation > 0.7) {
    avoid.push("Escalating further with strong language");
    avoid.push("Trying to win the argument");
  }

  // Avoid based on memory
  if (relevantMemory.length > 0) {
    const lastResolution = relevantMemory[0];
    if (lastResolution.unresolvedFollowup) {
      avoid.push("Ignoring the unresolved follow-up");
    }
  }

  // Goal-specific avoidance
  switch (goal) {
    case "understand":
      avoid.push("Interrupting while they're speaking");
      avoid.push("Formulating your response while they're talking");
      break;

    case "calm_down":
      avoid.push("Using inflammatory language");
      avoid.push("Being sarcastic or dismissive");
      break;

    case "apologize":
      avoid.push("Saying 'I'm sorry you feel that way'");
      avoid.push("Adding 'but' after your apology");
      break;
  }

  // Remove duplicates
  return [...new Set(avoid)];
}

// ─── Build Relevant Past Context ──────────────────────────────────────────────

function buildRelevantPastContext(
  coreDisagreement: string,
  relevantMemory: ResolutionRecord[]
): string | null {
  if (relevantMemory.length === 0) return null;

  const mostRelevant = relevantMemory[0];
  let context = "";

  if (mostRelevant.resolution) {
    context += `Previously, a similar issue was resolved by: ${mostRelevant.resolution}. `;
  }

  if (mostRelevant.communicationPreference) {
    context += `Communication preference established: ${mostRelevant.communicationPreference}. `;
  }

  if (mostRelevant.boundaryEstablished) {
    context += `Boundary established: ${mostRelevant.boundaryEstablished}. `;
  }

  if (mostRelevant.unresolvedFollowup) {
    context += `Outstanding follow-up: ${mostRelevant.unresolvedFollowup}. `;
  }

  return context.trim() || null;
}

// ─── Helper: Similarity Check ─────────────────────────────────────────────────

function isSimilarContent(a: string, b: string): boolean {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));

  let commonCount = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      commonCount++;
    }
  }

  const totalWords = Math.max(wordsA.size, wordsB.size);
  const similarity = commonCount / totalWords;

  return similarity >= 0.4;
}
