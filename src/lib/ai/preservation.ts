// ─── Semantic Preservation Engine ───────────────────────────────────────────
//
// Ensures improved messages preserve the user's original meaning.
// Critical for Phase 4 Step 3: Improve My Message.
//
// Core principle: Improve HOW the user communicates without changing WHAT they mean.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PreservationContract {
  /** The original draft text */
  originalText: string;
  /** Extracted semantic constraints */
  semanticConstraints: SemanticConstraints;
  /** Language state */
  languageState: LanguageState;
  /** Extraction confidence */
  confidence: number;
}

export interface SemanticConstraints {
  /** Negation present in original */
  negations: NegationInfo[];
  /** Temporal constraints (today, tomorrow, 5 PM, etc.) */
  temporalConstraints: TemporalConstraint[];
  /** Ability/availability constraints (can, cannot, possible, impossible) */
  abilityConstraints: AbilityConstraint[];
  /** Position (agree, disagree, support, oppose) */
  position: PositionInfo | null;
  /** Boundaries (I can't, I won't, not available) */
  boundaries: BoundaryInfo[];
  /** Commitments (I'll, I will, must) */
  commitments: CommitmentInfo[];
  /** Factual claims (numbers, dates, names) */
  factualClaims: FactualClaim[];
  /** Requested action */
  requestedAction: string | null;
  /** Named entities */
  entities: EntityInfo[];
}

export interface LanguageState {
  primary: string;
  script: string;
  romanized: boolean;
  codeMixed: boolean;
}

export interface NegationInfo {
  type: "english" | "romanized_telugu" | "romanized_hindi" | "romanized_tamil" | "other";
  word: string;
  position: number;
  scope: "local" | "sentence";
}

export interface TemporalConstraint {
  type: "absolute" | "relative" | "time";
  value: string;
  normalized: string;
  position: number;
}

export interface AbilityConstraint {
  type: "can" | "cannot" | "possible" | "impossible" | "available" | "unavailable";
  word: string;
  position: number;
  negated: boolean;
}

export interface PositionInfo {
  type: "agree" | "disagree" | "support" | "oppose" | "neutral";
  strength: "strong" | "moderate" | "weak";
  word: string;
  position: number;
}

export interface BoundaryInfo {
  type: "can't" | "won't" | "not_available" | "not_possible" | "refusal";
  word: string;
  position: number;
}

export interface CommitmentInfo {
  type: "will" | "won't" | "must" | "shall";
  word: string;
  position: number;
}

export interface FactualClaim {
  type: "number" | "date" | "time" | "url" | "email" | "phone" | "name" | "location";
  value: string;
  position: number;
}

export interface EntityInfo {
  type: "person" | "organization" | "location" | "date" | "time" | "number" | "url";
  value: string;
  position: number;
}

export interface ValidationResult {
  passed: boolean;
  issues: string[];
  score: number;
  details: {
    negationPreserved: boolean;
    temporalPreserved: boolean;
    abilityPreserved: boolean;
    positionPreserved: boolean;
    boundaryPreserved: boolean;
    commitmentPreserved: boolean;
    factsPreserved: boolean;
    entitiesPreserved: boolean;
  };
}

// ─── Negation Patterns ──────────────────────────────────────────────────────

const ENGLISH_NEGATIONS = [
  /\b(not|no|never|neither|nor|hardly|barely|scarcely|seldom|rarely)\b/gi,
  /\b(don't|doesn't|didn't|won't|wouldn't|can't|cannot|couldn't|shouldn't|mustn't|haven't|hasn't|hadn't|isn't|aren't|wasn't|weren't)\b/gi,
  /\b(do not|does not|did not|will not|would not|can not|cannot|could not|should not|must not|have not|has not|had not|is not|are not|was not|were not)\b/gi,
];

const ROMANIZED_TELUGU_NEGATIONS = [
  /\b(kadu|kaadu|kadu|kaadu)\b/gi,
  /\b(cheyyalenu|cheyyaledu|cheyyam)\b/gi,
  /\b(raanu|raaledu|raadu)\b/gi,
  /\b(vaddhu|vaaddu|vadu)\b/gi,
  /\b(ledhu|leedu|ledu)\b/gi,
  /\b(possible\s+kaadu|possible\s+kadu|possible\s+ledu)\b/gi,
  /\b(kastam|kashtam)\b/gi,
  /\b(impossible)\b/gi,
];

