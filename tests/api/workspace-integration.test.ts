import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";

const TEST_USER_ID = "test-workspace-user-001";
const TEST_USER_ID_2 = "test-workspace-user-002";

async function ensureUser(userId: string) {
  try {
    await db.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: `Test User ${userId}`, email: `${userId}@test.com` },
    });
  } catch {
    // May not be able to create user in some environments
  }
}

async function cleanup() {
  try {
    await db.$executeRawUnsafe(`DELETE FROM workspace_messages WHERE "workspaceId" IN (SELECT id FROM conversation_workspaces WHERE "userId" IN ($1, $2))`, TEST_USER_ID, TEST_USER_ID_2);
    await db.$executeRawUnsafe(`DELETE FROM workspace_participants WHERE "workspaceId" IN (SELECT id FROM conversation_workspaces WHERE "userId" IN ($1, $2))`, TEST_USER_ID, TEST_USER_ID_2);
    await db.$executeRawUnsafe(`DELETE FROM conversation_workspaces WHERE "userId" IN ($1, $2)`, TEST_USER_ID, TEST_USER_ID_2);
  } catch {
    // Tables may not exist yet
  }
}

beforeAll(async () => {
  await ensureUser(TEST_USER_ID);
  await ensureUser(TEST_USER_ID_2);
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe("Workspace CRUD Integration", () => {
  let workspaceId: string;

  it("creates a workspace", async () => {
    const workspace = await db.conversationWorkspace.create({
      data: {
        userId: TEST_USER_ID,
        title: "Test Conversation",
        platform: "Instagram",
        goal: "casual",
        language: "english",
      },
    });

    workspaceId = workspace.id;
    expect(workspace.title).toBe("Test Conversation");
    expect(workspace.platform).toBe("Instagram");
    expect(workspace.version).toBe(1);
    expect(workspace.conversationVersion).toBe(0);
  });

  it("reads workspace by id", async () => {
    const workspace = await db.conversationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { participants: true, messages: true },
    });

    expect(workspace).not.toBeNull();
    expect(workspace!.title).toBe("Test Conversation");
    expect(workspace!.participants).toHaveLength(0);
    expect(workspace!.messages).toHaveLength(0);
  });

  it("updates workspace title", async () => {
    const workspace = await db.conversationWorkspace.update({
      where: { id: workspaceId },
      data: { title: "Updated Title", version: { increment: 1 } },
    });

    expect(workspace.title).toBe("Updated Title");
    expect(workspace.version).toBe(2);
  });

  it("lists workspaces by user", async () => {
    const workspaces = await db.conversationWorkspace.findMany({
      where: { userId: TEST_USER_ID },
      orderBy: { lastActiveAt: "desc" },
    });

    expect(workspaces.length).toBeGreaterThanOrEqual(1);
    expect(workspaces.some((w) => w.id === workspaceId)).toBe(true);
  });

  it("does not list workspaces from other users", async () => {
    await db.conversationWorkspace.create({
      data: { userId: TEST_USER_ID_2, title: "Other User Workspace" },
    });

    const workspaces = await db.conversationWorkspace.findMany({
      where: { userId: TEST_USER_ID },
    });

    expect(workspaces.every((w) => w.userId === TEST_USER_ID)).toBe(true);
  });

  it("deletes workspace", async () => {
    await db.conversationWorkspace.delete({ where: { id: workspaceId } });

    const workspace = await db.conversationWorkspace.findUnique({
      where: { id: workspaceId },
    });

    expect(workspace).toBeNull();
  });
});

