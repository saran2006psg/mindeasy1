import { Play } from 'lucide-react';
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
  }, []);

  return (
    <div className="space-y-4 page-fade">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Conversation Journal</h2>
        <p className="text-sm text-slate-500">Track your thoughts, feelings, and supportive responses over time.</p>
      </div>

      {entries.length === 0 && <div className="soft-card p-4 text-sm text-slate-500">No journal entries yet.</div>}

      <div className="space-y-3">
        {entries.map((entry) => (
          <article key={entry.id} className="soft-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tagColorMap[entry.tag] || 'bg-slate-100 text-slate-700'}`}>
                {entry.tag}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-slate-700">
                <strong className="mr-1">You:</strong>
                {entry.userMessage}
              </p>

              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-slate-700">
                <strong className="mr-1">MindEase:</strong>
                {entry.aiResponse}
              </p>
            </div>

            {entry.audioDataUrl && (
              <button
                type="button"
                onClick={() => {
                  const audio = new Audio(entry.audioDataUrl);
                  void audio.play();
                }}
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
              >
                <Play size={12} />
                Play Audio
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
