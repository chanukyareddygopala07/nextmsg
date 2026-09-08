import type { AIProvider } from "./provider";
import type { ConversationContext } from "./context";
import type { ConversationState } from "./conversation-state";
import {
  assembleSystemPrompt,
  assembleContextAwareHumanizationPrompt,
} from "./prompt-builder";
import { CONTEXT_AWARE_HUMANIZATION_PROMPT } from "./prompts/system";
import { HumanizationSchema } from "./schemas";
import { createPipelineError, logPipelineError, type PipelineError } from "./errors";

export interface HumanizationResult {
  humanized: { text: string; strategy: string }[];
  error?: PipelineError;
}

const HUMANIZATION_OUTPUT_CONFIG = {
  name: "humanization",
  schema: {
    type: "object",
    properties: {
      humanized: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            strategy: { type: "string" },
          },
          required: ["text", "strategy"],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: ["humanized"],
    additionalProperties: false,
  },
};

export async function humanizeReplies(
  provider: AIProvider,
  candidates: { text: string; strategy: string }[],
  context: ConversationContext,
  state?: ConversationState
): Promise<HumanizationResult> {
  // If no state provided, use basic context-aware humanization
  if (!state) {
    return humanizeWithBasicContext(provider, candidates, context);
  }

  return humanizeWithContextState(provider, candidates, context, state);
}

async function humanizeWithBasicContext(
  provider: AIProvider,
  candidates: { text: string; strategy: string }[],
  context: ConversationContext
): Promise<HumanizationResult> {
  const candidatesText = candidates
    .map((c, i) => `${i + 1}. [${c.strategy}] ${c.text}`)
    .join("\n");

  const systemPrompt = assembleSystemPrompt(CONTEXT_AWARE_HUMANIZATION_PROMPT, context);
  const userPrompt = assembleContextAwareHumanizationPrompt(candidatesText, context);

  try {
    const response = await provider.chatStructured(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      HUMANIZATION_OUTPUT_CONFIG,
      { temperature: 0.8, maxTokens: 1024 }
    );

    const parsed = JSON.parse(response);
    const result = HumanizationSchema.safeParse(parsed);

    if (result.success) {
      return { humanized: result.data.humanized };
    }

    const error = createPipelineError("schema_validation", result.error, {
      schemaName: "humanization",
    });
    logPipelineError(error);

    return {
      humanized: candidates,
      error,
    };
  } catch (err) {
    const error = createPipelineError("humanization", err);
    logPipelineError(error);

    return {
      humanized: candidates,
      error,
    };
  }
}

async function humanizeWithContextState(
  provider: AIProvider,
  candidates: { text: string; strategy: string }[],
  context: ConversationContext,
  state: ConversationState
): Promise<HumanizationResult> {
  const candidatesText = candidates
    .map((c, i) => `${i + 1}. [${c.strategy}] ${c.text}`)
    .join("\n");

  const systemPrompt = assembleSystemPrompt(CONTEXT_AWARE_HUMANIZATION_PROMPT, context);
  const userPrompt = assembleContextAwareHumanizationPrompt(
    candidatesText,
    context,
    state
  );

  try {
    const response = await provider.chatStructured(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      HUMANIZATION_OUTPUT_CONFIG,
      { temperature: 0.8, maxTokens: 1024 }
    );

    const parsed = JSON.parse(response);
    const result = HumanizationSchema.safeParse(parsed);

    if (result.success) {
      return { humanized: result.data.humanized };
    }

    const error = createPipelineError("schema_validation", result.error, {
      schemaName: "humanization",
    });
    logPipelineError(error);

    return {
      humanized: candidates,
      error,
    };
  } catch (err) {
    const error = createPipelineError("humanization", err);
    logPipelineError(error);

    return {
      humanized: candidates,
      error,
    };
  }
}

// ─── AI Likeness Scoring ─────────────────────────────────────────────────────
//
// Used by the ranker to penalize AI-like responses.
// ──────────────────────────────────────────────────────────────────────────────

const AI_LIKENESS_PATTERNS = [
  /that sounds (amazing|wonderful|fantastic|great|interesting|fascinating)/i,
  /i(?:'d| would) (love|like) to (hear|know|learn)/i,
  /what (inspired|motivated|made) you/i,
  /that(?:'s| is) (really|truly|absolutely) (interesting|amazing|wonderful)/i,
  /i(?:'m| am) (happy|glad|delighted) to hear/i,
  /tell me more about/i,
  /how (did|does|do) you/i,
  /that(?:'s| is) a (great|wonderful|beautiful|nice)/i,
  /i (appreciate|admire|respect)/i,
  /what (a|an) (amazing|wonderful|incredible|beautiful)/i,
];

export function scoreAILikeness(text: string): number {
  let penalty = 0;
  for (const pattern of AI_LIKENESS_PATTERNS) {
    if (pattern.test(text)) penalty += 0.2;
  }
  if (text.length > 150) penalty += 0.1;
  if (text.split(/[.!?]/).length > 3) penalty += 0.1;
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 1) penalty += 0.1;
  return Math.min(1, penalty);
}
