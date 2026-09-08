import { NextResponse } from "next/server";
import { analyzeStyle, getStyleSummary } from "@/lib/style/analyzer";
import { requireAuth } from "@/lib/api-auth";
import { apiBadRequest, apiInternalError } from "@/lib/api-utils";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { examples } = body;

    if (!examples || !Array.isArray(examples) || examples.length < 3) {
      return apiBadRequest("At least 3 examples are required");
    }

    const profile = await analyzeStyle(examples);
    const summary = getStyleSummary(profile);

    return NextResponse.json({ profile, summary });
  } catch (error) {
    console.error("Style analysis error:", error);
    return apiInternalError();
  }
}

export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  return NextResponse.json({ profile: null, summary: [] });
}
