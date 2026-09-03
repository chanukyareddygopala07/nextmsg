import { NextResponse } from "next/server";
import { parseConversationText, detectPlatform } from "@/lib/parser/conversation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const platform = detectPlatform(text);
    const parsed = parseConversationText(text, platform);

    return NextResponse.json({
      platform: parsed.platform,
      messages: parsed.messages,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse conversation" },
      { status: 500 }
    );
  }
}
