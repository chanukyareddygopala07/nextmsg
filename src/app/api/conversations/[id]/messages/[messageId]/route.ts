import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = 10000;
const MESSAGE_RATE_LIMIT = { maxRequests: 60, windowMs: 60_000 };

async function verifyMessageOwnership(
  workspaceId: string,
  messageId: string,
  userId: string
) {
  const workspace = await db.conversationWorkspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true },
  });
  if (!workspace) return { error: "Workspace not found", status: 404 as const };
  if (workspace.userId !== userId) return { error: "Access denied", status: 403 as const };

  const message = await db.workspaceMessage.findUnique({
    where: { id: messageId },
    select: { id: true, workspaceId: true },
  });
  if (!message || message.workspaceId !== workspaceId) {
    return { error: "Message not found", status: 404 as const };
  }

  return { workspace, message };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, MESSAGE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyMessageOwnership(id, messageId, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.text !== undefined) {
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Message text cannot be empty" }, { status: 400 });
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 400 });
    }
    updates.text = text;
  }
  if (body.sender !== undefined) {
    updates.sender = typeof body.sender === "string" ? body.sender.trim() : "unknown";
  }
  if (body.participantId !== undefined) {
    updates.participantId = typeof body.participantId === "string" ? body.participantId : null;
  }
  if (body.metadata !== undefined) {
    updates.metadata = body.metadata && typeof body.metadata === "object"
      ? JSON.stringify(body.metadata)
      : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const message = await db.workspaceMessage.update({
    where: { id: messageId },
    data: updates,
  });

  await db.conversationWorkspace.update({
    where: { id },
    data: {
      conversationVersion: { increment: 1 },
      lastActiveAt: new Date(),
    },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      workspaceId: message.workspaceId,
      participantId: message.participantId,
      sender: message.sender,
      text: message.text,
      source: message.source,
      sequence: message.sequence,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, MESSAGE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyMessageOwnership(id, messageId, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  await db.workspaceMessage.delete({ where: { id: messageId } });

  await db.conversationWorkspace.update({
    where: { id },
    data: {
      conversationVersion: { increment: 1 },
      lastActiveAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