const ROMANIZED_HINDI_NEGATIONS = [
  /\b(nahi|nahin|mat|na)\b/gi,
  /\b(hoga\s+nahi|nahi\s+hoga)\b/gi,
];

const ROMANIZED_TAMIL_NEGATIONS = [
  /\b(illai|illaa|illa)\b/gi,
  /\b(mudiyadhu|mudiyathu|mudiyala)\b/gi,
];

// ─── Temporal Patterns ──────────────────────────────────────────────────────

const ENGLISH_TEMPORAL = [
  /\b(today|tomorrow|yesterday|tonight|this morning|this afternoon|this evening|next week|next month|last week|last month)\b/gi,
  /\b(now|later|soon|immediately|asap)\b/gi,
  /\b(\d{1,2}:\d{2}\s*(am|pm|AM|PM)?)\b/gi,
  /\b(\d{1,2}\s*(am|pm|AM|PM))\b/gi,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi,
  /\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?)\b/gi,
];

const ROMANIZED_TELUGU_TEMPORAL = [
  /\b(ivala|ivvala|eeroju)\b/gi,
  /\b(repu|repuva|repu day)\b/gi,
  /\b(ninnati|ninna)\b/gi,
  /\b(ipudu|ippudu|ipudu)\b/gi,
  /\b(tvaraga|twara ga)\b/gi,
  /\b(ee semana|ee vaaram|mana semana|mana vaaram)\b/gi,
  /\b(ediavaaram|soma|mangala|budha|guru|sukra|sani)\b/gi,
];

// ─── Ability Patterns ───────────────────────────────────────────────────────

const ENGLISH_ABILITY = [
  /\b(can|could|able to|be able to|capable of)\b/gi,
  /\b(cannot|can't|unable|impossible|not possible|won't be able|wouldn't be able)\b/gi,
  /\b(available|unavailable|free|busy)\b/gi,
  /\b(possible|impossible)\b/gi,
];

const ROMANIZED_TELUGU_ABILITY = [
  /\b(avutundi|avuthundi|avuthadu|avuthanu|avuthi)\b/gi,
  /\b(kastam|kashtam|kastamavutundi|kashtamavutundi)\b/gi,
  /\b(possible\s+kadu|possible\s+kaadu|possible\s+ledu|impossible)\b/gi,
  /\b(possible|impossible)\b/gi,
  /\b(available|unavailable|free|busy)\b/gi,
  /\b(cheyyagalanu|cheyagalugutanu|cheyagalugutha)\b/gi,
];

// ─── Position Patterns ──────────────────────────────────────────────────────

const ENGLISH_POSITION = [
  /\b(disagree|disapprove|oppose|reject)\b/gi,
  /\b(support|accept|approve)\b/gi,
  /\b(agree)\b/gi,
  /\b(i think|i believe|i feel|i'm with|i'm against|i'm for|i'm not for)\b/gi,
];

const ROMANIZED_TELUGU_POSITION = [
  /\b(agree|disagree|support|oppose|accept|reject)\b/gi,
  /\b(nenu\s+agree|nenu\s+disagree)\b/gi,
  /\b(naku\s+istam|naku\s+anișțam)\b/gi,
];

// ─── Boundary Patterns ──────────────────────────────────────────────────────

const ENGLISH_BOUNDARIES = [
  /\b(i can't|i cannot|i won't|i will not|i'm not available|i'm not able|not possible|can't)\b/gi,
  /\b(i will|i am available|i am able)\b/gi,
];

const ROMANIZED_TELUGU_BOUNDARIES = [
  /\b(naku\s+kadu|naku\s+possible\s+kadu)\b/gi,
  /\b(cheyyalenu|cheyyaledu)\b/gi,
  /\b(vaddhu|vaaddu)\b/gi,
  /\b(nenu\s+available\s+kadu|nenu\s+busy)\b/gi,
];

// ─── Commitment Patterns ────────────────────────────────────────────────────

const ENGLISH_COMMITMENTS = [
  /\b(i'll|i will|i must|i shall|i promise|i commit|i'll make sure)\b/gi,
  /\b(i won't|i will not|i won't be able)\b/gi,
];

const ROMANIZED_TELUGU_COMMITMENTS = [
  /\b(chestha|chesthanu|chesthaanu)\b/gi,
  /\b(veltanu|veltha|vellanu)\b/gi,
  /\b(cheyyaledu|cheyyalenu)\b/gi,
];

// ─── Factual Claim Patterns ─────────────────────────────────────────────────

const FACTUAL_PATTERNS = [
  { type: "time" as const, pattern: /\b(\d{1,2}:\d{2})\b/g },
  { type: "time" as const, pattern: /\b(\d{1,2}\s*(am|pm|AM|PM))\b/g },
  { type: "date" as const, pattern: /\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?)\b/g },
  { type: "date" as const, pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi },
  { type: "number" as const, pattern: /\b(\d+)\b/g },
  { type: "url" as const, pattern: /(https?:\/\/[^\s]+)/gi },
  { type: "email" as const, pattern: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g },
  { type: "phone" as const, pattern: /\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/g },
];

// ─── Entity Patterns ────────────────────────────────────────────────────────

const ENTITY_PATTERNS = [
  { type: "person" as const, pattern: /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g },
  { type: "organization" as const, pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|LLC|Corp|Ltd|Co|Company|Organization))\b/g },
  { type: "location" as const, pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+[A-Z]{2})\b/g },
];

