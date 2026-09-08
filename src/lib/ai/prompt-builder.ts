import type { ConversationContext } from "./context";
import type { ConversationState } from "./conversation-state";

export function buildConversationText(
  messages: { sender: string; text: string }[]
): string {
  return messages.map((m) => `${m.sender}: ${m.text}`).join("\n");
}

export function buildContextBlock(ctx: ConversationContext): string {
  const parts: string[] = [];

  parts.push(`Language: ${ctx.language}`);
  parts.push(`Script: ${ctx.script}`);
  parts.push(`Conversation type: ${ctx.conversationType}`);
  parts.push(`Participants: ${ctx.participants}`);
  parts.push(`Goal: ${ctx.goal}`);
  parts.push(`Tone: ${ctx.tone}`);
  parts.push(`Urgency: ${ctx.urgency}`);
  parts.push(`User style: ${ctx.userStyle}`);

  if (ctx.platform) parts.push(`Platform: ${ctx.platform}`);
  if (ctx.communicationMode) parts.push(`Communication mode: ${ctx.communicationMode}`);
  if (ctx.outputLanguage) parts.push(`Output language: ${ctx.outputLanguage}`);
  if (ctx.preferredStyle) parts.push(`Preferred style: ${ctx.preferredStyle}`);

  return parts.join("\n");
}

export function assembleSystemPrompt(
  basePrompt: string,
  ctx: ConversationContext
): string {
  return `${basePrompt}\n\n## Current Context\n${buildContextBlock(ctx)}`;
}

export function assembleGenerationUserPrompt(
  conversationText: string,
  ctx: ConversationContext,
  lastSender: string
): string {
  const contextBlock = buildContextBlock(ctx);
  return `Generate replies for this conversation:\n\n## Context\n${contextBlock}\n\n## Conversation\n${conversationText}\n\nLast message was from: ${lastSender}`;
}

export function assembleAnalysisUserPrompt(
  conversationText: string,
  ctx: ConversationContext
): string {
  const contextBlock = buildContextBlock(ctx);
  return `Analyze this conversation:\n\n## Context\n${contextBlock}\n\n## Conversation\n${conversationText}`;
}

export function assembleHumanizationUserPrompt(
  candidatesText: string,
  ctx: ConversationContext
): string {
  const contextBlock = buildContextBlock(ctx);
  return `Humanize these replies to sound like a real person texting:\n\n## Context\n${contextBlock}\n\n## Candidates\n${candidatesText}`;
}

// ─── Context-Aware Humanization Prompt ───────────────────────────────────────
//
// Builds a detailed prompt for context-aware humanization using ConversationState.
// ──────────────────────────────────────────────────────────────────────────────

export function assembleContextAwareHumanizationPrompt(
  candidatesText: string,
  ctx: ConversationContext,
  state?: ConversationState
): string {
  const contextBlock = buildContextBlock(ctx);

  if (!state) {
    return `Humanize these replies to sound like a real person texting:\n\n## Context\n${contextBlock}\n\n## Candidates\n${candidatesText}`;
  }

  // Build state summary
  const stateSummary = buildStateSummary(state);

  // Build style profile section
  const styleSection = buildStyleProfileSection(state);

  // Build language section
  const languageSection = buildLanguageSection(state);

  return `Humanize these replies to sound like a REAL PERSON texting, while preserving meaning, strategy, and context.

## Context
${contextBlock}

## Conversation State
${stateSummary}

${styleSection}

${languageSection}

## Candidates to Humanize
${candidatesText}

## Instructions
1. Preserve the EXACT strategy标签 (e.g., "professional", "accountable", "flirty")
2. Preserve the intended meaning and facts
3. Apply user style characteristics (length, emoji, punctuation, slang) when context allows
4. Match the conversation context (professional, dating, conflict, etc.)
5. Preserve language preferences (code-mixing, Romanized, etc.)
6. Do NOT add generic compliments or AI-like patterns
7. Do NOT change the communication objective`;
}

