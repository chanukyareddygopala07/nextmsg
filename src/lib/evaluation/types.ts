/**
 * Evaluation Framework Types
 * 
 * Core types for the NextMsg evaluation and benchmarking system.
 * This framework measures whether the system produces good communication,
 * not just whether code behaves according to implementation.
 */

// ─── Benchmark Case ──────────────────────────────────────────────────────────

export type EvaluationCategory =
  | "professional"
  | "academic"
  | "career"
  | "social"
  | "general"
  | "interview"
  | "conflict"
  | "dating"
  | "friendship"
  | "family"
  | "negotiation"
  | "customer"
  | "recovery"
  | "group"
  | "multilingual"
  | "preservation"
  | "personalization"
  | "pre_send"
  | "adversarial"
  | "golden"
  | "golden_rule"
  | "advisory"
  | "multi_turn"
  | "mode";

export type Difficulty = "easy" | "medium" | "hard" | "adversarial";

export type EvaluationMode = "deterministic" | "model_judge" | "hybrid";

export interface BenchmarkCase {
  id: string;
  category: EvaluationCategory;
  difficulty: Difficulty;
  context: string;
  relationship: string;
  language: string;
  script: string;
  platform?: string;
  conversation: ConversationMessage[];
  draft?: string;
  goal?: string;
  targetTone?: string;
  expected: ExpectedBehavior;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: "user" | "other" | "system";
  content: string;
  sender?: string;
  timestamp?: string;
}

export interface ExpectedBehavior {
  intent?: string[];
  tone?: string;
  strategy?: string;
  risks?: string[];
  targetTone?: string;
  preservedFacts?: string[];
  preservedConstraints?: string[];
  preservedEntities?: string[];
  expectedGateStatus?: PreSendStatus;
  expectedAction?: string;
  negationPreserved?: boolean;
  abilityPreserved?: boolean;
  availabilityPreserved?: boolean;
  datePreserved?: boolean;
  timePreserved?: boolean;
  numberPreserved?: boolean;
  urlPreserved?: boolean;
  commitmentPreserved?: boolean;
  positionPreserved?: boolean;
  boundaryPreserved?: boolean;
  semanticPreservationRequired?: boolean;
  factualPreservationRequired?: boolean;
  contextFitRequired?: boolean;
  escalationExpected?: boolean;
  deEscalationExpected?: boolean;
  resolutionExpected?: boolean;
  personalizationExpected?: boolean;
  coldStartExpected?: boolean;
  languagePreservationRequired?: boolean;
  scriptPreservationRequired?: boolean;
  codeMixPreservationRequired?: boolean;
  /** Expected CommunicationMode from classification/recommendation */
  expectedMode?: string;
  /** Minimum confidence for mode recommendation */
  modeConfidenceMin?: number;
  /** Manual mode selection for precedence/conflict cases */
  selectedMode?: string;
  /** Ephemeral user instruction for precedence cases */
  overrideInstruction?: string;
  /** Whether a mode/context conflict is expected */
  expectConflict?: boolean;
  /** Expected mode after precedence resolution */
  expectedEffectiveMode?: string;
  acceptableAlternatives?: string[];
  unacceptablePatterns?: string[];
  requiredPatterns?: string[];
  preSendStatus?: PreSendStatus;
  falsePositiveCase?: boolean;
  falseNegativeCase?: boolean;
}

// ─── Evaluation Results ──────────────────────────────────────────────────────

export type PreSendStatus = "READY" | "REVIEW" | "HIGH_RISK";

export type PassFail = "PASS" | "FAIL" | "WARN" | "SKIP";

export interface EvalResult {
  caseId: string;
  category: EvaluationCategory;
  difficulty: Difficulty;
  metrics: MetricResult[];
  overall: PassFail;
  score: number;
  executionTimeMs: number;
  evaluatorVersion: string;
  errors?: string[];
}

export interface MetricResult {
  name: string;
  value: number;
  pass: PassFail;
  details?: string;
  isFatal?: boolean;
}

// ─── Evaluators ──────────────────────────────────────────────────────────────

export interface Evaluator {
  name: string;
  version: string;
  evaluate(
    benchCase: BenchmarkCase,
    candidate: string,
    context: EvaluationContext
  ): EvalResult;
}

export interface EvaluationContext {
  conversationState?: Record<string, unknown>;
  detectedContext?: Record<string, unknown>;
  draftAnalysis?: Record<string, unknown>;
  impactPrediction?: Record<string, unknown>;
  coaching?: Record<string, unknown>;
  preSendGate?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: ConfusionMatrix;
  support: number;
}

export interface ConfusionMatrix {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
}

export interface PreservationMetrics {
  semanticPreservationRate: number;
  negationPreservationRate: number;
  factualPreservationRate: number;
  boundaryPreservationRate: number;
  positionPreservationRate: number;
  abilityPreservationRate: number;
  datePreservationRate: number;
  numberPreservationRate: number;
}

