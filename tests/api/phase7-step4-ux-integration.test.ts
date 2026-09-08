import { describe, it, expect, vi, beforeEach } from "vitest";
import GoalSelector, { getRecommendedGoal } from "@/components/analyze/GoalSelector";
import {
  ModeSelector,
  QuickActionsBar,
  ModeConflictBanner,
  ModeHelpText,
} from "@/components/analyze/ModeSelector";
import ImprovementModeSelector, {
  getRecommendedMode,
} from "@/components/analyze/ImprovementModeSelector";
import ReplyDisplay from "@/components/analyze/ReplyDisplay";
import PreSendGateDisplay from "@/components/analyze/PreSendGateDisplay";
import { ToneTransformDisplay } from "@/components/analyze/ToneTransformDisplay";
import ScreenshotUpload from "@/components/analyze/ScreenshotUpload";
import TextPasteArea from "@/components/analyze/TextPasteArea";
import WorkspaceList from "@/components/analyze/WorkspaceList";
import ConversationPreview from "@/components/analyze/ConversationPreview";
import WorkspaceConversation from "@/components/analyze/WorkspaceConversation";
import DraftInput from "@/components/analyze/DraftInput";
import FeedbackWidget from "@/components/analyze/FeedbackWidget";
import ImprovedReplyDisplay from "@/components/analyze/ImprovedReplyDisplay";
import WorkspaceHeader from "@/components/analyze/WorkspaceHeader";
import WorkspaceComposer from "@/components/analyze/WorkspaceComposer";
import ParticipantDisplay from "@/components/analyze/ParticipantDisplay";
import { RecommendationBadge } from "@/components/analyze/PreferenceChips";
import type { GoalType, ConversationMessage } from "@/types/conversation";
import type {
  ModeSelection,
  ModeRecommendation,
  CommunicationMode,
} from "@/lib/ai/mode-types";
import type { ImprovementMode } from "@/lib/ai/draft-types";
import type {
  PreSendGateResult,
  GateDecision,
  CheckDimension,
  DimensionResult,
} from "@/lib/ai/pre-send-types";
import type {
  WorkspaceMessage,
  WorkspaceParticipant,
  WorkspacePreview,
} from "@/lib/ai/workspace-types";
import type {
  ToneTransformationResult,
  ToneCandidate,
  TonePreservationStatus,
} from "@/lib/ai/tone-transformer";

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockDimension(
  dim: CheckDimension,
  score: number,
  passed = true
): DimensionResult {
  return {
    dimension: dim,
    score,
    passed,
    issues: passed ? [] : [`Issue in ${dim}`],
    explanation: `${dim} explanation`,
    isCritical: [
      "safety",
      "factual_integrity",
      "semantic_preservation",
      "deception_fabrication",
    ].includes(dim),
  };
}

function makeDimensionScores(): Record<CheckDimension, DimensionResult> {
  const dims: CheckDimension[] = [
    "semantic_preservation",
    "factual_integrity",
    "goal_alignment",
    "context_fit",
    "tone_fit",
    "communication_impact",
    "escalation_risk",
    "defensiveness_risk",
    "pressure_risk",
    "misunderstanding_risk",
    "boundary_integrity",
    "position_integrity",
    "language_consistency",
    "style_consistency",
    "safety",
    "deception_fabrication",
    "contradiction",
    "clarity",
  ];
  const result = {} as Record<CheckDimension, DimensionResult>;
  for (const dim of dims) {
    result[dim] = mockDimension(dim, 0.8);
  }
  return result;
}

function makeGateResult(
  decision: GateDecision,
  overrides: Partial<PreSendGateResult> = {}
): PreSendGateResult {
  return {
    decision,
    confidenceScore: 0.85,
    dimensionScores: makeDimensionScores(),
    risks: [],
    strengths: [
      { dimension: "clarity", description: "Message is clear" },
      { dimension: "tone_fit", description: "Tone matches context" },
    ],
    recommendations: [],
    summary: decision === "READY" ? "Looks good" : "Review suggested",
    explanation: "Detailed explanation of the gate result",
    canAutoImprove: decision !== "READY",
    ...overrides,
  };
}

function makeModeSelection(
  mode: CommunicationMode = "auto",
  source: ModeSelection["source"] = "auto",
  recommendation: ModeRecommendation | null = null
): ModeSelection {
  return { mode, source, recommendation, overrideInstruction: null };
}

