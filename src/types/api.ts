export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConversationContextRequest {
  language?: string;
  script?: string;
  conversationType?: string;
  participants?: number;
  goal?: string;
  tone?: string;
  urgency?: string;
  userStyle?: string;
  platform?: string;
  outputLanguage?: string;
  preferredStyle?: string;
}

export interface GenerateRepliesRequest {
  messages: { sender: string; text: string }[];
  context?: ConversationContextRequest;
}

export interface GenerateRepliesResponse {
  bestMatch: { text: string; strategy: string };
  alternatives: { text: string; strategy: string }[];
  analysis: {
    stage: string;
    engagement: number;
    health: number;
  };
}

export interface AnalyzeScreenshotRequest {
  imageBase64: string;
  mimeType: string;
}

export interface AnalyzeScreenshotResponse {
  platform?: string;
  messages: { sender: string; text: string }[];
  context?: ConversationContextRequest;
}

export interface AnalyzeTextRequest {
  text: string;
}

export interface StyleProfileRequest {
  examples: string[];
}

export interface FeedbackRequest {
  replyId: string;
  signal: string;
}
