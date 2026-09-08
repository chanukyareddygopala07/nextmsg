import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const MAX_DISPLAY_NAME_LENGTH = 100;
const PARTICIPANT_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

async function verifyParticipantOwnership(
  workspaceId: string,
  participantId: string,
  userId: string
) {
  const workspace = await db.conversationWorkspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true },
  });
  if (!workspace) return { error: "Workspace not found", status: 404 as const };
  if (workspace.userId !== userId) return { error: "Access denied", status: 403 as const };

  const participant = await db.workspaceParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, workspaceId: true, isUser: true },
  });
  if (!participant || participant.workspaceId !== workspaceId) {
    return { error: "Participant not found", status: 404 as const };
  }

  return { workspace, participant };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id, participantId } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, PARTICIPANT_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyParticipantOwnership(id, participantId, session.user.id);
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

  if (body.displayName !== undefined) {
    const name = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
    }
    if (name.length > MAX_DISPLAY_NAME_LENGTH) {
      return NextResponse.json({ error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer` }, { status: 400 });
    }
    updates.displayName = name;
  }
  if (body.role !== undefined) {
    updates.role = typeof body.role === "string" ? body.role.trim() : "participant";
  }
  if (body.language !== undefined) {
    updates.language = typeof body.language === "string" ? body.language.trim() || null : null;
  }
  if (body.metadata !== undefined) {
    updates.metadata = body.metadata && typeof body.metadata === "object"
      ? JSON.stringify(body.metadata)
      : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const participant = await db.workspaceParticipant.update({
    where: { id: participantId },
    data: updates,
  });

  return NextResponse.json({
    participant: {
      id: participant.id,
      workspaceId: participant.workspaceId,
      displayName: participant.displayName,
      role: participant.role,
      language: participant.language,
      isUser: participant.isUser,
      metadata: participant.metadata ? JSON.parse(participant.metadata) : null,
      createdAt: participant.createdAt.toISOString(),
      updatedAt: participant.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id, participantId } = await params;
  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, PARTICIPANT_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyParticipantOwnership(id, participantId, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  if (ownership.participant.isUser) {
    return NextResponse.json({ error: "Cannot remove user participant" }, { status: 400 });
  }

  await db.workspaceParticipant.delete({ where: { id: participantId } });

  return NextResponse.json({ success: true });
}
