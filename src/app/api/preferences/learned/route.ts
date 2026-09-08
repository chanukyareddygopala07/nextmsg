import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resetLearnedPreferences } from "@/lib/ai/personalization";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const RESET_RATE_LIMIT = { windowMs: 60_000, maxRequests: 5 };

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const clientId = userId;
    const rateLimit = checkRateLimit(`preference:reset:${clientId}`, RESET_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    await resetLearnedPreferences(userId);

    return NextResponse.json({
      success: true,
      message: "Learned preferences have been reset",
    });
  } catch (error) {
    console.error("[Preferences] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to reset preferences" },
      { status: 500 }
    );
  }
}
