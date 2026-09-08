/**
 * Metrics Engine
 * 
 * Computes aggregate metrics from individual evaluation results.
 */

import type {
  EvalResult,
  MetricResult,
  AllMetrics,
  ClassificationMetrics,
  ConfusionMatrix,
  PreservationMetrics,
  ToneMetrics,
  ContextMetrics,
  MultilingualMetrics,
  RiskMetrics,
  PersonalizationMetrics,
  CompositeScore,
  CompositeWeights,
  EvaluationCategory,
  CategoryReport,
  Difficulty,
  DifficultyReport,
  FailureExample,
  DEFAULT_WEIGHTS,
} from "./types";

// ─── Classification Metrics ──────────────────────────────────────────────────

function computeClassificationMetrics(
  results: EvalResult[],
  metricPrefix: string
): ClassificationMetrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  
  for (const result of results) {
    const relevantMetrics = result.metrics.filter((m) => m.name.startsWith(metricPrefix));
    for (const metric of relevantMetrics) {
      if (metric.pass === "PASS") tp++;
      else if (metric.pass === "FAIL") fn++;
      else tn++;
    }
  }
  
  const total = tp + fp + tn + fn;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  
  return {
    accuracy,
    precision,
    recall,
    f1,
    confusionMatrix: { truePositive: tp, falsePositive: fp, trueNegative: tn, falseNegative: fn },
    support: total,
  };
}

// ─── Preservation Metrics ────────────────────────────────────────────────────

function computePreservationMetrics(results: EvalResult[]): PreservationMetrics {
  const getRate = (metricName: string): number => {
    const relevant = results.flatMap((r) => r.metrics.filter((m) => m.name === metricName));
    if (relevant.length === 0) return 1;
    return relevant.filter((m) => m.pass === "PASS").length / relevant.length;
  };
  
  return {
    semanticPreservationRate: getRate("preservation_semantic"),
    negationPreservationRate: getRate("preservation_negation"),
    factualPreservationRate: getRate("preservation_fabrication"),
    boundaryPreservationRate: getRate("preservation_boundary"),
    positionPreservationRate: getRate("preservation_position"),
    abilityPreservationRate: getRate("preservation_ability"),
    datePreservationRate: getRate("preservation_date"),
    numberPreservationRate: getRate("preservation_number"),
  };
}

// ─── Tone Metrics ────────────────────────────────────────────────────────────

function computeToneMetrics(results: EvalResult[]): ToneMetrics {
  const targetMetrics = results.flatMap((r) => r.metrics.filter((m) => m.name === "tone_target_match"));
  const intensityMetrics = results.flatMap((r) => r.metrics.filter((m) => m.name === "tone_intensity"));
  const contextMetrics = results.flatMap((r) => r.metrics.filter((m) => m.name === "tone_context_compatibility"));
  
  const avg = (metrics: MetricResult[]): number =>
    metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length : 0;
  
  return {
    targetToneAccuracy: avg(targetMetrics),
    toneIntensityAccuracy: avg(intensityMetrics),
    contextCompatibility: avg(contextMetrics),
  };
}

// ─── Context Metrics ─────────────────────────────────────────────────────────

function computeContextMetrics(results: EvalResult[]): ContextMetrics {
  const fitMetrics = results.flatMap((r) => r.metrics.filter((m) => m.name === "context_fit"));
  const severeMetrics = results.flatMap((r) => r.metrics.filter((m) => m.name === "context_severe_mismatch"));
  
  const categoryBreakdown: Record<EvaluationCategory, number> = {} as Record<EvaluationCategory, number>;
  
  for (const result of results) {
    if (!categoryBreakdown[result.category]) {
      categoryBreakdown[result.category] = 0;
    }
    const fitMetric = result.metrics.find((m) => m.name === "context_fit");
    if (fitMetric) {
      categoryBreakdown[result.category] += fitMetric.value;
    }
  }
  
  // Normalize by count per category
  const categoryCounts: Record<string, number> = {};
  for (const result of results) {
    categoryCounts[result.category] = (categoryCounts[result.category] || 0) + 1;
  }
  for (const cat of Object.keys(categoryBreakdown) as EvaluationCategory[]) {
    categoryBreakdown[cat] = categoryCounts[cat] > 0
      ? categoryBreakdown[cat] / categoryCounts[cat]
      : 0;
  }
  
  return {
    contextFitRate: fitMetrics.length > 0
      ? fitMetrics.reduce((sum, m) => sum + m.value, 0) / fitMetrics.length
      : 1,
    severeMismatchRate: severeMetrics.length > 0
      ? severeMetrics.filter((m) => m.pass === "FAIL").length / severeMetrics.length
      : 0,
    categoryBreakdown,
  };
}

