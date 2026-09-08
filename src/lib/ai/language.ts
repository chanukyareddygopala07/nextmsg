// ─── Language Types ────────────────────────────────────────────────────────────
//
// Represents the complete language state of a conversation.
// Used by ConversationState and the language detection pipeline.
// ──────────────────────────────────────────────────────────────────────────────

export type IndicLanguage =
  | "hindi"
  | "telugu"
  | "tamil"
  | "kannada"
  | "malayalam"
  | "bengali"
  | "marathi"
  | "gujarati"
  | "punjabi"
  | "odia"
  | "assamese"
  | "urdu";

export type ScriptType =
  | "latin"
  | "devanagari"
  | "telugu"
  | "tamil"
  | "kannada"
  | "malayalam"
  | "bengali"
  | "gujarati"
  | "gurmukhi"
  | "odia"
  | "arabic"
  | "mixed"
  | "unknown";

export type OutputLanguageMode =
  | "auto"
  | "same_as_input"
  | "english"
  | "native_script"
  | "romanized"
  | "code_mixed";

export interface LanguageRatio {
  language: string;
  ratio: number;
}

export interface ParticipantLanguage {
  participantId: string;
  primary: string;
  secondary: string[];
  script: ScriptType;
  romanized: boolean;
  codeMixed: boolean;
  confidence: number;
}

export interface LanguageState {
  primary: string;
  secondary: string[];
  script: ScriptType;
  romanized: boolean;
  codeMixed: boolean;
  codeMixRatio: LanguageRatio[];
  confidence: number;
  scriptConfidence: number;
  detectionSource: "explicit_user" | "ai" | "heuristic" | "fallback";
  participantLanguages: ParticipantLanguage[];
  outputPreference: OutputLanguageMode;
}

// ─── Script Unicode Ranges ────────────────────────────────────────────────────

export const SCRIPT_RANGES: Record<string, [number, number][]> = {
  devanagari: [[0x0900, 0x097f]],
  bengali: [[0x0980, 0x09ff]],
  gurmukhi: [[0x0a00, 0x0a7f]],
  gujarati: [[0x0a80, 0x0aff]],
  oriya: [[0x0b00, 0x0b7f]],
  tamil: [[0x0b80, 0x0bff]],
  telugu: [[0x0c00, 0x0c7f]],
  kannada: [[0x0c80, 0x0cff]],
  malayalam: [[0x0d00, 0x0d7f]],
  arabic: [
    [0x0600, 0x06ff],
    [0x0750, 0x077f],
    [0x08a0, 0x08ff],
  ],
};

// ─── Romanized Indic Language Markers ─────────────────────────────────────────
// These are common Romanized words/patterns for each language.
// Used as heuristic signals — NOT exhaustive dictionaries.