export interface ToneMetrics {
  targetToneAccuracy: number;
  toneIntensityAccuracy: number;
  contextCompatibility: number;
}

export interface ContextMetrics {
  contextFitRate: number;
  severeMismatchRate: number;
  categoryBreakdown: Record<EvaluationCategory, number>;
}

export interface MultilingualMetrics {
  languagePreservationRate: number;
  scriptPreservationRate: number;
  codeMixPreservationRate: number;
  semanticPreservationRate: number;
}

export interface RiskMetrics {
  criticalRiskRecall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

export interface PersonalizationMetrics {
  explicitOverrideAccuracy: number;
  contextOverrideAccuracy: number;
  preferenceRelevance: number;
}

export interface CompositeScore {
  overall: number;
  safety: number;
  semanticPreservation: number;
  factualIntegrity: number;
  context: number;
  goal: number;
  tone: number;
  naturalness: number;
  personalization: number;
  weights: CompositeWeights;
}

export interface CompositeWeights {
  safety: number;
  semanticPreservation: number;
  factualIntegrity: number;
  context: number;
  goal: number;
  tone: number;
  naturalness: number;
  personalization: number;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface EvaluationReport {
  datasetVersion: string;
  totalCases: number;
  passed: number;
  failed: number;
  warned: number;
  skipped: number;
  metrics: AllMetrics;
  categories: Record<EvaluationCategory, CategoryReport>;
  difficulties: Record<Difficulty, DifficultyReport>;
  regressions: RegressionResult[];
  goldenResults: GoldenReport;
  adversarialResults: AdversarialReport;
  performanceMetrics: PerformanceMetrics;
  failures: FailureExample[];
  timestamp: string;
  executionTimeMs: number;
}

export interface AllMetrics {
  classification: ClassificationMetrics;
  preservation: PreservationMetrics;
  tone: ToneMetrics;
  context: ContextMetrics;
  multilingual: MultilingualMetrics;
  risk: RiskMetrics;
  personalization: PersonalizationMetrics;
  composite: CompositeScore;
}

export interface CategoryReport {
  total: number;
  passed: number;
  failed: number;
  metrics: AllMetrics;
}

export interface DifficultyReport {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
}

export interface GoldenReport {
  total: number;
  passed: number;
  failed: number;
  criticalFailures: FailureExample[];
}

export interface AdversarialReport {
  total: number;
  caught: number;
  missed: number;
  catchRate: number;
  missedExamples: FailureExample[];
}

export interface PerformanceMetrics {
  totalLatencyMs: number;
  averageLatencyMs: number;
  casesPerSecond: number;
  aiCallsMade: number;
  tokenEstimate: number;
}

export interface FailureExample {
  caseId: string;
  category: EvaluationCategory;
  difficulty: Difficulty;
  input: string;
  candidate: string;
  expected: string;
  actual: string;
  failureCategory: string;
  severity: "low" | "medium" | "high" | "critical";
  details?: string;
}

// ─── Regression ──────────────────────────────────────────────────────────────

export interface RegressionResult {
  caseId: string;
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  status: "improved" | "unchanged" | "regressed";
}

export interface BaselineResult {
  datasetVersion: string;
  timestamp: string;
  report: EvaluationReport;
  configuration: EvaluationConfiguration;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface EvaluationConfiguration {
  datasetVersion: string;
  categories?: EvaluationCategory[];
  difficulties?: Difficulty[];
  mode: EvaluationMode;
  thresholds?: QualityThresholds;
  multiRuns?: number;
  seed?: number;
  maxCases?: number;
}

export interface QualityThresholds {
  semanticPreservation: number;
  factualPreservation: number;
  negationPreservation: number;
  boundaryPreservation: number;
  criticalSafetyRecall: number;
  falsePositiveRate: number;
  toneAccuracy: number;
  contextFit: number;
  overallComposite: number;
}

export const DEFAULT_WEIGHTS: CompositeWeights = {
  safety: 0.20,
  semanticPreservation: 0.20,
  factualIntegrity: 0.15,
  context: 0.12,
  goal: 0.10,
  tone: 0.08,
  naturalness: 0.08,
  personalization: 0.07,
};

// ─── Dataset ─────────────────────────────────────────────────────────────────

export interface BenchmarkDataset {
  version: string;
  name: string;
  description: string;
  createdAt: string;
  totalCases: number;
  categories: Record<EvaluationCategory, number>;
  difficulties: Record<Difficulty, number>;
  cases: BenchmarkCase[];
}

export interface DatasetManifest {
  version: string;
  name: string;
  description: string;
  file: string;
  checksum: string;
  totalCases: number;
  createdAt: string;
}