function buildStateSummary(state: ConversationState): string {
  const parts: string[] = [];

  parts.push(`- Relationship: ${state.relationship}`);
  parts.push(`- Context: ${state.context.type}`);
  parts.push(`- Situation: ${state.context.situation}`);
  parts.push(`- User Intent: ${state.intent.userIntent}`);
  parts.push(`- Other Intent: ${state.intent.otherIntent}`);
  parts.push(`- Emotion: ${state.emotion.primary} (intensity: ${state.emotion.intensity})`);
  parts.push(`- Tone: ${state.tone.primary} (intensity: ${state.tone.intensity})`);
  parts.push(`- Conflict Level: ${state.conflict.level}`);
  parts.push(`- Conflict Escalation: ${state.conflict.escalation}`);
  parts.push(`- Participants: ${state.participants.count}${state.participants.isGroup ? " (group)" : ""}`);

  if (state.strategy.ranked.length > 0) {
    const strategies = state.strategy.ranked
      .map((s) => `${s.strategy} (priority ${s.priority})`)
      .join(", ");
    parts.push(`- Strategies: ${strategies}`);
  }

  return parts.join("\n");
}

function buildStyleProfileSection(state: ConversationState): string {
  const profile = state.style?.profile;
  if (!profile) return "";

  const parts: string[] = [];
  parts.push("## User Writing Style Profile");

  // Length
  parts.push(`- Average words per message: ${profile.sentence.averageWords}`);
  parts.push(`- Length category: ${profile.sentence.lengthCategory}`);
  parts.push(`- Prefers fragments: ${profile.sentence.prefersFragments}`);

  // Emoji
  parts.push(`- Uses emojis: ${profile.emoji.usesEmojis}`);
  if (profile.emoji.usesEmojis) {
    parts.push(`- Emoji frequency: ${Math.round(profile.emoji.frequency * 100)}%`);
    parts.push(`- Emoji placement: ${profile.emoji.placement}`);
    if (profile.emoji.commonEmojis.length > 0) {
      parts.push(`- Common emojis: ${profile.emoji.commonEmojis.join(" ")}`);
    }
  }

  // Punctuation
  parts.push(`- Punctuation style: ${profile.punctuation.style}`);
  parts.push(`- Exclamation rate: ${Math.round(profile.punctuation.exclamationRate * 100)}%`);
  parts.push(`- Question rate: ${Math.round(profile.punctuation.questionRate * 100)}%`);
  parts.push(`- Uses ellipses: ${profile.punctuation.usesEllipses}`);

  // Slang
  parts.push(`- Uses slang: ${profile.slang.usesSlang}`);
  if (profile.slang.usesSlang) {
    parts.push(`- Slang frequency: ${Math.round(profile.slang.frequency * 100)}%`);
    if (profile.slang.commonSlang.length > 0) {
      parts.push(`- Common slang: ${profile.slang.commonSlang.slice(0, 5).join(", ")}`);
    }
  }

  // Tone
  parts.push(`- Dominant tone: ${profile.tonePreference.dominant}`);
  parts.push(`- Formality: ${profile.tonePreference.formality}`);
  parts.push(`- Warmth: ${Math.round(profile.tonePreference.warmth * 100)}%`);
  parts.push(`- Directness: ${Math.round(profile.tonePreference.directness * 100)}%`);

  // Humor
  parts.push(`- Uses humor: ${profile.humor.usesHumor}`);
  if (profile.humor.usesHumor) {
    parts.push(`- Humor style: ${profile.humor.style}`);
  }

  // Language style
  parts.push(`- Language style: ${profile.languageStyle}`);

  // Confidence
  parts.push(`- Style confidence: ${Math.round(profile.confidence * 100)}%`);

  return parts.join("\n");
}

function buildLanguageSection(state: ConversationState): string {
  const parts: string[] = [];
  parts.push("## Language Settings");

  parts.push(`- Primary language: ${state.language.primary}`);
  if (state.language.secondary.length > 0) {
    parts.push(`- Secondary languages: ${state.language.secondary.join(", ")}`);
  }
  parts.push(`- Script: ${state.language.script}`);
  parts.push(`- Code-mixed: ${state.language.codeMixed}`);
  parts.push(`- Romanized: ${state.language.romanized}`);
  parts.push(`- Output preference: ${state.language.outputPreference}`);

  if (state.language.codeMixRatio.length > 0) {
    const ratios = state.language.codeMixRatio
      .map((r) => `${r.language}: ${Math.round(r.ratio * 100)}%`)
      .join(", ");
    parts.push(`- Code mix ratio: ${ratios}`);
  }

  return parts.join("\n");
}
