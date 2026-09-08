import { NextResponse } from "next/server";
import { parseConversationText, detectPlatform } from "@/lib/parser/conversation";
import { buildContext } from "@/lib/ai/detector";
import { checkGenerationRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/observability/request-context";
import { logAPIRequest, logAPIError } from "@/lib/observability/logger";
import { apiBadRequest, apiInternalError, checkPayloadSize, PAYLOAD_LIMITS, sanitizeString, isPromptInjection } from "@/lib/api-utils";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = checkGenerationRateLimit(`analyze:text:${clientId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Please try again later." } },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return apiBadRequest("Text is required", requestId);
    }

    const sizeError = checkPayloadSize(text, PAYLOAD_LIMITS.conversation, "conversation");
    if (sizeError) {
      return apiBadRequest(sizeError, requestId);
    }

    const sanitized = sanitizeString(text, PAYLOAD_LIMITS.conversation);
    if (isPromptInjection(sanitized)) {
      return apiBadRequest("Invalid input detected", requestId);
    }

    const platform = detectPlatform(sanitized);
    const parsed = parseConversationText(sanitized, platform);

    const context = buildContext(
      parsed.messages,
      undefined,
      parsed.platform || platform || undefined
    );

    const durationMs = Date.now() - startTime;
    logAPIRequest({ requestId, method: "POST", path: "/api/analyze/text", durationMs, statusCode: 200 });

    return NextResponse.json({
      requestId,
      platform: parsed.platform,
      messages: parsed.messages,
      context,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logAPIError({ requestId, method: "POST", path: "/api/analyze/text", statusCode: 500, errorCode: "PARSE_ERROR" });
    return apiInternalError(requestId);
  }
}
