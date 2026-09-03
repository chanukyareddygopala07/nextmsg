import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { replyId, signal } = body;

    if (!replyId || !signal) {
      return NextResponse.json(
        { error: "replyId and signal are required" },
        { status: 400 }
      );
    }

    console.log("Feedback received:", { replyId, signal });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
