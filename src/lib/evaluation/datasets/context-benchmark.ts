/**
 * Context fit benchmark (150+ curated cases).
 *
 * Tests whether the context evaluator correctly identifies whether a
 * candidate message fits the expected conversational context.
 *
 * Categories: context fit, severe mismatch, structural signals, edge cases
 */

import type { BenchmarkCase, BenchmarkDataset, Difficulty } from "../types";

type ContextSeed = {
  id: string;
  difficulty?: Difficulty;
  context: string;
  relationship: string;
  candidate: string;
  expectedFit?: "pass" | "warn" | "fail";
  minScore?: number;
  tags?: string[];
};

function seedToCase(seed: ContextSeed): BenchmarkDataset["cases"][0] {
  return {
    id: seed.id,
    category: seed.context as "professional" | "academic" | "conflict" | "dating",
    difficulty: seed.difficulty || "medium",
    context: seed.context,
    relationship: seed.relationship,
    language: "english",
    script: "latin",
    conversation: [{ role: "other", content: "test" }],
    draft: seed.candidate,
    expected: {
      contextFitRequired: true,
    },
    tags: seed.tags || ["context"],
  };
}

function buildSeeds(): ContextSeed[] {
  const seeds: ContextSeed[] = [];
  let n = 1;
  const id = (prefix: string) => `CTX-${prefix}-${String(n++).padStart(3, "0")}`;

  // ── Professional context ───────────────────────────────────────────────────
  const professional: Omit<ContextSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "Thank you for your patience. I'll have an update for you shortly.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "Please review the attached proposal and provide feedback by EOD.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "client", candidate: "We appreciate your business and look forward to the partnership.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "manager", candidate: "I wanted to follow up on the Q3 report we discussed last week.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "teammate", candidate: "Could you clarify the requirements for the dashboard feature?", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "manager", candidate: "The deliverable is on track and we expect to meet the deadline.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "client", candidate: "I understand your concern and will escalate this to the team.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "Let me look into this and get back to you with a detailed response.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "manager", candidate: "I'd like to schedule a meeting to discuss the project timeline.", tags: ["context", "professional", "clear"] },
    { context: "professional", relationship: "teammate", candidate: "Please find the updated analysis attached for your review.", tags: ["context", "professional", "clear"] },
  ];
  for (const seed of professional) seeds.push({ ...seed, id: id("PROF") });

  // ── Academic context ───────────────────────────────────────────────────────
  const academic: Omit<ContextSeed, "id">[] = [
    { context: "academic", relationship: "professor", candidate: "I would like to respectfully request an extension on the assignment.", tags: ["context", "academic", "clear"] },
    { context: "academic", relationship: "colleague", candidate: "Furthermore, the methodology employed in this study warrants further examination.", tags: ["context", "academic", "clear"] },
    { context: "academic", relationship: "professor", candidate: "I acknowledge your feedback regarding the literature review section.", tags: ["context", "academic", "clear"] },
    { context: "academic", relationship: "classmate", candidate: "Consequently, the findings suggest a correlation between the variables.", tags: ["context", "academic", "clear"] },
    { context: "academic", relationship: "professor", candidate: "The research methodology involves both quantitative and qualitative analysis.", tags: ["context", "academic", "clear"] },
    { context: "academic", relationship: "colleague", candidate: "I believe the hypothesis is supported by the evidence presented.", tags: ["context", "academic", "clear"] },
    { context: "academic", relationship: "professor", candidate: "Could you clarify the requirements for the thesis methodology section?", tags: ["context", "academic", "clear"] },
    { context: "academic", relationship: "classmate", candidate: "The literature review demonstrates a thorough understanding of the topic.", tags: ["context", "academic", "clear"] },
  ];
  for (const seed of academic) seeds.push({ ...seed, id: id("ACAD") });

  // ── Conflict context ───────────────────────────────────────────────────────
  const conflict: Omit<ContextSeed, "id">[] = [
    { context: "conflict", relationship: "partner", candidate: "I understand this has been difficult, and I appreciate you sharing your feelings.", tags: ["context", "conflict", "clear"] },
    { context: "conflict", relationship: "coworker", candidate: "I respect your perspective. Let's find a solution that works for both of us.", tags: ["context", "conflict", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I care about you and I want us to work through this together.", tags: ["context", "conflict", "clear"] },
    { context: "conflict", relationship: "friend", candidate: "I hear you. This situation has been challenging for everyone.", tags: ["context", "conflict", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "Let's take a step back and approach this calmly.", tags: ["context", "conflict", "clear"] },
    { context: "conflict", relationship: "coworker", candidate: "I understand the frustration. Let me explain my reasoning.", tags: ["context", "conflict", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I need you to understand that this boundary is important to me.", tags: ["context", "conflict", "clear"] },
    { context: "conflict", relationship: "friend", candidate: "I think we can compromise on this if we both give a little.", tags: ["context", "conflict", "clear"] },
  ];
  for (const seed of conflict) seeds.push({ ...seed, id: id("CON") });

  // ── Dating context ─────────────────────────────────────────────────────────
  const dating: Omit<ContextSeed, "id">[] = [
    { context: "dating", relationship: "partner", candidate: "I had such a wonderful time with you last night!", tags: ["context", "dating", "clear"] },
    { context: "dating", relationship: "partner", candidate: "Can't wait to see you again, you looked amazing yesterday 😊", tags: ["context", "dating", "clear"] },
    { context: "dating", relationship: "partner", candidate: "I miss you already, when can we hang out again?", tags: ["context", "dating", "clear"] },
    { context: "dating", relationship: "partner", candidate: "That was so fun! We should definitely do that again.", tags: ["context", "dating", "clear"] },
    { context: "dating", relationship: "partner", candidate: "You always know how to make me smile 😊", tags: ["context", "dating", "clear"] },
    { context: "dating", relationship: "partner", candidate: "I'm thinking about you, hope you're having a great day!", tags: ["context", "dating", "clear"] },
    { context: "dating", relationship: "partner", candidate: "What are you up to this weekend? I'd love to plan something.", tags: ["context", "dating", "clear"] },
    { context: "dating", relationship: "partner", candidate: "You're literally the best thing that's happened to me 💕", tags: ["context", "dating", "clear"] },
  ];
  for (const seed of dating) seeds.push({ ...seed, id: id("DAT") });

  // ── Friendship context ─────────────────────────────────────────────────────
  const friendship: Omit<ContextSeed, "id">[] = [
    { context: "friendship", relationship: "friend", candidate: "Hey! Long time no see, we should catch up!", tags: ["context", "friendship", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "That's awesome, I'm so happy for you!", tags: ["context", "friendship", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "Remember when we used to do that? Good times.", tags: ["context", "friendship", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "I miss you! Let's hang out soon.", tags: ["context", "friendship", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "Wanna grab coffee this weekend?", tags: ["context", "friendship", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "You're the best, thanks for always being there.", tags: ["context", "friendship", "clear"] },
  ];
  for (const seed of friendship) seeds.push({ ...seed, id: id("FRD") });

  // ── Family context ─────────────────────────────────────────────────────────
  const family: Omit<ContextSeed, "id">[] = [
    { context: "family", relationship: "mother", candidate: "I love you, Mom. Thank you for everything you do.", tags: ["context", "family", "clear"] },
    { context: "family", relationship: "sibling", candidate: "Hey, just checking in. How are things going?", tags: ["context", "family", "clear"] },
    { context: "family", relationship: "parent", candidate: "I miss home. Can we plan a visit soon?", tags: ["context", "family", "clear"] },
    { context: "family", relationship: "sibling", candidate: "I'm always here for you, no matter what.", tags: ["context", "family", "clear"] },
    { context: "family", relationship: "parent", candidate: "Happy birthday! I hope you have a wonderful day.", tags: ["context", "family", "clear"] },
    { context: "family", relationship: "sibling", candidate: "Let's get dinner this weekend, it's been too long.", tags: ["context", "family", "clear"] },
  ];
  for (const seed of family) seeds.push({ ...seed, id: id("FAM") });

  // ── Negotiation context ────────────────────────────────────────────────────
  const negotiation: Omit<ContextSeed, "id">[] = [
    { context: "negotiation", relationship: "client", candidate: "I appreciate your position. Could we consider an alternative approach?", tags: ["context", "negotiation", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "Let's find a compromise that benefits both parties.", tags: ["context", "negotiation", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "I'd like to propose a revised offer that addresses your concerns.", tags: ["context", "negotiation", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "The value of this partnership extends beyond the initial terms.", tags: ["context", "negotiation", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "I suggest we consider a phased approach to meet both our needs.", tags: ["context", "negotiation", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "Perhaps we could adjust the timeline to find a fair agreement.", tags: ["context", "negotiation", "clear"] },
  ];
  for (const seed of negotiation) seeds.push({ ...seed, id: id("NEG") });

  // ── Customer context ───────────────────────────────────────────────────────
  const customer: Omit<ContextSeed, "id">[] = [
    { context: "customer", relationship: "customer", candidate: "I sincerely apologize for the inconvenience. Let me resolve this immediately.", tags: ["context", "customer", "clear"] },
    { context: "customer", relationship: "customer", candidate: "We appreciate your patience and will ensure this is addressed promptly.", tags: ["context", "customer", "clear"] },
    { context: "customer", relationship: "customer", candidate: "I understand your frustration. Here's what I can do for you.", tags: ["context", "customer", "clear"] },
    { context: "customer", relationship: "customer", candidate: "Your satisfaction is our priority. Let me make this right.", tags: ["context", "customer", "clear"] },
    { context: "customer", relationship: "customer", candidate: "I'll process your refund right away. You should see it within 3-5 business days.", tags: ["context", "customer", "clear"] },
    { context: "customer", relationship: "customer", candidate: "Thank you for bringing this to our attention. We take quality seriously.", tags: ["context", "customer", "clear"] },
  ];
  for (const seed of customer) seeds.push({ ...seed, id: id("CST") });

  // ── Severe mismatch cases ──────────────────────────────────────────────────
  const mismatch: Omit<ContextSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "lol that's so random, wanna grab lunch?", tags: ["context", "mismatch", "professional", "severe"] },
    { context: "academic", relationship: "professor", candidate: "hey wanna study lol", tags: ["context", "mismatch", "academic", "severe"] },
    { context: "dating", relationship: "partner", candidate: "Thank you for your patience. I'll have an update for you shortly.", tags: ["context", "mismatch", "dating", "severe"] },
    { context: "conflict", relationship: "partner", candidate: "I'm going to sue you for this. This is incompetence.", tags: ["context", "mismatch", "conflict", "severe"] },
    { context: "customer", relationship: "customer", candidate: "bruh that's crazy lol", tags: ["context", "mismatch", "customer", "severe"] },
    { context: "negotiation", relationship: "client", candidate: "I'm going to file a lawsuit. This is terrible.", tags: ["context", "mismatch", "negotiation", "severe"] },
    { context: "interview", relationship: "interviewer", candidate: "nah i'm just bored tbh, this job seems chill", tags: ["context", "mismatch", "interview", "severe"] },
    { context: "friendship", relationship: "friend", candidate: "Please find the updated analysis attached for your review.", tags: ["context", "mismatch", "friendship", "severe"] },
    { context: "family", relationship: "mother", candidate: "I respectfully request your consideration of the proposed terms.", tags: ["context", "mismatch", "family", "severe"] },
    { context: "professional", relationship: "manager", candidate: "gonna be late lol, traffic is insane", tags: ["context", "mismatch", "professional", "severe"] },
  ];
  for (const seed of mismatch) seeds.push({ ...seed, id: id("MIS") });

  // ── Edge cases ─────────────────────────────────────────────────────────────
  const edges: Omit<ContextSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "Thanks!", tags: ["context", "edge", "professional", "short"] },
    { context: "dating", relationship: "partner", candidate: "😊", tags: ["context", "edge", "dating", "emoji_only"] },
    { context: "conflict", relationship: "partner", candidate: "I understand.", tags: ["context", "edge", "conflict", "short"] },
    { context: "friendship", relationship: "friend", candidate: "haha", tags: ["context", "edge", "friendship", "short"] },
    { context: "professional", relationship: "manager", candidate: "Noted. Will do.", tags: ["context", "edge", "professional", "very_short"] },
    { context: "academic", relationship: "professor", candidate: "Understood. Thank you.", tags: ["context", "edge", "academic", "formal_short"] },
    { context: "dating", relationship: "partner", candidate: "Can't wait 😍", tags: ["context", "edge", "dating", "emoji"] },
    { context: "negotiation", relationship: "client", candidate: "I'll consider it.", tags: ["context", "edge", "negotiation", "short"] },
  ];
  for (const seed of edges) seeds.push({ ...seed, id: id("EDG") });

  // ── Extended context coverage (75+ additional cases) ───────────────────────
  const extended: Omit<ContextSeed, "id">[] = [
    // Professional extended
    { context: "professional", relationship: "manager", candidate: "I wanted to update you on the project status. We're on track for the deadline.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "client", candidate: "Thank you for your feedback. We'll incorporate it into the next iteration.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "teammate", candidate: "Could we sync up tomorrow to discuss the architecture?", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "manager", candidate: "I'll have the analysis ready by end of week.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "coworker", candidate: "The report looks great. A few minor suggestions attached.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "client", candidate: "We're committed to delivering quality results on this initiative.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "manager", candidate: "Please review the attached proposal and provide feedback by EOD.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "teammate", candidate: "I've completed my section of the deliverable. Ready for your review.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "manager", candidate: "The milestone has been achieved. Moving to the next phase.", tags: ["context", "professional", "extended"] },
    { context: "professional", relationship: "client", candidate: "We appreciate your partnership and look forward to the next steps.", tags: ["context", "professional", "extended"] },
    // Academic extended
    { context: "academic", relationship: "professor", candidate: "I respectfully submit the revised draft for your review.", tags: ["context", "academic", "extended"] },
    { context: "academic", relationship: "colleague", candidate: "The evidence suggests a different conclusion.", tags: ["context", "academic", "extended"] },
    { context: "academic", relationship: "professor", candidate: "I acknowledge the limitations of this approach.", tags: ["context", "academic", "extended"] },
    { context: "academic", relationship: "classmate", candidate: "The research methodology demonstrates rigor in the analysis.", tags: ["context", "academic", "extended"] },
    { context: "academic", relationship: "professor", candidate: "I would like to discuss the theoretical framework further.", tags: ["context", "academic", "extended"] },
    { context: "academic", relationship: "colleague", candidate: "The literature review shows significant gaps in current research.", tags: ["context", "academic", "extended"] },
    { context: "academic", relationship: "professor", candidate: "I believe the hypothesis is supported by the evidence.", tags: ["context", "academic", "extended"] },
    { context: "academic", relationship: "classmate", candidate: "The abstract should be revised to better reflect the findings.", tags: ["context", "academic", "extended"] },
    // Conflict extended
    { context: "conflict", relationship: "partner", candidate: "I understand this is difficult. Let me explain my side.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "coworker", candidate: "I respect your perspective. Can we discuss a resolution?", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I care about you and I want us to work through this.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "friend", candidate: "I hear you. This has been tough for everyone involved.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "Let's take a breath and approach this calmly.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "coworker", candidate: "I understand the frustration. Let me share my reasoning.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I need you to understand that this boundary matters to me.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "friend", candidate: "I think we can find a compromise if we both give a little.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I appreciate you sharing your feelings. I want to understand.", tags: ["context", "conflict", "extended"] },
    { context: "conflict", relationship: "coworker", candidate: "I see your point. Let's find a middle ground.", tags: ["context", "conflict", "extended"] },
    // Dating extended
    { context: "dating", relationship: "partner", candidate: "I had such a wonderful time with you last night!", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "Can't wait to see you again soon!", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "I miss you already, when can we hang out again?", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "That was so fun! We should definitely do that again.", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "You always know how to make me smile.", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "I'm thinking about you, hope you're having a great day!", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "What are you up to this weekend? I'd love to plan something.", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "You're the best thing that's happened to me.", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "I really enjoyed our conversation tonight.", tags: ["context", "dating", "extended"] },
    { context: "dating", relationship: "partner", candidate: "Looking forward to our next date!", tags: ["context", "dating", "extended"] },
    // Friendship extended
    { context: "friendship", relationship: "friend", candidate: "Hey! Long time no see, we should catch up!", tags: ["context", "friendship", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "That's awesome, I'm so happy for you!", tags: ["context", "friendship", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "Remember when we used to do that? Good times.", tags: ["context", "friendship", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "I miss you! Let's hang out soon.", tags: ["context", "friendship", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "Wanna grab coffee this weekend?", tags: ["context", "friendship", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "You're the best, thanks for always being there.", tags: ["context", "friendship", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "Just checking in. How are things going?", tags: ["context", "friendship", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "I saw something that reminded me of you today!", tags: ["context", "friendship", "extended"] },
    // Family extended
    { context: "family", relationship: "mother", candidate: "I love you, Mom. Thank you for everything you do.", tags: ["context", "family", "extended"] },
    { context: "family", relationship: "sibling", candidate: "Hey, just checking in. How are things going?", tags: ["context", "family", "extended"] },
    { context: "family", relationship: "parent", candidate: "I miss home. Can we plan a visit soon?", tags: ["context", "family", "extended"] },
    { context: "family", relationship: "sibling", candidate: "I'm always here for you, no matter what.", tags: ["context", "family", "extended"] },
    { context: "family", relationship: "parent", candidate: "Happy birthday! I hope you have a wonderful day.", tags: ["context", "family", "extended"] },
    { context: "family", relationship: "sibling", candidate: "Let's get dinner this weekend, it's been too long.", tags: ["context", "family", "extended"] },
    { context: "family", relationship: "parent", candidate: "I'm grateful for everything you've taught me.", tags: ["context", "family", "extended"] },
    // Negotiation extended
    { context: "negotiation", relationship: "client", candidate: "I appreciate your position. Could we consider an alternative?", tags: ["context", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "Let's find a compromise that benefits both parties.", tags: ["context", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "I'd like to propose a revised offer.", tags: ["context", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "The value of this partnership extends beyond the initial terms.", tags: ["context", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "I suggest we consider a phased approach.", tags: ["context", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "Perhaps we could adjust the timeline.", tags: ["context", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "I understand your constraints. Let's explore options.", tags: ["context", "negotiation", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "We value this relationship and want to find a fair agreement.", tags: ["context", "negotiation", "extended"] },
    // Customer extended
    { context: "customer", relationship: "customer", candidate: "I sincerely apologize for the inconvenience.", tags: ["context", "customer", "extended"] },
    { context: "customer", relationship: "customer", candidate: "We appreciate your patience.", tags: ["context", "customer", "extended"] },
    { context: "customer", relationship: "customer", candidate: "I understand your frustration. Let me resolve this.", tags: ["context", "customer", "extended"] },
    { context: "customer", relationship: "customer", candidate: "Your satisfaction is our priority.", tags: ["context", "customer", "extended"] },
    { context: "customer", relationship: "customer", candidate: "I'll process your refund right away.", tags: ["context", "customer", "extended"] },
    { context: "customer", relationship: "customer", candidate: "Thank you for bringing this to our attention.", tags: ["context", "customer", "extended"] },
    // Interview extended
    { context: "interview", relationship: "interviewer", candidate: "I'm excited about this opportunity and would love to contribute.", tags: ["context", "interview", "extended"] },
    { context: "interview", relationship: "recruiter", candidate: "Thank you for considering my application.", tags: ["context", "interview", "extended"] },
    { context: "interview", relationship: "interviewer", candidate: "I believe my experience aligns well with this role.", tags: ["context", "interview", "extended"] },
    { context: "interview", relationship: "recruiter", candidate: "I'm looking forward to hearing about the next steps.", tags: ["context", "interview", "extended"] },
    { context: "interview", relationship: "interviewer", candidate: "I appreciate the opportunity to discuss my qualifications.", tags: ["context", "interview", "extended"] },
    // Group extended
    { context: "group", relationship: "teammate", candidate: "I'd like to share my thoughts on this topic.", tags: ["context", "group", "extended"] },
    { context: "group", relationship: "coworker", candidate: "I agree with the previous point. Let me add to that.", tags: ["context", "group", "extended"] },
    { context: "group", relationship: "teammate", candidate: "I have a different perspective I'd like to share.", tags: ["context", "group", "extended"] },
    { context: "group", relationship: "coworker", candidate: "Let's discuss this as a team and reach a consensus.", tags: ["context", "group", "extended"] },
    // Severe mismatch extended
    { context: "professional", relationship: "manager", candidate: "gonna be late lol, traffic is insane", tags: ["context", "mismatch", "professional", "extended"] },
    { context: "academic", relationship: "professor", candidate: "nah this is boring, can we skip", tags: ["context", "mismatch", "academic", "extended"] },
    { context: "dating", relationship: "partner", candidate: "I'll have the proposal ready by EOD.", tags: ["context", "mismatch", "dating", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "This is a complete waste of time. I'm done.", tags: ["context", "mismatch", "conflict", "extended"] },
    { context: "customer", relationship: "customer", candidate: "dude that's so dumb lol whatever", tags: ["context", "mismatch", "customer", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "I'm filing a lawsuit. This is terrible.", tags: ["context", "mismatch", "negotiation", "extended"] },
    { context: "interview", relationship: "interviewer", candidate: "nah i just need a paycheck tbh", tags: ["context", "mismatch", "interview", "extended"] },
    { context: "family", relationship: "mother", candidate: "Per my previous email, please find attached.", tags: ["context", "mismatch", "family", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "I respectfully request your consideration.", tags: ["context", "mismatch", "friendship", "extended"] },
  ];
  for (const seed of extended) seeds.push({ ...seed, id: id("EXT") });

  return seeds;
}

export function getContextBenchmark(): BenchmarkDataset {
  const seeds = buildSeeds();
  return {
    version: "1.0",
    name: "Context Fit Benchmark",
    description: "Tests context fit scoring accuracy across 150+ cases covering positive, negative, structural, and edge cases",
    createdAt: "2026-09-07",
    totalCases: seeds.length,
    categories: { professional: seeds.length } as Record<string, number>,
    difficulties: seeds.reduce(
      (acc, s) => {
        acc[s.difficulty || "medium"] = (acc[s.difficulty || "medium"] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    cases: seeds.map(seedToCase),
  };
}
