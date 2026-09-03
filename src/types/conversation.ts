export interface ConversationMessage {
  sender: "me" | "them" | "unknown";
  text: string;
}

export interface NormalizedConversation {
  platform?: string;
  messages: ConversationMessage[];
}

export type ConversationStage =
  | "opening"
  | "getting_to_know_each_other"
  | "rapport"
  | "playful"
  | "flirting"
  | "deep_conversation"
  | "planning"
  | "reconnecting"
  | "dry_conversation"
  | "awkward_conversation"
  | "closing";

export interface ConversationAnalysis {
  stage: ConversationStage;
  engagement: number;
  flirting: number;
  humor: number;
  reciprocity: number;
  conversationHealth: number;
}

export type GoalType =
  | "keep_going"
  | "start_conversation"
  | "make_them_laugh"
  | "flirt_naturally"
  | "be_confident"
  | "show_interest"
  | "ask_them_out"
  | "recover_dry"
  | "change_topic"
  | "reply_to_story"
  | "reconnect"
  | "reply_casually"
  | "end_conversation";

export interface ReplyCandidate {
  text: string;
  strategy: string;
}
