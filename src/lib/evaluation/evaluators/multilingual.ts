/**
 * Multilingual Evaluator
 * 
 * Evaluates whether a candidate message preserves language, script,
 * code-mixing patterns, and semantic meaning across languages.
 */

import type {
  BenchmarkCase,
  EvalResult,
  MetricResult,
  PassFail,
  EvaluationContext,
} from "../types";

// ─── Script Detection ────────────────────────────────────────────────────────

const SCRIPT_RANGES: Record<string, RegExp> = {
  telugu: /[\u0C00-\u0C7F]/,
  hindi: /[\u0900-\u097F]/,
  tamil: /[\u0B80-\u0BFF]/,
  kannada: /[\u0C80-\u0CFF]/,
  malayalam: /[\u0D00-\u0D7F]/,
  arabic: /[\u0600-\u06FF]/,
  chinese: /[\u4E00-\u9FFF]/,
  japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
  korean: /[\uAC00-\uD7AF]/,
  cyrillic: /[\u0400-\u04FF]/,
  greek: /[\u0370-\u03FF]/,
  hebrew: /[\u0590-\u05FF]/,
  thai: /[\u0E00-\u0E7F]/,
  latin: /[a-zA-Z]/,
};

function detectScripts(text: string): string[] {
  const scripts: string[] = [];
  for (const [script, pattern] of Object.entries(SCRIPT_RANGES)) {
    if (pattern.test(text)) scripts.push(script);
  }
  return scripts;
}

function detectLanguage(text: string): string {
  const scripts = detectScripts(text);
  if (scripts.length === 1 && scripts[0] !== "latin") return scripts[0];
  if (scripts.includes("latin")) {
    // Could be English, Romanized, or code-mixed
    if (scripts.length > 1) return "code-mixed";
    // Check for romanized languages before defaulting to English
    for (const [lang, _patterns] of Object.entries(ROMANIZED_PATTERNS)) {
      if (isRomanized(text, lang)) return `romanized_${lang}`;
    }
    return "english";
  }
  return scripts[0] || "unknown";
}

function detectCodeMixing(text: string): { isCodeMixed: boolean; scripts: string[] } {
  const scripts = detectScripts(text);
  return { isCodeMixed: scripts.length > 1, scripts };
}

// ─── Romanization Detection ──────────────────────────────────────────────────

const ROMANIZED_PATTERNS: Record<string, string[]> = {
  telugu: [
    "\\b(naku|ivala|chevvadam|kadu|cheppandi|cheyyali|undi|raledu|aite|bagundi|chala|memu|manam|meeru|nuvvu|danini|dini|nenu|rawali|randi|veledam|veldam|telusu|teliyadu|kuda|ante|kani|alage|ilanti|appudu|ipudu|roju|repu|ivali)\\b",
    "\\b(submit|cheyyadam|possible|cheppara|chesara|chestha|chesthunna|cheddam|cheyinchandi|pampinchandi|calisi|kaluddam|matladali|matladadam|telsa|telusu)\\b",
  ],
  hindi: [
    "\\b(mujhe|aapko|hai|tha|thi|karna|karo|karunga|ho|gaya|gaye|abhi|kal|aaj|woh|yeh|uss|iss|yahan|wahan|kya|kyun|kaise|kaun|kitna|bahut|zyada|kam|thoda|sab|kuch|bhi|mera|tera|uska|iska|hamara|tumhara)\\b",
    "\\b(bhai|didi|papa|mummy|namaste|shukriya|ji|yaar|dost|accha|theek|sahi|galat|mat|karo|kijiye|bolo|suno|dekho|jao|aao|lo|de|le|pe|mein|par|se|ko|ka|ki|ke)\\b",
  ],
  tamil: [
    "\\b(naan|neenga|irukkiren|panren|pannu|seithen|sollungka|romba|nandri|vanakkam|enna|epdi|ippo|adhuvum|idhu|adh|inga|angha|poga|vara|sollunga|kekkunga|pannunga|irukkum|irukku|illai|illatha)\\b",
  ],
  kannada: [
    "\\b(nanage|nimge|ide|illa|maadi|beku|sari|dhanyavad|hodi|naanu|neevu|avaru|yaaru|enu|elli|yaava|hege|thara|maado|maadu|madtini|madtiini|illaa|iruttade|irli)\\b",
  ],
  malayalam: [
    "\\b(njan|ningal|undu|illa|cheyyuka|venam|nanni|namaskaram|ente|ninte|avar|yaar|eth|engane|ippo|ini|appo|angane|ingane|povan|varan|sollu|parayuka|kettuka)\\b",
  ],
  tagalog: [
    "\\b(ako|ikaw|siya|kami|kayo|sila|ito|iyon|na|pa|po|opo|ho|oho|kung|dahil|para|ngunit|pero|tapos|ngayon|bukas|kahapon|dito|diyan|doon|kailan|saan|bakit|paano|ano|sino)\\b",
  ],
};

function isRomanized(text: string, language: string): boolean {
  const patterns = ROMANIZED_PATTERNS[language] || [];
  const lower = text.toLowerCase();
  for (const pattern of patterns) {
    if (new RegExp(pattern, "i").test(lower)) return true;
  }
  return false;
}

