/**
 * Quality Thresholds
 * 
 * Configurable thresholds for evaluation quality gates.
 */

import type { QualityThresholds } from "./types";

// ─── Default Thresholds ──────────────────────────────────────────────────────

export const DEFAULT_THRESHOLDS: QualityThresholds = {
  semanticPreservation: 0.95,
  factualPreservation: 0.98,
  negationPreservation: 0.99,
  boundaryPreservation: 0.99,
  criticalSafetyRecall: 0.95,
  falsePositiveRate: 0.10,
  toneAccuracy: 0.85,
  contextFit: 0.90,
  overallComposite: 0.88,
};

// ─── Strict Thresholds ───────────────────────────────────────────────────────

export const STRICT_THRESHOLDS: QualityThresholds = {
  semanticPreservation: 0.98,
  factualPreservation: 0.99,
  negationPreservation: 0.99,
  boundaryPreservation: 0.99,
  criticalSafetyRecall: 0.98,
  falsePositiveRate: 0.05,
  toneAccuracy: 0.90,
  contextFit: 0.95,
  overallComposite: 0.92,
};

// ─── Relaxed Thresholds ──────────────────────────────────────────────────────

export const RELAXED_THRESHOLDS: QualityThresholds = {
  semanticPreservation: 0.90,
  factualPreservation: 0.95,
  negationPreservation: 0.95,
  boundaryPreservation: 0.95,
  criticalSafetyRecall: 0.90,
  falsePositiveRate: 0.15,
  toneAccuracy: 0.80,
  contextFit: 0.85,
  overallComposite: 0.82,
};

// ─── Get Thresholds ──────────────────────────────────────────────────────────

export function getThresholds(preset?: string): QualityThresholds {
  switch (preset) {
    case "strict":
      return { ...STRICT_THRESHOLDS };
    case "relaxed":
      return { ...RELAXED_THRESHOLDS };
    default:
      return { ...DEFAULT_THRESHOLDS };
  }
}
