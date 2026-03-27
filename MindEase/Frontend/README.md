# MindEase Web Dashboard

React + Vite + TypeScript dashboard for the MindEase ESP32 voice assistant backend.

## Features

- Talk to MindEase chat interface
- Voice input with browser Speech Recognition API
- Response audio playback for each AI message
- Conversation journal with tags and replay
- Emergency quick-help prompt buttons
- Weekly mood analytics chart (sample data)
- Settings page for backend URL and ElevenLabs voice tuning

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Lint:

```bash
npm run lint
```

## Backend requirement

The backend should run on `http://localhost:3000` or your configured URL in Settings.

Required routes:

- `POST /chat`
- `GET /journal`
- `POST /journal`
- `GET /list-voices`
- `GET /settings`
- `PUT /settings/voice`
- `PUT /settings/voice-config`
- `POST /settings/preview`

## Project structure

- `src/components` reusable UI components
- `src/pages` route-level pages
- `src/services/api.ts` axios API client
- `src/store/mindeaseStore.ts` localStorage persistence
- `src/hooks/useSpeechRecognition.ts` speech-to-text helper
- `src/data/moodData.ts` sample analytics dataset
