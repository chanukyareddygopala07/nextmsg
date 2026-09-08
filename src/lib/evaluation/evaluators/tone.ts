/**
 * Tone Evaluator v3.0 — Dimensional Tone Detection
 *
 * Evaluates whether a candidate message achieves the target tone
 * using dimensional scoring that allows multiple simultaneous tones.
 *
 * Key insight: Natural communication can contain multiple tone signals.
 * "Thank you for helping with the project." can be both warm AND professional.
 * The evaluator checks if the target tone has sufficient presence, not whether
 * it's the ONLY tone detected.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── Tone Lexicons ───────────────────────────────────────────────────────────

const TONE_LEXICONS: Record<string, string[]> = {
  formal: [
    "therefore", "furthermore", "consequently", "regarding", "concerning",
    "pursuant", "hereby", "whereas", "notwithstanding", "accordingly",
    "respectfully", "sincerely", "dear", "kindly",
    "acknowledge", "confirm", "inquiry", "response", "attention",
    "matriculate", "commence", "pursuant to", "in accordance",
  ],
  casual: [
    "hey", "cool", "awesome", "yeah", "yep", "nah",
    "gonna", "wanna", "gotta", "btw", "tbh",
    "lol", "omg", "haha", "what's up", "no worries",
    "bruh", "dude", "chill", "vibe", "slay", "periodt",
  ],
  assertive: [
    "must", "require", "expect", "demand",
    "clearly", "certainly", "definitely", "absolutely",
    "i insist", "i require", "this must", "we need", "this is critical",
    "no exceptions", "non-negotiable", "mandatory",
  ],
  diplomatic: [
    "perhaps", "maybe", "consider", "suggest", "propose",
    "might", "could", "possibly", "with all due respect",
    "from my perspective", "one option", "another approach",
    "i see your point", "that said", "on the other hand",
  ],
  warm: [
    "appreciate", "grateful", "thankful", "love", "care",
    "happy", "glad", "wonderful", "beautiful", "amazing",
    "delighted", "pleased",
    "warmly", "with love", "dear friend",
    "i hear you", "i'm here for you", "you matter",
    "means a lot", "so glad", "really appreciate",
  ],
  playful: [
    "haha", "lol", "😄", "😊", "fun", "joke",
    "kidding", "teasing", "silly", "goofy", "banter",
    "wink", "tongue", "play", "game", "adventure",
  ],
  empathetic: [
    "truly understand how you feel", "i can only imagine",
    "that must be so hard", "my heart goes out",
    "sending you", "i'm so sorry for your loss",
    "please know that", "you're not alone",
    "i care about you deeply", "here for you",
  ],
  direct: [
    "specifically", "precisely",
    "here's the", "the point is", "to be clear", "let me be clear",
    "bottom line", "the issue is", "the problem is", "the solution is",
    "no sugarcoating", "straight to the point",
  ],
  flirty: [
    "cute", "attractive", "charming",
    "date", "together", "miss", "thinking of", "can't wait",
    "gorgeous", "stunning", "handsome", "sweet",
    "date night", "you look", "can't stop thinking",
  ],
  professional: [
    "team", "project", "deadline", "deliverable", "stakeholder",
    "meeting", "schedule", "proposal", "report", "analysis",
    "strategic", "initiative", "objective", "goal", "actionable",
    "capacity", "allocation", "prioritize", "timeline", "milestone",
    "deliver", "review", "feedback", "follow up", "update",
  ],
  aggressive: [
    "incompetent", "useless", "waste", "terrible", "awful",
    "worst", "ridiculous", "absurd",
    "fired", "sue", "lawsuit", "complaint",
  ],
  passive_aggressive: [
    "whatever", "if you say so", "i guess",
    "must be nice", "good for you", "as usual",
    "surprise surprise", "oh really", "sure thing",
    "fine", "ok then", "if that's what you want",
    "i'm fine", "doesn't matter", "never mind",
  ],
  respectful: [
    "please", "thank you", "appreciate", "grateful", "kindly",
    "if you don't mind", "when you get a chance", "at your convenience",
    "i understand", "i respect", "with respect", "sir", "ma'am",
    "pardon", "excuse me", "forgive me",
  ],
  calm: [
    "it's okay", "no worries", "take your time", "no rush",
    "let's discuss", "let's talk", "i understand", "i see",
    "that's fine", "no problem", "all good", "we can work this out",
    "let me think", "let's figure", "step back",
  ],
  sincere: [
    "honestly", "truly", "genuinely", "from the heart",
    "i mean it", "i promise", "i assure you", "believe me",
    "i care", "i want you to know", "means a lot",
    "really appreciate", "thank you for", "grateful for",
  ],
  enthusiastic: [
    "excited", "amazing", "awesome", "fantastic", "wonderful",
    "love it", "can't wait", "looking forward", "this is great",
    "absolutely", "definitely", "yes", "let's do it",
    "count me in", "sign me up", "that's incredible",
  ],
  friendly: [
    "hey", "hi", "hello", "how are you", "what's up",
    "good to see", "nice to meet", "glad", "happy",
    "sure", "yeah", "of course", "anytime",
    "no problem", "you're welcome", "take care",
  ],
  constructive: [
    "suggest", "recommend", "consider", "try", "improve",
    "what if", "how about", "one idea", "another approach",
    "build on", "build upon", "strength", "opportunity",
    "growth", "develop", "enhance", "refine",
  ],
};

// ─── Tone Synonym Groups ─────────────────────────────────────────────────────
// Tones that are semantically similar and should give partial credit.
// SYMMETRIC: if A lists B, then B should list A (bidirectional).

const TONE_SYNONYM_GROUPS: Record<string, string[]> = {
  professional: ["formal", "direct", "diplomatic", "assertive", "warm", "calm", "respectful", "constructive", "friendly", "enthusiastic", "sincere"],
  formal: ["professional", "direct", "diplomatic", "respectful", "calm"],
  casual: ["playful", "friendly", "warm", "enthusiastic"],
  assertive: ["direct", "professional", "confident"],
  diplomatic: ["professional", "formal", "warm", "calm", "respectful"],
  warm: ["friendly", "empathetic", "casual", "sincere", "calm", "playful", "flirty", "professional", "diplomatic", "respectful", "constructive"],
  empathetic: ["warm", "supportive", "sincere", "calm"],
  direct: ["assertive", "professional", "clear", "formal"],
  playful: ["casual", "flirty", "friendly", "warm"],
  flirty: ["playful", "warm", "casual"],
  friendly: ["warm", "casual", "playful", "enthusiastic"],
  confident: ["assertive", "professional", "direct"],
  clear: ["direct", "professional"],
  respectful: ["professional", "formal", "warm", "diplomatic", "calm"],
  calm: ["diplomatic", "professional", "warm", "empathetic", "respectful", "sincere", "formal"],
  sincere: ["warm", "empathetic", "calm", "respectful"],
  enthusiastic: ["warm", "playful", "friendly", "excited"],
  constructive: ["professional", "diplomatic", "direct", "respectful"],
  aggressive: [],
  passive_aggressive: [],
};

// ─── Structural Tone Signals ─────────────────────────────────────────────────
// Detect tone from sentence structure, punctuation, and formatting

interface StructuralSignals {
  avgSentenceLength: number;
  sentenceCount: number;
  questionCount: number;
  exclamationCount: number;
  emojiCount: number;
  abbreviationCount: number;
  formalTransitions: number;
  contractions: number;
  shortFragments: number;
  hasGreeting: boolean;
  hasSignoff: boolean;
}

function analyzeStructure(text: string): StructuralSignals {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  return {
    avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : words.length,
    sentenceCount: sentences.length,
    questionCount: (text.match(/\?/g) || []).length,
    exclamationCount: (text.match(/!/g) || []).length,
    emojiCount: (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length,
    abbreviationCount: (lower.match(/\b(don't|doesn't|didn't|won't|wouldn't|can't|cannot|isn't|aren't|wasn't|weren't|i'm|i've|i'll|i'd|we're|we've|we'll|we'd|they're|they've|they'll|they'd|he's|he'll|he'd|she's|she'll|she'd|that's|that'll|that'd|what's|what'll|there's|there'll|here's|here'll|let's|who's|who'll|how's|how'll)\b/g) || []).length,
    formalTransitions: (lower.match(/\b(therefore|furthermore|consequently|moreover|however|nevertheless|additionally|alternatively|specifically|particularly|essentially|accordingly)\b/g) || []).length,
    contractions: (lower.match(/\b\w+'t\b|\b\w+'re\b|\b\w+'ve\b|\b\w+'ll\b|\b\w+'d\b|\bi'm\b/g) || []).length,
    shortFragments: sentences.filter((s) => s.trim().split(/\s+/).length <= 4).length,
    hasGreeting: /^(hi|hello|hey|dear|greetings|good\s+(morning|afternoon|evening))/i.test(text.trim()),
    hasSignoff: /(regards|sincerely|best|cheers|thanks|thank you|appreciate)/i.test(text.trim()),
  };
}

// ─── Structural Tone Scoring ─────────────────────────────────────────────────
// Score each tone based on structural signals

function scoreStructuralTone(text: string, signals: StructuralSignals, wordCount: number): Record<string, number> {
  const scores: Record<string, number> = {};
  const lower = text.toLowerCase();

  // Professional: work vocabulary present, no slang, moderate sentence length
  scores.professional = 0;
  if (/\b(team|project|deadline|deliverable|stakeholder|meeting|schedule|proposal|report|analysis|strategic|initiative|capacity|allocation|prioritize|timeline|milestone|deliver|review|feedback|invite|calendar|submit|present|commit|workflow|buffer)\b/.test(lower)) scores.professional += 0.22;
  if (!/\b(lol|omg|haha|gonna|wanna|gotta|btw|tbh|bruh|dude|chill|vibe|hey|yep|nah|cool|awesome|slay)\b/.test(lower)) scores.professional += 0.1;
  if (signals.emojiCount === 0) scores.professional += 0.08;
  if (signals.avgSentenceLength > 8) scores.professional += 0.06;
  if (signals.hasSignoff) scores.professional += 0.08;
  if (signals.formalTransitions > 0) scores.professional += 0.08;
  if (signals.contractions <= 3 && signals.abbreviationCount === 0) scores.professional += 0.06;
  // Concise workplace responses (short but professional)
  if (signals.avgSentenceLength >= 4 && signals.avgSentenceLength <= 12 && !/\b(lol|omg|haha|gonna|wanna|gotta|btw|tbh|bruh|dude)\b/.test(lower)) scores.professional += 0.04;
  // Reduce professional score if warm/caring language is present
  if (/\b(sorry|thank|appreciate|care|love|glad|grateful|hear you|here for you)\b/.test(lower)) scores.professional -= 0.05;

  // Formal: strict transitions, no contractions, long sentences, signoff
  scores.formal = 0;
  if (signals.formalTransitions >= 2) scores.formal += 0.25;
  if (signals.formalTransitions >= 3) scores.formal += 0.1;
  if (signals.contractions === 0 && signals.avgSentenceLength > 12) scores.formal += 0.2;
  if (signals.contractions === 0 && signals.avgSentenceLength <= 12) scores.formal += 0.1;
  if (signals.emojiCount === 0 && signals.exclamationCount <= 1) scores.formal += 0.05;
  if (signals.hasSignoff) scores.formal += 0.1;
  // Formal requires BOTH no contractions AND long sentences (not just no contractions)
  if (signals.contractions === 0 && signals.avgSentenceLength > 15) scores.formal += 0.1;

  // Casual: slang, abbreviations, very short messages, emojis
  scores.casual = 0;
  if (signals.abbreviationCount > 0 && /\b(lol|omg|haha|gonna|wanna|gotta|btw|tbh|bruh|dude|chill|vibe|hey|yep|nah|cool|awesome|slay)\b/.test(lower)) scores.casual += 0.2;
  if (signals.abbreviationCount > 0 && !/\b(lol|omg|haha|gonna|wanna|gotta|btw|tbh|bruh|dude|chill|vibe|hey|yep|nah|cool|awesome|slay)\b/.test(lower)) scores.casual += 0.05;
  if (/\b(lol|omg|haha|gonna|wanna|gotta|btw|tbh|bruh|dude|chill|vibe|hey|yep|nah|cool|awesome|slay)\b/.test(lower)) scores.casual += 0.25;
  if (signals.emojiCount > 0) scores.casual += 0.08;
  if (signals.shortFragments > 0 && signals.sentenceCount <= 2) scores.casual += 0.1;
  if (signals.avgSentenceLength < 4) scores.casual += 0.1;
  // Ultra-short messages (1-4 words) are inherently casual unless they contain work vocabulary
  if (wordCount <= 4 && !/\b(team|project|deadline|deliverable|stakeholder|meeting|schedule|proposal|report|analysis|strategic|initiative|capacity|allocation|prioritize|timeline|milestone)\b/.test(lower)) scores.casual += 0.15;
  // Casual single-word responses
  if (wordCount <= 2 && /\b(sure|yeah|yep|nah|cool|ok|okay|hey|hi|hello|nope|yup|nah|wow|oh|ah|hm|hmm)\b/.test(lower)) scores.casual += 0.2;
  // Conversational patterns — questions in dating/friendship context (not workplace)
  if (signals.questionCount > 0 && signals.avgSentenceLength < 8 && signals.sentenceCount <= 2 && !/\b(understood|acknowledged|confirmed|received|noted|will do|on it|handled|completed|done|submitted|approved|rejected|team|project|deadline|deliverable|stakeholder|meeting|schedule|proposal|report|analysis|strategic|initiative)\b/.test(lower)) scores.casual += 0.08;

  // Direct: short sentences, imperative structure, clear statements
  scores.direct = 0;
  if (/\b(here'?s|the point is|to be clear|bottom line|specifically|exactly|the issue is|straight to the point|no sugarcoating)\b/.test(lower)) scores.direct += 0.3;
  // "let me" only counts as direct if there are no warm/caring signals
  if (/\b(let me)\b/.test(lower) && !/\b(sorry|thank|appreciate|care|love|glad|grateful|hear you|here for you|make it up|help|support|understand|apologize)\b/.test(lower)) scores.direct += 0.25;
  if (signals.avgSentenceLength < 5) scores.direct += 0.1;
  if (signals.sentenceCount >= 3 && signals.shortFragments >= 2) scores.direct += 0.15;
  if (signals.contractions <= 1 && signals.questionCount === 0 && !/\b(sorry|thank|appreciate|care|love|glad|grateful|understand|apologize)\b/.test(lower)) scores.direct += 0.1;
  // Questions alone do NOT make direct — questions are common in many tones
  if (signals.questionCount > 0) scores.direct += 0.03;

  // Diplomatic: hedging language, suggestions, moderate length
  scores.diplomatic = 0;
  if (/\b(perhaps|maybe|consider|suggest|propose|might|could|possibly|option|approach|with all due respect|i see your point|that said|on the other hand)\b/.test(lower)) scores.diplomatic += 0.3;
  if (signals.contractions > 0 && signals.contractions < 3) scores.diplomatic += 0.1;
  if (signals.avgSentenceLength >= 8 && signals.avgSentenceLength <= 15) scores.diplomatic += 0.1;
  if (signals.exclamationCount <= 1) scores.diplomatic += 0.1;

  // Warm: positive affect, interpersonal caring, emotional support
  scores.warm = 0;
  if (/\b(grateful|thankful|love|care|happy|glad|wonderful|beautiful|amazing|delighted|pleased|dear friend|warmly|with love|i hear you|i'm here for you|you matter|means a lot|so glad|really appreciate)\b/.test(lower)) scores.warm += 0.25;
  if (/\b(appreciate|thank|hope|wish|enjoy|miss)\b/.test(lower)) scores.warm += 0.1;
  // Enthusiastic acceptance — "definitely!", "absolutely!", "of course!"
  if (/\b(definitely|absolutely|of course|for sure|totally|100%|hell yes|oh yes|yes!|sure!)\b/.test(lower) && signals.exclamationCount >= 1) scores.warm += 0.2;
  // Reciprocal emotional sharing — "me too", "same", "been feeling"
  if (/\b(me too|same here|same|been feeling|feel the same|feel the same way|i feel|i've been feeling)\b/.test(lower)) scores.warm += 0.15;
  // Warm acknowledgment phrases — "thats what friends are for", "anytime", "dont mention it"
  if (/\b(that'?s what friends are for|anytime|don'?t mention it|no problem|glad to help|happy to help|what are friends for|that's what i'm here for)\b/.test(lower)) scores.warm += 0.2;
  if (signals.exclamationCount >= 1) scores.warm += 0.05;
  if (signals.emojiCount >= 1) scores.warm += 0.03;
  if (signals.hasGreeting) scores.warm += 0.05;
  if (signals.avgSentenceLength >= 6 && signals.avgSentenceLength <= 16) scores.warm += 0.08;
  // Interpersonal framing: "you're", "for you", "about you", "with you"
  if (/\b(you're|for you|about you|with you|you are|your |yours)\b/.test(lower)) scores.warm += 0.1;
  // Emotional support phrases — caring/apologetic/supportive language
  if (/\b(sorry|i hear|understand|feel|want to|let's|can we|together|better|talk|here|care|rely|trust|safe|support|help|love)\b/.test(lower)) scores.warm += 0.12;
  // Apologetic caring (warm but not aggressive)
  if (/\b(sorry|apologize|my bad|my fault|my mistake|i'll make it|i'll do better|i'll fix|i'll work on)\b/.test(lower)) scores.warm += 0.08;
  // Gratitude + caring combination (strong warm signal)
  if (/\b(thank|thanks|appreciate)\b/.test(lower) && /\b(team|everyone|effort|collaboration)\b/.test(lower)) scores.warm += 0.1;
  // Attentive/listening phrases (warm engagement)
  if (/\b(all ears|tell me|what's going on|what do you need|how can i|i'm here|right now|what happened)\b/.test(lower)) scores.warm += 0.12;
  // Encouragement and validation
  if (/\b(support|believe in|proud|you can|i'm here for|you're not alone|we'll get through|you've got this)\b/.test(lower)) scores.warm += 0.1;

  // Empathetic: deep emotional support language (not just "understand" or "help")
  scores.empathetic = 0;
  if (/\b(truly understand how you feel|i can only imagine|that must be so hard|my heart goes out|sending you|i'm so sorry for your loss|please know that|you're not alone|i care about you deeply|here for you|empathize|compassion)\b/.test(lower)) scores.empathetic += 0.4;
  if (/\b(i see how difficult|that must be really|i know this is hard|i know this is tough|i feel for you|i really feel)\b/.test(lower)) scores.empathetic += 0.25;
  if (signals.avgSentenceLength >= 6 && signals.avgSentenceLength <= 14) scores.empathetic += 0.1;
  if (signals.exclamationCount <= 1) scores.empathetic += 0.1;

  // Playful: emojis, exclamations, slang, short sentences
  scores.playful = 0;
  if (signals.emojiCount >= 2) scores.playful += 0.25;
  if (signals.exclamationCount >= 2) scores.playful += 0.1;
  if (/\b(haha|lol|😂|😄|fun|joke|kidding|teasing|silly|goofy|banter|play|game)\b/.test(lower)) scores.playful += 0.25;
  // Playful requires emojis OR humor — not just short sentences
  if (signals.emojiCount >= 1 && signals.avgSentenceLength < 8) scores.playful += 0.1;
  if (signals.shortFragments > 0 && signals.emojiCount >= 1) scores.playful += 0.1;

  // Flirty: romantic interest, playful language
  scores.flirty = 0;
  if (/\b(cute|attractive|charming|date|together|miss|thinking of|can't wait|gorgeous|stunning|handsome|sweet|date night|you look|can't stop thinking)\b/.test(lower)) scores.flirty += 0.3;
  if (signals.emojiCount >= 1) scores.flirty += 0.1;
  if (signals.exclamationCount >= 1) scores.flirty += 0.1;
  if (signals.avgSentenceLength < 10) scores.flirty += 0.1;

  // Assertive: strong modals, imperatives, clear statements
  scores.assertive = 0;
  if (/\b(must|require|expect|demand|clearly|certainly|definitely|absolutely|i insist|we need|this is critical|no exceptions|non-negotiable|mandatory)\b/.test(lower)) scores.assertive += 0.3;
  if (signals.questionCount === 0 && signals.avgSentenceLength < 10 && !/\b(thank|appreciate|care|love|glad|grateful|hear you|here for you|sorry)\b/.test(lower)) scores.assertive += 0.1;
  if (signals.contractions === 0 && !/\b(thank|appreciate|care|love|glad|grateful|hear you|here for you|sorry)\b/.test(lower)) scores.assertive += 0.1;
  if (signals.exclamationCount <= 1) scores.assertive += 0.05;

  // Aggressive: negative affect, absolutes, threats
  scores.aggressive = 0;
  if (/\b(incompetent|useless|waste|terrible|awful|worst|ridiculous|absurd|fired|sue|lawsuit)\b/.test(lower)) scores.aggressive += 0.35;
  if (signals.exclamationCount >= 2) scores.aggressive += 0.15;
  if (signals.contractions === 0) scores.aggressive += 0.1;

  // Passive-aggressive: hedging, sarcasm markers
  scores.passive_aggressive = 0;
  if (/\b(whatever|if you say so|i guess|must be nice|good for you|as usual|surprise surprise)\b/.test(lower)) scores.passive_aggressive += 0.35;
  if (/\b(whatever)\b/.test(lower)) scores.passive_aggressive += 0.1;
  if (/\b(must be nice|good for you|i guess)\b/.test(lower)) scores.passive_aggressive += 0.1;
  if (signals.contractions >= 1) scores.passive_aggressive += 0.1;

  // Respectful: polite markers, formal address, consideration phrases
  scores.respectful = 0;
  if (/\b(please|thank you|appreciate|grateful|kindly|if you don't mind|when you get a chance|at your convenience|i understand|i respect|with respect|sir|ma'am|pardon|excuse me|forgive me)\b/.test(lower)) scores.respectful += 0.3;
  if (signals.contractions > 0 && signals.contractions <= 3) scores.respectful += 0.08;
  if (signals.avgSentenceLength >= 6 && signals.avgSentenceLength <= 14) scores.respectful += 0.08;
  if (signals.formalTransitions > 0) scores.respectful += 0.05;
  if (signals.hasSignoff) scores.respectful += 0.05;

  // Calm: measured language, de-escalation, patience markers
  // REQUIRES explicit calm signals — passive signals alone are not enough
  scores.calm = 0;
  const hasCalmLexicon = /\b(it's okay|no worries|take your time|no rush|let's discuss|let's talk|i understand|i see|that's fine|no problem|all good|we can work this out|let me think|let's figure|step back|calm|steady|measured|patient|relax|breathe|pause|take a breath|let it go)\b/.test(lower);
  if (hasCalmLexicon) scores.calm += 0.35;
  // Structural calm signals — only add bonus if calm lexicon present
  if (hasCalmLexicon && signals.contractions > 0) scores.calm += 0.05;
  if (hasCalmLexicon && signals.avgSentenceLength >= 6 && signals.avgSentenceLength <= 14) scores.calm += 0.05;
  if (hasCalmLexicon && signals.exclamationCount <= 1) scores.calm += 0.05;
  if (hasCalmLexicon && signals.questionCount <= 1) scores.calm += 0.03;

  // Sincere: honesty markers, emotional authenticity, genuine acknowledgment
  scores.sincere = 0;
  if (/\b(honestly|truly|genuinely|from the heart|i mean it|i promise|i assure you|believe me|i care|i want you to know|means a lot|really appreciate|thank you for|grateful for)\b/.test(lower)) scores.sincere += 0.3;
  // Sympathy expressions — genuine acknowledgment of difficulty
  if (/\b(unfortunate|sorry to hear|that's tough|that's hard|i know this is|i feel for you|my thoughts|sending thoughts|hope everyone|hopes? everyone|wish you|wishing you|land on (their|your) feet|get through|pull through|hoping for|thoughts and prayers)\b/.test(lower)) scores.sincere += 0.25;
  // Direct ownership — "i should have", "my mistake", "i'll do better"
  if (/\b(i should have|i should've|my mistake|my fault|i'll do better|i'll be better|next time i|won't happen again|learning from|taking responsibility|owning it)\b/.test(lower)) scores.sincere += 0.2;
  if (signals.contractions > 0) scores.sincere += 0.08;
  if (signals.avgSentenceLength >= 5 && signals.avgSentenceLength <= 14) scores.sincere += 0.08;
  if (signals.exclamationCount <= 1) scores.sincere += 0.05;

  // Enthusiastic: excitement, energy, positive affect
  scores.enthusiastic = 0;
  if (/\b(excited|amazing|awesome|fantastic|wonderful|love it|can't wait|looking forward|this is great|absolutely|definitely|yes|let's do it|count me in|sign me up|that's incredible)\b/.test(lower)) scores.enthusiastic += 0.3;
  if (signals.exclamationCount >= 1) scores.enthusiastic += 0.1;
  if (signals.emojiCount >= 1) scores.enthusiastic += 0.05;
  if (signals.avgSentenceLength < 12) scores.enthusiastic += 0.05;

  // Friendly: warmth, approachability, social connection
  scores.friendly = 0;
  if (/\b(hey|hi|hello|how are you|what's up|good to see|nice to meet|glad|happy|sure|yeah|of course|anytime|no problem|you're welcome|take care)\b/.test(lower)) scores.friendly += 0.25;
  if (signals.contractions > 0) scores.friendly += 0.08;
  if (signals.avgSentenceLength < 10) scores.friendly += 0.08;
  if (signals.hasGreeting) scores.friendly += 0.08;
  if (signals.emojiCount >= 1) scores.friendly += 0.03;

  // Constructive: improvement-oriented, solution-focused
  scores.constructive = 0;
  if (/\b(suggest|recommend|consider|try|improve|what if|how about|one idea|another approach|build on|build upon|strength|opportunity|growth|develop|enhance|refine)\b/.test(lower)) scores.constructive += 0.3;
  if (signals.avgSentenceLength >= 6 && signals.avgSentenceLength <= 14) scores.constructive += 0.08;
  if (signals.contractions > 0 && signals.contractions <= 3) scores.constructive += 0.05;

  return scores;
}

// ─── Combined Tone Detection ─────────────────────────────────────────────────

function detectToneScores(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Lexicon-based scores
  const lexiconScores: Record<string, number> = {};
  for (const [tone, lexicon] of Object.entries(TONE_LEXICONS)) {
    let matches = 0;
    for (const word of lexicon) {
      if (lower.includes(word)) matches++;
    }
    lexiconScores[tone] = wordCount > 0 ? matches / Math.sqrt(wordCount) : 0;
  }

  // Structural scores
  const signals = analyzeStructure(text);
  const structuralScores = scoreStructuralTone(text, signals, wordCount);

  // Find strongest lexicon signal
  let maxLexScore = 0;
  let maxLexTone = "";
  for (const [tone, score] of Object.entries(lexiconScores)) {
    if (score > maxLexScore) {
      maxLexScore = score;
      maxLexTone = tone;
    }
  }

  // Combine: 35% lexicon, 65% structural
  // Structural analysis is more reliable for distinguishing tones
  const combined: Record<string, number> = {};
  const allTones = new Set([...Object.keys(lexiconScores), ...Object.keys(structuralScores)]);
  for (const tone of allTones) {
    const lex = lexiconScores[tone] || 0;
    const str = structuralScores[tone] || 0;

    combined[tone] = 0.35 * lex + 0.65 * str;
  }

  return combined;
}

function getDominantTone(scores: Record<string, number>): string {
  let maxTone = "neutral";
  let maxScore = 0;
  for (const [tone, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxTone = tone;
    }
  }
  return maxTone;
}

function getToneIntensity(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0;
  return Math.max(...values);
}

/**
 * Get all tones with significant presence (score > threshold).
 * This allows detecting multiple simultaneous tones.
 */
