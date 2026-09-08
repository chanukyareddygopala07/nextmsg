import type { AIProvider } from "./provider";
import type { ConversationAnalysis } from "@/types/conversation";
import type { ConversationContext } from "./context";
import {
  buildConversationText,
  assembleSystemPrompt,
  assembleAnalysisUserPrompt,
} from "./prompt-builder";
import { CONVERSATION_ANALYSIS_PROMPT } from "./prompts/system";
import { ConversationAnalysisSchema } from "./schemas";
import { createPipelineError, logPipelineError, type PipelineError } from "./errors";

export interface AnalysisResult {
  analysis: ConversationAnalysis;
  error?: PipelineError;
}

const CONVERSATION_ANALYSIS_OUTPUT_CONFIG = {
  name: "conversation_analysis",
  schema: {
    type: "object",
    properties: {
      stage: {
        type: "string",
        enum: [
          "opening",
          "getting_to_know_each_other",
          "rapport",
          "playful",
          "flirting",
          "deep_conversation",
          "planning",
          "reconnecting",
          "dry_conversation",
          "awkward_conversation",
          "closing",
        ],
      },
      engagement: { type: "number" },
      flirting: { type: "number" },
      humor: { type: "number" },
      reciprocity: { type: "number" },
      conversationHealth: { type: "number" },
    },
    required: [
      "stage",
      "engagement",
      "flirting",
      "humor",
      "reciprocity",
      "conversationHealth",
    ],
    additionalProperties: false,
  },
};

export async function analyzeConversation(
  provider: AIProvider,
  messages: { sender: string; text: string }[],
  context: ConversationContext
): Promise<AnalysisResult> {
  const conversationText = buildConversationText(messages);

  const systemPrompt = assembleSystemPrompt(CONVERSATION_ANALYSIS_PROMPT, context);
  const userPrompt = assembleAnalysisUserPrompt(conversationText, context);

  try {
    const response = await provider.chatStructured(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      CONVERSATION_ANALYSIS_OUTPUT_CONFIG,
      { temperature: 0.3, maxTokens: 512 }
    );

    const parsed = JSON.parse(response);
    const result = ConversationAnalysisSchema.safeParse(parsed);

    if (result.success) {
      return { analysis: result.data };
    }

    const error = createPipelineError("schema_validation", result.error, {
      schemaName: "conversation_analysis",
    });
    logPipelineError(error);

    return {
      analysis: getDefaultAnalysis(),
      error,
    };
  } catch (err) {
    const error = createPipelineError("conversation_analysis", err);
    logPipelineError(error);

    return {
      analysis: getDefaultAnalysis(),
      error,
    };
  }
}

function getDefaultAnalysis(): ConversationAnalysis {
  return {
    stage: "getting_to_know_each_other",
    engagement: 0.5,
    flirting: 0.3,
    humor: 0.4,
    reciprocity: 0.5,
    conversationHealth: 0.5,
  };
}
