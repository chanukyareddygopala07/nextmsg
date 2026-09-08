/**
 * Regression Comparison
 * 
 * Compares current evaluation results against a baseline to detect regressions.
 */

import type {
  EvaluationReport,
  BaselineResult,
  RegressionResult,
} from "./types";

// ─── Compare Reports ─────────────────────────────────────────────────────────

export function compareReports(
  baseline: BaselineResult,
  current: EvaluationReport
): RegressionResult[] {
  const regressions: RegressionResult[] = [];
  
  // Compare overall metrics
  const metricComparisons: Array<{
    name: string;
    baseline: number;
    current: number;
  }> = [
    {
      name: "composite_overall",
      baseline: baseline.report.metrics.composite.overall,
      current: current.metrics.composite.overall,
    },
    {
      name: "composite_safety",
      baseline: baseline.report.metrics.composite.safety,
      current: current.metrics.composite.safety,
    },
    {
      name: "composite_semantic",
      baseline: baseline.report.metrics.composite.semanticPreservation,
      current: current.metrics.composite.semanticPreservation,
    },
    {
      name: "composite_factual",
      baseline: baseline.report.metrics.composite.factualIntegrity,
      current: current.metrics.composite.factualIntegrity,
    },
    {
      name: "composite_context",
      baseline: baseline.report.metrics.composite.context,
      current: current.metrics.composite.context,
    },
    {
      name: "composite_tone",
      baseline: baseline.report.metrics.composite.tone,
      current: current.metrics.composite.tone,
    },
    {
      name: "preservation_semantic",
      baseline: baseline.report.metrics.preservation.semanticPreservationRate,
      current: current.metrics.preservation.semanticPreservationRate,
    },
    {
      name: "preservation_negation",
      baseline: baseline.report.metrics.preservation.negationPreservationRate,
      current: current.metrics.preservation.negationPreservationRate,
    },
    {
      name: "preservation_factual",
      baseline: baseline.report.metrics.preservation.factualPreservationRate,
      current: current.metrics.preservation.factualPreservationRate,
    },
    {
      name: "preservation_boundary",
      baseline: baseline.report.metrics.preservation.boundaryPreservationRate,
      current: current.metrics.preservation.boundaryPreservationRate,
    },
    {
      name: "tone_accuracy",
      baseline: baseline.report.metrics.tone.targetToneAccuracy,
      current: current.metrics.tone.targetToneAccuracy,
    },
    {
      name: "risk_false_positive",
      baseline: baseline.report.metrics.risk.falsePositiveRate,
      current: current.metrics.risk.falsePositiveRate,
    },
    {
      name: "risk_false_negative",
      baseline: baseline.report.metrics.risk.falseNegativeRate,
      current: current.metrics.risk.falseNegativeRate,
    },
  ];
  
  for (const comparison of metricComparisons) {
    const delta = comparison.current - comparison.baseline;
    const status: "improved" | "unchanged" | "regressed" =
      delta > 0.01 ? "improved" : delta < -0.01 ? "regressed" : "unchanged";
    
    if (status === "regressed") {
      regressions.push({
        caseId: "aggregate",
        metric: comparison.name,
        baseline: comparison.baseline,
        current: comparison.current,
        delta,
        status,
      });
    }
  }
  
  // Compare category-level metrics
  const baselineCategories = Object.keys(baseline.report.categories);
  const currentCategories = Object.keys(current.categories);
  
  for (const category of baselineCategories) {
    if (currentCategories.includes(category)) {
      const baselineCat = baseline.report.categories[category as keyof typeof baseline.report.categories];
      const currentCat = current.categories[category as keyof typeof current.categories];
      
      if (baselineCat && currentCat) {
        const baselinePassRate = baselineCat.total > 0 ? baselineCat.passed / baselineCat.total : 1;
        const currentPassRate = currentCat.total > 0 ? currentCat.passed / currentCat.total : 1;
        const delta = currentPassRate - baselinePassRate;
        
        if (delta < -0.05) {
          regressions.push({
            caseId: `category_${category}`,
            metric: `category_${category}_pass_rate`,
            baseline: baselinePassRate,
            current: currentPassRate,
            delta,
            status: "regressed",
          });
        }
      }
    }
  }
  
  // Compare golden test results
  const baselineGolden = baseline.report.goldenResults;
  const currentGolden = current.goldenResults;
  
  if (currentGolden.failed > baselineGolden.failed) {
    regressions.push({
      caseId: "golden_tests",
      metric: "golden_failure_count",
      baseline: baselineGolden.failed,
      current: currentGolden.failed,
      delta: currentGolden.failed - baselineGolden.failed,
      status: "regressed",
    });
  }
  
  // Compare adversarial catch rate
  const baselineCatchRate = baseline.report.adversarialResults.catchRate;
  const currentCatchRate = current.adversarialResults.catchRate;
  
  if (currentCatchRate < baselineCatchRate - 0.05) {
    regressions.push({
      caseId: "adversarial_tests",
      metric: "adversarial_catch_rate",
      baseline: baselineCatchRate,
      current: currentCatchRate,
      delta: currentCatchRate - baselineCatchRate,
      status: "regressed",
    });
  }
  
  return regressions;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface RegressionSummary {
  totalRegressions: number;
  criticalRegressions: number;
  improved: number;
  unchanged: number;
  regressed: number;
}

export function summarizeRegressions(regressions: RegressionResult[]): RegressionSummary {
  return {
    totalRegressions: regressions.length,
    criticalRegressions: regressions.filter((r) =>
      r.metric.includes("safety") || r.metric.includes("negation") || r.metric.includes("boundary")
    ).length,
    improved: regressions.filter((r) => r.status === "improved").length,
    unchanged: regressions.filter((r) => r.status === "unchanged").length,
    regressed: regressions.filter((r) => r.status === "regressed").length,
  };
}
