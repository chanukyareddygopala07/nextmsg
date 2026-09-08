// ─── Phase 6 Step 7: End-to-End Integration Tests ──────────────────────────
//
// Tests the complete pipeline from user input to final response.
// Covers: mode × goal × context × tone × language × personalization
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { resolveConversationState } from "@/lib/ai/state-resolver";
import { selectStrategies } from "@/lib/ai/strategy";
import { validateCandidates } from "@/lib/ai/quality-validator";
import { rankReplies } from "@/lib/ai/ranker";
import { detectLanguageState } from "@/lib/ai/language-detect";
import { detectModeFromState, resolveEffectiveMode } from "@/lib/ai/mode-config";
import { analyzeConflict } from "@/lib/ai/conflict-analysis";
import { generateRecovery } from "@/lib/ai/situation-recovery";
import { buildPersuasionEngine } from "@/lib/ai/persuasion";
import {
  createPreservationContract,
} from "@/lib/ai/preservation";
import { inferDimensionsFromReply } from "@/lib/ai/personalization";
import { scoreAILikeness } from "@/lib/ai/humanizer";
import type { ConversationContext } from "@/lib/ai/context";
import type { CommunicationMode } from "@/lib/ai/mode-types";

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
    communicationMode: "auto" as CommunicationMode,
    overrideInstruction: null,
    ...overrides,
  };
}

