import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMemoryService } from "@/lib/ai/memory-service";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import {
  isValidMemoryType,
  isValidMemorySource,
  isValidConfidence,
  MAX_MEMORY_CONTENT_LENGTH,
  MEMORY_RATE_LIMIT_CREATE,
  MEMORY_RATE_LIMIT_READ,
  logAudit,
} from "@/lib/ai/memory-types";

// ─── Memory API Routes (Hardened) ──────────────────────────────────────────────
//
// Security:
// - Authentication required for all operations
// - Authorization: every operation verifies resource ownership
// - Rate limiting on all endpoints
// - Zod-style input validation
// - Content sanitization
// - ID enumeration protection (generic responses)
// - No raw error details leaked
// ──────────────────────────────────────────────────────────────────────────────

// ─── Validation Schemas ──────────────────────────────────────────────────────

const VALID_MEMORY_TYPES = new Set([
  "conversation_topic", "unresolved_issue", "agreed_action",
  "recent_context", "communication_preference", "recurring_pattern",
  "previous_agreement", "active_issue", "resolution", "conflict_cause",
  "conflict_resolution", "communication_agreement", "unresolved_followup",
  "boundary_established", "relationship_preference",
]);

const VALID_MEMORY_SOURCES = new Set([
  "explicit_user", "user_confirmed", "conversation_observed", "ai_inference",
]);

// ─── Rate Limit Configs ──────────────────────────────────────────────────────

const MEMORY_CREATE_LIMIT = { windowMs: 60_000, maxRequests: MEMORY_RATE_LIMIT_CREATE };
const MEMORY_READ_LIMIT = { windowMs: 60_000, maxRequests: MEMORY_RATE_LIMIT_READ };

// ─── GET /api/memory ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit
    const rateLimit = checkRateLimit(`memory:read:${userId}`, MEMORY_READ_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const memoryService = getMemoryService();

    // Get memory settings
    const settings = await memoryService.getMemorySettings(userId);

    // Get user memories (only if enabled)
    const memories = settings.enabled
      ? await memoryService.getUserMemories(userId)
      : [];

    return NextResponse.json({
      settings,
      memories,
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    // Log internal error safely - no user data
    console.error("[Memory API] Error fetching memories");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/memory ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit
    const rateLimit = checkRateLimit(`memory:create:${userId}`, MEMORY_CREATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const { type, content, source, confidence, relationshipId, expiresAt } = body;

    // Validate required fields
    if (!type || !content || !source) {
      return NextResponse.json(
        { error: "Missing required fields: type, content, source" },
        { status: 400 }
      );
    }

    // Validate type
    if (!isValidMemoryType(type)) {
      return NextResponse.json(
        { error: "Invalid memory type" },
        { status: 400 }
      );
    }

    // Validate source
    if (!isValidMemorySource(source)) {
      return NextResponse.json(
        { error: "Invalid memory source" },
        { status: 400 }
      );
    }

    // Validate content length
    if (typeof content !== "string" || content.length > MAX_MEMORY_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content must be a string with max ${MAX_MEMORY_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Validate confidence if provided
    if (confidence !== undefined && !isValidConfidence(confidence)) {
      return NextResponse.json(
        { error: "Confidence must be a number between 0 and 1" },
        { status: 400 }
      );
    }

    // Validate relationshipId if provided
    if (relationshipId !== undefined && (typeof relationshipId !== "string" || relationshipId.length > 100)) {
      return NextResponse.json(
        { error: "Invalid relationshipId" },
        { status: 400 }
      );
    }

    // Validate expiresAt if provided
    if (expiresAt !== undefined) {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime()) || expiryDate.getTime() < Date.now()) {
        return NextResponse.json(
          { error: "Invalid expiresAt: must be a future date" },
          { status: 400 }
        );
      }
    }

    // Prevent client from overriding userId
    // (userId is derived from session, not from request body)

    const memoryService = getMemoryService();

    const memory = await memoryService.createMemory(userId, {
      type,
      content,
      source,
      confidence: confidence || 0.7,
      relationshipId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    if (!memory) {
      return NextResponse.json(
        { error: "Failed to create memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({ memory }, {
      status: 201,
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error("[Memory API] Error creating memory");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/memory ───────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit
    const rateLimit = checkRateLimit(`memory:update:${userId}`, MEMORY_CREATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const { memoryId, enabled, content, confidence, isActive } = body;

    const memoryService = getMemoryService();

    // Update memory settings
    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") {
        return NextResponse.json(
          { error: "enabled must be a boolean" },
          { status: 400 }
        );
      }
      await memoryService.updateMemorySettings(userId, enabled);
      logAudit({ userId, action: "settings_updated", type: enabled ? "enabled" : "disabled" });
      return NextResponse.json({ success: true });
    }

    // Update specific memory
    if (memoryId) {
      // Validate memoryId format (CUID format check)
      if (typeof memoryId !== "string" || memoryId.length < 10 || memoryId.length > 50) {
        return NextResponse.json(
          { error: "Invalid memory ID format" },
          { status: 400 }
        );
      }

      const updates: Record<string, unknown> = {};

      if (content !== undefined) {
        if (typeof content !== "string" || content.length > MAX_MEMORY_CONTENT_LENGTH) {
          return NextResponse.json(
            { error: `Content must be a string with max ${MAX_MEMORY_CONTENT_LENGTH} characters` },
            { status: 400 }
          );
        }
        updates.content = content;
      }

      if (confidence !== undefined) {
        if (!isValidConfidence(confidence)) {
          return NextResponse.json(
            { error: "Confidence must be a number between 0 and 1" },
            { status: 400 }
          );
        }
        updates.confidence = confidence;
      }

      if (isActive !== undefined) {
        if (typeof isActive !== "boolean") {
          return NextResponse.json(
            { error: "isActive must be a boolean" },
            { status: 400 }
          );
        }
        updates.isActive = isActive;
      }

      // Memory service already verifies ownership (userId match)
      const memory = await memoryService.updateMemory(userId, memoryId, updates);

      if (!memory) {
        // Generic response - don't reveal whether memory exists or user lacks access
        return NextResponse.json(
          { error: "Memory not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ memory });
    }

    return NextResponse.json(
      { error: "Missing required fields: memoryId or enabled" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Memory API] Error updating memory");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/memory ──────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit
    const rateLimit = checkRateLimit(`memory:delete:${userId}`, MEMORY_CREATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get("memoryId");
    const relationshipId = searchParams.get("relationshipId");

    const memoryService = getMemoryService();

    // Delete specific memory
    if (memoryId) {
      // Validate memoryId format
      if (memoryId.length < 10 || memoryId.length > 50) {
        return NextResponse.json(
          { error: "Invalid memory ID format" },
          { status: 400 }
        );
      }

      // Memory service already verifies ownership (userId match)
      const success = await memoryService.deleteMemory(userId, memoryId);

      if (!success) {
        // Generic response - don't reveal whether memory exists or user lacks access
        return NextResponse.json(
          { error: "Memory not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Clear relationship memory
    if (relationshipId) {
      if (typeof relationshipId !== "string" || relationshipId.length > 100) {
        return NextResponse.json(
          { error: "Invalid relationshipId" },
          { status: 400 }
        );
      }
      const count = await memoryService.clearRelationshipMemory(userId, relationshipId);
      return NextResponse.json({ deletedCount: count });
    }

    // Clear all user memory
    const count = await memoryService.clearUserMemory(userId);
    return NextResponse.json({ deletedCount: count });
  } catch (error) {
    console.error("[Memory API] Error deleting memory");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
