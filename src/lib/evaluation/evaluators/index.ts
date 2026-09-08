/**
 * Evaluators Index
 * 
 * Exports all evaluators for the evaluation framework.
 */

export { evaluatePreservation } from "./preservation";
export { evaluateTone } from "./tone";
export { evaluateContext } from "./context";
export { evaluateMultilingual } from "./multilingual";
export { evaluateConflict } from "./conflict";
export { evaluatePreSend } from "./pre-send";
export { evaluatePersonalization } from "./personalization";
export { evaluateRecovery } from "./recovery";
export { evaluateNegotiation } from "./negotiation";
export { evaluateMode } from "./mode";
export { evaluateRealWorld } from "./real-world";

import type { Evaluator } from "../types";
import { evaluatePreservation } from "./preservation";
import { evaluateTone } from "./tone";
import { evaluateContext } from "./context";
import { evaluateMultilingual } from "./multilingual";
import { evaluateConflict } from "./conflict";
import { evaluatePreSend } from "./pre-send";
import { evaluatePersonalization } from "./personalization";
import { evaluateRecovery } from "./recovery";
import { evaluateNegotiation } from "./negotiation";
import { evaluateMode } from "./mode";
import { evaluateRealWorld } from "./real-world";

/**
 * Get all available evaluators.
 */
export function getAllEvaluators(): Evaluator[] {
  return [
    { name: "preservation", version: "1.0.0", evaluate: evaluatePreservation },
    { name: "tone", version: "1.0.0", evaluate: evaluateTone },
    { name: "context", version: "1.0.0", evaluate: evaluateContext },
    { name: "multilingual", version: "1.0.0", evaluate: evaluateMultilingual },
    { name: "conflict", version: "1.0.0", evaluate: evaluateConflict },
    { name: "pre_send", version: "1.0.0", evaluate: evaluatePreSend },
    { name: "personalization", version: "1.0.0", evaluate: evaluatePersonalization },
    { name: "recovery", version: "1.0.0", evaluate: evaluateRecovery },
    { name: "negotiation", version: "1.0.0", evaluate: evaluateNegotiation },
    { name: "mode", version: "1.0.0", evaluate: evaluateMode },
    { name: "real_world", version: "1.0.0", evaluate: evaluateRealWorld },
  ];
}

/**
 * Get evaluators relevant to a specific category.
 */
export function getEvaluatorsForCategory(category: string): Evaluator[] {
  const all = getAllEvaluators();
  
  const categoryEvaluatorMap: Record<string, string[]> = {
    professional: ["preservation", "tone", "context"],
    academic: ["preservation", "tone", "context"],
    career: ["preservation", "tone", "context"],
    social: ["preservation", "tone", "context"],
    general: ["preservation", "tone", "context"],
    interview: ["preservation", "tone", "context"],
    conflict: ["preservation", "tone", "context", "conflict"],
    dating: ["preservation", "tone", "context"],
    friendship: ["preservation", "tone", "context"],
    family: ["preservation", "tone", "context"],
    negotiation: ["preservation", "tone", "negotiation"],
    customer: ["preservation", "tone", "context"],
    recovery: ["preservation", "tone", "recovery"],
    group: ["preservation", "tone", "context"],
    multilingual: ["preservation", "multilingual"],
    preservation: ["preservation"],
    personalization: ["personalization"],
    pre_send: ["pre_send", "preservation"],
    adversarial: ["preservation", "tone", "context", "conflict", "pre_send"],
    golden: ["preservation", "tone", "context", "pre_send"],
    golden_rule: ["preservation", "tone", "context", "real_world"],
    advisory: ["preservation", "tone", "context", "recovery"],
    multi_turn: ["preservation", "tone", "context", "real_world"],
    mode: ["mode"],
    real_world: ["preservation", "tone", "context", "real_world"],
  };
  
  const evaluatorNames = categoryEvaluatorMap[category] || ["preservation", "tone", "context"];
  return all.filter((e) => evaluatorNames.includes(e.name));
}
