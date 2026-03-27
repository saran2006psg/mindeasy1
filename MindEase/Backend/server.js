const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const groqAudioService = require('./services/groqAudioService'); // Switched from ElevenLabs to Groq
require('dotenv').config();
require('express-async-errors');

const port = process.env.PORT || 3000;
const app = express();

const recordFile = path.join(__dirname, 'tmp', 'recording.wav');
const voicedMp3File = path.join(__dirname, 'public', 'response.mp3');
const groqApiKey = process.env.GROQ_API_KEY;
const ngrokUrl = process.env.NGROK_URL || '';

const MENTAL_HEALTH_SYSTEM_PROMPT =
  'You are MindEase, a compassionate and insightful mental health support companion. '
  + 'Respond with warmth and genuine understanding to help users feel heard and supported. '
  + 'Provide practical, actionable advice grounded in evidence-based wellness techniques. '
  + 'Use calming language and encourage healthy coping strategies. '
  + 'Avoid medical diagnosis, but always encourage professional help if there are signs of crisis. '
  + 'Keep responses concise but meaningful, with a touch of human warmth.';

let shouldDownloadFile = false;
let journalEntries = [];

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

app.post('/uploadAudio', async (req, res) => {
  try {
    shouldDownloadFile = false;
    const recordingFile = fs.createWriteStream(recordFile);
    let dataSize = 0;
    let responseSent = false;
    const startTime = Date.now();

    req.on('data', (chunk) => {
      dataSize += chunk.length;
    });

    req.on('error', (err) => {
      if (!responseSent) {
        responseSent = true;
        console.error('Error receiving file:', err.message);
        res.status(500).send('Error uploading audio');
      }
    });

    recordingFile.on('error', (err) => {
      if (!responseSent) {
        responseSent = true;
        console.error('Error writing file:', err.message);
        res.status(500).send('Error writing audio file');
      }
    });

    recordingFile.on('finish', async () => {
      console.log(`Audio upload complete. Size: ${dataSize} bytes (${((Date.now() - startTime) / 1000).toFixed(2)}s)`);

      try {
        const transcription = await speechToTextAPI();

        if (transcription) {
          if (!responseSent) {
            responseSent = true;
            res.status(200).send(transcription);
          }
          await callGroqForEsp32(transcription);
        } else {
          if (!responseSent) {
            responseSent = true;
            res.status(200).send('Error transcribing audio');
          }
        }
      } catch (err) {
        console.error('Error in audio processing:', err.message);
        if (!responseSent) {
          responseSent = true;
          res.status(200).send('Error processing audio');
        }
      }
    });

    req.pipe(recordingFile);
  } catch (error) {
    console.error('Unexpected error:', error.message);
    res.status(500).send('Unexpected server error');
  }
});

app.get('/checkVariable', (req, res) => {
  res.json({ ready: shouldDownloadFile });
});

app.get('/broadcastAudio', (req, res) => {
  fs.stat(voicedMp3File, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'Audio file not ready' });
    }

    if (stats.size === 0) {
      return res.status(500).json({ error: 'Audio file is empty' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stats.size);

    const readStream = fs.createReadStream(voicedMp3File);
    readStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading audio file' });
      }
    });

    readStream.pipe(res);
  });
});

app.get('/broadcastAudioMp3', (req, res) => {
  fs.stat(voicedMp3File, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'MP3 file not ready' });
    }

    if (stats.size === 0) {
      return res.status(500).json({ error: 'MP3 file is empty' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stats.size);

    const readStream = fs.createReadStream(voicedMp3File);
    readStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading MP3 file' });
      }
    });

    readStream.pipe(res);
  });
});

app.get('/test-audio', (req, res) => {
  res.sendFile(recordFile);
});

app.get('/test-response', (req, res) => {
  res.sendFile(voicedMp3File);
});

app.get('/test-response-mp3', (req, res) => {
  res.sendFile(voicedMp3File);
});

