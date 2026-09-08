"use client";

import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import ScreenshotUpload from "@/components/analyze/ScreenshotUpload";
import TextPasteArea from "@/components/analyze/TextPasteArea";
import GoalSelector, { getRecommendedGoal } from "@/components/analyze/GoalSelector";
import ConversationPreview from "@/components/analyze/ConversationPreview";
import ReplyDisplay from "@/components/analyze/ReplyDisplay";
import DraftAnalysisDisplay from "@/components/analyze/DraftAnalysisDisplay";
import ImpactDisplay from "@/components/analyze/ImpactDisplay";
import { ToneTransformDisplay } from "@/components/analyze/ToneTransformDisplay";
import ImprovementModeSelector, { getRecommendedMode } from "@/components/analyze/ImprovementModeSelector";
import ImprovedReplyDisplay from "@/components/analyze/ImprovedReplyDisplay";
import RecoverySettings from "@/components/analyze/RecoverySettings";
import RecoveryGuidance from "@/components/analyze/RecoveryGuidance";
import ConflictDisplay from "@/components/analyze/ConflictDisplay";
import ParticipantDisplay from "@/components/analyze/ParticipantDisplay";
import ConversationCoachDisplay from "@/components/analyze/ConversationCoachDisplay";
import PreSendGateDisplay from "@/components/analyze/PreSendGateDisplay";
import FeedbackWidget from "@/components/analyze/FeedbackWidget";
import Button from "@/components/ui/Button";
import WorkspaceList from "@/components/analyze/WorkspaceList";
import WorkspaceHeader from "@/components/analyze/WorkspaceHeader";
import WorkspaceConversation from "@/components/analyze/WorkspaceConversation";
import WorkspaceComposer from "@/components/analyze/WorkspaceComposer";
import WorkspaceParticipantManager from "@/components/analyze/WorkspaceParticipantManager";
import {
  ModeSelector,
  QuickActionsBar,
  ModeConflictBanner,
  ModeHelpText,
} from "@/components/analyze/ModeSelector";
import { PreferencePanel, FirstRunIndicator } from "@/components/analyze/PreferenceChips";
import { useEffectivePreferences, getContextOverrides } from "@/lib/ai/effective-preferences";
import {
  analyzeReducer,
  INITIAL_STATE,
  getEffectiveDraft,
  getOriginalDraft,
  type ReplyCandidate,
} from "@/lib/ai/analyze-state";
import {
  workspaceReducer,
  INITIAL_WORKSPACE_STATE,
  getMaxSequence,
} from "@/lib/ai/workspace-state";
import type { GoalType } from "@/types/conversation";
import type { UserFact } from "@/components/analyze/FactEditor";
import type { ImprovementMode } from "@/lib/ai/draft-types";
import type { TargetTone, ToneIntensity } from "@/lib/ai/tone-transformer";
import type { WorkspaceMessage, WorkspaceParticipant } from "@/lib/ai/workspace-types";
import type { CommunicationMode } from "@/lib/ai/mode-types";

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;
const AUTOSAVE_DEBOUNCE_MS = 500;

async function resizeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to create canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(outputType, JPEG_QUALITY);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: outputType });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/** Generate a unique request ID for stale request protection */
let requestCounter = 0;
function nextRequestId(): number {
  return ++requestCounter;
}

type ViewMode = "list" | "workspace";

