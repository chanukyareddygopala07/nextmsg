/**
 * Evaluation CLI Runner
 * 
 * Usage:
 *   npx tsx scripts/eval.ts --mode smoke
 *   npx tsx scripts/eval.ts --mode full
 *   npx tsx scripts/eval.ts --mode full --dataset v1.0
 */

import { runSmokeEvaluation, runFullEvaluation } from "../src/lib/evaluation/runner";
import { generateMarkdownReport, generateJsonReport, checkThresholds } from "../src/lib/evaluation/reports";
import { getThresholds } from "../src/lib/evaluation/thresholds";
import { loadDataset } from "../src/lib/evaluation/datasets/loader";
import * as fs from "fs";
import * as path from "path";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const mode = getArg("mode") || "smoke";
const datasetVersion = getArg("dataset") || "v1.0";
const thresholdPreset = getArg("thresholds") || "default";
const outputDir = getArg("output") || "evaluation-results";

async function main() {
  console.log(`\nNextMsg Evaluation Framework`);
  console.log(`============================`);
  console.log(`Mode: ${mode}`);
  console.log(`Dataset: ${datasetVersion}`);
  console.log(`Thresholds: ${thresholdPreset}`);
  console.log("");
  
  // Load dataset
  const dataset = loadDataset(datasetVersion);
  console.log(`Loaded ${dataset.totalCases} cases from ${dataset.name}`);
  console.log(`Categories: ${Object.keys(dataset.categories).join(", ")}`);
  console.log("");
  
  // Run evaluation
  const startTime = Date.now();
  const report = mode === "smoke"
    ? runSmokeEvaluation(dataset)
    : runFullEvaluation(dataset);
  const executionTime = Date.now() - startTime;
  
  console.log(`Evaluation completed in ${executionTime}ms`);
  console.log("");
  
  // Print summary
  console.log(`Results:`);
  console.log(`  Total: ${report.totalCases}`);
  console.log(`  Passed: ${report.passed}`);
  console.log(`  Failed: ${report.failed}`);
  console.log(`  Warned: ${report.warned}`);
  console.log(`  Pass Rate: ${report.totalCases > 0 ? ((report.passed / report.totalCases) * 100).toFixed(1) : 0}%`);
  console.log("");
  
  // Check thresholds
  const thresholds = getThresholds(thresholdPreset);
  const thresholdResult = checkThresholds(report, thresholds);
  
  if (thresholdResult.passed) {
    console.log(`Threshold Check: PASSED`);
  } else {
    console.log(`Threshold Check: FAILED`);
    for (const failure of thresholdResult.failures) {
      console.log(`  - ${failure}`);
    }
  }
  console.log("");
  
  // Print key metrics
  console.log(`Key Metrics:`);
  console.log(`  Composite: ${(report.metrics.composite.overall * 100).toFixed(1)}%`);
  console.log(`  Safety: ${(report.metrics.composite.safety * 100).toFixed(1)}%`);
  console.log(`  Semantic: ${(report.metrics.composite.semanticPreservation * 100).toFixed(1)}%`);
  console.log(`  Factual: ${(report.metrics.composite.factualIntegrity * 100).toFixed(1)}%`);
  console.log(`  Context: ${(report.metrics.composite.context * 100).toFixed(1)}%`);
  console.log(`  Tone: ${(report.metrics.composite.tone * 100).toFixed(1)}%`);
  console.log("");
  
  // Save reports
  const outputDirPath = path.resolve(outputDir);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outputDirPath, `eval-${mode}-${datasetVersion}-${timestamp}.json`);
  const mdPath = path.join(outputDirPath, `eval-${mode}-${datasetVersion}-${timestamp}.md`);
  
  fs.writeFileSync(jsonPath, generateJsonReport(report));
  fs.writeFileSync(mdPath, generateMarkdownReport(report));
  
  console.log(`Reports saved:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  Markdown: ${mdPath}`);
  console.log("");
  
  // Exit with appropriate code
  if (!thresholdResult.passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
