import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_PARTICIPANTS = 20;
const PARTICIPANT_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

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
  const rateLimit = checkRateLimit(identifier, PARTICIPANT_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ownership = await verifyOwnership(id, session.user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  const participants = await db.workspaceParticipant.findMany({
    where: { workspaceId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    participants: participants.map((p: (typeof participants)[number]) => ({
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
  const rateLimit = checkRateLimit(identifier, PARTICIPANT_RATE_LIMIT);
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

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "participant";
  const language = typeof body.language === "string" ? body.language.trim() || undefined : undefined;
  const isUser = typeof body.isUser === "boolean" ? body.isUser : false;
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return NextResponse.json({ error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }

  const participantCount = await db.workspaceParticipant.count({ where: { workspaceId: id } });
  if (participantCount >= MAX_PARTICIPANTS) {
    return NextResponse.json({ error: `Maximum ${MAX_PARTICIPANTS} participants per workspace` }, { status: 400 });
  }

  const participant = await db.workspaceParticipant.create({
    data: {
      workspaceId: id,
      displayName,
      role,
      language,
      isUser,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });

  return NextResponse.json(
    {
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
    },
    { status: 201 }
  );
}
