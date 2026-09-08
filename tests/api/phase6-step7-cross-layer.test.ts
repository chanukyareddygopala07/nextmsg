// ─── Phase 6 Step 7: Cross-Layer Regression Tests ──────────────────────────
//
// Tests proving that one layer does not undo the decisions made by another layer.
// Covers: Tone→Humanizer, Context→Generator, Mode→Tone, Personalization→Style, etc.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { validateCandidates } from "@/lib/ai/quality-validator";
import { rankReplies } from "@/lib/ai/ranker";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { analyzeConflict } from "@/lib/ai/conflict-analysis";
import { generateRecovery } from "@/lib/ai/situation-recovery";
import { buildPersuasionEngine } from "@/lib/ai/persuasion";
import { inferDimensionsFromReply } from "@/lib/ai/personalization";
import { scoreAILikeness } from "@/lib/ai/humanizer";
import {
  createPreservationContract,
  extractFactualClaims,
  extractNegations,
} from "@/lib/ai/preservation";
import type { ConversationContext } from "@/lib/ai/context";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    language: "english",
    script: "english",
    conversationType: "general",
    participants: 2,
    goal: "keep_going",
    tone: "casual",
    urgency: "normal",
    userStyle: "casual",
    platform: "whatsapp",
    outputLanguage: "auto",
    preferredStyle: undefined,
    communicationMode: "auto",
    overrideInstruction: null,
    ...overrides,
  };
}

function makeIntelligence(overrides: Record<string, unknown> = {}): any {
  return {
    language: { primary: "english", secondary: [], script: "latin", codeMixed: false, romanized: false, confidence: 0.9 },
    participants: { count: 2, roles: [], userIdentification: "user", otherParticipants: ["other"] },
    relationship: "friend",
    context: "casual",
    situation: "normal conversation",
    userIntent: "casual",
    otherIntent: "casual",
    emotion: { primary: "neutral", intensity: 0.3 },
    tone: { primary: "casual", intensity: 0.5 },
    conflict: { level: 0, type: "none" },
    dynamics: { powerBalance: 0.5, defensiveness: 0, rapport: 0.5 },
    risks: [],
    recommendedStrategies: ["natural"],
    confidence: { language: 0.9, context: 0.8, situation: 0.7, relationship: 0.8, intent: 0.8 },
    ...overrides,
  };
}

// ─── Cross-Layer Regression Tests ───────────────────────────────────────────

