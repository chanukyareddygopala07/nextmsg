import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const MAX_TITLE_LENGTH = 200;
const WORKSPACE_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

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
  const rateLimit = checkRateLimit(identifier, WORKSPACE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyOwnership(id, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  const workspace = await db.conversationWorkspace.findUnique({
    where: { id },
    include: {
      participants: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { sequence: "asc" } },
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      title: workspace.title,
      platform: workspace.platform,
      goal: workspace.goal,
      language: workspace.language,
      version: workspace.version,
      conversationVersion: workspace.conversationVersion,
      lastActiveAt: workspace.lastActiveAt.toISOString(),
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      participants: workspace.participants.map((p: (typeof workspace.participants)[number]) => ({
        id: p.id,
        workspaceId: p.workspaceId,
        displayName: p.displayName,
        role: p.role,
        language: p.language,
        isUser: p.isUser,
        metadata: p.metadata ? JSON.parse(p.metadata) : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      messages: workspace.messages.map((m: (typeof workspace.messages)[number]) => ({
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
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, WORKSPACE_RATE_LIMIT);
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

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `Title must be 1-${MAX_TITLE_LENGTH} characters` }, { status: 400 });
    }
    updates.title = title;
  }
  if (body.platform !== undefined) {
    updates.platform = typeof body.platform === "string" ? body.platform.trim() || null : null;
  }
  if (body.goal !== undefined) {
    updates.goal = typeof body.goal === "string" ? body.goal.trim() || null : null;
  }
  if (body.language !== undefined) {
    updates.language = typeof body.language === "string" ? body.language.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const workspace = await db.conversationWorkspace.update({
    where: { id },
    data: { ...updates, version: { increment: 1 } },
  });

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      title: workspace.title,
      platform: workspace.platform,
      goal: workspace.goal,
      language: workspace.language,
      version: workspace.version,
      conversationVersion: workspace.conversationVersion,
      lastActiveAt: workspace.lastActiveAt.toISOString(),
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, WORKSPACE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyOwnership(id, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  await db.conversationWorkspace.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
