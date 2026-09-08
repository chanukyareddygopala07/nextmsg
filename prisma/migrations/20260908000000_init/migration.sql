-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "texting_profiles" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "messageLength" TEXT NOT NULL DEFAULT 'medium',
    "capitalization" TEXT NOT NULL DEFAULT 'mixed',
    "punctuation" TEXT NOT NULL DEFAULT 'moderate',
    "emojiFrequency" TEXT NOT NULL DEFAULT 'moderate',
    "favoriteEmojis" TEXT[],
    "humor" TEXT NOT NULL DEFAULT 'moderate',
    "flirting" TEXT NOT NULL DEFAULT 'moderate',
    "slang" TEXT NOT NULL DEFAULT 'moderate',
    "abbreviations" TEXT NOT NULL DEFAULT 'moderate',
    "directness" TEXT NOT NULL DEFAULT 'moderate',
    "questionFrequency" TEXT NOT NULL DEFAULT 'moderate',
    "energy" TEXT NOT NULL DEFAULT 'casual',
    "sarcasm" TEXT NOT NULL DEFAULT 'low',
    "useOfLowercase" TEXT NOT NULL DEFAULT 'sometimes',
    "typicalOpenings" TEXT[],
    "typicalClosings" TEXT[],
    "oneLinerTendency" TEXT NOT NULL DEFAULT 'moderate',
    "conversationalEnergy" TEXT NOT NULL DEFAULT 'moderate',
    "onboardingExamples" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "texting_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "platform" TEXT,
    "goal" TEXT,
    "inputType" TEXT NOT NULL DEFAULT 'text',
    "stage" TEXT,
    "engagement" DOUBLE PRECISION,
    "flirting" DOUBLE PRECISION,
    "humor" DOUBLE PRECISION,
    "reciprocity" DOUBLE PRECISION,
    "conversationHealth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_workspaces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Conversation',
    "platform" TEXT,
    "goal" TEXT,
    "language" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "conversationVersion" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_participants" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "language" TEXT,
    "isUser" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_messages" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "participantId" TEXT,
    "sender" TEXT NOT NULL DEFAULT 'unknown',
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "sequence" INTEGER NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_replies" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "isBestMatch" BOOLEAN NOT NULL DEFAULT false,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_feedback" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationshipId" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isUserConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_contexts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "communicationPreferences" TEXT[],
    "recurringIssues" TEXT[],
    "resolvedIssues" TEXT[],
    "activeIssues" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationship_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolution_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationshipId" TEXT,
    "conflictCause" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "communicationPreference" TEXT,
    "unresolvedFollowup" TEXT,
    "boundaryEstablished" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolution_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memoryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source" TEXT NOT NULL DEFAULT 'implicit',
    "context" TEXT,
    "signalCount" INTEGER NOT NULL DEFAULT 1,
    "lastSignalAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "replyId" TEXT,
    "signal" TEXT NOT NULL,
    "context" TEXT,
    "strategy" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personalization_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "learningEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personalization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "texting_profiles_profileId_key" ON "texting_profiles"("profileId");

-- CreateIndex
CREATE INDEX "conversations_profileId_idx" ON "conversations"("profileId");

-- CreateIndex
CREATE INDEX "conversations_profileId_createdAt_idx" ON "conversations"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_ordering_idx" ON "conversation_messages"("conversationId", "ordering");

-- CreateIndex
CREATE INDEX "conversation_workspaces_userId_idx" ON "conversation_workspaces"("userId");

-- CreateIndex
CREATE INDEX "conversation_workspaces_lastActiveAt_idx" ON "conversation_workspaces"("lastActiveAt");

-- CreateIndex
CREATE INDEX "workspace_participants_workspaceId_idx" ON "workspace_participants"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_messages_workspaceId_idx" ON "workspace_messages"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_messages_workspaceId_sequence_idx" ON "workspace_messages"("workspaceId", "sequence");

-- CreateIndex
CREATE INDEX "workspace_messages_participantId_idx" ON "workspace_messages"("participantId");

-- CreateIndex
CREATE INDEX "generated_replies_conversationId_idx" ON "generated_replies"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_memories_userId_idx" ON "conversation_memories"("userId");

-- CreateIndex
CREATE INDEX "conversation_memories_relationshipId_idx" ON "conversation_memories"("relationshipId");

-- CreateIndex
CREATE INDEX "conversation_memories_type_idx" ON "conversation_memories"("type");

-- CreateIndex
CREATE INDEX "conversation_memories_createdAt_idx" ON "conversation_memories"("createdAt");

-- CreateIndex
CREATE INDEX "conversation_memories_isActive_idx" ON "conversation_memories"("isActive");

-- CreateIndex
CREATE INDEX "relationship_contexts_userId_idx" ON "relationship_contexts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "relationship_contexts_userId_relationshipType_key" ON "relationship_contexts"("userId", "relationshipType");

-- CreateIndex
CREATE INDEX "resolution_memories_userId_idx" ON "resolution_memories"("userId");

-- CreateIndex
CREATE INDEX "resolution_memories_relationshipId_idx" ON "resolution_memories"("relationshipId");

-- CreateIndex
CREATE INDEX "resolution_memories_createdAt_idx" ON "resolution_memories"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "memory_settings_userId_key" ON "memory_settings"("userId");

-- CreateIndex
CREATE INDEX "communication_preferences_userId_idx" ON "communication_preferences"("userId");

-- CreateIndex
CREATE INDEX "communication_preferences_dimension_idx" ON "communication_preferences"("dimension");

-- CreateIndex
CREATE UNIQUE INDEX "communication_preferences_userId_dimension_context_key" ON "communication_preferences"("userId", "dimension", "context");

-- CreateIndex
CREATE INDEX "feedback_events_userId_idx" ON "feedback_events"("userId");

-- CreateIndex
CREATE INDEX "feedback_events_signal_idx" ON "feedback_events"("signal");

-- CreateIndex
CREATE INDEX "feedback_events_createdAt_idx" ON "feedback_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "personalization_settings_userId_key" ON "personalization_settings"("userId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "texting_profiles" ADD CONSTRAINT "texting_profiles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_workspaces" ADD CONSTRAINT "conversation_workspaces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_participants" ADD CONSTRAINT "workspace_participants_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "conversation_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "conversation_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "workspace_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_replies" ADD CONSTRAINT "generated_replies_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_feedback" ADD CONSTRAINT "reply_feedback_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "generated_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_memories" ADD CONSTRAINT "conversation_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_contexts" ADD CONSTRAINT "relationship_contexts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_memories" ADD CONSTRAINT "resolution_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_settings" ADD CONSTRAINT "memory_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalization_settings" ADD CONSTRAINT "personalization_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