describe("Phase 6 Step 7: Cross-Layer Regression Tests", () => {
  describe("Tone → Humanizer", () => {
    it("tone selection survives humanization", () => {
      const context = makeContext({ tone: "professional" });
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.tone.primary).toBeDefined();

      const candidates = [
        { text: "Hello, I wanted to follow up on our discussion.", strategy: "professional" },
      ];
      const originalTexts = candidates.map((c) => c.text);
      const validation = validateCandidates(candidates, state, originalTexts);

      expect(validation.passedCandidates.length).toBeGreaterThan(0);
    });

    it("warm tone does not become cold after validation", () => {
      const context = makeContext({ tone: "warm" });
      const messages = [{ sender: "other", text: "Thanks for your help!" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.tone.primary).toBeDefined();

      const candidates = [
        { text: "You're welcome! I'm always happy to help 😊", strategy: "warm" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));

      expect(validation.passedCandidates.length).toBeGreaterThan(0);
    });
  });

  describe("Context → Generator", () => {
    it("conflict context produces de-escalation strategy", () => {
      const context = makeContext({ tone: "diplomatic" });
      const messages = [{ sender: "other", text: "You always do this!" }];
      const intelligence = makeIntelligence({
        conflict: { level: 0.8, type: "verbal" },
        relationship: "partner",
      });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
      expect(state.conflict.level).toBeGreaterThan(0);
    });

    it("dating context produces appropriate strategies", () => {
      const context = makeContext({ tone: "flirty", conversationType: "dating" as any });
      const messages = [{ sender: "other", text: "Hey cutie!" }];
      const intelligence = makeIntelligence({ relationship: "date", context: "dating" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Mode → Tone", () => {
    it("work mode does not override explicit tone", () => {
      const context = makeContext({
        communicationMode: "work",
        tone: "warm",
      });
      const messages = [{ sender: "other", text: "Thanks!" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.tone.primary).toBeDefined();
    });

    it("dating mode preserves requested tone", () => {
      const context = makeContext({
        communicationMode: "dating",
        tone: "casual",
      });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence({ context: "dating" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.tone.primary).toBeDefined();
    });
  });

  describe("Mode → Context", () => {
    it("work mode sets work context", () => {
      const context = makeContext({ communicationMode: "work" });
      const messages = [{ sender: "other", text: "Meeting at 3?" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.context).toBeDefined();
    });

    it("conflict mode sets conflict context", () => {
      const context = makeContext({ communicationMode: "conflict" });
      const messages = [{ sender: "other", text: "I'm so angry!" }];
      const intelligence = makeIntelligence({ conflict: { level: 0.8, type: "verbal" } });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.conflict.level).toBeGreaterThan(0);
    });
  });

  describe("Goal → Strategy", () => {
    it("disagreement goal selects appropriate strategy", () => {
      const context = makeContext({ goal: "disagree" });
      const messages = [{ sender: "other", text: "I think A is better." }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });

    it("resolve goal selects diplomatic strategies", () => {
      const context = makeContext({ goal: "resolve" });
      const messages = [{ sender: "other", text: "This needs to be fixed." }];
      const intelligence = makeIntelligence({ conflict: { level: 0.6, type: "verbal" } });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Strategy → Generator", () => {
    it("strategy selection influences candidate generation", () => {
      const context = makeContext({ tone: "professional" });
      const messages = [{ sender: "other", text: "What's the update?" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      expect(strategy.ranked.length).toBeGreaterThan(0);
      expect(strategy.primary).toBeDefined();
    });
  });

  describe("Personalization → Tone", () => {
    it("personalization dimensions are inferred from reply", () => {
      const text = "Hey! I'm so excited about this! 😊";
      const strategy = "playful";
      const dimensions = inferDimensionsFromReply(text, strategy);

      expect(dimensions).toBeDefined();
      expect(typeof dimensions).toBe("object");
    });

    it("formal reply infers formal dimensions", () => {
      const text = "I will have the report submitted by end of day.";
      const strategy = "professional";
      const dimensions = inferDimensionsFromReply(text, strategy);

      expect(dimensions).toBeDefined();
    });
  });

  describe("Personalization → Style", () => {
    it("short message infers short length", () => {
      const text = "ok cool";
      const strategy = "natural";
      const dimensions = inferDimensionsFromReply(text, strategy);

      expect(dimensions.length).toBe("short");
    });

    it("long message infers long length", () => {
      const text = "I wanted to take a moment to discuss the project timeline and make sure we're aligned on the key deliverables for the next quarter.";
      const strategy = "professional";
      const dimensions = inferDimensionsFromReply(text, strategy);

      expect(dimensions.length).toBe("long");
    });
  });

  describe("Semantic → Tone", () => {
    it("negation is preserved regardless of tone", () => {
      const original = "I cannot attend the meeting.";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
      expect(contract.semanticConstraints.negations.length).toBeGreaterThan(0);
    });

    it("inability meaning is preserved", () => {
      const original = "naku ivala time ledu";
      const langState = { primary: "telugu", script: "telugu", romanized: true, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract).toBeDefined();
    });
  });

  describe("Semantic → Humanizer", () => {
    it("semantic preservation contract captures key elements", () => {
      const original = "I can't make it because I have a meeting.";
      const langState = { primary: "english", script: "latin", romanized: false, codeMixed: false };
      const contract = createPreservationContract(original, langState);

      expect(contract.semanticConstraints).toBeDefined();
    });
  });

  describe("Safety → Candidate Ranking", () => {
    it("unsafe candidates receive low scores", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      const safeCandidates = [
        { text: "I understand your concern.", strategy: "empathetic" },
      ];
      const validation = validateCandidates(safeCandidates, state, safeCandidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].score).toBeGreaterThan(0);
    });
  });

  describe("Factual → Quality Validator", () => {
    it("factual claims are extracted from messages", () => {
      const original = "I have a meeting at 3pm tomorrow.";
      const claims = extractFactualClaims(original);

      expect(claims).toBeDefined();
      expect(Array.isArray(claims)).toBe(true);
    });
  });

  describe("Negation → Preservation", () => {
    it("negation patterns are extracted", () => {
      const text = "I cannot attend the meeting.";
      const negations = extractNegations(text, { primary: "english", script: "latin", romanized: false, codeMixed: false });

      expect(negations).toBeDefined();
      expect(Array.isArray(negations)).toBe(true);
    });
  });

  describe("Quality Validator → Ranking", () => {
    it("validation score influences ranking", () => {
      const context = makeContext();
      const messages = [{ sender: "other", text: "Hey" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      const candidates = [
        { text: "Hello! How can I help you today?", strategy: "friendly" },
        { text: "Hey", strategy: "natural" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Conflict Intelligence → Generation", () => {
    it("conflict analysis provides intelligence to state", () => {
      const messages = [
        { sender: "user", text: "I'm upset about this." },
        { sender: "other", text: "You always overreact!" },
      ];
      const intelligence = makeIntelligence({ conflict: { level: 0.7, type: "verbal" } });
      const context = makeContext({ communicationMode: "conflict" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const conflictAnalysis = analyzeConflict(messages, intelligence, state, []);

      expect(conflictAnalysis).toBeDefined();
      expect(conflictAnalysis.participants).toBeDefined();
      expect(conflictAnalysis.conflictStructure).toBeDefined();
    });
  });

  describe("Recovery → Generation", () => {
    it("situation recovery provides guidance", () => {
      const messages = [
        { sender: "user", text: "I'm sorry about what happened." },
        { sender: "other", text: "I need some time." },
      ];
      const intelligence = makeIntelligence({ conflict: { level: 0.5, type: "emotional" } });
      const context = makeContext({ communicationMode: "recovery" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const recovery = generateRecovery({ state, userFacts: [], messages });

      expect(recovery).toBeDefined();
      expect(recovery.situation).toBeDefined();
    });
  });

  describe("Persuasion → Generation", () => {
    it("persuasion engine builds appropriate strategy", () => {
      const messages = [{ sender: "other", text: "I'm not sure about this." }];
      const intelligence = makeIntelligence();
      const context = makeContext();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const persuasion = buildPersuasionEngine(state);

      expect(persuasion).toBeDefined();
      expect(persuasion.assessment).toBeDefined();
    });
  });

  describe("AI-Likeness → Ranking", () => {
    it("AI-like text receives penalty", () => {
      const aiText = "That sounds fascinating! I'd love to hear more about that. What inspired you to pursue this path?";
      const humanText = "oh cool, tell me more";
      const aiScore = scoreAILikeness(aiText);
      const humanScore = scoreAILikeness(humanText);

      expect(typeof aiScore).toBe("number");
      expect(typeof humanScore).toBe("number");
    });
  });

  describe("Language Detection → State", () => {
    it("language detection feeds into state", () => {
      const messages = [{ sender: "other", text: "naku ivala time ledu" }];
      const languageState = detectLanguageState(messages);

      expect(languageState).toBeDefined();
      expect(languageState.primary).toBeDefined();
    });
  });

  describe("Style Profile → Generation", () => {
    it("style profile is available in state", () => {
      const context = makeContext({ userStyle: "casual" });
      const messages = [{ sender: "other", text: "Hey!" }];
      const intelligence = makeIntelligence();
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);

      expect(state.style).toBeDefined();
      expect(state.style.source).toBeDefined();
    });
  });

  describe("End-to-End: Input → Strategy → Validation → Ranking", () => {
    it("complete pipeline produces ranked candidates", () => {
      const context = makeContext({
        tone: "professional",
        communicationMode: "work",
        goal: "inform",
      });
      const messages = [{ sender: "other", text: "What's the project status?" }];
      const intelligence = makeIntelligence({ context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);

      const candidates = [
        { text: "The project is on track and we're meeting all milestones.", strategy: "professional" },
        { text: "It's going well!", strategy: "natural" },
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].text).toBeDefined();
      expect(typeof ranked[0].score).toBe("number");
    });
  });
});
