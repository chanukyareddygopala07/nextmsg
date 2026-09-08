/**
 * Evaluation Runner
 * 
 * Orchestrates the evaluation process: loads dataset, runs evaluators,
 * computes metrics, and generates reports.
 */

import type {
  BenchmarkCase,
  BenchmarkDataset,
  EvaluationReport,
  EvaluationConfiguration,
  EvaluationContext,
  Evaluator,
  EvalResult,
  CategoryReport,
  GoldenReport,
  AdversarialReport,
  PerformanceMetrics,
  EvaluationCategory,
  Difficulty,
} from "./types";
import { getEvaluatorsForCategory, getAllEvaluators } from "./evaluators";
import {
  computeAllMetrics,
  computeCategoryBreakdown,
  computeDifficultyBreakdown,
  extractFailures,
} from "./metrics";

// ─── Runner Configuration ────────────────────────────────────────────────────

export interface RunOptions {
  dataset: BenchmarkDataset;
  config: EvaluationConfiguration;
  evaluatorOverride?: Evaluator[];
  candidateProvider?: (benchCase: BenchmarkCase) => string;
  contextProvider?: (benchCase: BenchmarkCase) => EvaluationContext;
  onProgress?: (completed: number, total: number) => void;
}

// ─── Candidate Provider ──────────────────────────────────────────────────────

function defaultCandidateProvider(benchCase: BenchmarkCase): string {
  // In deterministic mode, use the draft if provided
  if (benchCase.draft) return benchCase.draft;
  
  // Otherwise use the last message as the "candidate"
  if (benchCase.conversation.length > 0) {
    const lastMsg = benchCase.conversation[benchCase.conversation.length - 1];
    return lastMsg.content;
  }
  
  return "";
}

function defaultContextProvider(_benchCase: BenchmarkCase): EvaluationContext {
  return {};
}

// ─── Run Evaluation ──────────────────────────────────────────────────────────

export function runEvaluation(options: RunOptions): EvaluationReport {
  const startTime = Date.now();
  const {
    dataset,
    config,
    evaluatorOverride,
    candidateProvider = defaultCandidateProvider,
    contextProvider = defaultContextProvider,
    onProgress,
  } = options;
  
  // Filter cases based on configuration
  let cases = dataset.cases;
  
  if (config.categories && config.categories.length > 0) {
    cases = cases.filter((c) => config.categories!.includes(c.category));
  }
  
  if (config.difficulties && config.difficulties.length > 0) {
    cases = cases.filter((c) => config.difficulties!.includes(c.difficulty));
  }
  
  if (config.maxCases && config.maxCases > 0) {
    cases = cases.slice(0, config.maxCases);
  }
  
  // Run evaluation for each case
  const results: EvalResult[] = [];
  
  for (let i = 0; i < cases.length; i++) {
    const benchCase = cases[i];
    const candidate = candidateProvider(benchCase);
    const evalContext = contextProvider(benchCase);
    
    // Get evaluators for this case
    const evaluators = evaluatorOverride || getEvaluatorsForCategory(benchCase.category);
    
    // Run each evaluator
    for (const evaluator of evaluators) {
      try {
        const result = evaluator.evaluate(benchCase, candidate, evalContext);
        results.push(result);
      } catch (error) {
        // Record error but continue
        results.push({
          caseId: benchCase.id,
          category: benchCase.category,
          difficulty: benchCase.difficulty,
          metrics: [],
          overall: "FAIL",
          score: 0,
          executionTimeMs: 0,
          evaluatorVersion: evaluator.version,
          errors: [`Evaluator ${evaluator.name} failed: ${error}`],
        });
      }
    }
    
    if (onProgress) {
      onProgress(i + 1, cases.length);
    }
  }
  
  // Compute metrics
  const passed = results.filter((r) => r.overall === "PASS").length;
  const failed = results.filter((r) => r.overall === "FAIL").length;
  const warned = results.filter((r) => r.overall === "WARN").length;
  const skipped = results.filter((r) => r.overall === "SKIP").length;
  
  // Compute golden and adversarial reports
  const goldenCases = results.filter((r) => r.category === "golden");
  const adversarialCases = results.filter((r) => r.category === "adversarial");
  
  const goldenReport: GoldenReport = {
    total: goldenCases.length,
    passed: goldenCases.filter((r) => r.overall === "PASS").length,
    failed: goldenCases.filter((r) => r.overall === "FAIL").length,
    criticalFailures: extractFailures(goldenCases).filter((f) => f.severity === "critical"),
  };
  
  const adversarialReport: AdversarialReport = {
    total: adversarialCases.length,
    caught: adversarialCases.filter((r) => r.overall === "FAIL").length,
    missed: adversarialCases.filter((r) => r.overall === "PASS").length,
    catchRate: adversarialCases.length > 0
      ? adversarialCases.filter((r) => r.overall === "FAIL").length / adversarialCases.length
      : 0,
    missedExamples: extractFailures(adversarialCases).filter((f) => f.severity === "critical"),
  };
  
  // Compute performance metrics
  const totalLatency = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
  const performanceMetrics: PerformanceMetrics = {
    totalLatencyMs: totalLatency,
    averageLatencyMs: results.length > 0 ? totalLatency / results.length : 0,
    casesPerSecond: totalLatency > 0 ? (cases.length / totalLatency) * 1000 : 0,
    aiCallsMade: 0, // Would need to track this during evaluation
    tokenEstimate: 0, // Would need to track this during evaluation
  };
  
  const executionTimeMs = Date.now() - startTime;
  
  return {
    datasetVersion: dataset.version,
    totalCases: cases.length,
    passed,
    failed,
    warned,
    skipped,
    metrics: computeAllMetrics(results),
    categories: computeCategoryBreakdown(results),
    difficulties: computeDifficultyBreakdown(results),
    regressions: [], // Would be filled by regression comparison
    goldenResults: goldenReport,
    adversarialResults: adversarialReport,
    performanceMetrics,
    failures: extractFailures(results),
    timestamp: new Date().toISOString(),
    executionTimeMs,
  };
}

// ─── Smoke Test Runner ───────────────────────────────────────────────────────

export function runSmokeEvaluation(
  dataset: BenchmarkDataset,
  config: Partial<EvaluationConfiguration> = {}
): EvaluationReport {
  return runEvaluation({
    dataset,
    config: {
      datasetVersion: dataset.version,
      mode: "deterministic",
      maxCases: 50,
      ...config,
    },
  });
}

// ─── Full Evaluation Runner ──────────────────────────────────────────────────

export function runFullEvaluation(
  dataset: BenchmarkDataset,
  config: Partial<EvaluationConfiguration> = {}
): EvaluationReport {
  return runEvaluation({
    dataset,
    config: {
      datasetVersion: dataset.version,
      mode: "deterministic",
      ...config,
    },
  });
}