export default function AnalyzePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [workspaceState, workspaceDispatch] = useReducer(workspaceReducer, INITIAL_WORKSPACE_STATE);
  const [inputMode, setInputMode] = useState<"screenshot" | "text">("screenshot");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>();
  const [showTonePanel, setShowTonePanel] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const latestRequestRef = useRef<number>(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = workspaceState.analyze;
  const dispatch = useCallback(
    (action: import("@/lib/ai/analyze-state").AnalyzeAction) => {
      workspaceDispatch({ type: "ANALYZE", action });
    },
    [workspaceDispatch]
  );

  const draft = getEffectiveDraft(state);
  const originalDraft = getOriginalDraft(state);

  // ── Effective Preferences ──
  const contextType = state.detectedContext?.conversationType || workspaceState.platform || undefined;
  const contextOverrides = contextType ? getContextOverrides(contextType) : {};
  const prefs = useEffectivePreferences(contextType, contextOverrides);

  // ── Compute preference-based recommendations ──
  const recommendedGoal = prefs.getRecommendation("strategy_preference")
    ? getRecommendedGoal(prefs.getRecommendation("strategy_preference")!)
    : null;
  const recommendedMode = getRecommendedMode(
    prefs.getRecommendation("improvement_mode"),
    prefs.getRecommendation("tone"),
    prefs.getRecommendation("length")
  );

  // ── Workspace: Load ──
  const handleLoadWorkspace = useCallback(async (workspaceId: string) => {
    workspaceDispatch({ type: "SET_WORKSPACE_LOADING", field: "workspace", value: true });
    workspaceDispatch({ type: "SET_WORKSPACE_ERROR", field: "workspace", value: null });

    try {
      const res = await fetch(`/api/conversations/${workspaceId}`);
      if (!res.ok) throw new Error("Failed to load workspace");
      const data = await res.json();

      workspaceDispatch({
        type: "LOAD_WORKSPACE",
        workspace: data.workspace,
        participants: data.participants || [],
        messages: data.messages || [],
      });
      setViewMode("workspace");
    } catch (err) {
      workspaceDispatch({
        type: "SET_WORKSPACE_ERROR",
        field: "workspace",
        value: err instanceof Error ? err.message : "Failed to load workspace",
      });
    } finally {
      workspaceDispatch({ type: "SET_WORKSPACE_LOADING", field: "workspace", value: false });
    }
  }, []);

  // ── Workspace: Create ──
  const handleCreateWorkspace = useCallback(async () => {
    workspaceDispatch({ type: "SET_WORKSPACE_LOADING", field: "workspace", value: true });

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      const data = await res.json();

      workspaceDispatch({ type: "CREATE_WORKSPACE", workspace: data.workspace });
      setViewMode("workspace");
    } catch (err) {
      workspaceDispatch({
        type: "SET_WORKSPACE_ERROR",
        field: "workspace",
        value: err instanceof Error ? err.message : "Failed to create workspace",
      });
    } finally {
      workspaceDispatch({ type: "SET_WORKSPACE_LOADING", field: "workspace", value: false });
    }
  }, []);

  // ── Workspace: Autosave ──
  useEffect(() => {
    if (!workspaceState.isDirty || !workspaceState.workspaceId) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      workspaceDispatch({ type: "SET_WORKSPACE_LOADING", field: "saving", value: true });

      try {
        await fetch(`/api/conversations/${workspaceState.workspaceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: workspaceState.title,
            platform: workspaceState.platform,
            goal: workspaceState.goal,
            language: workspaceState.language,
          }),
        });

        // Save messages
        for (const msg of workspaceState.messages) {
          if (msg.id.startsWith("temp-")) {
            await fetch(`/api/conversations/${workspaceState.workspaceId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: msg.text,
                sender: msg.sender,
                source: msg.source,
                participantId: msg.participantId,
              }),
            });
          }
        }

        workspaceDispatch({ type: "MARK_SAVED", savedAt: new Date().toISOString() });
      } catch {
        workspaceDispatch({
          type: "SET_WORKSPACE_ERROR",
          field: "save",
          value: "Failed to save changes",
        });
      } finally {
        workspaceDispatch({ type: "SET_WORKSPACE_LOADING", field: "saving", value: false });
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    workspaceState.isDirty,
    workspaceState.workspaceId,
    workspaceState.title,
    workspaceState.platform,
    workspaceState.goal,
    workspaceState.language,
    workspaceState.messages,
  ]);

  // ── Workspace: Message actions ──
  const handleAddMessage = useCallback(
    async (text: string, sender: string, participantId?: string) => {
      if (!workspaceState.workspaceId) return;

      const tempId = `temp-${Date.now()}`;
      const nextSeq = getMaxSequence(workspaceState) + 1;

      const tempMessage: WorkspaceMessage = {
        id: tempId,
        workspaceId: workspaceState.workspaceId,
        participantId: participantId || null,
        sender,
        text,
        source: "manual",
        sequence: nextSeq,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      workspaceDispatch({ type: "ADD_MESSAGE", message: tempMessage });

      try {
        const res = await fetch(`/api/conversations/${workspaceState.workspaceId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sender, source: "manual", participantId }),
        });
        if (res.ok) {
          const data = await res.json();
          workspaceDispatch({ type: "DELETE_MESSAGE", messageId: tempId });
          workspaceDispatch({ type: "ADD_MESSAGE", message: data.message });
        }
      } catch {
        // Message was added optimistically
      }
    },
    [workspaceState.workspaceId, workspaceState.messages]
  );

  const handleCommitDraft = useCallback(
    async (text: string, sender: string, participantId?: string) => {
      await handleAddMessage(text, sender, participantId);
    },
    [handleAddMessage]
  );

  const handleUpdateMessage = useCallback(
    async (messageId: string, updates: Partial<WorkspaceMessage>) => {
      workspaceDispatch({ type: "UPDATE_MESSAGE", messageId, updates });

      if (workspaceState.workspaceId && !messageId.startsWith("temp-")) {
        try {
          await fetch(
            `/api/conversations/${workspaceState.workspaceId}/messages/${messageId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            }
          );
        } catch {
          // Update was optimistic
        }
      }
    },
    [workspaceState.workspaceId]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      workspaceDispatch({ type: "DELETE_MESSAGE", messageId });

      if (workspaceState.workspaceId && !messageId.startsWith("temp-")) {
        try {
          await fetch(
            `/api/conversations/${workspaceState.workspaceId}/messages/${messageId}`,
            { method: "DELETE" }
          );
        } catch {
          // Delete was optimistic
        }
      }
    },
    [workspaceState.workspaceId]
  );

  // ── Workspace: Participant actions ──
  const handleAddParticipant = useCallback(
    async (displayName: string, role: string, language?: string) => {
      if (!workspaceState.workspaceId) return;

      try {
        const res = await fetch(
          `/api/conversations/${workspaceState.workspaceId}/participants`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName, role, language }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          workspaceDispatch({ type: "ADD_PARTICIPANT", participant: data.participant });
        }
      } catch {
        // Failed silently
      }
    },
    [workspaceState.workspaceId]
  );

  const handleUpdateParticipant = useCallback(
    async (participantId: string, updates: Partial<WorkspaceParticipant>) => {
      workspaceDispatch({ type: "UPDATE_PARTICIPANT", participantId, updates });

      if (workspaceState.workspaceId) {
        try {
          await fetch(
            `/api/conversations/${workspaceState.workspaceId}/participants/${participantId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            }
          );
        } catch {
          // Update was optimistic
        }
      }
    },
    [workspaceState.workspaceId]
  );

  const handleRemoveParticipant = useCallback(
    async (participantId: string) => {
      workspaceDispatch({ type: "REMOVE_PARTICIPANT", participantId });

      if (workspaceState.workspaceId) {
        try {
          await fetch(
            `/api/conversations/${workspaceState.workspaceId}/participants/${participantId}`,
            { method: "DELETE" }
          );
        } catch {
          // Delete was optimistic
        }
      }
    },
    [workspaceState.workspaceId]
  );

  // ── Workspace: Rename ──
  const handleRename = useCallback(
    async (title: string) => {
      workspaceDispatch({ type: "UPDATE_WORKSPACE", updates: { title }, version: workspaceState.version + 1 });

      if (workspaceState.workspaceId) {
        try {
          await fetch(`/api/conversations/${workspaceState.workspaceId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
        } catch {
          // Rename was optimistic
        }
      }
    },
    [workspaceState.workspaceId, workspaceState.version]
  );

  // ── Workspace: Delete ──
  const handleDeleteWorkspace = useCallback(async () => {
    if (!workspaceState.workspaceId) return;
    if (!confirm("Delete this conversation? This cannot be undone.")) return;

    try {
      await fetch(`/api/conversations/${workspaceState.workspaceId}`, { method: "DELETE" });
      workspaceDispatch({ type: "RESET_WORKSPACE" });
      setViewMode("list");
    } catch {
      // Failed silently
    }
  }, [workspaceState.workspaceId]);

  // ── Workspace: Back to list ──
  const handleBackToList = useCallback(() => {
    if (workspaceState.isDirty && !confirm("You have unsaved changes. Leave anyway?")) return;
    workspaceDispatch({ type: "RESET_WORKSPACE" });
    setViewMode("list");
  }, [workspaceState.isDirty]);

  // ── Screenshot handlers ──
  const handleScreenshotUpload = useCallback((file: File) => {
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleRemoveScreenshot = useCallback(() => {
    setSelectedFile(null);
    setPreview(undefined);
  }, []);

  // ── Parse conversation (into workspace) ──
  const handleScreenshotAnalyze = async () => {
    if (!selectedFile) return;
    dispatch({ type: "SET_LOADING", field: "parsing", value: true });
    dispatch({ type: "SET_ERROR", field: "parse", value: null });

    try {
      const { base64, mimeType } = await resizeImage(selectedFile);
      const res = await fetch("/api/analyze/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        dispatch({
          type: "SET_MESSAGES",
          messages: data.messages,
          context: data.context || null,
        });

        // Add parsed messages to workspace
        for (const msg of data.messages) {
          await handleAddMessage(msg.text, msg.sender === "me" ? "user" : "other");
        }

        if (data.error) {
          dispatch({ type: "SET_ERROR", field: "parse", value: data.error });
        }
        return;
      }

      if (!res.ok) throw new Error(data.error || "We couldn't analyze that screenshot. Please try a clearer image or paste the text instead.");
      if (data.error) throw new Error(data.error);
      throw new Error("No conversation found in this screenshot. Try cropping to just the chat area, or paste the text instead.");
    } catch (err) {
      dispatch({ type: "SET_ERROR", field: "parse", value: err instanceof Error ? err.message : "Failed to analyze screenshot" });
    } finally {
      dispatch({ type: "SET_LOADING", field: "parsing", value: false });
    }
  };

  const handleTextParse = async (text: string) => {
    dispatch({ type: "SET_LOADING", field: "parsing", value: true });
    dispatch({ type: "SET_ERROR", field: "parse", value: null });

    try {
      const res = await fetch("/api/analyze/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse conversation");

      dispatch({
        type: "SET_MESSAGES",
        messages: data.messages,
        context: data.context || null,
      });

      // Add parsed messages to workspace
      for (const msg of data.messages) {
        await handleAddMessage(msg.text, msg.sender === "me" ? "user" : "other");
      }
    } catch (err) {
      dispatch({ type: "SET_ERROR", field: "parse", value: err instanceof Error ? err.message : "Failed to parse conversation" });
    } finally {
      dispatch({ type: "SET_LOADING", field: "parsing", value: false });
    }
  };

  // ── Generate replies ──
  const handleGenerate = async (selectedGoal: GoalType) => {
    const reqId = nextRequestId();
    latestRequestRef.current = reqId;
    dispatch({ type: "SET_GOAL", goal: selectedGoal });
    dispatch({ type: "SET_LOADING", field: "generating", value: true });
    dispatch({ type: "SET_ERROR", field: "generate", value: null });

    const context = {
      ...(state.detectedContext || {}),
      goal: state.goalOverride || selectedGoal,
      ...(state.situationOverride && { situationOverride: state.situationOverride }),
      ...(state.styleOverride && { styleOverride: state.styleOverride }),
      ...(state.toneOverride && { toneOverride: state.toneOverride }),
      ...(state.languageOverride && { languageOverride: state.languageOverride }),
    };

    try {
      const res = await fetch("/api/replies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: state.messages,
          context: {
            ...context,
            communicationMode: state.modeSelection.mode,
          },
          userFacts: state.userFacts,
          preferences: prefs.compact || undefined,
        }),
      });

      if (reqId !== latestRequestRef.current) return;

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate replies");

      if (data.conversationState || data.intelligence?.conversationState) {
        dispatch({
          type: "SET_CONVERSATION_STATE",
          state: data.conversationState || data.intelligence.conversationState,
        });
      }

      dispatch({
        type: "SET_REPLIES",
        bestMatch: data.bestMatch,
        alternatives: data.alternatives || [],
      });

      if (data.intelligence?.recovery || data.intelligence?.conflictIntelligence) {
        dispatch({
          type: "SET_INTELLIGENCE",
          recoveryGuidance: data.intelligence.recovery || null,
          conflictIntelligence: data.intelligence.conflictIntelligence?.conflictStructure || null,
          participants: data.intelligence.conflictIntelligence?.participants || null,
        });
      }
    } catch (err) {
      if (reqId !== latestRequestRef.current) return;
      dispatch({ type: "SET_ERROR", field: "generate", value: err instanceof Error ? err.message : "We couldn't generate replies right now. Your conversation is still here — please try again." });
    } finally {
      if (reqId === latestRequestRef.current) {
        dispatch({ type: "SET_LOADING", field: "generating", value: false });
      }
    }
  };

  const handleModeChange = useCallback((mode: CommunicationMode) => {
    latestRequestRef.current = nextRequestId();
    dispatch({
      type: "SET_MODE",
      mode,
      source: mode === "auto" ? "auto" : "manual",
    });
  }, [dispatch]);

  const selectedMode = state.modeSelection.mode;
  const effectiveMode =
    selectedMode === "auto"
      ? state.modeSelection.recommendation?.mode || "general"
      : selectedMode;

  // ── Lazy: Fetch coaching ──
  const fetchCoaching = useCallback(async () => {
    if (state.messages.length === 0 || state.coaching) return;
    const reqId = nextRequestId();
    latestRequestRef.current = reqId;
    dispatch({ type: "SET_LOADING", field: "coaching", value: true });

    try {
      const res = await fetch("/api/conversation/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: state.messages }),
      });
      if (reqId !== latestRequestRef.current) return;
      const data = await res.json();
      if (res.ok && data.coaching) {
        dispatch({ type: "SET_COACHING", coaching: data.coaching });
      }
    } catch {
      // Coaching is optional
    } finally {
      if (reqId === latestRequestRef.current) {
        dispatch({ type: "SET_LOADING", field: "coaching", value: false });
      }
    }
  }, [state.messages, state.coaching]);

  // ── Lazy: Draft analysis ──
  const fetchDraftAnalysis = useCallback(async (draftText: string) => {
    if (!draftText || state.draftAnalysis) return;
    const reqId = nextRequestId();
    latestRequestRef.current = reqId;
    dispatch({ type: "SET_LOADING", field: "draftAnalysis", value: true });

    try {
      const res = await fetch("/api/draft/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: draftText,
          messages: state.messages,
          goal: state.goalOverride || state.goal,
          platform: state.detectedContext?.platform,
          userFacts: state.userFacts,
        }),
      });
      if (reqId !== latestRequestRef.current) return;
      const data = await res.json();
      if (res.ok && data.analysis) {
        dispatch({ type: "SET_DRAFT_ANALYSIS", analysis: data.analysis });
      }
    } catch {
      // Draft analysis is optional
    } finally {
      if (reqId === latestRequestRef.current) {
        dispatch({ type: "SET_LOADING", field: "draftAnalysis", value: false });
      }
    }
  }, [state.messages, state.goal, state.goalOverride, state.detectedContext, state.userFacts, state.draftAnalysis]);

  // ── Lazy: Impact prediction ──
  const fetchImpact = useCallback(async (draftText: string) => {
    if (!draftText || !state.draftAnalysis || state.impactPrediction) return;
    const reqId = nextRequestId();
    latestRequestRef.current = reqId;
    dispatch({ type: "SET_LOADING", field: "impact", value: true });

    try {
      const res = await fetch("/api/draft/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: draftText,
          messages: state.messages,
          goal: state.goalOverride || state.goal,
          platform: state.detectedContext?.platform,
          userFacts: state.userFacts,
          draftAnalysis: state.draftAnalysis,
        }),
      });
      if (reqId !== latestRequestRef.current) return;
      const data = await res.json();
      if (res.ok && data.prediction) {
        dispatch({ type: "SET_IMPACT", impact: data.prediction });
      }
    } catch {
      // Impact is optional
    } finally {
      if (reqId === latestRequestRef.current) {
        dispatch({ type: "SET_LOADING", field: "impact", value: false });
      }
    }
  }, [state.messages, state.goal, state.goalOverride, state.detectedContext, state.userFacts, state.draftAnalysis, state.impactPrediction]);

  // ── Lazy: Pre-send gate ──
  const fetchPreSendGate = useCallback(async (draftText: string, original?: string) => {
    if (!draftText || state.messages.length === 0) return;
    const reqId = nextRequestId();
    latestRequestRef.current = reqId;
    dispatch({ type: "SET_LOADING", field: "preSend", value: true });

    try {
      const res = await fetch("/api/draft/pre-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: draftText,
          originalDraft: original || originalDraft,
          messages: state.messages,
          goal: state.goalOverride || state.goal,
          platform: state.detectedContext?.platform,
          userFacts: state.userFacts,
          draftAnalysis: state.draftAnalysis,
          impactPrediction: state.impactPrediction,
        }),
      });
      if (reqId !== latestRequestRef.current) return;
      const data = await res.json();
      if (res.ok && data.gate) {
        dispatch({ type: "SET_PRE_SEND_GATE", gate: data.gate });
      }
    } catch {
      // Gate is optional
    } finally {
      if (reqId === latestRequestRef.current) {
        dispatch({ type: "SET_LOADING", field: "preSend", value: false });
      }
    }
  }, [state.messages, state.goal, state.goalOverride, state.detectedContext, state.userFacts, state.draftAnalysis, state.impactPrediction, originalDraft, state.preSendGate]);

  // ── Improvement ──
  const handleImprove = useCallback(async (mode: ImprovementMode) => {
    if (!draft || !state.draftAnalysis) return;
    const reqId = nextRequestId();
    latestRequestRef.current = reqId;
    dispatch({ type: "SET_LOADING", field: "improvement", value: true });
    dispatch({ type: "SET_ERROR", field: "improvement", value: null });

    try {
      const res = await fetch("/api/draft/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          mode,
          messages: state.messages,
          goal: state.goalOverride || state.goal,
          platform: state.detectedContext?.platform,
          userFacts: state.userFacts,
          draftAnalysis: state.draftAnalysis,
          preferences: prefs.compact || undefined,
        }),
      });
      if (reqId !== latestRequestRef.current) return;
      const data = await res.json();
      if (res.ok && data.candidates) {
        dispatch({
          type: "SET_IMPROVEMENT_CANDIDATES",
          candidates: data.candidates.map((c: ReplyCandidate) => ({ ...c })),
        });
      }
    } catch (err) {
      if (reqId !== latestRequestRef.current) return;
      dispatch({ type: "SET_ERROR", field: "improvement", value: err instanceof Error ? err.message : "We couldn't improve the message right now. Your draft is still here — please try again." });
    } finally {
      if (reqId === latestRequestRef.current) {
        dispatch({ type: "SET_LOADING", field: "improvement", value: false });
      }
    }
  }, [draft, state.messages, state.goal, state.goalOverride, state.detectedContext, state.userFacts, state.draftAnalysis]);

  // ── Tone transform ──
  const handleToneTransform = useCallback(async (tone: TargetTone, intensity: ToneIntensity) => {
    if (!draft) return;
    const reqId = nextRequestId();
    latestRequestRef.current = reqId;
    dispatch({ type: "SET_LOADING", field: "toneTransform", value: true });
    dispatch({ type: "SET_ERROR", field: "toneTransform", value: null });

    try {
      const res = await fetch("/api/draft/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          targetTone: tone,
          intensity,
          messages: state.messages,
          goal: state.goalOverride || state.goal,
          platform: state.detectedContext?.platform,
          userFacts: state.userFacts,
        }),
      });
      if (reqId !== latestRequestRef.current) return;
      const data = await res.json();
      if (res.ok && data.candidates) {
        dispatch({
          type: "SET_TONE_CANDIDATES",
          candidates: data.candidates.map((c: ReplyCandidate) => ({ ...c })),
        });
      }
    } catch (err) {
      if (reqId !== latestRequestRef.current) return;
      dispatch({ type: "SET_ERROR", field: "toneTransform", value: err instanceof Error ? err.message : "We couldn't transform the tone right now. Your message is still here — please try again." });
    } finally {
      if (reqId === latestRequestRef.current) {
        dispatch({ type: "SET_LOADING", field: "toneTransform", value: false });
      }
    }
  }, [draft, state.messages, state.goal, state.goalOverride, state.detectedContext, state.userFacts]);

  // ── Candidate selection ──
  const handleSelectCandidate = useCallback((text: string, source?: string) => {
    dispatch({ type: "SELECT_CANDIDATE", candidate: { text, strategy: source || "improved" } });
    dispatch({ type: "SET_IMPROVEMENT_CANDIDATES", candidates: [] });
    dispatch({ type: "SET_TONE_CANDIDATES", candidates: [] });
  }, []);

  // ── Feedback ──
  const handleFeedback = useCallback(async (signal: string) => {
    try {
      await fetch("/api/replies/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal,
          strategy: state.bestMatch?.strategy,
          context: state.detectedContext?.conversationType,
        }),
      });
    } catch {
      // Feedback is optional
    }
  }, [state.bestMatch, state.detectedContext]);

  // ── Copy ──
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    }
  }, []);

  // ── Reset ──
  const handleNewAnalysis = useCallback(() => {
    dispatch({ type: "RESET" });
    setShowTonePanel(false);
  }, []);

  // ── Progressive: auto-fetch coaching when conversation loads ──
  useEffect(() => {
    if (state.conversationVersion > 0 && state.messages.length > 0) {
      fetchCoaching();
    }
  }, [state.conversationVersion, state.messages.length, fetchCoaching]);

  // ── Progressive: auto-fetch draft analysis when draft is set ──
  useEffect(() => {
    if (state.draft?.draftVersion && draft) {
      fetchDraftAnalysis(draft);
    }
  }, [state.draft?.draftVersion, draft, fetchDraftAnalysis]);

  // ── Progressive: auto-fetch impact after draft analysis ──
  useEffect(() => {
    if (state.draftAnalysis && draft) {
      fetchImpact(draft);
    }
  }, [state.draftAnalysis, draft, fetchImpact]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter: trigger analyze/generate when in workspace
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (state.phase === "conversation_loaded" || state.phase === "state_analyzed") {
          if (state.goal) handleGenerate(state.goal);
        }
      }
      // Escape: close tone panel
      if (e.key === "Escape") {
        setShowTonePanel(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.phase, state.goal]);

  // ── Workspace list view ──
  if (viewMode === "list") {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analyze</h1>
          <p className="text-white/40">
            Start a conversation or continue where you left off.
          </p>
        </div>

        <WorkspaceList
          onSelect={handleLoadWorkspace}
          onCreateNew={handleCreateWorkspace}
        />
      </div>
    );
  }

  // ── Workspace view ──
  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      {/* Workspace header */}
      {workspaceState.workspaceId && (
        <div className="space-y-4">
          <button
            onClick={handleBackToList}
            className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
          >
            ← Back to conversations
          </button>

          <WorkspaceHeader
            title={workspaceState.title}
            platform={workspaceState.platform}
            goal={workspaceState.goal}
            messageCount={workspaceState.messages.length}
            participantCount={workspaceState.participants.length}
            lastActiveAt={workspaceState.lastSavedAt || new Date().toISOString()}
            isDirty={workspaceState.isDirty}
            onRename={handleRename}
            onDelete={handleDeleteWorkspace}
          />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">Communication mode</p>
                <p className="text-xs text-white/40">Choose the lens for this workspace. Your conversation and draft stay intact.</p>
              </div>
              <ModeSelector
                selection={state.modeSelection}
                onModeChange={handleModeChange}
                disabled={state.loading.parsing || state.loading.generating}
              />
            </div>
            <QuickActionsBar
              mode={effectiveMode}
              activeTone={state.toneOverride}
              onActionSelect={(tone) => dispatch({ type: "SET_OVERRIDES", toneOverride: tone })}
            />
            <ModeHelpText mode={effectiveMode} />
          </div>

          {state.modeConflict && (
            <ModeConflictBanner
              selectedMode={state.modeConflict.selectedMode}
              detectedMode={state.modeConflict.detectedMode}
              onKeepSelected={() => dispatch({ type: "DISMISS_MODE_CONFLICT" })}
              onUseDetected={() => handleModeChange(state.modeConflict!.detectedMode)}
              onDismiss={() => dispatch({ type: "DISMISS_MODE_CONFLICT" })}
            />
          )}

          {workspaceState.loading.saving && (
            <p className="text-xs text-white/30">Saving...</p>
          )}
          {workspaceState.errors.save && (
            <p className="text-xs text-red-400">{workspaceState.errors.save}</p>
          )}
        </div>
      )}

      {/* Error display */}
      {state.errors.parse && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 space-y-2">
          <p>{state.errors.parse}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-white/30">Try:</span>
            <span className="text-xs text-white/40">Clearer screenshot</span>
            <span className="text-xs text-white/20">|</span>
            <button
              onClick={() => setInputMode("text")}
              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              Paste text instead
            </button>
          </div>
        </div>
      )}

      {/* Conversation + Participants side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column: conversation + input + analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Empty state: input */}
          {workspaceState.messages.length === 0 && state.phase === "empty" && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setInputMode("screenshot")}
                  className={`px-4 py-2 rounded-xl text-sm transition-all ${
                    inputMode === "screenshot"
                      ? "bg-white text-black font-medium"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  Screenshot
                </button>
                <button
                  onClick={() => setInputMode("text")}
                  className={`px-4 py-2 rounded-xl text-sm transition-all ${
                    inputMode === "text"
                      ? "bg-white text-black font-medium"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  Paste text
                </button>
              </div>

              {inputMode === "screenshot" ? (
                <div className="space-y-4">
                  <ScreenshotUpload
                    onUpload={handleScreenshotUpload}
                    preview={preview}
                    onRemove={handleRemoveScreenshot}
                  />
                  {selectedFile && (
                    <Button onClick={handleScreenshotAnalyze} className="w-full" disabled={state.loading.parsing}>
                      {state.loading.parsing ? "Analyzing..." : "Analyze screenshot"}
                    </Button>
                  )}
                </div>
              ) : (
                <TextPasteArea onParse={handleTextParse} />
              )}
            </div>
          )}

          {/* Loading */}
          {(state.loading.parsing || state.loading.generating) && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-white/40 text-sm">
                {state.loading.parsing ? "Reading your conversation..." : "Finding the right words..."}
              </p>
              <p className="text-white/20 text-xs mt-2">
                {state.loading.parsing ? "This usually takes a few seconds" : "Analyzing context and tone"}
              </p>
              {state.messages.length > 0 && (
                <ConversationPreview messages={state.messages} />
              )}
            </div>
          )}

          {/* Conversation + goal selection */}
          {(state.phase === "conversation_loaded" || state.phase === "state_analyzed") && !state.loading.parsing && (
            <div className="space-y-6">
              <ConversationPreview messages={state.messages} />

              {state.detectedContext && (
                <div className="flex flex-wrap gap-2 text-xs text-white/30">
                  {state.detectedContext.language !== "english" && (
                    <span className="px-2 py-1 bg-white/5 rounded-lg">{state.detectedContext.language}</span>
                  )}
                  {state.detectedContext.conversationType && (
                    <span className="px-2 py-1 bg-white/5 rounded-lg">{state.detectedContext.conversationType}</span>
                  )}
                  {state.detectedContext.tone && (
                    <span className="px-2 py-1 bg-white/5 rounded-lg">{state.detectedContext.tone}</span>
                  )}
                  {state.detectedContext.platform && (
                    <span className="px-2 py-1 bg-white/5 rounded-lg">{state.detectedContext.platform}</span>
                  )}
                </div>
              )}

              {state.loading.coaching && (
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Reading the room...
                </div>
              )}

              {state.coaching && (
                <ConversationCoachDisplay coaching={state.coaching as never} />
              )}

              <GoalSelector
                selected={state.goal}
                onSelect={handleGenerate}
                recommendedGoal={recommendedGoal}
                showRecommendations={prefs.shouldShowRecommendation("strategy_preference")}
              />

              <RecoverySettings
                facts={state.userFacts.map((f, i) => ({ id: String(i), text: f }))}
                onFactsChange={(facts: UserFact[]) => dispatch({ type: "SET_OVERRIDES", userFacts: facts.map(f => f.text) })}
                situationOverride={state.situationOverride}
                onSituationChange={(v: string) => dispatch({ type: "SET_OVERRIDES", situationOverride: v })}
                goalOverride={state.goalOverride}
                onGoalChange={(v: string) => dispatch({ type: "SET_OVERRIDES", goalOverride: v })}
                styleOverride={state.styleOverride}
                onStyleChange={(v: string) => dispatch({ type: "SET_OVERRIDES", styleOverride: v })}
                toneOverride={state.toneOverride}
                onToneChange={(v: string) => dispatch({ type: "SET_OVERRIDES", toneOverride: v })}
                languageOverride={state.languageOverride}
                onLanguageChange={(v: string) => dispatch({ type: "SET_OVERRIDES", languageOverride: v })}
              />
            </div>
          )}

          {/* Results */}
          {(state.phase === "ready" || state.phase === "coached" || state.phase === "impact_analyzed" || state.phase === "draft_analyzed" || state.phase === "draft_entered") && state.bestMatch && !state.loading.generating && (
            <div className="space-y-6">
              {state.conversationState && (
                <details className="group">
                  <summary className="text-sm font-medium text-white/60 cursor-pointer hover:text-white/80 transition-colors">
                    Understanding
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs text-white/30">
                      <span>{state.conversationState.relationship}</span>
                      <span>{state.conversationState.context.type}</span>
                      <span>{state.conversationState.intent.userIntent}</span>
                      <span>{state.conversationState.language.primary}</span>
                    </div>
                  </div>
                </details>
              )}

              {state.participants && state.participants.length > 1 && (
                <ParticipantDisplay
                  participants={state.participants}
                  userId="user"
                />
              )}

              {state.conflictIntelligence && state.conflictIntelligence.conflictLevel >= 0.3 && (
                <ConflictDisplay
                  conflictLevel={state.conflictIntelligence.conflictLevel}
                  escalationTrend={state.conflictIntelligence.escalationTrend}
                  trigger={state.conflictIntelligence.trigger}
                  coreDisagreement={state.conflictIntelligence.coreDisagreement}
                  misunderstandings={state.conflictIntelligence.misunderstandings}
                  resolutionOpportunities={state.conflictIntelligence.resolutionOpportunities}
                />
              )}

              {state.recoveryGuidance && (
                <RecoveryGuidance
                  requiredElements={state.recoveryGuidance.requiredElements}
                  recommendedStrategies={state.recoveryGuidance.recommendedStrategies}
                  conflictAdjusted={state.recoveryGuidance.conflictAdjusted}
                  groupAdjusted={state.recoveryGuidance.groupAdjusted}
                />
              )}

              {state.loading.draftAnalysis && (
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Checking how your message reads...
                </div>
              )}
              {state.draftAnalysis && (
                <DraftAnalysisDisplay analysis={state.draftAnalysis} />
              )}

              {state.loading.impact && (
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Predicting how this will land...
                </div>
              )}
              {state.impactPrediction && (
                <ImpactDisplay prediction={state.impactPrediction} />
              )}

              {state.bestMatch && (
                <ReplyDisplay
                  bestMatch={state.bestMatch}
                  alternatives={state.alternatives}
                  onRegenerate={() => state.goal && handleGenerate(state.goal)}
                  onFeedback={handleFeedback}
                  context={state.detectedContext?.conversationType}
                />
              )}

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (!state.draftAnalysis && draft) {
                        fetchDraftAnalysis(draft);
                      }
                    }}
                    disabled={state.loading.draftAnalysis || !draft}
                  >
                    {state.loading.draftAnalysis ? "Analyzing..." : state.draftAnalysis ? "Improve" : "Analyze & Improve"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowTonePanel(!showTonePanel)}
                    disabled={!draft}
                  >
                    {showTonePanel ? "Hide Tone" : "Change Tone"}
                  </Button>
                </div>

                {state.draftAnalysis && state.improvementCandidates.length === 0 && (
                  <ImprovementModeSelector
                    onSelect={handleImprove}
                    isLoading={state.loading.improvement}
                    recommendedMode={recommendedMode}
                    showRecommendations={prefs.shouldShowRecommendation("improvement_mode") || prefs.shouldShowRecommendation("tone")}
                  />
                )}

                {state.improvementCandidates.length > 0 && (
                  <ImprovedReplyDisplay
                    originalDraft={originalDraft || draft}
                    candidates={state.improvementCandidates}
                    onUseOriginal={() => {/* keep current draft */}
                    }
                    onCopy={handleCopy}
                  />
                )}

                {state.errors.improvement && (
                  <p className="text-xs text-red-400">{state.errors.improvement}</p>
                )}
              </div>

              {showTonePanel && (
              <div className="space-y-4">
                {state.loading.toneTransform && (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Adjusting the tone...
                  </div>
                )}
                {state.toneTransformCandidates.length > 0 ? (
                  <ImprovedReplyDisplay
                    originalDraft={originalDraft || draft}
                    candidates={state.toneTransformCandidates}
                    onUseOriginal={() => {/* keep current draft */}
                    }
                    onCopy={handleCopy}
                  />
                ) : (
                  <ToneTransformDisplay
                    originalDraft={draft}
                    isLoading={state.loading.toneTransform}
                    error={state.errors.toneTransform || undefined}
                    onTransform={handleToneTransform}
                    onUse={(text: string) => handleSelectCandidate(text, "tone_transformed")}
                    onEdit={(text: string) => dispatch({ type: "SET_DRAFT", draft: text })}
                    onRegenerate={() => {/* re-trigger with same params */}
                    }
                  />
                )}
                {state.errors.toneTransform && (
                  <p className="text-xs text-red-400">{state.errors.toneTransform}</p>
                )}
              </div>
              )}

              {state.loading.preSend && (
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Running final check...
                </div>
              )}
              {state.preSendGate && (
                <PreSendGateDisplay
                  gate={state.preSendGate as never}
                  onImprove={() => {
                    if (draft) {
                      fetchPreSendGate(draft, originalDraft);
                    }
                  }}
                  onSendAnyway={() => {/* proceed */}
                  }
                  isImproving={state.loading.improvement}
                />
              )}

              {state.bestMatch && (
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <FeedbackWidget
                    strategy={state.bestMatch.strategy}
                    context={state.detectedContext?.conversationType}
                    onFeedback={handleFeedback}
                  />
                </div>
              )}

              {copiedText && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500/90 text-white text-sm rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
                  Copied to clipboard
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-white/5">
                <Button variant="secondary" onClick={handleNewAnalysis}>
                  New analysis
                </Button>
                {draft && !state.preSendGate && !state.loading.preSend && (
                  <Button onClick={() => fetchPreSendGate(draft, originalDraft)}>
                    Pre-send check
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side column: participants + composer + preferences */}
        <div className="space-y-6">
          <WorkspaceParticipantManager
            participants={workspaceState.participants}
            onAdd={handleAddParticipant}
            onUpdate={handleUpdateParticipant}
            onRemove={handleRemoveParticipant}
          />

          {/* Preferences Panel */}
          {prefs.settings.enabled && prefs.preferences.length > 0 && (
            <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Your Style
              </h3>
              <PreferencePanel
                dimensions={["length", "tone", "formality", "emoji", "strategy_preference"]}
                context={contextType}
                compact
                showExplanations={false}
              />
            </div>
          )}

          <FirstRunIndicator
            hasPreferences={prefs.preferences.length > 0}
            isLoading={prefs.isLoading}
          />

          <WorkspaceComposer
            onAddMessage={handleAddMessage}
            onCommitDraft={handleCommitDraft}
            participants={workspaceState.participants}
            currentDraft={draft}
          />

          {workspaceState.messages.length > 0 && (
            <WorkspaceConversation
              messages={workspaceState.messages}
              participants={workspaceState.participants}
              selectedMessageId={workspaceState.ui.selectedMessageId}
              onSelectMessage={(id) => workspaceDispatch({ type: "SELECT_MESSAGE", messageId: id })}
              onEditMessage={(id, newText) => {
                handleUpdateMessage(id, { text: newText });
              }}
              onDeleteMessage={handleDeleteMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