app.get('/status', (req, res) => {
  res.json({
    recordingExists: fs.existsSync(recordFile),
    responseExists: fs.existsSync(voicedMp3File),
    responseReady: shouldDownloadFile,
    groqKeyConfigured: !!groqApiKey,
    audioServiceProvider: 'Groq (Whisper + LLM) + Murf (TTS)',
    ngrokUrl,
  });
});

app.get('/debug-audio', (req, res) => {
  fs.stat(voicedMp3File, (err, stats) => {
    if (err) {
      return res.json({ error: 'Audio file not found', file: voicedMp3File });
    }

    const buffer = Buffer.alloc(100);
    const fd = fs.openSync(voicedMp3File, 'r');
    fs.readSync(fd, buffer, 0, 100);
    fs.closeSync(fd);

    res.json({
      fileSize: stats.size,
      firstBytesHex: buffer.slice(0, 16).toString('hex'),
      mp3Signature: buffer.slice(0, 3).toString('ascii'),
      status: buffer.slice(0, 3).toString('ascii') === 'ID3' ? 'Likely MP3 (ID3)' : 'MP3 header not ID3 (could still be valid MPEG frame)',
    });
  });
});

app.get('/list-voices', async (req, res) => {
  const voices = groqAudioService.getSupportedVoices();
  res.json({
    success: true,
    voices,
    currentVoice: groqAudioService.getVoiceId(),
  });
});

app.post('/chat', async (req, res) => {
  const userMessage = (req.body?.message || '').trim();
  if (!userMessage) {
    return res.status(400).json({ success: false, error: 'Message is required.' });
  }

  const assistantResponse = await generateGroqResponse(userMessage);

  try {
    const chunkBuffers = await groqAudioService.textToSpeechChunks(assistantResponse);
    const audioDataUrls = chunkBuffers.map((buffer) => `data:audio/mpeg;base64,${buffer.toString('base64')}`);

    // Keep writing one file for compatibility/debug endpoints.
    fs.writeFileSync(voicedMp3File, chunkBuffers[0]);

    const tag = detectTag(`${userMessage} ${assistantResponse}`);
    const entry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date().toISOString(),
      userMessage,
      aiResponse: assistantResponse,
      tag,
      audioDataUrl: audioDataUrls[0] || '',
      audioDataUrls,
    };

    journalEntries = [entry, ...journalEntries].slice(0, 200);
    return res.json({ success: true, ...entry });
  } catch (error) {
    console.error('Error in chat TTS:', error.message);
    const tag = detectTag(`${userMessage} ${assistantResponse}`);
    const entry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date().toISOString(),
      userMessage,
      aiResponse: assistantResponse,
      tag,
      audioDataUrl: '',
    };
    journalEntries = [entry, ...journalEntries].slice(0, 200);
    return res.json({ success: true, ...entry, warning: 'Audio generation failed' });
  }
});

app.get('/settings', (req, res) => {
  res.json({
    success: true,
    voiceId: groqAudioService.getVoiceId(),
    voiceSettings: groqAudioService.getVoiceSettings(),
    audioProvider: 'Groq (Whisper + LLM) + Murf (TTS)',
    backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
    ngrokUrl,
  });
});

app.put('/settings/voice', (req, res) => {
  const voiceId = (req.body?.voiceId || '').trim();
  const allowedVoiceIds = groqAudioService.getSupportedVoices().map((v) => v.id);

  if (!allowedVoiceIds.includes(voiceId)) {
    return res.status(400).json({
      success: false,
      error: `voiceId must be one of: ${allowedVoiceIds.join(', ')}`,
    });
  }

  groqAudioService.setVoiceSettings({ voice: voiceId });
  return res.json({ success: true, voiceId: groqAudioService.getVoiceId() });
});

