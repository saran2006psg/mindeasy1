import axios from 'axios';
import type { ChatResponse, ConversationEntry, VoiceOption, VoiceSettings } from '../types';

const defaultBaseUrl = 'http://localhost:3000';

const getBaseUrl = () => localStorage.getItem('mindease_backend_url') || defaultBaseUrl;

const client = () =>
  axios.create({
    baseURL: getBaseUrl(),
    timeout: 30000,
  });

export const api = {
  async status() {
    const { data } = await client().get('/status');
    return data;
  },

  async chat(message: string): Promise<ChatResponse> {
    const { data } = await client().post('/chat', { message });
    return data;
  },

  async transcribeAudio(blob: Blob): Promise<string> {
    const { data } = await client().post('/uploadAudio', blob, {
      headers: {
        'Content-Type': blob.type || 'audio/webm',
      },
      transformRequest: [(payload) => payload],
    });

    if (typeof data === 'string') {
      return data;
    }

    return '';
  },

  async listVoices(): Promise<VoiceOption[]> {
    const { data } = await client().get('/list-voices');
    return data?.voices || [];
  },

  async getSettings(): Promise<{ voiceId: string; voiceSettings: VoiceSettings; backendUrl: string; ngrokUrl: string }> {
    const { data } = await client().get('/settings');
    return data;
  },

  async setVoice(voiceId: string) {
    const { data } = await client().put('/settings/voice', { voiceId });
    return data;
  },

  async setVoiceConfig(stability: number, similarityBoost: number) {
    const { data } = await client().put('/settings/voice-config', { stability, similarityBoost });
    return data;
  },

  async previewVoice(text: string) {
    const { data } = await client().post('/settings/preview', { text });
    return data;
  },

  async fetchJournal(): Promise<ConversationEntry[]> {
    const { data } = await client().get('/journal');
    return data?.entries || [];
  },

  async saveJournal(entry: ConversationEntry) {
    await client().post('/journal', entry);
  },

  async fetchAnalytics() {
    const { data } = await client().get('/analytics');
    return data;
  },
};