// ─── Multilingual Metrics ────────────────────────────────────────────────────

function computeMultilingualMetrics(results: EvalResult[]): MultilingualMetrics {
  const getRate = (metricName: string): number => {
    const relevant = results.flatMap((r) => r.metrics.filter((m) => m.name === metricName));
    if (relevant.length === 0) return 1;
    return relevant.filter((m) => m.pass === "PASS").length / relevant.length;
  };
  
  return {
    languagePreservationRate: getRate("multilingual_language_preservation"),
    scriptPreservationRate: getRate("multilingual_script_preservation"),
    codeMixPreservationRate: getRate("multilingual_code_mix_preservation"),
    semanticPreservationRate: getRate("multilingual_semantic_preservation"),
  };
}

// ─── Risk Metrics ────────────────────────────────────────────────────────────

function computeRiskMetrics(results: EvalResult[]): RiskMetrics {
  const falsePositiveCases = results.filter((r) =>
    r.metrics.some((m) => m.name === "pre_send_false_positive")
  );
  const falseNegativeCases = results.filter((r) =>
    r.metrics.some((m) => m.name === "pre_send_false_negative")
  );
  
  const criticalRiskCases = results.filter((r) =>
    r.metrics.some((m) => m.name === "pre_send_gate_accuracy" && m.value < 0.5)
  );
  
  return {
    criticalRiskRecall: criticalRiskCases.length > 0
      ? criticalRiskCases.filter((r) => r.overall !== "FAIL").length / criticalRiskCases.length
      : 1,
    falsePositiveRate: falsePositiveCases.length > 0
      ? falsePositiveCases.filter((r) => r.metrics.some((m) => m.name === "pre_send_false_positive" && m.pass === "FAIL")).length / falsePositiveCases.length
      : 0,
    falseNegativeRate: falseNegativeCases.length > 0
      ? falseNegativeCases.filter((r) => r.metrics.some((m) => m.name === "pre_send_false_negative" && m.pass === "FAIL")).length / falseNegativeCases.length
      : 0,
  };
}

// ─── Personalization Metrics ─────────────────────────────────────────────────

function computePersonalizationMetrics(results: EvalResult[]): PersonalizationMetrics {
  const getRate = (metricName: string): number => {
    const relevant = results.flatMap((r) => r.metrics.filter((m) => m.name === metricName));
    if (relevant.length === 0) return 1;
    return relevant.filter((m) => m.pass === "PASS").length / relevant.length;
  };

  const professionalRate = getRate("personalization_context_professional");
  const datingRate = getRate("personalization_context_dating");
  const conflictRate = getRate("personalization_context_conflict");
  const contextRates = [professionalRate, datingRate, conflictRate].filter((_, i) => {
    const names = ["personalization_context_professional", "personalization_context_dating", "personalization_context_conflict"];
    return results.some((r) => r.metrics.some((m) => m.name === names[i]));
  });

  return {
    explicitOverrideAccuracy: getRate("personalization_explicit_override"),
    contextOverrideAccuracy: contextRates.length > 0
      ? contextRates.reduce((sum, r) => sum + r, 0) / contextRates.length
      : 1,
    preferenceRelevance: getRate("personalization_preference_followed"),
  };
}

// ─── Composite Score ─────────────────────────────────────────────────────────

function computeCompositeScore(
  preservation: PreservationMetrics,
  tone: ToneMetrics,
  context: ContextMetrics,
  multilingual: MultilingualMetrics,
  risk: RiskMetrics,
  personalization: PersonalizationMetrics,
  weights: CompositeWeights
): CompositeScore {
  const safety = 1 - risk.falseNegativeRate;
  const semanticPreservation = preservation.semanticPreservationRate;
  const factualIntegrity = preservation.factualPreservationRate;
  const contextFit = context.contextFitRate;
  const toneScore = tone.targetToneAccuracy;
  const naturalness = tone.contextCompatibility;
  const personalizationScore = (personalization.explicitOverrideAccuracy + personalization.contextOverrideAccuracy + personalization.preferenceRelevance) / 3;
  
  const overall =
    weights.safety * safety +
    weights.semanticPreservation * semanticPreservation +
    weights.factualIntegrity * factualIntegrity +
    weights.context * contextFit +
    weights.goal * 1 + // Goal is measured separately
    weights.tone * toneScore +
    weights.naturalness * naturalness +
    weights.personalization * personalizationScore;
  
  return {
    overall,
    safety,
    semanticPreservation,
    factualIntegrity,
    context: contextFit,
    goal: 1,
    tone: toneScore,
    naturalness,
    personalization: personalizationScore,
    weights,
  };
}

