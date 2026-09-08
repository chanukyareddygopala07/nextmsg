// ─── Style Extractor ──────────────────────────────────────────────────────────
//
// Deterministic extraction of writing style characteristics from messages.
// Analyzes the USER's messages only (not the other person's).
// ──────────────────────────────────────────────────────────────────────────────

import type {
  WritingStyleProfile,
  StyleGuidance,
  EmojiProfile,
  PunctuationProfile,
  SentenceProfile,
  SlangProfile,
  HumorProfile,
  TonePreference,
  EmojiPlacement,
  PunctuationStyle,
  FormalityLevel,
} from "./personality";

// ─── Common Slang & Abbreviations ────────────────────────────────────────────

const COMMON_ABBREVIATIONS = new Set([
  "lol", "omg", "brb", "ttyl", "btw", "imo", "tbh", "ngl", "idk", "ily",
  "smh", "nvm", "rn", "afk", "fwiw", "iirc", "afaik", "ikr", "ily2",
  "ily", "ilya", "wbu", "wyd", "hbu", "wby", "ikykm", "istg",
]);

const COMMON_SLANG = new Set([
  "yep", "yea", "nah", "nope", "gonna", "wanna", "gotta", "kinda", "sorta",
  "dunno", "lemme", "gimme", "shoulda", "coulda", "woulda", "aint", "dun",
  "haha", "lmao", "rofl", "kek", "bruh", "fam", "dead", "slay",
  "vibe", "lowkey", "highkey", "sus", "cap", "no_cap", "bet", "fr",
  "ngl", "tbf", "fml", "istg", "idgaf", "af", "periodt",
  "slaps", "bussin", "ate", "serving", "iconic", "main_character",
]);

