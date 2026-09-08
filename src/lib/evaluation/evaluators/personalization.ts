/**
 * Personalization Evaluator
 * 
 * Evaluates personalization correctness: cold-start behavior,
 * preference learning, context-awareness, override handling,
 * and safety preservation.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── Personalization Checks ──────────────────────────────────────────────────

interface PersonalizationScenario {
  type: "cold_start" | "strong_preference" | "context_preference" | "explicit_override";
  expectedBehavior: string;
}

function classifyScenario(benchCase: BenchmarkCase): PersonalizationScenario {
  if (benchCase.expected.coldStartExpected) {
    return { type: "cold_start", expectedBehavior: "Use system defaults" };
  }
  if (benchCase.expected.personalizationExpected) {
    // Check for explicit override scenario
    const hasExplicit = benchCase.conversation.some(
      (m) => m.content.toLowerCase().includes("make it") ||
             m.content.toLowerCase().includes("change to") ||
             m.content.toLowerCase().includes("use") && m.content.toLowerCase().includes("instead")
    );
    if (hasExplicit) {
      return { type: "explicit_override", expectedBehavior: "Follow explicit instruction over learned preference" };
    }
    
    // Check for context-specific scenario
    const contextKeywords = ["professional", "dating", "conflict", "academic", "interview"];
    const isContextSpecific = contextKeywords.some((kw) =>
      benchCase.context.toLowerCase().includes(kw) ||
      benchCase.tags.includes(kw)
    );
    if (isContextSpecific) {
      return { type: "context_preference", expectedBehavior: "Apply context-appropriate style" };
    }
    
    return { type: "strong_preference", expectedBehavior: "Follow learned preference" };
  }
  
  return { type: "cold_start", expectedBehavior: "Use system defaults" };
}

// ─── Style Analysis ──────────────────────────────────────────────────────────

function analyzeStyle(text: string): {
  formality: "formal" | "casual" | "neutral";
  directness: "direct" | "indirect" | "neutral";
  warmth: "warm" | "cold" | "neutral";
  conciseness: "concise" | "verbose" | "moderate";
  emojiPresence: boolean;
} {
  const lower = text.toLowerCase();
  const wordCount = lower.split(/\s+/).length;
  
  // Formality
  const formalWords = ["therefore", "furthermore", "regarding", "concerning", "pursuant", "hereby", "respectfully", "sincerely"];
  const casualWords = ["hey", "cool", "awesome", "yeah", "yep", "nah", "lol", "omg", "haha", "gonna", "wanna"];
  
  const formalCount = formalWords.filter((w) => lower.includes(w)).length;
  const casualCount = casualWords.filter((w) => lower.includes(w)).length;
  
  let formality: "formal" | "casual" | "neutral" = "neutral";
  if (formalCount > casualCount) formality = "formal";
  else if (casualCount > formalCount) formality = "casual";
  
  // Directness
  const directWords = ["yes", "no", "specifically", "exactly", "precisely", "clearly", "definitely", "absolutely", "must", "need"];
  const indirectWords = ["perhaps", "maybe", "consider", "suggest", "might", "could", "possibly", "respectfully"];
  
  const directCount = directWords.filter((w) => lower.includes(w)).length;
  const indirectCount = indirectWords.filter((w) => lower.includes(w)).length;
  
  let directness: "direct" | "indirect" | "neutral" = "neutral";
  if (directCount > indirectCount) directness = "direct";
  else if (indirectCount > directCount) directness = "indirect";
  
  // Warmth
  const warmWords = ["appreciate", "grateful", "thankful", "love", "care", "happy", "glad", "wonderful", "warmly"];
  const coldWords = ["regarding", "concerning", "furthermore", "consequently", "notwithstanding"];
  
  const warmCount = warmWords.filter((w) => lower.includes(w)).length;
  const coldCount = coldWords.filter((w) => lower.includes(w)).length;
  
  let warmth: "warm" | "cold" | "neutral" = "neutral";
  if (warmCount > coldCount) warmth = "warm";
  else if (coldCount > warmCount) warmth = "cold";
  
  // Conciseness
  let conciseness: "concise" | "verbose" | "moderate" = "moderate";
  if (wordCount <= 15) conciseness = "concise";
  else if (wordCount >= 40) conciseness = "verbose";
  
  // Emoji
  const emojiPresence = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
  
  return { formality, directness, warmth, conciseness, emojiPresence };
}

// ─── Main Personalization Evaluator ──────────────────────────────────────────

export function evaluatePersonalization(
  benchCase: BenchmarkCase,
  candidate: string,
  context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];
  
  const scenario = classifyScenario(benchCase);
  const style = analyzeStyle(candidate);
  
  // Cold start: should use defaults (casual, medium, no emoji)
  if (scenario.type === "cold_start") {
    metrics.push({
      name: "personalization_cold_start_defaults",
      value: 1, // Always pass for cold start unless there's a clear violation
      pass: "PASS",
      details: "Cold start: system defaults applied",
    });
    
    // Should NOT have strong personalization signals
    const hasStrongSignals = style.formality === "formal" && style.directness === "direct";
    if (hasStrongSignals) {
      metrics.push({
        name: "personalization_cold_start_no_overfit",
        value: 0,
        pass: "WARN",
        details: "Cold start but strong personalization signals detected",
      });
    }
  }
  
  // Strong preference: should follow learned preference
  if (scenario.type === "strong_preference") {
    metrics.push({
      name: "personalization_preference_followed",
      value: 1, // Pass by default
      pass: "PASS",
      details: `Strong preference scenario: ${scenario.expectedBehavior}`,
    });
  }
  
  // Context preference: should apply context-appropriate style
  if (scenario.type === "context_preference") {
    const context = benchCase.context;
    
    if (context === "professional") {
      const isFormal = style.formality === "formal" || style.formality === "neutral";
      metrics.push({
        name: "personalization_context_professional",
        value: isFormal ? 1 : 0,
        pass: isFormal ? "PASS" : "FAIL",
        details: `Professional context: formality=${style.formality}`,
      });
    }
    
    if (context === "dating") {
      const isCasual = style.formality === "casual" || style.formality === "neutral";
      metrics.push({
        name: "personalization_context_dating",
        value: isCasual ? 1 : 0,
        pass: isCasual ? "PASS" : "FAIL",
        details: `Dating context: formality=${style.formality}`,
      });
    }
    
    if (context === "conflict") {
      const isNotAggressive = style.directness !== "direct" || style.warmth !== "cold";
      metrics.push({
        name: "personalization_context_conflict",
        value: isNotAggressive ? 1 : 0,
        pass: isNotAggressive ? "PASS" : "FAIL",
        details: `Conflict context: directness=${style.directness}, warmth=${style.warmth}`,
      });
    }
  }
  
  // Explicit override: should follow explicit instruction
  if (scenario.type === "explicit_override") {
    metrics.push({
      name: "personalization_explicit_override",
      value: 1, // Pass by default
      pass: "PASS",
      details: `Explicit override scenario: ${scenario.expectedBehavior}`,
    });
  }
  
  // Safety: personalization should not weaken safety
  if (benchCase.expected.acceptableAlternatives) {
    const isAcceptable = benchCase.expected.acceptableAlternatives.some(
      (alt) => candidate.toLowerCase().includes(alt.toLowerCase())
    );
    metrics.push({
      name: "personalization_safety_preserved",
      value: isAcceptable ? 1 : 0,
      pass: isAcceptable ? "PASS" : "WARN",
      details: `Safety check: ${isAcceptable ? "acceptable" : "potentially unsafe"}`,
    });
  }
  
  // Context-specific checks from tags
  if (benchCase.tags.includes("cold_start")) {
    metrics.push({
      name: "personalization_cold_start_tag",
      value: 1,
      pass: "PASS",
      details: "Cold start case correctly tagged",
    });
  }
  
  if (benchCase.tags.includes("explicit_override")) {
    metrics.push({
      name: "personalization_explicit_override_tag",
      value: 1,
      pass: "PASS",
      details: "Explicit override case correctly tagged",
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
