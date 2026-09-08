export type CommunicationContext =
  | "professional"
  | "academic"
  | "interview"
  | "friendship"
  | "dating"
  | "family"
  | "social"
  | "customer"
  | "negotiation"
  | "conflict"
  | "general";

export type CommunicationStyle =
  | "professional"
  | "friendly"
  | "clear_direct"
  | "diplomatic"
  | "empathetic"
  | "concise"
  | "assertive"
  | "persuasive"
  | "formal"
  | "casual"
  | "playful"
  | "flirty"
  | "charming"
  | "warm"
  | "confident"
  | "humorous"
  | "serious"
  | "calm"
  | "respectful";

export type OutputLanguage =
  | "auto"
  | "english"
  | "romanized"
  | "native_script"
  | "code_mixed";

export type UrgencyLevel = "low" | "normal" | "high" | "urgent";

export interface ConversationContext {
  language: string;
  script: "romanized" | "native" | "english" | "mixed";
  conversationType: CommunicationContext;
  participants: number;
  goal: string;
  tone: string;
  urgency: UrgencyLevel;
  userStyle: string;
  platform?: string;
  outputLanguage?: OutputLanguage;
  preferredStyle?: CommunicationStyle;
  /** User-facing communication mode; kept separate from conversationType. */
  communicationMode?: CommunicationMode;
  /** Ephemeral session instruction (e.g. "make this flirty"); not a permanent preference. */
  overrideInstruction?: string | null;
}

export interface ContextDetectorInput {
  messages: { sender: string; text: string }[];
  goal?: string;
  platform?: string;
}
import type { CommunicationMode } from "./mode-types";