function getSignificantTones(scores: Record<string, number>, threshold = 0.05): string[] {
  return Object.entries(scores)
    .filter(([, score]) => score > threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([tone]) => tone);
}

/**
 * Check if two tones are synonyms (semantically similar).
 * Returns true if the detected tone is a valid alternative to the target tone.
 */
function isToneSynonym(targetTone: string, detectedTone: string): boolean {
  if (targetTone === detectedTone) return true;
  const synonyms = TONE_SYNONYM_GROUPS[targetTone];
  return synonyms ? synonyms.includes(detectedTone) : false;
}

/**
 * Check if the target tone is present among the significant tones.
 * Only gives credit when tones are compatible (synonyms or overlapping dimensions).
 */
function isTonePresent(
  targetTone: string,
  scores: Record<string, number>,
  significantTones: string[]
): { present: boolean; targetScore: number; rank: number } {
  const targetScore = scores[targetTone] || 0;
  const rank = significantTones.indexOf(targetTone);
  const dominantTone = significantTones[0] || "";
  
  // Check if target is a synonym of the dominant tone
  const isSyn = isToneSynonym(targetTone, dominantTone);
  
  // Check if dominant tone is incompatible with target
  const INCOMPATIBLE_DOMINANT: Record<string, string[]> = {
    professional: ["aggressive", "passive_aggressive"],
    formal: ["aggressive", "passive_aggressive", "casual"],
    warm: ["aggressive"],
    empathetic: ["aggressive"],
    diplomatic: ["aggressive"],
    casual: ["formal", "aggressive"],
    friendly: ["formal", "aggressive"],
  };
  
  const incompatible = INCOMPATIBLE_DOMINANT[targetTone] || [];
  const dominantIsIncompatible = incompatible.includes(dominantTone);
  
  // Target tone is present if:
  // 1. It IS the dominant tone, OR
  // 2. It has a strong score (> 0.15) AND dominant is not incompatible, OR
  // 3. It's a synonym of the dominant tone AND dominant has a reasonable score (> 0.05), OR
  // 4. It's among the top 4 significant tones with reasonable score (> 0.05)
  const present = rank === 0 || (targetScore > 0.15 && !dominantIsIncompatible) || (isSyn && scores[dominantTone] > 0.05) || (rank >= 0 && rank <= 3 && targetScore > 0.05);
  
  return { present, targetScore, rank };
}