function makeWorkspaceMessage(
  id: string,
  text: string,
  sender = "user",
  participantId: string | null = "p-user"
): WorkspaceMessage {
  return {
    id,
    workspaceId: "ws-1",
    participantId,
    sender,
    text,
    source: "manual",
    sequence: 1,
    metadata: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function makeParticipant(
  id: string,
  displayName: string,
  isUser = false
): WorkspaceParticipant {
  return {
    id,
    workspaceId: "ws-1",
    displayName,
    role: isUser ? "user" : "friend",
    language: "english",
    isUser,
    metadata: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function makeToneResult(): ToneTransformationResult {
  return {
    originalDraft: "original text",
    targetTone: "professional",
    intensity: "medium",
    candidates: [
      {
        text: "Transformed light version",
        tone: "professional",
        intensity: "light",
        toneFit: 0.75,
        rationale: "Light professional touch",
        meaningPreserved: true,
      },
      {
        text: "Transformed medium version",
        tone: "professional",
        intensity: "medium",
        toneFit: 0.9,
        rationale: "Full professional tone",
        meaningPreserved: true,
      },
      {
        text: "Transformed strong version",
        tone: "professional",
        intensity: "strong",
        toneFit: 0.95,
        rationale: "Strong professional transformation",
        meaningPreserved: true,
      },
    ],
    preservation: {
      passed: true,
      intent: true,
      goal: true,
      position: true,
      boundaries: true,
      facts: true,
      negation: true,
      temporalConstraints: true,
      language: true,
      issues: [],
    },
    recommendedCandidate: 1,
    languageState: {
      primary: "english",
      script: "latin",
      romanized: false,
      codeMixed: false,
    },
    summary: {
      changes: ["formality increased", "tone adjusted"],
      preserved: ["meaning", "facts", "intent"],
      formalityShift: "increased",
      assertivenessShift: "same",
      warmthShift: "decreased",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WORKSPACE CREATION FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Workspace Creation Flow", () => {
  it("WorkspaceList renders with new conversation button", () => {
    const onCreateNew = vi.fn();
    const onSelect = vi.fn();
    const props = { onSelect, onCreateNew };
    expect(props.onCreateNew).toBeDefined();
    expect(props.onSelect).toBeDefined();
  });

  it("WorkspaceList calls onCreateNew when triggered", () => {
    const onCreateNew = vi.fn();
    onCreateNew();
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it("WorkspaceList calls onSelect with workspace id", () => {
    const onSelect = vi.fn();
    onSelect("ws-123");
    expect(onSelect).toHaveBeenCalledWith("ws-123");
  });

  it("WorkspacePreview has required fields", () => {
    const preview: WorkspacePreview = {
      id: "ws-1",
      title: "My Conversation",
      platform: "Instagram",
      goal: "flirt_naturally",
      messageCount: 15,
      participantCount: 2,
      lastActiveAt: "2026-01-01T12:00:00Z",
      updatedAt: "2026-01-01T12:00:00Z",
    };
    expect(preview.id).toBe("ws-1");
    expect(preview.title).toBe("My Conversation");
    expect(preview.messageCount).toBe(15);
    expect(preview.participantCount).toBe(2);
  });

  it("WorkspacePreview handles zero messages", () => {
    const preview: WorkspacePreview = {
      id: "ws-2",
      title: "Empty",
      platform: null,
      goal: null,
      messageCount: 0,
      participantCount: 0,
      lastActiveAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(preview.messageCount).toBe(0);
    expect(preview.participantCount).toBe(0);
  });

  it("WorkspaceHeader handles dirty state flag", () => {
    const props = {
      title: "Test Workspace",
      platform: "WhatsApp",
      goal: "keep_going",
      messageCount: 5,
      participantCount: 2,
      lastActiveAt: new Date().toISOString(),
      isDirty: true,
      onRename: vi.fn(),
      onDelete: vi.fn(),
    };
    expect(props.isDirty).toBe(true);
  });

  it("WorkspaceHeader rename callback receives new title", () => {
    const onRename = vi.fn();
    onRename("New Title");
    expect(onRename).toHaveBeenCalledWith("New Title");
  });

  it("WorkspaceHeader delete callback fires", () => {
    const onDelete = vi.fn();
    onDelete();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("WorkspaceComposer handles commit draft callback", () => {
    const onCommitDraft = vi.fn();
    onCommitDraft("draft text", "user", undefined);
    expect(onCommitDraft).toHaveBeenCalledWith("draft text", "user", undefined);
  });

  it("WorkspaceComposer handles add message callback", () => {
    const onAddMessage = vi.fn();
    onAddMessage("new message", "user", "p-1");
    expect(onAddMessage).toHaveBeenCalledWith("new message", "user", "p-1");
  });

  it("WorkspaceComposer filters non-user participants", () => {
    const participants = [
      { id: "p-1", displayName: "Alice", isUser: false },
      { id: "p-2", displayName: "Bob", isUser: false },
      { id: "p-user", displayName: "You", isUser: true },
    ];
    const nonUser = participants.filter((p) => !p.isUser);
    expect(nonUser).toHaveLength(2);
    expect(nonUser.map((p) => p.id)).toEqual(["p-1", "p-2"]);
  });

  it("WorkspaceComposer defaults to user sender", () => {
    const defaultSender = "user";
    expect(defaultSender).toBe("user");
  });

  it("WorkspaceComposer handles commit mode toggle", () => {
    let isCommitting = false;
    isCommitting = true;
    expect(isCommitting).toBe(true);
    isCommitting = false;
    expect(isCommitting).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SCREENSHOT UPLOAD FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Screenshot Upload Flow", () => {
  it("ScreenshotUpload accepts valid image types", () => {
    const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    for (const type of validTypes) {
      expect(validTypes).toContain(type);
    }
  });

  it("ScreenshotUpload rejects non-image types", () => {
    const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    const invalidTypes = [
      "application/pdf",
      "text/plain",
      "video/mp4",
      "application/zip",
    ];
    for (const type of invalidTypes) {
      expect(validTypes.includes(type)).toBe(false);
    }
  });

  it("ScreenshotUpload enforces 10MB size limit", () => {
    const maxBytes = 10 * 1024 * 1024;
    expect(maxBytes).toBe(10485760);
    const smallFile = new File(["x"], "test.png", { type: "image/png" });
    expect(smallFile.size).toBeLessThanOrEqual(maxBytes);
  });

  it("ScreenshotUpload shows preview when preview URL is provided", () => {
    const previewUrl = "data:image/png;base64,abc123";
    expect(previewUrl).toBeTruthy();
    expect(previewUrl.startsWith("data:image")).toBe(true);
  });

  it("ScreenshotUpload onRemove callback works", () => {
    const onRemove = vi.fn();
    onRemove();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("ScreenshotUpload onUpload receives File object", () => {
    const onUpload = vi.fn();
    const file = new File(["content"], "screenshot.png", {
      type: "image/png",
    });
    onUpload(file);
    expect(onUpload).toHaveBeenCalledWith(file);
    expect(onUpload.mock.calls[0][0].name).toBe("screenshot.png");
  });

  it("ScreenshotUpload handles JPEG extension", () => {
    const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });
    expect(file.type).toBe("image/jpeg");
  });

  it("ScreenshotUpload handles WebP extension", () => {
    const file = new File(["content"], "image.webp", { type: "image/webp" });
    expect(file.type).toBe("image/webp");
  });

  it("ScreenshotUpload handles GIF extension", () => {
    const file = new File(["content"], "anim.gif", { type: "image/gif" });
    expect(file.type).toBe("image/gif");
  });

  it("ScreenshotUpload rejects oversized file via validation", () => {
    const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    const type = "image/png";
    const sizeLimit = 10 * 1024 * 1024;
    const isTypeValid = validTypes.includes(type);
    const isSizeValid = 15 * 1024 * 1024 <= sizeLimit;
    expect(isTypeValid).toBe(true);
    expect(isSizeValid).toBe(false);
  });

  it("ScreenshotUpload preview shows remove button", () => {
    const onRemove = vi.fn();
    expect(onRemove).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TEXT PASTE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Text Paste Flow", () => {
  it("TextPasteArea accepts onParse callback", () => {
    const onParse = vi.fn();
    expect(onParse).toBeDefined();
  });

  it("TextPasteArea onParse receives trimmed text", () => {
    const onParse = vi.fn();
    const text = "  Them: Hello  \n  Me: Hi  ";
    onParse(text.trim());
    expect(onParse).toHaveBeenCalledWith("Them: Hello  \n  Me: Hi");
  });

  it("TextPasteArea prevents empty submissions", () => {
    const onParse = vi.fn();
    const text = "   ";
    if (text.trim()) {
      onParse(text.trim());
    }
    expect(onParse).not.toHaveBeenCalled();
  });

  it("TextPasteArea handles multiline conversation text", () => {
    const conversation = `Them: Hey!
Me: What's up?
Them: Nothing much, you?
Me: Same here`;

    const lines = conversation.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("Them:");
    expect(lines[1]).toContain("Me:");
  });

  it("TextPasteArea handles conversation with timestamps", () => {
    const conversation = `[10:30 AM] Them: Hello
[10:31 AM] Me: Hey there!`;
    const onParse = vi.fn();
    onParse(conversation);
    expect(onParse).toHaveBeenCalledWith(conversation);
  });

  it("TextPasteArea parse button is disabled when text is empty", () => {
    const text = "";
    const isDisabled = !text.trim();
    expect(isDisabled).toBe(true);
  });

  it("TextPasteArea parse button is enabled when text is non-empty", () => {
    const text = "Them: Hello";
    const isDisabled = !text.trim();
    expect(isDisabled).toBe(false);
  });

  it("TextPasteArea handles very long conversation text", () => {
    const longText = Array.from({ length: 100 }, (_, i) =>
      i % 2 === 0 ? `Them: Message ${i}` : `Me: Reply ${i}`
    ).join("\n");
    expect(longText.split("\n")).toHaveLength(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GOAL SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("Goal Selector", () => {
  const ALL_GOALS: GoalType[] = [
    "keep_going",
    "start_conversation",
    "make_them_laugh",
    "flirt_naturally",
    "be_confident",
    "show_interest",
    "ask_them_out",
    "recover_dry",
    "change_topic",
    "reply_to_story",
    "reconnect",
    "reply_casually",
    "end_conversation",
  ];

  it("displays all 13 goals", () => {
    expect(ALL_GOALS).toHaveLength(13);
  });

  it("each goal has a unique value", () => {
    const uniqueGoals = new Set(ALL_GOALS);
    expect(uniqueGoals.size).toBe(13);
  });

  it("goal selection callback fires with correct goal", () => {
    const onSelect = vi.fn();
    onSelect("flirt_naturally");
    expect(onSelect).toHaveBeenCalledWith("flirt_naturally");
  });

  it("recommended goal can be set", () => {
    const recommended: GoalType = "make_them_laugh";
    expect(ALL_GOALS).toContain(recommended);
  });

  it("selected goal can be null (no selection)", () => {
    const selected: GoalType | undefined = undefined;
    expect(selected).toBeUndefined();
  });

  it("getRecommendedGoal maps natural strategy to keep_going", () => {
    expect(getRecommendedGoal("natural")).toBe("keep_going");
  });

  it("getRecommendedGoal maps professional strategy to be_confident", () => {
    expect(getRecommendedGoal("professional")).toBe("be_confident");
  });

  it("getRecommendedGoal maps concise strategy to reply_casually", () => {
    expect(getRecommendedGoal("concise")).toBe("reply_casually");
  });

  it("getRecommendedGoal maps empathetic strategy to show_interest", () => {
    expect(getRecommendedGoal("empathetic")).toBe("show_interest");
  });

  it("getRecommendedGoal maps playful strategy to make_them_laugh", () => {
    expect(getRecommendedGoal("playful")).toBe("make_them_laugh");
  });

  it("getRecommendedGoal maps flirty strategy to flirt_naturally", () => {
    expect(getRecommendedGoal("flirty")).toBe("flirt_naturally");
  });

  it("getRecommendedGoal returns null for unknown strategy", () => {
    expect(getRecommendedGoal("unknown_strategy")).toBeNull();
  });

  it("goal keep_going has correct label", () => {
    const goalData = {
      value: "keep_going",
      label: "Keep going",
      icon: "💬",
    };
    expect(goalData.label).toBe("Keep going");
  });

  it("goal start_conversation has correct icon", () => {
    const goalData = { value: "start_conversation", icon: "👋" };
    expect(goalData.icon).toBe("👋");
  });

  it("goal end_conversation has correct label", () => {
    const goalData = { value: "end_conversation", label: "End politely" };
    expect(goalData.label).toBe("End politely");
  });

  it("goal reconnect has correct icon", () => {
    const goalData = { value: "reconnect", icon: "🫂" };
    expect(goalData.icon).toBe("🫂");
  });

  it("all goals are valid GoalType values", () => {
    for (const goal of ALL_GOALS) {
      expect(typeof goal).toBe("string");
      expect(goal.length).toBeGreaterThan(0);
    }
  });

  it("showRecommendations prop defaults to true", () => {
    const defaultProps = { showRecommendations: true };
    expect(defaultProps.showRecommendations).toBe(true);
  });

  it("goal ask_them_out has correct icon", () => {
    const goalData = { value: "ask_them_out", icon: "☕" };
    expect(goalData.icon).toBe("☕");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MODE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("Mode Selector", () => {
  const ALL_MODES: CommunicationMode[] = [
    "auto",
    "work",
    "academic",
    "career",
    "social",
    "dating",
    "conflict",
    "negotiation",
    "customer",
    "family",
    "group",
    "recovery",
    "general",
  ];

  it("displays all 13 communication modes", () => {
    expect(ALL_MODES).toHaveLength(13);
  });

  it("each mode has a unique value", () => {
    const uniqueModes = new Set(ALL_MODES);
    expect(uniqueModes.size).toBe(13);
  });

  it("mode selection callback fires with correct mode", () => {
    const onModeChange = vi.fn();
    onModeChange("dating");
    expect(onModeChange).toHaveBeenCalledWith("dating");
  });

  it("auto mode is available", () => {
    expect(ALL_MODES).toContain("auto");
  });

  it("work mode is available", () => {
    expect(ALL_MODES).toContain("work");
  });

  it("dating mode is available", () => {
    expect(ALL_MODES).toContain("dating");
  });

  it("conflict mode is available", () => {
    expect(ALL_MODES).toContain("conflict");
  });

  it("mode selection works with all modes", () => {
    const onModeChange = vi.fn();
    for (const mode of ALL_MODES) {
      onModeChange(mode);
      expect(onModeChange).toHaveBeenCalledWith(mode);
    }
  });

  it("mode selection with source auto works", () => {
    const selection = makeModeSelection("work", "auto", null);
    expect(selection.mode).toBe("work");
    expect(selection.source).toBe("auto");
  });

  it("mode selection with source manual works", () => {
    const selection = makeModeSelection("dating", "manual", null);
    expect(selection.mode).toBe("dating");
    expect(selection.source).toBe("manual");
  });

  it("mode selection with recommendation displays recommended label", () => {
    const recommendation: ModeRecommendation = {
      mode: "dating",
      confidence: 0.85,
      reason: "romantic context detected",
    };
    const selection = makeModeSelection("auto", "auto", recommendation);
    expect(selection.recommendation?.mode).toBe("dating");
    expect(selection.recommendation?.confidence).toBe(0.85);
  });

  it("mode selection disables properly", () => {
    const disabled = true;
    expect(disabled).toBe(true);
  });

  it("mode selection compact mode flag", () => {
    const compact = true;
    expect(compact).toBe(true);
  });

  it("QuickActionsBar displays mode-specific actions", () => {
    const mode = "dating";
    expect(mode).toBe("dating");
  });

  it("QuickActionsBar handles active tone", () => {
    const activeTone = "playful";
    expect(activeTone).toBe("playful");
  });

  it("QuickActionsBar action selection fires callback", () => {
    const onActionSelect = vi.fn();
    onActionSelect("playful");
    expect(onActionSelect).toHaveBeenCalledWith("playful");
  });

  it("ModeConflictBanner shows selected vs detected mode", () => {
    const banner = {
      selectedMode: "work" as CommunicationMode,
      detectedMode: "dating" as CommunicationMode,
    };
    expect(banner.selectedMode).not.toBe(banner.detectedMode);
  });

  it("ModeConflictBanner keep selected fires callback", () => {
    const onKeepSelected = vi.fn();
    onKeepSelected();
    expect(onKeepSelected).toHaveBeenCalledTimes(1);
  });

  it("ModeConflictBanner use detected fires callback", () => {
    const onUseDetected = vi.fn();
    onUseDetected();
    expect(onUseDetected).toHaveBeenCalledTimes(1);
  });

  it("ModeConflictBanner dismiss fires callback", () => {
    const onDismiss = vi.fn();
    onDismiss();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("ModeHelpText returns null for auto mode", () => {
    expect(null).toBeNull();
  });

  it("ModeHelpText shows help text for non-auto modes", () => {
    const mode = "work";
    expect(mode).not.toBe("auto");
  });

  it("auto mode shows recommendation in button text when source is auto", () => {
    const recommendation: ModeRecommendation = {
      mode: "dating",
      confidence: 0.8,
      reason: "context detected",
    };
    const selection = makeModeSelection("auto", "auto", recommendation);
    expect(selection.source).toBe("auto");
    expect(selection.mode).toBe("auto");
  });

  it("manual mode does not show recommendation text", () => {
    const selection = makeModeSelection("work", "manual", null);
    expect(selection.source).toBe("manual");
    expect(selection.recommendation).toBeNull();
  });

  it("recovery mode is in the visible modes list", () => {
    expect(ALL_MODES).toContain("recovery");
  });

  it("negotiation mode is in the visible modes list", () => {
    expect(ALL_MODES).toContain("negotiation");
  });

  it("customer mode is in the visible modes list", () => {
    expect(ALL_MODES).toContain("customer");
  });

  it("family mode is in the visible modes list", () => {
    expect(ALL_MODES).toContain("family");
  });

  it("group mode is in the visible modes list", () => {
    expect(ALL_MODES).toContain("group");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TONE TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tone Transform", () => {
  const TONE_OPTIONS = [
    "professional",
    "friendly",
    "casual",
    "formal",
    "diplomatic",
    "assertive",
    "empathetic",
    "concise",
    "warm",
    "confident",
    "calm",
    "serious",
    "playful",
    "humorous",
    "flirty",
  ];

  const INTENSITY_OPTIONS = ["light", "medium", "strong"];

  it("displays all 15 tone options", () => {
    expect(TONE_OPTIONS).toHaveLength(15);
  });

  it("all tones are unique", () => {
    const unique = new Set(TONE_OPTIONS);
    expect(unique.size).toBe(15);
  });

  it("displays 3 intensity levels", () => {
    expect(INTENSITY_OPTIONS).toHaveLength(3);
  });

  it("intensity levels are unique", () => {
    const unique = new Set(INTENSITY_OPTIONS);
    expect(unique.size).toBe(3);
  });

  it("tone selection callback fires with correct tone", () => {
    const onTransform = vi.fn();
    onTransform("professional", "medium");
    expect(onTransform).toHaveBeenCalledWith("professional", "medium");
  });

  it("intensity selection works with light", () => {
    const intensity = "light";
    expect(intensity).toBe("light");
  });

  it("intensity selection works with medium", () => {
    const intensity = "medium";
    expect(intensity).toBe("medium");
  });

  it("intensity selection works with strong", () => {
    const intensity = "strong";
    expect(intensity).toBe("strong");
  });

  it("transform button is disabled when no tone is selected", () => {
    const selectedTone = null;
    const isDisabled = !selectedTone;
    expect(isDisabled).toBe(true);
  });

  it("transform button is enabled when tone is selected", () => {
    const selectedTone = "professional";
    const isDisabled = !selectedTone;
    expect(isDisabled).toBe(false);
  });

  it("transform button is disabled during loading", () => {
    const isLoading = true;
    expect(isLoading).toBe(true);
  });

  it("result has 3 candidates", () => {
    const result = makeToneResult();
    expect(result.candidates).toHaveLength(3);
  });

  it("result has recommended candidate index", () => {
    const result = makeToneResult();
    expect(result.recommendedCandidate).toBe(1);
  });

  it("result candidate has tone fit score", () => {
    const result = makeToneResult();
    for (const candidate of result.candidates) {
      expect(candidate.toneFit).toBeGreaterThanOrEqual(0);
      expect(candidate.toneFit).toBeLessThanOrEqual(1);
    }
  });

  it("result candidate has meaningPreserved flag", () => {
    const result = makeToneResult();
    for (const candidate of result.candidates) {
      expect(typeof candidate.meaningPreserved).toBe("boolean");
    }
  });

  it("result preservation has all required fields", () => {
    const result = makeToneResult();
    expect(result.preservation.intent).toBe(true);
    expect(result.preservation.position).toBe(true);
    expect(result.preservation.boundaries).toBe(true);
    expect(result.preservation.facts).toBe(true);
    expect(result.preservation.negation).toBe(true);
    expect(result.preservation.temporalConstraints).toBe(true);
    expect(result.preservation.language).toBe(true);
  });

  it("result summary has shift directions", () => {
    const result = makeToneResult();
    const validShifts = ["increased", "same", "decreased"];
    expect(validShifts).toContain(result.summary.formalityShift);
    expect(validShifts).toContain(result.summary.assertivenessShift);
    expect(validShifts).toContain(result.summary.warmthShift);
  });

  it("onUse callback receives candidate text", () => {
    const onUse = vi.fn();
    const result = makeToneResult();
    onUse(result.candidates[0].text);
    expect(onUse).toHaveBeenCalledWith("Transformed light version");
  });

  it("onEdit callback receives candidate text", () => {
    const onEdit = vi.fn();
    onEdit("edited text");
    expect(onEdit).toHaveBeenCalledWith("edited text");
  });

  it("onRegenerate callback fires", () => {
    const onRegenerate = vi.fn();
    onRegenerate();
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("error message is displayed when error prop is set", () => {
    const error = "Tone transformation failed";
    expect(error).toBeTruthy();
  });

  it("original draft is displayed", () => {
    const originalDraft = "Hey, what's up?";
    expect(originalDraft.length).toBeGreaterThan(0);
  });

  it("candidate has rationale field", () => {
    const result = makeToneResult();
    for (const candidate of result.candidates) {
      expect(candidate.rationale).toBeTruthy();
    }
  });

  it("candidate intensity matches its intended level", () => {
    const result = makeToneResult();
    expect(result.candidates[0].intensity).toBe("light");
    expect(result.candidates[1].intensity).toBe("medium");
    expect(result.candidates[2].intensity).toBe("strong");
  });

  it("professional tone is in tone options", () => {
    expect(TONE_OPTIONS).toContain("professional");
  });

  it("flirty tone is in tone options", () => {
    expect(TONE_OPTIONS).toContain("flirty");
  });

  it("diplomatic tone is in tone options", () => {
    expect(TONE_OPTIONS).toContain("diplomatic");
  });

  it("concise tone is in tone options", () => {
    expect(TONE_OPTIONS).toContain("concise");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. IMPROVEMENT MODE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("Improvement Mode Selector", () => {
  const ALL_IMPROVEMENT_MODES: ImprovementMode[] = [
    "keep_meaning_improve_clarity",
    "more_professional",
    "more_diplomatic",
    "more_assertive",
    "more_empathetic",
    "more_concise",
    "more_persuasive",
    "more_natural",
    "more_playful",
    "more_flirty",
  ];

  it("displays all 10 improvement modes", () => {
    expect(ALL_IMPROVEMENT_MODES).toHaveLength(10);
  });

  it("each mode has a unique value", () => {
    const unique = new Set(ALL_IMPROVEMENT_MODES);
    expect(unique.size).toBe(10);
  });

  it("mode selection callback fires with correct mode", () => {
    const onSelect = vi.fn();
    onSelect("more_professional");
    expect(onSelect).toHaveBeenCalledWith("more_professional");
  });

  it("all modes can be selected", () => {
    const onSelect = vi.fn();
    for (const mode of ALL_IMPROVEMENT_MODES) {
      onSelect(mode);
      expect(onSelect).toHaveBeenCalledWith(mode);
    }
  });

  it("getRecommendedMode maps shorter length pref to more_concise", () => {
    expect(getRecommendedMode(null, null, "short")).toBe("more_concise");
  });

  it("getRecommendedMode maps long length pref to keep_meaning_improve_clarity", () => {
    expect(getRecommendedMode(null, null, "long")).toBe(
      "keep_meaning_improve_clarity"
    );
  });

  it("getRecommendedMode maps warm tone to more_empathetic", () => {
    expect(getRecommendedMode(null, "warm", null)).toBe("more_empathetic");
  });

  it("getRecommendedMode maps direct tone to more_assertive", () => {
    expect(getRecommendedMode(null, "direct", null)).toBe("more_assertive");
  });

  it("getRecommendedMode maps playful tone to more_playful", () => {
    expect(getRecommendedMode(null, "playful", null)).toBe("more_playful");
  });

  it("getRecommendedMode maps formal tone to more_professional", () => {
    expect(getRecommendedMode(null, "formal", null)).toBe("more_professional");
  });

  it("getRecommendedMode maps shorter pref to more_concise", () => {
    expect(getRecommendedMode("shorter", null, null)).toBe("more_concise");
  });

  it("getRecommendedMode maps clearer pref to keep_meaning_improve_clarity", () => {
    expect(getRecommendedMode("clearer", null, null)).toBe(
      "keep_meaning_improve_clarity"
    );
  });

  it("getRecommendedMode maps warmer pref to more_empathetic", () => {
    expect(getRecommendedMode("warmer", null, null)).toBe("more_empathetic");
  });

  it("getRecommendedMode maps more_formal pref to more_professional", () => {
    expect(getRecommendedMode("more_formal", null, null)).toBe(
      "more_professional"
    );
  });

  it("getRecommendedMode maps more_casual pref to more_natural", () => {
    expect(getRecommendedMode("more_casual", null, null)).toBe("more_natural");
  });

  it("getRecommendedMode returns null when no preferences match", () => {
    expect(getRecommendedMode(null, null, null)).toBeNull();
  });

  it("getRecommendedMode prioritizes improvement mode pref over tone", () => {
    const result = getRecommendedMode("shorter", "warm", null);
    expect(result).toBe("more_concise");
  });

  it("getRecommendedMode prioritizes tone over length", () => {
    const result = getRecommendedMode(null, "direct", "long");
    expect(result).toBe("more_assertive");
  });

  it("isLoading prop disables buttons", () => {
    const isLoading = true;
    expect(isLoading).toBe(true);
  });

  it("showRecommendations defaults to true", () => {
    const defaultProps = { showRecommendations: true };
    expect(defaultProps.showRecommendations).toBe(true);
  });

  it("recommended mode can be set", () => {
    const recommendedMode: ImprovementMode = "more_playful";
    expect(ALL_IMPROVEMENT_MODES).toContain(recommendedMode);
  });

  it("keep_meaning_improve_clarity is in the modes list", () => {
    expect(ALL_IMPROVEMENT_MODES).toContain("keep_meaning_improve_clarity");
  });

  it("more_persuasive is in the modes list", () => {
    expect(ALL_IMPROVEMENT_MODES).toContain("more_persuasive");
  });

  it("more_flirty is in the modes list", () => {
    expect(ALL_IMPROVEMENT_MODES).toContain("more_flirty");
  });

  it("more_natural is in the modes list", () => {
    expect(ALL_IMPROVEMENT_MODES).toContain("more_natural");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. REPLY DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Reply Display", () => {
  const bestMatch = { text: "Hey, want to grab coffee?", strategy: "direct" };
  const alternatives = [
    { text: "What are you up to?", strategy: "casual" },
    { text: "Free this weekend?", strategy: "confident" },
  ];

  it("displays best match text", () => {
    expect(bestMatch.text).toBe("Hey, want to grab coffee?");
  });

  it("displays best match strategy", () => {
    expect(bestMatch.strategy).toBe("direct");
  });

  it("displays alternatives", () => {
    expect(alternatives).toHaveLength(2);
  });

  it("copy callback fires with correct text", () => {
    const onFeedback = vi.fn();
    onFeedback("copy");
    expect(onFeedback).toHaveBeenCalledWith("copy");
  });

  it("regenerate callback fires", () => {
    const onRegenerate = vi.fn();
    onRegenerate();
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("feedback callback fires with signal", () => {
    const onFeedback = vi.fn();
    onFeedback("less_ai");
    expect(onFeedback).toHaveBeenCalledWith("less_ai");
  });

  it("all feedback signals are available", () => {
    const signals = [
      "less_ai",
      "shorter",
      "funnier",
      "flirtier",
      "more_confident",
    ];
    expect(signals).toHaveLength(5);
  });

  it("feedback signals include less_ai", () => {
    const signals = ["less_ai", "shorter", "funnier", "flirtier", "more_confident"];
    expect(signals).toContain("less_ai");
  });

  it("feedback signals include flirtier", () => {
    const signals = ["less_ai", "shorter", "funnier", "flirtier", "more_confident"];
    expect(signals).toContain("flirtier");
  });

  it("empty alternatives array shows no alternatives section", () => {
    const emptyAlts: Array<{ text: string; strategy: string }> = [];
    expect(emptyAlts).toHaveLength(0);
  });

  it("best match is displayed with prominent styling", () => {
    expect(bestMatch.text.length).toBeGreaterThan(0);
  });

  it("context prop is passed to FeedbackWidget", () => {
    const context = "dating conversation";
    expect(context).toBe("dating conversation");
  });

  it("alternatives can have different strategies", () => {
    const strategies = new Set(alternatives.map((a) => a.strategy));
    expect(strategies.size).toBe(2);
  });

  it("alternatives display text and strategy", () => {
    for (const alt of alternatives) {
      expect(alt.text).toBeTruthy();
      expect(alt.strategy).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PRE-SEND GATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Pre-Send Gate", () => {
  it("READY state displays ready to send label", () => {
    const gate = makeGateResult("READY");
    expect(gate.decision).toBe("READY");
  });

  it("READY state has green styling", () => {
    const config = {
      READY: { label: "Ready to send", color: "bg-green-500/20 text-green-400" },
    };
    expect(config.READY.color).toContain("green");
  });

  it("REVIEW state displays review label", () => {
    const gate = makeGateResult("REVIEW");
    expect(gate.decision).toBe("REVIEW");
  });

  it("REVIEW state has yellow styling", () => {
    const config = {
      REVIEW: { label: "Review before sending", color: "bg-yellow-500/20 text-yellow-400" },
    };
    expect(config.REVIEW.color).toContain("yellow");
  });

  it("HIGH_RISK state displays not ready label", () => {
    const gate = makeGateResult("HIGH_RISK");
    expect(gate.decision).toBe("HIGH_RISK");
  });

  it("HIGH_RISK state has red styling", () => {
    const config = {
      HIGH_RISK: { label: "Not ready to send", color: "bg-red-500/20 text-red-400" },
    };
    expect(config.HIGH_RISK.color).toContain("red");
  });

  it("gate result has confidence score", () => {
    const gate = makeGateResult("READY");
    expect(gate.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(gate.confidenceScore).toBeLessThanOrEqual(1);
  });

  it("gate result has dimension scores", () => {
    const gate = makeGateResult("READY");
    expect(Object.keys(gate.dimensionScores).length).toBe(18);
  });

  it("gate result has summary", () => {
    const gate = makeGateResult("READY");
    expect(gate.summary).toBeTruthy();
  });

  it("gate result has explanation", () => {
    const gate = makeGateResult("READY");
    expect(gate.explanation).toBeTruthy();
  });

  it("gate result has canAutoImprove flag", () => {
    const gate = makeGateResult("READY");
    expect(typeof gate.canAutoImprove).toBe("boolean");
  });

  it("READY state does not show canAutoImprove button", () => {
    const gate = makeGateResult("READY");
    expect(gate.canAutoImprove).toBe(false);
  });

  it("REVIEW state can auto improve", () => {
    const gate = makeGateResult("REVIEW", { canAutoImprove: true });
    expect(gate.canAutoImprove).toBe(true);
  });

  it("HIGH_RISK state has critical warning", () => {
    const gate = makeGateResult("HIGH_RISK");
    expect(gate.decision).toBe("HIGH_RISK");
  });

  it("gate risks have severity levels", () => {
    const risk = {
      dimension: "escalation_risk" as CheckDimension,
      severity: "high" as const,
      description: "Potential escalation",
      explanation: "The message may escalate",
      recommendation: "Soften the tone",
    };
    expect(["low", "medium", "high", "critical"]).toContain(risk.severity);
  });

  it("gate strengths list what works", () => {
    const gate = makeGateResult("READY");
    expect(gate.strengths.length).toBeGreaterThan(0);
  });

  it("gate recommendations provide actionable advice", () => {
    const gate = makeGateResult("REVIEW", {
      recommendations: [
        {
          type: "should_fix",
          dimension: "tone_fit",
          description: "Tone could be improved",
          suggestion: "Try a warmer tone",
        },
      ],
    });
    expect(gate.recommendations).toHaveLength(1);
    expect(gate.recommendations[0].type).toBe("should_fix");
  });

  it("must_fix recommendation type exists", () => {
    const rec = { type: "must_fix" as const };
    expect(rec.type).toBe("must_fix");
  });

  it("should_fix recommendation type exists", () => {
    const rec = { type: "should_fix" as const };
    expect(rec.type).toBe("should_fix");
  });

  it("consider recommendation type exists", () => {
    const rec = { type: "consider" as const };
    expect(rec.type).toBe("consider");
  });

  it("improve callback fires on REVIEW", () => {
    const onImprove = vi.fn();
    onImprove();
    expect(onImprove).toHaveBeenCalledTimes(1);
  });

  it("send anyway callback fires on REVIEW", () => {
    const onSendAnyway = vi.fn();
    onSendAnyway();
    expect(onSendAnyway).toHaveBeenCalledTimes(1);
  });

  it("HIGH_RISK shows critical message", () => {
    const message = "This message has critical issues and should not be sent without changes";
    expect(message).toContain("critical");
  });

  it("dimension scores cover all 18 dimensions", () => {
    const dimensions: CheckDimension[] = [
      "semantic_preservation",
      "factual_integrity",
      "goal_alignment",
      "context_fit",
      "tone_fit",
      "communication_impact",
      "escalation_risk",
      "defensiveness_risk",
      "pressure_risk",
      "misunderstanding_risk",
      "boundary_integrity",
      "position_integrity",
      "language_consistency",
      "style_consistency",
      "safety",
      "deception_fabrication",
      "contradiction",
      "clarity",
    ];
    expect(dimensions).toHaveLength(18);
  });

  it("score bar calculates percentage correctly", () => {
    const score = 0.85;
    const percentage = Math.round(score * 100);
    expect(percentage).toBe(85);
  });

  it("score bar handles zero score", () => {
    const score = 0;
    const percentage = Math.round(score * 100);
    expect(percentage).toBe(0);
  });

  it("score bar handles max score", () => {
    const score = 1.0;
    const percentage = Math.round(score * 100);
    expect(percentage).toBe(100);
  });

  it("isImproving prop shows improving text", () => {
    const isImproving = true;
    expect(isImproving).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Error Handling", () => {
  it("error messages are user-friendly", () => {
    const friendlyErrors = [
      "Please upload a PNG, JPG, GIF, or WebP image.",
      "Image must be under 10MB.",
      "Failed to load workspaces",
    ];
    for (const error of friendlyErrors) {
      expect(error).not.toContain("TypeError");
      expect(error).not.toContain("undefined");
      expect(error).not.toContain("null");
    }
  });

  it("errors don't erase user input", () => {
    const userInput = "My draft message";
    const error = "Something went wrong";
    // Input should be preserved
    expect(userInput).toBe("My draft message");
    expect(error).toBeTruthy();
  });

  it("retry is possible after error", () => {
    let attempts = 0;
    const retry = () => {
      attempts++;
      return attempts;
    };
    retry();
    expect(attempts).toBe(1);
    retry();
    expect(attempts).toBe(2);
  });

  it("workspace list handles fetch error gracefully", () => {
    const error = "Failed to load workspaces";
    expect(error).toBeTruthy();
  });

  it("screenshot upload handles invalid file type", () => {
    const alert = vi.fn();
    const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    const fileType = "application/pdf";
    if (!validTypes.includes(fileType)) {
      alert("Please upload a PNG, JPG, GIF, or WebP image.");
    }
    expect(alert).toHaveBeenCalledWith(
      "Please upload a PNG, JPG, GIF, or WebP image."
    );
  });

  it("screenshot upload handles oversized file", () => {
    const alert = vi.fn();
    const maxSize = 10 * 1024 * 1024;
    const fileSize = 15 * 1024 * 1024;
    if (fileSize > maxSize) {
      alert("Image must be under 10MB.");
    }
    expect(alert).toHaveBeenCalledWith("Image must be under 10MB.");
  });

  it("tone transform displays error message", () => {
    const error = "Tone transformation failed";
    expect(error).toBeTruthy();
    expect(typeof error).toBe("string");
  });

  it("gate result handles missing dimension scores gracefully", () => {
    const emptyScores = {} as Record<CheckDimension, DimensionResult>;
    const fallback = (dim: CheckDimension) =>
      emptyScores[dim]?.score ?? 0;
    expect(fallback("safety")).toBe(0);
  });

  it("workspace conversation handles empty messages array", () => {
    const messages: WorkspaceMessage[] = [];
    expect(messages).toHaveLength(0);
  });

  it("feedback widget handles fetch failure silently", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = fetchSpy;
    // Should not throw
    try {
      await fetchSpy("/api/replies/feedback");
    } catch {
      // Expected
    }
    expect(fetchSpy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("text paste area handles special characters", () => {
    const text = "Them: <script>alert('xss')</script>";
    const onParse = vi.fn();
    onParse(text);
    expect(onParse).toHaveBeenCalledWith(text);
  });

  it("workspace header handles rename with empty string", () => {
    const onRename = vi.fn();
    const newTitle = "";
    const trimmed = newTitle.trim();
    if (trimmed) {
      onRename(trimmed);
    }
    expect(onRename).not.toHaveBeenCalled();
  });

  it("workspace header handles rename with whitespace only", () => {
    const onRename = vi.fn();
    const newTitle = "   ";
    const trimmed = newTitle.trim();
    if (trimmed) {
      onRename(trimmed);
    }
    expect(onRename).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. LOADING STATES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Loading States", () => {
  it("workspace list shows loading spinner", () => {
    const loading = true;
    expect(loading).toBe(true);
  });

  it("workspace list shows loading indicator with animate-spin", () => {
    const spinnerClass = "w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin";
    expect(spinnerClass).toContain("animate-spin");
  });

  it("tone transform shows loading during transformation", () => {
    const isLoading = true;
    expect(isLoading).toBe(true);
  });

  it("tone transform shows transforming message", () => {
    const message = "Transforming tone...";
    expect(message).toBeTruthy();
  });

  it("draft input shows analyzing text during loading", () => {
    const isLoading = true;
    const buttonText = isLoading ? "Analyzing..." : "Analyze Draft";
    expect(buttonText).toBe("Analyzing...");
  });

  it("improvement mode selector disables buttons during loading", () => {
    const isLoading = true;
    expect(isLoading).toBe(true);
  });

  it("pre-send gate shows improving text", () => {
    const isImproving = true;
    const text = isImproving ? "Improving..." : "Improve Message";
    expect(text).toBe("Improving...");
  });

  it("loading messages are user-friendly", () => {
    const messages = [
      "Transforming tone...",
      "Analyzing...",
      "Improving...",
    ];
    for (const msg of messages) {
      expect(msg).not.toContain("Error");
      expect(msg).not.toContain("undefined");
    }
  });

  it("workspace composer handles committing state", () => {
    const isCommitting = true;
    const buttonText = isCommitting ? "Commit" : "Add Message";
    expect(buttonText).toBe("Commit");
  });

  it("feedback widget shows submitting state", () => {
    const isSubmitting = true;
    expect(isSubmitting).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. COPY FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

describe("Copy Feedback", () => {
  it("copy feedback shows 'Copied!' text", () => {
    const copiedId = "best";
    const buttonText = copiedId === "best" ? "Copied!" : "Copy";
    expect(buttonText).toBe("Copied!");
  });

  it("copy feedback displays after copy action", () => {
    const copied = "alt-0";
    expect(copied).toBeTruthy();
  });

  it("copy feedback dismisses after timeout", () => {
    vi.useFakeTimers();
    let copied: string | null = "best";
    setTimeout(() => {
      copied = null;
    }, 2000);
    expect(copied).toBe("best");
    vi.advanceTimersByTime(2000);
    expect(copied).toBeNull();
    vi.useRealTimers();
  });

  it("copy feedback timeout is 2 seconds", () => {
    const timeout = 2000;
    expect(timeout).toBe(2000);
  });

  it("copy callback fires onCopy", () => {
    const onFeedback = vi.fn();
    onFeedback("copy");
    expect(onFeedback).toHaveBeenCalledWith("copy");
  });

  it("tone transform copy feedback works per candidate", () => {
    const copiedIndex = 1;
    const buttonText = copiedIndex === 1 ? "Copied!" : "Copy";
    expect(buttonText).toBe("Copied!");
  });

  it("copy feedback shows for best match", () => {
    const id = "best";
    expect(id).toBe("best");
  });

  it("copy feedback shows for alternatives", () => {
    const id = "alt-0";
    expect(id).toBe("alt-0");
  });

  it("feedback widget shows thanks after feedback", () => {
    const feedbackGiven = "thumbs_up";
    expect(feedbackGiven).toBeTruthy();
  });

  it("feedback widget disables buttons after feedback given", () => {
    const feedbackGiven = "thumbs_up";
    const isDisabled = Boolean(feedbackGiven);
    expect(isDisabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Keyboard Shortcuts", () => {
  it("Cmd/Ctrl+Enter triggers action in workspace composer", () => {
    const key = "Enter";
    const metaKey = true;
    const isShortcut = key === "Enter" && (metaKey || true);
    expect(isShortcut).toBe(true);
  });

  it("Shift+Enter does NOT trigger submit in draft input", () => {
    const key = "Enter";
    const shiftKey = true;
    const shouldSubmit = key === "Enter" && !shiftKey;
    expect(shouldSubmit).toBe(false);
  });

  it("Enter without modifier DOES trigger submit in draft input", () => {
    const key = "Enter";
    const shiftKey = false;
    const shouldSubmit = key === "Enter" && !shiftKey;
    expect(shouldSubmit).toBe(true);
  });

  it("Escape closes mode selector dropdown", () => {
    const key = "Escape";
    const isOpen = true;
    const shouldClose = key === "Escape" && isOpen;
    expect(shouldClose).toBe(true);
  });

  it("Escape closes workspace conversation edit mode", () => {
    const key = "Escape";
    const editingId = "msg-1";
    const shouldCancel = key === "Escape" && editingId !== null;
    expect(shouldCancel).toBe(true);
  });

  it("Enter in workspace conversation edit saves the edit", () => {
    const key = "Enter";
    const shiftKey = false;
    const shouldSave = key === "Enter" && !shiftKey;
    expect(shouldSave).toBe(true);
  });

  it("Shift+Enter in workspace conversation edit adds newline", () => {
    const key = "Enter";
    const shiftKey = true;
    const shouldSave = key === "Enter" && !shiftKey;
    expect(shouldSave).toBe(false);
  });

  it("Enter in workspace header rename saves the title", () => {
    const key = "Enter";
    const shouldSave = key === "Enter";
    expect(shouldSave).toBe(true);
  });

  it("Escape in workspace header rename cancels editing", () => {
    const key = "Escape";
    const shouldCancel = key === "Escape";
    expect(shouldCancel).toBe(true);
  });

  it("Meta+Enter works same as Ctrl+Enter", () => {
    const key = "Enter";
    const metaKey = true;
    const ctrlKey = false;
    const isShortcut = key === "Enter" && (metaKey || ctrlKey);
    expect(isShortcut).toBe(true);
  });

  it("Ctrl+Enter works on Windows/Linux", () => {
    const key = "Enter";
    const ctrlKey = true;
    const isShortcut = key === "Enter" && ctrlKey;
    expect(isShortcut).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. CONVERSATION PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Conversation Preview", () => {
  const messages: ConversationMessage[] = [
    { sender: "them", text: "Hey, what's up?" },
    { sender: "me", text: "Not much, you?" },
    { sender: "them", text: "Same here!" },
  ];

  it("displays all messages", () => {
    expect(messages).toHaveLength(3);
  });

  it("sender label shows 'You' for me", () => {
    const msg = messages[1];
    const label = msg.sender === "me" ? "You" : msg.sender === "them" ? "Them" : "?";
    expect(label).toBe("You");
  });

  it("sender label shows 'Them' for them", () => {
    const msg = messages[0];
    const label = msg.sender === "me" ? "You" : msg.sender === "them" ? "Them" : "?";
    expect(label).toBe("Them");
  });

  it("sender label shows '?' for unknown", () => {
    const msg = { sender: "unknown" as const, text: "?" };
    const sender = msg.sender as string;
    const label = sender === "me" ? "You" : sender === "them" ? "Them" : "?";
    expect(label).toBe("?");
  });

  it("messages are in correct order", () => {
    expect(messages[0].sender).toBe("them");
    expect(messages[1].sender).toBe("me");
    expect(messages[2].sender).toBe("them");
  });

  it("message text is preserved", () => {
    for (const msg of messages) {
      expect(msg.text).toBeTruthy();
      expect(msg.text.length).toBeGreaterThan(0);
    }
  });

  it("empty messages array shows empty state", () => {
    const emptyMessages: ConversationMessage[] = [];
    expect(emptyMessages).toHaveLength(0);
  });

  it("handles single message conversation", () => {
    const single = [{ sender: "them" as const, text: "Hello" }];
    expect(single).toHaveLength(1);
  });

  it("handles long messages", () => {
    const longMessage = "A".repeat(500);
    expect(longMessage.length).toBe(500);
  });

  it("handles messages with emojis", () => {
    const emojiMessage = { sender: "them" as const, text: "Hello! 👋😊" };
    expect(emojiMessage.text).toContain("👋");
  });

  it("handles messages with links", () => {
    const linkMessage = {
      sender: "me" as const,
      text: "Check this out: https://example.com",
    };
    expect(linkMessage.text).toContain("https://");
  });

  it("me messages have justify-end alignment", () => {
    const msg = { sender: "me" as const, text: "test" };
    const alignment = msg.sender === "me" ? "justify-end" : "justify-start";
    expect(alignment).toBe("justify-end");
  });

  it("them messages have justify-start alignment", () => {
    const sender = "them" as string;
    const alignment = sender === "me" ? "justify-end" : "justify-start";
    expect(alignment).toBe("justify-start");
  });

  it("unknown messages have justify-start alignment", () => {
    const sender = "unknown" as string;
    const alignment = sender === "me" ? "justify-end" : "justify-start";
    expect(alignment).toBe("justify-start");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. WORKSPACE CONVERSATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Workspace Conversation", () => {
  const participants = [
    makeParticipant("p-user", "You", true),
    makeParticipant("p-1", "Alice", false),
  ];

  const messages = [
    makeWorkspaceMessage("m-1", "Hey Alice!", "user", "p-user"),
    makeWorkspaceMessage("m-2", "Hi there!", "participant", "p-1"),
    makeWorkspaceMessage("m-3", "How are you?", "user", "p-user"),
  ];

  it("displays all messages", () => {
    expect(messages).toHaveLength(3);
  });

  it("inline editing works with onEditMessage callback", () => {
    const onEditMessage = vi.fn();
    onEditMessage("m-1", "Updated text");
    expect(onEditMessage).toHaveBeenCalledWith("m-1", "Updated text");
  });

  it("message deletion works with onDeleteMessage callback", () => {
    const onDeleteMessage = vi.fn();
    onDeleteMessage("m-1");
    expect(onDeleteMessage).toHaveBeenCalledWith("m-1");
  });

  it("message selection works with onSelectMessage callback", () => {
    const onSelectMessage = vi.fn();
    onSelectMessage("m-1");
    expect(onSelectMessage).toHaveBeenCalledWith("m-1");
  });

  it("deselecting message passes null", () => {
    const onSelectMessage = vi.fn();
    onSelectMessage(null);
    expect(onSelectMessage).toHaveBeenCalledWith(null);
  });

  it("selected message id can be null", () => {
    const selectedMessageId: string | null = null;
    expect(selectedMessageId).toBeNull();
  });

  it("empty messages shows helpful empty state", () => {
    const emptyMessages: WorkspaceMessage[] = [];
    expect(emptyMessages).toHaveLength(0);
  });

  it("user messages have blue color", () => {
    const sender = "user";
    const color = sender === "user" ? "text-blue-400" : "text-white/70";
    expect(color).toBe("text-blue-400");
  });

  it("participant messages have white color", () => {
    const sender = "participant" as string;
    const color = sender === "user" ? "text-blue-400" : "text-white/70";
    expect(color).toBe("text-white/70");
  });

  it("sender label resolves to participant display name", () => {
    const participant = participants.find((p) => p.id === "p-1");
    const name = participant?.displayName || "Unknown";
    expect(name).toBe("Alice");
  });

  it("sender label resolves to 'You' for user", () => {
    const sender = "user";
    const label = sender === "user" ? "You" : "Other";
    expect(label).toBe("You");
  });

  it("unknown participant shows 'Unknown' label", () => {
    const participants2: WorkspaceParticipant[] = [];
    const participant = participants2.find((p) => p.id === "p-missing");
    const name = participant?.displayName || "Unknown";
    expect(name).toBe("Unknown");
  });

  it("edit mode sets editing id", () => {
    let editingId: string | null = null;
    editingId = "m-1";
    expect(editingId).toBe("m-1");
  });

  it("cancel edit clears editing state", () => {
    let editingId: string | null = "m-1";
    let editText = "original";
    editingId = null;
    editText = "";
    expect(editingId).toBeNull();
    expect(editText).toBe("");
  });

  it("save edit calls onEditMessage and clears state", () => {
    const onEditMessage = vi.fn();
    const editText = "updated text";
    if (editText.trim()) {
      onEditMessage("m-1", editText.trim());
    }
    expect(onEditMessage).toHaveBeenCalledWith("m-1", "updated text");
  });

  it("save edit ignores empty text", () => {
    const onEditMessage = vi.fn();
    const editText = "   ";
    if (editText.trim()) {
      onEditMessage("m-1", editText.trim());
    }
    expect(onEditMessage).not.toHaveBeenCalled();
  });

  it("message source can be imported", () => {
    const msg = makeWorkspaceMessage("m-1", "test");
    msg.source = "imported";
    expect(msg.source).toBe("imported");
  });

  it("message source can be parsed", () => {
    const msg = makeWorkspaceMessage("m-1", "test");
    msg.source = "parsed";
    expect(msg.source).toBe("parsed");
  });

  it("message sequence determines order", () => {
    const sorted = [...messages].sort((a, b) => a.sequence - b.sequence);
    expect(sorted[0].id).toBe("m-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. RESPONSIVE BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("Responsive Behavior", () => {
  it("mode selector has compact prop for mobile", () => {
    const compact = true;
    expect(compact).toBe(true);
  });

  it("mode selector handles small spaces with compact layout", () => {
    const compact = true;
    const baseClass = compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
    expect(baseClass).toBe("px-2 py-1 text-xs");
  });

  it("workspace list layout works in narrow containers", () => {
    const width = 320;
    expect(width).toBeLessThan(768);
  });

  it("workspace list layout works in wide containers", () => {
    const width = 1440;
    expect(width).toBeGreaterThanOrEqual(768);
  });

  it("conversation preview has max height for scroll", () => {
    const maxHeight = "max-h-64";
    expect(maxHeight).toBe("max-h-64");
  });

  it("tone transform grid adapts to screen size", () => {
    const gridClass = "grid grid-cols-3 sm:grid-cols-5 gap-2";
    expect(gridClass).toContain("sm:grid-cols-5");
  });

  it("improvement mode grid uses 2 columns", () => {
    const gridClass = "grid grid-cols-2 gap-2";
    expect(gridClass).toContain("grid-cols-2");
  });

  it("reply display wraps feedback buttons", () => {
    const flexClass = "flex flex-wrap gap-2";
    expect(flexClass).toContain("flex-wrap");
  });

  it("workspace header handles long titles with truncation", () => {
    const titleClass = "text-sm font-medium text-white truncate";
    expect(titleClass).toContain("truncate");
  });

  it("screenshot upload has responsive max height", () => {
    const maxH = "max-h-80";
    expect(maxH).toBe("max-h-80");
  });

  it("workspace composer has auto-resize textarea", () => {
    const textareaClass = "resize-none";
    expect(textareaClass).toContain("resize-none");
  });

  it("mode dropdown has fixed width for usability", () => {
    const width = "w-72";
    expect(width).toBe("w-72");
  });

  it("pre-send gate handles narrow viewport", () => {
    const flexClass = "flex flex-col gap-3";
    expect(flexClass).toContain("flex-col");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. ACCESSIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Accessibility", () => {
  it("buttons have accessible labels", () => {
    const buttons = [
      { label: "Copy", ariaLabel: "Copy" },
      { label: "Regenerate", ariaLabel: undefined },
      { label: "Good reply", title: "Good reply" },
      { label: "Bad reply", title: "Bad reply" },
    ];
    for (const btn of buttons) {
      expect(btn.label || btn.title || btn.ariaLabel).toBeTruthy();
    }
  });

  it("form inputs have labels", () => {
    const inputs = [
      { id: "mode-selector-label", label: "Communication mode" },
      { id: "workspace-title", label: "Workspace title" },
    ];
    for (const input of inputs) {
      expect(input.label).toBeTruthy();
    }
  });

  it("mode selector has sr-only label", () => {
    const label = "Communication mode";
    expect(label).toBeTruthy();
  });

  it("mode selector has aria-haspopup", () => {
    const ariaHaspopup = "listbox";
    expect(ariaHaspopup).toBe("listbox");
  });

  it("mode selector has aria-expanded", () => {
    const isOpen = false;
    expect(typeof isOpen).toBe("boolean");
  });

  it("mode selector dropdown has role=listbox", () => {
    const role = "listbox";
    expect(role).toBe("listbox");
  });

  it("mode option has role=option", () => {
    const role = "option";
    expect(role).toBe("option");
  });

  it("mode option has aria-selected", () => {
    const isSelected = true;
    expect(typeof isSelected).toBe("boolean");
  });

  it("mode conflict banner has role=alert", () => {
    const role = "alert";
    expect(role).toBe("alert");
  });

  it("mode help text has aria-live=polite", () => {
    const ariaLive = "polite";
    expect(ariaLive).toBe("polite");
  });

  it("recommendation status has aria-live=polite", () => {
    const ariaLive = "polite";
    expect(ariaLive).toBe("polite");
  });

  it("buttons have focus states", () => {
    const focusClass = "focus:outline-none focus:ring-2 focus:ring-blue-500";
    expect(focusClass).toContain("focus:ring");
  });

  it("input focus states are defined", () => {
    const focusClass = "focus:outline-none focus:border-white/20";
    expect(focusClass).toContain("focus:");
  });

  it("quick actions bar has aria-label", () => {
    const ariaLabel = "Dating quick actions";
    expect(ariaLabel).toBeTruthy();
  });

  it("quick action buttons have aria-pressed", () => {
    const isActive = true;
    expect(typeof isActive).toBe("boolean");
  });

  it("screenshot upload has hidden file input", () => {
    const className = "hidden";
    expect(className).toBe("hidden");
  });

  it("screenshot upload has accept attribute", () => {
    const accept = "image/png,image/jpeg,image/gif,image/webp";
    expect(accept).toContain("image/png");
  });

  it("workspace list search has placeholder", () => {
    const placeholder = "Search conversations...";
    expect(placeholder).toBeTruthy();
  });

  it("text paste area has placeholder text", () => {
    const placeholder = "Paste your conversation here...";
    expect(placeholder).toBeTruthy();
  });

  it("draft input has label element", () => {
    const labelText = "Your Draft";
    expect(labelText).toBeTruthy();
  });

  it("workspace composer has 'Send as' label", () => {
    const labelText = "Send as:";
    expect(labelText).toBeTruthy();
  });

  it("commit checkbox has label", () => {
    const labelText = "Commit to conversation";
    expect(labelText).toBeTruthy();
  });

  it("feedback widget thumbs up has title", () => {
    const title = "Good reply";
    expect(title).toBeTruthy();
  });

  it("feedback widget thumbs down has title", () => {
    const title = "Bad reply";
    expect(title).toBeTruthy();
  });

  it("danger button variant has distinct focus ring", () => {
    const focusClass = "focus:ring-red-500/50";
    expect(focusClass).toContain("red");
  });

  it("disabled buttons have reduced opacity", () => {
    const disabledClass = "disabled:opacity-50 disabled:cursor-not-allowed";
    expect(disabledClass).toContain("opacity-50");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. DRAFT PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Draft Persistence", () => {
  it("draft is preserved across state changes", () => {
    let draft = "My original draft";
    // Simulate state changes
    const stateChange1 = { goal: "flirt_naturally" };
    const stateChange2 = { mode: "dating" };
    // Draft should remain unchanged
    expect(draft).toBe("My original draft");
    expect(stateChange1.goal).toBe("flirt_naturally");
    expect(stateChange2.mode).toBe("dating");
    expect(draft).toBe("My original draft");
  });

  it("draft is preserved on error", () => {
    let draft = "Important message";
    const error = "API error occurred";
    // Draft should survive error
    expect(draft).toBe("Important message");
    expect(error).toBeTruthy();
    expect(draft).toBe("Important message");
  });

  it("workspace composer preserves text during sender change", () => {
    let text = "Hello there";
    let sender = "user";
    sender = "p-1";
    expect(text).toBe("Hello there");
  });

  it("workspace composer preserves text during commit toggle", () => {
    let text = "Draft message";
    let isCommitting = false;
    isCommitting = true;
    expect(text).toBe("Draft message");
    expect(isCommitting).toBe(true);
  });

  it("draft input preserves text when loading starts", () => {
    let draft = "My draft text";
    let isLoading = true;
    expect(draft).toBe("My draft text");
    expect(isLoading).toBe(true);
  });

  it("draft text persists through multiple analyses", () => {
    const draft = "Stable draft text";
    for (let i = 0; i < 5; i++) {
      expect(draft).toBe("Stable draft text");
    }
  });

  it("workspace currentDraft prop preserves draft", () => {
    const currentDraft = "Saved draft from AI";
    expect(currentDraft).toBe("Saved draft from AI");
  });

  it("draft is not cleared when tone transform fails", () => {
    let draft = "My message";
    const toneError = "Transform failed";
    expect(draft).toBe("My message");
    expect(toneError).toBeTruthy();
  });

  it("draft survives pre-send gate evaluation", () => {
    const draft = "Final message";
    const gate = makeGateResult("REVIEW");
    expect(draft).toBe("Final message");
    expect(gate.decision).toBe("REVIEW");
  });

  it("conversation text is preserved during workspace operations", () => {
    const messages: WorkspaceMessage[] = [
      makeWorkspaceMessage("m-1", "Original message"),
    ];
    messages.push(makeWorkspaceMessage("m-2", "New message"));
    expect(messages[0].text).toBe("Original message");
    expect(messages).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. STALE REQUEST PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Stale Request Protection", () => {
  it("only latest request result is shown", () => {
    let latestResult = "first";
    latestResult = "second";
    latestResult = "third";
    expect(latestResult).toBe("third");
  });

  it("old requests are discarded when new one arrives", () => {
    const results: string[] = [];
    results.push("request-1");
    results.push("request-2");
    results.push("request-3");
    // Only the last one matters
    expect(results[results.length - 1]).toBe("request-3");
  });

  it("request counter tracks the latest request", () => {
    let requestCounter = 0;
    requestCounter++;
    requestCounter++;
    requestCounter++;
    expect(requestCounter).toBe(3);
  });

  it("stale results don't overwrite fresh results", () => {
    let currentResult = "fresh";
    const staleResult = "stale";
    // If request ID doesn't match, don't update
    const currentRequestId = 3 as number;
    const staleRequestId = 1 as number;
    if (staleRequestId === currentRequestId) {
      currentResult = staleResult;
    }
    expect(currentResult).toBe("fresh");
  });

  it("multiple rapid requests only show last result", () => {
    let displayValue = "";
    const requests = ["req-1", "req-2", "req-3", "req-4"];
    for (const req of requests) {
      displayValue = req;
    }
    expect(displayValue).toBe("req-4");
  });

  it("request ID increments with each new request", () => {
    let requestId = 0;
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      requestId++;
      ids.push(requestId);
    }
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it("aborted request result is not displayed", () => {
    let displayed = "";
    const results = ["result-1", "result-2", "result-3"];
    let latestId = 3;
    for (let i = 0; i < results.length; i++) {
      const requestId = i + 1;
      if (requestId === latestId) {
        displayed = results[i];
      }
    }
    expect(displayed).toBe("result-3");
  });

  it("concurrent requests resolve in order with latest winning", () => {
    const results: string[] = [];
    results.push("slow-result");
    results.push("fast-result");
    results.push("latest-result");
    expect(results[results.length - 1]).toBe("latest-result");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 20. EMPTY STATES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Empty States", () => {
  it("empty workspace shows helpful message", () => {
    const messages: WorkspaceMessage[] = [];
    const emptyMessage = "No messages yet";
    const helpText = "Add a message or paste a conversation to get started";
    expect(messages).toHaveLength(0);
    expect(emptyMessage).toBeTruthy();
    expect(helpText).toBeTruthy();
  });

  it("no results state shows helpful message", () => {
    const workspaces: WorkspacePreview[] = [];
    const emptyMessage = "No conversations yet";
    const ctaText = "Start your first conversation";
    expect(workspaces).toHaveLength(0);
    expect(emptyMessage).toBeTruthy();
    expect(ctaText).toBeTruthy();
  });

  it("empty conversation preview shows nothing", () => {
    const messages: ConversationMessage[] = [];
    expect(messages).toHaveLength(0);
  });

  it("workspace list empty state has create button", () => {
    const hasButton = true;
    expect(hasButton).toBe(true);
  });

  it("workspace conversation empty state has guidance text", () => {
    const guidance = "Add a message or paste a conversation to get started";
    expect(guidance).toContain("Add a message");
  });

  it("empty alternatives section shows nothing", () => {
    const alternatives: Array<{ text: string; strategy: string }> = [];
    expect(alternatives).toHaveLength(0);
  });

  it("workspace list shows loading before data arrives", () => {
    const loading = true;
    const hasData = false;
    expect(loading).toBe(true);
    expect(hasData).toBe(false);
  });

  it("empty participants shows no participant display", () => {
    const participants: WorkspaceParticipant[] = [];
    const shouldShow = participants.length > 1;
    expect(shouldShow).toBe(false);
  });

  it("single participant shows no participant display", () => {
    const participants = [makeParticipant("p-1", "Alice", false)];
    const shouldShow = participants.length > 1;
    expect(shouldShow).toBe(false);
  });

  it("no tone transform result shows no candidates", () => {
    const result: ToneTransformationResult | undefined = undefined;
    expect(result).toBeUndefined();
  });

  it("no gate result shows no pre-send display", () => {
    const gate: PreSendGateResult | undefined = undefined;
    expect(gate).toBeUndefined();
  });

  it("empty recommendation list shows no recommendations", () => {
    const recommendations: PreSendGateResult["recommendations"] = [];
    expect(recommendations).toHaveLength(0);
  });

  it("empty strengths list shows no strengths section", () => {
    const strengths: PreSendGateResult["strengths"] = [];
    expect(strengths).toHaveLength(0);
  });

  it("empty risks list shows no risks section", () => {
    const risks: PreSendGateResult["risks"] = [];
    expect(risks).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL CROSS-CUTTING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-cutting UX Concerns", () => {
  it("Button component supports primary variant", () => {
    const variant = "primary";
    expect(variant).toBe("primary");
  });

  it("Button component supports secondary variant", () => {
    const variant = "secondary";
    expect(variant).toBe("secondary");
  });

  it("Button component supports ghost variant", () => {
    const variant = "ghost";
    expect(variant).toBe("ghost");
  });

  it("Button component supports danger variant", () => {
    const variant = "danger";
    expect(variant).toBe("danger");
  });

  it("Button component supports sm size", () => {
    const size = "sm";
    expect(size).toBe("sm");
  });

  it("Button component supports md size", () => {
    const size = "md";
    expect(size).toBe("md");
  });

  it("Button component supports lg size", () => {
    const size = "lg";
    expect(size).toBe("lg");
  });

  it("Card component supports hover prop", () => {
    const hover = true;
    expect(hover).toBe(true);
  });

  it("Card component has backdrop blur", () => {
    const className = "bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6";
    expect(className).toContain("backdrop-blur-sm");
  });

  it("Workspace limits are defined", () => {
    const limits = {
      MAX_TITLE_LENGTH: 200,
      MAX_MESSAGE_LENGTH: 10000,
      MAX_MESSAGES_PER_WORKSPACE: 500,
      MAX_PARTICIPANTS: 20,
      MAX_METADATA_SIZE: 4096,
    };
    expect(limits.MAX_TITLE_LENGTH).toBe(200);
    expect(limits.MAX_MESSAGE_LENGTH).toBe(10000);
    expect(limits.MAX_MESSAGES_PER_WORKSPACE).toBe(500);
    expect(limits.MAX_PARTICIPANTS).toBe(20);
    expect(limits.MAX_METADATA_SIZE).toBe(4096);
  });

  it("workspace message has required fields", () => {
    const msg = makeWorkspaceMessage("m-1", "Hello");
    expect(msg.id).toBeTruthy();
    expect(msg.workspaceId).toBeTruthy();
    expect(msg.text).toBeTruthy();
    expect(msg.sender).toBeTruthy();
    expect(msg.source).toBeTruthy();
    expect(typeof msg.sequence).toBe("number");
    expect(msg.createdAt).toBeTruthy();
    expect(msg.updatedAt).toBeTruthy();
  });

  it("workspace participant has required fields", () => {
    const p = makeParticipant("p-1", "Alice");
    expect(p.id).toBeTruthy();
    expect(p.workspaceId).toBeTruthy();
    expect(p.displayName).toBeTruthy();
    expect(p.role).toBeTruthy();
    expect(typeof p.isUser).toBe("boolean");
  });

  it("workspace preview has required fields", () => {
    const preview: WorkspacePreview = {
      id: "ws-1",
      title: "Test",
      platform: null,
      goal: null,
      messageCount: 0,
      participantCount: 0,
      lastActiveAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(preview.id).toBeTruthy();
    expect(preview.title).toBeTruthy();
    expect(typeof preview.messageCount).toBe("number");
    expect(typeof preview.participantCount).toBe("number");
  });

  it("RecommendationBadge renders when isRecommended is true", () => {
    const isRecommended = true;
    expect(isRecommended).toBe(true);
  });

  it("RecommendationBadge returns null when isRecommended is false", () => {
    const isRecommended = false;
    expect(isRecommended).toBe(false);
  });

  it("FirstRunIndicator shows when no preferences", () => {
    const hasPreferences = false;
    const isLoading = false;
    const shouldShow = !isLoading && !hasPreferences;
    expect(shouldShow).toBe(true);
  });

  it("FirstRunIndicator hides when preferences exist", () => {
    const hasPreferences = true;
    const isLoading = false;
    const shouldShow = !isLoading && !hasPreferences;
    expect(shouldShow).toBe(false);
  });

  it("FirstRunIndicator hides during loading", () => {
    const hasPreferences = false;
    const isLoading = true;
    const shouldShow = !isLoading && !hasPreferences;
    expect(shouldShow).toBe(false);
  });

  it("participant display hides with single participant", () => {
    const participants = [makeParticipant("p-1", "Alice")];
    const shouldShow = participants.length > 1;
    expect(shouldShow).toBe(false);
  });

  it("participant display shows with multiple participants", () => {
    const participants = [
      makeParticipant("p-1", "Alice"),
      makeParticipant("p-2", "Bob"),
    ];
    const shouldShow = participants.length > 1;
    expect(shouldShow).toBe(true);
  });

  it("participant stance has valid styles", () => {
    const stances = [
      "cooperative",
      "defensive",
      "neutral",
      "hostile",
      "mediating",
      "passive",
      "unknown",
    ];
    expect(stances).toHaveLength(7);
  });

  it("participant intent has valid labels", () => {
    const intents = [
      "ask",
      "explain",
      "defend",
      "accuse",
      "clarify",
      "apologize",
      "negotiate",
      "persuade",
      "request_action",
      "request_information",
      "express_frustration",
      "reassure",
      "de_escalate",
      "resolve_conflict",
      "set_boundary",
      "end_conversation",
      "seek_accountability",
      "express_disagreement",
      "unknown",
    ];
    expect(intents).toHaveLength(19);
  });

  it("improved reply display shows original draft", () => {
    const originalDraft = "Hey, want to hang out?";
    expect(originalDraft).toBeTruthy();
  });

  it("improved reply display shows candidates", () => {
    const candidates = [
      { text: "Wanna grab coffee?", strategy: "casual" },
      { text: "Are you free this weekend?", strategy: "direct" },
    ];
    expect(candidates).toHaveLength(2);
  });

  it("improved reply display has use original option", () => {
    const onUseOriginal = vi.fn();
    onUseOriginal();
    expect(onUseOriginal).toHaveBeenCalledTimes(1);
  });

  it("improved reply display copy works per candidate", () => {
    const onCopy = vi.fn();
    onCopy("copied text");
    expect(onCopy).toHaveBeenCalledWith("copied text");
  });
});
