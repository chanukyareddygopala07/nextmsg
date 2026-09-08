/**
 * Tone accuracy benchmark (150+ curated cases).
 *
 * Tests whether the tone evaluator correctly identifies tones from
 * structural signals, lexicon matches, and synonym mapping.
 *
 * Categories: tone detection, tone synonym, structural analysis, edge cases
 */

import type { BenchmarkCase, BenchmarkDataset, Difficulty } from "../types";

type ToneSeed = {
  id: string;
  difficulty?: Difficulty;
  context: string;
  relationship: string;
  candidate: string;
  targetTone: string;
  expectedDetectedTone?: string;
  minScore?: number;
  tags?: string[];
};

function seedToCase(seed: ToneSeed): BenchmarkCase {
  return {
    id: seed.id,
    category: "professional",
    difficulty: seed.difficulty || "medium",
    context: seed.context,
    relationship: seed.relationship,
    language: "english",
    script: "latin",
    conversation: [{ role: "other", content: "test" }],
    draft: seed.candidate,
    targetTone: seed.targetTone,
    expected: {
      tone: seed.targetTone,
    },
    tags: seed.tags || ["tone"],
  };
}

function buildSeeds(): ToneSeed[] {
  const seeds: ToneSeed[] = [];
  let n = 1;
  const id = (prefix: string) => `TONE-${prefix}-${String(n++).padStart(3, "0")}`;

  // ── Professional tone detection ────────────────────────────────────────────
  const professional: Omit<ToneSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "Thank you for your patience. I'll have an update for you shortly.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "Please review the attached proposal and provide feedback by EOD.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "client", candidate: "We appreciate your business and look forward to the partnership.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "manager", candidate: "I wanted to follow up on the Q3 report we discussed last week.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "teammate", candidate: "Could you clarify the requirements for the dashboard feature?", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "manager", candidate: "The deliverable is on track and we expect to meet the deadline.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "client", candidate: "I understand your concern and will escalate this to the team.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "Let me look into this and get back to you with a detailed response.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "manager", candidate: "I'd like to schedule a meeting to discuss the project timeline.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
    { context: "professional", relationship: "teammate", candidate: "Please find the updated analysis attached for your review.", targetTone: "professional", tags: ["tone", "professional", "clear"] },
  ];
  for (const seed of professional) seeds.push({ ...seed, id: id("PROF") });

  // ── Formal tone detection ──────────────────────────────────────────────────
  const formal: Omit<ToneSeed, "id">[] = [
    { context: "academic", relationship: "professor", candidate: "I would like to respectfully request an extension on the assignment.", targetTone: "formal", tags: ["tone", "formal", "clear"] },
    { context: "academic", relationship: "colleague", candidate: "Furthermore, the methodology employed in this study warrants further examination.", targetTone: "formal", tags: ["tone", "formal", "clear"] },
    { context: "academic", relationship: "professor", candidate: "I acknowledge your feedback regarding the literature review section.", targetTone: "formal", tags: ["tone", "formal", "clear"] },
    { context: "professional", relationship: "manager", candidate: "Pursuant to our discussion, I hereby confirm the revised schedule.", targetTone: "formal", tags: ["tone", "formal", "clear"] },
    { context: "academic", relationship: "classmate", candidate: "Consequently, the findings suggest a correlation between the variables.", targetTone: "formal", tags: ["tone", "formal", "clear"] },
    { context: "professional", relationship: "client", candidate: "We respectfully request your consideration of the proposed terms.", targetTone: "formal", tags: ["tone", "formal", "clear"] },
  ];
  for (const seed of formal) seeds.push({ ...seed, id: id("FORM") });

  // ── Casual tone detection ──────────────────────────────────────────────────
  const casual: Omit<ToneSeed, "id">[] = [
    { context: "dating", relationship: "partner", candidate: "hey what's up, wanna grab dinner tonight?", targetTone: "casual", tags: ["tone", "casual", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "lol that's hilarious, we should totally do that", targetTone: "casual", tags: ["tone", "casual", "clear"] },
    { context: "dating", relationship: "partner", candidate: "nah i'm good, maybe another time", targetTone: "casual", tags: ["tone", "casual", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "yeah for real, that's awesome", targetTone: "casual", tags: ["tone", "casual", "clear"] },
    { context: "dating", relationship: "partner", candidate: "haha ok cool, see you then", targetTone: "casual", tags: ["tone", "casual", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "btw did you see that thing yesterday", targetTone: "casual", tags: ["tone", "casual", "clear"] },
  ];
  for (const seed of casual) seeds.push({ ...seed, id: id("CAS") });

  // ── Warm tone detection ────────────────────────────────────────────────────
  const warm: Omit<ToneSeed, "id">[] = [
    { context: "conflict", relationship: "partner", candidate: "I appreciate you sharing how you feel, and I want you to know I care.", targetTone: "warm", tags: ["tone", "warm", "clear"] },
    { context: "family", relationship: "mother", candidate: "I'm so grateful for everything you do, Mom. Thank you.", targetTone: "warm", tags: ["tone", "warm", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "I'm really glad we got to catch up, it means a lot to me.", targetTone: "warm", tags: ["tone", "warm", "clear"] },
    { context: "dating", relationship: "partner", candidate: "I had such a wonderful time with you, thank you for a beautiful evening.", targetTone: "warm", tags: ["tone", "warm", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I care about you and I want us to work through this together.", targetTone: "warm", tags: ["tone", "warm", "clear"] },
    { context: "family", relationship: "sibling", candidate: "I love you and I'm always here for you, no matter what.", targetTone: "warm", tags: ["tone", "warm", "clear"] },
  ];
  for (const seed of warm) seeds.push({ ...seed, id: id("WRM") });

  // ── Empathetic tone detection ──────────────────────────────────────────────
  const empathetic: Omit<ToneSeed, "id">[] = [
    { context: "conflict", relationship: "partner", candidate: "I understand this has been really difficult for you, and I'm sorry.", targetTone: "empathetic", tags: ["tone", "empathetic", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "That sounds really tough. I'm here for you if you need anything.", targetTone: "empathetic", tags: ["tone", "empathetic", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I can see why you feel that way. Your feelings are completely valid.", targetTone: "empathetic", tags: ["tone", "empathetic", "clear"] },
    { context: "family", relationship: "parent", candidate: "I understand you're going through a hard time. Let me help.", targetTone: "empathetic", tags: ["tone", "empathetic", "clear"] },
    { context: "customer", relationship: "customer", candidate: "I completely understand your frustration. Let me resolve this for you.", targetTone: "empathetic", tags: ["tone", "empathetic", "clear"] },
    { context: "conflict", relationship: "coworker", candidate: "I hear you. This situation has been challenging for everyone.", targetTone: "empathetic", tags: ["tone", "empathetic", "clear"] },
  ];
  for (const seed of empathetic) seeds.push({ ...seed, id: id("EMP") });

  // ── Direct tone detection ──────────────────────────────────────────────────
  const direct: Omit<ToneSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "The project is delayed. Here's what we need to do to recover.", targetTone: "direct", tags: ["tone", "direct", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "The bottom line is we can't accept those terms as they stand.", targetTone: "direct", tags: ["tone", "direct", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "Let me be clear: this needs to be done by Friday.", targetTone: "direct", tags: ["tone", "direct", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I need you to understand that this is not acceptable to me.", targetTone: "direct", tags: ["tone", "direct", "clear"] },
    { context: "professional", relationship: "manager", candidate: "Here's the issue: we're behind schedule and over budget.", targetTone: "direct", tags: ["tone", "direct", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "To be clear, we need a response by end of day.", targetTone: "direct", tags: ["tone", "direct", "clear"] },
  ];
  for (const seed of direct) seeds.push({ ...seed, id: id("DIR") });

  // ── Diplomatic tone detection ──────────────────────────────────────────────
  const diplomatic: Omit<ToneSeed, "id">[] = [
    { context: "conflict", relationship: "partner", candidate: "I understand your perspective. Perhaps we could find a middle ground.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "I appreciate your position. Could we consider an alternative approach?", targetTone: "diplomatic", tags: ["tone", "diplomatic", "clear"] },
    { context: "professional", relationship: "manager", candidate: "From my perspective, there might be another way to approach this.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "clear"] },
    { context: "conflict", relationship: "coworker", candidate: "I see your point. Maybe we could suggest a compromise that works for both.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "With all due respect, I think there's a better option we haven't explored.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "It seems like we both want the same outcome. Let's figure this out.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "clear"] },
  ];
  for (const seed of diplomatic) seeds.push({ ...seed, id: id("DIP") });

  // ── Playful tone detection ─────────────────────────────────────────────────
  const playful: Omit<ToneSeed, "id">[] = [
    { context: "dating", relationship: "partner", candidate: "haha wait no way 😂 that's actually hilarious", targetTone: "playful", tags: ["tone", "playful", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "dude that's so silly 😄 we should definitely try that", targetTone: "playful", tags: ["tone", "playful", "clear"] },
    { context: "dating", relationship: "partner", candidate: "okay but tell me more 👀 sounds like an adventure", targetTone: "playful", tags: ["tone", "playful", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "lol you're ridiculous 😂 but i love it", targetTone: "playful", tags: ["tone", "playful", "clear"] },
    { context: "dating", relationship: "partner", candidate: "wait really?? 😊 that's so fun", targetTone: "playful", tags: ["tone", "playful", "clear"] },
    { context: "friendship", relationship: "friend", candidate: "haha no way, that's amazing! we should make it a game", targetTone: "playful", tags: ["tone", "playful", "clear"] },
  ];
  for (const seed of playful) seeds.push({ ...seed, id: id("PLY") });

  // ── Flirty tone detection ──────────────────────────────────────────────────
  const flirty: Omit<ToneSeed, "id">[] = [
    { context: "dating", relationship: "partner", candidate: "you're so cute when you're excited like that 😊", targetTone: "flirty", tags: ["tone", "flirty", "clear"] },
    { context: "dating", relationship: "partner", candidate: "can't wait to see you tonight, thinking about you 💕", targetTone: "flirty", tags: ["tone", "flirty", "clear"] },
    { context: "dating", relationship: "partner", candidate: "you looked amazing yesterday, just saying 😍", targetTone: "flirty", tags: ["tone", "flirty", "clear"] },
    { context: "dating", relationship: "partner", candidate: "i miss you already, when can we hang out again?", targetTone: "flirty", tags: ["tone", "flirty", "clear"] },
    { context: "dating", relationship: "partner", candidate: "okay but you're literally the most charming person ever", targetTone: "flirty", tags: ["tone", "flirty", "clear"] },
    { context: "dating", relationship: "partner", candidate: "you always know how to make me smile, it's not fair 💕", targetTone: "flirty", tags: ["tone", "flirty", "clear"] },
  ];
  for (const seed of flirty) seeds.push({ ...seed, id: id("FLR") });

  // ── Assertive tone detection ───────────────────────────────────────────────
  const assertive: Omit<ToneSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "I need this resolved by end of day. This is critical for the launch.", targetTone: "assertive", tags: ["tone", "assertive", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I require clear communication about this. We need to address it now.", targetTone: "assertive", tags: ["tone", "assertive", "clear"] },
    { context: "negotiation", relationship: "client", candidate: "We must have a definitive answer by Friday. This is non-negotiable.", targetTone: "assertive", tags: ["tone", "assertive", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "I insist we review this before the meeting. It's absolutely necessary.", targetTone: "assertive", tags: ["tone", "assertive", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I expect this behavior to change immediately. This is not acceptable.", targetTone: "assertive", tags: ["tone", "assertive", "clear"] },
    { context: "professional", relationship: "manager", candidate: "We clearly need to restructure the timeline. The current plan won't work.", targetTone: "assertive", tags: ["tone", "assertive", "clear"] },
  ];
  for (const seed of assertive) seeds.push({ ...seed, id: id("ASS") });

  // ── Aggressive tone detection ──────────────────────────────────────────────
  const aggressive: Omit<ToneSeed, "id">[] = [
    { context: "conflict", relationship: "coworker", candidate: "This is incompetent work. I've never seen something so terrible.", targetTone: "aggressive", tags: ["tone", "aggressive", "clear"] },
    { context: "professional", relationship: "manager", candidate: "This is absolutely ridiculous. Someone needs to be held responsible.", targetTone: "aggressive", tags: ["tone", "aggressive", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "You always do this. It's the worst thing you could have done.", targetTone: "aggressive", tags: ["tone", "aggressive", "clear"] },
    { context: "customer", relationship: "customer", candidate: "This is a complete waste of my time. I demand a full refund.", targetTone: "aggressive", tags: ["tone", "aggressive", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I'm going to file a complaint. This is absurd.", targetTone: "aggressive", tags: ["tone", "aggressive", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "This is completely unacceptable. I'll be reporting this to management.", targetTone: "aggressive", tags: ["tone", "aggressive", "clear"] },
  ];
  for (const seed of aggressive) seeds.push({ ...seed, id: id("AGR") });

  // ── Passive-aggressive tone detection ──────────────────────────────────────
  const passiveAggressive: Omit<ToneSeed, "id">[] = [
    { context: "professional", relationship: "coworker", candidate: "Sure, whatever you say. Must be nice to not have to deal with this.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "I guess some people just don't care about other people's time.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "clear"] },
    { context: "professional", relationship: "manager", candidate: "Fine. If you say so. As usual, my input doesn't matter.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "Wow, interesting how you always manage to do that.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "clear"] },
    { context: "professional", relationship: "coworker", candidate: "Good for you. I'm sure everything will work out just fine.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "clear"] },
    { context: "conflict", relationship: "partner", candidate: "Surprise surprise, here we go again.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "clear"] },
  ];
  for (const seed of passiveAggressive) seeds.push({ ...seed, id: id("PAG") });

  // ── Tone synonym pairs ─────────────────────────────────────────────────────
  const synonyms: Omit<ToneSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "Thank you for your patience. I'll have an update for you shortly.", targetTone: "professional", expectedDetectedTone: "formal", tags: ["tone", "synonym", "professional-formal"] },
    { context: "conflict", relationship: "partner", candidate: "I understand your perspective. Perhaps we could find a middle ground.", targetTone: "diplomatic", expectedDetectedTone: "professional", tags: ["tone", "synonym", "diplomatic-professional"] },
    { context: "dating", relationship: "partner", candidate: "you're so cute when you're excited like that 😊", targetTone: "flirty", expectedDetectedTone: "playful", tags: ["tone", "synonym", "flirty-playful"] },
    { context: "conflict", relationship: "partner", candidate: "I understand this has been really difficult for you, and I'm sorry.", targetTone: "empathetic", expectedDetectedTone: "warm", tags: ["tone", "synonym", "empathetic-warm"] },
    { context: "professional", relationship: "manager", candidate: "I need this resolved by end of day. This is critical for the launch.", targetTone: "assertive", expectedDetectedTone: "direct", tags: ["tone", "synonym", "assertive-direct"] },
    { context: "conflict", relationship: "partner", candidate: "I appreciate you sharing how you feel, and I want you to know I care.", targetTone: "warm", expectedDetectedTone: "empathetic", tags: ["tone", "synonym", "warm-empathetic"] },
    { context: "friendship", relationship: "friend", candidate: "haha wait no way 😂 that's actually hilarious", targetTone: "playful", expectedDetectedTone: "casual", tags: ["tone", "synonym", "playful-casual"] },
    { context: "professional", relationship: "coworker", candidate: "Let me be clear: this needs to be done by Friday.", targetTone: "direct", expectedDetectedTone: "assertive", tags: ["tone", "synonym", "direct-assertive"] },
  ];
  for (const seed of synonyms) seeds.push({ ...seed, id: id("SYN") });

  // ── Structural analysis edge cases ─────────────────────────────────────────
  const structural: Omit<ToneSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "The proposal has been reviewed and approved. Please proceed with implementation.", targetTone: "formal", tags: ["tone", "structural", "formal", "no_contraction"] },
    { context: "dating", relationship: "partner", candidate: "can't wait to see you tonight! you're the best 💕", targetTone: "casual", tags: ["tone", "structural", "casual", "contraction", "emoji"] },
    { context: "professional", relationship: "manager", candidate: "Let me know if you need any help with the project.", targetTone: "warm", tags: ["tone", "structural", "warm", "mixed"] },
    { context: "conflict", relationship: "partner", candidate: "I hear you. This has been hard for both of us.", targetTone: "empathetic", tags: ["tone", "structural", "empathetic", "short"] },
    { context: "negotiation", relationship: "client", candidate: "Perhaps we could consider a phased approach to meet both our needs.", targetTone: "diplomatic", tags: ["tone", "structural", "diplomatic", "hedging"] },
    { context: "professional", relationship: "manager", candidate: "The analysis is complete. Key findings are attached.", targetTone: "direct", tags: ["tone", "structural", "direct", "short_sentence"] },
  ];
  for (const seed of structural) seeds.push({ ...seed, id: id("STR") });

  // ── Mixed signals / ambiguous ──────────────────────────────────────────────
  const ambiguous: Omit<ToneSeed, "id">[] = [
    { context: "professional", relationship: "manager", candidate: "Thanks for the feedback, I appreciate it. Let me review and get back to you.", targetTone: "professional", tags: ["tone", "ambiguous", "professional", "warm_mix"] },
    { context: "conflict", relationship: "partner", candidate: "I understand. But I need you to respect my boundaries on this.", targetTone: "diplomatic", tags: ["tone", "ambiguous", "diplomatic", "direct_mix"] },
    { context: "dating", relationship: "partner", candidate: "That's funny 😂 but seriously, I had a great time with you.", targetTone: "warm", tags: ["tone", "ambiguous", "warm", "playful_mix"] },
    { context: "professional", relationship: "coworker", candidate: "The deadline is tight but I think we can make it. Let's sync up tomorrow.", targetTone: "professional", tags: ["tone", "ambiguous", "professional", "casual_mix"] },
    { context: "conflict", relationship: "partner", candidate: "I care about you. But this needs to change.", targetTone: "warm", tags: ["tone", "ambiguous", "warm", "assertive_mix"] },
    { context: "friendship", relationship: "friend", candidate: "I get it, that's tough. Want me to come over?", targetTone: "empathetic", tags: ["tone", "ambiguous", "empathetic", "casual_mix"] },
  ];
  for (const seed of ambiguous) seeds.push({ ...seed, id: id("AMB") });

  // ── Short messages (hard to detect) ────────────────────────────────────────
  const short: Omit<ToneSeed, "id">[] = [
    { context: "dating", relationship: "partner", candidate: "yeah for real", targetTone: "casual", tags: ["tone", "short", "casual"] },
    { context: "professional", relationship: "manager", candidate: "Understood. I'll handle it.", targetTone: "professional", tags: ["tone", "short", "professional"] },
    { context: "conflict", relationship: "partner", candidate: "I hear you.", targetTone: "empathetic", tags: ["tone", "short", "empathetic"] },
    { context: "dating", relationship: "partner", candidate: "miss you 😊", targetTone: "flirty", tags: ["tone", "short", "flirty"] },
    { context: "professional", relationship: "manager", candidate: "Will do.", targetTone: "direct", tags: ["tone", "short", "direct"] },
    { context: "friendship", relationship: "friend", candidate: "lol", targetTone: "playful", tags: ["tone", "short", "playful"] },
    { context: "conflict", relationship: "partner", candidate: "Fine.", targetTone: "passive_aggressive", tags: ["tone", "short", "passive_aggressive"] },
    { context: "professional", relationship: "manager", candidate: "Noted.", targetTone: "formal", tags: ["tone", "short", "formal"] },
  ];
  for (const seed of short) seeds.push({ ...seed, id: id("SHT") });

  // ── Extended tone coverage (50+ additional cases) ──────────────────────────
  const extended: Omit<ToneSeed, "id">[] = [
    // Professional variants
    { context: "professional", relationship: "manager", candidate: "I wanted to update you on the project status. We're on track.", targetTone: "professional", tags: ["tone", "professional", "extended"] },
    { context: "professional", relationship: "client", candidate: "Thank you for your feedback. We'll incorporate it into the next iteration.", targetTone: "professional", tags: ["tone", "professional", "extended"] },
    { context: "professional", relationship: "teammate", candidate: "Could we sync up tomorrow to discuss the architecture?", targetTone: "professional", tags: ["tone", "professional", "extended"] },
    { context: "professional", relationship: "manager", candidate: "I'll have the analysis ready by end of week.", targetTone: "professional", tags: ["tone", "professional", "extended"] },
    { context: "professional", relationship: "coworker", candidate: "The report looks great. A few minor suggestions attached.", targetTone: "professional", tags: ["tone", "professional", "extended"] },
    { context: "professional", relationship: "client", candidate: "We're committed to delivering quality results on this initiative.", targetTone: "professional", tags: ["tone", "professional", "extended"] },
    // Formal variants
    { context: "academic", relationship: "professor", candidate: "I respectfully submit the revised draft for your review.", targetTone: "formal", tags: ["tone", "formal", "extended"] },
    { context: "academic", relationship: "colleague", candidate: "The evidence suggests otherwise. I would argue a different conclusion.", targetTone: "formal", tags: ["tone", "formal", "extended"] },
    { context: "professional", relationship: "manager", candidate: "Accordingly, I have prepared the following recommendation.", targetTone: "formal", tags: ["tone", "formal", "extended"] },
    { context: "academic", relationship: "professor", candidate: "I acknowledge the limitations of this approach.", targetTone: "formal", tags: ["tone", "formal", "extended"] },
    { context: "professional", relationship: "client", candidate: "We hereby confirm the terms of the agreement.", targetTone: "formal", tags: ["tone", "formal", "extended"] },
    // Casual variants
    { context: "dating", relationship: "partner", candidate: "that's so cool, we should totally try that sometime", targetTone: "casual", tags: ["tone", "casual", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "omg yes!! that sounds amazing", targetTone: "casual", tags: ["tone", "casual", "extended"] },
    { context: "dating", relationship: "partner", candidate: "nah i'm good, maybe next time", targetTone: "casual", tags: ["tone", "casual", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "haha yeah that's exactly what happened", targetTone: "casual", tags: ["tone", "casual", "extended"] },
    { context: "dating", relationship: "partner", candidate: "ok cool, sounds like a plan", targetTone: "casual", tags: ["tone", "casual", "extended"] },
    // Warm variants
    { context: "family", relationship: "parent", candidate: "I'm so glad we got to spend time together. It meant the world to me.", targetTone: "warm", tags: ["tone", "warm", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "I'm really grateful for your support through this tough time.", targetTone: "warm", tags: ["tone", "warm", "extended"] },
    { context: "dating", relationship: "partner", candidate: "You make me so happy. Thank you for being you.", targetTone: "warm", tags: ["tone", "warm", "extended"] },
    { context: "family", relationship: "sibling", candidate: "I love how we always pick up where we left off.", targetTone: "warm", tags: ["tone", "warm", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I care about us and I want to work through this together.", targetTone: "warm", tags: ["tone", "warm", "extended"] },
    // Empathetic variants
    { context: "customer", relationship: "customer", candidate: "I completely understand your frustration. This is not the experience we want for you.", targetTone: "empathetic", tags: ["tone", "empathetic", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I can only imagine how painful that must have been for you.", targetTone: "empathetic", tags: ["tone", "empathetic", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "That sounds really overwhelming. I'm here if you need to talk.", targetTone: "empathetic", tags: ["tone", "empathetic", "extended"] },
    { context: "family", relationship: "parent", candidate: "I understand this is hard. Let me help however I can.", targetTone: "empathetic", tags: ["tone", "empathetic", "extended"] },
    { context: "conflict", relationship: "coworker", candidate: "I hear you. Let me see what I can do to help.", targetTone: "empathetic", tags: ["tone", "empathetic", "extended"] },
    // Direct variants
    { context: "professional", relationship: "manager", candidate: "We need to decision on this by tomorrow. Here are the options.", targetTone: "direct", tags: ["tone", "direct", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I need to be honest with you. This isn't working for me.", targetTone: "direct", tags: ["tone", "direct", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "Our position is clear. We need the terms adjusted.", targetTone: "direct", tags: ["tone", "direct", "extended"] },
    { context: "professional", relationship: "coworker", candidate: "The issue is straightforward. Here's the solution.", targetTone: "direct", tags: ["tone", "direct", "extended"] },
    { context: "professional", relationship: "manager", candidate: "To be direct, we're behind schedule and need to accelerate.", targetTone: "direct", tags: ["tone", "direct", "extended"] },
    // Diplomatic variants
    { context: "conflict", relationship: "partner", candidate: "I see your point. Maybe there's a way we can both get what we need.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "I understand your constraints. Could we explore a different approach?", targetTone: "diplomatic", tags: ["tone", "diplomatic", "extended"] },
    { context: "professional", relationship: "manager", candidate: "There might be an alternative worth considering here.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "extended"] },
    { context: "conflict", relationship: "coworker", candidate: "I appreciate your input. Let me share another perspective.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "From my perspective, we both want the same outcome.", targetTone: "diplomatic", tags: ["tone", "diplomatic", "extended"] },
    // Playful variants
    { context: "dating", relationship: "partner", candidate: "okay but you're literally the funniest person ever 😂", targetTone: "playful", tags: ["tone", "playful", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "haha stop it, you're making me blush 😊", targetTone: "playful", tags: ["tone", "playful", "extended"] },
    { context: "dating", relationship: "partner", candidate: "wait really?? that's so cool, tell me everything", targetTone: "playful", tags: ["tone", "playful", "extended"] },
    { context: "friendship", relationship: "friend", candidate: "omg yes! we should totally make it a thing", targetTone: "playful", tags: ["tone", "playful", "extended"] },
    // Flirty variants
    { context: "dating", relationship: "partner", candidate: "you always know how to brighten my day 💕", targetTone: "flirty", tags: ["tone", "flirty", "extended"] },
    { context: "dating", relationship: "partner", candidate: "can't stop thinking about last night 😍", targetTone: "flirty", tags: ["tone", "flirty", "extended"] },
    { context: "dating", relationship: "partner", candidate: "you're the best thing that's happened to me", targetTone: "flirty", tags: ["tone", "flirty", "extended"] },
    { context: "dating", relationship: "partner", candidate: "when can I see you again? missing you already", targetTone: "flirty", tags: ["tone", "flirty", "extended"] },
    // Assertive variants
    { context: "professional", relationship: "manager", candidate: "This deadline is non-negotiable. We must deliver by Friday.", targetTone: "assertive", tags: ["tone", "assertive", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I require clear communication. This needs to be addressed now.", targetTone: "assertive", tags: ["tone", "assertive", "extended"] },
    { context: "negotiation", relationship: "client", candidate: "We expect a response by end of day. This is critical.", targetTone: "assertive", tags: ["tone", "assertive", "extended"] },
    { context: "professional", relationship: "coworker", candidate: "I insist we resolve this before the meeting.", targetTone: "assertive", tags: ["tone", "assertive", "extended"] },
    // Aggressive variants
    { context: "conflict", relationship: "partner", candidate: "This is absolutely terrible. I've never been so disappointed.", targetTone: "aggressive", tags: ["tone", "aggressive", "extended"] },
    { context: "professional", relationship: "manager", candidate: "This is completely unacceptable. Someone needs to be held accountable.", targetTone: "aggressive", tags: ["tone", "aggressive", "extended"] },
    { context: "customer", relationship: "customer", candidate: "This is a complete waste. I demand a full refund immediately.", targetTone: "aggressive", tags: ["tone", "aggressive", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "You always ruin everything. This is the worst.", targetTone: "aggressive", tags: ["tone", "aggressive", "extended"] },
    // Passive-aggressive variants
    { context: "professional", relationship: "coworker", candidate: "Sure, if that's what you want. Must be nice to have that luxury.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "I guess some people just don't care about wasting time.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "extended"] },
    { context: "professional", relationship: "manager", candidate: "Fine, whatever you decide. As usual.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "extended"] },
    { context: "conflict", relationship: "partner", candidate: "Wow, interesting how you always do this.", targetTone: "passive_aggressive", tags: ["tone", "passive_aggressive", "extended"] },
  ];
  for (const seed of extended) seeds.push({ ...seed, id: id("EXT") });

  return seeds;
}

export function getToneBenchmark(): BenchmarkDataset {
  const seeds = buildSeeds();
  return {
    version: "1.0",
    name: "Tone Accuracy Benchmark",
    description: "Tests tone detection accuracy across 150+ cases covering lexicon, structural, synonym, and edge cases",
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
