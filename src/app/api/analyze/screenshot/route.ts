import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { extractFromScreenshot } from "@/lib/ai/screenshot";
import { buildContext } from "@/lib/ai/detector";
import { checkGenerationRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/observability/request-context";
import { logAPIRequest, logAPIError } from "@/lib/observability/logger";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = checkGenerationRateLimit(`analyze:screenshot:${clientId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Please try again later." } },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }
    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { error: "imageBase64 is required and must be a string" },
        { status: 400 }
      );
    }

    if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported image format. Please use PNG, JPEG, or WebP." },
        { status: 400 }
      );
    }

    const sizeBytes = Math.round((imageBase64.length * 3) / 4);
    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Please use an image under 10MB." },
        { status: 400 }
      );
    }

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Upload:", {
        mime: mimeType,
        sizeKB: Math.round(sizeBytes / 1024),
        base64Length: imageBase64.length,
      });
    }

    const provider = await getAIProvider();
    const result = await extractFromScreenshot(provider, imageBase64, mimeType);

    if (process.env.NEXTMSG_DEBUG_AI === "true") {
      console.log("[NEXTMSG AI DEBUG] Result:", {
        messageCount: result.messages.length,
        confidence: result.confidence,
        error: result.error,
        errorCategory: result.errorCategory,
      });
    }

    const context = result.messages.length > 0
      ? buildContext(result.messages, undefined, result.platform || undefined)
      : undefined;

    const durationMs = Date.now() - startTime;
    logAPIRequest({ requestId, method: "POST", path: "/api/analyze/screenshot", durationMs, statusCode: 200 });

    return NextResponse.json({
      requestId,
      messages: result.messages,
      platform: result.platform,
      confidence: result.confidence,
      error: result.error,
      errorCategory: result.errorCategory,
      context,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logAPIError({ requestId, method: "POST", path: "/api/analyze/screenshot", statusCode: 500, errorCode: "EXTRACTION_ERROR" });
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again.", requestId },
      },
      { status: 500 }
    );
  }
}
