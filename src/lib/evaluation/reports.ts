/**
 * Report Generation
 * 
 * Generates human-readable Markdown and machine-readable JSON evaluation reports.
 */

import type {
  EvaluationReport,
  QualityThresholds,
  FailureExample,
  EvaluationCategory,
  Difficulty,
} from "./types";
import { DEFAULT_THRESHOLDS } from "./thresholds";

// ─── Markdown Report ─────────────────────────────────────────────────────────

export function generateMarkdownReport(report: EvaluationReport): string {
  const lines: string[] = [];
  
  lines.push("# NextMsg Evaluation Report");
  lines.push("");
  lines.push(`**Dataset Version:** ${report.datasetVersion}`);
  lines.push(`**Total Cases:** ${report.totalCases}`);
  lines.push(`**Passed:** ${report.passed}`);
  lines.push(`**Failed:** ${report.failed}`);
  lines.push(`**Warned:** ${report.warned}`);
  lines.push(`**Skipped:** ${report.skipped}`);
  lines.push(`**Pass Rate:** ${report.totalCases > 0 ? ((report.passed / report.totalCases) * 100).toFixed(1) : 0}%`);
  lines.push(`**Execution Time:** ${report.executionTimeMs}ms`);
  lines.push(`**Timestamp:** ${report.timestamp}`);
  lines.push("");
  
  // Overall Metrics
  lines.push("## Overall Metrics");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Composite Score | ${(report.metrics.composite.overall * 100).toFixed(1)}% |`);
  lines.push(`| Safety | ${(report.metrics.composite.safety * 100).toFixed(1)}% |`);
  lines.push(`| Semantic Preservation | ${(report.metrics.composite.semanticPreservation * 100).toFixed(1)}% |`);
  lines.push(`| Factual Integrity | ${(report.metrics.composite.factualIntegrity * 100).toFixed(1)}% |`);
  lines.push(`| Context Fit | ${(report.metrics.composite.context * 100).toFixed(1)}% |`);
  lines.push(`| Tone | ${(report.metrics.composite.tone * 100).toFixed(1)}% |`);
  lines.push(`| Naturalness | ${(report.metrics.composite.naturalness * 100).toFixed(1)}% |`);
  lines.push(`| Personalization | ${(report.metrics.composite.personalization * 100).toFixed(1)}% |`);
  lines.push("");
  
  // Preservation Metrics
  lines.push("## Preservation Metrics");
  lines.push("");
  lines.push(`| Metric | Rate |`);
  lines.push(`|--------|------|`);
  lines.push(`| Semantic Preservation | ${(report.metrics.preservation.semanticPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Negation Preservation | ${(report.metrics.preservation.negationPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Factual Preservation | ${(report.metrics.preservation.factualPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Boundary Preservation | ${(report.metrics.preservation.boundaryPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Position Preservation | ${(report.metrics.preservation.positionPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Ability Preservation | ${(report.metrics.preservation.abilityPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Date Preservation | ${(report.metrics.preservation.datePreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Number Preservation | ${(report.metrics.preservation.numberPreservationRate * 100).toFixed(1)}% |`);
  lines.push("");
  
  // Tone Metrics
  lines.push("## Tone Metrics");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Target Tone Accuracy | ${(report.metrics.tone.targetToneAccuracy * 100).toFixed(1)}% |`);
  lines.push(`| Tone Intensity | ${(report.metrics.tone.toneIntensityAccuracy * 100).toFixed(1)}% |`);
  lines.push(`| Context Compatibility | ${(report.metrics.tone.contextCompatibility * 100).toFixed(1)}% |`);
  lines.push("");
  
  // Risk Metrics
  lines.push("## Risk Metrics");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Critical Risk Recall | ${(report.metrics.risk.criticalRiskRecall * 100).toFixed(1)}% |`);
  lines.push(`| False Positive Rate | ${(report.metrics.risk.falsePositiveRate * 100).toFixed(1)}% |`);
  lines.push(`| False Negative Rate | ${(report.metrics.risk.falseNegativeRate * 100).toFixed(1)}% |`);
  lines.push("");
  
  // Multilingual Metrics
  lines.push("## Multilingual Metrics");
  lines.push("");
  lines.push(`| Metric | Rate |`);
  lines.push(`|--------|------|`);
  lines.push(`| Language Preservation | ${(report.metrics.multilingual.languagePreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Script Preservation | ${(report.metrics.multilingual.scriptPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Code-Mix Preservation | ${(report.metrics.multilingual.codeMixPreservationRate * 100).toFixed(1)}% |`);
  lines.push(`| Semantic Preservation | ${(report.metrics.multilingual.semanticPreservationRate * 100).toFixed(1)}% |`);
  lines.push("");
  
  // Category Breakdown
  lines.push("## Category Breakdown");
  lines.push("");
  lines.push(`| Category | Total | Passed | Failed | Pass Rate |`);
  lines.push(`|----------|-------|--------|--------|-----------|`);
  
  const sortedCategories = Object.entries(report.categories)
    .sort((a, b) => b[1].total - a[1].total);
  
  for (const [category, data] of sortedCategories) {
    const passRate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : "0.0";
    lines.push(`| ${category} | ${data.total} | ${data.passed} | ${data.failed} | ${passRate}% |`);
  }
  lines.push("");
  
  // Difficulty Breakdown
  lines.push("## Difficulty Breakdown");
  lines.push("");
  lines.push(`| Difficulty | Total | Passed | Failed | Avg Score |`);
  lines.push(`|------------|-------|--------|--------|-----------|`);
  
  const difficultyOrder: Difficulty[] = ["easy", "medium", "hard", "adversarial"];
  for (const difficulty of difficultyOrder) {
    const data = report.difficulties[difficulty];
    if (data) {
      lines.push(`| ${difficulty} | ${data.total} | ${data.passed} | ${data.failed} | ${(data.averageScore * 100).toFixed(1)}% |`);
    }
  }
  lines.push("");
  
  // Golden Tests
  lines.push("## Golden Tests");
  lines.push("");
  lines.push(`- **Total:** ${report.goldenResults.total}`);
  lines.push(`- **Passed:** ${report.goldenResults.passed}`);
  lines.push(`- **Failed:** ${report.goldenResults.failed}`);
  lines.push(`- **Critical Failures:** ${report.goldenResults.criticalFailures.length}`);
  lines.push("");
  
  // Adversarial Tests
  lines.push("## Adversarial Tests");
  lines.push("");
  lines.push(`- **Total:** ${report.adversarialResults.total}`);
  lines.push(`- **Caught:** ${report.adversarialResults.caught}`);
  lines.push(`- **Missed:** ${report.adversarialResults.missed}`);
  lines.push(`- **Catch Rate:** ${(report.adversarialResults.catchRate * 100).toFixed(1)}%`);
  lines.push("");
  
  // Regressions
  if (report.regressions.length > 0) {
    lines.push("## Regressions");
    lines.push("");
    lines.push(`| Case ID | Metric | Baseline | Current | Delta | Status |`);
    lines.push(`|---------|--------|----------|---------|-------|--------|`);
    for (const reg of report.regressions) {
      lines.push(`| ${reg.caseId} | ${reg.metric} | ${reg.baseline.toFixed(3)} | ${reg.current.toFixed(3)} | ${reg.delta.toFixed(3)} | ${reg.status} |`);
    }
    lines.push("");
  }
  
  // Performance
  lines.push("## Performance");
  lines.push("");
  lines.push(`- **Total Latency:** ${report.performanceMetrics.totalLatencyMs}ms`);
  lines.push(`- **Average Latency:** ${report.performanceMetrics.averageLatencyMs.toFixed(1)}ms`);
  lines.push(`- **Cases/Second:** ${report.performanceMetrics.casesPerSecond.toFixed(2)}`);
  lines.push("");
  
  // Top Failures
  if (report.failures.length > 0) {
    lines.push("## Top Failures");
    lines.push("");
    const criticalFailures = report.failures
      .filter((f) => f.severity === "critical")
      .slice(0, 20);
    
    if (criticalFailures.length > 0) {
      for (const failure of criticalFailures) {
        lines.push(`### ${failure.caseId} (${failure.category})`);
        lines.push(`- **Severity:** ${failure.severity}`);
        lines.push(`- **Failure Category:** ${failure.failureCategory}`);
        lines.push(`- **Details:** ${failure.details || "N/A"}`);
        lines.push("");
      }
    }
  }
  
  // Limitations
  lines.push("## Limitations");
  lines.push("");
  lines.push("- Semantic equivalence evaluation is imperfect");
  lines.push("- Human language is inherently ambiguous");
  lines.push("- Tone evaluation is subjective");
  lines.push("- Multilingual quality varies across languages");
  lines.push("- Some evaluations require human judgment");
  lines.push("- Benchmark coverage is finite");
  lines.push("- Model behavior can change between versions");
  lines.push("");
  
  return lines.join("\n");
}

// ─── JSON Report ─────────────────────────────────────────────────────────────

export function generateJsonReport(report: EvaluationReport): string {
  return JSON.stringify(report, null, 2);
}

// ─── Threshold Check ─────────────────────────────────────────────────────────

export interface ThresholdCheckResult {
  passed: boolean;
  failures: string[];
}

export function checkThresholds(
  report: EvaluationReport,
  thresholds: QualityThresholds
): ThresholdCheckResult {
  const failures: string[] = [];
  
  if (report.metrics.preservation.semanticPreservationRate < thresholds.semanticPreservation) {
    failures.push(`Semantic preservation ${(report.metrics.preservation.semanticPreservationRate * 100).toFixed(1)}% < ${(thresholds.semanticPreservation * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.preservation.factualPreservationRate < thresholds.factualPreservation) {
    failures.push(`Factual preservation ${(report.metrics.preservation.factualPreservationRate * 100).toFixed(1)}% < ${(thresholds.factualPreservation * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.preservation.negationPreservationRate < thresholds.negationPreservation) {
    failures.push(`Negation preservation ${(report.metrics.preservation.negationPreservationRate * 100).toFixed(1)}% < ${(thresholds.negationPreservation * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.preservation.boundaryPreservationRate < thresholds.boundaryPreservation) {
    failures.push(`Boundary preservation ${(report.metrics.preservation.boundaryPreservationRate * 100).toFixed(1)}% < ${(thresholds.boundaryPreservation * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.risk.criticalRiskRecall < thresholds.criticalSafetyRecall) {
    failures.push(`Critical risk recall ${(report.metrics.risk.criticalRiskRecall * 100).toFixed(1)}% < ${(thresholds.criticalSafetyRecall * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.risk.falsePositiveRate > thresholds.falsePositiveRate) {
    failures.push(`False positive rate ${(report.metrics.risk.falsePositiveRate * 100).toFixed(1)}% > ${(thresholds.falsePositiveRate * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.tone.targetToneAccuracy < thresholds.toneAccuracy) {
    failures.push(`Tone accuracy ${(report.metrics.tone.targetToneAccuracy * 100).toFixed(1)}% < ${(thresholds.toneAccuracy * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.context.contextFitRate < thresholds.contextFit) {
    failures.push(`Context fit ${(report.metrics.context.contextFitRate * 100).toFixed(1)}% < ${(thresholds.contextFit * 100).toFixed(1)}%`);
  }
  
  if (report.metrics.composite.overall < thresholds.overallComposite) {
    failures.push(`Overall composite ${(report.metrics.composite.overall * 100).toFixed(1)}% < ${(thresholds.overallComposite * 100).toFixed(1)}%`);
  }
  
  return {
    passed: failures.length === 0,
    failures,
  };
}