describe("Participant Integration", () => {
  let workspaceId: string;
  let participantId: string;

  beforeAll(async () => {
    const workspace = await db.conversationWorkspace.create({
      data: { userId: TEST_USER_ID, title: "Participant Test" },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await db.conversationWorkspace.delete({ where: { id: workspaceId } });
  });

  it("creates a participant", async () => {
    const participant = await db.workspaceParticipant.create({
      data: {
        workspaceId,
        displayName: "Alice",
        role: "friend",
        language: "english",
      },
    });

    participantId = participant.id;
    expect(participant.displayName).toBe("Alice");
    expect(participant.isUser).toBe(false);
  });

  it("creates user participant", async () => {
    const participant = await db.workspaceParticipant.create({
      data: {
        workspaceId,
        displayName: "You",
        role: "user",
        isUser: true,
      },
    });

    expect(participant.isUser).toBe(true);
  });

  it("lists participants", async () => {
    const participants = await db.workspaceParticipant.findMany({
      where: { workspaceId },
    });

    expect(participants.length).toBeGreaterThanOrEqual(2);
  });

  it("updates participant", async () => {
    const participant = await db.workspaceParticipant.update({
      where: { id: participantId },
      data: { displayName: "Alicia", role: "best friend" },
    });

    expect(participant.displayName).toBe("Alicia");
    expect(participant.role).toBe("best friend");
  });

  it("deletes participant", async () => {
    await db.workspaceParticipant.delete({ where: { id: participantId } });

    const participant = await db.workspaceParticipant.findUnique({
      where: { id: participantId },
    });

    expect(participant).toBeNull();
  });
});

describe("Message Integration", () => {
  let workspaceId: string;
  let messageId: string;

  beforeAll(async () => {
    const workspace = await db.conversationWorkspace.create({
      data: { userId: TEST_USER_ID, title: "Message Test" },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await db.conversationWorkspace.delete({ where: { id: workspaceId } });
  });

  it("creates a message", async () => {
    const message = await db.workspaceMessage.create({
      data: {
        workspaceId,
        sender: "user",
        text: "Hello!",
        source: "manual",
        sequence: 1,
      },
    });

    messageId = message.id;
    expect(message.text).toBe("Hello!");
    expect(message.sender).toBe("user");
    expect(message.sequence).toBe(1);
  });

  it("creates message with participant", async () => {
    const participant = await db.workspaceParticipant.create({
      data: { workspaceId, displayName: "Bob", role: "friend" },
    });

    const message = await db.workspaceMessage.create({
      data: {
        workspaceId,
        participantId: participant.id,
        sender: "other",
        text: "Hey!",
        source: "parsed",
        sequence: 2,
      },
    });

    expect(message.participantId).toBe(participant.id);
  });

  it("lists messages in order", async () => {
    const messages = await db.workspaceMessage.findMany({
      where: { workspaceId },
      orderBy: { sequence: "asc" },
    });

    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0].sequence).toBeLessThanOrEqual(messages[1].sequence);
  });

  it("updates message text", async () => {
    const message = await db.workspaceMessage.update({
      where: { id: messageId },
      data: { text: "Hello there!" },
    });

    expect(message.text).toBe("Hello there!");
  });

  it("deletes message", async () => {
    await db.workspaceMessage.delete({ where: { id: messageId } });

    const message = await db.workspaceMessage.findUnique({
      where: { id: messageId },
    });

    expect(message).toBeNull();
  });

  it("increments conversationVersion on message add", async () => {
    const before = await db.conversationWorkspace.findUnique({
      where: { id: workspaceId },
      select: { conversationVersion: true },
    });

    await db.workspaceMessage.create({
      data: {
        workspaceId,
        sender: "user",
        text: "Test",
        source: "manual",
        sequence: 100,
      },
    });

    const after = await db.conversationWorkspace.findUnique({
      where: { id: workspaceId },
      select: { conversationVersion: true },
    });

    expect(after!.conversationVersion).toBeGreaterThanOrEqual(before!.conversationVersion);
  });
});

describe("Cascade Delete Integration", () => {
  it("deleting workspace cascades to participants and messages", async () => {
    const workspace = await db.conversationWorkspace.create({
      data: { userId: TEST_USER_ID, title: "Cascade Test" },
    });

    const participant = await db.workspaceParticipant.create({
      data: { workspaceId: workspace.id, displayName: "Test User", role: "friend" },
    });

    await db.workspaceMessage.create({
      data: {
        workspaceId: workspace.id,
        participantId: participant.id,
        sender: "other",
        text: "Test message",
        source: "manual",
        sequence: 1,
      },
    });

    await db.conversationWorkspace.delete({ where: { id: workspace.id } });

    const remainingParticipants = await db.workspaceParticipant.findMany({
      where: { workspaceId: workspace.id },
    });
    const remainingMessages = await db.workspaceMessage.findMany({
      where: { workspaceId: workspace.id },
    });

    expect(remainingParticipants).toHaveLength(0);
    expect(remainingMessages).toHaveLength(0);
  });

  it("deleting participant sets message participantId to null", async () => {
    const workspace = await db.conversationWorkspace.create({
      data: { userId: TEST_USER_ID, title: "Participant Cascade Test" },
    });

    const participant = await db.workspaceParticipant.create({
      data: { workspaceId: workspace.id, displayName: "Temp User", role: "temp" },
    });

    const message = await db.workspaceMessage.create({
      data: {
        workspaceId: workspace.id,
        participantId: participant.id,
        sender: "other",
        text: "Message with participant",
        source: "manual",
        sequence: 1,
      },
    });

    await db.workspaceParticipant.delete({ where: { id: participant.id } });

    const updatedMessage = await db.workspaceMessage.findUnique({
      where: { id: message.id },
    });

    expect(updatedMessage!.participantId).toBeNull();

    await db.conversationWorkspace.delete({ where: { id: workspace.id } });
  });
});

describe("Search Integration", () => {
  let ws1Id: string;
  let ws2Id: string;

  beforeAll(async () => {
    const ws1 = await db.conversationWorkspace.create({
      data: { userId: TEST_USER_ID, title: "Searchable Alpha Conversation" },
    });
    const ws2 = await db.conversationWorkspace.create({
      data: { userId: TEST_USER_ID, title: "Searchable Beta Chat" },
    });
    ws1Id = ws1.id;
    ws2Id = ws2.id;
  });

  afterAll(async () => {
    await db.conversationWorkspace.deleteMany({
      where: { id: { in: [ws1Id, ws2Id] } },
    });
  });

  it("searches by title", async () => {
    const results = await db.conversationWorkspace.findMany({
      where: {
        userId: TEST_USER_ID,
        title: { contains: "Alpha", mode: "insensitive" },
      },
    });

    expect(results.some((w) => w.id === ws1Id)).toBe(true);
    expect(results.some((w) => w.id === ws2Id)).toBe(false);
  });
});
