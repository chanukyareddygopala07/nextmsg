/**
 * Recovery Evaluator
 * 
 * Evaluates situation recovery: accountability, factual honesty,
 * next-action clarity, and fabrication avoidance.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── Accountability Markers ──────────────────────────────────────────────────

const ACCOUNTABILITY_POSITIVE = [
  /\b(?:i\s+(?:take|accept)\s+(?:full\s+)?responsibility)\b/gi,
  /\b(?:i\s+(?:apologize|am\s+sorry|apologise))\b/gi,
  /\b(?:my\s+(?:mistake|fault|error|oversight))\b/gi,
  /\b(?:i\s+(?:should|could|would)\s+have)\b/gi,
  /\b(?:next\s+time\s+i\s+(?:will|'ll))\b/gi,
  /\b(?:this\s+(?:won't|will\s+not)\s+happen\s+again)\b/gi,
  /\b(?:i\s+own\s+(?:this|it|my))\b/gi,
  /\b(?:i\s+(?:should|could)\s+have\s+(?:handled|done|been|done\s+better))\b/gi,
  /\b(?:let\s+me\s+(?:make\s+it\s+right|fix|do\s+better|handle|try))\b/gi,
  /\b(?:i'll\s+(?:do\s+better|make\s+it\s+up|fix|try\s+harder))\b/gi,
  /\b(?:that\s+(?:was|is)\s+(?:my|completely)\s+(?:bad|fault|mistake))\b/gi,
  /\b(?:i\s+(?:didn't|did\s+not)\s+(?:mean|intend)\s+to)\b/gi,
  /\b(?:i\s+hear\s+you)\b/gi,
  /\b(?:you'?re?\s+right)\b/gi,
  /\b(?:fair\s+enough)\b/gi,
  /\b(?:i\s+understand\s+(?:why|how))\b/gi,
];

const ACCOUNTABILITY_NEGATIVE = [
  /\b(?:it's\s+not\s+my\s+(?:fault|problem|responsibility))\b/gi,
  /\b(?:i\s+wasn't\s+(?:responsible|liable|accountable))\b/gi,
  /\b(?:someone\s+else)\b/gi,
  /\b(?:they\s+(?:made|did|caused))\b/gi,
  /\b(?:blame)\b/gi,
];

const FABRICATION_MARKERS = [
  /\b(?:doctor|hospital|emergency|accident|death|funeral)\b/gi,
  /\b(?:family\s+emergency|medical\s+emergency|sudden\s+illness)\b/gi,
  /\b(?:car\s+broke|flat\s+tire|power\s+outage|internet\s+down)\b/gi,
  /\b(?:relative|uncle|aunt|grandmother|grandfather)\s+(?:died|passed|hospitalized)\b/gi,
];

const NEXT_ACTION_POSITIVE = [
  /\b(?:here'?s?\s+(?:what|i'll|the\s+plan))\b/gi,
  /\b(?:next\s+(?:step|action|move|thing))\b/gi,
  /\b(?:i'll\s+(?:do|send|complete|finish|fix|update|provide|make\s+sure))\b/gi,
  /\b(?:by\s+(?:tomorrow|monday|tuesday|wednesday|thursday|friday|end))\b/gi,
  /\b(?:will\s+(?:send|deliver|complete|finish|fix|update|try|work))\b/gi,
  /\b(?:let'?s?\s+(?:fix|figure|work|sort|resolve|talk|discuss|move))\b/gi,
  /\b(?:going\s+to\s+(?:fix|do|send|complete|work))\b/gi,
  /\b(?:i'?ll?\s+(?:make|get|ensure|handle))\b/gi,
  /\b(?:can\s+(?:i|we)\s+(?:fix|do|try|start))\b/gi,
  /\b(?:how\s+about\s+(?:we|i))\b/gi,
  /\b(?:from\s+now\s+on)\b/gi,
  /\b(?:in\s+the\s+future)\b/gi,
];

// ─── Main Recovery Evaluator ─────────────────────────────────────────────────

export function evaluateRecovery(
  benchCase: BenchmarkCase,
  candidate: string,
  _context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];
  
  // Accountability
  const positiveAccount = ACCOUNTABILITY_POSITIVE.filter((p) => p.test(candidate)).length;
  const negativeAccount = ACCOUNTABILITY_NEGATIVE.filter((p) => p.test(candidate)).length;
  
  if (benchCase.expected.expectedAction === "accountability" || benchCase.category === "recovery") {
    metrics.push({
      name: "recovery_accountability",
      value: positiveAccount > 0 ? 1 : negativeAccount > 0 ? 0 : 0.5,
      pass: positiveAccount > 0 ? "PASS" : negativeAccount > 0 ? "FAIL" : "WARN",
      details: `Accountability: positive=${positiveAccount}, negative=${negativeAccount}`,
    });
  }
  
  // Fabrication detection
  const fabricationCount = FABRICATION_MARKERS.filter((p) => p.test(candidate)).length;
  metrics.push({
    name: "recovery_no_fabrication",
    value: fabricationCount === 0 ? 1 : 0,
    pass: fabricationCount === 0 ? "PASS" : "FAIL",
    details: `Fabrication markers: ${fabricationCount}`,
    isFatal: fabricationCount > 0,
  });
  
  // Next action clarity
  const nextActionCount = NEXT_ACTION_POSITIVE.filter((p) => p.test(candidate)).length;
  metrics.push({
    name: "recovery_next_action",
    value: nextActionCount > 0 ? 1 : 0,
    pass: nextActionCount > 0 ? "PASS" : "WARN",
    details: `Next action markers: ${nextActionCount}`,
  });
  
  // Excuse vs explanation
  const excusePatterns = [
    /\b(?:because|since|due\s+to|as)\s+(?:the|i|we|they|he|she)\b/gi,
    /\b(?:i\s+(?:had|was|got|been))\b/gi,
  ];
  const explanationCount = excusePatterns.filter((p) => p.test(candidate)).length;
  
  // Too many excuses might indicate deflection
  if (explanationCount > 3) {
    metrics.push({
      name: "recovery_no_excessive_excuses",
      value: 0.5,
      pass: "WARN",
      details: `Excessive explanation/excuse patterns: ${explanationCount}`,
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
