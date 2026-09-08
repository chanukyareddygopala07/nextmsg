/**
 * Golden benchmark (50+ curated cases).
 *
 * End-to-end cases that test the full pipeline: tone + context + preservation.
 * These are the highest-priority cases — regression here means product regression.
 */

import type { BenchmarkCase, BenchmarkDataset, Difficulty } from "../types";

type GoldenSeed = {
  id: string;
  difficulty?: Difficulty;
  context: string;
  relationship: string;
  candidate: string;
  targetTone?: string;
  conversation?: Array<{ role: "user" | "other" | "system"; content: string }>;
  tags?: string[];
};

function seedToCase(seed: GoldenSeed): BenchmarkDataset["cases"][0] {
  return {
    id: seed.id,
    category: "golden",
    difficulty: seed.difficulty || "hard",
    context: seed.context,
    relationship: seed.relationship,
    language: "english",
    script: "latin",
    conversation: seed.conversation || [{ role: "other", content: "test" }],
    draft: seed.candidate,
    targetTone: seed.targetTone,
    expected: {
      tone: seed.targetTone,
      contextFitRequired: true,
      semanticPreservationRequired: true,
    },
    tags: seed.tags || ["golden"],
  };
}

function buildSeeds(): GoldenSeed[] {
  const seeds: GoldenSeed[] = [];
  let n = 1;
  const id = (prefix: string) => `GOLD-${prefix}-${String(n++).padStart(3, "0")}`;

  // ── Professional golden cases ──────────────────────────────────────────────
  const professional: Omit<GoldenSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "Thank you for your patience. I'll have an update for you shortly.", targetTone: "professional", tags: ["golden", "professional"] },
    { context: "professional", relationship: "coworker", candidate: "Please review the attached proposal and provide feedback by EOD.", targetTone: "professional", tags: ["golden", "professional"] },
    { context: "professional", relationship: "client", candidate: "We appreciate your business and look forward to the partnership.", targetTone: "professional", tags: ["golden", "professional"] },
    { context: "professional", relationship: "manager", candidate: "I wanted to follow up on the Q3 report we discussed last week.", targetTone: "professional", tags: ["golden", "professional"] },
    { context: "professional", relationship: "teammate", candidate: "Could you clarify the requirements for the dashboard feature?", targetTone: "professional", tags: ["golden", "professional"] },
    { context: "professional", relationship: "manager", candidate: "The deliverable is on track and we expect to meet the deadline.", targetTone: "professional", tags: ["golden", "professional"] },
  ];
  for (const seed of professional) seeds.push({ ...seed, id: id("PROF") });

  // ── Conflict resolution golden cases ───────────────────────────────────────
  const conflict: Omit<GoldenSeed, "id">[] = [
    { context: "conflict", relationship: "partner", candidate: "I understand this has been difficult, and I appreciate you sharing your feelings.", targetTone: "warm", tags: ["golden", "conflict"] },
    { context: "conflict", relationship: "coworker", candidate: "I respect your perspective. Let's find a solution that works for both of us.", targetTone: "diplomatic", tags: ["golden", "conflict"] },
    { context: "conflict", relationship: "partner", candidate: "I care about you and I want us to work through this together.", targetTone: "warm", tags: ["golden", "conflict"] },
    { context: "conflict", relationship: "friend", candidate: "I hear you. This situation has been challenging for everyone.", targetTone: "empathetic", tags: ["golden", "conflict"] },
    { context: "conflict", relationship: "partner", candidate: "Let's take a step back and approach this calmly.", targetTone: "diplomatic", tags: ["golden", "conflict"] },
    { context: "conflict", relationship: "coworker", candidate: "I understand the frustration. Let me explain my reasoning.", targetTone: "empathetic", tags: ["golden", "conflict"] },
  ];
  for (const seed of conflict) seeds.push({ ...seed, id: id("CON") });

  // ── Dating golden cases ────────────────────────────────────────────────────
  const dating: Omit<GoldenSeed, "id">[] = [
    { context: "dating", relationship: "partner", candidate: "I had such a wonderful time with you last night!", targetTone: "warm", tags: ["golden", "dating"] },
    { context: "dating", relationship: "partner", candidate: "Can't wait to see you again, you looked amazing yesterday 😊", targetTone: "flirty", tags: ["golden", "dating"] },
    { context: "dating", relationship: "partner", candidate: "I miss you already, when can we hang out again?", targetTone: "warm", tags: ["golden", "dating"] },
    { context: "dating", relationship: "partner", candidate: "That was so fun! We should definitely do that again.", targetTone: "playful", tags: ["golden", "dating"] },
    { context: "dating", relationship: "partner", candidate: "You always know how to make me smile 😊", targetTone: "flirty", tags: ["golden", "dating"] },
    { context: "dating", relationship: "partner", candidate: "I'm thinking about you, hope you're having a great day!", targetTone: "warm", tags: ["golden", "dating"] },
  ];
  for (const seed of dating) seeds.push({ ...seed, id: id("DAT") });

  // ── Recovery golden cases ──────────────────────────────────────────────────
  const recovery: Omit<GoldenSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "I take full responsibility for the delay. Here's my plan to get back on track.", targetTone: "professional", tags: ["golden", "recovery"] },
    { context: "conflict", relationship: "partner", candidate: "I'm sorry I hurt you. I understand why you're upset, and I'll do better.", targetTone: "empathetic", tags: ["golden", "recovery"] },
    { context: "professional", relationship: "client", candidate: "I apologize for the oversight. We've implemented a fix to prevent this from happening again.", targetTone: "professional", tags: ["golden", "recovery"] },
    { context: "conflict", relationship: "friend", candidate: "I was wrong. I should have listened. Let me make this right.", targetTone: "warm", tags: ["golden", "recovery"] },
    { context: "professional", relationship: "manager", candidate: "I acknowledge the mistake. Here's what we're doing to correct it immediately.", targetTone: "professional", tags: ["golden", "recovery"] },
    { context: "conflict", relationship: "partner", candidate: "I understand why you feel that way. I'm committed to changing this.", targetTone: "empathetic", tags: ["golden", "recovery"] },
  ];
  for (const seed of recovery) seeds.push({ ...seed, id: id("REC") });

  // ── Multilingual golden cases ──────────────────────────────────────────────
  const multilingual: Omit<GoldenSeed, "id">[] = [
    { context: "dating", relationship: "partner", candidate: "చాలా బాగుంది! మళ్ళీ కలవాలి.", targetTone: "warm", tags: ["golden", "multilingual", "telugu"] },
    { context: "friendship", relationship: "friend", candidate: "bahut accha laga! phir milte hain.", targetTone: "casual", tags: ["golden", "multilingual", "hindi"] },
    { context: "professional", relationship: "manager", candidate: "நன்றி, நான் இதை சரிபார்க்கிறேன்.", targetTone: "professional", tags: ["golden", "multilingual", "tamil"] },
    { context: "dating", relationship: "partner", candidate: "క్షమించండి, నేను ఆలస్యం అయ్యాను.", targetTone: "warm", tags: ["golden", "multilingual", "telugu"] },
    { context: "friendship", relationship: "friend", candidate: "aaj mast maza aa gaya! kal bhi chalte hain.", targetTone: "casual", tags: ["golden", "multilingual", "hindi"] },
  ];
  for (const seed of multilingual) seeds.push({ ...seed, id: id("MULT") });

  // ── Negotiation golden cases ───────────────────────────────────────────────
  const negotiation: Omit<GoldenSeed, "id">[] = [
    { context: "negotiation", relationship: "client", candidate: "I appreciate your position. Could we consider an alternative approach?", targetTone: "diplomatic", tags: ["golden", "negotiation"] },
    { context: "negotiation", relationship: "client", candidate: "Let's find a compromise that benefits both parties.", targetTone: "diplomatic", tags: ["golden", "negotiation"] },
    { context: "negotiation", relationship: "client", candidate: "I'd like to propose a revised offer that addresses your concerns.", targetTone: "professional", tags: ["golden", "negotiation"] },
    { context: "negotiation", relationship: "client", candidate: "The value of this partnership extends beyond the initial terms.", targetTone: "professional", tags: ["golden", "negotiation"] },
    { context: "negotiation", relationship: "client", candidate: "I suggest we consider a phased approach to meet both our needs.", targetTone: "diplomatic", tags: ["golden", "negotiation"] },
    { context: "negotiation", relationship: "client", candidate: "Perhaps we could adjust the timeline to find a fair agreement.", targetTone: "diplomatic", tags: ["golden", "negotiation"] },
  ];
  for (const seed of negotiation) seeds.push({ ...seed, id: id("NEG") });

  // ── Extended golden cases (20+ additional) ─────────────────────────────────
  const extended: Omit<GoldenSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "I wanted to update you on the project. We're on track for delivery.", targetTone: "professional", tags: ["golden", "professional", "extended"] },
    { context: "professional", relationship: "client", candidate: "Thank you for your patience. We'll have the update shortly.", targetTone: "professional", tags: ["golden", "professional", "extended"] },
    { context: "professional", relationship: "coworker", candidate: "Could we schedule a meeting to discuss the architecture?", targetTone: "professional", tags: ["golden", "professional", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I understand this is hard. Let me share how I feel.", targetTone: "empathetic", tags: ["golden", "conflict", "extended"] },
    { context: "conflict", relationship: "friend", candidate: "I hear you. This has been tough for everyone.", targetTone: "warm", tags: ["golden", "conflict", "extended"] },
    { context: "conflict", relationship: "coworker", candidate: "I respect your view. Let's find common ground.", targetTone: "diplomatic", tags: ["golden", "conflict", "extended"] },
    { context: "dating", relationship: "partner", candidate: "I really enjoyed our time together tonight.", targetTone: "warm", tags: ["golden", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "Looking forward to seeing you again soon!", targetTone: "flirty", tags: ["golden", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "You make every day better. Thank you for being you.", targetTone: "warm", tags: ["golden", "dating", "extended"] },
    { context: "professional", relationship: "manager", candidate: "I take responsibility for the oversight. Here's my correction plan.", targetTone: "professional", tags: ["golden", "recovery", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I'm sorry. I understand why you're hurt. I'll do better.", targetTone: "empathetic", tags: ["golden", "recovery", "extended"] },
    { context: "professional", relationship: "client", candidate: "I apologize for the delay. We've implemented a fix.", targetTone: "professional", tags: ["golden", "recovery", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "I understand your needs. Let me propose something that works for both.", targetTone: "diplomatic", tags: ["golden", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "We value this partnership. Here's our revised proposal.", targetTone: "professional", tags: ["golden", "negotiation", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "I miss you! Let's catch up soon over coffee.", targetTone: "warm", tags: ["golden", "friendship", "extended"] },
    { context: "family", relationship: "parent", candidate: "I love you and I'm grateful for everything.", targetTone: "warm", tags: ["golden", "family", "extended"] },
    { context: "customer", relationship: "customer", candidate: "I understand your frustration. Let me resolve this for you right away.", targetTone: "empathetic", tags: ["golden", "customer", "extended"] },
    { context: "interview", relationship: "interviewer", candidate: "I'm excited about this role and believe my skills align well.", targetTone: "professional", tags: ["golden", "interview", "extended"] },
    { context: "group", relationship: "teammate", candidate: "I'd like to share my perspective on this initiative.", targetTone: "professional", tags: ["golden", "group", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "Let's take a step back. I want to understand your perspective.", targetTone: "diplomatic", tags: ["golden", "conflict", "extended"] },
  ];
  for (const seed of extended) seeds.push({ ...seed, id: id("EXT") });

  return seeds;
}

export function getGoldenBenchmark(): BenchmarkDataset {
  const seeds = buildSeeds();
  return {
    version: "1.0",
    name: "Golden Benchmark",
    description: "End-to-end golden cases testing full pipeline: tone + context + preservation",
    createdAt: "2026-09-07",
    totalCases: seeds.length,
    categories: { golden: seeds.length } as Record<string, number>,
    difficulties: seeds.reduce(
      (acc, s) => {
        acc[s.difficulty || "hard"] = (acc[s.difficulty || "hard"] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    cases: seeds.map(seedToCase),
  };
}