// ─── Context Compatibility ───────────────────────────────────────────────────

const CONTEXT_TONE_RULES: Record<string, { compatible: string[]; incompatible: string[] }> = {
  professional: {
    compatible: ["formal", "professional", "direct", "diplomatic", "respectful", "calm", "constructive"],
    incompatible: ["flirty", "aggressive", "passive_aggressive", "playful"],
  },
  academic: {
    compatible: ["formal", "direct", "respectful", "constructive", "professional"],
    incompatible: ["flirty", "aggressive"],
  },
  interview: {
    compatible: ["formal", "professional", "assertive", "warm", "respectful", "confident"],
    incompatible: ["aggressive", "passive_aggressive", "flirty"],
  },
  conflict: {
    compatible: ["diplomatic", "warm", "empathetic", "direct", "calm", "sincere", "respectful", "professional"],
    incompatible: ["aggressive", "playful", "flirty"],
  },
  dating: {
    compatible: ["casual", "playful", "flirty", "warm", "sincere", "enthusiastic", "friendly", "professional", "calm"],
    incompatible: ["aggressive"],
  },
  friendship: {
    compatible: ["casual", "warm", "playful", "empathetic", "friendly", "enthusiastic", "sincere", "professional", "calm"],
    incompatible: ["aggressive"],
  },
  family: {
    compatible: ["warm", "casual", "empathetic", "sincere", "respectful", "friendly", "calm"],
    incompatible: ["aggressive"],
  },
  customer: {
    compatible: ["formal", "professional", "warm", "empathetic", "respectful", "calm", "friendly"],
    incompatible: ["aggressive", "flirty", "playful"],
  },
  negotiation: {
    compatible: ["assertive", "direct", "diplomatic", "professional", "respectful", "constructive", "calm"],
    incompatible: ["aggressive", "flirty", "playful"],
  },
  group: {
    compatible: ["casual", "formal", "direct", "diplomatic", "professional", "respectful", "friendly", "calm"],
    incompatible: ["flirty", "aggressive"],
  },
};

