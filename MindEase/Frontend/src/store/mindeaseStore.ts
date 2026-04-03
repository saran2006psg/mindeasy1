import type { AppSettings, ConversationEntry } from '../types';

const conversationKey = 'mindease_conversations';
const settingsKey = 'mindease_settings';
const backendUrlKey = 'mindease_backend_url';

const defaultSettings: AppSettings = {
  backendUrl: 'http://localhost:3000',
  ngrokUrl: '',
  voiceId: 'troy',
  stability: 0.5,
  similarityBoost: 0.75,
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

  isLoggedIn(): boolean {
    return localStorage.getItem('mindease_auth') === 'true';
  },

  login(username: string, password: string): boolean {
    if (username === 'surya' && password === 'surya123') {
      localStorage.setItem('mindease_auth', 'true');
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem('mindease_auth');
  },
};
