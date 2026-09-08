import type {
  IndicLanguage,
  ScriptType,
  LanguageRatio,
  LanguageState,
  ParticipantLanguage,
} from "./language";
import { SCRIPT_RANGES, ROMANIZED_MARKERS, CODE_MIX_INDICATORS } from "./language";

// ─── Script Detection ─────────────────────────────────────────────────────────
// Deterministic Unicode-based script detection for native scripts.

export function detectScriptType(text: string): {
  scripts: ScriptType[];
  dominant: ScriptType;
  hasLatin: boolean;
  hasIndic: boolean;
  hasMixed: boolean;
} {
  const scriptCounts: Record<string, number> = {};

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x20) continue; // skip control chars
    if (code >= 0x41 && code <= 0x5a) { scriptCounts.latin = (scriptCounts.latin || 0) + 1; continue; } // A-Z
    if (code >= 0x61 && code <= 0x7a) { scriptCounts.latin = (scriptCounts.latin || 0) + 1; continue; } // a-z

    for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
      for (const [min, max] of ranges) {
        if (code >= min && code <= max) {
          scriptCounts[script] = (scriptCounts[script] || 0) + 1;
          break;
        }
      }
    }
  }

  const hasLatin = (scriptCounts.latin || 0) > 0;
  const indicScripts = Object.keys(scriptCounts).filter(
    (s) => s !== "latin" && s !== "unknown"
  );
  const hasIndic = indicScripts.length > 0;
  const hasMixed = hasLatin && hasIndic;

  const scripts: ScriptType[] = [];
  if (hasLatin) scripts.push("latin");
  for (const s of indicScripts) {
    if (s === "oriya") scripts.push("odia");
    else scripts.push(s as ScriptType);
  }
  if (scripts.length === 0) scripts.push("unknown");

  let dominant: ScriptType = "unknown";
  let maxCount = 0;
  for (const [script, count] of Object.entries(scriptCounts)) {
    if (script === "latin") continue;
    if (count > maxCount) {
      maxCount = count;
      dominant = script === "oriya" ? "odia" : (script as ScriptType);
    }
  }
  if (maxCount === 0 && hasLatin) dominant = "latin";

  return { scripts, dominant, hasLatin, hasIndic, hasMixed };
}

// ─── Romanized Language Detection ─────────────────────────────────────────────
// Heuristic detection of Romanized Indic language text.
// Uses priority-based detection to handle overlapping patterns.

