/**
 * Global audio manager to handle playback and ensuring only one audio plays at a time.
 */

let activeAudio: HTMLAudioElement | null = null;
let currentUrls: string[] = [];
let currentIndex = 0;
let onEndCallback: (() => void) | null = null;
let activeId: string | null = null;

function createPlayableAudio(audioDataUrl: string) {
  if (!audioDataUrl.startsWith('data:')) {
    return { audio: new Audio(audioDataUrl), objectUrl: '' };
  }

  const firstComma = audioDataUrl.indexOf(',');
  if (firstComma === -1) {
    return { audio: new Audio(audioDataUrl), objectUrl: '' };
  }

  const meta = audioDataUrl.slice(5, firstComma);
  const base64 = audioDataUrl.slice(firstComma + 1);
  const mimeType = (meta.split(';')[0] || 'audio/wav').trim();

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  return { audio: new Audio(objectUrl), objectUrl };
}

export const audioManager = {
  stop() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    currentUrls = [];
    currentIndex = 0;
    activeId = null;
    if (onEndCallback) onEndCallback();
  },

  play(urls: string[], id: string, onEnd?: () => void) {
    this.stop();
    
    currentUrls = urls;
    activeId = id;
    onEndCallback = onEnd || null;

    const playNext = () => {
      if (currentIndex >= currentUrls.length) {
        this.stop();
        return;
      }

      const { audio } = createPlayableAudio(currentUrls[currentIndex]);
      activeAudio = audio;
      currentIndex += 1;

      audio.onended = () => void playNext();
      audio.onerror = () => void playNext();
      
      void audio.play().catch(() => void playNext());
    };

    void playNext();
  },

  isPlaying(id: string) {
    return activeId === id;
  },

  getActiveId() {
    return activeId;
  }
};
