const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ElevenLabs API configuration (will be loaded when needed)
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Get API key dynamically (reads from env on each use)
 */
function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('ELEVENLABS_API_KEY not found in environment variables. Check your .env file.');
  }
  return key;
}

/**
 * Voice ID for mental health assistant
 *
 * FREE TIER: You must use your own cloned voice or specific free voices
 * PAID TIER: Can use library voices like:
 * - '21m00Tcm4TlvDq8ikWAM' = Rachel (warm, caring)
 * - 'EXAVITQu4vr4xnSDxMaL' = Bella (soft, friendly)
 *
 * TO GET YOUR VOICE ID:
 * 1. Go to https://elevenlabs.io/app/voice-lab
 * 2. Clone your voice or create one
 * 3. Copy the voice ID and paste it below
 *
 * For now, using a default voice that might work with free tier
 */
let VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Adam (try this for free tier)
let VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
};

/**
 * Transcribe audio file using ElevenLabs Scribe v2 (Speech-to-Text)
 * @param {string} audioFilePath - Path to the audio file (WAV, MP3, etc.)
 * @returns {string} - Transcribed text
 */
async function transcribeAudio(audioFilePath) {
  try {
    // Validate file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    // Read the audio file
    const audioBuffer = fs.readFileSync(audioFilePath);

    if (audioBuffer.length === 0) {
      throw new Error('Audio file is empty');
    }

    console.log(`📝 Transcribing audio (${audioBuffer.length} bytes) using ElevenLabs Scribe v2...`);

    // Create FormData for file upload
    const FormData = require('form-data');
    const form = new FormData();

    // Append file with proper options
    form.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav',
    });

    // Optional: Add model parameter
    form.append('model_id', 'scribe_v2');

    // Call ElevenLabs Scribe API for transcription
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/speech-to-text`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'xi-api-key': getApiKey(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const transcribedText = response.data.text || response.data.transcription || '';

    if (!transcribedText) {
      throw new Error('No transcription returned from API');
    }

    console.log(`✅ Transcription successful: "${transcribedText}"`);
    return transcribedText;
  } catch (error) {
    console.error('❌ Error in transcribeAudio:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Convert text to speech using ElevenLabs
 * @param {string} text - Text to convert to speech
 * @param {string} outputPath - Path to save the output file
 * @param {{ outputFormat?: string }} options - TTS output options
 * @returns {Buffer} - Audio buffer
 */
async function textToSpeech(text, outputPath = 'response.mp3', options = {}) {
  try {
    // Validate input
    if (!text || text.trim() === '') {
      throw new Error('Text cannot be empty');
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🎙️  Converting text to speech using ElevenLabs (Voice: ${VOICE_ID})...`);
    console.log(`📄 Text: "${text}"`);

    const outputFormat = options.outputFormat || 'pcm_16000';

    // Call ElevenLabs Text-to-Speech API
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${VOICE_ID}`,
      {
        text: text,
        model_id: 'eleven_multilingual_v2', // High-quality multilingual model
        output_format: outputFormat,
        voice_settings: VOICE_SETTINGS,
      },
      {
        headers: {
          'xi-api-key': getApiKey(),
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    const rawBuffer = Buffer.from(response.data);
    const outputBuffer = outputFormat === 'pcm_16000'
      ? createWavHeader(rawBuffer, 16000, 1, 16)
      : rawBuffer;

    // Write audio to file
    fs.writeFileSync(outputPath, outputBuffer);
    console.log(`✅ TTS conversion complete. Audio saved to: ${outputPath}`);

    return outputBuffer;
  } catch (error) {
    console.error('❌ Error in textToSpeech:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data.toString());
    }
    throw error;
  }
}

/**
 * Change the voice ID for TTS
 * Available voices include: rachel, bella, alice, thomas, adam, chris, etc.
 * Visit: https://elevenlabs.io/docs/voices
 * @param {string} newVoiceId - New voice ID to use
 */
function setVoiceId(newVoiceId) {
  VOICE_ID = newVoiceId;
  console.log(`🎙️  Voice changed to: ${newVoiceId}`);
}

/**
 * Get current voice ID
 * @returns {string} - Current voice ID
 */
function getVoiceId() {
  return VOICE_ID;
}

/**
 * Set voice tuning settings.
 * @param {{stability:number, similarity_boost:number}} settings - Voice tuning configuration
 */
function setVoiceSettings(settings) {
  VOICE_SETTINGS = {
    ...VOICE_SETTINGS,
    ...settings,
  };
}

/**
 * Get current voice tuning settings.
 * @returns {{stability:number, similarity_boost:number}}
 */
function getVoiceSettings() {
  return VOICE_SETTINGS;
}

/**
 * Create WAV file header for PCM audio data
 * @param {Buffer} pcmData - Raw PCM audio data
 * @param {number} sampleRate - Sample rate in Hz (e.g., 16000)
 * @param {number} numChannels - Number of audio channels (1 = mono, 2 = stereo)
 * @param {number} bitsPerSample - Bits per sample (8, 16, 24, or 32)
 * @returns {Buffer} - Complete WAV file buffer with header
 */
function createWavHeader(pcmData, sampleRate, numChannels, bitsPerSample) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // "RIFF" chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Validate ElevenLabs API key on startup
 */
function validateApiKey() {
  try {
    const key = getApiKey();
    if (key.startsWith('sk_')) {
      console.log('✅ ElevenLabs API Key configured correctly');
      return true;
    }
  } catch (error) {
    console.warn('⚠️  WARNING: ELEVENLABS_API_KEY not properly configured. Please check your .env file.');
    return false;
  }
}

/**
 * List all available voices in your ElevenLabs account
 * Useful for finding voices available on your plan (free/paid)
 * @returns {Array} - List of voice objects with id, name, and category
 */
async function listAvailableVoices() {
  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': getApiKey(),
      },
    });

    console.log('\n🎤 Available Voices:');
    response.data.voices.forEach(voice => {
      console.log(`  - ${voice.name} (ID: ${voice.voice_id}) [${voice.category}]`);
    });

    return response.data.voices;
  } catch (error) {
    console.error('❌ Error fetching voices:', error.message);
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  textToSpeech,
  setVoiceId,
  getVoiceId,
  setVoiceSettings,
  getVoiceSettings,
  validateApiKey,
  listAvailableVoices,
};
