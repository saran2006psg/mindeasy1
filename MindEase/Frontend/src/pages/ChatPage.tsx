import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatComposer } from '../components/ChatComposer';
import { MessageBubble } from '../components/MessageBubble';
import { QuickHelpCards } from '../components/QuickHelpCards';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { api } from '../services/api';
import { store } from '../store/mindeaseStore';
import type { ConversationEntry } from '../types';

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

export function ChatPage() {
  const [conversations, setConversations] = useState<ConversationEntry[]>(store.getConversations());
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [isRecordingFallback, setIsRecordingFallback] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  const { isListening, speechError, speechStatus, startListening, stopListening, supported } = useSpeechRecognition((transcript) => {
    setInput((prev) => `${prev} ${transcript}`.trim());
  });

  // Load conversations from store when component mounts or tab is switched back
  useEffect(() => {
    setConversations(store.getConversations());
  }, []);

  const canUseRecorderFallback = typeof window !== 'undefined' && !!window.MediaRecorder;
  const micEnabled = supported || canUseRecorderFallback;

  const stopFallbackRecording = () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const startFallbackRecording = async () => {
    try {
      setRecordingError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingError('Audio recording failed. Please try again.');
        setIsRecordingFallback(false);
      };

      recorder.onstop = async () => {
        setIsRecordingFallback(false);

        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          if (blob.size === 0) {
            setRecordingError('No audio captured. Please try speaking again.');
            return;
          }

          const transcription = await api.transcribeAudio(blob);
          if (!transcription || transcription.toLowerCase().includes('error')) {
            setRecordingError('Transcription was unclear. Please try speaking slower and closer to the mic.');
            return;
          }

          setInput((prev) => `${prev} ${transcription}`.trim());
        } catch {
          setRecordingError('Could not transcribe audio from backend.');
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          recorderRef.current = null;
          chunksRef.current = [];
        }
      };

      recorder.start();
      setIsRecordingFallback(true);

      stopTimerRef.current = window.setTimeout(() => {
        stopFallbackRecording();
      }, 6000);
    } catch {
      setRecordingError('Microphone permission is required for audio input.');
      setIsRecordingFallback(false);
    }
  };

  const handleMicToggle = async () => {
    setRecordingError('');

    if (supported) {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
      return;
    }

    if (!canUseRecorderFallback) {
      setRecordingError('This browser does not support speech recognition or audio recording.');
      return;
    }

    if (isRecordingFallback) {
      stopFallbackRecording();
      return;
    }

    await startFallbackRecording();
  };

  const startNewChat = () => {
    setConversations([]);
    store.setConversations([]);
    setInput('');
    setError('');
  };

  const messages = useMemo(() => {
    const list: Array<{ role: 'user' | 'assistant'; text: string; timeText: string; audioDataUrl?: string; audioDataUrls?: string[] }> = [];
    [...conversations].reverse().forEach((entry) => {
      const timeText = new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      list.push({ role: 'user', text: entry.userMessage, timeText });
      list.push({
        role: 'assistant',
        text: entry.aiResponse,
        timeText,
        audioDataUrl: entry.audioDataUrl,
        audioDataUrls: entry.audioDataUrls,
      });
    });
    return list;
  }, [conversations]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setIsSending(true);
    setError('');

    try {
      const response = await api.chat(text.trim());
      const entry: ConversationEntry = {
        id: response.id,
        createdAt: response.createdAt,
        userMessage: response.userMessage,
        aiResponse: response.aiResponse,
        tag: response.tag,
        audioDataUrl: response.audioDataUrl,
        audioDataUrls: response.audioDataUrls,
      };

      const updated = [entry, ...conversations];
      setConversations(updated);
      store.setConversations(updated);
      await api.saveJournal(entry);
      setInput('');

      const sequence = entry.audioDataUrls?.length
        ? entry.audioDataUrls
        : (entry.audioDataUrl ? [entry.audioDataUrl] : []);
      if (sequence.length) {
        let index = 0;
        let lastObjectUrl = '';

        const playNext = () => {
          if (lastObjectUrl) {
            URL.revokeObjectURL(lastObjectUrl);
            lastObjectUrl = '';
          }

          if (index >= sequence.length) {
            return;
          }

          const { audio, objectUrl } = createPlayableAudio(sequence[index]);
          lastObjectUrl = objectUrl;
          index += 1;
          audio.onended = playNext;
          audio.onerror = playNext;
          void audio.play().catch(playNext);
        };

        playNext();
      }
    } catch {
      setError('Could not reach backend. Verify your backend URL in Settings and try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 page-fade">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Talk to MindEase</h2>
          <p className="text-sm text-slate-500">A gentle conversation space for emotional support.</p>
        </div>
        {conversations.length > 0 && (
          <button
            type="button"
            onClick={startNewChat}
            className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-200"
          >
            + New Chat
          </button>
        )}
      </div>

      <QuickHelpCards onSelectPrompt={sendMessage} />

      <div className="flex h-[44vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-white bg-slate-50/60 p-3 sm:p-4">
        {messages.length === 0 && (
          <div className="m-auto text-center text-slate-500">
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm">Start by sharing what is on your mind.</p>
          </div>
        )}

        {messages.map((message, idx) => (
          <MessageBubble
            key={`${message.role}-${idx}`}
            role={message.role}
            text={message.text}
            timeText={message.timeText}
            audioDataUrl={message.audioDataUrl}
            audioDataUrls={message.audioDataUrls}
          />
        ))}

        {isSending && (
          <div className="text-sm text-slate-500">MindEase is thinking and preparing a voice response...</div>
        )}
      </div>

      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSend={() => void sendMessage(input)}
        isSending={isSending}
        isListening={isListening || isRecordingFallback}
        speechSupported={micEnabled}
        speechStatus={isRecordingFallback ? 'Recording audio... tap mic again to stop.' : speechStatus}
        onToggleListening={() => void handleMicToggle()}
      />

      {(speechError || recordingError || error) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {speechError || recordingError || error}
        </div>
      )}
    </div>
  );
}
