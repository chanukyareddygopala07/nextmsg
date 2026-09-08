/**
 * Dataset Loader
 * 
 * Loads benchmark datasets from JSON files with validation.
 */

import type { BenchmarkDataset } from "../types";
import * as fs from "fs";
import * as path from "path";
import { getModeBenchmarkDataset } from "./mode-benchmark";
import { getToneBenchmark } from "./tone-benchmark";
import { getContextBenchmark } from "./context-benchmark";
import { getGoldenBenchmark } from "./golden-benchmark";
import { getSemanticBenchmark } from "./semantic-benchmark";
import { getRealWorldBenchmark } from "./real-world-benchmark";

const DATASETS_DIR = path.join(__dirname, "data");

function validateCase(c: Record<string, unknown>, index: number): string[] {
  const errors: string[] = [];
  if (typeof c.id !== "string" || c.id === "") {
    errors.push(`Case ${index}: id must be a non-empty string, got ${typeof c.id}`);
  }
  if (typeof c.category !== "string") {
    errors.push(`Case ${index} (${c.id}): category must be a string`);
  }
  if (!Array.isArray(c.conversation)) {
    errors.push(`Case ${index} (${c.id}): conversation must be an array`);
  }
  if (typeof c.expected !== "object" || c.expected === null) {
    errors.push(`Case ${index} (${c.id}): expected must be an object`);
  }
  if (typeof c.difficulty !== "string") {
    errors.push(`Case ${index} (${c.id}): difficulty must be a string`);
  }
  return errors;
}

export function loadDataset(version: string): BenchmarkDataset {
  // Mode benchmark is generated from curated seeds (also mirrored to JSON when written).
  if (version === "mode-v1.0" || version === "mode") {
    const modeDataset = getModeBenchmarkDataset();
    const jsonPath = path.join(DATASETS_DIR, "dataset-mode-v1.0.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const data = JSON.parse(raw) as BenchmarkDataset;
        if (data.cases?.length >= 100) return data;
      } catch {
        // fall through to generated dataset
      }
    }
    return modeDataset;
  }

  // Tone benchmark
  if (version === "tone-v1.0" || version === "tone") {
    return getToneBenchmark();
  }

  // Context benchmark
  if (version === "context-v1.0" || version === "context") {
    return getContextBenchmark();
  }

  // Golden benchmark
  if (version === "golden-v1.0" || version === "golden") {
    return getGoldenBenchmark();
  }

  // Semantic benchmark
  if (version === "semantic-v1.0" || version === "semantic") {
    return getSemanticBenchmark();
  }

  // Real-world benchmark
  if (version === "real-world-v1.0" || version === "real-world") {
    return getRealWorldBenchmark();
  }

  const filePath = path.join(DATASETS_DIR, `dataset-${version}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset ${version} not found at ${filePath}`);
  }
  
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as BenchmarkDataset;
  
  // Validate structure
  if (!data.version || !data.cases || !Array.isArray(data.cases)) {
    throw new Error(`Invalid dataset format: ${version}`);
  }
  
  // Validate each case
  const allErrors: string[] = [];
  for (let i = 0; i < data.cases.length; i++) {
    const caseErrors = validateCase(data.cases[i] as unknown as Record<string, unknown>, i);
    allErrors.push(...caseErrors);
  }
  
  if (allErrors.length > 0) {
    throw new Error(`Dataset ${version} validation failed:\n${allErrors.join("\n")}`);
  }
  
  return data;
}

export function listDatasets(): string[] {
  const versions = new Set<string>(["mode-v1.0", "tone-v1.0", "context-v1.0", "golden-v1.0", "semantic-v1.0", "real-world-v1.0"]);

  if (fs.existsSync(DATASETS_DIR)) {
    for (const f of fs.readdirSync(DATASETS_DIR)) {
      if (f.startsWith("dataset-") && f.endsWith(".json")) {
        versions.add(f.replace("dataset-", "").replace(".json", ""));
      }
    }
  }

  return Array.from(versions).sort();
}

export function getDatasetInfo(version: string): Partial<BenchmarkDataset> {
  const dataset = loadDataset(version);
  return {
    version: dataset.version,
    name: dataset.name,
    description: dataset.description,
    totalCases: dataset.totalCases,
    categories: dataset.categories,
    difficulties: dataset.difficulties,
    createdAt: dataset.createdAt,
  };
}

export function writeModeBenchmarkJson(): string {
  const dataset = getModeBenchmarkDataset();
  if (!fs.existsSync(DATASETS_DIR)) {
    fs.mkdirSync(DATASETS_DIR, { recursive: true });
  }
  const outPath = path.join(DATASETS_DIR, "dataset-mode-v1.0.json");
  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
  return outPath;
}