const HUMOR_INDICATORS = [
  /\b(haha|lmao|rofl|kek|lol|xd)\b/i,
  /😂|🤣|💀|☠️|😭|😂/,
  /\b(that'?s (hilarious|funny|gold|iconic))\b/i,
  /\b(im (dead|dying|crying))\b/i,
  /\b(naur|yuh|bruh)\b/i,
  /\b(slay|ate|bussin|no_cap)\b/i,
];

const FORMAL_MARKERS = [
  /\b(thank you|please|appreciate|regarding|concerning|furthermore|moreover)\b/i,
  /\b(sincerely|best regards|kind regards|respectfully)\b/i,
  /\b(i would like|i appreciate|i understand)\b/i,
];

const CASUAL_MARKERS = [
  /\b(yeah|yep|nah|nope|cool|awesome|nice|sweet|dope|sick)\b/i,
  /\b(haha|lol|omg|bruh|fam|dead)\b/i,
  /\b(gonna|wanna|gotta|kinda|sorta|dunno)\b/i,
];

const WARMTH_INDICATORS = [
  /\b(love|miss|care|miss you|thinking of you)\b/i,
  /\b(sweet|adorable|cute|amazing|wonderful)\b/i,
  /❤️|💕|💗|🥰|😊|🤗/,
];

const DIRECTNESS_INDICATORS = [
  /\b(i need|i want|can you|please|do this|let'?s)\b/i,
  /\b(no|i disagree|that'?s (wrong|not right))\b/i,
  /\b(stop|don'?t|never|always)\b/i,
];

// ─── Emoji Detection ──────────────────────────────────────────────────────────

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{200D}\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;

function extractEmojis(text: string): string[] {
  return text.match(EMOJI_REGEX) || [];
}

function categorizeEmoji(emoji: string): string {
  const faces = /[\u{1F600}-\u{1F64F}]/u;
  const hands = /[\u{1F900}-\u{1F9FF}]/u;
  const hearts = /[\u{2764}\u{1F491}-\u{1F499}\u{1F5A4}\u{1F90D}-\u{1F90E}\u{1FA75}-\u{1FA77}]/u;
  const objects = /[\u{1F300}-\u{1F5FF}]/u;

  if (faces.test(emoji)) return "faces";
  if (hands.test(emoji)) return "hands";
  if (hearts.test(emoji)) return "hearts";
  if (objects.test(emoji)) return "objects";
  return "other";
}

// ─── Core Extraction ──────────────────────────────────────────────────────────

export function extractWritingStyle(
  userMessages: { sender: string; text: string }[]
): WritingStyleProfile {
  const texts = userMessages
    .filter((m) => m.sender === "me")
    .map((m) => m.text);

  if (texts.length === 0) {
    return getDefaultProfile();
  }

  const emoji = extractEmojiProfile(texts);
  const punctuation = extractPunctuationProfile(texts);
  const sentence = extractSentenceProfile(texts);
  const slang = extractSlangProfile(texts);
  const humor = extractHumorProfile(texts);
  const tonePreference = extractTonePreference(texts, emoji, slang, humor);

  const confidence = calculateConfidence(texts.length, emoji, punctuation, slang);

  return {
    emoji,
    punctuation,
    sentence,
    slang,
    humor,
    tonePreference,
    confidence,
    messageCount: texts.length,
    languageStyle: inferLanguageStyle(texts, slang),
  };
}

// ─── Emoji Profile ───────────────────────────────────────────────────────────

function extractEmojiProfile(texts: string[]): EmojiProfile {
  let totalEmojis = 0;
  let messagesWithEmojis = 0;
  const allEmojis: string[] = [];
  let placementEnd = 0;
  let placementInline = 0;

  for (const text of texts) {
    const emojis = extractEmojis(text);
    if (emojis.length > 0) {
      messagesWithEmojis++;
      totalEmojis += emojis.length;
      allEmojis.push(...emojis);

      // Check placement
      const lastEmoji = emojis[emojis.length - 1];
      const lastEmojiIndex = text.lastIndexOf(lastEmoji);
      if (lastEmojiIndex === text.length - lastEmoji.length) {
        placementEnd++;
      } else {
        placementInline++;
      }
    }
  }

  const frequency = texts.length > 0 ? messagesWithEmojis / texts.length : 0;
  const placement: EmojiPlacement =
    messagesWithEmojis === 0
      ? "none"
      : placementEnd > placementInline
        ? "end"
        : placementInline > placementEnd
          ? "inline"
          : "mixed";

  // Count emoji frequencies
  const emojiCounts = new Map<string, number>();
  for (const e of allEmojis) {
    emojiCounts.set(e, (emojiCounts.get(e) || 0) + 1);
  }
  const commonEmojis = [...emojiCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([e]) => e);

  // Categorize
  const categories = new Set<string>();
  for (const e of allEmojis) {
    categories.add(categorizeEmoji(e));
  }

  return {
    usesEmojis: totalEmojis > 0,
    frequency: Math.min(1, frequency * 2),
    placement,
    commonEmojis,
    categories: [...categories],
  };
}

// ─── Punctuation Profile ──────────────────────────────────────────────────────

function extractPunctuationProfile(texts: string[]): PunctuationProfile {
  let exclamationCount = 0;
  let questionCount = 0;
  let ellipsesCount = 0;
  let periodEndCount = 0;
  let multiPunctCount = 0;
  let totalEndMarks = 0;

  for (const text of texts) {
    const trimmed = text.trim();
    const lastChar = trimmed.slice(-1);

    if (lastChar === "!") exclamationCount++;
    if (lastChar === "?") questionCount++;
    if (/\.{3,}/.test(trimmed)) ellipsesCount++;
    if (lastChar === ".") periodEndCount++;
    if (/[!?]{2,}/.test(trimmed)) multiPunctCount++;

    if (/[.!?]/.test(lastChar)) totalEndMarks++;
  }

  const total = texts.length || 1;
  const exclamationRate = exclamationCount / total;
  const questionRate = questionCount / total;
  const multiPunctuationRate = multiPunctCount / total;

  let style: PunctuationStyle;
  if (exclamationRate > 0.4 || multiPunctuationRate > 0.2) {
    style = "expressive";
  } else if (exclamationRate < 0.05 && questionRate < 0.1 && periodEndCount === 0) {
    style = "minimal";
  } else {
    style = "standard";
  }

  return {
    style,
    exclamationRate: Math.min(1, exclamationRate * 2),
    questionRate: Math.min(1, questionRate * 2),
    usesEllipses: ellipsesCount > 0,
    endsWithPeriod: periodEndCount > total * 0.3,
    multiPunctuationRate: Math.min(1, multiPunctuationRate * 3),
  };
}

// ─── Sentence Profile ─────────────────────────────────────────────────────────

function extractSentenceProfile(texts: string[]): SentenceProfile {
  let totalWords = 0;
  let totalChars = 0;
  let completeSentences = 0;

  for (const text of texts) {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    totalWords += words.length;
    totalChars += text.length;

    // A complete sentence typically ends with . ! ? and starts with a capital letter
    if (/[.!?]\s*$/.test(text.trim()) && /^[A-Z]/.test(text.trim())) {
      completeSentences++;
    }
  }

  const count = texts.length || 1;
  const averageWords = totalWords / count;
  const averageChars = totalChars / count;
  const completenessRate = completeSentences / count;

  let lengthCategory: SentenceProfile["lengthCategory"];
  if (averageWords <= 3) lengthCategory = "very_short";
  else if (averageWords <= 7) lengthCategory = "short";
  else if (averageWords <= 15) lengthCategory = "medium";
  else lengthCategory = "long";

  return {
    averageWords: Math.round(averageWords * 10) / 10,
    averageChars: Math.round(averageChars * 10) / 10,
    completenessRate: Math.round(completenessRate * 100) / 100,
    prefersFragments: completenessRate < 0.3,
    lengthCategory,
  };
}

// ─── Slang Profile ───────────────────────────────────────────────────────────

function extractSlangProfile(texts: string[]): SlangProfile {
  let slangCount = 0;
  let abbrevCount = 0;
  let totalWords = 0;
  const foundSlang: string[] = [];
  const foundAbbreviations: string[] = [];

  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/);
    totalWords += words.length;

    for (const word of words) {
      const clean = word.replace(/[^a-z0-9_]/g, "");
      if (COMMON_SLANG.has(clean)) {
        slangCount++;
        if (!foundSlang.includes(clean)) foundSlang.push(clean);
      }
      if (COMMON_ABBREVIATIONS.has(clean)) {
        abbrevCount++;
        if (!foundAbbreviations.includes(clean)) foundAbbreviations.push(clean);
      }
    }
  }

  const frequency = totalWords > 0 ? (slangCount + abbrevCount) / totalWords : 0;

  return {
    usesSlang: slangCount > 0 || abbrevCount > 0,
    frequency: Math.min(1, frequency * 5),
    commonSlang: foundSlang.slice(0, 10),
    commonAbbreviations: foundAbbreviations.slice(0, 10),
    codeSwitchTendency: estimateCodeSwitch(texts),
  };
}

function estimateCodeSwitch(texts: string[]): number {
  let mixedCount = 0;
  for (const text of texts) {
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasIndic = /[\u0900-\u097F\u0A00-\u0A7F\u0B00-\u0B7F\u0C00-\u0C7F\u0D00-\u0D7F]/.test(text);
    if (hasLatin && hasIndic) mixedCount++;
  }
  return texts.length > 0 ? mixedCount / texts.length : 0;
}

// ─── Humor Profile ────────────────────────────────────────────────────────────

function extractHumorProfile(texts: string[]): HumorProfile {
  let humorScore = 0;
  const indicators: string[] = [];

  for (const text of texts) {
    for (const pattern of HUMOR_INDICATORS) {
      const match = text.match(pattern);
      if (match) {
        humorScore++;
        const indicator = match[0];
        if (!indicators.includes(indicator)) {
          indicators.push(indicator);
        }
      }
    }
  }

  const usesHumor = humorScore > 0;
  const frequency = texts.length > 0 ? humorScore / texts.length : 0;

  let style: HumorProfile["style"] = "none";
  if (usesHumor) {
    if (/\b(slay|ate|bussin|no_cap|periodt)\b/i.test(indicators.join(" "))) {
      style = "playful";
    } else if (/\b(bruh|dead|dying|crying)\b/i.test(indicators.join(" "))) {
      style = "absurdist";
    } else if (indicators.some((i) => /😂|🤣|💀/.test(i))) {
      style = "witty";
    } else {
      style = "playful";
    }
  }

  return {
    usesHumor,
    indicators: indicators.slice(0, 10),
    style,
  };
}

// ─── Tone Preference ──────────────────────────────────────────────────────────

function extractTonePreference(
  texts: string[],
  emoji: EmojiProfile,
  slang: SlangProfile,
  humor: HumorProfile
): TonePreference {
  let formalityScore = 0;
  let warmthScore = 0;
  let directnessScore = 0;

  for (const text of texts) {
    if (FORMAL_MARKERS.some((p) => p.test(text))) formalityScore++;
    if (CASUAL_MARKERS.some((p) => p.test(text))) formalityScore--;
    if (WARMTH_INDICATORS.some((p) => p.test(text))) warmthScore++;
    if (DIRECTNESS_INDICATORS.some((p) => p.test(text))) directnessScore++;
  }

  // Adjust for emoji and slang
  if (emoji.usesEmojis) warmthScore += 2;
  if (slang.usesSlang) formalityScore -= 2;
  if (humor.usesHumor) warmthScore++;

  const total = texts.length || 1;
  const warmth = Math.max(0, Math.min(1, (warmthScore + total) / (total * 2)));
  const directness = Math.max(0, Math.min(1, (directnessScore + total) / (total * 2)));

  let formality: FormalityLevel;
  const normalizedFormality = formalityScore / total;
  if (normalizedFormality < -0.5) formality = "very_casual";
  else if (normalizedFormality < -0.1) formality = "casual";
  else if (normalizedFormality < 0.1) formality = "neutral";
  else if (normalizedFormality < 0.5) formality = "formal";
  else formality = "very_formal";

  // Infer dominant and secondary tones
  let dominant = "casual";
  let secondary = "friendly";

  if (formality === "formal" || formality === "very_formal") {
    dominant = "professional";
    secondary = "formal";
  } else if (warmth > 0.7) {
    dominant = "warm";
    secondary = "friendly";
  } else if (directness > 0.7) {
    dominant = "direct";
    secondary = "assertive";
  } else if (humor.usesHumor) {
    dominant = "playful";
    secondary = "humorous";
  } else if (slang.usesSlang && slang.frequency > 0.3) {
    dominant = "casual";
    secondary = "informal";
  }

  return {
    dominant,
    secondary,
    formality,
    warmth,
    directness,
  };
}

// ─── Language Style ───────────────────────────────────────────────────────────

function inferLanguageStyle(texts: string[], slang: SlangProfile): string {
  const hasIndic = texts.some((t) =>
    /[\u0900-\u097F\u0A00-\u0A7F\u0B00-\u0B7F\u0C00-\u0C7F\u0D00-\u0D7F]/.test(t)
  );
  const hasLatin = texts.some((t) => /[a-zA-Z]/.test(t));
  const mixed = hasIndic && hasLatin;

  if (mixed) return "code_mixed";
  if (hasIndic) return "native_script";
  if (slang.usesSlang) return "informal_english";
  return "standard_english";
}

// ─── Confidence Calculation ───────────────────────────────────────────────────

function calculateConfidence(
  messageCount: number,
  emoji: EmojiProfile,
  punctuation: PunctuationProfile,
  slang: SlangProfile
): number {
  let confidence = 0.3; // Base confidence

  // More messages = more confidence
  if (messageCount >= 3) confidence += 0.2;
  if (messageCount >= 7) confidence += 0.15;
  if (messageCount >= 15) confidence += 0.1;

  // Strong signals increase confidence
  if (emoji.usesEmojis && emoji.frequency > 0.3) confidence += 0.1;
  if (slang.usesSlang && slang.frequency > 0.2) confidence += 0.1;
  if (punctuation.style === "expressive") confidence += 0.05;

  return Math.min(0.95, confidence);
}

// ─── Default Profile ──────────────────────────────────────────────────────────

function getDefaultProfile(): WritingStyleProfile {
  return {
    emoji: {
      usesEmojis: false,
      frequency: 0,
      placement: "none",
      commonEmojis: [],
      categories: [],
    },
    punctuation: {
      style: "standard",
      exclamationRate: 0,
      questionRate: 0,
      usesEllipses: false,
      endsWithPeriod: false,
      multiPunctuationRate: 0,
    },
    sentence: {
      averageWords: 7,
      averageChars: 40,
      completenessRate: 0.5,
      prefersFragments: false,
      lengthCategory: "medium",
    },
    slang: {
      usesSlang: false,
      frequency: 0,
      commonSlang: [],
      commonAbbreviations: [],
      codeSwitchTendency: 0,
    },
    humor: {
      usesHumor: false,
      indicators: [],
      style: "none",
    },
    tonePreference: {
      dominant: "casual",
      secondary: "friendly",
      formality: "casual",
      warmth: 0.5,
      directness: 0.5,
    },
    confidence: 0.3,
    messageCount: 0,
    languageStyle: "standard_english",
  };
}

// ─── Style Guidance Generator ─────────────────────────────────────────────────
//
// Converts a WritingStyleProfile into actionable guidance for the generator.
// ──────────────────────────────────────────────────────────────────────────────

export function generateStyleGuidance(profile: WritingStyleProfile): StyleGuidance {
  const instructions: string[] = [];
  const examples: string[] = [];
  const avoid: string[] = [];

  // Length guidance
  switch (profile.sentence.lengthCategory) {
    case "very_short":
      instructions.push("Keep messages very short (1-3 words).");
      examples.push("nah", "for real", "lol");
      avoid.push("long paragraphs", "complete sentences");
      break;
    case "short":
      instructions.push("Keep messages short (1 short sentence).");
      examples.push("haha yeah", "that's wild", "wait what");
      avoid.push("multiple sentences", "excessive detail");
      break;
    case "medium":
      instructions.push("Use medium-length messages (1-2 sentences).");
      avoid.push("extremely long responses");
      break;
    case "long":
      instructions.push("Can use longer messages when needed.");
      break;
  }

  // Emoji guidance
  if (profile.emoji.usesEmojis) {
    const emojiList = profile.emoji.commonEmojis.join(" ");
    instructions.push(`Use emojis naturally. Common emojis: ${emojiList}`);
    if (profile.emoji.placement === "end") {
      examples.push("haha " + emojiList.split(" ")[0]);
      instructions.push("Place emojis at the end of messages.");
    } else if (profile.emoji.placement === "inline") {
      instructions.push("Sprinkle emojis within messages.");
    }
  } else {
    avoid.push("emojis", "excessive emoji usage");
  }

  // Punctuation guidance
  if (profile.punctuation.style === "expressive") {
    instructions.push("Use expressive punctuation (!!!, ???).");
    examples.push("no way!!!", "wait seriously??");
    avoid.push("restrained punctuation");
  } else if (profile.punctuation.style === "minimal") {
    instructions.push("Use minimal punctuation. Skip periods and exclamation marks.");
    examples.push("yeah", "nah that's crazy");
    avoid.push("periods", "exclamation marks");
  }

  // Slang guidance
  if (profile.slang.usesSlang) {
    const slangWords = profile.slang.commonSlang.slice(0, 5).join(", ");
    instructions.push(`Use casual slang naturally: ${slangWords}`);
    avoid.push("formal language", "proper grammar where slang fits better");
  }

  // Humor guidance
  if (profile.humor.usesHumor) {
    switch (profile.humor.style) {
      case "witty":
        instructions.push("Be witty and clever with responses.");
        examples.push("plot twist: ", "big brain energy");
        break;
      case "playful":
        instructions.push("Be playful and light-hearted.");
        examples.push("lmao wait", "no but actually");
        break;
      case "sarcastic":
        instructions.push("Use light sarcasm where appropriate.");
        examples.push("oh wow really", "shocking");
        break;
      case "absurdist":
        instructions.push("Embrace absurdist humor.");
        examples.push("i'm literally dead", "this is fine");
        break;
    }
  }

  // Tone guidance
  if (profile.tonePreference.warmth > 0.7) {
    instructions.push("Keep the tone warm and affectionate.");
  }
  if (profile.tonePreference.directness > 0.7) {
    instructions.push("Be direct and straightforward.");
  }
  if (profile.tonePreference.formality === "very_formal") {
    instructions.push("Maintain formal language throughout.");
    avoid.push("slang", "contractions", "casual phrasing");
  }

  // Fragment guidance
  if (profile.sentence.prefersFragments) {
    instructions.push("Use sentence fragments. Don't always write complete sentences.");
    examples.push("big mood", "same honestly");
    avoid.push("complete grammatical sentences");
  }

  const instruction = instructions.slice(0, 4).join(" ");

  return {
    instruction,
    examples: examples.slice(0, 5),
    avoid: avoid.slice(0, 5),
    confidence: profile.confidence,
  };
}