// ─── Category Breakdown ──────────────────────────────────────────────────────

function computeCategoryBreakdown(results: EvalResult[]): Record<EvaluationCategory, CategoryReport> {
  const breakdown: Record<string, EvalResult[]> = {};
  
  for (const result of results) {
    if (!breakdown[result.category]) {
      breakdown[result.category] = [];
    }
    breakdown[result.category].push(result);
  }
  
  const reports: Record<EvaluationCategory, CategoryReport> = {} as Record<EvaluationCategory, CategoryReport>;
  
  for (const [category, catResults] of Object.entries(breakdown)) {
    const passed = catResults.filter((r) => r.overall === "PASS").length;
    const failed = catResults.filter((r) => r.overall === "FAIL").length;
    
    reports[category as EvaluationCategory] = {
      total: catResults.length,
      passed,
      failed,
      metrics: computeAllMetrics(catResults),
    };
  }
  
  return reports;
}

// ─── Difficulty Breakdown ────────────────────────────────────────────────────

function computeDifficultyBreakdown(results: EvalResult[]): Record<Difficulty, DifficultyReport> {
  const breakdown: Record<string, EvalResult[]> = {};
  
  for (const result of results) {
    if (!breakdown[result.difficulty]) {
      breakdown[result.difficulty] = [];
    }
    breakdown[result.difficulty].push(result);
  }
  
  const reports: Record<Difficulty, DifficultyReport> = {} as Record<Difficulty, DifficultyReport>;
  
  for (const [difficulty, diffResults] of Object.entries(breakdown)) {
    const passed = diffResults.filter((r) => r.overall === "PASS").length;
    const failed = diffResults.filter((r) => r.overall === "FAIL").length;
    const avgScore = diffResults.length > 0
      ? diffResults.reduce((sum, r) => sum + r.score, 0) / diffResults.length
      : 0;
    
    reports[difficulty as Difficulty] = {
      total: diffResults.length,
      passed,
      failed,
      averageScore: avgScore,
    };
  }
  
  return reports;
}

// ─── Failure Examples ────────────────────────────────────────────────────────

function extractFailures(results: EvalResult[], cases?: { id: string; conversation: { content: string }[]; draft?: string }[]): FailureExample[] {
  const failures: FailureExample[] = [];
  const caseMap = new Map<string, { conversation: { content: string }[]; draft?: string }>();
  if (cases) {
    for (const c of cases) caseMap.set(c.id, c);
  }

  for (const result of results) {
    if (result.overall === "FAIL" || result.overall === "WARN") {
      const failedMetrics = result.metrics.filter((m) => m.pass === "FAIL" || m.pass === "WARN");
      const benchCase = caseMap.get(result.caseId);

      for (const metric of failedMetrics) {
        failures.push({
          caseId: result.caseId,
          category: result.category,
          difficulty: result.difficulty,
          input: benchCase ? benchCase.conversation.map((m) => m.content).join("\n") : "",
          candidate: benchCase?.draft || "",
          expected: metric.details || "",
          actual: `${metric.name}: ${metric.value}`,
          failureCategory: metric.name,
          severity: metric.isFatal ? "critical" : metric.pass === "FAIL" ? "high" : "medium",
          details: metric.details,
        });
      }
    }
  }

  return failures;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function computeAllMetrics(results: EvalResult[]): AllMetrics {
  return {
    classification: computeClassificationMetrics(results, ""),
    preservation: computePreservationMetrics(results),
    tone: computeToneMetrics(results),
    context: computeContextMetrics(results),
    multilingual: computeMultilingualMetrics(results),
    risk: computeRiskMetrics(results),
    personalization: computePersonalizationMetrics(results),
    composite: computeCompositeScore(
      computePreservationMetrics(results),
      computeToneMetrics(results),
      computeContextMetrics(results),
      computeMultilingualMetrics(results),
      computeRiskMetrics(results),
      computePersonalizationMetrics(results),
      {
        safety: 0.20,
        semanticPreservation: 0.20,
        factualIntegrity: 0.15,
        context: 0.12,
        goal: 0.10,
        tone: 0.08,
        naturalness: 0.08,
        personalization: 0.07,
      }
    ),
  };
}

export {
  computeCategoryBreakdown,
  computeDifficultyBreakdown,
  extractFailures,
};
