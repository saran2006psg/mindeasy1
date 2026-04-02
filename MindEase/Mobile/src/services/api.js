import axios from 'axios';
import { Platform } from 'react-native';

// FOR LOCAL DEVELOPMENT:
// Windows/Android Emulator: 10.0.2.2
// iOS Simulator: localhost
// Physical Device: Your computer's local IP (e.g., 192.168.1.5)
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const client = axios.create({
  baseURL: DEFAULT_URL,
  timeout: 15000,
});

export const api = {
  async status() {
    const { data } = await client.get('/status');
    return data;
  },

  async chat(message) {
    const { data } = await client.post('/chat', { message });
    return data;
  },

  async fetchJournal() {
    const { data } = await client.get('/journal');
    return data?.entries || [];
  },

  async fetchAnalytics() {
    const { data } = await client.get('/analytics');
    return data;
  },
};

export default api;
