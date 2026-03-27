const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Groq API configuration (kept for Whisper STT + Groq LLM usage from server)
const GROQ_API_URL = 'https://api.groq.com/openai/v1';

// Murf TTS API configuration
const MURF_TTS_URL = 'https://api.murf.ai/v1/speech/stream';
const DEFAULT_MURF_API_KEY = 'ap2_4919c49c-4bb8-4566-adea-2d222f9ba0e1';
const MURF_MODEL = 'FALCON';
const MURF_LOCALE = 'en-US';
const MURF_MAX_CHARS_PER_REQUEST = 1800;

const DEFAULT_OUTPUT_PATH = path.join(__dirname, '..', 'public', 'response.mp3');

/**
 * Voice settings for Murf TTS.
 * Keep this easy to change from settings APIs.
 */
let VOICE_SETTINGS = {
  voice: process.env.MURF_VOICE_ID || 'Matthew',
  speed: 1.15,
};

const SUPPORTED_VOICE_OPTIONS = [
  { id: 'Natalie', name: 'Natalie (Warm Female)', description: 'Calm, caring, and supportive voice' },
  { id: 'Matthew', name: 'Matthew (Warm Male)', description: 'Steady, reassuring conversational voice' },
];

/**
 * Get Groq API key from environment.
 */
function getGroqApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY not found in environment variables. Check your .env file.');
  }
  return key;
}

/**
 * Get Murf API key from environment (with direct fallback provided by user).
 */
function getMurfApiKey() {
  return process.env.MURF_API_KEY || DEFAULT_MURF_API_KEY;
}

/**
 * Transcribe audio file using Groq Whisper (Speech-to-Text).
 * STT path is intentionally unchanged.
 *
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioFilePath) {
  try {
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const audioBuffer = fs.readFileSync(audioFilePath);

    if (audioBuffer.length === 0) {
      throw new Error('Audio file is empty');
    }

    console.log(`[STT] Transcribing audio (${audioBuffer.length} bytes) using Groq Whisper...`);

    const FormData = require('form-data');
    const form = new FormData();

    form.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav',
    });
    form.append('model', 'whisper-large-v3');

    const response = await axios.post(
      `${GROQ_API_URL}/audio/transcriptions`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${getGroqApiKey()}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000,
      }
    );

    const transcribedText = response.data.text || '';
    if (!transcribedText) {
      throw new Error('No transcription returned from Groq API');
    }

    console.log(`[STT] Success: "${transcribedText}"`);
    return transcribedText;
  } catch (error) {
    console.error('[STT] Error in transcribeAudio:', error.message);
    if (error.response?.data) {
      console.error('[STT] API Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Convert text to speech using Murf AI and save MP3 output.
 *
 * @param {string} text - Text to synthesize
 * @param {string} outputPath - Target MP3 path (defaults to public/response.mp3)
 * @returns {Promise<Buffer>} - First MP3 chunk buffer for compatibility
 */
