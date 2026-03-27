import type { AppSettings, ConversationEntry } from '../types';

const conversationKey = 'mindease_conversations';
const settingsKey = 'mindease_settings';
const backendUrlKey = 'mindease_backend_url';

const defaultSettings: AppSettings = {
  backendUrl: 'http://localhost:3000',
  ngrokUrl: '',
  voiceId: 'troy',
  speed: 1,
};

export const store = {
  getConversations(): ConversationEntry[] {
    try {
      const raw = localStorage.getItem(conversationKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setConversations(entries: ConversationEntry[]) {
    localStorage.setItem(conversationKey, JSON.stringify(entries.slice(0, 250)));
  },

  addConversation(entry: ConversationEntry) {
    const current = this.getConversations();
    this.setConversations([entry, ...current]);
  },

  getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(settingsKey);
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  setSettings(settings: AppSettings) {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    localStorage.setItem(backendUrlKey, settings.backendUrl);
  },
};