export function detectRomanizedLanguage(
  text: string
): { language: IndicLanguage; confidence: number } | null {
  const words = text.toLowerCase().split(/\s+/);
  const scores: Record<IndicLanguage, number> = {} as Record<IndicLanguage, number>;

  // First pass: score each language
  for (const [lang, patterns] of Object.entries(ROMANIZED_MARKERS) as [IndicLanguage, RegExp[]][]) {
    let matches = 0;
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) matches += m.length;
    }
    if (matches > 0) {
      scores[lang] = matches / Math.max(words.length, 1);
    }
  }

  // Priority-based detection: check for language-specific unique markers first
  // These markers are more distinctive and less likely to overlap
  const priorityMarkers: Record<IndicLanguage, RegExp[]> = {
    telugu: [
      /\b(naku|nuvvu|memu|manam|idhi|adhi|ela|enduku|appudu|ippudu|aledu|chedu|undi|undhi|chestha|chesthunna|untanu|vellanu|matladham|repu|ivala|nunchi|daggara|lopu|bayata|mundu|venaka|meeda|kindha|thelusthundhi|telusu|kaadhu|avunu|ledhu|enta|eppudu|edhi|evaru|emiti)\b/i,
    ],
    tamil: [
      /\b(naan|neenga|romba|adhukku|epdi|vanakkam|nanri|solli|panren|panlam|varen|vaanga|irukku|irukkaen|illai|aamaa|konjam|edhukku|panra|pannu|solra|sollu|varra|vaaru|irukkra|machaa|dei|irukkiraen|panrom|pannalam|solren|varuven|iruppen)\b/i,
    ],
    kannada: [
      /\b(nanu|nimage|tamage|hege|yakke|yaavaga|eega|illi|allu|tumba|chennagi|saaku|maadu|maadthini|barthini|hogthini|iruthini|bantu|hoythu|maadidhu|maaduva|haudu|eeshtu|nimge|avaru|naavu|neevu|madi|barutte|hogutte|iddini)\b/i,
    ],
    malayalam: [
      /\b(njan|njangal|engane|entha|parayuka|cheyuka|varuka|irikkuka|pokaan|vannu|cheithu|irunnu|aakunnu|aahn|sheriy|ningal|avar|avarkku|enikku|nammuku|aanu)\b/i,
    ],
    hindi: [
      /\b(kya|kyun|kaise|chalo|samajh|bolo|suno|dekh|raha|rahi|hoga|hogi|hoon|aap|tujhe|usko|unko|yeh|woh|kuch|bahut|accha|thoda|jaldi|abhi|phir|waise|aise|jaise|matlab)\b/i,
    ],
    urdu: [
      /\b(kaam)\b/i,
    ],
    bengali: [],
    marathi: [],
    gujarati: [],
    punjabi: [],
    odia: [],
    assamese: [],
  };

  // Check priority markers first
  let bestLang: IndicLanguage | null = null;
  let bestScore = 0;

  for (const [lang, markers] of Object.entries(priorityMarkers) as [IndicLanguage, RegExp[]][]) {
    let matches = 0;
    for (const pattern of markers) {
      const m = text.match(pattern);
      if (m) matches += m.length;
    }
    if (matches > 0) {
      const score = matches / Math.max(words.length, 1);
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }
  }

  // If priority markers found a match, use it
  if (bestLang && bestScore > 0.1) {
    return { language: bestLang, confidence: Math.min(0.85, bestScore * 2) };
  }

  // Fallback to general scoring
  for (const [lang, score] of Object.entries(scores) as [IndicLanguage, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  if (bestLang && bestScore > 0.1) {
    return { language: bestLang, confidence: Math.min(0.8, bestScore * 2) };
  }

  return null;
}

// ─── Code-Mixing Detection ────────────────────────────────────────────────────
// Detects whether text contains code-mixed language.

export function detectCodeMixing(text: string): {
  isCodeMixed: boolean;
  confidence: number;
} {
  const scriptInfo = detectScriptType(text);
  const romanized = detectRomanizedLanguage(text);

  // Mixed scripts = definitely code-mixed
  if (scriptInfo.hasMixed) {
    return { isCodeMixed: true, confidence: 0.9 };
  }

  // Latin script with Romanized Indic markers = code-mixed
  if (scriptInfo.hasLatin && romanized) {
    return { isCodeMixed: true, confidence: 0.8 };
  }

  // Check for code-mixing indicators in Latin text
  if (scriptInfo.hasLatin && CODE_MIX_INDICATORS.test(text)) {
    return { isCodeMixed: true, confidence: 0.6 };
  }

  return { isCodeMixed: false, confidence: 0.5 };
}

// ─── Language Ratio Estimation ────────────────────────────────────────────────
// Approximate language proportions in text.

export function estimateLanguageRatio(text: string): LanguageRatio[] {
  const scriptInfo = detectScriptType(text);
  const romanized = detectRomanizedLanguage(text);

  if (scriptInfo.hasMixed) {
    // Count script characters
    let latinCount = 0;
    let indicCount = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
        latinCount++;
      } else {
        for (const ranges of Object.values(SCRIPT_RANGES)) {
          for (const [min, max] of ranges) {
            if (code >= min && code <= max) {
              indicCount++;
              break;
            }
          }
        }
      }
    }

    const total = latinCount + indicCount || 1;
    const langName = romanized ? romanized.language : "indian_language";
    return [
      { language: langName, ratio: indicCount / total },
      { language: "english", ratio: latinCount / total },
    ];
  }

  if (romanized) {
    return [
      { language: romanized.language, ratio: 0.7 },
      { language: "english", ratio: 0.3 },
    ];
  }

  if (scriptInfo.hasLatin) {
    return [{ language: "english", ratio: 1.0 }];
  }

  return [{ language: "unknown", ratio: 1.0 }];
}

// ─── Per-Participant Language Detection ────────────────────────────────────────
// Detect language for each participant in a conversation.

