import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = 10000;
const MAX_MESSAGES_PER_WORKSPACE = 500;
const MESSAGE_RATE_LIMIT = { maxRequests: 60, windowMs: 60_000 };

async function verifyOwnership(workspaceId: string, userId: string) {
  const workspace = await db.conversationWorkspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true },
  });
  if (!workspace) return { error: "Workspace not found", status: 404 as const };
  if (workspace.userId !== userId) return { error: "Access denied", status: 403 as const };
  return { workspace };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, MESSAGE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyOwnership(id, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  const messages = await db.workspaceMessage.findMany({
    where: { workspaceId: id },
    orderBy: { sequence: "asc" },
  });

  return NextResponse.json({
    messages: messages.map((m: (typeof messages)[number]) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      participantId: m.participantId,
      sender: m.sender,
      text: m.text,
      source: m.source,
      sequence: m.sequence,
      metadata: m.metadata ? JSON.parse(m.metadata) : null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, MESSAGE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyOwnership(id, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const sender = typeof body.sender === "string" ? body.sender.trim() : "unknown";
  const source = typeof body.source === "string" ? body.source : "user";
  const participantId = typeof body.participantId === "string" ? body.participantId : undefined;
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

  if (!text) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!["user", "parsed", "manual", "imported"].includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const messageCount = await db.workspaceMessage.count({ where: { workspaceId: id } });
  if (messageCount >= MAX_MESSAGES_PER_WORKSPACE) {
    return NextResponse.json({ error: `Maximum ${MAX_MESSAGES_PER_WORKSPACE} messages per workspace` }, { status: 400 });
  }

  // Use transaction to make count + create atomic (prevents race condition)
  let message;
  try {
    message = await db.$transaction(async (tx) => {
      // Double-check count inside transaction to handle concurrent requests
      const freshCount = await tx.workspaceMessage.count({ where: { workspaceId: id } });
      if (freshCount >= MAX_MESSAGES_PER_WORKSPACE) {
        throw new Error("MAX_MESSAGES_EXCEEDED");
      }
      return tx.workspaceMessage.create({
        data: {
          workspaceId: id,
          participantId: participantId || undefined,
          sender,
          text,
          source,
          sequence: freshCount + 1,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "MAX_MESSAGES_EXCEEDED") {
      return NextResponse.json({ error: `Maximum ${MAX_MESSAGES_PER_WORKSPACE} messages per workspace` }, { status: 400 });
    }
    throw e;
  }

  await db.conversationWorkspace.update({
    where: { id },
    data: {
      conversationVersion: { increment: 1 },
      lastActiveAt: new Date(),
    },
  });

  return NextResponse.json(
    {
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
    },
    { status: 201 }
  );
}
