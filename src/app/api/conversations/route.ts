import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ conversations: [] });
}

export async function POST() {
  return NextResponse.json({ success: true, id: "new-conversation" });
}
