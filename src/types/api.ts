export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GenerateRepliesRequest {
  conversationId?: string;
  messages: { sender: string; text: string }[];
  goal?: string;
  styleProfile?: Record<string, string>;
  platform?: string;
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