export function detectParticipantLanguages(
  messages: { sender: string; text: string }[]
): ParticipantLanguage[] {
  const participantMap = new Map<string, string[]>();

  for (const msg of messages) {
    const existing = participantMap.get(msg.sender) || [];
    existing.push(msg.text);
    participantMap.set(msg.sender, existing);
  }

  const results: ParticipantLanguage[] = [];

  for (const [sender, texts] of participantMap) {
    const combined = texts.join(" ");
    const scriptInfo = detectScriptType(combined);
    const romanized = detectRomanizedLanguage(combined);
    const codeMix = detectCodeMixing(combined);

    const primary = romanized ? romanized.language : scriptInfo.dominant === "latin" ? "english" : scriptInfo.dominant;
    const confidence = romanized
      ? romanized.confidence
      : scriptInfo.hasIndic
        ? 0.7
        : scriptInfo.hasLatin
          ? 0.6
          : 0.3;

    results.push({
      participantId: sender,
      primary,
      secondary: [],
      script: scriptInfo.dominant,
      romanized: !!romanized,
      codeMixed: codeMix.isCodeMixed,
      confidence,
    });
  }

  return results;
}

// ─── Full Language Detection ───────────────────────────────────────────────────
// Combines deterministic signals into a LanguageState.
// This is the heuristic/fast layer — AI intelligence provides deeper understanding.

export function detectLanguageState(
  messages: { sender: string; text: string }[],
  explicitLanguage?: string,
  outputPreference?: string
): LanguageState {
  const allText = messages.map((m) => m.text).join(" ");
  const scriptInfo = detectScriptType(allText);
  const romanized = detectRomanizedLanguage(allText);
  const codeMix = detectCodeMixing(allText);
  const ratio = estimateLanguageRatio(allText);
  const participants = detectParticipantLanguages(messages);

  // Check for short ambiguous messages
  const hasShortMessages = messages.some((m) => isShortAmbiguous(m.text));
  const allShort = messages.every((m) => isShortAmbiguous(m.text));

  // Determine primary language
  let primary = "english";
  let confidence = 0.5;
  let detectionSource: LanguageState["detectionSource"] = "heuristic";

  if (explicitLanguage && explicitLanguage !== "english" && explicitLanguage !== "unknown") {
    primary = explicitLanguage;
    confidence = 0.9;
    detectionSource = "explicit_user";
  } else if (romanized) {
    primary = romanized.language;
    confidence = romanized.confidence;
    // Reduce confidence for short messages
    if (allShort) {
      confidence = Math.min(confidence, 0.4);
    } else if (hasShortMessages) {
      confidence = Math.min(confidence, 0.6);
    }
  } else if (scriptInfo.hasIndic) {
    primary = scriptInfo.dominant;
    confidence = 0.7;
  } else if (scriptInfo.hasLatin) {
    primary = "english";
    confidence = 0.6;
  } else {
    primary = "unknown";
    confidence = 0.3;
    detectionSource = "fallback";
  }

  // Determine script
  let script: ScriptType = scriptInfo.dominant;
  if (scriptInfo.hasMixed) script = "mixed";
  else if (romanized) script = "latin";

  // Determine secondary languages
  const secondary: string[] = [];
  if (romanized && primary !== "english") {
    secondary.push("english");
  } else if (primary !== "english" && scriptInfo.hasLatin) {
    secondary.push("english");
  }

  return {
    primary,
    secondary,
    script,
    romanized: !!romanized,
    codeMixed: codeMix.isCodeMixed,
    codeMixRatio: ratio,
    confidence,
    scriptConfidence: scriptInfo.hasIndic ? 0.9 : scriptInfo.hasLatin ? 0.7 : 0.4,
    detectionSource,
    participantLanguages: participants,
    outputPreference: (outputPreference as LanguageState["outputPreference"]) || "auto",
  };
}

// ─── Short Message Handling ───────────────────────────────────────────────────
// Short messages are ambiguous — return low confidence.

export function isShortAmbiguous(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.length <= 2;
}

// ─── Spelling Variation Normalization ─────────────────────────────────────────
// Common Romanized spelling variations. Not exhaustive.

const SPELLING_VARIATIONS: Record<string, string> = {
  undhi: "undi",
  undu: "undi",
  chestha: "chestha",
  chesta: "chestha",
  cheshta: "chestha",
  matladham: "matladham",
  matladam: "matladham",
  matladhaam: "matladham",
  naku: "naaku",
  naaku: "naaku",
  nuvvu: "nuvvu",
  nuvu: "nuvvu",
  enduku: "enduku",
  endhuku: "enduku",
  ivala: "ivala",
  ivvala: "ivala",
  repu: "repu",
};

export function normalizeSpelling(word: string): string {
  const lower = word.toLowerCase();
  return SPELLING_VARIATIONS[lower] || lower;
}