// ─── Extraction Functions ───────────────────────────────────────────────────

export function extractNegations(text: string, language: LanguageState): NegationInfo[] {
  const negations: NegationInfo[] = [];

  // English negations
  for (const pattern of ENGLISH_NEGATIONS) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      negations.push({
        type: "english",
        word: match[0],
        position: match.index ?? 0,
        scope: "sentence",
      });
    }
  }

  // Romanized Telugu negations
  if (language.primary === "telugu" || language.codeMixed) {
    for (const pattern of ROMANIZED_TELUGU_NEGATIONS) {
      const matches = text.matchAll(new RegExp(pattern.source, "gi"));
      for (const match of matches) {
        negations.push({
          type: "romanized_telugu",
          word: match[0],
          position: match.index ?? 0,
          scope: "sentence",
        });
      }
    }
  }

  // Romanized Hindi negations
  if (language.primary === "hindi" || language.codeMixed) {
    for (const pattern of ROMANIZED_HINDI_NEGATIONS) {
      const matches = text.matchAll(new RegExp(pattern.source, "gi"));
      for (const match of matches) {
        negations.push({
          type: "romanized_hindi",
          word: match[0],
          position: match.index ?? 0,
          scope: "sentence",
        });
      }
    }
  }

  // Romanized Tamil negations
  if (language.primary === "tamil" || language.codeMixed) {
    for (const pattern of ROMANIZED_TAMIL_NEGATIONS) {
      const matches = text.matchAll(new RegExp(pattern.source, "gi"));
      for (const match of matches) {
        negations.push({
          type: "romanized_tamil",
          word: match[0],
          position: match.index ?? 0,
          scope: "sentence",
        });
      }
    }
  }

  return negations;
}

export function extractTemporalConstraints(text: string, language: LanguageState): TemporalConstraint[] {
  const constraints: TemporalConstraint[] = [];

  // English temporal
  for (const pattern of ENGLISH_TEMPORAL) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      constraints.push({
        type: getTemporalType(match[0]),
        value: match[0],
        normalized: normalizeTemporal(match[0]),
        position: match.index ?? 0,
      });
    }
  }

  // Romanized Telugu temporal
  if (language.primary === "telugu" || language.codeMixed) {
    for (const pattern of ROMANIZED_TELUGU_TEMPORAL) {
      const matches = text.matchAll(new RegExp(pattern.source, "gi"));
      for (const match of matches) {
        constraints.push({
          type: getTemporalType(match[0]),
          value: match[0],
          normalized: normalizeTemporal(match[0]),
          position: match.index ?? 0,
        });
      }
    }
  }

  return constraints;
}

