# NextMsg Phase 1–6 Reconstruction

## Important Historical Note

Phase 1–6 were implemented before Phase 8. Their source code was committed in batches rather than phase-by-phase. There are no original Phase 1–6 Git commits in this repository.

The commit `cee28bd feat: Phase 8 production readiness - Prisma migration, 168 launch-readiness tests, reports` contains all Phase 1–6 source code and tests alongside Phase 8 Step 1 work. This was the result of iterative development across multiple sessions where files were built incrementally in the working directory and committed together.

These reconstructed documentation commits are NOT original historical commits. They are evidence-based reconstructions created to document what each phase contained. The main branch history has not been rewritten.

## Git History Evidence

```
526713d  Initial commit from Create Next App
2cd71ca  feat: complete NEXTMSG MVP with working screenshot extraction and reply generation
7feefc1  fix: remove postinstall script, add vercel.json for deployment
c726d1f  fix: add .npmrc for legacy-peer-deps, update vercel.json install command
cee28bd  feat: Phase 8 production readiness - Prisma migration, 168 launch-readiness tests, reports
733dd24  fix: remove prisma migrate deploy from build command - run post-deploy instead
a397be7  fix: add .vercelignore to exclude local env files from deployment
c8ed5eb  fix: update tests to match vercel.json without prisma migrate deploy (post-deploy)
0c61b83  docs: Phase 8 Step 2 production deployment verification report
3374beb  feat: Phase 8 Step 3 — Production PostgreSQL & full user journey
34477be  feat: complete Phase 8 Step 4 production hardening
```

There are no intermediate original Phase 1–6 commits between `2cd71ca` (MVP) and `cee28bd` (Phase 8 Step 1). The only two intermediate commits (`7feefc1`, `c726d1f`) are deployment fixes.

All Phase 1–6 files were first introduced in `cee28bd` as confirmed by `git log --all --diff-filter=A`.

---

## Phase 1 — Foundation

**Purpose:**
Core application scaffold — Next.js 14 (App Router), TypeScript, Tailwind CSS v4, authentication (Auth.js v5 with GitHub + Google OAuth), PostgreSQL database (Prisma ORM), and a basic AI pipeline for conversation analysis and reply generation.

**Major Functionality:**
- Next.js App Router with (app) and (auth) route groups
- Auth.js v5 with JWT strategy, GitHub + Google OAuth providers
- Prisma schema with core tables (User, Conversation, Message, etc.)
- Conversation text parsing and screenshot extraction (minimax vision model)
- AI reply generation with OpenRouter provider
- Response humanization and quality ranking
- Writing style analysis from past messages
- Landing page, analyze page, settings page
- UI component library (Button, Card, Input, Modal, Toast)
- Basic Vitest test setup

**Representative Files:**
- `src/app/(app)/analyze/page.tsx` — Main analyze interface
- `src/app/(app)/layout.tsx` — App layout with auth
- `src/app/(auth)/login/page.tsx` — Login page
- `src/app/api/replies/generate/route.ts` — Reply generation endpoint
- `src/app/api/analyze/screenshot/route.ts` — Screenshot extraction endpoint
- `src/lib/ai/conversation.ts` — Conversation parsing
- `src/lib/ai/generator.ts` — Reply generation (MVP version, 97 lines)
- `src/lib/ai/humanizer.ts` — Response humanization (MVP version, 96 lines)
- `src/lib/ai/ranker.ts` — Response ranking (MVP version, 104 lines)
- `src/lib/ai/openrouter.ts` — OpenRouter AI provider
- `src/lib/ai/screenshot.ts` — Screenshot extraction
- `src/lib/auth.ts` — Auth.js configuration
- `src/lib/db.ts` — Prisma client
- `src/lib/parser/conversation.ts` — Text conversation parser
- `src/lib/style/analyzer.ts` — Writing style analysis
- `src/types/conversation.ts` — Conversation types
- `src/types/api.ts` — API types
- `src/components/analyze/` — ConversationPreview, GoalSelector, ReplyDisplay, ScreenshotUpload, TextPasteArea
- `src/components/landing/` — Hero, Features, CTA
- `src/components/ui/` — Button, Card, Input, Modal, Toast
- `tests/api/screenshot-extraction.test.ts` — Initial test suite (8 tests)

