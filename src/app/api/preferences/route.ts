import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPreferenceProfile,
  updatePersonalizationSettings,
  applyDecayToProfile,
  buildCompactProfile,
} from "@/lib/ai/personalization";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const PREFERENCES_RATE_LIMIT = { windowMs: 60_000, maxRequests: 30 };

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const clientId = userId;
    const rateLimit = checkRateLimit(`preference:read:${clientId}`, PREFERENCES_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const profile = await getPreferenceProfile(userId);

    // Apply decay to get fresh confidence values
    const decayedProfile = await applyDecayToProfile(profile);

    // Build compact profile for prompts
    const compact = buildCompactProfile(decayedProfile);

    return NextResponse.json({
      success: true,
      preferences: decayedProfile.preferences,
      settings: decayedProfile.settings,
      compact,
    });
  } catch (error) {
    console.error("[Preferences] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const clientId = userId;
    const rateLimit = checkRateLimit(`preference:update:${clientId}`, PREFERENCES_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { enabled, learningEnabled } = body;

    const settings = await updatePersonalizationSettings(userId, {
      ...(enabled !== undefined && { enabled }),
      ...(learningEnabled !== undefined && { learningEnabled }),
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("[Preferences] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
