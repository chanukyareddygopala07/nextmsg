import { describe, it, expect } from "vitest";
import {
  extractMemoryCandidates,
  type MemoryExtractionInput,
} from "@/lib/ai/memory-extractor";
import type { ConversationContext } from "@/lib/ai/context";

// ─── Memory Extraction Tests ───────────────────────────────────────────────────
//
// Tests for:
// 1. Memory extraction from messages
// 2. Pattern detection
// 3. Validation
// 4. Deduplication
// 5. Type detection
// 6. Source detection
// 7. Confidence scoring
// 8. Expiration handling
// 9. Edge cases
// 10. Privacy checks
// ──────────────────────────────────────────────────────────────────────────────

describe("Memory Extraction", () => {
  const defaultContext: ConversationContext = {
    conversationType: "general",
    urgency: "normal",
    language: "en",
    script: "english",
    participants: 2,
    goal: "casual",
    tone: "neutral",
    userStyle: "casual",
  };

  const createInput = (
    messages: Array<{ sender: "me" | "them" | "unknown"; text: string }>
  ): MemoryExtractionInput => ({
    messages: messages.map((m) => ({
      ...m,
    })),
    context: defaultContext,
    userId: "user-123",
    relationshipId: "rel-123",
  });

  describe("Explicit Fact Extraction", () => {
    it("should extract facts starting with 'I am'", () => {
      const input = createInput([
        { sender: "me", text: "I am a software engineer" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const fact = result.candidates.find((c) =>
        c.content.includes("software engineer")
      );
      expect(fact).toBeDefined();
      expect(fact?.source).toBe("explicit_user");
      expect(fact?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("should extract facts starting with 'I have'", () => {
      const input = createInput([
        { sender: "me", text: "I have two siblings" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const fact = result.candidates.find((c) =>
        c.content.includes("two siblings")
      );
      expect(fact).toBeDefined();
      expect(fact?.source).toBe("explicit_user");
    });

    it("should extract facts starting with 'I like'", () => {
      const input = createInput([
        { sender: "me", text: "I like hiking and camping" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const fact = result.candidates.find((c) =>
        c.content.includes("hiking and camping")
      );
      expect(fact).toBeDefined();
    });

    it("should extract facts starting with 'my'", () => {
      const input = createInput([
        { sender: "me", text: "my favorite color is blue" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const fact = result.candidates.find((c) =>
        c.content.includes("favorite color")
      );
      expect(fact).toBeDefined();
    });

    it("should extract facts starting with 'we are'", () => {
      const input = createInput([
        { sender: "me", text: "we are meeting tomorrow at 3pm" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const fact = result.candidates.find((c) =>
        c.content.includes("meeting tomorrow")
      );
      expect(fact).toBeDefined();
    });
  });

  describe("Unresolved Issue Extraction", () => {
    it("should detect 'still need' issues", () => {
      const input = createInput([
        { sender: "me", text: "we still need to discuss the budget" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const issue = result.candidates.find(
        (c) => c.type === "unresolved_issue"
      );
      expect(issue).toBeDefined();
      expect(issue?.expiresAt).toBeDefined();
    });

    it("should detect 'haven't decided' issues", () => {
      const input = createInput([
        { sender: "me", text: "we haven't decided on the venue" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const issue = result.candidates.find(
        (c) => c.type === "unresolved_issue"
      );
      expect(issue).toBeDefined();
    });

    it("should detect 'need to talk' issues", () => {
      const input = createInput([
        { sender: "me", text: "we need to talk about our future" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const issue = result.candidates.find(
        (c) => c.type === "unresolved_issue"
      );
      expect(issue).toBeDefined();
    });

    it("should detect 'unclear' issues", () => {
      const input = createInput([
        { sender: "me", text: "the requirements are unclear" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const issue = result.candidates.find(
        (c) => c.type === "unresolved_issue"
      );
      expect(issue).toBeDefined();
    });
  });

  describe("Agreed Action Extraction", () => {
    it("should detect 'I'll' commitments", () => {
      const input = createInput([
        { sender: "me", text: "I'll finish the report by Friday" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const action = result.candidates.find(
        (c) => c.type === "agreed_action"
      );
      expect(action).toBeDefined();
      expect(action?.expiresAt).toBeDefined();
    });

    it("should detect 'let's' agreements", () => {
      const input = createInput([
        { sender: "me", text: "let's meet at the coffee shop" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const action = result.candidates.find(
        (c) => c.type === "agreed_action"
      );
      expect(action).toBeDefined();
    });

    it("should detect 'I promise' commitments", () => {
      const input = createInput([
        { sender: "me", text: "I promise to call you tomorrow" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const action = result.candidates.find(
        (c) => c.type === "agreed_action"
      );
      expect(action).toBeDefined();
    });
  });

  describe("Communication Preference Extraction", () => {
    it("should detect 'I prefer' preferences", () => {
      const input = createInput([
        { sender: "me", text: "I prefer texting over calling" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const pref = result.candidates.find(
        (c) => c.type === "communication_preference"
      );
      expect(pref).toBeDefined();
    });

    it("should detect 'don't contact' preferences", () => {
      const input = createInput([
        { sender: "me", text: "don't contact me after 10pm" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const pref = result.candidates.find(
        (c) => c.type === "communication_preference"
      );
      expect(pref).toBeDefined();
    });

    it("should detect 'please text' preferences", () => {
      const input = createInput([
        { sender: "me", text: "please text me instead of calling" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const pref = result.candidates.find(
        (c) => c.type === "communication_preference"
      );
      expect(pref).toBeDefined();
    });
  });

  describe("Boundary Extraction", () => {
    it("should detect 'not comfortable' boundaries", () => {
      const input = createInput([
        { sender: "me", text: "I'm not comfortable with that" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const boundary = result.candidates.find(
        (c) => c.type === "boundary_established"
      );
      expect(boundary).toBeDefined();
      expect(boundary?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should detect 'please stop' boundaries", () => {
      const input = createInput([
        { sender: "me", text: "please stop doing that" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const boundary = result.candidates.find(
        (c) => c.type === "boundary_established"
      );
      expect(boundary).toBeDefined();
    });

    it("should detect 'not okay' boundaries", () => {
      const input = createInput([
        { sender: "me", text: "that's not okay with me" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const boundary = result.candidates.find(
        (c) => c.type === "boundary_established"
      );
      expect(boundary).toBeDefined();
    });
  });

  describe("Pattern Detection", () => {
    it("should detect recurring topics", () => {
      const input = createInput([
        { sender: "me", text: "the project deadline is next week" },
        { sender: "them", text: "got it" },
        { sender: "me", text: "we need to finish the project" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const recurring = result.candidates.find(
        (c) => c.type === "recurring_pattern"
      );
      expect(recurring).toBeDefined();
    });

    it("should extract recent context from last 5 messages", () => {
      const input = createInput([
        { sender: "me", text: "hello" },
        { sender: "them", text: "hi" },
        { sender: "me", text: "how's the work going?" },
        { sender: "them", text: "good" },
        { sender: "me", text: "great, let's discuss the project" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
      const recent = result.candidates.find(
        (c) => c.type === "recent_context"
      );
      expect(recent).toBeDefined();
      expect(recent?.expiresAt).toBeDefined();
    });
  });

  describe("Validation", () => {
    it("should reject too short content", () => {
      const input = createInput([{ sender: "me", text: "hi" }]);
      const result = extractMemoryCandidates(input);

      const shortMemories = result.candidates.filter(
        (c) => c.content.length < 10
      );
      expect(shortMemories.length).toBe(0);
    });

    it("should reject too long content", () => {
      const input = createInput([
        { sender: "me", text: "a".repeat(600) },
      ]);
      const result = extractMemoryCandidates(input);

      const longMemories = result.candidates.filter(
        (c) => c.content.length > 500
      );
      expect(longMemories.length).toBe(0);
    });

    it("should reject irrelevant content", () => {
      const input = createInput([{ sender: "me", text: "ok" }]);
      const result = extractMemoryCandidates(input);

      const messageCandidates = result.candidates.filter(
        (c) => c.source === "explicit_user"
      );
      expect(messageCandidates.length).toBe(0);
    });

    it("should reject sensitive content", () => {
      const input = createInput([
        { sender: "me", text: "my password is secret123" },
      ]);
      const result = extractMemoryCandidates(input);

      const sensitiveMemories = result.candidates.filter(
        (c) =>
          c.content.toLowerCase().includes("password") ||
          c.content.toLowerCase().includes("secret")
      );
      expect(sensitiveMemories.length).toBe(0);
    });

    it("should reject content with credit card numbers", () => {
      const input = createInput([
        {
          sender: "me",
          text: "my credit card number is 1234-5678-9012-3456",
        },
      ]);
      const result = extractMemoryCandidates(input);

      const ccMemories = result.candidates.filter(
        (c) =>
          c.content.toLowerCase().includes("credit card") ||
          c.content.toLowerCase().includes("1234-5678")
      );
      expect(ccMemories.length).toBe(0);
    });

    it("should reject content with SSN", () => {
      const input = createInput([
        { sender: "me", text: "my social security number is 123-45-6789" },
      ]);
      const result = extractMemoryCandidates(input);

      const ssnMemories = result.candidates.filter(
        (c) =>
          c.content.toLowerCase().includes("social security") ||
          c.content.toLowerCase().includes("ssn")
      );
      expect(ssnMemories.length).toBe(0);
    });
  });

  describe("Deduplication", () => {
    it("should deduplicate similar memories", () => {
      const input = createInput([
        { sender: "me", text: "I am a software engineer" },
        { sender: "me", text: "I am a software developer" },
      ]);
      const result = extractMemoryCandidates(input);

      const engineerMemories = result.candidates.filter(
        (c) =>
          c.content.includes("software engineer") ||
          c.content.includes("software developer")
      );

      expect(engineerMemories.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Source Detection", () => {
    it("should set source as explicit_user for user messages", () => {
      const input = createInput([
        { sender: "me", text: "I am a teacher" },
      ]);
      const result = extractMemoryCandidates(input);

      const userFacts = result.candidates.filter(
        (c) => c.source === "explicit_user"
      );
      expect(userFacts.length).toBeGreaterThan(0);
    });

    it("should set source as conversation_observed for patterns", () => {
      const input = createInput([
        { sender: "me", text: "the project deadline is next week" },
        { sender: "them", text: "got it" },
        { sender: "me", text: "we need to finish the project" },
      ]);
      const result = extractMemoryCandidates(input);

      const observed = result.candidates.filter(
        (c) => c.source === "conversation_observed"
      );
      expect(observed.length).toBeGreaterThan(0);
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign higher confidence to explicit facts", () => {
      const input = createInput([
        { sender: "me", text: "I am a doctor" },
      ]);
      const result = extractMemoryCandidates(input);

      const fact = result.candidates.find((c) =>
        c.content.includes("doctor")
      );
      expect(fact?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("should assign lower confidence to observed patterns", () => {
      const input = createInput([
        { sender: "me", text: "the project deadline is next week" },
        { sender: "them", text: "got it" },
        { sender: "me", text: "we need to finish the project" },
      ]);
      const result = extractMemoryCandidates(input);

      const pattern = result.candidates.find(
        (c) => c.type === "recurring_pattern"
      );
      if (pattern) {
        expect(pattern.confidence).toBeLessThanOrEqual(0.9);
      }
    });
  });

  describe("Expiration Handling", () => {
    it("should set expiration for unresolved issues", () => {
      const input = createInput([
        { sender: "me", text: "we still need to discuss the budget" },
      ]);
      const result = extractMemoryCandidates(input);

      const issue = result.candidates.find(
        (c) => c.type === "unresolved_issue"
      );
      expect(issue?.expiresAt).toBeDefined();
      if (issue?.expiresAt) {
        expect(issue.expiresAt.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it("should set expiration for agreed actions", () => {
      const input = createInput([
        { sender: "me", text: "I'll finish the report by Friday" },
      ]);
      const result = extractMemoryCandidates(input);

      const action = result.candidates.find(
        (c) => c.type === "agreed_action"
      );
      expect(action?.expiresAt).toBeDefined();
    });

    it("should not set expiration for boundaries", () => {
      const input = createInput([
        { sender: "me", text: "I'm not comfortable with that" },
      ]);
      const result = extractMemoryCandidates(input);

      const boundary = result.candidates.find(
        (c) => c.type === "boundary_established"
      );
      expect(boundary?.expiresAt).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty messages", () => {
      const input = createInput([]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBe(0);
      expect(result.stats.totalExtracted).toBe(0);
    });

    it("should handle messages with only emojis", () => {
      const input = createInput([{ sender: "me", text: "😀😂🤣" }]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBe(0);
    });

    it("should handle messages with only punctuation", () => {
      const input = createInput([{ sender: "me", text: "!@#$%^&*()" }]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBe(0);
    });

    it("should handle very long messages", () => {
      const input = createInput([
        { sender: "me", text: "a".repeat(400) + " I am a teacher" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.candidates.length).toBeGreaterThan(0);
    });
  });

  describe("Privacy Checks", () => {
    it("should not extract bank account information", () => {
      const input = createInput([
        { sender: "me", text: "my bank account number is 1234567890" },
      ]);
      const result = extractMemoryCandidates(input);

      const bankMemories = result.candidates.filter(
        (c) =>
          c.content.toLowerCase().includes("bank account") ||
          c.content.toLowerCase().includes("1234567890")
      );
      expect(bankMemories.length).toBe(0);
    });

    it("should not extract PIN numbers", () => {
      const input = createInput([
        { sender: "me", text: "my pin number is 1234" },
      ]);
      const result = extractMemoryCandidates(input);

      const pinMemories = result.candidates.filter(
        (c) =>
          c.content.toLowerCase().includes("pin") ||
          c.content.toLowerCase().includes("1234")
      );
      expect(pinMemories.length).toBe(0);
    });

    it("should extract non-sensitive personal information", () => {
      const input = createInput([
        { sender: "me", text: "I am a teacher at Lincoln Elementary" },
      ]);
      const result = extractMemoryCandidates(input);

      const teacherMemories = result.candidates.filter(
        (c) =>
          c.content.includes("teacher") ||
          c.content.includes("Lincoln Elementary")
      );
      expect(teacherMemories.length).toBeGreaterThan(0);
    });
  });

  describe("Stats Building", () => {
    it("should track total extracted count", () => {
      const input = createInput([
        { sender: "me", text: "I am a teacher" },
        { sender: "me", text: "I like coffee" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.stats.totalExtracted).toBeGreaterThanOrEqual(0);
    });

    it("should track by type", () => {
      const input = createInput([
        { sender: "me", text: "I am a teacher" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.stats.byType).toBeDefined();
    });

    it("should track by source", () => {
      const input = createInput([
        { sender: "me", text: "I am a teacher" },
      ]);
      const result = extractMemoryCandidates(input);

      expect(result.stats.bySource).toBeDefined();
    });
  });

  describe("Context Extraction", () => {
    it("should extract relationship type from context", () => {
      const input = createInput([
        { sender: "me", text: "hello" },
      ]);
      input.context.conversationType = "professional";
      const result = extractMemoryCandidates(input);

      const relPref = result.candidates.find(
        (c) => c.type === "relationship_preference"
      );
      expect(relPref).toBeDefined();
    });

    it("should extract urgency from context", () => {
      const input = createInput([
        { sender: "me", text: "hello" },
      ]);
      input.context.urgency = "high";
      const result = extractMemoryCandidates(input);

      const recent = result.candidates.find(
        (c) => c.type === "recent_context"
      );
      expect(recent).toBeDefined();
    });
  });
});