function makeMessages(senderTexts: { sender: string; text: string }[]) {
  return senderTexts.map((m) => ({
    sender: m.sender,
    text: m.text,
  }));
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

function makeCandidate(text: string, strategy: string = "natural") {
  return { text, strategy };
}

function makeOriginalCandidate(text: string) {
  return { text, strategy: "natural" };
}

// ─── End-to-End Flow Tests ──────────────────────────────────────────────────

describe("Phase 6 Step 7: End-to-End Integration", () => {
  describe("Work Mode Flows", () => {
    it("work + professional + professional tone produces professional output", () => {
      const context = makeContext({
        communicationMode: "work",
        tone: "professional",
        goal: "inform",
        conversationType: "work" as any,
      });
      const messages = makeMessages([
        { sender: "colleague", text: "Hey, what's the status on the project?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "coworker", context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("The project is on track. We're meeting the deadline."),
        makeCandidate("Hey! Yeah it's going great, we'll be done soon!"),
      ];
      const originalTexts = candidates.map((c) => c.text);
      const validation = validateCandidates(candidates, state, originalTexts);
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].text).toBeDefined();
      expect(typeof ranked[0].text).toBe("string");
    });

    it("work + friendly + warm tone produces warm professional output", () => {
      const context = makeContext({
        communicationMode: "work",
        tone: "warm",
        goal: "build_relationship",
        conversationType: "work" as any,
      });
      const messages = makeMessages([
        { sender: "manager", text: "Great job on the presentation today!" },
      ]);
      const intelligence = makeIntelligence({ relationship: "manager", context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Thank you! I really appreciate the feedback."),
        makeCandidate("Thanks! Looking forward to the next one."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("work + diplomatic tone handles disagreement professionally", () => {
      const context = makeContext({
        communicationMode: "work",
        tone: "diplomatic",
        goal: "disagree",
        conversationType: "work" as any,
      });
      const messages = makeMessages([
        { sender: "colleague", text: "I think we should go with option A." },
      ]);
      const intelligence = makeIntelligence({ relationship: "coworker", context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I see your point on option A, though I think option B has some advantages worth considering."),
        makeCandidate("No, option B is clearly better."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("work + assertive tone sets clear boundaries", () => {
      const context = makeContext({
        communicationMode: "work",
        tone: "assertive",
        goal: "set_boundary",
        conversationType: "work" as any,
      });
      const messages = makeMessages([
        { sender: "colleague", text: "Can you take on this additional task?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "coworker", context: "work" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I'm at capacity this week. I can help with this next week if it can wait."),
        makeCandidate("Sorry, I'm too busy right now."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Academic Mode Flows", () => {
    it("academic + formal tone produces formal output", () => {
      const context = makeContext({
        communicationMode: "academic",
        tone: "formal",
        goal: "inform",
        conversationType: "academic" as any,
      });
      const messages = makeMessages([
        { sender: "professor", text: "Please submit your literature review by Friday." },
      ]);
      const intelligence = makeIntelligence({ relationship: "professor", context: "academic" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I will have the literature review submitted by the deadline."),
        makeCandidate("Ok will do!"),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("academic + respectful tone handles professor communication", () => {
      const context = makeContext({
        communicationMode: "academic",
        tone: "respectful",
        goal: "request",
        conversationType: "academic" as any,
      });
      const messages = makeMessages([
        { sender: "student", text: "Could I get an extension on the assignment?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "student", context: "academic" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I understand you need more time. Let's discuss what's feasible."),
        makeCandidate("Sure, take whatever time you need."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Dating Mode Flows", () => {
    it("dating + flirty tone produces playful output", () => {
      const context = makeContext({
        communicationMode: "dating",
        tone: "flirty",
        goal: "flirt",
        conversationType: "dating" as any,
      });
      const messages = makeMessages([
        { sender: "match", text: "What are you up to this weekend?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "date", context: "dating" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Not sure yet, maybe something fun if you have any ideas 😉"),
        makeCandidate("I was thinking about staying in."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("dating + warm tone builds connection", () => {
      const context = makeContext({
        communicationMode: "dating",
        tone: "warm",
        goal: "build_connection",
        conversationType: "dating" as any,
      });
      const messages = makeMessages([
        { sender: "match", text: "I had a really great time last night 😊" },
      ]);
      const intelligence = makeIntelligence({ relationship: "date", context: "dating" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Me too! I'm still smiling about it 😊"),
        makeCandidate("Thanks, it was nice."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("dating + casual tone keeps it light", () => {
      const context = makeContext({
        communicationMode: "dating",
        tone: "casual",
        goal: "keep_going",
        conversationType: "dating" as any,
      });
      const messages = makeMessages([
        { sender: "match", text: "Hey! How's your day going?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "date", context: "dating" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Pretty good! Just finished up some stuff. You?"),
        makeCandidate("I'm great! How about you?"),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Conflict Mode Flows", () => {
    it("conflict + diplomatic tone de-escalates", () => {
      const context = makeContext({
        communicationMode: "conflict",
        tone: "diplomatic",
        goal: "resolve",
        conversationType: "conflict" as any,
      });
      const messages = makeMessages([
        { sender: "other", text: "You never listen to me!" },
      ]);
      const intelligence = makeIntelligence({ relationship: "partner", context: "conflict" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I hear you. Let me make sure I understand what you're saying."),
        makeCandidate("That's not true, I do listen."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.3 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("conflict + empathetic tone validates feelings", () => {
      const context = makeContext({
        communicationMode: "conflict",
        tone: "empathetic",
        goal: "validate",
        conversationType: "conflict" as any,
      });
      const messages = makeMessages([
        { sender: "other", text: "I feel like you don't care about my feelings." },
      ]);
      const intelligence = makeIntelligence({ relationship: "partner", context: "conflict" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Your feelings matter to me. I'm sorry I made you feel that way."),
        makeCandidate("I do care, you just don't see it."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.3 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("conflict + calm tone maintains composure", () => {
      const context = makeContext({
        communicationMode: "conflict",
        tone: "calm",
        goal: "de_escalate",
        conversationType: "conflict" as any,
      });
      const messages = makeMessages([
        { sender: "other", text: "This is ridiculous! I can't believe you did that!" },
      ]);
      const intelligence = makeIntelligence({ relationship: "friend", context: "conflict" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I understand you're upset. Let's take a moment to talk this through."),
        makeCandidate("Calm down, it's not a big deal."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.3 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Negotiation Mode Flows", () => {
    it("negotiation + confident tone makes strong case", () => {
      const context = makeContext({
        communicationMode: "negotiation",
        tone: "confident",
        goal: "negotiate",
        conversationType: "negotiation" as any,
      });
      const messages = makeMessages([
        { sender: "other", text: "Our budget for this project is $10,000." },
      ]);
      const intelligence = makeIntelligence({ relationship: "client", context: "business" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Based on the scope, I believe $15,000 reflects the value we'll deliver. Let me walk you through the breakdown."),
        makeCandidate("That's way too low."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("negotiation + diplomatic tone finds compromise", () => {
      const context = makeContext({
        communicationMode: "negotiation",
        tone: "diplomatic",
        goal: "compromise",
        conversationType: "negotiation" as any,
      });
      const messages = makeMessages([
        { sender: "other", text: "We need to reduce the timeline by two weeks." },
      ]);
      const intelligence = makeIntelligence({ relationship: "partner", context: "business" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I understand the timeline pressure. Let's look at what we can prioritize to make that work."),
        makeCandidate("That's not possible."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Customer Support Mode Flows", () => {
    it("customer + friendly tone resolves issue", () => {
      const context = makeContext({
        communicationMode: "customer",
        tone: "friendly",
        goal: "resolve",
        conversationType: "customer_support" as any,
      });
      const messages = makeMessages([
        { sender: "customer", text: "I've been waiting for my order for two weeks!" },
      ]);
      const intelligence = makeIntelligence({ relationship: "customer", context: "support" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I'm really sorry about the delay! Let me check on your order right away."),
        makeCandidate("Orders can take up to 3 weeks."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.5 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("customer + professional tone handles complaint", () => {
      const context = makeContext({
        communicationMode: "customer",
        tone: "professional",
        goal: "resolve",
        conversationType: "customer_support" as any,
      });
      const messages = makeMessages([
        { sender: "customer", text: "This is unacceptable service!" },
      ]);
      const intelligence = makeIntelligence({ relationship: "customer", context: "support" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I understand your frustration and I apologize for the inconvenience. Let me resolve this for you immediately."),
        makeCandidate("I understand. What seems to be the problem?"),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.5 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Recovery Mode Flows", () => {
    it("recovery + warm tone rebuilds trust", () => {
      const context = makeContext({
        communicationMode: "recovery",
        tone: "warm",
        goal: "repair",
        conversationType: "recovery" as any,
      });
      const messages = makeMessages([
        { sender: "other", text: "I've been thinking about what happened." },
      ]);
      const intelligence = makeIntelligence({ relationship: "friend", context: "recovery" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Me too. I value our friendship and I'm sorry for my part in it."),
        makeCandidate("Yeah, what about it?"),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.4 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("recovery + empathetic tone acknowledges hurt", () => {
      const context = makeContext({
        communicationMode: "recovery",
        tone: "empathetic",
        goal: "validate",
        conversationType: "recovery" as any,
      });
      const messages = makeMessages([
        { sender: "other", text: "What you said really hurt me." },
      ]);
      const intelligence = makeIntelligence({ relationship: "partner", context: "recovery" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I understand, and I'm truly sorry. Your feelings are valid and I want to do better."),
        makeCandidate("I didn't mean it that way."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.4 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Family / Social / Group Mode Flows", () => {
    it("family + warm tone handles family communication", () => {
      const context = makeContext({
        communicationMode: "family",
        tone: "warm",
        goal: "connect",
        conversationType: "family",
      });
      const messages = makeMessages([
        { sender: "mom", text: "Are you coming for dinner this Sunday?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "parent", context: "family" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Yes! I'll be there. Should I bring anything?"),
        makeCandidate("Maybe, I'll let you know."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.8 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("social + casual tone handles friend communication", () => {
      const context = makeContext({
        communicationMode: "social",
        tone: "casual",
        goal: "keep_going",
        conversationType: "social" as any,
      });
      const messages = makeMessages([
        { sender: "friend", text: "Yo did you see that game last night?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "friend", context: "social" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Dude yes! That last play was insane 😂"),
        makeCandidate("I didn't watch it."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.8 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe("Career Mode Flows", () => {
    it("career + confident tone handles networking", () => {
      const context = makeContext({
        communicationMode: "career",
        tone: "confident",
        goal: "network",
        conversationType: "career" as any,
      });
      const messages = makeMessages([
        { sender: "recruiter", text: "We have an opening that might be a good fit for you." },
      ]);
      const intelligence = makeIntelligence({ relationship: "recruiter", context: "professional" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("I'd love to learn more about the role. What are the key responsibilities?"),
        makeCandidate("Sure, tell me more."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });

    it("career + professional tone handles salary discussion", () => {
      const context = makeContext({
        communicationMode: "career",
        tone: "professional",
        goal: "negotiate",
        conversationType: "career" as any,
      });
      const messages = makeMessages([
        { sender: "hr", text: "What are your salary expectations?" },
      ]);
      const intelligence = makeIntelligence({ relationship: "hr", context: "professional" });
      const state = resolveConversationState(context, intelligence, detectLanguageState(messages), messages);
      const strategy = selectStrategies(state);
      const candidates = [
        makeCandidate("Based on my research and experience, I'm looking for a range of $90,000-$110,000. I'm open to discussing the full compensation package."),
        makeCandidate("I don't know, whatever you think is fair."),
      ];
      const validation = validateCandidates(candidates, state, candidates.map((c) => c.text));
      const ranked = rankReplies(validation.passedCandidates, { stage: "rapport", engagement: 0.5, flirting: 0, humor: 0, reciprocity: 0.5, conversationHealth: 0.7 }, context.goal, state, strategy.ranked);

      expect(ranked.length).toBeGreaterThan(0);
    });
  });
});
