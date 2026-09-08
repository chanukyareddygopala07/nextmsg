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
    const rateLimit = checkRateLimit(`feedback:${clientId}`, FEEDBACK_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { replyId, signal, strategy, context } = body;

    if (!signal || !VALID_SIGNALS.has(signal)) {
      return NextResponse.json(
        { error: "Invalid signal" },
        { status: 400 }
      );
    }

    const result = await recordFeedback(userId, {
      signal: signal as FeedbackSignal,
      replyId,
      strategy,
      context,
    });

    return NextResponse.json({
      success: true,
      updated: result.updated,
    });
  } catch (error) {
    console.error("[Feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
