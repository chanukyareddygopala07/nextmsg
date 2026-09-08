import { z } from "zod";

export type PipelineStage =
  | "provider_request"
  | "json_parse"
  | "schema_validation"
  | "screenshot_extraction"
  | "reply_generation"
  | "conversation_analysis"
  | "humanization"
  | "draft_analysis"
  | "impact_prediction";

export type ErrorSeverity = "transient" | "permanent" | "unknown";

export interface PipelineError {
  stage: PipelineStage;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  originalError?: unknown;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}

export class PipelineErrorImpl extends Error implements PipelineError {
  constructor(
    public stage: PipelineStage,
    public severity: ErrorSeverity,
    message: string,
    public userMessage: string,
    public originalError?: unknown,
    public retryable = false,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

const USER_MESSAGES: Record<PipelineStage, { transient: string; permanent: string; unknown: string }> = {
  provider_request: {
    transient: "The AI service is temporarily busy. Please try again.",
    permanent: "The AI service is not available. Please check your settings.",
    unknown: "Something went wrong with the AI service. Please try again.",
  },
  json_parse: {
    transient: "The AI returned an unexpected response. Retrying...",
    permanent: "The AI could not process this request. Please try again.",
    unknown: "The AI response could not be understood. Please try again.",
  },
  schema_validation: {
    transient: "The AI response did not match the expected format. Retrying...",
    permanent: "The AI response was invalid. Please try again.",
    unknown: "The AI response was unexpected. Please try again.",
  },
  screenshot_extraction: {
    transient: "Could not read the screenshot. Please try again.",
    permanent: "Could not read this screenshot. Try a clearer image or crop the chat area.",
    unknown: "Could not process the screenshot. Please try again.",
  },
  reply_generation: {
    transient: "Could not generate replies. Please try again.",
    permanent: "Could not generate replies at this time.",
    unknown: "Something went wrong generating replies. Please try again.",
  },
  conversation_analysis: {
    transient: "Could not analyze the conversation. Please try again.",
    permanent: "Could not analyze this conversation.",
    unknown: "Something went wrong analyzing the conversation.",
  },
  humanization: {
    transient: "Could not refine replies. Using original suggestions.",
    permanent: "Could not refine replies. Using original suggestions.",
    unknown: "Something went wrong refining replies.",
  },
  draft_analysis: {
    transient: "Could not analyze your draft. Please try again.",
    permanent: "Could not analyze this draft. Please try again.",
    unknown: "Something went wrong analyzing your draft. Please try again.",
  },
  impact_prediction: {
    transient: "Could not predict communication impact. Please try again.",
    permanent: "Could not predict communication impact. Please try again.",
    unknown: "Something went wrong predicting communication impact. Please try again.",
  },
};

export function createPipelineError(
  stage: PipelineStage,
  originalError: unknown,
  metadata?: Record<string, unknown>
): PipelineErrorImpl {
  const severity = classifySeverity(originalError);
  const retryable = isRetryableSeverity(severity);
  const baseMessage = getErrorMessage(originalError);
  const userMessage = USER_MESSAGES[stage][severity];

  return new PipelineErrorImpl(
    stage,
    severity,
    `[${stage}] ${baseMessage}`,
    userMessage,
    originalError,
    retryable,
    metadata
  );
}

function classifySeverity(error: unknown): ErrorSeverity {
  if (error instanceof z.ZodError) {
    return "permanent";
  }

  if (error instanceof SyntaxError) {
    return "permanent";
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "transient";
  }

  if (error instanceof TypeError) {
    return "transient";
  }

  return "unknown";
}

function isRetryableSeverity(severity: ErrorSeverity): boolean {
  return severity === "transient";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export function logPipelineError(error: PipelineErrorImpl): void {
  if (process.env.NEXTMSG_DEBUG_AI !== "true") {
    return;
  }

  console.log("[NEXTMSG AI DEBUG] Pipeline error:", {
    stage: error.stage,
    severity: error.severity,
    retryable: error.retryable,
    message: error.message,
    metadata: error.metadata,
  });
}