function checkContextCompatibility(
  detectedTone: string,
  contextType: string
): { compatible: boolean; severity: "none" | "minor" | "severe" } {
  const rules = CONTEXT_TONE_RULES[contextType];
  if (!rules) return { compatible: true, severity: "none" };
  
  if (rules.incompatible.includes(detectedTone)) {
    return { compatible: false, severity: "severe" };
  }
  
  if (rules.compatible.includes(detectedTone)) {
    return { compatible: true, severity: "none" };
  }
  
  // Neutral tones are generally compatible
  if (detectedTone === "neutral") return { compatible: true, severity: "none" };
  
  return { compatible: true, severity: "minor" };
}

// ─── Main Tone Evaluator ─────────────────────────────────────────────────────

export function evaluateTone(
  benchCase: BenchmarkCase,
  candidate: string,
  context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];
  
  const scores = detectToneScores(candidate);
  const detectedTone = getDominantTone(scores);
  const intensity = getToneIntensity(scores);
  const significantTones = getSignificantTones(scores, 0.05);
  
  // Target tone match — dimensional scoring
  if (benchCase.expected.tone || benchCase.targetTone) {
    const rawTargetTone = benchCase.expected.tone || benchCase.targetTone || "";
    // Handle compound tones like "casual_professional" — split and check ANY component
    // But don't split known compound tones like "passive_aggressive"
    const KNOWN_COMPOUNDS = new Set(["passive_aggressive"]);
    const targetComponents = KNOWN_COMPOUNDS.has(rawTargetTone)
      ? [rawTargetTone]
      : rawTargetTone.split("_").filter((t) => t.length > 0);
    
    // For compound tones, check if ANY component tone is present
    let bestMatchValue = 0;
    let bestMatchPass: PassFail = "FAIL";
    let bestMatchDetails = "";
    
    for (const targetTone of targetComponents) {
    const targetScore = scores[targetTone] || 0;
    const dominantTone = significantTones[0] || "";
    const isExactMatch = detectedTone === targetTone;
    const isSynonym = isToneSynonym(targetTone, dominantTone);
    const tonePresence = isTonePresent(targetTone, scores, significantTones);

    // Check if dominant tone is incompatible with target
    const INCOMPATIBLE: Record<string, string[]> = {
      professional: ["aggressive", "passive_aggressive"],
      formal: ["aggressive", "passive_aggressive", "casual"],
      warm: ["aggressive"],
      empathetic: ["aggressive"],
      diplomatic: ["aggressive"],
      casual: ["formal", "aggressive"],
      friendly: ["formal", "aggressive"],
      respectful: ["aggressive", "passive_aggressive"],
      calm: ["aggressive", "passive_aggressive"],
      sincere: ["aggressive", "passive_aggressive"],
      enthusiastic: ["aggressive", "passive_aggressive"],
      constructive: ["aggressive", "passive_aggressive"],
    };
    const dominantIsIncompatible = (INCOMPATIBLE[targetTone] || []).includes(dominantTone);

    let matchValue: number;
    let matchPass: PassFail;

    if (isExactMatch) {
      matchValue = 1;
      matchPass = "PASS";
    } else if (tonePresence.present && targetScore > 0.15 && !dominantIsIncompatible) {
      matchValue = 0.85;
      matchPass = "PASS";
    } else if (tonePresence.present && targetScore > 0.08 && !dominantIsIncompatible) {
      matchValue = 0.7;
      matchPass = "PASS";
    } else if (isSynonym && targetScore > 0.05 && !dominantIsIncompatible) {
      matchValue = 0.65;
      matchPass = "PASS";
    } else if (isSynonym && targetScore > 0.02 && !dominantIsIncompatible) {
      matchValue = 0.55;
      matchPass = "PASS";
    } else if (isSynonym && tonePresence.present && !dominantIsIncompatible) {
      matchValue = 0.6;
      matchPass = "PASS";
    } else if (isSynonym && scores[dominantTone] > 0.2 && !dominantIsIncompatible) {
      matchValue = 0.5;
      matchPass = "PASS";
    } else if (tonePresence.present && tonePresence.rank >= 0 && tonePresence.rank <= 3 && targetScore > 0.05 && !dominantIsIncompatible) {
      matchValue = 0.5;
      matchPass = "PASS";
    } else if (isSynonym && !dominantIsIncompatible) {
      matchValue = 0.45;
      matchPass = "WARN";
    } else if (targetScore > 0.15 && !dominantIsIncompatible) {
      matchValue = 0.4;
      matchPass = "WARN";
    } else if (dominantIsIncompatible && targetScore > 0.05) {
      matchValue = 0.1;
      matchPass = "WARN";
    } else if (targetScore > 0.05) {
      matchValue = 0.2;
      matchPass = "WARN";
    } else {
      matchValue = 0;
      matchPass = "FAIL";
    }

    if (matchValue > bestMatchValue) {
      bestMatchValue = matchValue;
      bestMatchPass = matchPass;
      bestMatchDetails = `Target: "${rawTargetTone}" (component: "${targetTone}"), Detected: "${detectedTone}", Score: ${targetScore.toFixed(3)}, Significant: [${significantTones.slice(0, 4).join(", ")}]${isSynonym ? " (synonym)" : ""}`;
    }
    } // end for each component

    metrics.push({
      name: "tone_target_match",
      value: bestMatchValue,
      pass: bestMatchPass,
      details: bestMatchDetails,
    });
  }
  
  // Tone intensity
  metrics.push({
    name: "tone_intensity",
    value: intensity,
    pass: intensity > 0.1 ? "PASS" : "WARN",
    details: `Tone intensity: ${intensity.toFixed(3)}`,
  });
  
  // Context compatibility — check dominant tone
  const contextType = context.detectedContext?.conversationType as string || benchCase.context;
  if (contextType) {
    const compat = checkContextCompatibility(detectedTone, contextType);
    metrics.push({
      name: "tone_context_compatibility",
      value: compat.compatible ? 1 : compat.severity === "severe" ? 0 : 0.5,
      pass: compat.compatible ? "PASS" : compat.severity === "severe" ? "FAIL" : "WARN",
      details: `Tone "${detectedTone}" in ${contextType} context: ${compat.severity}`,
    });
  }
  
  // Check unacceptable tone patterns
  if (benchCase.expected.unacceptablePatterns) {
    for (const pattern of benchCase.expected.unacceptablePatterns) {
      const regex = new RegExp(pattern, "i");
      const found = regex.test(candidate);
      metrics.push({
        name: `tone_unacceptable_${pattern.slice(0, 20)}`,
        value: found ? 0 : 1,
        pass: found ? "FAIL" : "PASS",
        details: found ? `Unacceptable tone pattern "${pattern}" found` : `Pattern "${pattern}" absent`,
      });
    }
  }
  
  // Check required tone patterns
  if (benchCase.expected.requiredPatterns) {
    for (const pattern of benchCase.expected.requiredPatterns) {
      const regex = new RegExp(pattern, "i");
      const found = regex.test(candidate);
      metrics.push({
        name: `tone_required_${pattern.slice(0, 20)}`,
        value: found ? 1 : 0,
        pass: found ? "PASS" : "FAIL",
        details: found ? `Required tone pattern "${pattern}" found` : `Required pattern "${pattern}" missing`,
      });
    }
  }
  
  // Overall
  const failures = metrics.filter((m) => m.pass === "FAIL");
  const warnings = metrics.filter((m) => m.pass === "WARN");
  
  let overall: PassFail = "PASS";
  if (failures.length > 0) overall = "FAIL";
  else if (warnings.length > 0) overall = "WARN";
  
  const score = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
    : 1;
  
  return {
    caseId: benchCase.id,
    category: benchCase.category,
    difficulty: benchCase.difficulty,
    metrics,
    overall,
    score,
    executionTimeMs: Date.now() - startTime,
    evaluatorVersion: "3.0.0",
  };
}
