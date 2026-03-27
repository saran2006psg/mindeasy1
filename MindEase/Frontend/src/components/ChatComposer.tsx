import { Mic, MicOff, SendHorizonal } from 'lucide-react';

interface ChatComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  isListening: boolean;
  speechSupported: boolean;
  speechStatus?: string;
  onToggleListening: () => void;
}

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  isSending,
  isListening,
  speechSupported,
  speechStatus,
  onToggleListening,
}: ChatComposerProps) {
  return (
    <div className="rounded-2xl border border-white bg-white/90 p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Share how you are feeling..."
          className="min-h-14 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-300"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleListening}
            disabled={!speechSupported}
            className={[
              'inline-flex h-10 w-10 items-center justify-center rounded-full transition',
              isListening ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              !speechSupported ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
            aria-label="Toggle voice input"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            type="button"
            onClick={onSend}
            disabled={isSending || !input.trim()}
            className="inline-flex h-10 items-center gap-1 rounded-full bg-linear-to-r from-sky-500 to-indigo-500 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <SendHorizonal size={16} />
            Send
          </button>
        </div>
      </div>

      {speechStatus && <p className="mt-2 text-xs text-slate-500">{speechStatus}</p>}
    </div>
  );
}
