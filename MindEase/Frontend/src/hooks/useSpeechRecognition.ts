import { useMemo, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechErrorEvent = {
  error?: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string>('');
  const [speechStatus, setSpeechStatus] = useState<string>('');

  const recognition = useMemo(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      return null;
    }

    const instance = new SpeechRecognitionCtor();
    instance.lang = 'en-US';
    instance.interimResults = false;
    instance.continuous = false;

    instance.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript.trim());
        setSpeechStatus('Captured. Review text and press Send.');
      }
    };

    instance.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone permission was denied. Allow microphone access in browser settings.');
      } else if (event.error === 'no-speech') {
        setSpeechError('No speech detected. Try speaking closer to the mic.');
      } else if (event.error === 'audio-capture') {
        setSpeechError('No microphone device was found. Connect a mic and try again.');
      } else {
        setSpeechError('Microphone input failed. Please try again.');
      }
      setSpeechStatus('');
      setIsListening(false);
    };

    instance.onend = () => {
      setIsListening(false);
      setSpeechStatus('Listening stopped.');
    };

    return instance;
  }, [onTranscript]);

  const startListening = () => {
    if (!recognition) {
      setSpeechError('Speech recognition is not supported in this browser.');
      setSpeechStatus('');
      return;
    }

    if (navigator?.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch(() => {
          setSpeechError('Microphone permission is required for voice input.');
          setSpeechStatus('');
          return;
        });
    }

    setSpeechError('');
    setSpeechStatus('Listening... speak clearly for 3-5 seconds.');
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognition?.stop();
    setIsListening(false);
    setSpeechStatus('Listening stopped.');
  };

  return {
    isListening,
    speechError,
    speechStatus,
    startListening,
    stopListening,
    supported: !!recognition,
  };
}