export function extractAbilityConstraints(text: string, language: LanguageState): AbilityConstraint[] {
  const constraints: AbilityConstraint[] = [];
  const lowerText = text.toLowerCase();

  // English ability
  for (const pattern of ENGLISH_ABILITY) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      const word = match[0].toLowerCase();
      const pos = match.index ?? 0;
      // Check for negation: explicit negation words OR un-/im- prefixes
      let negated = word.includes("not") || word.includes("n't") || word.includes("impossible") || 
                      word.includes("unable") || word.includes("won't") || word.includes("wouldn't") ||
                      word.startsWith("un") || word.startsWith("im") || word.startsWith("dis");
      // Context-aware: check if preceded by "not" (e.g., "not available")
      if (!negated && pos > 3) {
        const preceding = lowerText.substring(Math.max(0, pos - 4), pos);
        if (/\bnot\s+$/.test(preceding) || /\bn't\s+$/.test(preceding)) {
          negated = true;
        }
      }
      constraints.push({
        type: getAbilityType(word, negated),
        word: match[0],
        position: pos,
        negated,
      });
    }
  }

  // Romanized Telugu ability
  if (language.primary === "telugu" || language.codeMixed) {
    for (const pattern of ROMANIZED_TELUGU_ABILITY) {
      const matches = text.matchAll(new RegExp(pattern.source, "gi"));
      for (const match of matches) {
        const word = match[0].toLowerCase();
        const pos = match.index ?? 0;
        // Check for negation markers: kadu, kaadu, ledu, vaddhu, or compound patterns
        let negated = word.includes("kadu") || word.includes("kaadu") || word.includes("ledu") || 
                        word.includes("vaddhu") || word.includes("possible kadu") || 
                        word.includes("possible kaadu") || word.includes("possible ledu");
        // kastam/kashtam means "difficulty/hard" — implies inability
        if (!negated && (word === "kastam" || word === "kashtam")) {
          negated = true;
        }
        constraints.push({
          type: getAbilityType(word, negated),
          word: match[0],
          position: pos,
          negated,
        });
      }
    }
  }

  return constraints;
}

export function extractPosition(text: string, language: LanguageState): PositionInfo | null {
  // First check for negated positions (e.g., "don't agree", "not support")
  const negatedPositionPatterns = [
    /\b(don't|doesn't|didn't|won't|wouldn't|can't|cannot|couldn't|shouldn't|not|never)\s+(agree|support|approve)\b/gi,
    /\b(don't|doesn't|didn't|won't|wouldn't|can't|cannot|couldn't|shouldn't|not|never)\s+(oppose|reject|disapprove)\b/gi,
  ];

  for (const pattern of negatedPositionPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      const word = match[0].toLowerCase();
      const isOpposing = /\b(oppose|reject|disapprove)\b/.test(word);
      const isAgreeing = /\b(agree|support|approve)\b/.test(word);
      return {
        type: isOpposing ? "oppose" : isAgreeing ? "disagree" : "neutral",
        strength: "moderate",
        word: match[0],
        position: match.index ?? 0,
      };
    }
  }

  // English position (non-negated)
  for (const pattern of ENGLISH_POSITION) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      const word = match[0].toLowerCase();
      return {
        type: getPositionType(word),
        strength: getPositionStrength(word),
        word: match[0],
        position: match.index ?? 0,
      };
    }
  }

  // Romanized Telugu position
  if (language.primary === "telugu" || language.codeMixed) {
    for (const pattern of ROMANIZED_TELUGU_POSITION) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) {
        const word = match[0].toLowerCase();
        return {
          type: getPositionType(word),
          strength: getPositionStrength(word),
          word: match[0],
          position: match.index ?? 0,
        };
      }
    }
  }

  return null;
}

export function extractBoundaries(text: string, language: LanguageState): BoundaryInfo[] {
  const boundaries: BoundaryInfo[] = [];

  // English boundaries
  for (const pattern of ENGLISH_BOUNDARIES) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      boundaries.push({
        type: getBoundaryType(match[0]),
        word: match[0],
        position: match.index ?? 0,
      });
    }
  }

  // Romanized Telugu boundaries
  if (language.primary === "telugu" || language.codeMixed) {
    for (const pattern of ROMANIZED_TELUGU_BOUNDARIES) {
      const matches = text.matchAll(new RegExp(pattern.source, "gi"));
      for (const match of matches) {
        boundaries.push({
          type: getBoundaryType(match[0]),
          word: match[0],
          position: match.index ?? 0,
        });
      }
    }
  }

  return boundaries;
}

