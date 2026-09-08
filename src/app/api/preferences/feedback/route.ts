import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordFeedback } from "@/lib/ai/personalization";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import type { FeedbackSignal } from "@/lib/ai/personalization-types";

const VALID_SIGNALS = new Set([
  "thumbs_up",
  "thumbs_down",
  "copy",
  "select",
  "edit",
  "regenerate",
  "discard",
]);

const FEEDBACK_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60 };

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`preference:feedback:${clientId}`, FEEDBACK_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { signal, replyId, strategy, context, metadata } = body;

    if (!signal || !VALID_SIGNALS.has(signal)) {
      return NextResponse.json(
        { error: "Invalid signal. Must be one of: " + Array.from(VALID_SIGNALS).join(", ") },
        { status: 400 }
      );
    }

    const result = await recordFeedback(
      userId,
      {
        signal: signal as FeedbackSignal,
        replyId,
        strategy,
        context,
        metadata,
      }
    );

    return NextResponse.json({
      success: true,
      updated: result.updated,
      modifiedDimensions: result.modifiedDimensions,
    });
  } catch (error) {
    console.error("[Preferences] Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
