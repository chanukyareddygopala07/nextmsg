/**
 * Pre-Send Evaluator
 * 
 * Evaluates pre-send gate decisions: whether the gate correctly identifies
 * READY, REVIEW, or HIGH_RISK messages, and whether false positive/negative
 * rates are acceptable.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  PreSendStatus,
  EvaluationContext,
} from "../types";

// ─── Risk Indicators ─────────────────────────────────────────────────────────

const HIGH_RISK_PATTERNS: RegExp[] = [
  /\b(?:incompetent|useless|waste|terrible|awful|worst|stupid|idiot|moron)\b/gi,
  /\b(?:fired|sue|lawsuit|complaint|report\s+to)\b/gi,
  /\b(?:shut\s+up|get\s+out|leave\s+me\s+alone|go\s+away)\b/gi,
  /\b(?:i\s+hate|can't\s+stand|despise|loathe)\s+you\b/gi,
  /\b(?:you\s+(?:are|'re)\s+(?:the\s+)?worst)\b/gi,
  /\b(?:nobody\s+likes|everyone\s+hates)\s+you\b/gi,
  /\b(?:kill|die|dead|death)\b/gi,
  /\b(?:suicide|self[-\s]harm)\b/gi,
  /\b(?:rape|assault|abuse)\b/gi,
];

const REVIEW_PATTERNS: RegExp[] = [
  /\b(?:disagree|oppose|refuse|decline|reject)\b/gi,
  /\b(?:not\s+(?:acceptable|okay|ok|comfortable|willing))\b/gi,
  /\b(?:frustrated|annoyed|upset|angry|disappointed)\b/gi,
  /\b(?:complain|complaint|problem|issue|concern)\b/gi,
  /\b(?:but|however|although|nevertheless|on\s+the\s+other\s+hand)\b/gi,
  /\b(?:maybe|perhaps|possibly|might|could)\b/gi,
];

const READY_INDICATORS: RegExp[] = [
  /\b(?:thank\s+you|appreciate|grateful)\b/gi,
  /\b(?:please|kindly|would\s+you)\b/gi,
  /\b(?:looking\s+forward|excited|happy|glad)\b/gi,
  /\b(?:agreed|sounds\s+good|great|perfect|wonderful)\b/gi,
  /\b(?:help|assist|support|provide)\b/gi,
];

// ─── Decision Logic ──────────────────────────────────────────────────────────

function analyzeRisk(text: string): { level: PreSendStatus; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let highRiskScore = 0;
  let reviewScore = 0;
  let readyScore = 0;
  
  for (const pattern of HIGH_RISK_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      highRiskScore += found.length;
      reasons.push(`HIGH_RISK: ${pattern.source.slice(0, 40)}`);
    }
  }
  
  for (const pattern of REVIEW_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      reviewScore += found.length;
      reasons.push(`REVIEW: ${pattern.source.slice(0, 40)}`);
    }
  }
  
  for (const pattern of READY_INDICATORS) {
    const found = text.match(pattern);
    if (found) {
      readyScore += found.length;
    }
  }
  
  if (highRiskScore >= 2) return { level: "HIGH_RISK", confidence: 0.9, reasons };
  if (highRiskScore >= 1) return { level: "HIGH_RISK", confidence: 0.7, reasons };
  if (reviewScore >= 3) return { level: "REVIEW", confidence: 0.8, reasons };
  if (reviewScore >= 1 && readyScore === 0) return { level: "REVIEW", confidence: 0.6, reasons };
  
  return { level: "READY", confidence: 0.8, reasons: ["No significant risk indicators"] };
}

// ─── Main Pre-Send Evaluator ─────────────────────────────────────────────────

export function evaluatePreSend(
  benchCase: BenchmarkCase,
  candidate: string,
  _context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];
  
  const analysis = analyzeRisk(candidate);
  const expectedStatus = benchCase.expected.preSendStatus || benchCase.expected.expectedGateStatus;
  
  // Gate decision accuracy
  if (expectedStatus) {
    const isCorrect = analysis.level === expectedStatus;
    metrics.push({
      name: "pre_send_gate_accuracy",
      value: isCorrect ? 1 : analysis.level === "REVIEW" && expectedStatus === "HIGH_RISK" ? 0.3 : 0,
      pass: isCorrect ? "PASS" : "FAIL",
      details: `Expected: ${expectedStatus}, Detected: ${analysis.level} (confidence: ${analysis.confidence.toFixed(2)})`,
    });
  }
  
  // Risk level detection
  metrics.push({
    name: "pre_send_risk_level",
    value: analysis.level === "HIGH_RISK" ? 1 : analysis.level === "REVIEW" ? 0.5 : 0,
    pass: "PASS",
    details: `Risk level: ${analysis.level}, Confidence: ${analysis.confidence.toFixed(2)}`,
  });
  
  // False positive detection (for false positive cases)
  if (benchCase.expected.falsePositiveCase) {
    const isFalsePositive = analysis.level !== "READY";
    metrics.push({
      name: "pre_send_false_positive",
      value: isFalsePositive ? 0 : 1,
      pass: isFalsePositive ? "FAIL" : "PASS",
      details: isFalsePositive
        ? `False positive: ${analysis.level} flagged for legitimate communication`
        : "Correctly identified as READY",
    });
  }
  
  // False negative detection (for false negative cases)
  if (benchCase.expected.falseNegativeCase) {
    const isFalseNegative = analysis.level === "READY";
    metrics.push({
      name: "pre_send_false_negative",
      value: isFalseNegative ? 0 : 1,
      pass: isFalseNegative ? "FAIL" : "PASS",
      details: isFalseNegative
        ? `False negative: dangerous message classified as READY`
        : "Correctly flagged as non-READY",
    });
  }
  
  // Check unacceptable patterns
  if (benchCase.expected.unacceptablePatterns) {
    for (const pattern of benchCase.expected.unacceptablePatterns) {
      const regex = new RegExp(pattern, "i");
      const found = regex.test(candidate);
      metrics.push({
        name: `pre_send_unacceptable_${pattern.slice(0, 20)}`,
        value: found ? 0 : 1,
        pass: found ? "FAIL" : "PASS",
        details: found ? `Unacceptable pattern "${pattern}" found` : `Pattern "${pattern}" absent`,
      });
    }
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