export function extractCommitments(text: string, language: LanguageState): CommitmentInfo[] {
  const commitments: CommitmentInfo[] = [];

  // English commitments
  for (const pattern of ENGLISH_COMMITMENTS) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      commitments.push({
        type: getCommitmentType(match[0]),
        word: match[0],
        position: match.index ?? 0,
      });
    }
  }

  // Romanized Telugu commitments
  if (language.primary === "telugu" || language.codeMixed) {
    for (const pattern of ROMANIZED_TELUGU_COMMITMENTS) {
      const matches = text.matchAll(new RegExp(pattern.source, "gi"));
      for (const match of matches) {
        commitments.push({
          type: getCommitmentType(match[0]),
          word: match[0],
          position: match.index ?? 0,
        });
      }
    }
  }

  return commitments;
}

export function extractFactualClaims(text: string): FactualClaim[] {
  const claims: FactualClaim[] = [];

  for (const { type, pattern } of FACTUAL_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      claims.push({
        type,
        value: match[0],
        position: match.index ?? 0,
      });
    }
  }

  return claims;
}

export function extractEntities(text: string): EntityInfo[] {
  const entities: EntityInfo[] = [];

  for (const { type, pattern } of ENTITY_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.source, "g"));
    for (const match of matches) {
      entities.push({
        type,
        value: match[0],
        position: match.index ?? 0,
      });
    }
  }

  return entities;
}

// ─── Contract Creation ──────────────────────────────────────────────────────

export function createPreservationContract(
  text: string,
  language: LanguageState
): PreservationContract {
  return {
    originalText: text,
    semanticConstraints: {
      negations: extractNegations(text, language),
      temporalConstraints: extractTemporalConstraints(text, language),
      abilityConstraints: extractAbilityConstraints(text, language),
      position: extractPosition(text, language),
      boundaries: extractBoundaries(text, language),
      commitments: extractCommitments(text, language),
      factualClaims: extractFactualClaims(text),
      requestedAction: extractRequestedAction(text),
      entities: extractEntities(text),
    },
    languageState: language,
    confidence: calculateExtractionConfidence(text, language),
  };
}

// ─── Validation Functions ───────────────────────────────────────────────────