// ─── Semantic Preservation ───────────────────────────────────────────────────

function extractKeyMeaning(text: string): string[] {
  // Extract key semantic tokens regardless of language
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  
  // Remove common stop words for all languages
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "and", "but", "or", "not",
    "so", "very", "just", "also", "than", "that", "this", "it", "its",
    "i", "you", "he", "she", "we", "they", "me", "him", "her", "us",
    "my", "your", "his", "our", "their", "what", "which", "who", "when",
    "where", "how", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "no", "nor", "only", "own", "same", "then",
    "too", "any", "into", "about", "up", "out", "off", "over", "under",
  ]);
  
  return words.filter((w) => !stopWords.has(w));
}

function semanticOverlap(original: string, candidate: string): number {
  const origTokens = new Set(extractKeyMeaning(original));
  const candTokens = new Set(extractKeyMeaning(candidate));
  
  if (origTokens.size === 0 && candTokens.size === 0) return 1;
  if (origTokens.size === 0 || candTokens.size === 0) return 0;
  
  const intersection = new Set([...origTokens].filter((t) => candTokens.has(t)));
  const union = new Set([...origTokens, ...candTokens]);
  
  return intersection.size / union.size;
}

// ─── Main Multilingual Evaluator ─────────────────────────────────────────────

export function evaluateMultilingual(
  benchCase: BenchmarkCase,
  candidate: string,
  _context: EvaluationContext
): EvalResult {
  const startTime = Date.now();
  const metrics: MetricResult[] = [];
  
  const original = benchCase.conversation.length > 0
    ? benchCase.conversation[benchCase.conversation.length - 1].content
    : "";
  
  const expectedLang = benchCase.language;
  const expectedScript = benchCase.script;
  
  // Language preservation
  const detectedLang = detectLanguage(candidate);
  const langPreserved = expectedLang === "english"
    ? detectedLang === "english" || detectedLang === "code-mixed"
    : detectedLang === expectedLang || detectedLang === "code-mixed" || detectedLang === "latin";
  
  if (benchCase.expected.languagePreservationRequired !== false) {
    metrics.push({
      name: "multilingual_language_preservation",
      value: langPreserved ? 1 : 0,
      pass: langPreserved ? "PASS" : "FAIL",
      details: `Expected: ${expectedLang}, Detected: ${detectedLang}`,
    });
  }
  
  // Script preservation
  const candidateScripts = detectScripts(candidate);
  const expectedScripts = expectedScript ? [expectedScript] : [];
  
  if (benchCase.expected.scriptPreservationRequired !== false && expectedScripts.length > 0) {
    const scriptPreserved = expectedScripts.some((s) => candidateScripts.includes(s));
    metrics.push({
      name: "multilingual_script_preservation",
      value: scriptPreserved ? 1 : 0,
      pass: scriptPreserved ? "PASS" : "FAIL",
      details: `Expected scripts: ${expectedScripts.join(", ")}, Found: ${candidateScripts.join(", ")}`,
    });
  }
  
  // Code-mix preservation
  const origCodeMix = detectCodeMixing(original);
  const candCodeMix = detectCodeMixing(candidate);
  
  if (benchCase.expected.codeMixPreservationRequired !== false) {
    if (origCodeMix.isCodeMixed) {
      metrics.push({
        name: "multilingual_code_mix_preservation",
        value: candCodeMix.isCodeMixed ? 1 : 0,
        pass: candCodeMix.isCodeMixed ? "PASS" : "WARN",
        details: `Original is code-mixed (${origCodeMix.scripts.join("+")}), Candidate is ${candCodeMix.isCodeMixed ? "code-mixed" : "single-script"}`,
      });
    }
  }
  
  // Romanization preservation
  if (expectedLang !== "english") {
    const origRomanized = isRomanized(original, expectedLang);
    const candRomanized = isRomanized(candidate, expectedLang);
    
    if (origRomanized) {
      metrics.push({
        name: "multilingual_romanization_preservation",
        value: candRomanized ? 1 : 0.5,
        pass: candRomanized ? "PASS" : "WARN",
        details: `Original Romanized: ${origRomanized}, Candidate Romanized: ${candRomanized}`,
      });
    }
  }
  
  // Semantic preservation across languages
  const overlap = semanticOverlap(original, candidate);
  metrics.push({
    name: "multilingual_semantic_preservation",
    value: overlap,
    pass: overlap >= 0.3 ? "PASS" : overlap >= 0.15 ? "WARN" : "FAIL",
    details: `Cross-lingual semantic overlap: ${overlap.toFixed(3)}`,
  });
  
  // Key fact extraction and preservation
  if (benchCase.expected.preservedFacts) {
    for (const fact of benchCase.expected.preservedFacts) {
      const lowerCandidate = candidate.toLowerCase();
      const lowerFact = fact.toLowerCase();
      const preserved = lowerCandidate.includes(lowerFact);
      metrics.push({
        name: `multilingual_fact_${fact.slice(0, 20)}`,
        value: preserved ? 1 : 0,
        pass: preserved ? "PASS" : "FAIL",
        details: preserved ? `Fact "${fact}" preserved` : `Fact "${fact}" missing`,
        isFatal: true,
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
    evaluatorVersion: "1.0.0",
  };
}
