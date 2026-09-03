import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { extractFromScreenshot } from "@/lib/ai/screenshot";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  try {
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

    if (result.error) {
      return NextResponse.json(
        {
          messages: result.messages,
          platform: result.platform,
          confidence: result.confidence,
          error: result.error,
          errorCategory: result.errorCategory,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      messages: result.messages,
      platform: result.platform,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error("[NEXTMSG] Screenshot extraction error:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        errorCategory: "UNKNOWN_EXTRACTION_ERROR",
      },
      { status: 500 }
    );
  }
}