export function validatePreservation(
  original: PreservationContract,
  candidate: string
): ValidationResult {
  const issues: string[] = [];
  const details = {
    negationPreserved: true,
    temporalPreserved: true,
    abilityPreserved: true,
    positionPreserved: true,
    boundaryPreserved: true,
    commitmentPreserved: true,
    factsPreserved: true,
    entitiesPreserved: true,
  };

  // Check negation preservation
  const candidateNegations = extractNegations(candidate, original.languageState);
  if (original.semanticConstraints.negations.length > 0 && candidateNegations.length === 0) {
    // Only fail if original had strong negation in a STATEMENT (not a question)
    const isQuestion = original.originalText.trim().endsWith("?");
    const hasStrongNegation = original.semanticConstraints.negations.some(
      (n) => /^(not|no|never|can't|cannot|don't|doesn't|didn't|won't|wouldn't|couldn't|shouldn't|mustn't|haven't|hasn't|hadn't|isn't|aren't|wasn't|weren't|kadu|kaadu|ledu|vaddhu|nahi|nahin|illai|kastam|kashtam)$/i.test(n.word)
    );
    // For questions, only flag if it's a critical negation (not, no, never, kadu, etc.)
    const isCriticalNegation = original.semanticConstraints.negations.some(
      (n) => /^(not|no|never|kadu|kaadu|ledu|vaddhu|nahi|nahin|illai|kastam|kashtam)$/i.test(n.word)
    );
    if (hasStrongNegation && (!isQuestion || isCriticalNegation)) {
      details.negationPreserved = false;
      issues.push("Negation removed from original message");
    }
  }

  // Check temporal preservation
  const candidateTemporal = extractTemporalConstraints(candidate, original.languageState);
  for (const originalTemporal of original.semanticConstraints.temporalConstraints) {
    const found = candidateTemporal.some(
      (ct) => ct.normalized.toLowerCase() === originalTemporal.normalized.toLowerCase()
    );
    if (!found) {
      // Only fail if original had specific temporal constraint (not just "now" or "soon")
      const isSpecific = originalTemporal.type === "absolute" || originalTemporal.type === "time";
      if (isSpecific) {
        details.temporalPreserved = false;
        issues.push(`Temporal constraint "${originalTemporal.value}" not preserved`);
      }
    }
  }

  // Check ability preservation
  const candidateAbility = extractAbilityConstraints(candidate, original.languageState);
  const originalAbility = original.semanticConstraints.abilityConstraints;
  if (originalAbility.length > 0 && candidateAbility.length === 0) {
    // Only fail if original had strong ability constraint (cannot, can't, impossible, unavailable)
    const hasStrongAbility = originalAbility.some(
      (a) => a.negated || a.type === "impossible" || a.type === "unavailable"
    );
    if (hasStrongAbility) {
      details.abilityPreserved = false;
      issues.push("Ability/availability constraint removed");
    }
  }

  // Check negation reversal in ability
  const originalHasNegation = originalAbility.some((a) => a.negated);
  const candidateHasNegation = candidateAbility.some((a) => a.negated);
  if (originalHasNegation && !candidateHasNegation) {
    // Only fail if candidate has positive ability (can, possible, available)
    const hasPositiveAbility = candidateAbility.some(
      (a) => !a.negated && (a.type === "can" || a.type === "possible" || a.type === "available")
    );
    if (hasPositiveAbility) {
      details.abilityPreserved = false;
      issues.push("Negation reversed in ability constraint");
    }
  }

  // Check position preservation
  if (original.semanticConstraints.position) {
    const candidatePosition = extractPosition(candidate, original.languageState);
    if (candidatePosition) {
      const originalType = original.semanticConstraints.position.type;
      const candidateType = candidatePosition.type;
      // Allow neutral as fallback
      if (originalType !== "neutral" && candidateType !== "neutral" && originalType !== candidateType) {
        details.positionPreserved = false;
        issues.push(`Position changed from "${originalType}" to "${candidateType}"`);
      }
    }
  }

  // Check boundary preservation
  const candidateBoundaries = extractBoundaries(candidate, original.languageState);
  const originalBoundaries = original.semanticConstraints.boundaries;
  if (originalBoundaries.length > 0 && candidateBoundaries.length === 0) {
    details.boundaryPreserved = false;
    issues.push("Boundary constraint removed");
  }

  // Check commitment preservation
  const candidateCommitments = extractCommitments(candidate, original.languageState);
  const originalCommitments = original.semanticConstraints.commitments;
  if (originalCommitments.length > 0 && candidateCommitments.length === 0) {
    details.commitmentPreserved = false;
    issues.push("Commitment constraint removed");
  }

  // Check factual preservation
  const candidateFacts = extractFactualClaims(candidate);
  for (const originalFact of original.semanticConstraints.factualClaims) {
    const found = candidateFacts.some(
      (cf) => cf.type === originalFact.type && cf.value.toLowerCase() === originalFact.value.toLowerCase()
    );
    if (!found) {
      details.factsPreserved = false;
      issues.push(`Factual claim "${originalFact.value}" not preserved`);
    }
  }

  // Check entity preservation
  const candidateEntities = extractEntities(candidate);
  for (const originalEntity of original.semanticConstraints.entities) {
    const found = candidateEntities.some(
      (ce) => ce.type === originalEntity.type && ce.value === originalEntity.value
    );
    if (!found) {
      details.entitiesPreserved = false;
      issues.push(`Entity "${originalEntity.value}" not preserved`);
    }
  }

  const passed = issues.length === 0;
  const score = passed ? 1.0 : Math.max(0, 1 - (issues.length * 0.15));

  return {
    passed,
    issues,
    score,
    details,
  };
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function getTemporalType(value: string): "absolute" | "relative" | "time" {
  const lower = value.toLowerCase();
  if (/\d{1,2}:\d{2}/.test(lower) || /\d{1,2}\s*(am|pm)/.test(lower)) {
    return "time";
  }
  if (/today|tomorrow|yesterday|tonight|ivala|repu|ninnati/.test(lower)) {
    return "absolute";
  }
  return "relative";
}

function normalizeTemporal(value: string): string {
  const lower = value.toLowerCase().trim();
  // Map common variations to canonical forms
  const mappings: Record<string, string> = {
    "ivala": "today",
    "ivvala": "today",
    "eeroju": "today",
    "repu": "tomorrow",
    "repuva": "tomorrow",
    "ninnati": "yesterday",
    "ninna": "yesterday",
    "ipudu": "now",
    "ippudu": "now",
    "tvaraga": "soon",
    "twara ga": "soon",
  };
  return mappings[lower] || lower;
}

function getAbilityType(word: string, negated: boolean): "can" | "cannot" | "possible" | "impossible" | "available" | "unavailable" {
  const lower = word.toLowerCase();
  if (lower.includes("possible kadu") || lower.includes("possible kaadu") || lower.includes("possible ledu")) {
    return "impossible";
  }
  if (lower.includes("possible")) {
    return negated ? "impossible" : "possible";
  }
  if (lower.includes("available") || lower.includes("free")) {
    return negated ? "unavailable" : "available";
  }
  if (lower.includes("won't be able") || lower.includes("wouldn't be able")) {
    return "cannot";
  }
  if (lower.includes("can") || lower.includes("able")) {
    return negated ? "cannot" : "can";
  }
  if (lower.includes("kastam") || lower.includes("kashtam")) {
    return "cannot";
  }
  return negated ? "cannot" : "can";
}

function getPositionType(word: string): "agree" | "disagree" | "support" | "oppose" | "neutral" {
  const lower = word.toLowerCase();
  if (lower.includes("disagree") || lower.includes("oppose") || lower.includes("against") || lower.includes("reject")) {
    return "disagree";
  }
  if (lower.includes("agree") || lower.includes("accept") || lower.includes("approve")) {
    return "agree";
  }
  if (lower.includes("support") || lower.includes("for")) {
    return "support";
  }
  return "neutral";
}

function getPositionStrength(word: string): "strong" | "moderate" | "weak" {
  const lower = word.toLowerCase();
  if (lower.includes("strongly") || lower.includes("completely") || lower.includes("absolutely")) {
    return "strong";
  }
  if (lower.includes("somewhat") || lower.includes("a little")) {
    return "weak";
  }
  return "moderate";
}

function getBoundaryType(word: string): "can't" | "won't" | "not_available" | "not_possible" | "refusal" {
  const lower = word.toLowerCase();
  if (lower.includes("can't") || lower.includes("cannot")) {
    return "can't";
  }
  if (lower.includes("won't") || lower.includes("will not")) {
    return "won't";
  }
  if (lower.includes("not available")) {
    return "not_available";
  }
  if (lower.includes("not possible")) {
    return "not_possible";
  }
  if (lower.includes("vaddhu") || lower.includes("vaaddu")) {
    return "refusal";
  }
  return "can't";
}

function getCommitmentType(word: string): "will" | "won't" | "must" | "shall" {
  const lower = word.toLowerCase();
  if (lower.includes("won't") || lower.includes("will not")) {
    return "won't";
  }
  if (lower.includes("must")) {
    return "must";
  }
  if (lower.includes("shall")) {
    return "shall";
  }
  return "will";
}

function extractRequestedAction(text: string): string | null {
  const patterns = [
    /can (?:you|i|we) ([^?]+)/i,
    /could (?:you|i|we) ([^?]+)/i,
    /please ([^?]+)/i,
    /let me ([^?]+)/i,
    /i (?:need|want|would like) (?:to )?([^?.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[1]?.trim() || null;
    }
  }

  return null;
}

function calculateExtractionConfidence(text: string, language: LanguageState): number {
  let confidence = 0.5;

  // Higher confidence for longer texts
  if (text.length > 20) confidence += 0.1;
  if (text.length > 50) confidence += 0.1;

  // Higher confidence for detected language
  if (language.primary !== "unknown") confidence += 0.1;

  // Higher confidence for code-mixed (more explicit markers)
  if (language.codeMixed) confidence += 0.05;

  // Lower confidence for very short texts
  if (text.split(/\s+/).length < 3) confidence -= 0.1;

  return Math.max(0.3, Math.min(0.95, confidence));
}