export const ROMANIZED_MARKERS: Record<IndicLanguage, RegExp[]> = {
  hindi: [
    /\b(hai|nahi|kya|aur|bhi|ye|wo|yahan|wahan|kab|kyun|kaise|bas|chalo|acha|theek|samajh|bolo|suno|dekh|le|de|kar|ho|raha|rahi|tha|thi|hoga|hogi|hoon|hum|tum|aap|mein|tujhe|usko|unko|yeh|woh|kuch|sab|bahut|accha|thoda|jaldi|abhi|phir|waise|aise|jaise|matlab)\b/i,
    /\b(kal|aaj|kal|ab|phir|wahan|yahan|tab|yahan|us waqt|is waqt|mera|tera|uska|unka|hamara|tumhara|kaun|kya|kaise|kahan|kab|kyun|kiska|jise|jisko|jisse|jiska)\b/i,
  ],
  telugu: [
    /\b(naku|nuvvu|memu|manam|avi|idhi|adhi|ela|enduku|appudu|ippudu|aledu|aledha|chey|chedu|undi|undhi|ra|re|bro|dost|naaku|meeru|vaallu|manam|ithe|kani|inka|alage|appatlo|ippatlo|chala|baaga|thaggadi|vachhadu|vachindhi|poyadu|poyindhi|chestha|chesthaa|chesthunna|untanu|vellanu|chemma|maatalaadham|matladham|pani|repu|ivala|ippudu|appudu|nunchi|daggara|lopu|bayata|mundu|venaka|meeda|kindha|vedhanga|baga|chinnaga|peddaga|thelusthundhi|telusu|kaadhu|avunu|ledhu|sare|enta|eppudu|edhi|evaru|emiti)\b/i,
  ],
  tamil: [
    /\b(naan|neenga|naanu|avlo|romba|illa|ippo|adhukku|enna|epdi|vanakkam|nanri|solli|panren|panlam|varen|vaanga|irukku|irukkaen|illai|aamaa|seri|nalla|konjam|idhu|adhu|inga|anga|edhukku|panra|pannu|solra|sollu|varra|vaaru|irukkra|da|machaa|dei|enna|nalla|romba|konjam|irukkiraen|panrom|pannalam|solren|varuven|iruppen)\b/i,
  ],
  kannada: [
    /\b(nanu|nimage|tamage|avu|idu|adu|hege|yakke|yaavaga|eega|illi|allu|tumba|chennagi|saaku|maadu|maadthini|barthini|hogthini|iruthini|bantu|hoythu|maadidhu|maaduva|illa|haudu|sari|en|yaavu|eeshtu|nimge|avaru|naavu|neevu|madi|barutte|hogutte|iddini)\b/i,
  ],
  malayalam: [
    /\b(njan|njangal|engane|entha|parayuka|cheyuka|varuka|irikkuka|pokaan|vannu|cheithu|irunnu|aakunnu|aahn|sheriy|ningal|avar|avarkku|enikku|nammuku|aanu|pala|oru|ivide)\b/i,
  ],
  bengali: [
    /\b(ami|tumi|apni|se|tini|ei|oi|khub|bhalo|theek|ache|na|ki|kemon|ajke|kalke|abar|ekhon|aami|tumi|apni|tini|khubi|beshi|onek|khub|bhalo|theek|ache|aache)\b/i,
  ],
  marathi: [
    /\b(mi|tu|to|ti|amhi|tumhi|te|tya|kiti|kasa|kay|ho|nahi|barobar|chhan|thik|ahe|aahe|pan|mag|tar|majha|tujha|tyacha|tyachi|aamcha|tumcha|kahi|kunach|kuthe|kaay|zala|zhala|madhe|baddal|sathi|lahan|motha)\b/i,
  ],
  gujarati: [
    /\b(hu|tu|tame|aa|e|ke|thayu|che|nathi|shu|kem|chho|mane|tamare|tyare|aje|bahut|saru|barabar|na|haan|bolo|aavjo|maaro|tamaro|teno|tano|amara|tamara|koi|kai|kya|ethare|tyare|upar|niche|andar|bahar)\b/i,
  ],
  punjabi: [
    /\b(main|tussi|oh|eh|asi|tuhanu|ohnu|ehnu|ki|kiven|kiddan|kal|aaj|baith|challo|theek|nhi|haan|boliye|sunno|dekho|ker|puch|bol|tuhaada|saada|ohda|ehda|jeha|jidi|jihna|ohne|ehne|saanu|ohnu|ehnu)\b/i,
  ],
  odia: [
    /\b(mu|tumi|se|eta|eita|ta|taa|ki|kena|kemiti|ajitharu|kalitharu|bahut|bhala|thik|achi|nahi|haan|kete|kana|jeki|jebe|taku|mote|tumaku|seku|semananku|amaku|tapare|upare|tale)\b/i,
  ],
  assamese: [
    /\b(moi|tumi|apuni|eita|ta|ki|kene|kiman|ajike|kalke|bahu|bhal|thik|ase|na|hoi|kio|imane|iman|tumi|apuni|asi|tole|ole|pathe|pite|khan|khon)\b/i,
  ],
  urdu: [
    /\b(hai|nahi|kya|aur|bhi|yeh|wo|yahan|kab|kyun|kaise|bas|chalo|acha|theek|samajh|bolo|suno|dekh|le|de|kar|ho|raha|rahi|tha|main|tum|hum|aap|mein|usko|yahan|wahan|kuch|sab|bahut|thoda|jaldi|abhi|phir|waise|aise|jaise|matlab|kaam)\b/i,
  ],
};

// ─── Code-Mixing Indicators ──────────────────────────────────────────────────
// Words commonly used across Indian languages in code-mixed speech

export const CODE_MIX_INDICATORS = /\b(bro|yaar|bhai|dost|hai|nahi|kya|undhi|undi|chestha|panren|iruku|ide|aanu|che|ra|da|ni|nu|su)\b/i;

// ─── Slang and Informal Markers ──────────────────────────────────────────────

export const INFORMAL_MARKERS = /\b(bro|bhai|yaar|dost|machaa|dei|da|ra|ni|anna|akka|anna|dada|didi|aunty|uncle|sir|madam)\b/i;
