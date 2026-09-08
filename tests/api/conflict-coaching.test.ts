import { describe, it, expect } from "vitest";
import { provideConflictCoaching } from "@/lib/ai/conflict-coaching";
import type {
  ConflictCoachingInput,
  ResolutionRecord,
  RelationshipProfile,
} from "@/lib/ai/memory-types";

// ─── Conflict Coaching Tests ───────────────────────────────────────────────────
//
// Tests for:
// 1. Recurring issue detection
// 2. Assessment building
// 3. Recommended approach
// 4. Next steps
// 5. Things to avoid
// 6. Past context
// 7. Edge cases
// ──────────────────────────────────────────────────────────────────────────────

describe("Conflict Coaching", () => {
  const createInput = (
    overrides: Partial<ConflictCoachingInput> = {}
  ): ConflictCoachingInput => ({
    currentConflict: {
      level: 5,
      escalation: 0.5,
      trigger: "miscommunication",
      coreDisagreement: "project deadline",
      personalAttacks: false,
      misunderstanding: false,
    },
    userGoal: "understand",
    relevantMemory: [],
    ...overrides,
  });

  const createResolution = (
    overrides: Partial<ResolutionRecord> = {}
  ): ResolutionRecord => ({
    id: "res-1",
    userId: "user-1",
    conflictCause: "project deadline",
    resolution: "extended deadline by one week",
    confidence: 0.8,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createRelationship = (
    overrides: Partial<RelationshipProfile> = {}
  ): RelationshipProfile => ({
    id: "rel-1",
    userId: "user-1",
    relationshipType: "professional",
    communicationPreferences: ["email", "formal"],
    recurringIssues: [],
    resolvedIssues: [],
    activeIssues: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe("Recurring Issue Detection", () => {
    it("should detect similar recurring issues", () => {
      const resolution = createResolution({
        conflictCause: "project deadline delays",
      });
      const input = createInput({
        currentConflict: {
          level: 5,
          escalation: 0.5,
          trigger: "missed deadline",
          coreDisagreement: "project deadline delays",
          personalAttacks: false,
          misunderstanding: false,
        },
        relevantMemory: [resolution],
      });

      const result = provideConflictCoaching(input);

      expect(result.recurringIssue).toBeDefined();
      expect(result.recurringIssue).toContain("project deadline");
    });

    it("should not detect unrelated issues as recurring", () => {
      const resolution = createResolution({
        conflictCause: "communication style",
      });
      const input = createInput({
        currentConflict: {
          level: 5,
          escalation: 0.5,
          trigger: "missed deadline",
          coreDisagreement: "project deadline delays",
          personalAttacks: false,
          misunderstanding: false,
        },
        relevantMemory: [resolution],
      });

      const result = provideConflictCoaching(input);

      expect(result.recurringIssue).toBeUndefined();
    });

    it("should handle no memory", () => {
      const input = createInput({
        relevantMemory: [],
      });

      const result = provideConflictCoaching(input);

      expect(result.recurringIssue).toBeUndefined();
    });
  });

  describe("Assessment Building", () => {
    it("should mention escalation level", () => {
      const input = createInput({
        currentConflict: {
          level: 8,
          escalation: 0.9,
          trigger: "heated argument",
          coreDisagreement: "project scope",
          personalAttacks: false,
          misunderstanding: false,
        },
      });

      const result = provideConflictCoaching(input);

      expect(result.assessment).toContain("highly escalated");
    });

    it("should mention personal attacks", () => {
      const input = createInput({
        currentConflict: {
          level: 5,
          escalation: 0.5,
          trigger: "insult",
          coreDisagreement: "project scope",
          personalAttacks: true,
          misunderstanding: false,
        },
      });

      const result = provideConflictCoaching(input);

      expect(result.assessment).toContain("personal attacks");
    });

    it("should mention misunderstanding", () => {
      const input = createInput({
        currentConflict: {
          level: 5,
          escalation: 0.5,
          trigger: "confusion",
          coreDisagreement: "project scope",
          personalAttacks: false,
          misunderstanding: true,
        },
      });

      const result = provideConflictCoaching(input);

      expect(result.assessment).toContain("misunderstanding");
    });

    it("should mention recurring issue in assessment", () => {
      const resolution = createResolution({
        conflictCause: "project deadline",
      });
      const input = createInput({
        currentConflict: {
          level: 5,
          escalation: 0.5,
          trigger: "missed deadline",
          coreDisagreement: "project deadline",
          personalAttacks: false,
          misunderstanding: false,
        },
        relevantMemory: [resolution],
      });

      const result = provideConflictCoaching(input);

      expect(result.assessment).toContain("recurring issue");
    });
  });

  describe("Recommended Approach", () => {
    it("should suggest understanding approach for 'understand' goal", () => {
      const input = createInput({
        userGoal: "understand",
      });

      const result = provideConflictCoaching(input);

      expect(result.recommendedApproach).toContain("open-ended questions");
    });

    it("should suggest calming approach for 'calm_down' goal", () => {
      const input = createInput({
        userGoal: "calm_down",
      });

      const result = provideConflictCoaching(input);

      expect(result.recommendedApproach).toContain("calm");
    });

    it("should suggest defensive approach for 'defend' goal", () => {
      const input = createInput({
        userGoal: "defend",
      });

      const result = provideConflictCoaching(input);

      expect(result.recommendedApproach).toContain("position");
    });

    it("should suggest boundary approach for 'set_boundary' goal", () => {
      const input = createInput({
        userGoal: "set_boundary",
      });

      const result = provideConflictCoaching(input);

      expect(result.recommendedApproach).toContain("boundary");
    });

    it("should suggest apology approach for 'apologize' goal", () => {
      const input = createInput({
        userGoal: "apologize",
      });

      const result = provideConflictCoaching(input);

      expect(result.recommendedApproach).toContain("responsibility");
    });
  });

  describe("Next Steps", () => {
    it("should provide relevant next steps for understanding", () => {
      const input = createInput({
        userGoal: "understand",
      });

      const result = provideConflictCoaching(input);

      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps.some((s) => s.includes("question"))).toBe(true);
    });

    it("should provide relevant next steps for calming down", () => {
      const input = createInput({
        userGoal: "calm_down",
      });

      const result = provideConflictCoaching(input);

      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps.some((s) => s.includes("breath"))).toBe(true);
    });

    it("should suggest pause for high escalation", () => {
      const input = createInput({
        userGoal: "calm_down",
        currentConflict: {
          level: 8,
          escalation: 0.9,
          trigger: "heated argument",
          coreDisagreement: "project scope",
          personalAttacks: false,
          misunderstanding: false,
        },
      });

      const result = provideConflictCoaching(input);

      expect(result.nextSteps.some((s) => s.includes("pause"))).toBe(true);
    });
  });

  describe("Things to Avoid", () => {
    it("should always avoid personal attacks", () => {
      const input = createInput();

      const result = provideConflictCoaching(input);

      expect(
        result.thingsToAvoid.some((a) => a.includes("Personal attacks"))
      ).toBe(true);
    });

    it("should avoid escalating when escalation is high", () => {
      const input = createInput({
        currentConflict: {
          level: 8,
          escalation: 0.9,
          trigger: "heated argument",
          coreDisagreement: "project scope",
          personalAttacks: false,
          misunderstanding: false,
        },
      });

      const result = provideConflictCoaching(input);

      expect(
        result.thingsToAvoid.some((a) => a.includes("Escalating"))
      ).toBe(true);
    });

    it("should avoid responding to attacks with attacks", () => {
      const input = createInput({
        currentConflict: {
          level: 5,
          escalation: 0.5,
          trigger: "insult",
          coreDisagreement: "project scope",
          personalAttacks: true,
          misunderstanding: false,
        },
      });

      const result = provideConflictCoaching(input);

      expect(
        result.thingsToAvoid.some((a) => a.includes("Responding to personal"))
      ).toBe(true);
    });
  });

  describe("Relevant Past Context", () => {
    it("should include resolution context", () => {
      const resolution = createResolution({
        conflictCause: "project deadline",
        resolution: "extended deadline by one week",
      });
      const input = createInput({
        relevantMemory: [resolution],
      });

      const result = provideConflictCoaching(input);

      expect(result.relevantPastContext).toContain("extended deadline");
    });

    it("should include communication preference", () => {
      const resolution = createResolution({
        conflictCause: "project deadline",
        communicationPreference: "email updates",
      });
      const input = createInput({
        relevantMemory: [resolution],
      });

      const result = provideConflictCoaching(input);

      expect(result.relevantPastContext).toContain("email updates");
    });

    it("should include boundary", () => {
      const resolution = createResolution({
        conflictCause: "project deadline",
        boundaryEstablished: "no weekend work",
      });
      const input = createInput({
        relevantMemory: [resolution],
      });

      const result = provideConflictCoaching(input);

      expect(result.relevantPastContext).toContain("no weekend work");
    });

    it("should include unresolved follow-up", () => {
      const resolution = createResolution({
        conflictCause: "project deadline",
        unresolvedFollowup: "review process change",
      });
      const input = createInput({
        relevantMemory: [resolution],
      });

      const result = provideConflictCoaching(input);

      expect(result.relevantPastContext).toContain("review process change");
    });

    it("should return null when no memory", () => {
      const input = createInput({
        relevantMemory: [],
      });

      const result = provideConflictCoaching(input);

      expect(result.relevantPastContext).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty memory array", () => {
      const input = createInput({
        relevantMemory: [],
      });

      const result = provideConflictCoaching(input);

      expect(result.assessment).toBeDefined();
      expect(result.recommendedApproach).toBeDefined();
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.thingsToAvoid.length).toBeGreaterThan(0);
    });

    it("should handle high escalation", () => {
      const input = createInput({
        currentConflict: {
          level: 10,
          escalation: 1.0,
          trigger: "severe argument",
          coreDisagreement: "major disagreement",
          personalAttacks: true,
          misunderstanding: false,
        },
      });

      const result = provideConflictCoaching(input);

      expect(result.assessment).toContain("highly escalated");
    });

    it("should handle zero escalation", () => {
      const input = createInput({
        currentConflict: {
          level: 1,
          escalation: 0,
          trigger: "minor disagreement",
          coreDisagreement: "small issue",
          personalAttacks: false,
          misunderstanding: false,
        },
      });

      const result = provideConflictCoaching(input);

      expect(result.assessment).toContain("relatively calm");
    });
  });

  describe("Relationship Context", () => {
    it("should reference communication preferences", () => {
      const relationship = createRelationship({
        communicationPreferences: ["email", "formal"],
      });
      const input = createInput({
        userGoal: "reach_agreement",
        relationshipContext: relationship,
      });

      const result = provideConflictCoaching(input);

      expect(result.recommendedApproach).toContain("communication style");
    });
  });
});
