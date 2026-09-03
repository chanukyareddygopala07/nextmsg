export interface TextingProfileData {
  messageLength: string;
  capitalization: string;
  punctuation: string;
  emojiFrequency: string;
  favoriteEmojis: string[];
  humor: string;
  flirting: string;
  slang: string;
  abbreviations: string;
  directness: string;
  questionFrequency: string;
  energy: string;
  sarcasm: string;
  useOfLowercase: string;
  typicalOpenings: string[];
  typicalClosings: string[];
  oneLinerTendency: string;
  conversationalEnergy: string;
  onboardingExamples: string[];
}

export interface StyleSummary {
  display: string[];
  raw: TextingProfileData;
}