**Evidence:**
- `git show 2cd71ca --stat` lists all 35 files in the MVP commit
- MVP commit message: "feat: complete NEXTMSG MVP with working screenshot extraction and reply generation"
- 8 passing tests at MVP stage

**Confidence:** 100% — directly verified from Git history

---

## Phase 2 — Conversation Intelligence

**Purpose:**
Deep conversation understanding — resolving conversation state, selecting communication strategies, analyzing conflict dynamics, generating recovery guidance, building persuasion engines, coaching users on next moves, and managing multi-participant workspace state.

**Major Functionality:**
- ConversationState resolution from raw conversation data
- Relationship type detection (manager, employee, professor, friend, etc.)
- Communication strategy selection and ranking
- Conflict analysis with multi-participant intelligence
- Situation recovery for difficult conversations
- Persuasion engine for persuasive communication
- Conversation coaching with actionable next-move guidance
- Workspace state management for multi-message composition
- Participant intelligence and role detection
- State resolver for deterministic state computation
- Situation detector for context classification
- Writing style profile inference

**Representative Files:**
- `src/lib/ai/conversation-state.ts` (150 lines) — ConversationState type definition
- `src/lib/ai/intelligence.ts` (242 lines) — RelationshipType, CommunicationStrategy types
- `src/lib/ai/strategy.ts` (822 lines) — Strategy Engine, produces ranked strategy recommendations
- `src/lib/ai/conflict-analysis.ts` (1083 lines) — Conflict Intelligence, multi-participant conflict structure
- `src/lib/ai/conflict-coach.ts` — Conflict Coaching, de-escalation guidance
- `src/lib/ai/situation-recovery.ts` (906 lines) — Situation Recovery, structured recovery framework
- `src/lib/ai/persuasion.ts` (359 lines) — Persuasion Engine, structured persuasive responses
- `src/lib/ai/conversation-coach.ts` (953 lines) — Conversation Coaching, actionable next-move guidance
- `src/lib/ai/workspace-state.ts` (515 lines) — Client-side workspace state management
- `src/lib/ai/workspace-types.ts` — Workspace type definitions
- `src/lib/ai/context.ts` — ConversationContext type
- `src/lib/ai/state-resolver.ts` — Deterministic state computation
- `src/lib/ai/detector.ts` — Situation detection
- `src/lib/ai/personality.ts` — Writing style profile inference
- `src/components/analyze/ConflictDisplay.tsx` — Conflict visualization
- `src/components/analyze/ConversationCoachDisplay.tsx` — Coaching display
- `src/components/analyze/RecoveryGuidance.tsx` — Recovery guidance display
- `src/components/analyze/SituationDisplay.tsx` — Situation display
- `src/components/analyze/ParticipantDisplay.tsx` — Participant display
- `src/components/analyze/WorkspaceComposer.tsx` — Workspace composition
- `src/components/analyze/WorkspaceConversation.tsx` — Workspace conversation view
- `src/components/analyze/WorkspaceHeader.tsx` — Workspace header
- `src/components/analyze/WorkspaceList.tsx` — Workspace list
- `src/components/analyze/WorkspaceParticipantManager.tsx` — Participant management
- `src/app/api/conversation/coach/route.ts` — Coaching endpoint
- `src/app/api/conversations/[id]/participants/route.ts` — Participants endpoint
- `src/app/api/conversations/[id]/participants/[participantId]/route.ts` — Participant detail
- `src/app/api/conversations/[id]/messages/route.ts` — Messages endpoint
- `src/app/api/conversations/[id]/messages/[messageId]/route.ts` — Message detail
- `tests/api/conflict-analysis.test.ts` — Conflict analysis tests
- `tests/api/conflict-coaching.test.ts` — Conflict coaching tests
- `tests/api/conversation-coach.test.ts` — Conversation coach tests
- `tests/api/situation-recovery.test.ts` — Situation recovery tests
- `tests/api/situation-recovery-ui.test.ts` — Recovery UI tests
- `tests/api/workspace-state.test.ts` — Workspace state tests
- `tests/api/workspace-flows.test.ts` — Workspace flow tests
- `tests/api/workspace-integration.test.ts` — Workspace integration tests
- `tests/api/intelligence.test.ts` — Intelligence tests

