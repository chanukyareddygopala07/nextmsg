import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "User",
    email: "user@example.com",
    image: null,
  });
}

export async function PATCH() {
  return NextResponse.json({ success: true });
}
