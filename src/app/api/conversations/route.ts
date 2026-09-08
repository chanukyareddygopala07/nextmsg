import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const MAX_TITLE_LENGTH = 200;
const MAX_GOAL_LENGTH = 100;
const MAX_PLATFORM_LENGTH = 50;
const MAX_LANGUAGE_LENGTH = 50;
const WORKSPACE_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, WORKSPACE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
  const search = searchParams.get("search")?.trim() || undefined;

  const where: Record<string, unknown> = { userId: session.user.id };
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  const workspaces = await db.conversationWorkspace.findMany({
    where,
    orderBy: { lastActiveAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      _count: { select: { messages: true, participants: true } },
    },
  });

  return NextResponse.json({
    workspaces: workspaces.map((w: (typeof workspaces)[number]) => ({
      id: w.id,
      title: w.title,
      platform: w.platform,
      goal: w.goal,
      messageCount: w._count.messages,
      participantCount: w._count.participants,
      lastActiveAt: w.lastActiveAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const identifier = getClientIdentifier(request);
  const rateLimit = checkRateLimit(identifier, WORKSPACE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "Untitled Conversation";
  const platform = typeof body.platform === "string" ? body.platform.trim() : undefined;
  const goal = typeof body.goal === "string" ? body.goal.trim() : undefined;
  const language = typeof body.language === "string" ? body.language.trim() : undefined;

  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (goal && goal.length > MAX_GOAL_LENGTH) {
    return NextResponse.json({ error: `Goal must be ${MAX_GOAL_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (platform && platform.length > MAX_PLATFORM_LENGTH) {
    return NextResponse.json({ error: `Platform must be ${MAX_PLATFORM_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (language && language.length > MAX_LANGUAGE_LENGTH) {
    return NextResponse.json({ error: `Language must be ${MAX_LANGUAGE_LENGTH} characters or fewer` }, { status: 400 });
  }

  const workspace = await db.conversationWorkspace.create({
    data: {
      userId: session.user.id,
      title: title || "Untitled Conversation",
      platform: platform || undefined,
      goal: goal || undefined,
      language: language || undefined,
    },
  });

  return NextResponse.json(
    {
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
    },
    { status: 201 }
  );
}
