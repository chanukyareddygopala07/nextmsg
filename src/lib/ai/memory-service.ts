import { db } from "@/lib/db";
import type {
  MemoryRecord,
  MemoryType,
  MemorySource,
  MemoryConfig,
  MemoryRelevanceQuery,
  RelationshipProfile,
  ResolutionRecord,
  MemoryExtractionCandidate,
} from "./memory-types";
import {
  DEFAULT_MEMORY_CONFIG,
  logMemoryOperation,
  logAudit,
  sanitizeMemoryContent,
  containsPromptInjection,
  containsSystemInstruction,
  containsSensitiveCredentials,
  MAX_MEMORY_CONTENT_LENGTH,
  MAX_MEMORIES_PER_USER,
} from "./memory-types";

// ─── Memory Service ────────────────────────────────────────────────────────────
//
// Handles all memory operations:
// - Create memory
// - Retrieve relevant memory
// - Update memory
// - Delete memory
// - Confirm memory
// - Invalidate memory
// - Clear user memory
//
// Privacy: All operations are scoped to the authenticated user.
// ──────────────────────────────────────────────────────────────────────────────

export class MemoryService {
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  // ─── Create Memory ─────────────────────────────────────────────────────────

  async createMemory(
    userId: string,
    candidate: MemoryExtractionCandidate
  ): Promise<MemoryRecord | null> {
    if (!this.config.enabled) {
      logAudit({ userId, action: "create_disabled", type: candidate.type, source: candidate.source });
      return null;
    }

    // Sanitize content
    const sanitizedContent = sanitizeMemoryContent(candidate.content);
    if (sanitizedContent.length === 0) return null;

    // Reject prompt injection attempts
    if (containsPromptInjection(sanitizedContent)) {
      logAudit({ userId, action: "create_rejected_injection", type: candidate.type, source: candidate.source });
      return null;
    }

    // Reject system instruction attempts
    if (containsSystemInstruction(sanitizedContent)) {
      logAudit({ userId, action: "create_rejected_instruction", type: candidate.type, source: candidate.source });
      return null;
    }

    // Reject sensitive credentials
    if (containsSensitiveCredentials(sanitizedContent)) {
      logAudit({ userId, action: "create_rejected_credentials", type: candidate.type, source: candidate.source });
      return null;
    }

    // Validate confidence range
    const confidence = Math.max(0, Math.min(1, candidate.confidence));

    // Check if memory already exists (deduplication)
    const existing = await this.findSimilarMemory(userId, candidate);
    if (existing) {
      const updated = await this.updateExistingMemory(existing, { ...candidate, content: sanitizedContent, confidence });
      if (updated) {
        logAudit({ userId, action: "create_deduplicated", memoryId: updated.id, type: candidate.type, source: candidate.source, confidence });
      }
      return updated;
    }

    // Check user memory limit
    const userMemoryCount = await db.conversationMemory.count({
      where: { userId, isActive: true },
    });

    if (userMemoryCount >= Math.min(this.config.maxMemoriesPerUser, MAX_MEMORIES_PER_USER)) {
      // Remove oldest low-confidence memory
      await this.removeOldestLowConfidence(userId);
    }

    const memory = await db.conversationMemory.create({
      data: {
        userId,
        relationshipId: candidate.relationshipId,
        type: candidate.type,
        content: sanitizedContent,
        source: candidate.source,
        confidence,
        isUserConfirmed: candidate.source === "user_confirmed",
        isActive: true,
        expiresAt: candidate.expiresAt,
      },
    });

    logMemoryOperation("created", memory.id);
    logAudit({ userId, action: "created", memoryId: memory.id, type: candidate.type, source: candidate.source, confidence });

    return this.mapToMemoryRecord(memory);
  }

  // ─── Retrieve Relevant Memory ──────────────────────────────────────────────

  async retrieveRelevantMemory(
    query: MemoryRelevanceQuery
  ): Promise<MemoryRecord[]> {
    if (!this.config.enabled) return [];

    const now = new Date();

    // Build where clause
    const where: Record<string, unknown> = {
      userId: query.userId,
      isActive: true,
      confidence: { gte: this.config.minConfidenceForRetrieval },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    };

    // Filter by relationship if provided
    if (query.relationshipId) {
      where.relationshipId = query.relationshipId;
    }

    // Filter by type if provided (map topic/situation to memory types)
    if (query.topic || query.situation) {
      const relevantTypes = this.getRelevantMemoryTypes(query.topic, query.situation);
      where.type = { in: relevantTypes };
    }

    // Retrieve memories ordered by confidence and recency
    const memories = await db.conversationMemory.findMany({
      where,
      orderBy: [
        { confidence: "desc" },
        { createdAt: "desc" },
      ],
      take: this.config.maxRetrievalCount,
    });

    logMemoryOperation("retrieved", `${memories.length} memories`, query.userId);

    // Apply confidence decay for old memories
    return memories.map((m) => {
      const record = this.mapToMemoryRecord(m);
      record.confidence = this.applyConfidenceDecay(record);
      return record;
    });
  }

