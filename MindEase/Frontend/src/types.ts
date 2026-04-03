export type Tag = 'Anxiety' | 'Stress' | 'Motivation' | 'Sleep' | 'Sadness' | 'Happy';

export interface ConversationEntry {
  id: string;
  createdAt: string;
  userMessage: string;
  aiResponse: string;
  tag: Tag;
  moodScore?: number;
  audioDataUrl?: string;
  audioDataUrls?: string[];
}

export interface VoiceOption {
  id: string;
  name: string;
  description?: string;
}

export interface VoiceSettings {
  voice: string;
  stability: number;
  similarityBoost: number;
}

export interface AppSettings {
  backendUrl: string;
  ngrokUrl: string;
  voiceId: string;
  stability: number;
  similarityBoost: number;
}

export interface ChatResponse {
  success: boolean;
  id: string;
  createdAt: string;
  userMessage: string;
  aiResponse: string;
  tag: Tag;
  moodScore?: number;
  audioDataUrl?: string;
  audioDataUrls?: string[];
}