**Evidence:**
- All files first added in `cee28bd` (confirmed by `git log --all --diff-filter=A`)
- `PHASE7-STEP5-REPORT.md` traces the generate pipeline through `resolveConversationState()`, `selectStrategies()`, `detectModeFromState()`, confirming these modules were built before Phase 7
- Test files `phase6-step7-cross-layer.test.ts` import from `state-resolver`, `strategy`, `quality-validator`, `conflict-analysis`, `situation-recovery`, `persuasion`, confirming these existed before Phase 6 evaluation
- Source file headers reference "ConversationState" and "Strategy Engine" as established patterns

**Confidence:** HIGH — code comments, test imports, and report evidence align

---

## Phase 3 — Personalization & Memory

**Purpose:**
Learn and apply the user's communication preferences across conversations. Extract and persist conversation memories. Build preference profiles from feedback. Resolve effective preferences with precedence logic.

**Major Functionality:**
- Personalization engine with signal processing, confidence scoring, and decay
- Communication preference dimensions (tone, length, formality, emoji use, etc.)
- Preference resolver with precedence logic and system defaults
- Effective preferences computation
- Memory extraction from conversations (facts, patterns, preferences)
- Memory persistence with Prisma database service
- Memory relevance scoring and retrieval
- Feedback learning from user actions (accept/reject/edit)
- Compact preference profile for prompt injection
- Safety constraints — rejected candidates do not influence learning

**Representative Files:**
- `src/lib/ai/personalization.ts` (557 lines) — Personalization Engine, signal processing, confidence, decay
- `src/lib/ai/personalization-types.ts` (234 lines) — SIGNAL_WEIGHTS, SIGNAL_DIRECTION, DECAY_RATES, DIMENSION_VALUES
- `src/lib/ai/preference-resolver.ts` (232 lines) — Preference resolution with precedence logic
- `src/lib/ai/effective-preferences.ts` (399 lines) — Effective preferences computation
- `src/lib/ai/memory-extractor.ts` (497 lines) — Memory extraction from conversations
- `src/lib/ai/memory-service.ts` (666 lines) — Memory persistence with Prisma
- `src/lib/ai/memory-types.ts` (401 lines) — MemoryRecord, MemoryType, MemorySource, MemoryConfig
- `src/components/analyze/PersonalizationSettings.tsx` — Personalization settings UI
- `src/components/analyze/PreferenceChips.tsx` — Preference display chips
- `src/components/analyze/MemoryList.tsx` — Memory list display
- `src/components/analyze/MemorySettings.tsx` — Memory settings UI
- `src/components/analyze/MemoryTransparency.tsx` — Memory transparency display
- `src/components/analyze/FeedbackWidget.tsx` — Feedback collection widget
- `src/app/api/preferences/route.ts` — Preferences endpoint
- `src/app/api/preferences/feedback/route.ts` — Feedback endpoint
- `src/app/api/preferences/learned/route.ts` — Learned preferences endpoint
- `src/app/api/memory/route.ts` — Memory endpoint
- `tests/api/personalization.test.ts` (956 lines) — Personalization system tests
- `tests/api/memory-extraction.test.ts` (661 lines) — Memory extraction tests
- `tests/api/memory-security.test.ts` (685 lines) — Memory security tests

**Evidence:**
- All files first added in `cee28bd` (confirmed by `git log --all --diff-filter=A`)
- `personalization.ts` header: "Core engine for learning and applying communication preferences. Invariant: Personalization changes preference, NOT truth."
- `phase6-step7-cross-layer.test.ts` imports `inferDimensionsFromReply` from `personalization`, confirming it existed before Phase 6
- `personalization.test.ts` tests SIGNAL_WEIGHTS, DECAY_RATES, confidence updates, safety checks — all matching the personalization-types.ts constants

**Confidence:** HIGH — code comments, test coverage, and report evidence align

---

<!-- Phase 4 section will be added in next commit -->

<!-- Phase 5 section will be added in next commit -->

<!-- Phase 6 section will be added in next commit -->