app.put('/settings/voice-config', (req, res) => {
  const speed = Number(req.body?.speed);

  if (!Number.isFinite(speed) || speed < 0.5 || speed > 2.0) {
    return res.status(400).json({
      success: false,
      error: 'speed must be a number between 0.5 and 2.0.',
    });
  }

  groqAudioService.setVoiceSettings({ speed });
  return res.json({ success: true, voiceSettings: groqAudioService.getVoiceSettings() });
});

app.post('/settings/preview', async (req, res) => {
  const previewText = (req.body?.text || 'Hello, I am MindEase. Take a deep breath. You are not alone.').trim();

  try {
    const chunkBuffers = await groqAudioService.textToSpeechChunks(previewText);
    const audioDataUrls = chunkBuffers.map((buffer) => `data:audio/mpeg;base64,${buffer.toString('base64')}`);
    return res.json({
      success: true,
      audioDataUrl: audioDataUrls[0] || '',
      audioDataUrls,
    });
  } catch (error) {
    console.error('Error in preview TTS:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to generate preview audio' });
  }
});

app.get('/journal', (req, res) => {
  res.json({ success: true, entries: journalEntries });
});

app.post('/journal', (req, res) => {
  const body = req.body || {};
  const entry = {
    id: body.id || `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: body.createdAt || new Date().toISOString(),
    userMessage: body.userMessage || '',
    aiResponse: body.aiResponse || '',
    tag: body.tag || detectTag(`${body.userMessage || ''} ${body.aiResponse || ''}`),
    audioDataUrl: body.audioDataUrl || '',
  };

  journalEntries = [entry, ...journalEntries].slice(0, 300);
  res.json({ success: true, entry });
});

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'MindEase backend is running.' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  const interfaces = require('os').networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        console.log(`Server IP: ${address.address}`);
      }
    }
  }
});

async function speechToTextAPI() {
  try {
    if (!fs.existsSync(recordFile)) {
      throw new Error('Audio file not found');
    }

    const transcription = await groqAudioService.transcribeAudio(recordFile);
    if (!transcription) {
      throw new Error('Transcription returned empty result');
    }

    return transcription;
  } catch (error) {
    console.error('Error in speechToTextAPI:', error.message);
    return null;
  }
}

async function callGroqForEsp32(text) {
  const responseText = await generateGroqResponse(text);
  try {
    await groqAudioService.textToSpeech(responseText, voicedMp3File);
    shouldDownloadFile = true;
  } catch (error) {
    shouldDownloadFile = false;
    console.error('Error generating ESP32 voice response:', error.message);
  }
}

async function generateGroqResponse(text) {
  try {
    if (!text || text.trim() === '' || text.toLowerCase().includes('static') || text.length < 3) {
      return "I couldn't hear you clearly. Could you try again, maybe a little slower?";
    }

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const response = await axios.post(
      apiUrl,
      {
        messages: [
          {
            role: 'system',
            content: MENTAL_HEALTH_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 320,
        top_p: 1,
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
      }
    );

    return response?.data?.choices?.[0]?.message?.content || 'I am here with you. Would you like to share a little more?';
  } catch (error) {
    console.error('Error in Groq API:', error.message);
    return "I'm here with you. I'm having a small connection issue right now, but we can keep going together.";
  }
}

function detectTag(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes('anxious') || normalized.includes('anxiety') || normalized.includes('panic')) return 'Anxiety';
  if (normalized.includes('stress') || normalized.includes('pressure') || normalized.includes('overwhelmed')) return 'Stress';
  if (normalized.includes('sleep') || normalized.includes('insomnia') || normalized.includes('night')) return 'Sleep';
  if (normalized.includes('sad') || normalized.includes('hopeless') || normalized.includes('down')) return 'Sadness';
  if (normalized.includes('motivation') || normalized.includes('goal') || normalized.includes('focus')) return 'Motivation';
  if (normalized.includes('happy') || normalized.includes('grateful') || normalized.includes('excited')) return 'Happy';
  return 'Stress';
}
