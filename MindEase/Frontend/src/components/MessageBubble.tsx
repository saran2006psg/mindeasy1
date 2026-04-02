import { Play, Square, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audioManager } from '../services/audioManager';

interface MessageBubbleProps {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timeText: string;
  audioDataUrl?: string;
  audioDataUrls?: string[];
}

export function MessageBubble({ id, role, text, timeText, audioDataUrl, audioDataUrls }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Check if this specific bubble is currently playing globally
    const checkStatus = setInterval(() => {
      const activeId = audioManager.getActiveId();
      setIsPlaying(activeId === id);
    }, 100);

    return () => {
      clearInterval(checkStatus);
      if (audioManager.getActiveId() === id) {
        audioManager.stop();
      }
    };
  }, [id]);

  const toggleAudio = () => {
    if (isPlaying) {
      audioManager.stop();
      setIsPlaying(false);
      return;
    }

    const sequence = audioDataUrls?.length ? audioDataUrls : (audioDataUrl ? [audioDataUrl] : []);
    if (!sequence.length) return;

    audioManager.play(sequence, id, () => {
      setIsPlaying(false);
    });
    setIsPlaying(true);
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
              onClick={toggleAudio}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition ${
                isPlaying 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 shadow-sm' 
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              <Volume2 size={12} />
              {isPlaying ? 'Stop' : 'Play'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
