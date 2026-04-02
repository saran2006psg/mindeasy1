import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { store } from '../store/mindeaseStore';
import type { ConversationEntry } from '../types';

const tagColorMap: Record<string, string> = {
  Anxiety: 'bg-cyan-100 text-cyan-700',
  Stress: 'bg-amber-100 text-amber-700',
  Motivation: 'bg-indigo-100 text-indigo-700',
  Sleep: 'bg-violet-100 text-violet-700',
  Sadness: 'bg-blue-100 text-blue-700',
  Happy: 'bg-emerald-100 text-emerald-700',
};

export function JournalPage() {
  const [entries, setEntries] = useState<ConversationEntry[]>(store.getConversations());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [generatedAudioMap, setGeneratedAudioMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const syncEntries = async () => {
      try {
        const backendEntries = await api.fetchJournal();
        if (backendEntries.length) {
          setEntries(backendEntries);
          store.setConversations(backendEntries);
        }
      } catch {
        // Fall back to local storage if backend sync fails.
      }
    };

    void syncEntries();

    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const handleStop = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setPlayingId(null);
    }
  };

  const handlePlay = async (entry: ConversationEntry) => {
    if (playingId === entry.id) {
      handleStop();
      return;
    }

    handleStop();

    let audioUrl = '';
    
    // 1. Check if we already have it in the session cache
    if (generatedAudioMap[entry.id]) {
      audioUrl = generatedAudioMap[entry.id];
    } 
    // 2. Check if a pre-saved URL exists
    else if (entry.audioDataUrl) {
      audioUrl = entry.audioDataUrl.startsWith('/')
        ? `${localStorage.getItem('mindease_backend_url') || 'http://localhost:3000'}${entry.audioDataUrl}`
        : entry.audioDataUrl;
    } 
    // 3. Generate it dynamically
    else {
      try {
        setIsGeneratingId(entry.id);
        const result = await api.previewVoice(entry.aiResponse);
        if (result.success && result.audioDataUrl) {
          audioUrl = result.audioDataUrl;
          // Store in session cache
          setGeneratedAudioMap(prev => ({ ...prev, [entry.id]: audioUrl }));
        }
      } catch (error) {
        console.error('Failed to generate journal audio:', error);
      } finally {
        setIsGeneratingId(null);
      }
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      setPlayingId(entry.id);
      
      audio.onended = () => {
        setPlayingId(null);
        setCurrentAudio(null);
      };

      void audio.play();
    }
  };

  return (
    <div className="space-y-4 page-fade">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Conversation Journal</h2>
        <p className="text-sm text-slate-500">Track your thoughts, feelings, and supportive responses over time.</p>
      </div>

      {entries.length === 0 && <div className="soft-card p-4 text-sm text-slate-500">No journal entries yet.</div>}

      <div className="space-y-3">
        {entries.map((entry) => (
          <article key={entry.id} className="soft-card p-4 transition-all hover:shadow-md">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tagColorMap[entry.tag] || 'bg-slate-100 text-slate-700'}`}>
                {entry.tag}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-slate-700">
                <strong className="mr-1 text-sky-600">You:</strong>
                {entry.userMessage}
              </p>

              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-slate-700">
                <strong className="mr-1 text-emerald-600">MindEase:</strong>
                {entry.aiResponse}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                Mood: {entry.moodScore || 5}/10
              </div>

              <button
                type="button"
                onClick={() => handlePlay(entry)}
                disabled={isGeneratingId !== null}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all shadow-sm ${
                  playingId === entry.id
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : isGeneratingId === entry.id
                    ? 'bg-amber-50 text-amber-700 animate-pulse cursor-wait'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:scale-105'
                } disabled:opacity-75`}
              >
                {playingId === entry.id ? (
                  <>
                    <Square size={14} fill="currentColor" />
                    Stop Audio
                  </>
                ) : isGeneratingId === entry.id ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-700 border-t-transparent"></div>
                    Generating voice...
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    Play Audio
                  </>
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
