import { Play, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  timeText: string;
  audioDataUrl?: string;
  audioDataUrls?: string[];
}

let activeAudioPlayer: HTMLAudioElement | null = null;

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

export function MessageBubble({ role, text, timeText, audioDataUrl, audioDataUrls }: MessageBubbleProps) {
  const isUser = role === 'user';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (activeAudioPlayer === audioRef.current) {
          activeAudioPlayer = null;
        }
      }
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = '';
      }
    };
  }, []);

  const playAudio = () => {
    const sequence = audioDataUrls?.length ? audioDataUrls : (audioDataUrl ? [audioDataUrl] : []);
    if (!sequence.length) {
      return;
    }

    if (audioRef.current && !audioRef.current.paused) {
      return;
    }

    if (activeAudioPlayer && !activeAudioPlayer.paused) {
      activeAudioPlayer.pause();
      activeAudioPlayer.currentTime = 0;
    }

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = '';
    }

    let index = 0;

    const finishPlayback = () => {
      setIsPlaying(false);
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = '';
      }
      if (activeAudioPlayer === audioRef.current) {
        activeAudioPlayer = null;
      }
    };

    const playNext = () => {
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = '';
      }

      if (index >= sequence.length) {
        finishPlayback();
        return;
      }

      const { audio, objectUrl } = createPlayableAudio(sequence[index]);
      audioRef.current = audio;
      audioObjectUrlRef.current = objectUrl;
      activeAudioPlayer = audio;
      setIsPlaying(true);
      index += 1;

      audio.onended = playNext;
      audio.onerror = finishPlayback;

      void audio.play().catch(finishPlayback);
    };

    playNext();
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} page-fade`}>
      <div
        className={[
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-linear-to-br from-sky-500 to-indigo-500 text-white'
            : 'bg-white/90 text-slate-700 border border-white',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{text}</p>
        <div className={`mt-2 flex items-center gap-2 text-xs ${isUser ? 'text-sky-100' : 'text-slate-500'}`}>
          <span>{timeText}</span>
          {!isUser && audioDataUrl && (
            <button
              type="button"
              onClick={playAudio}
              disabled={isPlaying}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 hover:bg-emerald-200"
            >
              <Play size={12} />
              <Volume2 size={12} />
              {isPlaying ? 'Playing' : 'Play'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
