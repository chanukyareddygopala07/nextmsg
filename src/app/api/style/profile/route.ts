import { NextResponse } from "next/server";
import { analyzeStyle, getStyleSummary } from "@/lib/style/analyzer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examples } = body;

    if (!examples || !Array.isArray(examples) || examples.length < 3) {
      return NextResponse.json(
        { error: "At least 3 examples are required" },
        { status: 400 }
      );
    }

    const profile = await analyzeStyle(examples);
    const summary = getStyleSummary(profile);

    return NextResponse.json({ profile, summary });
  } catch (error) {
    console.error("Style analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze style" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ profile: null, summary: [] });
}