  // ─── Update Memory ─────────────────────────────────────────────────────────

  async updateMemory(
    userId: string,
    memoryId: string,
    updates: Partial<Pick<MemoryRecord, "content" | "confidence" | "isActive">>
  ): Promise<MemoryRecord | null> {
    const memory = await db.conversationMemory.findFirst({
      where: { id: memoryId, userId },
    });

    if (!memory) return null;

    // Sanitize content if provided
    const sanitizedUpdates: Record<string, unknown> = {};
    if (updates.content !== undefined) {
      const sanitized = sanitizeMemoryContent(updates.content);
      if (sanitized.length === 0) return null;
      if (containsPromptInjection(sanitized) || containsSystemInstruction(sanitized) || containsSensitiveCredentials(sanitized)) {
        logAudit({ userId, action: "update_rejected", memoryId, type: memory.type });
        return null;
      }
      sanitizedUpdates.content = sanitized;
    }
    if (updates.confidence !== undefined) {
      sanitizedUpdates.confidence = Math.max(0, Math.min(1, updates.confidence));
    }
    if (updates.isActive !== undefined) {
      sanitizedUpdates.isActive = updates.isActive;
    }

    const updated = await db.conversationMemory.update({
      where: { id: memoryId },
      data: sanitizedUpdates,
    });

    logMemoryOperation("updated", memoryId);
    logAudit({ userId, action: "updated", memoryId, type: memory.type });

    return this.mapToMemoryRecord(updated);
  }

  // ─── Confirm Memory ────────────────────────────────────────────────────────

  async confirmMemory(
    userId: string,
    memoryId: string
  ): Promise<MemoryRecord | null> {
    const memory = await db.conversationMemory.findFirst({
      where: { id: memoryId, userId },
    });

    if (!memory) return null;

    const updated = await db.conversationMemory.update({
      where: { id: memoryId },
      data: {
        isUserConfirmed: true,
        source: "user_confirmed",
        confidence: Math.min(1, memory.confidence + 0.2),
      },
    });

    logMemoryOperation("confirmed", memoryId);
    logAudit({ userId, action: "confirmed", memoryId, type: memory.type, source: "user_confirmed", confidence: updated.confidence });

    return this.mapToMemoryRecord(updated);
  }

  // ─── Delete Memory ─────────────────────────────────────────────────────────

  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    const memory = await db.conversationMemory.findFirst({
      where: { id: memoryId, userId },
    });

    if (!memory) return false;

    await db.conversationMemory.delete({
      where: { id: memoryId },
    });

    logMemoryOperation("deleted", memoryId);
    logAudit({ userId, action: "deleted", memoryId, type: memory.type });