async function textToSpeech(text, outputPath = DEFAULT_OUTPUT_PATH) {
  if (!text || text.trim() === '') {
    throw new Error('Text cannot be empty');
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const normalizedText = normalizeText(text);
  const chunks = splitTextForMurf(normalizedText, MURF_MAX_CHARS_PER_REQUEST);

  console.log(`[TTS] Starting Murf synthesis with model=${MURF_MODEL}, voice=${VOICE_SETTINGS.voice}`);
  console.log(`[TTS] Characters=${normalizedText.length}, chunks=${chunks.length}`);

  try {
    const mp3Buffers = await synthesizeChunksWithMurf(chunks);

    // Save main file for ESP32/backend download endpoint compatibility.
    fs.writeFileSync(outputPath, mp3Buffers[0]);
    console.log(`[TTS] Main MP3 written: ${outputPath}`);

    if (mp3Buffers.length > 1) {
      // Save extra segments to preserve full long-text output without truncation.
      for (let i = 1; i < mp3Buffers.length; i += 1) {
        const partPath = outputPath.replace(/\.mp3$/i, `.part${i + 1}.mp3`);
        fs.writeFileSync(partPath, mp3Buffers[i]);
      }

      const manifestPath = outputPath.replace(/\.mp3$/i, '.parts.txt');
      const manifestContent = [
        'Murf generated multiple MP3 segments for long text.',
        `Total segments: ${mp3Buffers.length}`,
        `Primary file: ${path.basename(outputPath)}`,
        'Additional files: .part2.mp3, .part3.mp3, ...',
      ].join('\n');
      fs.writeFileSync(manifestPath, manifestContent, 'utf8');
      console.log(`[TTS] Long-text manifest written: ${manifestPath}`);
    }

    return mp3Buffers[0];
  } catch (error) {
    console.error('[TTS] Murf synthesis failed:', error.message);
    writeTtsFallbackText(outputPath, normalizedText, error);
    throw error;
  }
}

/**
 * Generate one MP3 buffer per chunk.
 * Useful for chat playback where frontend can play segments in order.
 *
 * @param {string} text - Input text
 * @returns {Promise<Buffer[]>} - List of MP3 buffers
 */
async function textToSpeechChunks(text) {
  if (!text || text.trim() === '') {
    throw new Error('Text cannot be empty');
  }

  const normalizedText = normalizeText(text);
  const chunks = splitTextForMurf(normalizedText, MURF_MAX_CHARS_PER_REQUEST);

  console.log(`[TTS] Generating chunk buffers. Characters=${normalizedText.length}, chunks=${chunks.length}`);
  return synthesizeChunksWithMurf(chunks);
}

async function synthesizeChunksWithMurf(chunks) {
  const buffers = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunkText = chunks[i];
    console.log(`[TTS] Murf request ${i + 1}/${chunks.length} (${chunkText.length} chars)`);

    const payload = {
      text: chunkText,
      voiceId: VOICE_SETTINGS.voice,
      model: MURF_MODEL,
      locale: MURF_LOCALE,
    };

    try {
      const response = await axios.post(MURF_TTS_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': getMurfApiKey(),
        },
        responseType: 'arraybuffer',
        timeout: 45000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const mp3Buffer = Buffer.from(response.data);
      if (!mp3Buffer.length) {
        throw new Error('Murf returned an empty audio payload');
      }

      buffers.push(mp3Buffer);
    } catch (error) {
      console.error(`[TTS] Murf request failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        body: error.response?.data ? error.response.data.toString('utf8') : 'No response body',
        message: error.message,
        url: MURF_TTS_URL,
        apiKeyUsed: getMurfApiKey().substring(0, 10) + '...',
      });
      throw error;
    }
  }

  return buffers;
}

function normalizeText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

/**
 * Split long text into sentence-aware chunks so >2000 chars can still be synthesized.
 */
function splitTextForMurf(text, maxLen) {
  const cleaned = normalizeText(text);
  if (!cleaned) return [''];
  if (cleaned.length <= maxLen) return [cleaned];

  const sentences = cleaned.match(/[^.!?]+[.!?]*/g) || [cleaned];
  const chunks = [];
  let current = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = '';
      }

      for (let i = 0; i < sentence.length; i += maxLen) {
        chunks.push(sentence.slice(i, i + maxLen).trim());
      }
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxLen) {
      current = candidate;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function writeTtsFallbackText(outputPath, text, error) {
  const fallbackPath = outputPath.replace(/\.mp3$/i, '-fallback.txt');
  const fallbackMessage = [
    'Murf TTS failed. Returning text fallback instead of audio.',
    `Timestamp: ${new Date().toISOString()}`,
    `Reason: ${error.message}`,
    '',
    'Response text:',
    text,
  ].join('\n');

  fs.writeFileSync(fallbackPath, fallbackMessage, 'utf8');
  console.warn(`[TTS] Fallback text written: ${fallbackPath}`);
}

function setVoiceSettings(settings) {
  if (settings.voice && SUPPORTED_VOICE_OPTIONS.some((v) => v.id === settings.voice)) {
    VOICE_SETTINGS.voice = settings.voice;
  }

  if (Number.isFinite(settings.speed) && settings.speed >= 0.5 && settings.speed <= 2.0) {
    VOICE_SETTINGS.speed = settings.speed;
  }

  console.log('[TTS] Voice settings updated:', VOICE_SETTINGS);
}

function getVoiceSettings() {
  return { ...VOICE_SETTINGS };
}

function getVoiceId() {
  return VOICE_SETTINGS.voice;
}

function getSupportedVoices() {
  return SUPPORTED_VOICE_OPTIONS;
}

function validateApiKey() {
  const hasGroqKey = !!process.env.GROQ_API_KEY;
  const hasMurfKey = !!getMurfApiKey();

  if (hasGroqKey) {
    console.log('[CONFIG] GROQ_API_KEY detected');
  } else {
    console.warn('[CONFIG] GROQ_API_KEY missing');
  }

  if (hasMurfKey) {
    console.log('[CONFIG] MURF API key detected');
  } else {
    console.warn('[CONFIG] MURF API key missing');
  }

  return hasGroqKey && hasMurfKey;
}

module.exports = {
  transcribeAudio,
  textToSpeech,
  textToSpeechChunks,
  setVoiceSettings,
  getVoiceSettings,
  getVoiceId,
  getSupportedVoices,
  validateApiKey,
};