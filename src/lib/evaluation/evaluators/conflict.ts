/**
 * Conflict Evaluator
 * 
 * Evaluates conflict handling: escalation detection, de-escalation quality,
 * position preservation, boundary maintenance, and resolution opportunity.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── Escalation Detection ────────────────────────────────────────────────────

const ESCALATION_MARKERS = [
  /\b(?:incompetent|useless|waste|terrible|awful|worst|ridiculous|absurd)\b/gi,
  /\b(?:always|never)\s+(?:fail|wrong|lie|cheat|manipulate)\b/gi,
  /\b(?:fire|sue|lawsuit|report|complaint)\b/gi,
  /\b(?:stupid|idiot|moron|dumb|pathetic)\b/gi,
  /\b(?:shut\s+up|get\s+out|leave\s+me\s+alone)\b/gi,
  /\b(?:i\s+hate|can't\s+stand|despise|loathe)\b/gi,
  /\b(?:you\s+are|you're)\s+(?:the\s+worst|terrible|awful|incompetent)\b/gi,
];

const DEESCALATION_MARKERS = [
  /\b(?:understand|hear|respect)\s+(?:your|the|their)\s+(?:concern|position|perspective|feelings?|point)\b/gi,
  /\b(?:i\s+(?:appreciate|value|respect|understand|see))\b/gi,
  /\b(?:let's|we\s+can|we\s+should)\s+(?:work|talk|discuss|figure|sort|resolve|fix|move)\b/gi,
  /\b(?:i'm\s+sorry|apologize|apologies|my\s+(?:bad|fault|mistake))\b/gi,
  /\b(?:can\s+we|let's)\s+(?:find|explore|consider|talk|work)\b/gi,
  /\b(?:one\s+option|another\s+approach|alternative|one\s+way)\b/gi,
  /\b(?:moving\s+forward|from\s+now\s+on|in\s+the\s+future|next\s+time)\b/gi,
  /\b(?:i\s+hear\s+you|you're?\s+right|fair\s+enough|point\s+taken)\b/gi,
  /\b(?:let's\s+(?:figure|talk|work|sort|resolve|fix|calm|take))\b/gi,
  /\b(?:i\s+(?:get|got)\s+it|makes?\s+sense|i\s+see\s+(?:your|the)\s+point)\b/gi,
  /\b(?:no\s+(?:worries|problem|need\s+to\s+worry))\b/gi,
  /\b(?:it's\s+(?:okay|fine)|that's\s+(?:fine|okay|fair))\b/gi,
  /\b(?:we're?\s+(?:in\s+this\s+together|on\s+the\s+same\s+team))\b/gi,
  /\b(?:i\s+don't\s+(?:want|mean)\s+to)\b/gi,
  /\b(?:can\s+we\s+(?:start\s+over|try\s+again|find\s+a\s+way))\b/gi,
  /\b(?:i\s+(?:need|want)\s+to\s+(?:understand|know|hear))\b/gi,
  /\b(?:help\s+me\s+(?:understand|see|know))\b/gi,
  /\b(?:what\s+(?:happened|went\s+wrong|can\s+we))\b/gi,
  /\b(?:together|both\s+sides|each\s+other)\b/gi,
];

const BOUNDARY_MARKERS = [
  /\b(?:not\s+(?:comfortable|acceptable|okay|ok|willing))\b/gi,
  /\b(?:i\s+(?:will\s+not|won't|can't|cannot|refuse|decline))\b/gi,
  /\b(?:this\s+is\s+(?:a\s+)?boundary|personal\s+boundary)\b/gi,
  /\b(?:please\s+don't|do\s+not)\b/gi,
  /\b(?:unacceptable|not\s+tolerated|crossed\s+a\s+line)\b/gi,
];

const RESOLUTION_MARKERS = [
  /\b(?:solution|resolve|compromise|agreement|understanding)\b/gi,
  /\b(?:moving\s+forward|from\s+now\s+on|next\s+time)\b/gi,
  /\b(?:can\s+we\s+agree|let's\s+agree|how\s+about)\b/gi,
  /\b(?:one\s+way|another\s+way|option)\b/gi,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    const found = text.match(p);
    if (found) count += found.length;
  }
  return count;
}

// ─── Main Conflict Evaluator ─────────────────────────────────────────────────

export function evaluateConflict(
  benchCase: BenchmarkCase,
  candidate: string,
  _context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];
  
  const lowerCandidate = candidate.toLowerCase();
  
  // Escalation handling
  const escalationCount = countMatches(candidate, ESCALATION_MARKERS);
  const deEscalationCount = countMatches(candidate, DEESCALATION_MARKERS);
  
  if (benchCase.expected.escalationExpected) {
    // Expect escalation to be controlled
    metrics.push({
      name: "conflict_escalation_controlled",
      value: escalationCount <= 1 ? 1 : escalationCount <= 2 ? 0.5 : 0,
      pass: escalationCount <= 1 ? "PASS" : escalationCount <= 2 ? "WARN" : "FAIL",
      details: `Escalation markers: ${escalationCount}, De-escalation markers: ${deEscalationCount}`,
    });
  }
  
  if (benchCase.expected.deEscalationExpected) {
    // Expect de-escalation to be present
    metrics.push({
      name: "conflict_de_escalation_present",
      value: deEscalationCount >= 1 ? 1 : 0,
      pass: deEscalationCount >= 1 ? "PASS" : "FAIL",
      details: `De-escalation markers: ${deEscalationCount}`,
    });
  }
  
  // Boundary preservation
  const boundaryCount = countMatches(candidate, BOUNDARY_MARKERS);
  if (benchCase.expected.boundaryPreserved !== false) {
    // Check if boundaries in original are preserved
    const original = benchCase.conversation.length > 0
      ? benchCase.conversation[benchCase.conversation.length - 1].content
      : "";
    const origBoundaryCount = countMatches(original, BOUNDARY_MARKERS);
    
    if (origBoundaryCount > 0) {
      metrics.push({
        name: "conflict_boundary_preserved",
        value: boundaryCount > 0 ? 1 : 0.5,
        pass: boundaryCount > 0 ? "PASS" : "WARN",
        details: `Original boundaries: ${origBoundaryCount}, Candidate boundaries: ${boundaryCount}`,
      });
    }
  }
  
  // Position preservation
  if (benchCase.expected.positionPreserved !== false) {
    const original = benchCase.conversation.length > 0
      ? benchCase.conversation[benchCase.conversation.length - 1].content
      : "";
    
    // Use word-boundary matching to avoid substring collisions
    // e.g. "disagree" should NOT match "agree"
    const stancePatterns: [string, RegExp][] = [
      ["disagree", /\bdisagree(?:s|d|ing)?\b/i],
      ["agree", /\bagree(?:s|d|ing)?\b/i],
      ["oppose", /\boppose(?:s|d|ing)?\b/i],
      ["support", /\bsupport(?:s|ed|ing)?\b/i],
      ["reject", /\breject(?:s|ed|ing)?\b/i],
      ["accept", /\baccept(?:s|ed|ing)?\b/i],
    ];
    
    // Detect negation patterns that flip stance meaning
    const negationPatterns = [
      /\b(?:don't|do\s+not|doesn't|does\s+not|didn't|did\s+not|won't|will\s+not|can't|cannot|can\s+not|never|neither|nor)\b/i,
    ];
    
    function flipStance(stance: string): string {
      if (stance === "agree") return "disagree";
      if (stance === "disagree") return "agree";
      if (stance === "support") return "oppose";
      if (stance === "oppose") return "support";
      if (stance === "accept") return "reject";
      if (stance === "reject") return "accept";
      return stance;
    }
    
    function getEffectiveStance(text: string): string[] {
      const detected = stancePatterns
        .filter(([, pattern]) => pattern.test(text))
        .map(([name]) => name);
      const hasNeg = negationPatterns.some((p) => p.test(text));
      if (hasNeg) {
        return [...new Set(detected.map(flipStance))];
      }
      return detected;
    }
    
    const origStance = getEffectiveStance(original);
    const candStance = getEffectiveStance(candidate);
    
    // Also detect implicit disagreement patterns when no explicit stance words found
    const implicitDisagreePatterns = [
      /\b(?:differently|wrong|incorrect|not\s+(?:right|correct|accurate|true|fair))\b/i,
      /\b(?:i\s+don't\s+think|doesn't\s+seem|doesn't\s+feel)\b/i,
    ];
    
    // If original has implicit disagreement but no explicit stance, treat as implicit "disagree"
    const origHasImplicitDisagree = origStance.length === 0 && implicitDisagreePatterns.some((p) => p.test(original));
    const candHasImplicitDisagree = candStance.length === 0 && implicitDisagreePatterns.some((p) => p.test(candidate));
    
    let effectiveOrigStance = origStance.length > 0 ? origStance : (origHasImplicitDisagree ? ["disagree"] : []);
    let effectiveCandStance = candStance.length > 0 ? candStance : (candHasImplicitDisagree ? ["disagree"] : []);
    
    if (effectiveOrigStance.length > 0) {
      // Check if candidate has the same effective stance
      const stancePreserved = effectiveOrigStance.some((s) => effectiveCandStance.includes(s));
      
      // Check for stance reversal: the candidate expresses the opposite stance
      const stanceReversed = effectiveOrigStance.some((s) => {
        if (s === "agree") return effectiveCandStance.includes("disagree");
        if (s === "disagree") return effectiveCandStance.includes("agree");
        if (s === "support") return effectiveCandStance.includes("oppose");
        if (s === "oppose") return effectiveCandStance.includes("support");
        if (s === "accept") return effectiveCandStance.includes("reject");
        if (s === "reject") return effectiveCandStance.includes("accept");
        return false;
      });
      
      metrics.push({
        name: "conflict_position_preserved",
        value: stanceReversed ? 0 : stancePreserved ? 1 : 0.5,
        pass: stanceReversed ? "FAIL" : "PASS",
        details: `Original stance: [${origStance.join(", ")}], Effective: [${effectiveOrigStance.join(", ")}], Candidate stance: [${effectiveCandStance.join(", ")}]`,
        isFatal: stanceReversed,
      });
    }
  }
  
  // Resolution opportunity
  if (benchCase.expected.resolutionExpected) {
    const resolutionCount = countMatches(candidate, RESOLUTION_MARKERS);
    metrics.push({
      name: "conflict_resolution_opportunity",
      value: resolutionCount >= 1 ? 1 : 0,
      pass: resolutionCount >= 1 ? "PASS" : "FAIL",
      details: `Resolution markers: ${resolutionCount}`,
    });
  }
  
  // Personal attack detection
  const personalAttackPatterns = [
    /\byou\s+(?:are|'re)\s+(?:a\s+)?(?:liar|thief|cheater|manipulator)\b/gi,
    /\b(?:shut\s+up|go\s+away|get\s+lost)\b/gi,
    /\b(?:nobody\s+likes|everyone\s+hates)\s+you\b/gi,
  ];
  
  const attackCount = countMatches(candidate, personalAttackPatterns);
  if (attackCount > 0) {
    metrics.push({
      name: "conflict_no_personal_attack",
      value: 0,
      pass: "FAIL",
      details: `Personal attack detected (${attackCount} matches)`,
      isFatal: false,
    });
  } else {
    metrics.push({
      name: "conflict_no_personal_attack",
      value: 1,
      pass: "PASS",
      details: "No personal attack detected",
    });
  }
  
  // Overall
  const failures = metrics.filter((m) => m.pass === "FAIL");
  const warnings = metrics.filter((m) => m.pass === "WARN");
  
  let overall: PassFail = "PASS";
  if (failures.length > 0) overall = "FAIL";
  else if (warnings.length > 0) overall = "WARN";
  
  const score = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
    : 1;
  
  return {
    caseId: benchCase.id,
    category: benchCase.category,
    difficulty: benchCase.difficulty,
    metrics,
    overall,
    score,
    executionTimeMs: Date.now() - startTime,
    evaluatorVersion: "1.0.0",
  };
}