    return true;
  }

  // ─── Clear User Memory ─────────────────────────────────────────────────────

  async clearUserMemory(userId: string): Promise<number> {
    const result = await db.conversationMemory.deleteMany({
      where: { userId },
    });

    logMemoryOperation("cleared", `${result.count} memories`, userId);
    logAudit({ userId, action: "cleared_all" });

    return result.count;
  }

  // ─── Clear Relationship Memory ─────────────────────────────────────────────

  async clearRelationshipMemory(
    userId: string,
    relationshipId: string
  ): Promise<number> {
    const result = await db.conversationMemory.deleteMany({
      where: { userId, relationshipId },
    });

    logMemoryOperation("cleared_relationship", `${result.count} memories`, relationshipId);
    logAudit({ userId, action: "cleared_relationship" });

    return result.count;
  }

  // ─── Get Memory Settings ───────────────────────────────────────────────────

  async getMemorySettings(userId: string): Promise<{ enabled: boolean }> {
    const settings = await db.memorySettings.findUnique({
      where: { userId },
    });

    return { enabled: settings?.memoryEnabled ?? true };
  }

  // ─── Update Memory Settings ────────────────────────────────────────────────

  async updateMemorySettings(
    userId: string,
    enabled: boolean
  ): Promise<void> {
    await db.memorySettings.upsert({
      where: { userId },
      update: { memoryEnabled: enabled },
      create: { userId, memoryEnabled: enabled },
    });

    logMemoryOperation("settings_updated", userId, enabled ? "enabled" : "disabled");
  }

  // ─── Get User Memories ─────────────────────────────────────────────────────

  async getUserMemories(userId: string): Promise<MemoryRecord[]> {
    const memories = await db.conversationMemory.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 100, // Cap to prevent unbounded results
    });

    return memories.map(this.mapToMemoryRecord);
  }

  // ─── Get Relationship Context ──────────────────────────────────────────────

  async getRelationshipContext(
    userId: string,
    relationshipType: string
  ): Promise<RelationshipProfile | null> {
    const context = await db.relationshipContext.findUnique({
      where: {
        userId_relationshipType: { userId, relationshipType },
      },
    });

    if (!context) return null;

    return {
      id: context.id,
      userId: context.userId,
      relationshipType: context.relationshipType,
      communicationPreferences: context.communicationPreferences,
      recurringIssues: context.recurringIssues,
      resolvedIssues: context.resolvedIssues,
      activeIssues: context.activeIssues,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
    };
  }

  // ─── Update Relationship Context ───────────────────────────────────────────

  async updateRelationshipContext(
    userId: string,
    relationshipType: string,
    updates: Partial<Pick<RelationshipProfile, "communicationPreferences" | "recurringIssues" | "resolvedIssues" | "activeIssues">>
  ): Promise<RelationshipProfile> {
    const context = await db.relationshipContext.upsert({
      where: {
        userId_relationshipType: { userId, relationshipType },
      },
      update: updates,
      create: {
        userId,
        relationshipType,
        communicationPreferences: updates.communicationPreferences || [],
        recurringIssues: updates.recurringIssues || [],
        resolvedIssues: updates.resolvedIssues || [],
        activeIssues: updates.activeIssues || [],
      },
    });

    return {
      id: context.id,
      userId: context.userId,
      relationshipType: context.relationshipType,
      communicationPreferences: context.communicationPreferences,
      recurringIssues: context.recurringIssues,
      resolvedIssues: context.resolvedIssues,
      activeIssues: context.activeIssues,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
    };
  }

  // ─── Get Resolution Memory ─────────────────────────────────────────────────

  async getResolutionMemory(
    userId: string,
    relationshipId?: string
  ): Promise<ResolutionRecord[]> {
    const where: Record<string, unknown> = {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (relationshipId) {
      where.relationshipId = relationshipId;
    }

    const resolutions = await db.resolutionMemory.findMany({
      where,
      orderBy: [
        { confidence: "desc" },
        { createdAt: "desc" },
      ],
      take: 5,
    });

    return resolutions.map((r) => ({
      id: r.id,
      userId: r.userId,
      relationshipId: r.relationshipId || undefined,
      conflictCause: r.conflictCause,
      resolution: r.resolution,
      communicationPreference: r.communicationPreference || undefined,
      unresolvedFollowup: r.unresolvedFollowup || undefined,
      boundaryEstablished: r.boundaryEstablished || undefined,
      confidence: r.confidence,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      expiresAt: r.expiresAt || undefined,
    }));
  }

  // ─── Create Resolution Memory ──────────────────────────────────────────────

  async createResolutionMemory(
    userId: string,
    data: {
      relationshipId?: string;
      conflictCause: string;
      resolution: string;
      communicationPreference?: string;
      unresolvedFollowup?: string;
      boundaryEstablished?: string;
      confidence?: number;
    }
  ): Promise<ResolutionRecord> {
    const resolution = await db.resolutionMemory.create({
      data: {
        userId,
        relationshipId: data.relationshipId,
        conflictCause: data.conflictCause,
        resolution: data.resolution,
        communicationPreference: data.communicationPreference,
        unresolvedFollowup: data.unresolvedFollowup,
        boundaryEstablished: data.boundaryEstablished,
        confidence: data.confidence || 0.7,
      },
    });

    logMemoryOperation("resolution_created", resolution.id);

    return {
      id: resolution.id,
      userId: resolution.userId,
      relationshipId: resolution.relationshipId || undefined,
      conflictCause: resolution.conflictCause,
      resolution: resolution.resolution,
      communicationPreference: resolution.communicationPreference || undefined,
      unresolvedFollowup: resolution.unresolvedFollowup || undefined,
      boundaryEstablished: resolution.boundaryEstablished || undefined,
      confidence: resolution.confidence,
      createdAt: resolution.createdAt,
      updatedAt: resolution.updatedAt,
      expiresAt: resolution.expiresAt || undefined,
    };
  }

  // ─── Helper: Find Similar Memory ───────────────────────────────────────────

  private async findSimilarMemory(
    userId: string,
    candidate: MemoryExtractionCandidate
  ): Promise<MemoryRecord | null> {
    // Simple deduplication: check for same type and similar content
    const existing = await db.conversationMemory.findFirst({
      where: {
        userId,
        type: candidate.type,
        isActive: true,
        content: { contains: candidate.content.substring(0, 50) },
      },
      orderBy: { createdAt: "desc" },
    });

    return existing ? this.mapToMemoryRecord(existing) : null;
  }

  // ─── Helper: Update Existing Memory ────────────────────────────────────────

  private async updateExistingMemory(
    existing: MemoryRecord,
    candidate: MemoryExtractionCandidate
  ): Promise<MemoryRecord> {
    // Update confidence if new confidence is higher
    const newConfidence = Math.max(existing.confidence, candidate.confidence);

    const updated = await db.conversationMemory.update({
      where: { id: existing.id },
      data: {
        confidence: newConfidence,
        isUserConfirmed: existing.isUserConfirmed || candidate.source === "user_confirmed",
        updatedAt: new Date(),
      },
    });

    logMemoryOperation("deduplicated", existing.id);

    return this.mapToMemoryRecord(updated);
  }

  // ─── Helper: Remove Oldest Low Confidence ──────────────────────────────────

  private async removeOldestLowConfidence(userId: string): Promise<void> {
    const oldestLowConfidence = await db.conversationMemory.findFirst({
      where: {
        userId,
        isActive: true,
        isUserConfirmed: false,
        confidence: { lt: 0.7 },
      },
      orderBy: { createdAt: "asc" },
    });

    if (oldestLowConfidence) {
      await db.conversationMemory.delete({
        where: { id: oldestLowConfidence.id },
      });
      logMemoryOperation("evicted", oldestLowConfidence.id);
      logAudit({ userId, action: "evicted", memoryId: oldestLowConfidence.id, type: oldestLowConfidence.type });
    }
  }

  // ─── Helper: Get Memory Confidence ─────────────────────────────────────────

  private async getMemoryConfidence(memoryId: string): Promise<number> {
    const memory = await db.conversationMemory.findUnique({
      where: { id: memoryId },
      select: { confidence: true },
    });

    return memory?.confidence || 0.5;
  }

  // ─── Helper: Apply Confidence Decay ────────────────────────────────────────

  /**
   * Apply deterministic confidence decay based on age and source.
   * - ai_inference decays faster (loses 5% per 30 days)
   * - conversation_observed decays moderately (loses 3% per 30 days)
   * - user_confirmed decays slowly (loses 1% per 30 days)
   * - explicit_user does not decay
   */
  private applyConfidenceDecay(memory: MemoryRecord): number {
    const now = new Date();
    const ageInMs = now.getTime() - memory.createdAt.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    let decayRate = 0;

    switch (memory.source) {
      case "ai_inference":
        decayRate = 0.05 / 30; // 5% per 30 days
        break;
      case "conversation_observed":
        decayRate = 0.03 / 30; // 3% per 30 days
        break;
      case "user_confirmed":
        decayRate = 0.01 / 30; // 1% per 30 days
        break;
      case "explicit_user":
        decayRate = 0; // No decay
        break;
    }

    const decay = ageInDays * decayRate;
    const decayedConfidence = Math.max(0.1, memory.confidence - decay);

    return Math.round(decayedConfidence * 100) / 100;
  }

  // ─── Helper: Get Relevant Memory Types ─────────────────────────────────────

  private getRelevantMemoryTypes(topic?: string, situation?: string): MemoryType[] {
    const types: MemoryType[] = [];

    if (topic) {
      if (topic.includes("deadline") || topic.includes("project")) {
        types.push("agreed_action", "previous_agreement", "recurring_pattern");
      }
      if (topic.includes("conflict") || topic.includes("disagreement")) {
        types.push("resolution", "conflict_cause", "conflict_resolution");
      }
    }

    if (situation) {
      if (situation.includes("late") || situation.includes("missed")) {
        types.push("resolution", "unresolved_issue");
      }
      if (situation.includes("argument") || situation.includes("heated")) {
        types.push("resolution", "boundary_established");
      }
    }

    // Default relevant types
    if (types.length === 0) {
      types.push(
        "communication_preference",
        "previous_agreement",
        "recurring_pattern"
      );
    }

    return types;
  }

  // ─── Helper: Map to Memory Record ──────────────────────────────────────────

  private mapToMemoryRecord(memory: {
    id: string;
    userId: string;
    relationshipId: string | null;
    type: string;
    content: string;
    source: string;
    confidence: number;
    isUserConfirmed: boolean;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): MemoryRecord {
    return {
      id: memory.id,
      userId: memory.userId,
      relationshipId: memory.relationshipId || undefined,
      type: memory.type as MemoryType,
      content: memory.content,
      source: memory.source as MemorySource,
      confidence: memory.confidence,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      expiresAt: memory.expiresAt || undefined,
      isUserConfirmed: memory.isUserConfirmed,
      isActive: memory.isActive,
    };
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

let memoryServiceInstance: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService();
  }
  return memoryServiceInstance;
}
